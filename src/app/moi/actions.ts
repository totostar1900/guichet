"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { generateStatement } from "@/lib/documents/generate";

export type StatementResult = { ok: true; id: string; number: string } | { ok: false; error: string };

export async function statementAction(_p: StatementResult | null, form: FormData): Promise<StatementResult> {
  const s = await requireSession("/moi");
  const type = form.get("type") === "attestation" ? "attestation" : "releve";
  try {
    const d = await generateStatement(type, s.userId, s.name);
    revalidatePath("/moi");
    return { ok: true, id: d.id, number: d.number };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Génération impossible." };
  }
}
