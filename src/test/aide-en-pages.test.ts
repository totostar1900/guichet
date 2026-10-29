import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { AIDE_PAGES } from "@/lib/nav-groups";
import { COLONNE_CLIENT, COLONNE_DESK, COLONNE_VISITEUR } from "@/lib/nav-colonne";
import { PUBLIC_DOCS } from "@/data/docs";
import { loadLessons } from "@/lib/reference";
import { buildGuideIndex } from "@/lib/guide-index";
import { translator } from "@/i18n/core";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * L'AIDE SE LIT EN PAGES, PAS EN ACCORDÉONS — RELEVÉ LE 29 OCTOBRE 2026.
 *
 * Le menu « Aide » portait une entrée, « Le guide », qui n'ouvrait rien : une
 * page de SIX SECTIONS REPLIÉES. Pour atteindre le glossaire — destination de
 * soixante-six entrées de la recherche, la moitié de l'index — il fallait
 * ouvrir cette page, descendre, et déplier la cinquième section. Le
 * simulateur était derrière la quatrième.
 *
 * ET LA PAGE DES QUESTIONS PORTAIT SES HUIT CHAPITRES DEUX FOIS : en tuiles,
 * puis en accordéons juste dessous. La tuile ne menait donc pas à son
 * chapitre, elle sautait à une ancre deux écrans plus bas, qu'il fallait
 * encore déplier. Chaque tuile annonçait un compte — « 11 questions » — qui
 * ne dit pas si la réponse cherchée s'y trouve, et qui mentait déjà sur « Ce
 * que Guichet fait pour vous », lequel n'en porte AUCUNE et affichait « en
 * clair ».
 *
 * Une section qu'on déplie n'a pas d'adresse : elle ne se partage pas, ne se
 * met pas en favori, et la recherche ne peut qu'y renvoyer en bloc.
 */
describe("l'aide se lit en pages", () => {
  /* LE MENU PORTE LES SECTIONS, ET PLUS LA PORTE QUI LES CACHAIT. */
  it("ne garde aucune entrée vers la page qui pliait le guide", () => {
    const toutes = [...COLONNE_CLIENT, ...COLONNE_DESK, ...COLONNE_VISITEUR].flatMap((g) => g.items.map((i) => i.href));
    expect(toutes, "une colonne mène encore à « /info », qui ne fait que rediriger").not.toContain("/info");
    const aide = AIDE_PAGES.map((p) => p.href);
    for (const h of ["/info/eclairages", "/info/parcours", "/info/simulateur", "/info/glossaire", "/info/aide"]) {
      expect(aide, `le menu Aide a perdu « ${h} »`).toContain(h);
    }
    // Non-vacuité : le menu compte bien plus que les quatre entrées d'avant.
    expect(aide.length, "le menu Aide est retombé à sa taille d'avant").toBeGreaterThanOrEqual(7);
  });

  /**
   * TROIS ADRESSES FIXES VIVENT SOUS « /info/[clé] », qui est dynamique.
   *
   * Next sert la route statique avant la dynamique : le jour où un éclairage
   * recevrait la clé « glossaire », sa page cesserait de s'ouvrir et personne
   * ne le verrait — la route existe, elle rend simplement autre chose.
   */
  it("ne laisse aucun éclairage porter la clé d'une page du guide", async () => {
    const fixes = fs
      .readdirSync(path.join(ROOT, "src/app/info"), { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("[") && fs.existsSync(path.join(ROOT, "src/app/info", e.name, "page.tsx")))
      .map((e) => e.name);
    expect(fixes, "les pages fixes du guide ne sont plus là").toEqual(expect.arrayContaining(["eclairages", "glossaire", "simulateur"]));
    const cles = (await loadLessons()).map((l) => l.key);
    const heurt = cles.filter((k) => fixes.includes(k));
    expect(heurt, `ces éclairages sont masqués par une page fixe de même nom : ${heurt.join(", ")}`).toEqual([]);
  });

  /* LES HUIT CHAPITRES ONT CHACUN SA PAGE, et la tuile y mène. */
  it("mène chaque tuile de l'aide à la page de son chapitre", () => {
    const src = code("src/app/info/aide/AideBrowser.tsx");
    expect(src, "la tuile ne mène plus à la page de son chapitre").toMatch(/href=\{`\/info\/aide\/\$\{c\.id\}`\}/);
    expect(src, "la tuile a retrouvé son compte de questions").not.toMatch(/\{n\} questions/);
    /* L'ACCORDÉON NE REVIENT PAS. C'est lui qu'on démonte : les huit chapitres
       répétés sous les tuiles, à déplier un par un. */
    expect(src, "un accordéon est revenu sur l'index de l'aide").not.toMatch(/FoldSection|FoldAll/);
    expect(code("src/app/info/aide/page.tsx"), "un accordéon est revenu sur l'index de l'aide").not.toMatch(/FoldSection|FoldAll/);
    // Non-vacuité : les huit chapitres sont bien ceux qu'on attend.
    expect(PUBLIC_DOCS[0]?.chapters.length, "l'aide n'a plus ses huit chapitres").toBe(8);
  });

  /* CHAQUE CHAPITRE DIT CE QU'ON Y TROUVE, puisqu'il ne compte plus. */
  it("donne à chaque chapitre sa ligne de promesse", () => {
    const sans = (PUBLIC_DOCS[0]?.chapters ?? []).filter((c) => !c.promesse?.fr?.trim()).map((c) => c.id);
    expect(sans, `ces chapitres n'annoncent rien sous leur titre : ${sans.join(", ")}`).toEqual([]);
  });

  /**
   * L'INDEX SUIT LES PAGES, SANS QUOI LA RECHERCHE SE TAIT.
   *
   * Cent sept entrées sur cent cinquante-cinq changeaient d'adresse avec ce
   * démontage : les soixante-six termes, le simulateur, les quarante et une
   * réponses. Une entrée qui vise encore une ancre de « /info » renvoie vers
   * une page qui ne fait que rediriger, l'ancre est perdue en route, et rien
   * ne le dit.
   */
  it("ne laisse aucune entrée de recherche viser une ancre du guide démonté", async () => {
    const idx = (await buildGuideIndex(translator("fr"), "fr")).entries;
    const perdues = idx.filter((e) => /^\/info#/.test(e.href)).map((e) => `${e.title} → ${e.href}`);
    expect(perdues, `ces entrées visent une ancre de « /info », qui ne rend plus rien : ${perdues.slice(0, 4).join(" · ")}`).toEqual([]);
    // Et les deux destinations qui ont absorbé l'essentiel sont bien visées.
    expect(idx.filter((e) => e.href.startsWith("/info/glossaire#")).length, "le glossaire n'est plus indexé terme par terme").toBeGreaterThanOrEqual(60);
    expect(idx.filter((e) => /^\/info\/aide\/[a-z]+#q-/.test(e.href)).length, "les réponses ne visent plus la page de leur chapitre").toBeGreaterThanOrEqual(40);
  });

  /* LE CHAMP DE LA COLONNE CHERCHE DANS L'AIDE, et c'est le seul champ. */
  it("fait chercher l'aide au champ qui existait déjà, sans en ajouter un second", () => {
    const src = code("src/components/Colonne.tsx");
    expect(src, "le champ de la colonne ne connaît pas l'index du guide").toMatch(/loadGuideIndex\(\)/);
    expect(src, "le champ ne cherche pas dans les entrées du guide").toMatch(/parLeGuide/);
    /* UN SEUL CHAMP DANS LA COLONNE. Deux promesses à dix pixels l'une de
       l'autre apprennent au lecteur à ne se fier à aucune des deux. */
    expect((src.match(/type="search"/g) ?? []).length, "la colonne porte un second champ de recherche").toBe(1);
  });

  /**
   * ON REGROUPE, ON NE PERD PAS — RELEVÉ LE 29 OCTOBRE 2026.
   *
   * Le démontage avait laissé tomber SIX TEXTES : les cinq arrêts de la visite
   * guidée du Guide, dont la page portait le montage, et le quatrième arrêt de
   * celle de l'aide, qui visait le chapitre « entretien » déplié. Les cibles
   * « data-coach » étaient restées dans le balisage, orphelines : rien ne les
   * nommait plus, et rien ne le disait.
   *
   * Un arrêt dont la cible manque est SAUTÉ par « CoachMarks » quand un autre
   * peut être montré : une visite peut donc maigrir de moitié sans qu'une
   * seule page proteste.
   */
  it("ne laisse tomber aucun arrêt des visites guidées, ni aucune cible", () => {
    const tsx = fs
      .readdirSync(path.join(ROOT, "src"), { recursive: true, encoding: "utf8" })
      .filter((p) => /\.tsx?$/.test(p))
      .map((p) => `src/${p}`);
    const tout = tsx.map(lire).join("\n");
    const vises = new Set([...tout.matchAll(/target: "([a-z0-9-]+)"/g)].map((m) => m[1]));
    /* La cible se pose en clair — « data-coach="aide-nav" » — ou au bout d'un
       ternaire : les deux formes comptent, sans quoi la cible d'une tuile
       conditionnelle passerait pour absente. */
    const poses = new Set(
      [...tout.matchAll(/data-coach=(?:"([a-z0-9-]+)"|\{([^}]*)\})/g)].flatMap((m) => (m[1] ? [m[1]] : [...m[2].matchAll(/"([a-z0-9-]+)"/g)].map((q) => q[1]))),
    );
    /* LA FAMILLE DU GUIDE ET DE L'AIDE, celle que ce démontage a déplacée. */
    const famille = (s: Set<string>) => [...s].filter((n) => /^(info|aide|colonne)-/.test(n)).sort();
    const orphelines = famille(poses).filter((n) => !vises.has(n));
    expect(orphelines, `ces cibles ne sont plus nommées par aucun arrêt : ${orphelines.join(", ")}`).toEqual([]);
    const sansCible = famille(vises).filter((n) => !poses.has(n));
    expect(sansCible, `ces arrêts visent une cible qui n'existe nulle part : ${sansCible.join(", ")}`).toEqual([]);
    // Non-vacuité : les cibles déplacées par le démontage sont bien du nombre.
    for (const n of ["info-insights", "info-sim", "info-glossaire", "info-aide", "colonne-recherche", "aide-entretien", "aide-chapitre"]) {
      expect(famille(poses), `la cible « ${n} » a disparu du balisage`).toContain(n);
    }
    /* ET LES TEXTES EUX-MÊMES, qu'une cible présente ne garantit pas. */
    for (const phrase of [
      "C'est le support en libre-service de Guichet.", // l'arrêt sur la recherche
      "La page Aide répond à ce qu'on nous demande le plus", // l'arrêt sur l'aide
      "chaque éclairage se lit en deux minutes", // l'arrêt sur les éclairages
      "un tri A → Z ou par catégorie", // l'arrêt sur le glossaire
      "vous voyez le rendement bouger", // l'arrêt sur le simulateur
      "d'où viennent les cours, ce qui se passe en cas de panne", // l'arrêt sur l'entretien
      "Aide : vos questions, nos réponses", // le renvoi posé près des éclairages
    ]) {
      expect(tout, `ce texte du Guide démonté n'est plus nulle part : « ${phrase} »`).toContain(phrase);
    }
  });

  /**
   * LES ANCIENNES ADRESSES MÈNENT ENCORE OÙ ELLES DISAIENT.
   *
   * « /info#terme-coupon » et « /info/aide#q-<question> » sont parties dans
   * des messages et des favoris ; la première était l'adresse des soixante-six
   * termes, la seconde celle des quarante et une réponses. Le fragment
   * n'atteint jamais le serveur : une redirection ne peut pas les rattraper,
   * et un lien qui n'ouvre rien ne dit pas qu'il a échoué.
   */
  it("rattrape les ancres de l'ancienne page unique", () => {
    const index = code("src/app/info/aide/AideBrowser.tsx");
    expect(index, "« /info/aide#q-… » n'ouvre plus la réponse qu'il nomme").toMatch(/#q-\(\.\+\)\$[\s\S]{0,400}router\.replace\(lienReponse/);
    const herite = code("src/app/info/eclairages/AncreHeritee.tsx");
    for (const [ancre, page] of [
      ["terme-", "/info/glossaire"],
      ["glossaire", "/info/glossaire"],
      ["simulateur", "/info/simulateur"],
      ["parcours", "/info/parcours"],
    ]) {
      expect(herite, `l'ancre « /info#${ancre} » ne mène plus à ${page}`).toContain(ancre);
      expect(herite, `l'ancre « /info#${ancre} » ne mène plus à ${page}`).toContain(page);
    }
    expect(code("src/app/info/eclairages/page.tsx"), "la page des éclairages ne rattrape plus les ancres de « /info »").toMatch(/<AncreHeritee \/>/);
  });
});
