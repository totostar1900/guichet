import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { aLaUne, pourquoiLu, titreLu, type NewsItem } from "@/lib/news";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
/* Le code, pas ce qu'on en dit : ces fichiers citent l'ancien choix dans
   leurs notes, pour expliquer pourquoi il n'est plus là. */
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/** Les trois surfaces qui portent le titre « À la une ». */
const SURFACES = ["src/app/Console.tsx", "src/app/marche/page.tsx", "src/app/actualites/page.tsx"];

const item = (over: Partial<NewsItem> = {}): NewsItem =>
  ({
    id: "n1",
    url: "https://exemple.test/a",
    domain: "exemple.test",
    title: "Un titre",
    why: "Ce que ça change.",
    source: "BVMAC",
    publishedAt: "2026-10-20T08:00:00Z",
    rubric: "bvmac",
    links: [],
    featured: false,
    status: "publiee",
    createdAt: "2026-10-20T08:00:00Z",
    updatedAt: "2026-10-20T08:00:00Z",
    ...over,
  }) as NewsItem;

/**
 * « À LA UNE » DÉSIGNE UN SEUL ARTICLE, SUR LES TROIS SURFACES.
 *
 * Relevé le 24 octobre 2026 : « /actualites » prenait celui que le desk a
 * épinglé, « /marche » prenait le plus récent, et les deux écrivaient « À la
 * une » au-dessus. Un client qui passait de l'une à l'autre voyait le titre
 * changer d'article sans que rien n'ait bougé.
 */
describe("une seule une", () => {
  it("ne retient que l'article que le desk a épinglé", () => {
    const recent = item({ id: "recent", publishedAt: "2026-10-24T08:00:00Z" });
    const epingle = item({ id: "epingle", featured: true, publishedAt: "2026-10-01T08:00:00Z" });
    expect(aLaUne([recent, epingle])?.id, "le plus récent a repris la une à l'épinglé").toBe("epingle");
  });

  /* LE PLUS RÉCENT N'EST PAS UNE DÉCISION, c'est un ordre de tri. Le
     présenter sous ce titre prêterait à la maison un choix qu'elle n'a pas
     fait — et la section a le droit de disparaître, comme toutes les autres. */
  it("ne désigne personne quand le desk n'a rien épinglé", () => {
    expect(aLaUne([item(), item({ id: "n2" })])).toBeUndefined();
    expect(aLaUne([])).toBeUndefined();
  });

  it("laisse la traduction du desk gagner sur le dictionnaire", () => {
    /* Un titre de presse se retraduit mal mot à mot : quand le desk en a
       écrit un, il passe. Sinon la chaîne française est la clef, comme
       partout ailleurs. */
    const crie = (s: string) => s.toUpperCase();
    expect(titreLu(item({ titleEn: "A headline" }), "en", crie)).toBe("A headline");
    expect(titreLu(item(), "en", crie)).toBe("UN TITRE");
    expect(titreLu(item({ titleEn: "A headline" }), "fr", crie)).toBe("UN TITRE");
    expect(pourquoiLu(item({ whyEn: "Why it matters." }), "en", crie)).toBe("Why it matters.");
    expect(pourquoiLu(item(), "en", crie)).toBe("CE QUE ÇA CHANGE.");
  });

  /* AUCUNE SURFACE NE REFAIT LE CHOIX. Deux lignes suffisaient à le refaire —
     « find((n) => n.featured) » ou « actualites[0] » — et c'est exactement
     ainsi que les deux pages avaient divergé. */
  it("ne laisse aucune page choisir sa une toute seule", () => {
    for (const f of SURFACES) {
      const src = code(f);
      expect(src, `${f} refait le choix de la une au lieu de passer par « aLaUne »`).not.toMatch(/\.find\(\s*\(\s*\w+\s*\)\s*=>\s*\w+\.featured\s*\)/);
      expect(src, `${f} n'appelle plus « aLaUne »`).toContain("aLaUne(");
    }
  });

  /* ET AUCUNE NE REND LE TITRE BRUT : « /marche » écrivait « n.title » tel
     quel, c'est-à-dire du français à un lecteur anglais, sur la seule des
     trois surfaces où personne ne l'avait remarqué. */
  it("fait lire le titre dans la langue du lecteur", () => {
    for (const f of SURFACES) {
      expect(code(f), `${f} rend le titre d'une dépêche sans passer par « titreLu »`).toContain("titreLu(");
    }
  });
});
