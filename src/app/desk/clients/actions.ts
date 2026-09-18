"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { generateKycDocument } from "@/lib/documents/generate";
import { REVIEW_YEARS } from "@/lib/kyc/checklist";
import { notifyKycDecision } from "@/lib/kyc/notify";
import { screenFile } from "@/lib/kyc/screening";

export type ReviewResult = { ok: true; message: string } | { ok: false; error: string };

const schema = z.object({
  fileId: z.string().min(1),
  decision: z.enum(["en_revue", "approuve", "complements", "refuse"]),
  risk: z.enum(["faible", "moyen", "eleve"]).optional(),
  custodianAccount: z.string().trim().optional(),
  notes: z.string().trim().max(2000).optional(),
  requestedItems: z.string().trim().max(1000).optional(),
  screeningLists: z.string().trim().max(300).optional(),
  screeningOutcome: z.enum(["aucun", "faux_positif", "confirme"]).optional(),
  screeningNotes: z.string().trim().max(1000).optional(),
});

/** The compliance decision on a file. Approval opens the account: tier 2, convention + custodian file generated, client told. */
export async function reviewAction(_p: ReviewResult | null, form: FormData): Promise<ReviewResult> {
  const desk = await requireDesk("/desk/clients");
  // Empty selects and inputs mean « not given », not an invalid value.
  const raw = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string" && v.trim() !== ""));
  const p = schema.safeParse(raw);
  if (!p.success) return { ok: false, error: `Saisie invalide : ${p.error.issues[0]?.path.join(".") ?? ""} — ${p.error.issues[0]?.message ?? ""}` };
  const { fileId, decision, risk, custodianAccount, notes, requestedItems, screeningLists, screeningOutcome, screeningNotes } = p.data;
  const r = repo();
  const f = await r.getClientFile(fileId);
  if (!f) return { ok: false, error: "Dossier introuvable." };
  const now = new Date();
  const verified = form.getAll("verified").map(String);
  const documents = f.documents.map((d) => ({ ...d, verified: verified.includes(d.kind) || d.verified }));
  // The compliance officer's attestation: recorded whenever lists + outcome are given.
  const screening = screeningOutcome && screeningLists ? { ...f.screening, attestedBy: desk.name, attestedAt: now.toISOString(), lists: screeningLists, outcome: screeningOutcome, notes: screeningNotes } : f.screening;

  if (decision === "approuve") {
    if (!risk) return { ok: false, error: "Attribuez une notation de risque avant d'approuver." };
    if (!f.consents.conventionAt) return { ok: false, error: "La convention n'a pas été acceptée par le client." };
    if (!screening?.attestedAt) return { ok: false, error: "Renseignez le contrôle sanctions / PPE (listes consultées et résultat) avant d'approuver." };
    if (screening.outcome === "confirme") return { ok: false, error: "Correspondance sanctions / PPE confirmée : approbation impossible sans diligence renforcée documentée (notes) et changement de résultat." };
    const next = new Date(now);
    next.setFullYear(next.getFullYear() + REVIEW_YEARS[risk]);
    const updated = await r.updateClientFile(fileId, {
      status: "approuve",
      documents,
      screening,
      review: { ...f.review, risk, notes, reviewedBy: desk.name, reviewedAt: now.toISOString(), nextReviewOn: next.toISOString().slice(0, 10), custodianAccount: custodianAccount || f.review.custodianAccount },
    });
    await generateKycDocument("convention", updated, desk.name);
    await generateKycDocument("dossier_svt", updated, desk.name);
    await r.logEvent({ kind: "desk", html: `<b>Dossier approuvé</b> — ${updated.identity.name} (${updated.kind}, risque ${risk}${custodianAccount ? `, compte ${custodianAccount}` : ""}) · par ${desk.name}` });
    await notifyKycDecision(updated, "approuve");
    revalidatePath("/desk/clients");
    revalidatePath("/desk");
    return { ok: true, message: custodianAccount ? "Compte actif : convention et dossier d'ouverture générés, client prévenu." : "Dossier approuvé : convention et demande d'ouverture de sous-compte générées. Saisissez le numéro de sous-compte dès retour du SVT." };
  }
  if (decision === "complements") {
    if (!requestedItems) return { ok: false, error: "Indiquez les compléments demandés dans le champ « Compléments à demander » (ex. justificatif de domicile lisible), puis cliquez à nouveau." };
    const updated = await r.updateClientFile(fileId, { status: "complements", documents, screening, review: { ...f.review, notes, requestedItems, reviewedBy: desk.name, reviewedAt: now.toISOString() } });
    await r.logEvent({ kind: "desk", html: `Dossier ${updated.identity.name} — <b>compléments demandés</b> : ${requestedItems} · ${desk.name}` });
    await notifyKycDecision(updated, "complements", requestedItems);
    revalidatePath("/desk/clients");
    return { ok: true, message: "Compléments demandés, client prévenu." };
  }
  if (decision === "refuse") {
    const updated = await r.updateClientFile(fileId, { status: "refuse", documents, screening, review: { ...f.review, risk, notes, reviewedBy: desk.name, reviewedAt: now.toISOString() } });
    await r.logEvent({ kind: "desk", html: `Dossier ${updated.identity.name} — <b>refusé</b> · ${desk.name}${notes ? ` — ${notes}` : ""}` });
    await notifyKycDecision(updated, "refuse", notes);
    revalidatePath("/desk/clients");
    return { ok: true, message: "Dossier refusé." };
  }
  await r.updateClientFile(fileId, { status: "en_revue", documents, screening, review: { ...f.review, risk: risk ?? f.review.risk, notes: notes ?? f.review.notes, reviewedBy: desk.name } });
  revalidatePath("/desk/clients");
  return { ok: true, message: "Revue enregistrée." };
}

/** After approval: the SVT returned the nominative sub-account number → account active (tier 2), client told. */
export async function setCustodianAccountAction(_p: ReviewResult | null, form: FormData): Promise<ReviewResult> {
  const desk = await requireDesk("/desk/clients");
  const fileId = String(form.get("fileId") ?? "");
  const custodianAccount = String(form.get("custodianAccount") ?? "").trim();
  if (!custodianAccount) return { ok: false, error: "Indiquez le numéro de sous-compte attribué par le SVT." };
  const r = repo();
  const f = await r.getClientFile(fileId);
  if (!f || f.status !== "approuve") return { ok: false, error: "Le dossier doit être approuvé." };
  const updated = await r.updateClientFile(fileId, { review: { ...f.review, custodianAccount } });
  await r.logEvent({ kind: "desk", html: `<b>Sous-compte nominatif ouvert</b> — ${updated.identity.name} · n° ${custodianAccount} · par ${desk.name}` });
  await notifyKycDecision(updated, "approuve");
  revalidatePath("/desk/clients");
  revalidatePath("/desk");
  return { ok: true, message: "Compte actif : le client peut passer des prises fermes." };
}

/** Optional automatic pre-check (OpenSanctions) — hints for the officer, stored on the file. */
export async function autoScreenAction(_p: ReviewResult | null, form: FormData): Promise<ReviewResult> {
  const desk = await requireDesk("/desk/clients");
  const fileId = String(form.get("fileId") ?? "");
  const r = repo();
  const f = await r.getClientFile(fileId);
  if (!f) return { ok: false, error: "Dossier introuvable." };
  const auto = await screenFile(f);
  await r.updateClientFile(fileId, { screening: { ...f.screening, auto } });
  await r.logEvent({ kind: "desk", html: `Pré-contrôle sanctions / PPE — ${f.identity.name} : ${auto.provider === "none" ? "fournisseur non configuré" : `${auto.hits.length} correspondance(s)${auto.error ? ` (${auto.error})` : ""}`} · ${desk.name}` });
  revalidatePath("/desk/clients");
  return auto.provider === "none" ? { ok: false, error: "OPENSANCTIONS_API_KEY absente : le pré-contrôle automatique est désactivé. Consultez les listes manuellement et attestez ci-dessous." } : { ok: true, message: `Pré-contrôle effectué : ${auto.hits.length} correspondance(s) à examiner.` };
}
