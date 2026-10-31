import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DOCS, PUBLIC_DOCS, blockText, searchEntries } from "@/data/docs";

const DOSSIER = "src/data/docs";

/**
 * LES PAGES ÉCRITES DANS LE DOSSIER, reconnues à ce qu'elles construisent.
 *
 * Un fichier de ce dossier est une PAGE s'il déclare un `DocPage` ; sinon
 * c'est un module partagé — « chain.ts » porte la chaîne documentaire d'un
 * ordre, que deux écrans lisent, et n'a ni slug ni date de relecture. On ne
 * l'écarte donc pas par son nom : une liste d'exceptions nommées se périme au
 * premier module suivant, et personne ne s'en aperçoit.
 */
const pagesDuDossier = (): { fichier: string; slug: string }[] =>
  readdirSync(DOSSIER)
    .filter((f) => f.endsWith(".ts") && !["index.ts", "types.ts"].includes(f))
    .map((f) => ({ fichier: f, texte: readFileSync(`${DOSSIER}/${f}`, "utf8") }))
    .filter((x) => /:\s*DocPage\s*=/.test(x.texte))
    .map((x) => ({ fichier: x.fichier, slug: x.texte.match(/slug: "([^"]+)"/)?.[1] ?? "" }));

describe("documentation", () => {
  /**
   * TOUTE PAGE ÉCRITE EST UNE PAGE RENDUE.
   *
   * CE QUE CELA FERME, relevé le 31 octobre 2026 en vérifiant les cliquets qui
   * lisent la date du commit. « docs-exactes » liste ses pages en lisant le
   * DOSSIER ; l'application les lit dans le tableau `DOCS`, que `index.ts`
   * compose à la main, un import à la fois. Rien ne tenait les deux ensemble.
   *
   * Une page écrite et jamais importée serait donc invisible au lecteur — pas
   * de rubrique, pas d'adresse, pas de recherche — TOUT EN PASSANT les
   * cliquets de date et de langue, qui la trouvent dans le dossier. Elle
   * aurait l'air gardée. C'est la panne la plus coûteuse de cette maison :
   * celle dont le silence ressemble au bon fonctionnement.
   *
   * L'OUBLI EST LE CAS NORMAL, et c'est ce qui le rend dangereux : on écrit la
   * page, on la relit, on la date, et la ligne d'import est la seule chose qui
   * ne se voit pas en lisant son propre travail.
   */
  it("rend toute page écrite dans le dossier : aucune n'est oubliée à l'import", () => {
    const ecrites = pagesDuDossier();
    const rendues = new Set(DOCS.map((d) => d.slug));
    const oubliees = ecrites.filter((p) => !rendues.has(p.slug)).map((p) => `${p.fichier} → slug « ${p.slug} »`);
    expect(oubliees, `ces pages sont écrites et ne se lisent nulle part ; « src/data/docs/index.ts » ne les importe pas :\n  ${oubliees.join("\n  ")}`).toEqual([]);
    /* NON VACUITÉ. Le jour où le motif cesse de reconnaître une page — un
       `DocPage` écrit autrement, une page construite par une fonction — le
       relevé rend une liste vide, et « aucune page oubliée » est exactement ce
       qu'il répond. Les deux listes doivent donc se compter pareil. */
    expect(ecrites.length, "le relevé du dossier ne voit plus les pages : son zéro ne prouve rien").toBe(DOCS.length);
    expect(
      ecrites.filter((p) => !p.slug).map((p) => p.fichier),
      "ces pages n'ont pas de slug lisible : le relevé les compte sans savoir ce qu'elles sont",
    ).toEqual([]);
  });


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
