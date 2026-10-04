import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EN_ALL } from "@/i18n/core";
import { FUND_CATEGORY_LABEL, FUND_FREQUENCY_LABEL } from "@/lib/domain/market";

/**
 * LES COMMANDES DE LA PAGE DES FONDS SONT SOUS LES YEUX.
 *
 * Le défaut corrigé est une commande enfermée. La page écrivait sa rangée
 * d'outils UNE FOIS POUR DEUX ENDROITS : dans la page, où elle disparaissait
 * sous 760 px, et dans une feuille, seule voie restante sur téléphone. Tout y
 * était donc derrière un geste : le champ de recherche, qui est le geste le
 * plus direct de cette page ; la catégorie, dans une grille encadrée ; la
 * périodicité, dans une liste déroulante ; le tri, dans une autre feuille.
 *
 * Ce qui est tenu ici, et qu'une relecture du fichier ne montre pas :
 *
 *  1. plus de feuille, plus de bouton flottant, plus de rangée écrite deux
 *     fois : c'est le motif qui enfermait les commandes ;
 *  2. chaque filtre que l'adresse peut porter a sa commande NOMMÉE dans la
 *     page, et un cinquième filtre ajouté demain sans la sienne fait tomber
 *     ce test ;
 *  3. les valeurs offertes viennent des lignes reçues, donc un filtre ne mène
 *     jamais à une liste vide ;
 *  4. le tri est dans la page avec sa flèche, et la flèche se retire sur
 *     « par catégorie », qui est un rangement sans sens à inverser ;
 *  5. le resserrement des cartes ne paraît que sur la vue qui en a une ;
 *  6. toutes les étiquettes existent en anglais, alors qu'elles passent par
 *     « t(variable) », le premier angle mort du balayeur de clefs.
 */
const SRC = readFileSync("src/app/fonds/FundsBrowser.tsx", "utf8");
const CARTE = readFileSync("src/app/fonds/FundCard.tsx", "utf8");

/** La fermeture d'un bloc d'instructions, par opposition à celle du JSX. */
const BLOC = "\n  };\n";
/**
 * Le corps d'une déclaration faite à deux espaces d'indentation, lu jusqu'à sa
 * fermeture. « ferme » dit laquelle : une fonction qui rend du JSX se termine
 * par « ); », un bloc d'instructions par « }; ». Le premier jet lisait tout le
 * monde avec « ); », et le corps de « clearAll » débordait alors jusqu'à la
 * fonction suivante, où il attrapait le « sens: undefined » du tri et le
 * prenait pour un filtre sans commande. Le test a nommé la clef : c'est ainsi
 * qu'on a vu que la mesure, et non le code mesuré, était fausse.
 */
const corpsDe = (nom: string, ferme = "\n  );\n"): string => {
  const debut = SRC.indexOf(nom);
  expect(debut, `« ${nom} » : introuvable, le test ne mesure plus rien`).toBeGreaterThan(-1);
  const fin = SRC.indexOf(ferme, debut);
  expect(fin, `« ${nom} » : pas de fermeture « ${ferme.trim()} » à deux espaces`).toBeGreaterThan(debut);
  return SRC.slice(debut, fin);
};

/** Le rendu de la page, où toute commande doit se trouver. */
const PAGE = SRC.slice(SRC.indexOf("  return ("));
/** Les appels à la fabrique des rangées à plat, avec leurs arguments. */
const RANGEES = [...SRC.matchAll(/rangee\(\s*"([^"]+)",\s*(\w+),\s*"([^"]+)",([\s\S]*?)\n          \)|rangee\("([^"]+)", (\w+), "([^"]+)", ([^\n]*?)\)\}/g)].map((m) => ({
  etiquette: m[1] ?? m[5],
  valeur: m[2] ?? m[6],
  toutes: m[3] ?? m[7],
  options: m[4] ?? m[8],
}));

describe("les commandes de la page des fonds", () => {
  it("ne cache plus rien derrière une feuille", () => {
    for (const enferme of ["Sheet", "FilterFab", "FilterLine"]) {
      expect(SRC, `« ${enferme} » est revenu : la page remet des commandes derrière un geste`).not.toMatch(new RegExp(`import \\{[^}]*\\b${enferme}\\b`));
    }
    /* La rangée écrite une fois pour la page et une fois pour la feuille était
       le vrai motif : c'est elle qui obligeait à masquer l'une des deux. */
    expect(SRC, "une rangée d'outils est revenue, avec les deux copies qu'elle entraîne").not.toMatch(/styles\.(toolbar|deskTools|sheetTools)\b/);
    const champs = [...SRC.matchAll(/type="search"/g)].length;
    expect(champs, "le champ doit être écrit une seule fois : deux champs, deux états de frappe").toBe(1);
    expect(PAGE, "le champ n'est pas dans la page").toMatch(/\{recherche\}/);
  });

  it("donne à chaque filtre de l'adresse une commande nommée dans la page", () => {
    /* La table dit, pour chaque clef d'URL, ce qui la commande à l'écran et
       comment on le reconnaît dans le source. « clearAll » écrit la liste des
       clefs : les deux doivent coïncider. Ajouter un filtre à « clearAll »
       sans l'inscrire ici fait tomber le test, et c'est le but. */
    const COMMANDES: Record<string, { quoi: string; preuve: RegExp }> = {
      q: { quoi: "le champ de recherche", preuve: /type="search"/ },
      cat: { quoi: "la rangée des catégories", preuve: /rangee\(\s*"Catégorie"/ },
      vl: { quoi: "la rangée des périodicités", preuve: /rangee\("VL"/ },
      gestion: { quoi: "la pastille de la société de gestion", preuve: /clef: "gestion"/ },
    };
    const effacees = [...corpsDe("const clearAll = () => {", BLOC).matchAll(/(\w+): undefined/g)].map((m) => m[1]);
    expect(effacees.length, "clearAll n'efface plus rien : le test ne mesure plus rien").toBeGreaterThan(3);
    expect([...effacees].sort(), "un filtre de l'adresse n'a pas de commande nommée dans ce test").toEqual(Object.keys(COMMANDES).sort());
    for (const [clef, { quoi, preuve }] of Object.entries(COMMANDES)) {
      expect(SRC.match(preuve), `« ${clef} » : ${quoi} a disparu de la page`).toBeTruthy();
    }
    /* CHAQUE RANGÉE PORTE SA SORTIE : « Toutes » remet le filtre à zéro là où
       on l'a pris. Sans elle, on ne peut plus que tout effacer. */
    expect(RANGEES.length, "les deux rangées à plat : introuvables").toBe(2);
    for (const r of RANGEES) expect(r.toutes, `la rangée « ${r.etiquette} » n'a plus de sortie`).toBeTruthy();
    expect(corpsDe("const rangee = ("), "la sortie de la rangée ne remet rien à zéro").toMatch(/onClick=\{\(\) => choisir\(""\)\}/);
    // La pastille de la gestion rend la main : une pastille sans « retirer » est un cul-de-sac.
    for (const [pousse] of SRC.matchAll(/actifs\.push\([\s\S]*?\);/g)) expect(pousse, `pastille sans sortie : ${pousse}`).toMatch(/retirer: \(\) =>/);
  });

  it("n'offre que des valeurs présentes dans les lignes reçues", () => {
    /* Une pastille qui mène à « Aucun fonds ne correspond » est une fausse
       promesse. Les catégories sont filtrées sur les lignes, les périodicités
       viennent de « freqs », qui est lui-même construit sur les lignes. */
    const cats = RANGEES.find((r) => r.etiquette === "Catégorie");
    expect(cats?.options, "les catégories ne sont plus filtrées sur les lignes reçues").toMatch(/rows\.some\(/);
    const vl = RANGEES.find((r) => r.etiquette === "VL");
    expect(vl?.options, "les périodicités ne viennent plus des lignes reçues").toMatch(/freqs\./);
    expect(SRC, "« freqs » ne se construit plus sur les lignes").toMatch(/const freqs = useMemo\(\(\) => \[\.\.\.new Set\(rows\.map/);
  });

  it("trie dans la page, et retire la flèche là où elle ne veut rien dire", () => {
    const compte = PAGE.slice(PAGE.indexOf("styles.count"));
    expect(compte, "le tri a quitté la ligne du compte").toMatch(/styles\.sortSel/);
    expect(compte, "la liste des ordres ne vient plus de SORT").toMatch(/options=\{SORT\.map/);
    /* « par catégorie » est un rangement, pas une mesure : il n'a pas de sens
       à inverser, et la flèche ne doit pas s'y proposer. */
    expect(compte).toMatch(/\{sort !== "categorie" && \([\s\S]*?styles\.dirBtn/);
  });

  it("ne montre le resserrement que sur la vue qui en a une", () => {
    expect(PAGE, "le resserrement des cartes paraît sur une vue qui n'en a pas").toMatch(/\{vue === "cards" && !desk && <DensitySwitch \/>\}/);
  });

  it("traduit toutes les étiquettes, qui passent par t(variable)", () => {
    const clefs = [
      ...RANGEES.flatMap((r) => [r.etiquette, r.toutes]),
      ...[...SRC.matchAll(/actifs\.push\(\{[^»]*?quoi: "([^"]+)"/g)].map((m) => m[1]),
      /* Le tiret de la valeur manquante ne se traduit pas : c'est la règle de
         la maison, et « ? » est la catégorie d'un fonds dont le bulletin n'a
         rien dit. Aucune pastille ne le propose, mais la carte l'affiche. */
      ...Object.values(FUND_CATEGORY_LABEL).filter((l) => l && l !== "—"),
      ...Object.values(FUND_FREQUENCY_LABEL).filter((l) => l && l !== "—"),
    ];
    expect(clefs.length, "plus aucune étiquette : le test ne mesure plus rien").toBeGreaterThan(8);
    for (const k of clefs) expect(EN_ALL[k], `« ${k} » : étiquette sans anglais, et le balayeur ne la voit pas puisqu'elle passe par t(variable)`).toBeTruthy();
    /* La périodicité ne prend pas d'étiquette dans sa pastille : son libellé
       commence déjà par « VL », et « VL · VL quotidienne » dirait le mot deux
       fois. Le dire ici évite qu'on la « complète » demain. */
    expect(SRC).not.toMatch(/clef: "vl", quoi:/);
  });
});

describe("le sous-titre de la carte d'un fonds", () => {
  it("donne sa ligne au gestionnaire, et la suivante à la catégorie et au rythme", () => {
    /* Les trois faits tenaient sur une ligne, séparés par des points médians :
       « Actions · Harvest Asset Management · VL hebdomadaire », cinquante-six
       caractères qui passaient à la ligne n'importe où selon la longueur du nom
       de la société. Qui gère est l'engagement, les deux autres décrivent le
       produit : deux natures, deux lignes. */
    const sous = CARTE.slice(CARTE.indexOf("propres.sous"), CARTE.indexOf("propres.sous") + 600);
    const gestion = sous.indexOf("propres.gestion");
    const traits = sous.indexOf("propres.traits");
    expect(gestion, "la société de gestion n'a plus sa propre ligne").toBeGreaterThan(-1);
    expect(traits, "la catégorie et le rythme n'ont plus leur ligne").toBeGreaterThan(-1);
    expect(gestion, "le gestionnaire doit venir en premier").toBeLessThan(traits);
    expect(sous.slice(gestion, traits), "la ligne du gestionnaire ne porte que son nom").toMatch(/\{r\.manager\}/);
    expect(sous.slice(traits), "la seconde ligne doit porter la catégorie et le rythme").toMatch(/FUND_CATEGORY_LABEL\[r\.category\][\s\S]*FUND_FREQUENCY_LABEL\[r\.frequency\]/);
    /* L'ancienne classe ne doit plus exister nulle part : tant qu'elle reste,
       la version d'une seule ligne peut revenir sans qu'on le remarque. */
    expect(CARTE, "« fundSub » est revenu : les trois faits sont de nouveau sur une ligne").not.toMatch(/fundSub/);
  });
});
