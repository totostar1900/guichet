"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { idDeLigne, lignesRetenues, messageDe, REF_STATUT, STATUTS_MAX, verifierMessage, type StatutLigne, type StatutMessage } from "@/lib/domain/statuts";
import { listerStatuts } from "@/lib/statuts";

export type StatutResult = { ok: false; error: string };

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

/** Écrire le message de la première page. Il remplace le précédent, qui reste à l'audit avec avant et après. */
export async function publierMessageAction(_p: StatutResult | null, form: FormData): Promise<StatutResult> {
  const desk = await requireDesk("/desk/statuts");
  const texte = String(form.get("texte") ?? "").trim();
  const erreur = verifierMessage(texte);
  if (erreur) return { ok: false, error: erreur };
  const rows = await listerStatuts();
  const avant = messageDe(rows);
  const message: StatutMessage = { kind: "message", id: "message", texte, par: desk.name, le: new Date().toISOString() };
  await repo().upsertReference(REF_STATUT, "message", message, desk.name);
  await audit("statut.message", "statut", "message", { before: { texte: avant }, after: { texte } });
  rafraichir();
  redirect("/desk/statuts?message=1");
}
