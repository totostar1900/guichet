import { beforeAll, describe, expect, it, vi } from "vitest";
import { indexCheck, indexSeries, indexWeights } from "@/lib/market/index";
import type { CoteDEssai } from "@/data/cote-seed";

/**
 * LE JEU D'ESSAI DOIT RESSEMBLER AU MARCHÉ, PAS À UN MARCHÉ.
 *
 * Le dépôt mémoire n'avait ni bulletin, ni cotation, ni valeur liquidative :
 * trois pages du siège Marché s'effaçaient en local, et c'est ce qui a laissé
 * passer une mise en page non vue jusqu'en production, le 5 octobre 2026.
 *
 * Le semis dense ne s'allume que sur demande, et la cote suit cette règle :
 * le socle d'une suite de tests ne se déplace pas parce qu'on voulait un
 * environnement local plus fourni. D'où le réglage ci-dessous, posé AVANT le
 * premier import du semis, et l'import dynamique qui s'ensuit.
 */
vi.stubEnv("GUICHET_SEMIS", "reference");

describe("la cote du jeu de démonstration", () => {
  let a: CoteDEssai;
  let b: CoteDEssai;
  beforeAll(async () => {
    const m = await import("@/data/cote-seed");
    a = m.coteDEssai();
    b = m.coteDEssai();
  });

  const actions = () => a.quotes.filter((q) => q.instrument === "action");
  const obligations = () => a.quotes.filter((q) => q.instrument === "obligation");

  it("donne deux fois la même cote", () => {
    expect(a.bulletins.length).toBe(b.bulletins.length);
    expect(JSON.stringify(a.quotes.slice(0, 50))).toBe(JSON.stringify(b.quotes.slice(0, 50)));
    expect(JSON.stringify(a.navs.slice(0, 20))).toBe(JSON.stringify(b.navs.slice(0, 20)));
    expect(a.bulletins.at(-1)!.indexValue).toBe(b.bulletins.at(-1)!.indexValue);
  });

  it("couvre une année de séances ouvrables, sans samedi ni dimanche", () => {
    expect(a.bulletins.length).toBeGreaterThan(240);
    const jours = new Set(a.bulletins.map((x) => new Date(`${x.sessionDate}T12:00:00Z`).getUTCDay()));
    expect([...jours].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(actions().length).toBe(a.bulletins.length * 7);
  });

  /* Le contrôle que le desk lit chaque jour : un indice qui bouge sans qu'aucun
     cours n'ait changé, ou l'inverse, est une page mal lue. */
  it("garde l'indice d'accord avec les cours, séance après séance", () => {
    const parDate = new Map<string, typeof a.quotes>();
    for (const q of actions()) parDate.set(q.sessionDate, [...(parDate.get(q.sessionDate) ?? []), q]);
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
    const q = actions();
    const bougent = q.filter((x) => x.variationPct !== 0).length / q.length;
    const echangent = q.filter((x) => x.trades > 0).length / q.length;
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

  /**
   * LE COMPARTIMENT OBLIGATAIRE EST IMMOBILE, ET CE N'EST PAS UN TROU.
   *
   * Mesuré sur douze mois de production : zéro transaction sur 7 709 couples
   * ligne-séance, vingt et une lignes sur trente-cinq au même cours depuis 397
   * jours. Une cote obligataire animée ferait croire qu'on y entre et qu'on en
   * sort tous les jours.
   */
  it("laisse les obligations immobiles, et sans une seule transaction", () => {
    const o = obligations();
    const isins = new Set(o.map((q) => q.isin));
    /* Trente-cinq du semis dense, une du jeu de depart : le compte vient des
       offres servies, pas d un nombre recopie ici. */
    expect(isins.size, "au moins les trente-cinq lignes du semis").toBeGreaterThanOrEqual(35);
    expect(o.length, "chaque ligne a sa seance").toBe(a.bulletins.length * isins.size);
    expect(o.filter((q) => q.trades > 0 || q.volumeTraded > 0).length, "aucune transaction au compartiment obligataire").toBe(0);
    const figees = [...isins].filter((isin) => o.filter((q) => q.isin === isin).every((q) => q.variationPct === 0));
    expect(figees.length, `${figees.length} lignes sur ${isins.size} n'ont pas bougé de l'année`).toBeGreaterThanOrEqual(18);
  });

  /**
   * LA CARTE ET SA PROPRE COURBE NE PEUVENT PAS SE CONTREDIRE.
   *
   * La valeur liquidative affichée sur la carte vient de l'offre ; la courbe
   * vient des VL. Si la série n'arrive pas sur le chiffre de la carte, les
   * deux se contredisent sur le même écran. Elle est donc construite à rebours
   * depuis ce chiffre.
   */
  it("fait finir chaque courbe sur la valeur que la carte affiche", async () => {
    const { REF_OFFERS } = await import("@/data/reference");
    const fonds = REF_OFFERS.filter((o) => o.kind === "FONDS" && o.fund);
    expect(fonds.length).toBe(45);
    const faux: string[] = [];
    for (const o of fonds) {
      const serie = a.navs.filter((n) => n.fundKey === o.fund!.key).sort((x, y) => x.navDate.localeCompare(y.navDate));
      const dernier = serie.at(-1);
      if (!dernier) faux.push(`${o.fund!.key} : aucune VL`);
      else if (dernier.nav !== o.fund!.nav || dernier.navDate !== o.fund!.navDate) faux.push(`${o.fund!.key} : ${dernier.nav} le ${dernier.navDate}, carte ${o.fund!.nav} le ${o.fund!.navDate}`);
      else if (serie.length < 12) faux.push(`${o.fund!.key} : ${serie.length} points, trop court pour une courbe`);
    }
    expect(faux.slice(0, 3), `${faux.length} fonds en désaccord avec leur carte`).toEqual([]);
  });

  it("espace les valeurs liquidatives comme le fonds l'annonce", async () => {
    const { REF_OFFERS } = await import("@/data/reference");
    const pas = { quotidienne: 1, hebdomadaire: 7, mensuelle: 30, trimestrielle: 91 } as Record<string, number>;
    const faux: string[] = [];
    for (const o of REF_OFFERS.filter((x) => x.kind === "FONDS" && x.fund)) {
      const serie = a.navs.filter((n) => n.fundKey === o.fund!.key).sort((x, y) => x.navDate.localeCompare(y.navDate));
      if (serie.length < 2) continue;
      const ecart = (Date.parse(serie[1].navDate) - Date.parse(serie[0].navDate)) / 86400e3;
      if (ecart !== (pas[o.fund!.frequency] ?? 7)) faux.push(`${o.fund!.key} : ${ecart} jours pour une VL ${o.fund!.frequency}`);
    }
    expect(faux.slice(0, 3)).toEqual([]);
  });
});
