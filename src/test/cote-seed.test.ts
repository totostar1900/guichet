import { describe, expect, it } from "vitest";
import { coteDEssai } from "@/data/cote-seed";
import { indexCheck, indexSeries, indexWeights } from "@/lib/market/index";

/**
 * LE JEU D'ESSAI DOIT RESSEMBLER AU MARCHÉ, PAS À UN MARCHÉ.
 *
 * Le dépôt mémoire n'avait ni bulletin ni cotation : trois pages du siège
 * Marché s'effaçaient en local, et c'est ce qui a laissé passer une mise en
 * page non vue jusqu'en production, le 5 octobre 2026.
 *
 * Ce cliquet tient trois choses. Que la série soit reproductible, sans quoi
 * une capture du guide se périme à chaque démarrage. Que l'indice reste
 * cohérent avec les cours, puisque c'est le contrôle que le desk voit tous les
 * jours. Et que la cote reste CALME : un jeu où tout bouge tous les jours
 * cacherait précisément les défauts qui ne se voient que sur une séance plate.
 */
describe("la cote du jeu de démonstration", () => {
  const a = coteDEssai();
  const b = coteDEssai();

  it("donne deux fois la même cote", () => {
    expect(a.bulletins.length).toBe(b.bulletins.length);
    expect(JSON.stringify(a.quotes.slice(0, 50))).toBe(JSON.stringify(b.quotes.slice(0, 50)));
    expect(a.bulletins.at(-1)!.indexValue).toBe(b.bulletins.at(-1)!.indexValue);
  });

  it("couvre une année de séances ouvrables, sans samedi ni dimanche", () => {
    expect(a.bulletins.length).toBeGreaterThan(240);
    const jours = new Set(a.bulletins.map((x) => new Date(`${x.sessionDate}T12:00:00Z`).getUTCDay()));
    expect([...jours].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(a.quotes.length).toBe(a.bulletins.length * 7);
  });

  /* Le contrôle que le desk lit chaque jour : un indice qui bouge sans qu'aucun
     cours n'ait changé, ou l'inverse, est une page mal lue. */
  it("garde l'indice d'accord avec les cours, séance après séance", () => {
    const parDate = new Map<string, typeof a.quotes>();
    for (const q of a.quotes) parDate.set(q.sessionDate, [...(parDate.get(q.sessionDate) ?? []), q]);
    const dates = [...parDate.keys()].sort();
    const faux: string[] = [];
    for (let i = 1; i < dates.length; i++) {
      const r = indexCheck(
        a.bulletins.find((x) => x.sessionDate === dates[i]),
        parDate.get(dates[i - 1])!,
        parDate.get(dates[i])!,
      );
      if (!r.ok) faux.push(`${dates[i]} : ${r.detail}`);
    }
    expect(faux.slice(0, 3), `${faux.length} séances incohérentes`).toEqual([]);
  });

  it("reste une cote calme, comme celle qu'elle imite", () => {
    const bougent = a.quotes.filter((q) => q.variationPct !== 0).length / a.quotes.length;
    const echangent = a.quotes.filter((q) => q.trades > 0).length / a.quotes.length;
    /* Mesuré sur la production : 4,6 % de cours changés, 24 % de séances
       échangées. On tient une bande autour, pas une égalité. */
    expect(bougent, `${(bougent * 100).toFixed(1)} % de cours changés`).toBeGreaterThan(0.02);
    expect(bougent).toBeLessThan(0.09);
    expect(echangent, `${(echangent * 100).toFixed(1)} % de séances échangées`).toBeGreaterThan(0.15);
    expect(echangent).toBeLessThan(0.3);
  });

  it("donne aux sept lignes leur poids, et à la dernière séance ses capitalisations", () => {
    const derniere = a.bulletins.at(-1)!.sessionDate;
    const w = indexWeights(a.quotes.filter((q) => q.sessionDate === derniere));
    expect(w.length).toBe(7);
    expect(Math.round(w.reduce((s, x) => s + x.weightTotal, 0))).toBe(100);
    /* La plus grosse d'abord : sans tri, la table des sociétés s'ouvrirait sur
       la plus petite, et le lecteur en conclurait qu'elle pèse le marché. */
    expect(w[0].mnemo).toBe("BHC");
  });

  it("laisse l'indice bouger, sans le faire bouger tous les jours", () => {
    const pts = indexSeries(a.bulletins);
    const bougent = pts.filter((p) => Math.abs(p.variationPct ?? 0) >= 0.005).length;
    expect(bougent).toBeGreaterThan(20);
    expect(bougent / pts.length, "une cote qui bouge chaque jour n'est pas celle-ci").toBeLessThan(0.6);
  });
});
