import "server-only";
import { cache } from "react";
import { repo } from "@/lib/data";
import { type NewsItem, isVisible } from "./model";

export * from "./model";

/** Every news record the desk holds, newest first. */
export const loadNews = cache(async (): Promise<NewsItem[]> => {
  const rows = await repo().listNews();
  return rows
    .filter((n) => n && n.id)
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") || (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
});

/** What a reader sees: published, not expired (or every published item when `archive`). */
export async function publishedNews(now = new Date(), archive = false): Promise<NewsItem[]> {
  const all = await loadNews();
  return all.filter((n) => n.status === "publiee" && (archive || isVisible(n, now)));
}

/** Items linked to a line, a company, an issuer or a glossary term : for the « Actualités liées » block on a page. */
export async function newsFor(kind: NewsItem["links"][number]["kind"], key: string, now = new Date()): Promise<NewsItem[]> {
  const live = await publishedNews(now);
  return live.filter((n) => n.links.some((l) => l.kind === kind && l.key === key));
}

export async function getNews(id: string): Promise<NewsItem | undefined> {
  return (await loadNews()).find((n) => n.id === id);
}

export async function saveNews(item: NewsItem, by?: string): Promise<void> {
  await repo().upsertNews(by ? { ...item, updatedBy: item.updatedBy ?? by } : item);
}

export async function deleteNews(id: string): Promise<void> {
  await repo().deleteNews(id);
}
