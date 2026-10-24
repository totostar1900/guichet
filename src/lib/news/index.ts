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

/**
 * CE QUE « À LA UNE » DÉSIGNE, ET IL N'Y EN A QU'UN.
 *
 * Relevé le 24 octobre 2026 : trois surfaces portaient ce titre et deux
 * d'entre elles ne montraient pas le même article. « /actualites » prenait
 * celui que le desk a épinglé — « shown.find((n) => n.featured) » — et
 * « /marche » prenait le plus récent. Un client qui passait de l'une à
 * l'autre voyait « À la une » changer d'article sans que rien n'ait bougé.
 *
 * L'ÉPINGLÉ, ET RIEN D'AUTRE. « À la une » est une décision éditoriale :
 * quelqu'un au desk a dit « celui-ci d'abord ». Le plus récent n'est pas une
 * décision, c'est un ordre de tri — le présenter sous ce titre serait prêter
 * à la maison un choix qu'elle n'a pas fait. Sans épinglé, pas de une, et la
 * section disparaît : c'est la règle de toutes les autres.
 */
export const aLaUne = (items: NewsItem[]): NewsItem | undefined => items.find((n) => n.featured);

/**
 * Le titre et le « pourquoi ça compte » dans la langue du lecteur.
 *
 * Une traduction écrite à la main par le desk gagne sur le dictionnaire : un
 * titre de presse se retraduit mal mot à mot. À défaut, la chaîne française
 * EST la clef, comme partout ailleurs dans la maison.
 *
 * Ils vivaient en deux lambdas au milieu de « /actualites », et « /marche »
 * rendait donc « n.title » tel quel — c'est-à-dire du français à un lecteur
 * anglais, sur la seule des trois surfaces où personne ne l'avait remarqué.
 */
export const titreLu = (n: NewsItem, lang: string, t: (s: string) => string): string => (lang === "en" && n.titleEn ? n.titleEn : t(n.title));
export const pourquoiLu = (n: NewsItem, lang: string, t: (s: string) => string): string => (lang === "en" && n.whyEn ? n.whyEn : t(n.why));
