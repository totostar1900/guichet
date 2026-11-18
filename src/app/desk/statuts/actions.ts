"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { randomUUID } from "node:crypto";
import { baseCourante, idDeLigne, lignesRetenues, planifierImport, REF_STATUT, REF_STATUT_MESSAGE, STATUTS_MAX, type StatutLigne } from "@/lib/domain/statuts";
import { listerMessages, listerStatuts } from "@/lib/statuts";
import { lireClasseurDesMessages } from "@/lib/statuts-classeur";

export type ImportResult = { ok: false; erreurs: string[] };

const rafraichir = () => {
  revalidatePath("/", "layout");
  revalidatePath("/desk/statuts");
};

/** Mettre une ligne dans les statuts : à la fin de la rangée, huit au plus, une ligne que les clients peuvent lire. */
export async function ajouterStatutAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/statuts");
  const offerId = String(form.get("offerId") ?? "");
  const r = repo();
  const offre = await r.getOffer(offerId).catch(() => undefined);
  if (!offre || offre.hidden || offre.status === "withdrawn") redirect("/desk/statuts?refus=ligne");
  const rows = await listerStatuts();
  const retenues = lignesRetenues(rows);
  if (retenues.some((l) => l.offerId === offerId)) redirect("/desk/statuts");
  if (retenues.length >= STATUTS_MAX) redirect("/desk/statuts?refus=plein");
  const avant = rows.find((x): x is StatutLigne => x.kind === "ligne" && x.offerId === offerId);
  const ligne: StatutLigne = { kind: "ligne", id: idDeLigne(offerId), offerId, position: (retenues.at(-1)?.position ?? 0) + 1, ajouteePar: desk.name, ajouteeLe: new Date().toISOString() };
  await r.upsertReference(REF_STATUT, ligne.id, ligne, desk.name);
  await audit("statut.ajoute", "statut", ligne.id, { before: avant ?? null, after: ligne });
  rafraichir();
  redirect(`/desk/statuts?mise=${encodeURIComponent(offre.title)}`);
}

/** Retirer une ligne des statuts : elle n'est pas effacée, elle porte la date de retrait et celle qui l'a retirée. */
export async function retirerStatutAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/statuts");
  const offerId = String(form.get("offerId") ?? "");
  const ligne = lignesRetenues(await listerStatuts()).find((l) => l.offerId === offerId);
  if (!ligne) return;
  const retiree: StatutLigne = { ...ligne, retireeLe: new Date().toISOString(), retireePar: desk.name };
  await repo().upsertReference(REF_STATUT, ligne.id, retiree, desk.name);
  await audit("statut.retire", "statut", ligne.id, { before: ligne, after: retiree });
  rafraichir();
  redirect("/desk/statuts?retiree=1");
}

/** Monter ou descendre une ligne d'un rang : elle échange sa place avec sa voisine. */
export async function deplacerStatutAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/statuts");
  const offerId = String(form.get("offerId") ?? "");
  const sens = String(form.get("sens") ?? "") === "haut" ? -1 : 1;
  const retenues = lignesRetenues(await listerStatuts());
  const i = retenues.findIndex((l) => l.offerId === offerId);
  const j = i + sens;
  if (i < 0 || j < 0 || j >= retenues.length) return;
  const a = retenues[i];
  const b = retenues[j];
  const r = repo();
  const na: StatutLigne = { ...a, position: b.position };
  const nb: StatutLigne = { ...b, position: a.position === b.position ? a.position + sens * -1 : a.position };
  await r.upsertReference(REF_STATUT, a.id, na, desk.name);
  await r.upsertReference(REF_STATUT, b.id, nb, desk.name);
  await audit("statut.deplace", "statut", a.id, { before: { position: a.position }, after: { position: na.position }, reason: `échangée avec ${b.offerId}` });
  rafraichir();
  redirect("/desk/statuts");
}

/** Taille maximale d'un tableau de messages : cinq cents lignes tiennent dans bien moins. */
const TAILLE_MAX = 1_000_000;

/**
 * Importer le tableau des messages de la première page : il REMPLACE la base. Rien n'est écrit si une seule ligne est refusée (la liste des lignes fautives revient) ; sinon
 * chaque message du tableau s'écrit, ceux qui n'y sont plus sortent (sans être effacés), et un seul geste d'audit dit combien.
 */
export async function importerMessagesAction(_p: ImportResult | null, form: FormData): Promise<ImportResult> {
  const desk = await requireDesk("/desk/statuts");
  const fichier = form.get("tableau");
  if (!(fichier instanceof File) || fichier.size === 0) return { ok: false, erreurs: ["Choisissez un fichier .xlsx."] };
  if (fichier.size > TAILLE_MAX) return { ok: false, erreurs: ["Le fichier dépasse 1 Mo : un tableau de messages est bien plus léger."] };
  let lignes;
  try {
    lignes = await lireClasseurDesMessages(await fichier.arrayBuffer());
  } catch (e) {
    return { ok: false, erreurs: [e instanceof Error ? e.message : "Fichier illisible."] };
  }
  const r = repo();
  const maintenant = new Date().toISOString();
  const avantRows = await listerMessages();
  const base = baseCourante(avantRows);
  const plan = planifierImport(base, lignes, desk.name, maintenant, () => `m-${randomUUID().slice(0, 8)}`);
  if (plan.erreurs.length > 0) return { ok: false, erreurs: plan.erreurs.slice(0, 12).concat(plan.erreurs.length > 12 ? [`… et ${plan.erreurs.length - 12} autres.`] : []) };
  for (const m of plan.ecrire) await r.upsertReference(REF_STATUT_MESSAGE, m.id, m, desk.name);
  const avantActifs = base.filter((m) => !m.retireeLe).length;
  await audit("statut.messages", "statut", "messages", {
    before: { actifs: avantActifs, ...(avantRows.length === 0 ? { source: "base du code" } : {}) },
    after: { actifs: plan.actifs, ajoutes: plan.ajoutes, modifies: plan.modifies, retires: plan.retires },
    reason: `import du tableau « ${fichier.name.slice(0, 80)} »`,
  });
  rafraichir();
  redirect(`/desk/statuts?importes=${plan.actifs}&ajoutes=${plan.ajoutes}&retires=${plan.retires}`);
}
