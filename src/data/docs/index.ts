import { ADMINISTRATION } from "./administration";
import { AIDE } from "./aide";
import { DOCUMENTS } from "./documents";
import { FONCTIONNEMENT } from "./fonctionnement";
import { INDICE } from "./indice";
import { PLATEFORMES } from "./plateformes";
import { PUBLICATIONS } from "./publications";
import { RELATION } from "./relation";
import { SOURCES } from "./sources";
import { SUPPORT } from "./support";
import { TECHNIQUE } from "./technique";
import type { Audience, DocBlock, DocPage, L } from "./types";

export * from "./types";

/** Every documentation page, in reading order. */
export const DOCS: DocPage[] = [AIDE, FONCTIONNEMENT, RELATION, DOCUMENTS, SOURCES, INDICE, PUBLICATIONS, PLATEFORMES, SUPPORT, ADMINISTRATION, TECHNIQUE].sort((a, b) => a.order - b.order);

/** What a client may read: public pages only. Everything else stays behind the desk. */
export const PUBLIC_DOCS: DocPage[] = DOCS.filter((d) => d.visibility === "public");

export const docBySlug = (slug: string): DocPage | undefined => DOCS.find((d) => d.slug === slug);

/** Plain text of a block, for search and snippets. */
export function blockText(b: DocBlock, lang: "fr" | "en"): string {
  const t = (x: L) => x[lang];
  switch (b.type) {
    case "p":
    case "lead":
    case "note":
      return t(b.text);
    case "list":
    case "steps":
      return b.items.map(t).join(" ");
    case "flow":
      return b.steps.map(t).join(" → ");
    case "table":
      return [...b.head.map(t), ...b.rows.flatMap((r) => r.map(t))].join(" ");
    case "link":
      return `${t(b.label)} ${b.hint ? t(b.hint) : ""}`;
    case "diagram":
    case "docmap":
    case "flows":
      return t(b.caption);
  }
}

export interface SearchEntry {
  slug: string;
  chapter: string;
  page: string;
  title: string;
  text: string;
  audience: Audience[];
  href: string;
}

/** One entry per chapter, in the reader's language. */
export function searchEntries(lang: "fr" | "en", pages: DocPage[] = DOCS): SearchEntry[] {
  return pages.flatMap((d) =>
    d.chapters.map((c) => ({
      slug: d.slug,
      chapter: c.id,
      page: d.title[lang],
      title: c.title[lang],
      text: c.blocks.map((b) => blockText(b, lang)).join(" "),
      audience: d.audience,
      href: `/desk/docs/${d.slug}#${c.id}`,
    })),
  );
}
