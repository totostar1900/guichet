import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * The assistant's working notes, copied into the repo under docs/notes and
 * shown on the desk (Documentation › Notes de travail). Plain Markdown with a
 * small front matter; read at request time so a push updates the page.
 */
export interface Note {
  slug: string;
  title: string;
  description: string;
  modified?: string;
  body: string;
}

const DIR = path.join(process.cwd(), "docs", "notes");

export function readNotes(): Note[] {
  let files: string[] = [];
  try {
    files = readdirSync(DIR).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  const notes = files.map((f) => {
    const raw = readFileSync(path.join(DIR, f), "utf8");
    const slug = f.replace(/\.md$/, "");
    let body = raw;
    let title = slug;
    let description = "";
    let modified: string | undefined;
    const fm = raw.match(/^---\n([\s\S]*?)\n---\n?/);
    if (fm) {
      body = raw.slice(fm[0].length);
      const get = (k: string) => fm[1].match(new RegExp(`^\\s*${k}:\\s*(.+)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, "");
      title = get("name") ?? slug;
      description = get("description") ?? "";
      modified = get("modified")?.slice(0, 10);
    } else {
      const h = body.match(/^#\s+(.+)$/m);
      if (h) title = h[1].trim();
    }
    // The note's own top heading repeats the section title; relative .md links become anchors on this page.
    body = body.replace(/^#\s+[^\n]+\n/, "").replace(/\]\(([a-z0-9-]+)\.md\)/gi, "](#$1)");
    return { slug, title, description, modified, body: body.trim() };
  });
  // README first, the index second, then the rest alphabetically.
  const rank = (n: Note) => (n.slug === "README" ? 0 : n.slug === "MEMORY" ? 1 : 2);
  return notes.sort((a, b) => rank(a) - rank(b) || a.slug.localeCompare(b.slug));
}
