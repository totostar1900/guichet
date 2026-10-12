"use server";

import { revalidatePath } from "next/cache";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { comptesDemo } from "@/lib/domain/demo";
import { COHORTE_LABEL, estCohorte } from "@/lib/domain/cohortes";
import { cohortesDeTous } from "@/lib/desk/cohortes-data";
import { planDEnvoi, refusDePreparer, texteComplet } from "@/lib/domain/envoi-cohorte";

export type EnvoiResult = { ok?: string; error?: string };

/**
 * PRÉPARER UN MESSAGE À UNE COHORTE, ET S'ARRÊTER LÀ.
 *
 * Le bouton de la maquette dit « Préparer l'envoi », pas « Envoyer », et
 * c'est la bonne borne : un texte libre adressé d'un coup à plusieurs clients
 * n'est pas un geste qu'on fait seul. Il est écrit, compté, et il attend
 * qu'un second responsable le lise.
 *
 * CE QUI PART N'EST PAS CE QUI EST TAPÉ : les mentions et la sortie STOP sont
 * ajoutées par le modèle. Une mention qu'on tape est une mention qu'on
 * oublie.
 */
export async function preparerEnvoiAction(_prev: EnvoiResult | null, form: FormData): Promise<EnvoiResult> {
  const desk = await requireDesk();
  const cohorte = String(form.get("cohorte") ?? "");
  if (!estCohorte(cohorte)) return { error: "Cohorte inconnue." };

  const objet = String(form.get("objet") ?? "");
  const corps = String(form.get("corps") ?? "");

  const r = repo();
  const [contacts, groupes] = await Promise.all([r.listContacts().catch(() => []), cohortesDeTous().catch(() => ({ parClient: new Map<string, string>(), comptes: {}, bareme: 0 }))]);
  const dansLaCohorte = contacts.filter((c) => groupes.parClient.get(c.id) === cohorte);
  const plan = planDEnvoi(dansLaCohorte, comptesDemo(contacts));

  const refus = refusDePreparer(objet, corps, plan);
  if (refus) return { error: refus };

  /* LE MESSAGE EST ÉCRIT AU JOURNAL DU DESK, pas envoyé. La trace porte qui
     l'a préparé, pour combien de personnes, et le texte exact tel qu'il
     partira : un envoi qu'on ne peut pas relire avant qu'il parte ne se
     contrôle pas. */
  const texte = texteComplet(corps);
  await r.logEvent({
    kind: "desk",
    html: `<b>Message préparé</b> pour la cohorte « ${COHORTE_LABEL[cohorte]} » : ${plan.joignables.length} destinataire(s) sur ${plan.dansLaCohorte}, ${plan.parWhatsapp} par WhatsApp et ${plan.parEmail} par e-mail. Objet : « ${objet.replace(/</g, "&lt;")} ». Préparé par ${desk.name}, en attente d'un second responsable.`,
  });

  revalidatePath("/desk/repertoire");
  revalidatePath("/desk/journal");
  return {
    ok: `Préparé pour ${plan.joignables.length} destinataire(s). Le texte est au journal du desk, mentions comprises (${texte.length} caractères) : il part quand un second responsable l'a lu.`,
  };
}
