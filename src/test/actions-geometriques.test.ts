import { describe, expect, it } from "vitest";
import { actionsGeometriques, lireAction, type Rangee } from "@/lib/market/boc-geometrie";
import { valeurHorsLimites, PLAFOND_NUMERIQUE, type Quote } from "@/lib/domain/market";

/**
 * LES ACTIONS LUES PAR LA GÉOMÉTRIE, ET LES DEUX IDENTITÉS QUI LES TRANCHENT.
 *
 * Question de Georges le 12 octobre 2026, devant le BOC du 22 décembre 2023 :
 * confirmer la rangée suffit-il pour que le lecteur sache que l'ouverture et
 * la clôture valent 42 500 ? Non, pas la rangée seule : elle donne les bons
 * caractères, pas les frontières des champs. La rangée PLUS l'arithmétique,
 * oui, et c'est ce que ces cas vérifient.
 *
 * Mesuré le même jour sur les 4 968 cotations d'action de la base :
 *   les seuils valent le précédent ± 10 %      4 302 sur 4 843   88,8 %
 *   la variation annoncée vaut (clôt − préc)   4 917 sur 4 968   98,97 %
 */
const rangee = (page: number, y: number, textes: string[]): Rangee => ({
  page,
  y,
  cellules: textes.map((texte, i) => ({ texte, x: i * 60, largeur: 55 })),
});

/* La rangée réelle du 22 décembre 2023, telle que la grille la rend. */
const REGIONALE = ["CM0000010041 REG", "LA REGIONALE", "42 500", "21/12/2023", "97", "0", "0", "0", "0", "NC", "42 500,00", "42 500,00", "46 750", "38 250", "0,00%", "42 500,00", "43 500", "42 500", "-1,16"];
const SEMC = ["CM0000010009 SEMC", "SEMC", "45 950", "21/12/2023", "0", "104", "0", "0", "0", "NC", "45 950", "45 950", "50 545", "41 355", "0,00%", "45 950", "47 000", "45 950", "-2,23"];

describe("les deux identités d'une rangée d'action", () => {
  it("la bande de dix pour cent épingle les seuils", () => {
    const lu = lireAction(["REG", "42 500"], ["42 500,00", "42 500,00", "46 750", "38 250", "0,00%", "42 500,00"]);
    expect(lu?.ouverture).toBe(42500);
    expect(lu?.cloture).toBe(42500);
    expect(lu?.haut).toBe(46750); // 42 500 × 1,10
    expect(lu?.bas).toBe(38250); // 42 500 × 0,90
  });

  it("une bande qui ne tombe pas juste fait refuser la rangée", () => {
    /* ON NE DEVINE PAS : une découpe fausse dément l'identité, et la rangée
       est alors refusée AVEC SON TEXTE plutôt que lue de travers. */
    expect(lireAction(["42 500"], ["42 500", "42 500", "50 000", "35 000", "0,00%", "42 500"])).toBeUndefined();
  });

  it("et la variation annoncée épingle la clôture", () => {
    /* La bande seule laisserait l'ouverture et la clôture indéterminées :
       c'est la seconde identité qui les fixe. */
    const faux = lireAction(["42 500"], ["42 500", "40 000", "46 750", "38 250", "0,00%", "42 500"]);
    expect(faux, "clôture 40 000 avec une variation annoncée nulle : impossible").toBeUndefined();
    const vrai = lireAction(["42 500"], ["42 500", "40 000", "46 750", "38 250", "-5,88%", "40 000"]);
    expect(vrai?.cloture).toBe(40000);
  });
});

describe("une rangée d'action lue sur la grille", () => {
  const section = [rangee(2, 367, ["MARCHE DES ACTIONS"]), rangee(2, 295, ["SOCIETE DES EAUX MINERALES"]), rangee(2, 290, SEMC), rangee(2, 250, ["LA REGIONALE SA"]), rangee(2, 245, REGIONALE), rangee(3, 400, ["MARCHE DES OBLIGATIONS"])];

  it("rend les valeurs que le desk a lues à l'œil", () => {
    const lues = actionsGeometriques(section);
    expect(lues.map((e) => e.isin)).toEqual(["CM0000010009", "CM0000010041"]);
    const reg = lues.find((e) => e.isin === "CM0000010041")!;
    expect(reg.open).toBe(42500);
    expect(reg.close).toBe(42500);
    expect(reg.previousClose).toBe(42500);
    expect(reg.previousDate).toBe("2023-12-21");
  });

  it("l'ISIN se cherche DANS la cellule, pas en cellule exacte", () => {
    /* La grille rend « CM0000010009 SEMC » d'un bloc. Le chercher en cellule
       exacte, comme le fait le lecteur des obligations, ne trouvait rien du
       tout : zéro action lue, et pas même un refus à montrer. */
    const lues = actionsGeometriques(section);
    expect(lues.find((e) => e.isin === "CM0000010009")?.mnemo).toBe("SEMC");
  });

  it("le nom de l'émetteur vient des rangées du dessus", () => {
    expect(actionsGeometriques(section).find((e) => e.isin === "CM0000010009")?.issuer).toBe("SOCIETE DES EAUX MINERALES");
  });

  it("et une rangée refusée se dit, avec son texte", () => {
    const abimee = [rangee(2, 367, ["MARCHE DES ACTIONS"]), rangee(2, 290, ["CM0000010009 SEMC", "SEMC", "45 950", "21/12/2023", "0", "NC", "45 950", "45 950", "99 999", "11 111", "0,00%", "45 950"])];
    const carnet = { notes: [] as { message: string; brut?: string }[], push() {}, sur(message: string, brut: string) { this.notes.push({ message, brut }); }, get messages() { return this.notes.map((n) => n.message); } };
    expect(actionsGeometriques(abimee, carnet as never)).toEqual([]);
    expect(carnet.notes[0]?.message).toContain("CM0000010009");
    expect(carnet.notes[0]?.brut, "le texte de la rangée part avec le refus").toContain("99 999");
  });
});

describe("une valeur que la base ne peut pas contenir n'est pas une valeur", () => {
  const q = (open: number): Quote => ({ isin: "GQ0000010050", sessionDate: "2023-12-22", open } as Quote);

  it("vingt-et-un chiffres sont refusés, et le champ est nommé", () => {
    /* C'est la ligne BANGE du 22 décembre 2023 : quatre montants à
       séparateurs d'espace collés en un seul. L'écriture des cotations étant
       tout-ou-rien, elle emportait les cinq autres actions de la séance. */
    expect(valeurHorsLimites(q(207110207110227820000))).toBe("open = 207110207110227820000");
    expect(valeurHorsLimites(q(45950))).toBeUndefined();
  });

  it("le plafond est celui de la colonne : seize chiffres devant la virgule", () => {
    expect(PLAFOND_NUMERIQUE).toBe(10 ** 16);
    /* PAS « PLAFOND − 1 » : 9 999 999 999 999 999 n'est pas représentable en
       flottant et remonte à 10 000 000 000 000 000, donc le cas se serait
       trompé de camp. Un cours de la cote tient très en deçà. */
    expect(valeurHorsLimites(q(10 ** 15))).toBeUndefined();
    expect(valeurHorsLimites(q(PLAFOND_NUMERIQUE))).toBeDefined();
  });
});
