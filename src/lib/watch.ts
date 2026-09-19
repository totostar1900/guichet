import "server-only";
import { loadRegistry } from "@/lib/reference";
import { repo } from "@/lib/data";
import { displayStatus, statusLabel } from "@/lib/domain/status";
import { summarize } from "@/lib/domain/summary";
import type { Contact, Offer, Watch } from "@/lib/domain/types";
import { COMPANY } from "@/lib/config";
import { notifyRaw } from "@/lib/notify/dispatch";

/**
 * Followed lines: what a client is told when the figure or the state of a
 * line moves : a new close, a price set by the desk, a closing tomorrow,
 * results published. One message per change, never twice for the same state.
 */
export function watchSnapshot(o: Offer, now = new Date()): { hero: string; status: string } {
  const s = summarize(o, now);
  return { hero: `${s.hero} ${s.heroUnit ?? s.heroSub}`.trim(), status: statusLabel(o, displayStatus(o, now)) };
}

export function watchMessage(o: Offer, prev: Watch, next: { hero: string; status: string }, firstName?: string): { subject: string; text: string } {
  const s = summarize(o, new Date());
  const changes: string[] = [];
  if (prev.lastStatus && prev.lastStatus !== next.status) changes.push(`statut : ${prev.lastStatus} → ${next.status}`);
  if (prev.lastHero && prev.lastHero !== next.hero) changes.push(`${s.kind === "Action" || s.kind === "OPCVM" ? "rendement / cours" : "rendement"} : ${prev.lastHero} → ${next.hero}`);
  const text = `${firstName ? `Bonjour ${firstName},\n\n` : ""}${COMPANY.name} · ligne suivie\n${o.title}\n${changes.join("\n")}\n\n${s.primary ? `${s.primary.label} : ${process.env.NEXT_PUBLIC_APP_URL ?? ""}/offres/${o.id}?intent=${s.primary.intent}` : `Fiche : ${process.env.NEXT_PUBLIC_APP_URL ?? ""}/offres/${o.id}`}\nPour ne plus suivre cette ligne : votre espace › Lignes suivies.`;
  return { subject: `${o.title} : ${changes[0] ?? "mise à jour"}`, text };
}

/** Daily pass: compare each watch with today's snapshot and message the client on change. */
export async function runWatchAlerts(now = new Date()): Promise<{ watches: number; alerted: number }> {
  await loadRegistry();
  const r = repo();
  const [watches, offers, contacts] = await Promise.all([r.listWatches(), r.listOffers(), r.listContacts()]);
  const byId = new Map(offers.map((o) => [o.id, o]));
  const contactById = new Map<string, Contact>(contacts.map((c) => [c.id, c]));
  let alerted = 0;
  for (const w of watches) {
    const o = byId.get(w.offerId);
    if (!o) continue;
    const next = watchSnapshot(o, now);
    if (next.hero === w.lastHero && next.status === w.lastStatus) continue;
    const c = contactById.get(w.userId);
    if (c) {
      const m = watchMessage(o, w, next, c.name.split(" ")[0]);
      await notifyRaw("watch", c, m, { offerId: o.id });
      alerted++;
    }
    await r.updateWatch(w.id, { lastHero: next.hero, lastStatus: next.status, alertedAt: now.toISOString() });
  }
  return { watches: watches.length, alerted };
}
