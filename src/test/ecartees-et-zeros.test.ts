import { describe, expect, it } from "vitest";
import { aUnPrixDExecution, compteDansLesResultats, etatSeance, MOTIFS_ECART, type AuctionResult } from "@/lib/market/auction-results";
import { buildCurve } from "@/lib/market/curve";
import { anomalies } from "@/lib/market/anomalies";
import { pressureByYear } from "@/lib/market/auction-stats";

/**
 * Deux façons de ne pas compter, et elles ne se ressemblent pas.
 *
 * UNE PIÈCE ÉCARTÉE n'aurait jamais dû être là : un avis d'annonce entré dans
 * la table des résultats. Une personne le constate, avec un motif, et la pièce
 * quitte tout : la file de relecture, les analyses, la courbe.
 *
 * UNE SÉANCE SERVIE À ZÉRO doit être là : c'est un vrai résultat, publié par
 * son Trésor, et il dit quelque chose sur la demande. C'est son PRIX qui
 * n'existe pas, le Trésor ayant refusé les offres. Elle ne donne donc pas de
 * point de courbe, et elle reste dans tous les comptes de volume.
 *
 * Confondre les deux coûterait dans les deux sens : écarter une adjudication
 * déserte embellirait la couverture de l'année, et tracer son taux publierait
 * un prix que personne n'a payé.
 */

const seance = (over: Partial<AuctionResult> = {}): AuctionResult =>
  ({
    id: over.id ?? "s1",
    codeEmission: "CM1200000001",
    country: "Cameroun",
    instrument: "BTA",
    tenor: "26 semaines",
    sessionOn: "2026-06-10",
    abondement: false,
    announced: 20_000_000_000,
    bid: 25_000_000_000,
    served: 20_000_000_000,
    bidders: 6,
    rateAvg: 5.5,
    maturityOn: "2026-12-10",
    coverage: 1.25,
    sourceUrl: "https://exemple/communiqué.pdf",
    sourceTitle: "Communiqué des résultats",
    confirmedBy: "Desk",
    confirmedAt: "2026-06-11T09:00:00Z",
    createdAt: "2026-06-11T09:00:00Z",
    updatedAt: "2026-06-11T09:00:00Z",
    ...over,
  }) as AuctionResult;

const ecartee = (over: Partial<AuctionResult> = {}) =>
  seance({ setAsideReason: "avis d'annonce, pas un résultat", setAsideBy: "Desk", setAsideAt: "2026-09-29T10:00:00Z", ...over });

describe("une pièce écartée ne compte nulle part", () => {
  it("quitte les résultats, quel que soit son état de lecture", () => {
    expect(compteDansLesResultats(seance())).toBe(true);
    expect(compteDansLesResultats(ecartee())).toBe(false);
    expect(compteDansLesResultats(ecartee({ confirmedBy: undefined }))).toBe(false);
  });

  it("prend un état à elle, qui précède les trois autres", () => {
    /* Une écartée n'est ni à lire, ni à relire, ni relue : une pièce qui n'est
       pas un résultat n'a pas d'état de lecture, elle est rangée. */
    expect(etatSeance(seance())).toBe("relue");
    expect(etatSeance(ecartee())).toBe("ecartee");
    expect(etatSeance(ecartee({ confirmedBy: "Desk" }))).toBe("ecartee");
  });

  it("ne donne aucun point de courbe", () => {
    const avec = buildCurve([seance()], { on: "2026-06-20", windowDays: 365 });
    const sans = buildCurve([ecartee()], { on: "2026-06-20", windowDays: 365 });
    expect(avec.countries[0]?.points).toHaveLength(1);
    expect(sans.countries).toHaveLength(0);
  });

  it("ne laisse pas non plus de trou nommé : elle n'a jamais eu à en donner", () => {
    /* Un trou dit « cette séance aurait dû donner un point ». Une pièce qui
       n'est pas un résultat n'aurait rien dû donner du tout. */
    expect(buildCurve([ecartee()], { on: "2026-06-20", windowDays: 365 }).gaps).toEqual([]);
  });

  it("garde un motif pris dans une liste fermée", () => {
    expect(MOTIFS_ECART).toContain("avis d'annonce, pas un résultat");
    /**
     * Un motif se suffit à lui-même, SAUF « autre ».
     *
     * La règle d'origine voulait qu'aucun motif ne soit un haussement
     * d'épaules : huit lettres au moins, donc une phrase. « autre » la viole
     * exprès, et c'est le prix d'une liste honnête : sans lui, qui ne trouve
     * pas son cas choisit le motif le plus proche, et le registre se met à
     * mentir poliment.
     *
     * Ce qui le rachète vit ailleurs et doit y rester : sa précision est
     * obligatoire, à l'écran comme dans l'action qui écrit. C'est la seule
     * exception, et elle est nommée ici pour qu'une deuxième ne s'ajoute pas
     * en silence.
     */
    expect(MOTIFS_ECART.filter((m) => m.length <= 8)).toEqual(["autre"]);
  });
});

describe("une séance servie à zéro reste un résultat, sans prix", () => {
  const deserte = seance({ id: "d1", bid: 0, served: 0, bidders: 0, rateAvg: undefined, coverage: 0 });
  const refusee = seance({ id: "r1", bid: 153_000_000, served: 0, bidders: 4, rateAvg: 6.85, coverage: 0.015 });

  it("est reconnue sans que personne ait rien à poser", () => {
    expect(aUnPrixDExecution(seance())).toBe(true);
    expect(aUnPrixDExecution(deserte)).toBe(false);
    expect(aUnPrixDExecution(refusee)).toBe(false);
  });

  it("ne donne pas de point, même quand elle porte encore un taux", () => {
    /* C'est le cas qui était passé inaperçu : servi zéro, et pourtant un taux
       moyen de 6,85 % d'où sortait un point de courbe. */
    const c = buildCurve([refusee], { on: "2026-06-20", windowDays: 365 });
    expect(c.countries).toHaveLength(0);
  });

  it("laisse un trou nommé, et nomme lequel des deux", () => {
    const refus = buildCurve([refusee], { on: "2026-06-20", windowDays: 365 }).gaps;
    expect(refus).toHaveLength(1);
    expect(refus[0].why).toMatch(/le Trésor a refusé les offres/);
    const desert = buildCurve([deserte], { on: "2026-06-20", windowDays: 365 }).gaps;
    expect(desert[0].why).toMatch(/personne n'a soumis/);
  });

  it("compte toujours dans la pression de la demande", () => {
    /* La retirer embellirait l'année : mesuré sur le dépôt, la couverture de
       2025 passerait de 0,67 à 0,72. Une adjudication déserte est un fait sur
       la demande. */
    const avec = pressureByYear([seance(), deserte]);
    const sans = pressureByYear([seance()]);
    expect(avec[0].n).toBe(2);
    expect(sans[0].n).toBe(1);
    expect(avec[0].coverage).toBeLessThan(sans[0].coverage);
  });

  it("n'est pas écartée pour autant", () => {
    expect(compteDansLesResultats(deserte)).toBe(true);
    expect(etatSeance(refusee)).toBe("relue");
  });
});

describe("le crible signale un prix sans attribution", () => {
  it("attrape une séance servie à zéro qui publie quand même un taux", () => {
    const a = anomalies([seance({ served: 0, bid: 153_000_000, bidders: 4, rateAvg: 6.85 })]);
    expect(a.some((x) => /aucun titre servi, et pourtant un prix publié/.test(x.quoi.key))).toBe(true);
  });

  it("se tait sur une adjudication déserte, qui ne se contredit pas", () => {
    /* Rien servi et aucun prix : c'est cohérent, et un panneau qui crie sans
       motif cesse d'être lu. */
    const a = anomalies([seance({ served: 0, bid: 0, bidders: 0, rateAvg: undefined, rateLimit: undefined, priceAvg: undefined, priceLimit: undefined, yieldAvg: undefined })]);
    expect(a.some((x) => /aucun titre servi/.test(x.quoi.key))).toBe(false);
  });

  it("se tait sur une séance ordinaire", () => {
    expect(anomalies([seance()]).some((x) => /aucun titre servi/.test(x.quoi.key))).toBe(false);
  });
});
