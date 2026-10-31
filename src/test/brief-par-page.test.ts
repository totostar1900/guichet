import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { EN_ALL } from "@/i18n/core";
import { BRIEFS, briefDuService } from "@/lib/domain/briefs";
import { CATALOGUE, ETAPES, RAISON } from "@/lib/domain/services";

/**
 * UN BRIEF PAR SERVICE, ET IL LIT LA TABLE DES SERVICES.
 *
 * CE QUE LE DIRIGEANT A DEMANDÉ, en deux temps. Le 25 octobre 2026 : « un “en
 * bref” en haut de chaque page, qui explique les étapes, comme celui des
 * adjudications », et « regrouper le contenu textuel avec le brief ». Le
 * 31 octobre : que le « i » d'une tuile de Trade et le « En bref » d'une page
 * de service ouvrent LA MÊME PAGE — « c'est pas deux pages distinctes mais
 * bien la même page, qui pourra être reportée ailleurs au besoin ».
 *
 * CE QUI REND CETTE DEMANDE DANGEREUSE À TENIR. Il y a onze services pour huit
 * pages de destination. Écrites à la main, ce sont huit proses qui disent ce
 * que la fiche du service disait déjà dans Trade — et la maison connaît la
 * facture : un sommaire qui citait cinq pages quand le rail en citait sept,
 * deux définitions d'« une séance », trois tris de la même liste. Une copie ne
 * se trompe pas le jour où on l'écrit ; elle se trompe le jour où l'original
 * change, et ce jour-là rien ne tombe.
 *
 * CE QUE CETTE FEUILLE TIENT, DONC, EN QUATRE TEMPS :
 *
 *   1. CHAQUE SERVICE EST BRIEFÉ, ET UNE SEULE FOIS. Un service ajouté au
 *      catalogue sans brief sort sans explication ; un service briefé deux
 *      fois rouvre la divergence.
 *   2. CHAQUE BRIEF EST POSÉ QUELQUE PART. Une entrée du registre que personne
 *      n'ouvre est une feuille écrite pour rien, et le jour où l'on retire
 *      son appel, rien ne le dit.
 *   3. AUCUNE PAGE NE RECOPIE LA PROSE. Les raisons et les étapes vivent dans
 *      « domain/services », et nulle part ailleurs sous « app » ou
 *      « components ».
 *   4. CE QUI VISE LE BOUTON LE TROUVE. La visite guidée des fonds a une étape
 *      qui pointe sur l'ancre du brief : un nom déduit d'un identifiant la
 *      laisserait se poser dans le vide, sans que rien ne tombe.
 *
 * ─── Pourquoi ce relevé ne lit plus le source des pages ─────────────────────
 *
 * Il cherchait les appels `<EnBref cles={[…]} titre="…">` À L'EXPRESSION
 * RÉGULIÈRE. Un relevé qui lit du texte tombe au premier reformatage, et
 * surtout il rend « aucun service sans brief », « aucun doublon » et « aucune
 * clef inconnue » quand il ne trouve plus rien : trois verts pour un relevé
 * aveugle. C'est exactement ce qui est arrivé au cliquet des contrastes, qui
 * mesurait quatre écrans sur seize en silence.
 *
 * Depuis le 31 octobre 2026, les briefs sont une DONNÉE — « domain/briefs » —
 * et c'est elle qu'on lit. Ne reste au texte que ce qui ne peut pas en être :
 * savoir quelles pages posent quel brief.
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

/** Les briefs qu'un écran ouvre, par leur identifiant : `<EnBref brief="…" />`. */
const poses = (): { chemin: string; id: string }[] => {
  const out: { chemin: string; id: string }[] = [];
  for (const { chemin, texte } of ecrans()) {
    for (const m of sansNotes(texte).matchAll(/<EnBref\b[^>]*\bbrief="([^"]+)"/g)) out.push({ chemin, id: m[1] });
  }
  return out;
};

describe("le brief de chaque service", () => {
  it("couvre chaque service du catalogue, et ne le couvre qu'une fois", () => {
    const cles = BRIEFS.flatMap((b) => b.cles);
    const sansBrief = CATALOGUE.filter((c) => !cles.includes(c.cle)).map((c) => c.cle);
    expect(sansBrief, "ces services sortiront sans brief : leur page n'explique ni à quoi ils servent ni ce qu'il faut faire").toEqual([]);
    const deuxFois = cles.filter((k, i) => cles.indexOf(k) !== i);
    expect(deuxFois, "ces services sont briefés deux fois : les deux briefs divergeront").toEqual([]);
    const inconnus = cles.filter((k) => !CATALOGUE.some((c) => c.cle === k));
    expect(inconnus, "ces clefs ne sont au catalogue d'aucun service : leur section du brief sortira vide").toEqual([]);
    /* ET LE « i » D'UNE TUILE TROUVE LE SIEN. C'est la demande même du
       31 octobre — la même page des deux côtés — et elle ne tient que si la
       résolution par clef de service répond pour les onze. */
    const sansRond = CATALOGUE.filter((c) => !briefDuService(c.cle)).map((c) => c.cle);
    expect(sansRond, "ces tuiles de Trade sortiront sans « i » : leur service ne résout aucun brief").toEqual([]);
  });

  it("n'écrit aucun brief que personne n'ouvre", () => {
    /* L'AUTRE SENS DE LA MÊME RÈGLE. Le premier relevé dit qu'aucun service
       ne manque de brief ; celui-ci dit qu'aucun brief ne manque de page.
       Sans lui, on peut retirer un `<EnBref>` d'un en-tête sans que rien ne
       tombe : la feuille reste écrite, le registre reste juste, et le client
       n'a plus de bouton. */
    const ids = new Set(poses().map((p) => p.id));
    const jamais = BRIEFS.filter((b) => !ids.has(b.id)).map((b) => b.id);
    expect(jamais, "ces briefs ne sont posés sur aucune page : personne ne peut les ouvrir").toEqual([]);
    const fantomes = [...ids].filter((id) => !BRIEFS.some((b) => b.id === id));
    expect(fantomes, "ces pages ouvrent un brief qui n'est pas au registre : le bouton ne rendra rien").toEqual([]);
  });

  it("et le relevé voit bien des briefs : sinon il ne garde rien", () => {
    /* Non vacuité, des deux côtés : la donnée ET le texte. Un registre vide
       rendrait « aucun service sans brief » si le catalogue l'était aussi, et
       un motif qui ne trouve plus aucun appel rendrait « aucun brief orphelin ». */
    expect(BRIEFS.length, "le registre des briefs s'est vidé").toBeGreaterThanOrEqual(8);
    expect(CATALOGUE.length, "le catalogue est vide : il n'y a plus rien à couvrir").toBeGreaterThan(5);
    expect(poses().length, "plus aucun appel au brief n'est trouvé : le relevé est aveugle").toBeGreaterThanOrEqual(8);
    /* Et chaque entrée doit être LUE, pas seulement comptée. */
    for (const b of BRIEFS) {
      expect(b.id, "un brief est au registre sans identifiant").not.toBe("");
      expect(b.titre, `${b.id} : le brief est au registre sans titre de feuille`).not.toBe("");
    }
  });

  it("donne un titre de feuille traduit à chacun", () => {
    /* « titre » passe par « t(b.titre) » — une variable — donc le relevé du
       français en clair ne le voit pas, et un titre neuf resterait français
       pour le lecteur anglais sans que rien ne tombe : une clef absente REND
       le français au lieu d'échouer. */
    const sansAnglais = BRIEFS.map((b) => b.titre).filter((x) => !(x in EN_ALL));
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
       L'ancre par défaut se déduit de l'identifiant — « enbref-fonds » — et un
       registre qui renommerait l'entrée poserait la bulle dans le vide. Le
       registre nomme donc l'ancre. */
    const visite = readFileSync(join(ROOT, "src/app/fonds/FundsBrowser.tsx"), "utf8");
    const cible = visite.match(/target: "([^"]*enbref[^"]*)"/)?.[1];
    expect(cible, "la visite guidée des fonds ne vise plus le brief").toBeTruthy();
    const fonds = BRIEFS.find((b) => b.id === "fonds");
    expect(fonds, "le brief des fonds a disparu du registre").toBeTruthy();
    expect(fonds!.coach, `la visite vise « ${cible} » et le registre ne le nomme plus`).toBe(cible);
    /* Et le composant doit bien honorer ce nom plutôt que le déduire. */
    expect(readFileSync(join(ROOT, "src/components/EnBref.tsx"), "utf8"), "le brief ne lit plus l'ancre que le registre lui donne").toMatch(/coach=\{b\.coach \?\? `enbref-\$\{b\.id\}`\}/);
  });
});
