import "server-only";
import { repo } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { notifyRaw } from "@/lib/notify/dispatch";
import { linkAlive } from "./fetch";
import { loadNews, publishedNews, saveNews } from "./index";
import { DEFAULT_VISIBLE_DAYS, domainOf, guessSource, newsId, parseFeed, type NewsItem } from "./model";

/** Feeds the nightly watch reads: NEWS_FEEDS (comma-separated) on top of the BVMAC site's own feed. */
export function watchedFeeds(): string[] {
  const env = (process.env.NEWS_FEEDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return [...new Set(["https://www.bvm-ac.org/feed/", ...env])];
}

/** New links on the followed sites land in « Liens reçus » for the desk to sort; nothing is published by itself. */
export async function watchSources(now = new Date()): Promise<{ feeds: number; seen: number; added: string[]; errors: string[] }> {
  const known = new Set((await loadNews()).map((n) => n.url));
  const added: string[] = [];
  const errors: string[] = [];
  let seen = 0;
  for (const feed of watchedFeeds()) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12_000);
      const res = await fetch(feed, { headers: { "user-agent": "GuichetBot/1.0", accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" }, signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) {
        errors.push(`${feed} : ${res.status}`);
        continue;
      }
      const items = parseFeed(await res.text()).slice(0, 25);
      seen += items.length;
      for (const it of items) {
        if (known.has(it.url)) continue;
        // Only the recent ones: an old feed entry is not news.
        if (it.publishedAt && now.getTime() - new Date(it.publishedAt).getTime() > 14 * 86_400_000) continue;
        const domain = domainOf(it.url);
        const g = guessSource(domain);
        const item: NewsItem = {
          id: newsId(now),
          url: it.url,
          domain,
          title: it.title,
          pageTitle: it.title,
          why: "",
          source: g.source,
          rubric: g.rubric,
          format: /\.pdf(\?|$)/i.test(it.url) ? "PDF" : "page",
          publishedAt: it.publishedAt ?? now.toISOString(),
          links: [],
          featured: false,
          status: "recu",
          receivedFrom: `Veille · ${domain}`,
          note: it.summary,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          updatedBy: "veille",
          version: 0,
        };
        await saveNews(item, "veille");
        known.add(it.url);
        added.push(`${domain} : ${it.title}`);
      }
    } catch (e) {
      errors.push(`${feed} : ${e instanceof Error ? e.message : "erreur"}`);
    }
  }
  if (added.length) await repo().logEvent({ kind: "system", html: `Veille actualités : ${added.length} lien(s) reçu(s) à trier` });
  return { feeds: watchedFeeds().length, seen, added, errors };
}

/** Every published link is pinged; a dead one is flagged for Santé and on the desk list. */
export async function checkLinks(now = new Date()): Promise<{ checked: number; dead: string[] }> {
  const live = await publishedNews(now);
  const dead: string[] = [];
  for (const n of live) {
    const r = await linkAlive(n.url);
    if (!r.ok) dead.push(`${n.title} (${r.status ?? "injoignable"})`);
    await saveNews({ ...n, linkOk: r.ok, linkCheckedAt: now.toISOString() }, "veille");
  }
  if (dead.length) await repo().logEvent({ kind: "system", html: `Actualités : ${dead.length} lien(s) mort(s) : ${dead.slice(0, 3).join(" · ").replace(/</g, "&lt;")}` });
  return { checked: live.length, dead };
}

/** Friday's summary to every client who accepts our messages: the week's links, nothing else. */
export async function sendWeeklyNews(now = new Date()): Promise<{ items: number; sent: number; skipped: number }> {
  const since = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const items = (await publishedNews(now)).filter((n) => n.publishedAt >= since).slice(0, 8);
  if (items.length === 0) return { items: 0, sent: 0, skipped: 0 };
  const app = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const lines = items.map((n) => `• ${fmtDate(n.publishedAt, false)} · ${n.source} : ${n.title}\n  ${n.why}\n  ${n.url}`);
  const text = `Actualités de la semaine : Purpose Capital\n\n${lines.join("\n\n")}\n\nTout retrouver : ${app}/actualites\nRépondez STOP pour ne plus recevoir nos messages.`;
  const subject = `Actualités de la semaine · ${items.length} publication${items.length > 1 ? "s" : ""}`;
  let sent = 0;
  let skipped = 0;
  for (const c of await repo().listContacts()) {
    if (!c.whatsappOptIn && !c.email) {
      skipped++;
      continue;
    }
    const res = await notifyRaw("digest", c, { subject, text });
    if (res.some((n) => n.status === "sent" || n.status === "queued")) sent++;
    else skipped++;
  }
  await repo().logEvent({ kind: "system", html: `Résumé hebdomadaire des actualités envoyé : ${sent} destinataire(s), ${items.length} lien(s)` });
  return { items: items.length, sent, skipped };
}

export const defaultVisibleUntil = (publishedAt: string): string => {
  const d = new Date(publishedAt);
  d.setDate(d.getDate() + DEFAULT_VISIBLE_DAYS);
  return d.toISOString().slice(0, 10);
};
