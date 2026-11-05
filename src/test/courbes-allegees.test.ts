import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { echantillonner, fundCurveFrom, fundYtdPct, type FundCurve } from "@/lib/domain/fund-curve";

const lire = (p: string) => fs.readFileSync(path.join(__dirname, "../..", p), "utf8");

/**
 * LES COURBES DES FONDS ÉCHANTILLONNÉES POUR LE TRANSPORT (11 novembre 2026, point 4 de la lenteur).
 *
 * Soixante VL par fonds faisaient les trois quarts des lignes de la liste. On en garde trente, sur la même durée, sans toucher à ce que l'écran dit.
 */
const courbe = (n: number, f: (i: number) => number = (i) => 10_000 + i * 3 + (i % 7) * 11): FundCurve => {
  const navs = Array.from({ length: n }, (_, i) => ({ navDate: new Date(Date.UTC(2025, 0, 3) + i * 7 * 86_400_000).toISOString().slice(0, 10), nav: f(i) }));
  return fundCurveFrom(navs, n)!;
};

describe("echantillonner", () => {
  it("rend une courbe déjà courte telle quelle", () => {
    const c = courbe(30);
    expect(echantillonner(c, 30), "une courbe de trente VL a été touchée").toBe(c);
    expect(echantillonner(courbe(12), 30).n, "une courbe courte porte un nombre de VL").toBeUndefined();
  });
  it("garde trente valeurs sur la même durée, la première et la dernière exactement, et le vrai nombre de VL", () => {
    const c = courbe(60);
    const e = echantillonner(c, 30);
    expect(e.ys).toHaveLength(30);
    expect([e.ys[0], e.ys[29]], "la première ou la dernière valeur a bougé : la valeur en or et l'année en cours s'en servent").toEqual([c.ys[0], c.ys[59]]);
    expect([e.from, e.to], "la durée couverte a changé").toEqual([c.from, c.to]);
    expect(e.n, "« 60 VL » au dos d'une carte ne dirait plus la vérité").toBe(60);
  });
  it("garde le plus haut et le plus bas de la série, qui donnent son échelle au dessin", () => {
    // Un creux et un sommet isolés, qu'aucun échantillon régulier n'attrape.
    // Toutes les valeurs sont distinctes, pour que la position d'une valeur gardée soit sans ambiguïté.
    const c = courbe(60, (i) => (i === 13 ? 9_000 : i === 41 ? 12_500 : 10_000 + i * 0.37 + (i % 5)));
    const e = echantillonner(c, 30);
    expect([Math.min(...e.ys), Math.max(...e.ys)], "le creux ou le sommet a été perdu : le dessin changerait d'échelle").toEqual([Math.min(...c.ys), Math.max(...c.ys)]);
    const positions = e.ys.map((v) => c.ys.indexOf(v));
    expect([...positions].sort((a, b) => a - b), "les valeurs gardées ne suivent plus l'ordre de la série").toEqual(positions);
  });
  it("ne touche ni aux fenêtres, ni à l'année en cours, ni aux trous : ils ne sortent pas de la courbe dessinée", () => {
    const c = courbe(70);
    const e = echantillonner(c, 30);
    expect([e.fenetres, e.ytdFrom, e.ytdDate, e.trous]).toEqual([c.fenetres, c.ytdFrom, c.ytdDate, c.trous]);
    expect(fundYtdPct(e), "la performance depuis le 1er janvier a changé").toBe(fundYtdPct(c));
  });
  it("est celle que la liste des fonds envoie, et le dos d'une carte garde le vrai nombre de VL", () => {
    expect(lire("src/app/fonds/FondsBody.tsx"), "les courbes de la liste des fonds voyagent de nouveau entières").toMatch(/\.map\(\(\[k, c\]\) => \[k, echantillonner\(c\)\] as const\)/);
    expect(lire("src/components/mobile/CardBack.tsx"), "le dos d'une carte dit le nombre de valeurs envoyées et non celui de la série").toMatch(/<i>\{curve\.n \?\? curve\.ys\.length\} VL<\/i>/);
  });
});
