import { describe, expect, it } from "vitest";
import { clefDuTrimestre, mur, partMesuree, plusLourd, type TombeeSituee } from "@/lib/market/mur-echeances";

/**
 * UN ENCOURS NE DIT PAS QUAND IL FAUT PAYER.
 *
 * Deux mille quatre cents milliards dus ne disent rien du risque ; deux cents
 * milliards dus le même trimestre le disent. Le mur transforme un stock en
 * calendrier, et c'est la seule lecture qui annonce une difficulté avant
 * qu'elle arrive.
 */
const t = (p: Partial<TombeeSituee> & { quand: string }): TombeeSituee => ({
  isin: "X", capital: 0, coupon: 0, source: "mesure", porte: "cote", emetteur: "A", ...p,
});

describe("le rangement par trimestre", () => {
  it("range chaque mois dans son trimestre", () => {
    expect(clefDuTrimestre("2027-01-31")).toBe("2027-T1");
    expect(clefDuTrimestre("2027-03-31")).toBe("2027-T1");
    expect(clefDuTrimestre("2027-04-01")).toBe("2027-T2");
    expect(clefDuTrimestre("2027-12-31")).toBe("2027-T4");
  });
});

describe("le mur", () => {
  it("SÉPARE LE CAPITAL DU COUPON, parce qu'ils ne se paient pas pareil", () => {
    /* Le capital se refinance ou se rembourse, le coupon se paie sur la
       trésorerie courante. Les additionner en un « service » cache lequel
       des deux pèse. */
    const m = mur([t({ quand: "2027-02-01", capital: 50e9, coupon: 3e9 })], "2027-01-01", 2);
    expect(m[0].capital).toBe(50e9);
    expect(m[0].coupon).toBe(3e9);
  });

  it("GARDE LES TRIMESTRES VIDES, parce qu'un trou dans le mur est un répit", () => {
    /* Sauter de 2027-T1 à 2027-T4 laisserait croire à une tombée continue. */
    const m = mur([t({ quand: "2027-01-15", capital: 10e9 }), t({ quand: "2027-10-15", capital: 20e9 })], "2027-01-01", 4);
    expect(m.map((x) => x.clef)).toEqual(["2027-T1", "2027-T2", "2027-T3", "2027-T4"]);
    expect(m.map((x) => x.capital)).toEqual([10e9, 0, 0, 20e9]);
  });

  it("ÉCARTE LE PASSÉ plutôt que de l'empiler à zéro", () => {
    /* Un mur qui commence en 2019 noie les trois trimestres qui comptent
       sous vingt colonnes mortes. */
    const m = mur([t({ quand: "2019-05-01", capital: 99e9 }), t({ quand: "2027-02-01", capital: 1e9 })], "2027-01-01", 1);
    expect(m).toHaveLength(1);
    expect(m[0].capital).toBe(1e9);
  });

  it("tient les deux portes séparées, et leur somme fait le total", () => {
    const m = mur(
      [t({ quand: "2027-02-01", capital: 30e9, porte: "cote" }), t({ quand: "2027-02-10", capital: 20e9, porte: "adjuge", isin: "Y" })],
      "2027-01-01",
      1,
    );
    expect(m[0].parPorte.cote.capital).toBe(30e9);
    expect(m[0].parPorte.adjuge.capital).toBe(20e9);
    expect(m[0].parPorte.cote.capital + m[0].parPorte.adjuge.capital).toBe(m[0].capital);
    expect(m[0].lignes).toBe(2);
  });

  it("compte une ligne une seule fois, même si elle tombe deux fois dans le trimestre", () => {
    const m = mur([t({ quand: "2027-01-15", capital: 5e9 }), t({ quand: "2027-02-15", capital: 5e9 })], "2027-01-01", 1);
    expect(m[0].lignes).toBe(1);
    expect(m[0].capital).toBe(10e9);
  });
});

describe("ce que le mur dit de lui-même", () => {
  it("DIT QUELLE PART DU CAPITAL EST MESURÉE, et non supposée", () => {
    /* Un pas d'amortissement supposé étale le capital régulièrement, ce qui
       lisse précisément les pics qu'on cherche. Sans cette part, on ne sait
       pas si le mur est une lecture ou une estimation. */
    const m = mur(
      [t({ quand: "2027-02-01", capital: 75e9, source: "mesure" }), t({ quand: "2027-02-01", capital: 25e9, source: "suppose", isin: "Y" })],
      "2027-01-01",
      1,
    );
    expect(partMesuree(m)).toBe(75);
  });

  it("nomme le trimestre le plus lourd, capital et coupon réunis", () => {
    const m = mur(
      [t({ quand: "2027-02-01", capital: 10e9, coupon: 1e9 }), t({ quand: "2027-05-01", capital: 8e9, coupon: 5e9 })],
      "2027-01-01",
      2,
    );
    expect(plusLourd(m)?.clef).toBe("2027-T2");
  });

  it("rend zéro pour un mur sans capital, plutôt que de diviser par zéro", () => {
    expect(partMesuree(mur([], "2027-01-01", 2))).toBe(0);
    expect(plusLourd([])).toBeUndefined();
  });
});
