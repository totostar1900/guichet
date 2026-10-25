import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { EN_ALL } from "@/i18n/core";
import { CATALOGUE, ETAPES, RAISON } from "@/lib/domain/services";

/**
 * UN BRIEF PAR PAGE, ET IL LIT LA TABLE DES SERVICES.
 *
 * CE QUE LE DIRIGEANT A DEMANDÉ le 25 octobre 2026 : « un “en bref” en haut de
 * chaque page, qui explique les étapes, comme celui des adjudications », et
 * « regrouper le contenu textuel avec le brief, sur les adjudications comme
 * sur les autres services ».
 *
 * CE QUI REND CETTE DEMANDE DANGEREUSE À TENIR. Il y a douze services pour
 * huit pages de destination. Écrites à la main, ce sont huit proses qui disent
 * ce que la fiche du service dit déjà dans Trade — et la maison connaît la
 * facture : un sommaire qui citait cinq pages quand le rail en citait sept,
 * deux définitions d'« une séance », trois tris de la même liste. Une copie ne
 * se trompe pas le jour où on l'écrit ; elle se trompe le jour où l'original
 * change, et ce jour-là rien ne tombe.
 *
 * CE QUE CETTE FEUILLE TIENT, DONC, EN TROIS TEMPS :
 *
 *   1. CHAQUE SERVICE EST BRIEFÉ, ET UNE SEULE FOIS. Un service ajouté au
 *      catalogue sans brief sort sans explication ; un service briefé deux
 *      fois rouvre la divergence.
 *   2. AUCUNE PAGE NE RECOPIE LA PROSE. Les raisons et les étapes vivent dans
 *      « domain/services », et nulle part ailleurs sous « app » ou
 *      « components ».
 *   3. CE QUI VISE LE BOUTON LE TROUVE. La visite guidée des fonds a une étape
 *      qui pointe sur l'ancre du brief : un nom déduit d'un ordre de tableau
 *      la laisserait se poser dans le vide, sans que rien ne tombe.
 */
const ROOT = resolve(__dirname, "../..");
const sansNotes = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Les fichiers d'écran : les pages et les composants, sans le dictionnaire ni les épreuves. */
const ecrans = (): { chemin: string; texte: string }[] => {
  const out: { chemin: string; texte: string }[] = [];
  for (const base of ["src/app", "src/components"]) {
    for (const f of readdirSync(join(ROOT, base), { recursive: true, encoding: "utf8" })) {
      if (!f.endsWith(".tsx") && !f.endsWith(".ts")) continue;
      const chemin = `${base}/${f}`.replace(/\\/g, "/");
      out.push({ chemin, texte: readFileSync(join(ROOT, chemin), "utf8") });
    }
  }
  return out;
};

/** Les appels au brief, tels que les pages les écrivent. */
const briefs = (): { chemin: string; cles: string[]; titre: string }[] => {
  const out: { chemin: string; cles: string[]; titre: string }[] = [];
  for (const { chemin, texte } of ecrans()) {
    for (const m of sansNotes(texte).matchAll(/<EnBref\b([^>]*)>/g)) {
      const props = m[1];
      const cles = [...(props.match(/cles=\{\[([^\]]*)\]\}/)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((x) => x[1]);
      const titre = props.match(/titre="([^"]+)"/)?.[1] ?? "";
      out.push({ chemin, cles, titre });
    }
  }
  return out;
};

describe("le brief de chaque page", () => {
  it("couvre chaque service du catalogue, et ne le couvre qu'une fois", () => {
    const poses = briefs().flatMap((b) => b.cles);
    const sansBrief = CATALOGUE.filter((c) => !poses.includes(c.cle)).map((c) => c.cle);
    expect(sansBrief, "ces services sortiront sans brief : leur page n'explique ni à quoi ils servent ni ce qu'il faut faire").toEqual([]);
    const deuxFois = poses.filter((k, i) => poses.indexOf(k) !== i);
    expect(deuxFois, "ces services sont briefés sur deux pages : les deux briefs divergeront").toEqual([]);
    const inconnus = poses.filter((k) => !CATALOGUE.some((c) => c.cle === k));
    expect(inconnus, "ces clefs ne sont au catalogue d'aucun service : leur brief sortira vide").toEqual([]);
  });

  it("et le relevé voit bien des briefs : sinon il ne garde rien", () => {
    /* Non vacuité. Un motif qui ne trouve plus rien rend « aucun service sans
       brief », « aucun doublon » et « aucune clef inconnue » — trois verts
       pour un relevé aveugle. C'est exactement ce qui est arrivé au cliquet
       des contrastes, qui mesurait quatre écrans sur seize en silence. */
    const b = briefs();
    expect(b.length, "plus aucun appel au brief n'est trouvé : le relevé est aveugle").toBeGreaterThanOrEqual(8);
    expect(CATALOGUE.length, "le catalogue est vide : il n'y a plus rien à couvrir").toBeGreaterThan(5);
    /* Et chaque appel doit avoir été LU, pas seulement compté : une clef ou un
       titre vide veut dire que le motif a trouvé la balise sans ses attributs. */
    for (const x of b) {
      expect(x.cles.length, `${x.chemin} : le brief est posé sans clef de service`).toBeGreaterThan(0);
      expect(x.titre, `${x.chemin} : le brief est posé sans titre de feuille`).not.toBe("");
    }
  });

  it("donne un titre de feuille traduit à chacun", () => {
    /* « titre » passe par « t(titre) » — une variable — donc le relevé du
       français en clair ne le voit pas, et un titre neuf resterait français
       pour le lecteur anglais sans que rien ne tombe : une clef absente REND
       le français au lieu d'échouer. */
    const sansAnglais = briefs()
      .map((b) => b.titre)
      .filter((x) => !(x in EN_ALL));
    expect(sansAnglais, "ces titres de feuille sortiront en français pour un lecteur anglais").toEqual([]);
  });

  it("laisse la prose des services dans le catalogue, et nulle part ailleurs", () => {
    const prose = [...Object.values(RAISON), ...Object.values(ETAPES).flat()];
    expect(prose.length, "la table des raisons et des étapes s'est vidée").toBeGreaterThan(30);
    const copies: string[] = [];
    for (const { chemin, texte } of ecrans()) {
      for (const p of prose) if (texte.includes(p)) copies.push(`${chemin} › « ${p.slice(0, 48)}… »`);
    }
    expect(copies, "une page recopie la prose d'un service : elle divergera du catalogue au premier changement").toEqual([]);
  });

  it("rend l'ancre que la visite guidée des fonds vise", () => {
    /* L'étape « Quatre catégories » de la visite pointe sur « fonds-enbref ».
       L'ancre par défaut se déduit de la première clef — « enbref-fonds » —
       et le jour où l'on écrirait `cles={["passage", "fonds"]}` la bulle se
       poserait dans le vide. La page nomme donc son ancre. */
    const visite = readFileSync(join(ROOT, "src/app/fonds/FundsBrowser.tsx"), "utf8");
    const cible = visite.match(/target: "([^"]*enbref[^"]*)"/)?.[1];
    expect(cible, "la visite guidée des fonds ne vise plus le brief").toBeTruthy();
    const pose = briefs().find((b) => b.chemin.endsWith("fonds/FondsEnBref.tsx"));
    expect(pose, "le brief des fonds a disparu de sa page").toBeTruthy();
    const src = readFileSync(join(ROOT, "src/app/fonds/FondsEnBref.tsx"), "utf8");
    expect(src, `la visite vise « ${cible} » et la page ne le pose plus`).toContain(`coach="${cible}"`);
    /* Et le composant doit bien honorer ce nom plutôt que le déduire. */
    expect(readFileSync(join(ROOT, "src/components/EnBref.tsx"), "utf8"), "le brief ne lit plus l'ancre que sa page lui donne").toMatch(/data-coach=\{coach \?\? `enbref-\$\{cles\[0\]\}`\}/);
  });
});
