import { describe, expect, it } from "vitest";
import { capitalisationsGeometriques } from "@/lib/market/boc-geometrie";
import type { Rangee } from "@/lib/market/boc-geometrie";

/**
 * LA TABLE DE CAPITALISATION, LUE PAR LES ABSCISSES.
 *
 * CE QUE LA FAMILLE O CACHAIT. Georges a dit le 13 octobre 2026 que les
 * rangées refusées « sont bien complètes ». Elles l'étaient, et ce n'était pas
 * la bonne table : la section s'appelle « CAPITALISATION BOURSIERE ET ENCOURS
 * DES TITRES DE DETTE » et en contient deux, qui n'ont pas les mêmes colonnes.
 * Le lecteur aplati lisait les rangées BDEAC avec la grammaire des actions.
 *
 * LE VRAI MANQUE, MESURÉ SUR 812 SÉANCES : 208 où la lecture aplatie ne rend
 * RIEN, 208 rendues par la géométrie, +1 002 lignes, et ZÉRO produit faux.
 *
 * CE QUI SE TESTE ICI EST LE CONTRÔLE, pas le découpage. La rangée se vérifie
 * elle-même : cours × flottant = capitalisation flottante, cours × total =
 * capitalisation globale. C'est ce contrôle, et lui seul, qui écarte les
 * rangées de la table de dette sans avoir à savoir dans quelle table on se
 * trouve : leur « cours » est un taux de coupon et leur « flottant » un
 * montant levé, donc le produit ne tombera jamais juste.
 */

/** Une rangée du PDF, cellules déjà séparées par la grille. */
const rangee = (page: number, y: number, textes: string[]): Rangee => ({
  page,
  y,
  cellules: textes.map((texte, i) => ({ texte, x: 100 + i * 60, largeur: 55 })),
});

/** L'en-tête que le lecteur cherche pour ouvrir la section. */
const entete = (): Rangee[] => [
  rangee(5, 510, ["CAPITALISATION BOURSIERE ET ENCOURS DES TITRES DE DETTE"]),
  rangee(5, 456, ["MARCHE DES ACTIONS", ":", "6", "EMETTEURS INSCRITS A LA COTE"]),
  rangee(5, 441, ["Volume des titres", "Dernier dividende payé", "Capitalisation boursière"]),
  rangee(5, 437, ["Désignation de", "Nom court de", "Cours de", "Liquidité des", "Bénéfice net"]),
  rangee(5, 433, ["Code ISIN", "Mnemo", "PER"]),
];

/* La rangée réelle du 2 juin 2025, telle que les abscisses la rendent. */
const SEMC = ["SEMC", "CM0000010009", "SEMC", "SEMC", "46 500,00", "38 367", "192 473", "540,00", "2023", "27/06/2024", "0,04", "-", "-", "1 784 065 500", "8 949 994 500"];

/* Une rangée de la table de DETTE, qui suit dans la même section. */
const BDEAC = ["BDEAC", "BDEAC 6,20% NET 2024-2031", "CG0000020469", "EBD04", "6,2", "07/08/2024", "23 615 870 000", "2 361 587", "10 000", "100", "7", "CONSTANT", "AN"];

describe("la capitalisation lue par les abscisses", () => {
  it("lit la rangée et ses deux produits", () => {
    const out = capitalisationsGeometriques([...entete(), rangee(5, 412, SEMC)]);
    expect(out).toHaveLength(1);
    const c = out[0];
    expect(c.isin).toBe("CM0000010009");
    expect(c.mnemo).toBe("SEMC");
    expect(c.close).toBe(46_500);
    expect(c.sharesFloat).toBe(38_367);
    expect(c.sharesTotal).toBe(192_473);
    expect(c.marketCapFloat).toBe(1_784_065_500);
    expect(c.marketCapTotal).toBe(8_949_994_500);
    /* 46 500 × 38 367 = 1 784 065 500, et 46 500 × 192 473 = 8 949 994 500. */
    expect(c.close * c.sharesFloat).toBe(c.marketCapFloat);
    expect(c.close * c.sharesTotal).toBe(c.marketCapTotal);
  });

  it("prend le dividende, son année et sa date", () => {
    const c = capitalisationsGeometriques([...entete(), rangee(5, 412, SEMC)])[0];
    expect(c.lastDividend).toBe(540);
    expect(c.dividendYear).toBe(2023);
    expect(c.dividendDate).toBe("2024-06-27");
  });

  it("ÉCARTE une rangée de la table de dette, sans savoir que c'en est une", () => {
    /* C'est tout le propos du contrôle arithmétique. Le lecteur aplati rangeait
       cette ligne en capitalisation et en tirait « cours 5,45 · flottant
       106 791 920 000 · capitalisation globale 0 » : le taux du coupon pris
       pour un cours, le montant levé pour un flottant. Ici le produit ne tombe
       pas, donc la rangée sort, et aucune règle n'a eu besoin de connaître la
       frontière entre les deux tables. */
    const out = capitalisationsGeometriques([...entete(), rangee(5, 412, SEMC), rangee(6, 395, BDEAC)]);
    expect(out.map((c) => c.isin)).toEqual(["CM0000010009"]);
  });

  it("refuse une rangée dont les produits ne tombent pas, même bien formée", () => {
    /* Un chiffre déplacé passerait tous les contrôles de forme. Il ne passe
       pas celui-ci, et c'est la seule raison pour laquelle cette lecture est
       défendable. */
    const faussee = [...SEMC];
    faussee[13] = "1 784 065 900";
    expect(capitalisationsGeometriques([...entete(), rangee(5, 412, faussee)])).toHaveLength(0);
  });

  it("tolère le franc d'arrondi, et pas davantage", () => {
    /* LA TOLÉRANCE EST D'UN FRANC, et c'est une prudence et non un besoin
       mesuré : sur les 1 002 lignes du corpus, les produits tombent exacts.
       On la garde parce qu'un arrondi d'impression coûterait toute une
       séance, et on vérifie ses deux côtés, faute de quoi le seuil serait
       une intention plutôt qu'une règle. */
    const aUnFranc = [...SEMC];
    aUnFranc[13] = "1 784 065 501";
    expect(capitalisationsGeometriques([...entete(), rangee(5, 412, aUnFranc)])).toHaveLength(1);
    const aDeuxFrancs = [...SEMC];
    aDeuxFrancs[13] = "1 784 065 502";
    expect(capitalisationsGeometriques([...entete(), rangee(5, 412, aDeuxFrancs)])).toHaveLength(0);
  });

  it("ne rend rien quand la section est absente", () => {
    expect(capitalisationsGeometriques([rangee(1, 700, ["MARCHE DES OBLIGATIONS"])])).toEqual([]);
  });

  it("ne compte pas deux fois le même ISIN", () => {
    const out = capitalisationsGeometriques([...entete(), rangee(5, 412, SEMC), rangee(5, 398, SEMC)]);
    expect(out).toHaveLength(1);
  });
});
