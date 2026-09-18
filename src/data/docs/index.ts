import { ADMINISTRATION } from "./administration";
import { FONCTIONNEMENT } from "./fonctionnement";
import { PLATEFORMES } from "./plateformes";
import { SUPPORT } from "./support";
import { TECHNIQUE } from "./technique";
import type { Audience, DocBlock, DocPage, L } from "./types";

export * from "./types";

/** Every documentation page, in reading order. */
export const DOCS: DocPage[] = [FONCTIONNEMENT, PLATEFORMES, SUPPORT, ADMINISTRATION, TECHNIQUE].sort((a, b) => a.order - b.order);

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
export function searchEntries(lang: "fr" | "en"): SearchEntry[] {
  return DOCS.flatMap((d) =>
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
