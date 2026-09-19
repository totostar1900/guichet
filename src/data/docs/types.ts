/**
 * The team documentation, as data: pages made of chapters made of blocks, each
 * text in French and English. Rendered under /desk/docs with a navigation tree,
 * an outline of the open page, search and audience filters. Plain words: the
 * reader may be a client adviser, a manager, an auditor or a new technician.
 */
export interface L {
  fr: string;
  en: string;
}
export const l = (fr: string, en: string): L => ({ fr, en });

export type Audience = "client" | "desk" | "admin" | "tech";
export const AUDIENCE_LABEL: Record<Audience, L> = {
  client: l("Clients", "Clients"),
  desk: l("Desk", "Desk"),
  admin: l("Administration", "Administration"),
  tech: l("Technique", "Technical"),
};

export type DocBlock =
  | { type: "p"; text: L }
  | { type: "lead"; text: L }
  | { type: "list"; items: L[] }
  | { type: "steps"; items: L[] }
  | { type: "table"; head: L[]; rows: L[][] }
  | { type: "flow"; steps: L[] }
  | { type: "note"; kind: "info" | "warn" | "rule"; text: L }
  | { type: "link"; href: string; label: L; hint?: L };

export interface DocChapter {
  id: string;
  title: L;
  blocks: DocBlock[];
}

/**
 * Who may open the page. `desk` never leaves /desk (role + second factor).
 * `public` is rendered to clients on /info/aide : allowed only for a page
 * written for clients alone, and a test refuses any internal detail in it.
 */
export type Visibility = "desk" | "public";

export interface DocPage {
  slug: string;
  visibility: Visibility;
  title: L;
  summary: L;
  audience: Audience[];
  /** Reading order in the navigation tree. */
  order: number;
  /** Last day the text was checked against the application (YYYY-MM-DD). */
  checkedOn: string;
  owner: string;
  chapters: DocChapter[];
}
