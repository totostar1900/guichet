import { describe, expect, it } from "vitest";
import type { Quote } from "@/lib/domain/market";
import { classerSurFenetre } from "@/lib/market/performe";
import { debutDePeriode, lirePeriode, periodeParDefaut, volumetrie, type PointCours } from "@/lib/market/periodes";

/** Une série de jours ouvrés du 1er oct. 2025 au 1er oct. 2026, cours en marches de 500 FCFA, volumes par séance. */
function serie(): PointCours[] {
  const out: PointCours[] = [];
  for (let d = new Date("2025-10-01T12:00:00Z"); d <= new Date("2026-10-01T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
    const iso = d.toISOString().slice(0, 10);
    out.push({ d: iso, c: 80_000 + Math.floor(out.length / 20) * 500, v: out.length % 7 === 0 ? 300 : 0 });
  }
  return out;
}

describe("les périodes du graphe du cours", () => {
  it("la variation de « 3 mois » est celle de « Ce qui performe » : une seule définition", () => {
    const pts = serie();
    const fenetre = debutDePeriode("3m", pts[pts.length - 1].d)!;
    const cotations = pts.map((p) => ({ isin: "GA0000010074", mnemo: "BHC", designation: "BHC", instrument: "action", sessionDate: p.d, close: p.c })) as unknown as Quote[];
    const classe = classerSurFenetre(cotations, fenetre)[0];
    const lue = lirePeriode(pts, "3m");
    expect(lue.disponible).toBe(true);
    expect(lue.variationPct).toBeCloseTo(classe.variationPct, 10);
    expect(lue.depuis).toBe(classe.depuis);
  });
  it("une période que l'historique ne couvre pas n'a pas de variation : 2, 3 et 5 ans sur une série d'un an", () => {
    const pts = serie();
    for (const cle of ["2a", "3a", "5a"] as const) {
      const l = lirePeriode(pts, cle);
      expect(l.disponible, cle).toBe(false);
      expect(l.variationPct, cle).toBeUndefined();
    }
    expect(lirePeriode(pts, "1a").disponible, "un an est couvert à la grâce près").toBe(true);
    expect(lirePeriode(pts, "max").disponible).toBe(true);
    expect(lirePeriode(pts, "max").depuis).toBe(pts[0].d);
  });
  it("le début d'année part du 1er janvier, « max » de la première séance", () => {
    const pts = serie();
    expect(debutDePeriode("debut", "2026-10-01")).toBe("2026-01-01");
    expect(debutDePeriode("max", "2026-10-01")).toBeUndefined();
    const l = lirePeriode(pts, "debut");
    expect(l.serie[0].d >= "2026-01-01").toBe(true);
  });
  it("la période par défaut est « 3 mois », ou « max » quand la série est trop courte", () => {
    const pts = serie();
    expect(periodeParDefaut(pts)).toBe("3m");
    expect(periodeParDefaut(pts.slice(-30))).toBe("max");
  });
  it("la volumétrie dit les échanges : total, séances avec échange, plus fort volume", () => {
    const v = volumetrie([
      { d: "2026-09-01", c: 1, v: 0 },
      { d: "2026-09-02", c: 1, v: 300 },
      { d: "2026-09-03", c: 1, v: 0 },
      { d: "2026-09-04", c: 1, v: 120 },
    ]);
    expect(v).toEqual({ total: 420, valeur: 0, seancesAvecEchange: 2, seances: 4, plusFort: 300 });
    expect(volumetrie([{ d: "2026-09-01", c: 1, v: 10, val: 500_000 }, { d: "2026-09-02", c: 1, v: 5, val: 250_000 }]).valeur, "le volume des transactions est la somme des valeurs échangées").toBe(750_000);
  });
});
