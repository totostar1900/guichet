import { describe, expect, it } from "vitest";
import { dateDEntree, entreeParDefaut, exerciceEnVigueur, paliersDExercice, rotationParMois, rotationSurPeriode, serieDeValorisation } from "@/lib/market/valorisation";

const comptes = [
  { year: 2024, netIncome: 2_781_417_736, equity: 21_414_462_333, dividendPerShare: 2000 },
  { year: 2025, netIncome: 3_219_423_726, equity: 22_149_885_911, dividendPerShare: 2200 },
];
const repli = { titres: 1_242_000, flottants: 248_400 };

describe("la série de valorisation d'une action", () => {
  it("l'exercice N compte à partir du 1er avril N+1 à défaut de toute date", () => {
    expect(entreeParDefaut(2025)).toBe("2026-04-01");
    expect(exerciceEnVigueur(comptes, "2026-03-31")?.year).toBe(2024);
    expect(exerciceEnVigueur(comptes, "2026-04-01")?.year).toBe(2025);
    expect(exerciceEnVigueur(comptes, "2025-03-31"), "avant le premier exercice connu : aucun").toBeUndefined();
  });
  it("la date existante passe avant la date du desk, qui passe avant le 1er avril ; une date mal écrite est ignorée", () => {
    expect(dateDEntree({ year: 2025, publieLe: "2026-05-12", publieLeDesk: "2026-06-30" })).toBe("2026-05-12");
    expect(dateDEntree({ year: 2025, publieLeDesk: "2026-06-30" })).toBe("2026-06-30");
    expect(dateDEntree({ year: 2025 })).toBe("2026-04-01");
    expect(dateDEntree({ year: 2025, publieLe: "mai 2026", publieLeDesk: "2026-06-30" }), "une date existante illisible laisse la main au desk").toBe("2026-06-30");
    expect(dateDEntree({ year: 2025, publieLe: "", publieLeDesk: "30/06/2026" })).toBe("2026-04-01");
    const avecDate = [{ ...comptes[1], publieLe: "2026-06-15" }, comptes[0]];
    expect(exerciceEnVigueur(avecDate, "2026-06-14")?.year).toBe(2024);
    expect(exerciceEnVigueur(avecDate, "2026-06-15")?.year).toBe(2025);
  });
  it("les rapports changent de palier quand l'exercice change, et suivent le cours entre-temps", () => {
    const s = serieDeValorisation(
      [
        { d: "2026-03-31", c: 35_500 },
        { d: "2026-04-01", c: 35_500 },
      ],
      comptes,
      repli,
    );
    expect(s[0].exercice).toBe(2024);
    expect(s[1].exercice).toBe(2025);
    expect(s[0].per).toBeCloseTo((35_500 * 1_242_000) / 2_781_417_736, 6);
    expect(s[1].per).toBeCloseTo((35_500 * 1_242_000) / 3_219_423_726, 6);
    expect(s[0].rendement).toBeCloseTo((2000 / 35_500) * 100, 6);
    expect(s[1].rendement).toBeCloseTo((2200 / 35_500) * 100, 6);
    expect(paliersDExercice(s)).toEqual([{ d: "2026-04-01", exercice: 2025 }]);
  });
  it("le nombre de titres de la séance est celui du bulletin : une division du nominal laisse la série intacte", () => {
    const a = serieDeValorisation([{ d: "2026-08-01", c: 50_000, titres: 1_000_000, flottants: 200_000 }], comptes, repli)[0];
    const b = serieDeValorisation([{ d: "2026-08-01", c: 10_000, titres: 5_000_000, flottants: 1_000_000 }], comptes, repli)[0];
    expect(b.cap).toBe(a.cap);
    expect(b.capFlottante).toBe(a.capFlottante);
    expect(b.per).toBe(a.per);
    expect(b.pb).toBe(a.pb);
  });
  it("sans nombre de titres dans la séance, c'est le repli ; sans comptes en vigueur, pas de rapport", () => {
    const s = serieDeValorisation([{ d: "2025-01-02", c: 30_000 }], comptes, repli)[0];
    expect(s.cap).toBe(30_000 * 1_242_000);
    expect(s.capFlottante).toBe(30_000 * 248_400);
    expect(s.per).toBeNull();
    expect(s.pb).toBeNull();
    expect(s.rendement).toBeNull();
  });
  it("un résultat net négatif n'a pas de rapport cours / bénéfice", () => {
    const s = serieDeValorisation([{ d: "2026-08-01", c: 10_000 }], [{ year: 2025, netIncome: -5, equity: 100, dividendPerShare: null }], { titres: 100, flottants: null })[0];
    expect(s.per).toBeNull();
    expect(s.pb).not.toBeNull();
    expect(s.rendement).toBeNull();
    expect(s.capFlottante).toBeNull();
  });
  it("la rotation du flottant : sur la période, et mois par mois", () => {
    const s = serieDeValorisation(
      [
        { d: "2026-08-03", c: 1000, valeur: 100_000 },
        { d: "2026-08-31", c: 1000, valeur: 0 },
        { d: "2026-09-01", c: 1000, valeur: 50_000 },
        { d: "2026-09-30", c: 2000, valeur: 150_000 },
      ],
      comptes,
      { titres: 1000, flottants: 500 },
    );
    expect(rotationSurPeriode(s).valeur).toBe(300_000);
    /* capitalisation flottante de la dernière séance : 2000 × 500 = 1 000 000 */
    expect(rotationSurPeriode(s).rotationPct).toBeCloseTo(30, 6);
    const m = rotationParMois(s);
    expect(m.map((x) => x.mois)).toEqual(["2026-08", "2026-09"]);
    expect(m[0].rotationPct, "août : 100 000 ÷ (1000 × 500)").toBeCloseTo(20, 6);
    expect(m[1].rotationPct, "septembre : 200 000 ÷ (2000 × 500)").toBeCloseTo(20, 6);
  });
  it("sans flottant connu, pas de rotation", () => {
    const s = serieDeValorisation([{ d: "2026-08-03", c: 1000, valeur: 100 }], comptes, { titres: 1000, flottants: null });
    expect(rotationSurPeriode(s).rotationPct).toBeNull();
    expect(rotationParMois(s)[0].rotationPct).toBeNull();
  });
});
