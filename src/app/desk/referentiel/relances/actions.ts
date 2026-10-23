"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireResponsable } from "@/lib/auth";
import { repo } from "@/lib/data";
import { NOM_DU_SUJET, RELANCE_DEFAUT, RELANCE_KEY, SUJETS, type PolitiqueDeRelance, type SujetDeRelance } from "@/lib/domain/relance";
import { REF } from "@/lib/reference";

export type RelancePolitiqueResult = { ok: true; message: string } | { ok: false; error: string };

const schema = z.object({
  active: z.coerce.boolean().optional(),
  rappels: z.coerce.number().int().min(1).max(20),
  delaiPremier: z.coerce.number().int().min(0).max(30),
  cadence: z.coerce.number().int().min(1).max(30),
  joursOuvres: z.coerce.boolean().optional(),
  pasLeJourDUnPreavis: z.coerce.boolean().optional(),
  whatsapp: z.coerce.boolean().optional(),
  email: z.coerce.boolean().optional(),
});

/* Un texte de message : long, libre, et borné quand même. WhatsApp coupe au
   millier de caractères ; ce qui dépasse n'arriverait pas, et il vaut mieux
   le refuser à la saisie que le tronquer à l'envoi. */
const TEXTE_MAX = 900;
const OBJET_MAX = 120;

/**
 * ENREGISTRER LE RÉGLAGE DES RAPPELS.
 *
 * SANS BROUILLON, COMME LE DÉLAI DE SOUFFRANCE, MAIS PAS POUR LA MÊME RAISON.
 * Le délai ne colore qu'une colonne ; celui-ci commande des ENVOIS, donc il
 * mériterait une relecture. Ce qui le dispense du brouillon est ailleurs : la
 * page montre la file avant d'enregistrer, et le robot ne tourne qu'une fois
 * par jour. Une erreur se voit et se corrige avant le prochain tour, et le
 * pire qu'elle produise est un sujet décoché pendant une journée.
 *
 * Un décochage général, lui, est immédiat et c'est voulu : « tout arrêter »
 * doit arrêter tout de suite, sans passer par une publication.
 *
 * L'ÉCRITURE EST AUDITÉE ET JOURNALISÉE, parce que savoir qui a rallumé cinq
 * messages par client compte, et compte même quand c'était la bonne décision.
 */
export async function enregistrerRelancesAction(_p: RelancePolitiqueResult | null, form: FormData): Promise<RelancePolitiqueResult> {
  const me = await requireResponsable("/desk/referentiel/relances");
  const brut = Object.fromEntries(form);
  const p = schema.safeParse(brut);
  if (!p.success) return { ok: false, error: "Vérifiez les nombres : au plus 20 rappels, un premier délai de 0 à 30 jours, une cadence de 1 à 30 jours." };

  const canaux: PolitiqueDeRelance["canaux"] = [];
  if (p.data.whatsapp) canaux.push("whatsapp");
  if (p.data.email) canaux.push("email");

  const sujets = { ...RELANCE_DEFAUT.sujets };
  for (const s of SUJETS) sujets[s] = Boolean(brut[`sujet_${s}`]);

  /* Un texte identique à celui de la maison n'est PAS enregistré : la ligne
     resterait figée sur la formulation du jour où elle a été sauvegardée, et
     une amélioration du code ne l'atteindrait jamais. On ne garde que ce qui
     diffère réellement. */
  const textes: PolitiqueDeRelance["textes"] = {};
  for (const s of SUJETS) {
    const objet = String(brut[`objet_${s}`] ?? "").trim();
    const texte = String(brut[`texte_${s}`] ?? "").trim();
    if (objet.length > OBJET_MAX || texte.length > TEXTE_MAX) return { ok: false, error: `« ${NOM_DU_SUJET[s]} » : l'objet tient en ${OBJET_MAX} caractères et le message en ${TEXTE_MAX}.` };
    /* Un message sans lien est un message qui demande d'aller chercher : on
       le refuse plutôt que de l'envoyer. */
    if (texte && !texte.includes("{lien}")) return { ok: false, error: `« ${NOM_DU_SUJET[s]} » : le message doit contenir {lien}, sinon le client n'a nulle part où aller.` };
    const defaut = RELANCE_DEFAUT.textes?.[s as SujetDeRelance];
    const garde: Partial<{ objet: string; texte: string }> = {};
    if (objet && objet !== defaut?.objet) garde.objet = objet;
    if (texte && texte !== defaut?.texte) garde.texte = texte;
    if (garde.objet || garde.texte) textes[s] = garde;
  }

  const next: PolitiqueDeRelance = {
    active: Boolean(p.data.active),
    rappels: p.data.rappels,
    delaiPremier: p.data.delaiPremier,
    cadence: p.data.cadence,
    canaux,
    sujets,
    textes,
    joursOuvres: Boolean(p.data.joursOuvres),
    pasLeJourDUnPreavis: Boolean(p.data.pasLeJourDUnPreavis),
  };

  const r = repo();
  const before = (await r.listReference(REF.policy)).find((x) => x.key === RELANCE_KEY)?.data ?? RELANCE_DEFAUT;
  await r.upsertReference(REF.policy, RELANCE_KEY, next, me.name);
  await audit("policy.update", "reference", `${REF.policy}/${RELANCE_KEY}`, { before, after: next });
  await r.logEvent({
    kind: "desk",
    html: next.active
      ? `Rappels des procédures modifiés par ${me.name} : ${next.rappels} rappel(s), un tous les ${next.cadence} jour(s) à partir de J+${next.delaiPremier}, par ${canaux.join(" et ") || "aucun canal"} — sujets : ${SUJETS.filter((s) => sujets[s]).map((s) => NOM_DU_SUJET[s]).join(", ") || "aucun"}`
      : `Rappels des procédures DÉSACTIVÉS par ${me.name} : plus aucun message ne part.`,
  });
  revalidatePath("/desk/referentiel/relances");
  return { ok: true, message: next.active ? "Réglage enregistré. Le prochain tour du robot le lit." : "Rappels désactivés. Plus aucun message ne partira." };
}

const reprise = z.object({ id: z.string().min(1) });

/**
 * REPRENDRE UN RAPPEL QUE LE CLIENT A ÉCARTÉ : sur sa demande, et sur elle
 * seule.
 *
 * Le bouton existe parce que le téléphone existe : un client appelle, dit
 * « finalement relancez-moi », et sans ce geste la seule issue serait de
 * manipuler la base. Il est donc nommé pour ce qu'il est, il demande un motif,
 * et il laisse une ligne au journal avec le nom de qui l'a pressé — parce que
 * rallumer des messages qu'un client a fait taire est précisément le genre de
 * geste qu'on doit pouvoir retrouver six mois plus tard.
 *
 * Le compteur n'est PAS remis à zéro : le client a déjà reçu ce qu'il a reçu.
 */
export async function reprendreRappelAction(_p: RelancePolitiqueResult | null, form: FormData): Promise<RelancePolitiqueResult> {
  const me = await requireResponsable("/desk/referentiel/relances");
  const p = reprise.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "Rappel introuvable." };
  const motif = String(form.get("motif") ?? "").trim();
  if (motif.length < 4) return { ok: false, error: "Dites pourquoi : ce geste rallume des messages qu'un client a fait taire." };

  const r = repo();
  const x = (await r.listRelances()).find((q) => q.id === p.data.id);
  if (!x) return { ok: false, error: "Rappel introuvable." };
  if (x.state !== "ecartee") return { ok: false, error: "Ce rappel n'est pas écarté." };

  await r.majRelance(x.id, { state: "en_cours", motif: `repris par ${me.name} : ${motif}` });
  await audit("relance.reprise", "relance", x.id, { before: { state: "ecartee" }, after: { state: "en_cours" }, reason: motif });
  await r.logEvent({ kind: "desk", html: `Rappel « ${NOM_DU_SUJET[x.sujet]} » repris par ${me.name} à la demande du client : ${motif}` });
  revalidatePath("/desk/referentiel/relances");
  return { ok: true, message: "Rappel repris. Le prochain tour l'enverra." };
}
