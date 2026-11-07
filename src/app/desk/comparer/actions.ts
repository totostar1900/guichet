"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireResponsable } from "@/lib/auth";
import { repo } from "@/lib/data";
import { loadTauxBancaire, TAUX_BANCAIRE_KEY } from "@/lib/policy";
import { REF } from "@/lib/reference";
import { localIso } from "@/lib/format";

export type TauxResult = { ok: true; message: string } | { ok: false; error: string };

const schema = z.object({ pct: z.coerce.number().min(0).max(25) });

/** Le taux bancaire de référence du comparatif : une décision de maison, donc du responsable, tracée avec sa valeur d'avant. */
export async function fixerTauxBancaire(_p: TauxResult | null, form: FormData): Promise<TauxResult> {
  const me = await requireResponsable("/desk/comparer");
  const p = schema.safeParse({ pct: String(form.get("pct") ?? "").replace(",", ".") });
  if (!p.success) return { ok: false, error: "Un taux annuel entre 0 et 25 %." };
  const before = await loadTauxBancaire();
  const next = { pct: Math.round(p.data.pct * 100) / 100, on: localIso(new Date()) };
  await repo().upsertReference(REF.policy, TAUX_BANCAIRE_KEY, next, me.name);
  await audit("policy.taux_bancaire", "reference", `${REF.policy}/${TAUX_BANCAIRE_KEY}`, { before, after: next, reason: `taux bancaire de référence ${next.pct} %` });
  revalidatePath("/desk/comparer");
  revalidatePath("/comparer");
  return { ok: true, message: `Taux de référence arrêté à ${next.pct} % le ${next.on}.` };
}
