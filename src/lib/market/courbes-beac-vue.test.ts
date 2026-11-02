import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { donneesDe, lien, lireReglages, memeReglages, modeleDeLaFigure, PLAFOND, prereglages, type PointBeac } from "./courbes-beac-vue";

const p = (mois: string, pays: string, annees: number, taux: number): PointBeac => ({ mois: `${mois}-01`, pays, annees, tenor: `${annees} ans`, taux });
const POINTS: PointBeac[] = [
  ...["2026-09", "2026-07", "2026-03", "2025-05"].flatMap((m, i) => [p(m, "Cameroun", 1, 7 + i), p(m, "Cameroun", 10, 8 + i)]),
  ...["2026-09", "2026-07"].flatMap((m, i) => [p(m, "Congo", 1, 9 + i), p(m, "Congo", 10, 10 + i * 4)]),
  p("2026-09", "Gabon", 10, 16.63), p("2026-07", "Gabon", 10, 7.15), p("2017-02", "Tchad", 10, 5),
];
const D = donneesDe(POINTS);

describe("les données et les préréglages", () => {
  it("range les mois du plus récent et les durées croissantes", () => {
    expect(D.recent).toBe("2026-09");
    expect(D.mois[0]).toBe("2026-09");
    expect(D.durees).toEqual([1, 10]);
  });

  it("le préréglage par défaut compare les Trésors à jour au mois le plus récent", () => {
    const c = prereglages(D).comparer;
    expect(c).toMatchObject({ axe: "duree", mois: ["2026-09"], source: "beac" });
    expect(c.pays.sort()).toEqual(["Cameroun", "Congo", "Gabon"]);
    expect(c.pays).not.toContain("Tchad");
  });

  it("« une courbe qui bouge » prend le plus récent puis des mois plus anciens, tous distincts", () => {
    const b = prereglages(D).bouge;
    expect(b.pays).toEqual(["Cameroun"]);
    expect(b.mois[0]).toBe("2026-09");
    expect(new Set(b.mois).size).toBe(b.mois.length);
  });
});

describe("l'adresse", () => {
  it("sans réglage, ouvre sur le préréglage par défaut", () => {
    expect(lireReglages({}, D)).toEqual(prereglages(D).comparer);
  });

  it("n'accepte que des valeurs connues : le reste retombe sur le défaut, jamais sur une figure vide", () => {
    const r = lireReglages({ axe: "temps", pays: "Atlantide,Gabon,RCA", d: "11,5" }, D);
    expect(r.pays).toEqual(["Gabon"]);
    expect(r.duree).toBe(10);
    const s = lireReglages({ axe: "duree", mois: "1999-01", src: "n'importe" }, D);
    expect(s.mois).toEqual(["2026-09"]);
    expect(s.source).toBe("beac");
  });

  it("n'offre pas « nous » en axe temps : nous n'avons pas d'historique de nos courbes", () => {
    expect(lireReglages({ axe: "temps", src: "deux" }, D).source).toBe("beac");
  });

  it("l'adresse d'un réglage se relit à l'identique", () => {
    for (const r of Object.values(prereglages(D))) {
      const q = Object.fromEntries(new URL(lien(r), "http://x").searchParams);
      expect(memeReglages(lireReglages(q, D), r)).toBe(true);
    }
  });
});

describe("le modèle de la figure", () => {
  it("axe durée : une courbe par Trésor et par mois, un mois sans feuille est un manque nommé", () => {
    const m = modeleDeLaFigure(POINTS, { axe: "duree", pays: ["Congo", "Gabon"], mois: ["2026-09", "2026-03"], duree: 10, source: "beac" });
    expect(m.nCourbes).toBe(2);
    expect(m.manques).toEqual(expect.arrayContaining([{ pays: "Congo", mois: "2026-03" }, { pays: "Gabon", mois: "2026-03" }]));
    expect(m.series[0].pts.map((q) => q.x)).toEqual([1, 10]);
  });

  it("axe temps : un mois manquant INTERROMPT la ligne, il ne la joint pas", () => {
    const pts = [p("2026-01", "Gabon", 10, 8), p("2026-02", "Gabon", 10, 8.2), p("2026-05", "Gabon", 10, 8.4)];
    const m = modeleDeLaFigure(pts, { axe: "temps", pays: ["Gabon"], mois: [], duree: 10, source: "beac" });
    expect(m.series.map((s) => s.pts.length)).toEqual([2, 1]);
  });

  it("signale un saut de trois points ou plus, avec ses deux valeurs et le mois d'où l'on vient", () => {
    const m = modeleDeLaFigure(POINTS, { axe: "temps", pays: ["Gabon"], mois: [], duree: 10, source: "beac" });
    expect(m.sauts).toEqual([{ pays: "Gabon", mois: "2026-09", de: 7.15, vers: 16.63, depuis: "2026-07" }]);
  });

  it("refuse de tracer au-delà de douze courbes", () => {
    const beaucoup: PointBeac[] = [];
    for (const m of ["2026-09", "2026-07", "2026-03", "2025-05"]) for (const pays of ["Cameroun", "Congo", "Gabon", "Tchad"]) beaucoup.push(p(m, pays, 1, 8));
    const m = modeleDeLaFigure(beaucoup, { axe: "duree", pays: ["Cameroun", "Congo", "Gabon", "Tchad"], mois: ["2026-09", "2026-07", "2026-03", "2025-05"], duree: 1, source: "beac" });
    expect(m.nCourbes).toBe(16);
    expect(m.nCourbes).toBeGreaterThan(PLAFOND);
    expect(m.trop).toBe(true);
  });

  it("la source « nous » ne trace que nos points ; « les deux » superpose", () => {
    const nous = [{ pays: "Gabon", annees: 2, pct: 11 }];
    const seul = modeleDeLaFigure(POINTS, { axe: "duree", pays: ["Gabon"], mois: ["2026-09"], duree: 10, source: "nous" }, nous);
    expect(seul.series).toHaveLength(1);
    expect(seul.series[0].ronds).toBe(true);
    const deux = modeleDeLaFigure(POINTS, { axe: "duree", pays: ["Gabon"], mois: ["2026-09"], duree: 10, source: "deux" }, nous);
    expect(deux.series).toHaveLength(2);
  });
});

describe("les deux graphiques se parlent", () => {
  it("la figure des analyses renvoie vers la page dédiée, avec ses Trésors et sa durée déjà choisis", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../components/market/CourbeFusion.tsx"), "utf8");
    expect(src, "le renvoi vers /desk/courbes-beac a disparu").toMatch(/lienCourbesBeac\(\{ axe: "duree", pays: beac\.map\(\(b\) => b\.nom\)/);
    const nav = fs.readFileSync(path.join(__dirname, "../desk-groupes.ts"), "utf8");
    expect(nav, "la page n'est plus dans le menu du desk").toMatch(/\["\/desk\/courbes-beac", "Courbes BEAC"\]/);
  });
});
