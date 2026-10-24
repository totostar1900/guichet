import { describe, expect, it } from "vitest";
import { fluxAVenir, prochainFlux, upcomingFlows, type Position } from "@/lib/positions";

/**
 * LES FLUX À VENIR, DU PLUS PROCHE AU PLUS LOINTAIN.
 *
 * L'ordre n'était pas garanti, et pas par accident : la liste se construit
 * position par position, donc le deuxième coupon d'une ligne passait avant le
 * premier d'une autre. Le desk affichait « les flux des trente jours » dans
 * cet ordre-là, c'est-à-dire dans aucun — et une liste de dates qui ne monte
 * pas se lit comme une liste incomplète.
 *
 * Le défaut ne se voit qu'avec DEUX lignes portant chacune DEUX flux : c'est
 * exactement le cas que monte cette épreuve, et c'est pourquoi il n'avait été
 * vu par personne.
 */
const AUJOURD_HUI = new Date("2026-10-24T09:00:00Z");

const ligne = (id: string, dates: string[]): Position =>
  ({
    intent: { id: `i-${id}` },
    offer: { id, title: `Ligne ${id}` },
    flows: dates.map((date, n) => ({ date, amount: 1000 + n, label: "Coupon" })),
    nextFlow: { date: dates[0], amount: 1000, label: "Coupon" },
  }) as unknown as Position;

describe("les flux à venir", () => {
  it("monte dans le temps, à travers les lignes", () => {
    const a = ligne("a", ["2026-11-01", "2027-05-01"]);
    const b = ligne("b", ["2026-12-01", "2027-02-01"]);
    expect(fluxAVenir([a, b], AUJOURD_HUI).map((x) => x.flow.date)).toEqual(["2026-11-01", "2026-12-01", "2027-02-01", "2027-05-01"]);
  });

  it("écarte ce qui est passé", () => {
    const a = ligne("a", ["2026-10-01", "2026-11-01"]);
    expect(fluxAVenir([a], AUJOURD_HUI).map((x) => x.flow.date)).toEqual(["2026-11-01"]);
  });

  it("borne la fenêtre sans perdre l'ordre", () => {
    const a = ligne("a", ["2026-11-01", "2027-05-01"]);
    const b = ligne("b", ["2026-10-28"]);
    const trente = upcomingFlows([a, b], 30, AUJOURD_HUI);
    expect(trente.map((x) => x.flow.date), "la fenêtre de trente jours a changé de contenu ou d'ordre").toEqual(["2026-10-28", "2026-11-01"]);
  });

  /* LE PROCHAIN FLUX PORTE SA NATURE ET SON MONTANT, et c'est tout l'intérêt :
     la page d'arrivée n'en gardait que la date. */
  it("rend le plus proche, avec ce qu'il est et ce qu'il vaut", () => {
    const a = ligne("a", ["2027-05-01"]);
    const b = ligne("b", ["2026-11-01"]);
    const p = prochainFlux([a, b], AUJOURD_HUI);
    expect(p?.flow.date).toBe("2026-11-01");
    expect(p?.position.offer.title).toBe("Ligne b");
    expect(p?.flow.amount).toBe(1000);
    expect(p?.flow.label).toBe("Coupon");
  });

  it("ne rend rien quand plus rien ne tombe", () => {
    expect(prochainFlux([ligne("a", ["2026-10-01"])], AUJOURD_HUI)).toBeUndefined();
    expect(prochainFlux([], AUJOURD_HUI)).toBeUndefined();
  });
});
