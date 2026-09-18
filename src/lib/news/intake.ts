import "server-only";
import { repo } from "@/lib/data";
import { readLink } from "./fetch";
import { loadNews, saveNews } from "./index";
import { domainOf, newsId, urlsIn, type NewsItem } from "./model";

/**
 * A link sent by someone on the desk (WhatsApp, e-mail) lands in « Liens reçus »
 * with what the page says about itself, ready to be prepared. Nothing is
 * published by itself; a client's link is never taken.
 */
export async function receiveLinks(text: string, from: string, now = new Date()): Promise<NewsItem[]> {
  const urls = urlsIn(text).slice(0, 5);
  if (urls.length === 0) return [];
  const known = new Map((await loadNews()).map((n) => [n.url, n]));
  const note = text.replace(/https?:\/\/[^\s<>"')\]]+/gi, "").replace(/\s+/g, " ").trim();
  const out: NewsItem[] = [];
  for (const url of urls) {
    if (known.has(url)) continue;
    const meta = await readLink(url);
    const item: NewsItem = {
      id: newsId(now),
      url,
      domain: domainOf(url),
      title: meta.pageTitle ?? url,
      pageTitle: meta.pageTitle,
      why: "",
      source: meta.source,
      rubric: meta.rubric,
      format: meta.format,
      publishedAt: meta.publishedAt ?? now.toISOString(),
      links: [],
      featured: false,
      status: "recu",
      receivedFrom: from,
      note: note || meta.description?.slice(0, 200),
      linkOk: meta.ok,
      linkCheckedAt: now.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      updatedBy: from,
      version: 0,
    };
    await saveNews(item, from);
    out.push(item);
  }
  if (out.length) await repo().logEvent({ kind: "desk", html: `Lien${out.length > 1 ? "s" : ""} reçu${out.length > 1 ? "s" : ""} pour les actualités (${from.replace(/</g, "&lt;")}) : ${out.map((n) => n.domain).join(", ")}` });
  return out;
}
