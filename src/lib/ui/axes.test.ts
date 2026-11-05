import { describe, expect, it } from "vitest";
import { ticksPropres } from "@/lib/ui/axes";

describe("les graduations d'un axe", () => {
  it("des valeurs rondes qui encadrent la série", () => {
    expect(ticksPropres(0, 621, 3)).toEqual([0, 500, 1000]);
    expect(ticksPropres(83_000, 85_500, 3)).toEqual([82_000, 84_000, 86_000]);
    expect(ticksPropres(0, 12, 4)).toEqual([0, 5, 10, 15]);
  });
  it("la dernière graduation couvre toujours le maximum, la première le minimum", () => {
    for (const [a, b] of [[0, 7], [3, 99], [-40, 60], [82_900, 90_100]] as const) {
      const t = ticksPropres(a, b, 4);
      expect(t[0]).toBeLessThanOrEqual(a);
      expect(t[t.length - 1]).toBeGreaterThanOrEqual(b);
    }
  });
  it("une série plate rend une seule graduation", () => {
    expect(ticksPropres(5, 5, 3)).toEqual([5]);
  });
});

describe("les repères d'un axe ne se superposent pas", () => {
  const mois = ["oct. 2025", "nov.", "déc.", "janv. 2026", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept."];
  const xs = (n: number, largeur: number) => Array.from({ length: n }, (_, i) => (i + 0.5) * (largeur / n));
  it("sur douze mois à 290 px, deux repères voisins ne se touchent jamais", async () => {
    const { reperesSansChevauchement } = await import("@/lib/ui/axes");
    const x = xs(12, 290);
    const g = reperesSansChevauchement(x, mois);
    const gardes = x.map((v, i) => ({ v, i })).filter((p) => g[p.i]);
    for (let k = 1; k < gardes.length; k++) {
      const a = gardes[k - 1].i;
      const b = gardes[k].i;
      const demi = (i: number) => (mois[i].length * 4.6) / 2;
      expect(gardes[k].v - gardes[k - 1].v, `${mois[a]} et ${mois[b]} se touchent`).toBeGreaterThanOrEqual(demi(a) + demi(b));
    }
  });
  it("le premier et le dernier sont gardés, les repères qui portent une année passent avant les autres", async () => {
    const { reperesSansChevauchement } = await import("@/lib/ui/axes");
    const g = reperesSansChevauchement(xs(12, 290), mois);
    expect(g[0]).toBe(true);
    expect(g[11]).toBe(true);
    expect(g[3], "« janv. 2026 » porte l'année : il est gardé").toBe(true);
  });
  it("quand tout tient, tout est écrit ; sur quarante-quatre mois, beaucoup moins, sans jamais se toucher", async () => {
    const { reperesSansChevauchement } = await import("@/lib/ui/axes");
    expect(reperesSansChevauchement([40, 140, 240], ["2023", "2024", "2025"]).every(Boolean)).toBe(true);
    const long = Array.from({ length: 44 }, (_, i) => (i % 12 === 0 ? `janv. ${2023 + i / 12}` : "mars"));
    const g = reperesSansChevauchement(xs(44, 290), long);
    expect(g.filter(Boolean).length).toBeLessThan(44);
    expect(g.filter(Boolean).length).toBeGreaterThan(2);
  });
});
