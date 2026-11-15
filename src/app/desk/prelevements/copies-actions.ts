"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { etapeDuMandat, MOTIFS_DE_REFUS_DE_COPIE, type MotifDeRefusDeCopie } from "@/lib/domain/mandat";
import { direLaCopieDuMandat } from "@/lib/notify/prelevement";
import type { PrelevementResult } from "./actions";

const PATH = "/desk/prelevements/copies";

/** Le mandat dont le desk vérifie la copie, et seulement s'il l'attend : un double clic ne valide pas deux fois. */
async function aVerifier(id: string) {
  const m = (await repo().listMandats()).find((x) => x.id === id);
  if (!m) return { erreur: "Mandat introuvable." as const };
  if (etapeDuMandat(m) !== "en_verification") return { erreur: "Ce mandat n'attend pas de vérification." as const };
  return { m };
}

/**
 * VALIDER LA COPIE : le mandat devient actif, le premier prélèvement peut partir (15 novembre 2026).
 * Le desk garde la copie au dossier du client ; elle reste lisible ici.
 */
export async function validerLaCopieAction(_p: PrelevementResult | null, form: FormData): Promise<PrelevementResult> {
  const desk = await requireDesk(PATH);
  const v = await aVerifier(String(form.get("id") ?? ""));
  if ("erreur" in v) return { ok: false, error: v.erreur ?? "Mandat introuvable." };
  const { m } = v;
  const r = repo();
  const le = new Date().toISOString();
  await r.updateMandat(m.id, { verifieLe: le, verifiePar: desk.name });
  await audit("mandat.copie_validee", "mandat", m.id, { before: { etape: "en_verification" }, after: { etape: "actif", verifiePar: desk.name }, reason: `Copie signée vérifiée : mandat ${m.ref}` });
  await r.logEvent({ kind: "desk", html: `<b>Copie du mandat ${m.ref} validée</b> · ${m.accountHolder} · le prélèvement peut partir · par ${desk.name}` });
  const envoi = await direLaCopieDuMandat({ ...m, verifieLe: le }, "validee");
  revalidatePath(PATH);
  revalidatePath("/desk/prelevements");
  revalidatePath("/moi/epargne");
  return { ok: true, message: envoi.sent ? "Mandat validé. Le client est prévenu." : `Mandat validé. Le client n'a pas pu être prévenu (${envoi.error ?? "canal injoignable"}) : l'état se lit dans son espace.` };
}

/**
 * REFUSER LA COPIE, AVEC UN MOTIF D'UNE LISTE FERMÉE : le client le lit, et renvoie une copie. Le mandat reste en attente.
 */
export async function refuserLaCopieAction(_p: PrelevementResult | null, form: FormData): Promise<PrelevementResult> {
  const desk = await requireDesk(PATH);
  const motif = String(form.get("motif") ?? "") as MotifDeRefusDeCopie;
  if (!(motif in MOTIFS_DE_REFUS_DE_COPIE)) return { ok: false, error: "Choisissez le motif du refus." };
  const v = await aVerifier(String(form.get("id") ?? ""));
  if ("erreur" in v) return { ok: false, error: v.erreur ?? "Mandat introuvable." };
  const { m } = v;
  const r = repo();
  const le = new Date().toISOString();
  await r.updateMandat(m.id, { refusMotif: motif, refusLe: le });
  await audit("mandat.copie_refusee", "mandat", m.id, { before: { etape: "en_verification" }, after: { etape: "copie_refusee", motif }, reason: `Copie refusée : ${MOTIFS_DE_REFUS_DE_COPIE[motif]}` });
  await r.logEvent({ kind: "desk", html: `<b>Copie du mandat ${m.ref} refusée</b> · ${m.accountHolder} · ${MOTIFS_DE_REFUS_DE_COPIE[motif]} · par ${desk.name}` });
  const envoi = await direLaCopieDuMandat({ ...m, refusMotif: motif, refusLe: le }, "refusee", { motif: MOTIFS_DE_REFUS_DE_COPIE[motif] });
  revalidatePath(PATH);
  revalidatePath("/desk/prelevements");
  revalidatePath("/moi/epargne");
  return { ok: true, message: envoi.sent ? "Copie refusée. Le client est prévenu et renverra une copie." : `Copie refusée. Le client n'a pas pu être prévenu (${envoi.error ?? "canal injoignable"}) : le motif se lit dans son espace.` };
}
