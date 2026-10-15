import { describe, expect, it } from "vitest";
import { colonnes, entete, lireStatistiqueMensuelle, montant, pourcent } from "@/lib/market/statistique-mensuelle";
import type { Rangee } from "@/lib/market/boc-geometrie";

/** Une rangée telle que la lecture géométrique la rend. */
const r = (page: number, ...textes: string[]): Rangee => ({
  page,
  y: 0,
  cellules: textes.map((texte, i) => ({ texte, x: 50 + i * 60, largeur: 55 })),
});

/**
 * LA PIÈCE QUI PORTE L'ENCOURS OFFICIEL.
 *
 * Trente-deux numéros, dont deux seulement ont une couche texte : les autres
 * sont des images. C'est pour cela que la table est lue ENTIÈRE et non sur sa
 * dernière colonne, un seul numéro portant huit relevés par pays.
 */
describe("la statistique mensuelle", () => {
  const ENTETE = r(3, "PAYS", "juin", "-", "18*", "juil", "-", "21", "juillet", "-", "22", "juil", "-", "26", "mensuelle");
  const TABLE = [
    ENTETE,
    r(3, "CAMEROUN", "117 000", "1 057 331", "1 109 669", "2 061 322", "2,59%"),
    r(3, "RCA", "9 500", "39 308", "64 430", "462 341", "8,26%"),
    r(3, "CONGO", "17 610", "931 639", "1 264 766", "3 040 847", "1,18%"),
    r(3, "GABON", "283 049", "1 086 698", "1 310 230", "3 424 125", "6,01%"),
    r(3, "GUINEE EQUATORIALE", "101 500", "670 816", "607 625", "387 913", "-", "1,55%"),
    r(3, "TCHAD", "491 271", "469 922", "635 478", "1 184 236", "2,66%"),
    r(3, "Total", "1 019 930", "4 255 714", "4 992 198", "10 560 784", "3,34%"),
  ];

  it("lit l'en-tête : le numéro et le mois", () => {
    expect(entete("Statistiques Mensuelles du Marche des valeurs du Tresor de la CEMAC - N° 60 juillet 2026")).toEqual({ numero: 60, mois: "2026-07" });
    expect(entete("Statistiques mensuelles … - N°43 février 2025")).toEqual({ numero: 43, mois: "2025-02" });
  });

  it("LIT LES COLONNES COMME DES MOIS, la table étant un historique", () => {
    expect(colonnes("PAYS juin - 18* juil - 21 juillet - 22 juil - 26 mensuelle")).toEqual(["2018-06", "2021-07", "2022-07", "2026-07"]);
  });

  it("distingue un montant d'un pourcentage, ce qui situe la bonne colonne", () => {
    expect(montant("2 061 322")).toBe(2061322);
    expect(montant("2,59%")).toBeNull();
    expect(montant("-")).toBeNull();
    expect(pourcent("6,83")).toBe(6.83);
    expect(pourcent("2 061 322")).toBeNull();
    expect(pourcent("-")).toBeNull();
  });

  it("rend un relevé par pays ET par mois", () => {
    const s = lireStatistiqueMensuelle(TABLE, "… - N° 60 juillet 2026");
    /* La table de cout n est pas dans cet extrait : la reserve le dit, et
       c est tout ce qu elle doit dire. */
    expect(s.reserves).toEqual(["aucune table de coût des ressources reconnue"]);
    expect(s.encours).toHaveLength(24);
    expect(s.encours.find((e) => e.pays === "Cameroun" && e.mois === "2018-06")?.montant).toBe(117000);
    expect(s.encours.find((e) => e.pays === "Gabon" && e.mois === "2026-07")?.montant).toBe(3424125);
    expect(s.total).toBe(10560784);
  });

  it("LE TOTAL IMPRIMÉ VÉRIFIE CHAQUE COLONNE, et une colonne fausse est écartée seule", () => {
    /* Un total qui ne fait pas la somme veut dire qu'on n'a pas lu la bonne
       colonne : publier cet encours-là serait pire que n'en publier aucun. */
    const abime = TABLE.map((x) => (x.cellules[0].texte === "Total" ? r(3, "Total", "999 999", "4 255 714", "4 992 198", "10 560 784", "3,34%") : x));
    const s = lireStatistiqueMensuelle(abime, "… - N° 60 juillet 2026");
    expect(s.reserves.join(" ")).toContain("1 colonne(s) sur 4");
    expect(s.encours.some((e) => e.mois === "2018-06")).toBe(false);
    /* Les trois autres colonnes tiennent, et elles sont gardées. */
    expect(s.encours.find((e) => e.pays === "Congo" && e.mois === "2026-07")?.montant).toBe(3040847);
  });

  it("SUIT LA SECTION BTA PUIS OTA, les mêmes pays paraissant dans les deux", () => {
    /* Sans la section, le coût de l'obligation écraserait celui du bon. */
    const cout = [
      r(4, "B", "-", "Coût des ressources levées sur le marché des valeurs du Trésor de la CEMAC"),
      r(4, "BTA", "4,72", "5,98", "6,83"),
      r(4, "Cameroun", "2,81", "5,07", "6,97"),
      r(4, "Congo", "6,40", "6,44", "7,24"),
      r(4, "OTA", "-", "9,37", "10,60"),
      r(4, "Cameroun", "-", "-", "7,36"),
      r(4, "Congo", "-", "11,57", "11,73"),
      r(5, "C", "-", "Participation aux émissions des valeurs du Trésor de la CEMAC"),
      r(5, "Cameroun", "46,18", "23,81", "18,98"),
    ];
    const s = lireStatistiqueMensuelle(cout, "… - N° 60 juillet 2026");
    expect(s.couts).toEqual([
      { pays: "Cameroun", instrument: "BTA", taux: 6.97 },
      { pays: "Congo", instrument: "BTA", taux: 7.24 },
      { pays: "Cameroun", instrument: "OTA", taux: 7.36 },
      { pays: "Congo", instrument: "OTA", taux: 11.73 },
    ]);
  });

  it("se tait plutôt que d'inventer, sur une pièce sans table", () => {
    const s = lireStatistiqueMensuelle([r(1, "STATISTIQUES MENSUELLES")], "… - N° 48 Juillet 2025");
    expect(s.encours).toEqual([]);
    expect(s.reserves.join(" ")).toContain("aucune table d'encours");
  });
});
