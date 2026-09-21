import type { DocumentType, TemplateText } from "@/lib/domain/types";
import { repo } from "@/lib/data";
import { PASSAGES } from "./passages-catalog";

/** Server side: the catalogue plus the resolver that reads the registry. Client code imports the catalogue directly. */
export * from "./passages-catalog";

export interface ResolvedPassages {
  /** passage key → the text in force (the desk's current version, or the code's default) */
  text: Record<string, string>;
  /** passage key → the version used (0 = the code's default) */
  versions: Record<string, number>;
}

/** The texts in force for one document type, with the version of each: what a generator uses and records. */
export async function resolvePassages(docType: DocumentType, lang: "fr" | "en" = "fr"): Promise<ResolvedPassages> {
  const defs = PASSAGES[docType] ?? [];
  const text: Record<string, string> = {};
  const versions: Record<string, number> = {};
  for (const d of defs) {
    text[d.key] = d[lang];
    versions[d.key] = 0;
  }
  if (defs.length === 0) return { text, versions };
  let rows: TemplateText[] = [];
  try {
    rows = await repo().listTemplateTexts(docType);
  } catch {
    // no registry yet (table absent): the defaults serve
  }
  for (const r of rows) {
    if (r.status !== "current" || !(r.passage in text)) continue;
    const t = lang === "en" ? r.en || r.fr : r.fr;
    if (t.trim()) {
      text[r.passage] = t;
      versions[r.passage] = r.version;
    }
  }
  return { text, versions };
}

