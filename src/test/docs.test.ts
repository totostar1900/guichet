import { describe, expect, it } from "vitest";
import { DOCS, PUBLIC_DOCS, blockText, searchEntries } from "@/data/docs";

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

describe("documentation : separation by audience", () => {
  const INTERNAL = [
    /\/desk\b/i,
    /\bsupabase\b/i,
    /\bvercel\b/i,
    /\bResend\b/,
    /\bcloudflare\b/i,
    /\btwilio\b/i,
    /\bopensanctions\b/i,
    /\banthropic\b|\bclaude\b/i,
    /\bmeta\b.*\bwhatsapp\b|cloud api/i,
    /[A-Z][A-Z0-9_]*_(KEY|SECRET|TOKEN|ID)\b/,
    /\bDESK_[A-Z_]+\b/,
    /\bSQL\b|\bRLS\b|row level|webhook|cron\b|migration/i,
    /\bSVT\b/,
    /\bfraude\b|\bfraud\b/i,
    /\bgithub\b|src\/|\.ts\b/i,
    /sernniidkjkwqromvmqu/,
  ];
  it("keeps every internal page on the desk and every public page free of internal details", () => {
    for (const d of DOCS) {
      if (d.visibility === "public") {
        expect(d.audience).toEqual(["client"]);
        for (const c of d.chapters) {
          const text = `${c.title.fr} ${c.title.en} ${c.blocks.map((b) => `${blockText(b, "fr")} ${blockText(b, "en")}`).join(" ")}`;
          for (const re of INTERNAL) expect({ page: d.slug, chapter: c.id, hit: text.match(re)?.[0] ?? null }).toEqual({ page: d.slug, chapter: c.id, hit: null });
        }
      } else {
        expect(d.visibility).toBe("desk");
      }
    }
    expect(PUBLIC_DOCS.map((d) => d.slug)).toEqual(["aide"]);
  });
});
