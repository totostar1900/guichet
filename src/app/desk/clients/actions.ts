"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { generateKycDocument } from "@/lib/documents/generate";
import { REVIEW_YEARS } from "@/lib/kyc/checklist";
import { notifyKycDecision } from "@/lib/kyc/notify";

export type ReviewResult = { ok: true; message: string } | { ok: false; error: string };

const schema = z.object({
  fileId: z.string().min(1),
  decision: z.enum(["en_revue", "approuve", "complements", "refuse"]),
  risk: z.enum(["faible", "moyen", "eleve"]).optional(),
  custodianAccount: z.string().trim().optional(),
  notes: z.string().trim().max(2000).optional(),
  requestedItems: z.string().trim().max(1000).optional(),
});

/** The compliance decision on a file. Approval opens the account: tier 2, convention + custodian file generated, client told. */
export async function reviewAction(_p: ReviewResult | null, form: FormData): Promise<ReviewResult> {
  const desk = await requireDesk("/desk/clients");
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "Décision invalide." };
  const { fileId, decision, risk, custodianAccount, notes, requestedItems } = p.data;
  const r = repo();
  const f = await r.getClientFile(fileId);
  if (!f) return { ok: false, error: "Dossier introuvable." };
  const now = new Date();
  const verified = form.getAll("verified").map(String);
  const documents = f.documents.map((d) => ({ ...d, verified: verified.includes(d.kind) || d.verified }));

  if (decision === "approuve") {
    if (!risk) return { ok: false, error: "Attribuez une notation de risque avant d'approuver." };
    if (!f.consents.conventionAt) return { ok: false, error: "La convention n'a pas été acceptée par le client." };
    const next = new Date(now);
    next.setFullYear(next.getFullYear() + REVIEW_YEARS[risk]);
    const updated = await r.updateClientFile(fileId, {
      status: "approuve",
      documents,
      review: { ...f.review, risk, notes, reviewedBy: desk.name, reviewedAt: now.toISOString(), nextReviewOn: next.toISOString().slice(0, 10), custodianAccount: custodianAccount || f.review.custodianAccount },
    });
    await generateKycDocument("convention", updated, desk.name);
    await generateKycDocument("dossier_svt", updated, desk.name);
    await r.logEvent({ kind: "desk", html: `<b>Compte ouvert</b> — ${updated.identity.name} (${updated.kind}, risque ${risk}${custodianAccount ? `, compte ${custodianAccount}` : ""}) · par ${desk.name}` });
    await notifyKycDecision(updated, "approuve");
    revalidatePath("/desk/clients");
    revalidatePath("/desk");
    return { ok: true, message: "Compte ouvert : convention et dossier d'ouverture générés, client prévenu." };
  }
  if (decision === "complements") {
    if (!requestedItems) return { ok: false, error: "Indiquez les compléments demandés." };
    const updated = await r.updateClientFile(fileId, { status: "complements", documents, review: { ...f.review, notes, requestedItems, reviewedBy: desk.name, reviewedAt: now.toISOString() } });
    await r.logEvent({ kind: "desk", html: `Dossier ${updated.identity.name} — <b>compléments demandés</b> : ${requestedItems} · ${desk.name}` });
    await notifyKycDecision(updated, "complements", requestedItems);
    revalidatePath("/desk/clients");
    return { ok: true, message: "Compléments demandés, client prévenu." };
  }
  if (decision === "refuse") {
    const updated = await r.updateClientFile(fileId, { status: "refuse", documents, review: { ...f.review, risk, notes, reviewedBy: desk.name, reviewedAt: now.toISOString() } });
    await r.logEvent({ kind: "desk", html: `Dossier ${updated.identity.name} — <b>refusé</b> · ${desk.name}${notes ? ` — ${notes}` : ""}` });
    await notifyKycDecision(updated, "refuse", notes);
    revalidatePath("/desk/clients");
    return { ok: true, message: "Dossier refusé." };
  }
  await r.updateClientFile(fileId, { status: "en_revue", documents, review: { ...f.review, risk: risk ?? f.review.risk, notes: notes ?? f.review.notes, reviewedBy: desk.name } });
  revalidatePath("/desk/clients");
  return { ok: true, message: "Revue enregistrée." };
}
