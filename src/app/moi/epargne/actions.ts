"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { audit } from "@/lib/audit";
import { createStandingAction } from "../standing-actions";
import { creerMandatAction, envoyerCodeMandatAction } from "../prelevements/actions";

export type MiseEnPlace =
  | { ok: true; standingId?: string; mandatId: string; message: string; code?: string }
  | { ok: false; error: string; standingId?: string; mandatId?: string };

/**
 * METTRE UNE ÉPARGNE EN PLACE, D'UN SEUL GESTE : l'épargne, son mandat, et le code (décision du 15 novembre 2026, maquette « Parcours »).
 *
 * L'épargne et le mandat naissent ensemble, tous deux non signés : rien n'est prélevé tant que le code n'a pas été saisi, et c'est la signature qui les active.
 * Chaque écriture passe par l'action qui la gardait déjà (garde, audit, journal) : ce parcours les chaîne, il ne les réécrit pas.
 *
 * Idempotent là où cela compte : quand le code n'a pas pu partir, le client réessaie avec le mandat déjà créé (« mandatId »), et seul l'envoi est refait.
 * Si le mandat ne peut pas naître (un RIB incomplet), l'épargne qu'on venait de poser est retirée : on ne laisse pas une épargne sans mandat que personne n'a demandée.
 */
export async function mettreEnPlaceAction(_p: MiseEnPlace | null, form: FormData): Promise<MiseEnPlace> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Connectez-vous pour programmer un versement." };

  let standingId = String(form.get("standingId") ?? "");
  let mandatId = String(form.get("mandatId") ?? "");

  const provision = String(form.get("objet") ?? "") === "provision";

  /* LA PROVISION N'A PAS D'ÉPARGNE : le mandat naît seul, avec son jour (1 à 28), et suit la même route (code, signature, copie). */
  if (!mandatId && provision) {
    const m = new FormData();
    m.set("objet", "provision");
    for (const k of ["amount", "dayOfMonth", "accountHolder", "bankName", "bankAccount"]) m.set(k, String(form.get(k) ?? ""));
    const mandat = await creerMandatAction(null, m);
    if (!mandat.ok || !mandat.id) return { ok: false, error: mandat.ok ? "Le mandat n'a pas pu être préparé. Réessayez." : mandat.error };
    mandatId = mandat.id;
  } else if (!mandatId) {
    const e = await createStandingAction(null, form);
    if (!e.ok) return { ok: false, error: e.error };
    standingId = e.standingId ?? "";

    const m = new FormData();
    m.set("objet", "instruction");
    m.set("standingId", standingId);
    m.set("amount", String(form.get("amount") ?? ""));
    m.set("accountHolder", String(form.get("accountHolder") ?? ""));
    m.set("bankName", String(form.get("bankName") ?? ""));
    m.set("bankAccount", String(form.get("bankAccount") ?? ""));
    const mandat = await creerMandatAction(null, m);
    if (!mandat.ok || !mandat.id) {
      await retirerLaCoquille(standingId);
      return { ok: false, error: mandat.ok ? "Le mandat n'a pas pu être préparé. Réessayez." : mandat.error };
    }
    mandatId = mandat.id;
  }

  const envoi = new FormData();
  envoi.set("id", mandatId);
  const code = await envoyerCodeMandatAction(null, envoi);
  if (!code.ok) return { ok: false, error: code.error, standingId, mandatId };
  revalidatePath("/moi/epargne");
  return { ok: true, standingId, mandatId, message: code.message ?? "Code envoyé.", code: code.code };
}

/** L'épargne posée pour rien : retirée, avec sa trace. */
async function retirerLaCoquille(standingId: string) {
  if (!standingId) return;
  const r = repo();
  await r.updateStandingOrder(standingId, { state: "annulee", stopReason: "mandat non préparé" });
  await audit("standing.stop", "standing", standingId, { before: { state: "active" }, after: { state: "annulee", motif: "mandat non préparé" } });
}
