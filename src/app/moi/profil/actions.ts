"use server";

import { revalidatePath } from "next/cache";
import { computeProfile, PROFILE_QUESTIONS, type FinancialProfile } from "@/data/profile";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";

/** The seven answers become a profile; the journal keeps the day, never the answers. */
export async function saveProfile(answers: Record<string, number>, lessonsRead = 0): Promise<{ ok: true; profile: FinancialProfile; avant?: string } | { ok: false; error: string }> {
  const s = await requireSession("/moi/profil");
  for (const q of PROFILE_QUESTIONS) {
    const i = answers[q.key];
    if (q.multi) {
      if (!Number.isInteger(i) || i < 0 || i >= 1 << q.options.length) return { ok: false, error: "Une réponse manque." };
    } else if (!Number.isInteger(i) || i < 0 || i >= q.options.length) return { ok: false, error: "Une réponse manque." };
  }
  /**
   * LES GARDE-FOUS D'UNE DÉCLARATION.
   *
   * Un profil d'adéquation n'est pas un réglage : c'est ce que le client déclare
   * de lui-même, et c'est sur cette déclaration que la maison juge si une ligne
   * lui convient. Depuis qu'il se modifie bloc par bloc, changer une réponse
   * après avoir vu laquelle ouvre quelle ligne est devenu facile, et c'est
   * exactement ainsi qu'un profil se truque.
   *
   * Trois gardes, et aucune n'empêche quoi que ce soit : elles rendent le
   * changement visible, ce qui suffit.
   *
   *   LA DATE suit, et computeProfile la pose : un profil de l'an dernier ne se
   *   présente pas comme celui d'aujourd'hui.
   *
   *   L'ANCIEN SE GARDE à l'audit, avec le nouveau. Rien d'autre ne conserve
   *   l'historique d'un profil, et sans cela « il a toujours été dynamique » ne
   *   se vérifie pas.
   *
   *   LE DESK LE VOIT, et lit le passage et non le seul état d'arrivée : passer
   *   de prudent à dynamique le jour où l'on veut une ligne se remarque, et
   *   c'est tout ce qu'on demande au journal.
   */
  const avant = await repo().getFinancialProfile(s.userId).catch(() => undefined);
  const profile = computeProfile(answers, Math.max(0, Math.min(60, Math.floor(Number(lessonsRead) || 0))));
  await repo().setFinancialProfile(s.userId, profile);
  const change = Boolean(avant && avant.kind !== profile.kind);
  await audit("profile.set", "financial_profile", s.userId, {
    before: avant ? { kind: avant.kind, measures: avant.measures, updatedAt: avant.updatedAt } : null,
    after: { kind: profile.kind, measures: profile.measures, updatedAt: profile.updatedAt },
    reason: change ? `${avant!.kind} → ${profile.kind}` : profile.kind,
  });
  await repo().logEvent({
    kind: "system",
    html: change
      ? `Profil financier <b>changé</b> par ${s.name} : ${avant!.kind} → <b>${profile.kind}</b>`
      : `Profil financier ${avant ? "revu" : "établi"} par <b>${s.name}</b> : ${profile.kind}`,
  });
  revalidatePath("/", "layout");
  // Le client lit le passage à l'écran : un changement de classe qui s'applique
  // en silence est un changement que personne n'a décidé.
  return { ok: true, profile, avant: avant?.kind };
}
