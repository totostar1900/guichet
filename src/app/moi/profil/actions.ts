"use server";

import { revalidatePath } from "next/cache";
import { computeProfile, PROFILE_QUESTIONS, type FinancialProfile } from "@/data/profile";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";

/** The seven answers become a profile; the journal keeps the day, never the answers. */
export async function saveProfile(answers: Record<string, number>, lessonsRead = 0): Promise<{ ok: true; profile: FinancialProfile } | { ok: false; error: string }> {
  const s = await requireSession("/moi/profil");
  for (const q of PROFILE_QUESTIONS) {
    const i = answers[q.key];
    if (q.multi) {
      if (!Number.isInteger(i) || i < 0 || i >= 1 << q.options.length) return { ok: false, error: "Une réponse manque." };
    } else if (!Number.isInteger(i) || i < 0 || i >= q.options.length) return { ok: false, error: "Une réponse manque." };
  }
  const profile = computeProfile(answers, Math.max(0, Math.min(60, Math.floor(Number(lessonsRead) || 0))));
  await repo().setFinancialProfile(s.userId, profile);
  await repo().logEvent({ kind: "system", html: `Profil financier établi par <b>${s.name}</b> : ${profile.kind}` });
  revalidatePath("/", "layout");
  return { ok: true, profile };
}
