import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { translator } from "@/i18n/core";
import { SEED_OFFERS } from "@/data/seed";

const ROOT = path.join(__dirname, "../..");
const MOIS = /janv\.|févr\.|avr\.|juil\.|sept\.|oct\.|nov\.|déc\.|éch\.|\baoût\b/;

const tsx = (): { chemin: string; texte: string }[] => {
  const out: { chemin: string; texte: string }[] = [];
  const descendre = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) descendre(p);
      else if (e.name.endsWith(".tsx")) out.push({ chemin: path.relative(ROOT, p), texte: fs.readFileSync(p, "utf8") });
    }
  };
  for (const r of ["src/app", "src/components"]) descendre(path.join(ROOT, r));
  return out;
};

/**
 * LE TITRE D'UNE LIGNE PORTE UNE DATE, ET ELLE SE LIT DANS LA LANGUE DU LECTEUR.
 *
 * « OTA 6,50 % · 14 févr. 2028 » est écrit en français dans la donnée, et c'est
 * juste : le dictionnaire est fait pour le reprendre — « Rachat OTA {n} ans »,
 * « éch. {d} », et le rattrapage des mois en dernier recours. Encore faut-il
 * que la chaîne passe par t().
 *
 * DEUX DÉFAUTS, RELEVÉS LE 30 OCTOBRE 2026 EN LISANT LES PAGES EN ANGLAIS.
 *
 * Le premier dans le traducteur : son découpage par séparateurs traite « . »
 * comme une fin de phrase, et coupait « 8 juil. 2031 » en « 8 juil » et
 * « 2031 ». Le rattrapage cherche un mois DERRIÈRE un nombre et AVEC son
 * point : il ne trouvait plus rien. On ne le voyait que sur les titres portant
 * aussi un deux-points, « · » étant essayé en premier et rendant la main
 * avant — « 8 juil. 2031 : secondary », la moitié de la ligne traduite.
 *
 * Le second dans les écrans : vingt-huit endroits rendaient le titre sans le
 * traduire, du tableau des titres au message pré-écrit de la prise de contact.
 */
describe("le titre d'une ligne se lit dans la langue du lecteur", () => {
  it("ne coupe pas un mois abrégé en découpant les phrases", () => {
    const t = translator("en");
    /* Les chaînes vivent dans ce tableau et non dans l'appel : ce sont des cas
       d'épreuve, pas des mots de l'interface, et le cliquet « français sans
       anglais » lit les littéraux passés à t() pour exiger leur traduction. */
    const CAS: [string, string][] = [
      ["8 juil. 2031 : secondaire", "8 Jul 2031 : secondary"],
      ["OTA Cameroun 6,25 % · 8 juil. 2031 : secondaire", "OTA Cameroun 6,25 % · 8 Jul 2031 : secondary"],
      /* ET UNE VRAIE FIN DE PHRASE SE COUPE TOUJOURS : la correction ne vaut
         que pour les abréviations, sans quoi elle en casserait une autre. */
      ["Clôturée. Information", "Closed. Information"],
    ];
    for (const [fr, en] of CAS) expect(t(fr), `« ${fr} » ne se traduit plus entièrement`).toBe(en);
  });

  it("traduit tous les titres du semis sans y laisser un mois français", () => {
    const t = translator("en");
    const restes = SEED_OFFERS.map((o) => o.title)
      .filter((s) => MOIS.test(t(s)))
      .map((s) => `${s}  ->  ${t(s)}`);
    expect(restes, `ces titres gardent une date française en anglais :\n  ${restes.join("\n  ")}`).toEqual([]);
    // Non-vacuité : le semis porte bien des titres datés.
    expect(SEED_OFFERS.filter((o) => MOIS.test(o.title)).length, "plus aucun titre du semis ne porte de date").toBeGreaterThanOrEqual(8);
  });

  /**
   * ET AUCUN ÉCRAN NE LE REND BRUT.
   *
   * On ne juge que la position TEXTE — « >{o.title}< » — et les noms qui
   * désignent une ligne sans ambiguïté. Un attribut peut légitimement porter
   * le titre non traduit : « detail={o.title} » part à la piste d'audit, qui
   * s'écrit en français et ne se traduit jamais.
   */
  it("ne laisse aucun écran rendre le titre d'une ligne sans le traduire", () => {
    const brut = /(?:>\s*\{(?:o|offer|offre|ligne)\.(?:title|short)\})|(?:\{(?:o|offer|offre|ligne)\.(?:title|short)\}\s*<)/;
    const fautifs = tsx()
      .filter((f) => brut.test(f.texte))
      .map((f) => f.chemin);
    expect(fautifs, `ces écrans rendent le titre d'une ligne sans t() :\n  ${fautifs.join("\n  ")}`).toEqual([]);
    // Non-vacuité : les écrans rendent bien des titres, et par t().
    const porteurs = tsx().filter((f) => /\{t\((?:o|offer|offre|ligne)\.(?:title|short)\)\}/.test(f.texte));
    expect(porteurs.length, "plus aucun écran ne rend le titre d'une ligne").toBeGreaterThanOrEqual(8);
  });
});
