import { describe, expect, it } from "vitest";
import { DOCS, blockText, searchEntries } from "@/data/docs";

describe("documentation", () => {
  it("has unique slugs and chapter ids, and both languages everywhere", () => {
    const slugs = DOCS.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const d of DOCS) {
      const ids = d.chapters.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(d.title.fr && d.title.en && d.summary.fr && d.summary.en).toBeTruthy();
      for (const c of d.chapters) {
        expect(c.title.fr && c.title.en).toBeTruthy();
        for (const b of c.blocks) {
          expect(blockText(b, "fr").trim().length).toBeGreaterThan(0);
          expect(blockText(b, "en").trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
  it("indexes every chapter for search in both languages", () => {
    const n = DOCS.reduce((s, d) => s + d.chapters.length, 0);
    expect(searchEntries("fr")).toHaveLength(n);
    expect(searchEntries("en")).toHaveLength(n);
    expect(searchEntries("en").some((e) => /second factor/i.test(e.text))).toBe(true);
  });
});
