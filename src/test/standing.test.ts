import { describe, expect, it } from "vitest";
import { isDue, nextRun, recurringMinimum, standingBlock, type StandingOrder } from "@/lib/domain/standing";
import type { Offer } from "@/lib/domain/types";

/**
 * Une instruction permanente doit être calculable par un tiers.
 *
 * C'est la condition réglementaire, pas une élégance : si le prochain versement
 * dépendait d'un jugement du desk, la maison gérerait au lieu d'exécuter, et
 * elle n'a pas cet agrément. Ces cas fixent donc tout ce qui décide du prochain
 * versement, et surtout les deux fautes qui coûteraient cher : sauter un mois,
 * et en servir deux.
 */

const fonds: Offer = {
  id: "f1",
  kind: "FONDS",
  operation: "secondaire",
  country: "Cameroun",
  countryName: "Cameroun",
  issuer: "Corridor Asset Management",
  title: "FCP Trésorerie",
  isin: "CMF1",
  status: "published",
  blurb: "",
  documents: [],
  opensAt: "2026-01-01T09:00:00",
  deadlineAt: "2099-12-31T17:00:00",
  settleOn: "2026-01-05",
  lastCouponOn: null,
  nominal: 0,
  commissionPct: 0,
  version: 1,
  fund: { nav: 10_500, navDate: "2026-09-20", manager: "CAM", depositary: "LCB", entryFeePct: 1, exitFeePct: 0, minAmount: 100_000, distributed: true } as Offer["fund"],
};

const ordre = (over: Partial<StandingOrder> = {}): StandingOrder => ({
  id: "s1",
  ref: "EP-0001",
  userId: "u1",
  clientName: "Client",
  clientSegment: "particulier",
  offerId: "f1",
  amount: 100_000,
  dayOfMonth: 5,
  startsOn: "2026-01-05",
  state: "active",
  onBlocked: "passer",
  channel: "E-mail",
  createdAt: "2026-01-01T09:00:00",
  updatedAt: "2026-01-01T09:00:00",
  ...over,
});

describe("ce qui empêche une instruction", () => {
  it("laisse passer un versement ordinaire", () => {
    expect(standingBlock(fonds, { amount: 100_000, dayOfMonth: 5, startsOn: "2026-10-05" })).toEqual([]);
  });

  it("refuse une destination qui n'est pas un fonds ouvert", () => {
    expect(standingBlock(undefined, { amount: 100_000, dayOfMonth: 5, startsOn: "2026-10-05" })).toContain("La destination est introuvable.");
    expect(standingBlock({ ...fonds, kind: "OTA" }, { amount: 100_000, dayOfMonth: 5, startsOn: "2026-10-05" })).toContain("Un versement programmé va vers un fonds.");
    expect(standingBlock({ ...fonds, fund: { ...fonds.fund!, distributed: false } }, { amount: 100_000, dayOfMonth: 5, startsOn: "2026-10-05" })).toContain("Ce fonds n'est pas ouvert à la souscription.");
  });

  it("refuse un jour qui n'existe pas tous les mois", () => {
    const bad = "Le jour du versement va du 1 au 28 : tous les mois ont ces jours-là.";
    expect(standingBlock(fonds, { amount: 100_000, dayOfMonth: 31, startsOn: "2026-10-05" })).toContain(bad);
    expect(standingBlock(fonds, { amount: 100_000, dayOfMonth: 0, startsOn: "2026-10-05" })).toContain(bad);
    expect(standingBlock(fonds, { amount: 100_000, dayOfMonth: 28, startsOn: "2026-10-05" })).toEqual([]);
  });

  it("refuse un versement sous le minimum du fonds, et nomme le chiffre", () => {
    // « 100 000 » sort de la locale française, qui sépare les milliers par une
    // espace fine insécable : on normalise les espaces avant de comparer.
    const dit = standingBlock(fonds, { amount: 25_000, dayOfMonth: 5, startsOn: "2026-10-05" })[0].replace(/[\s  ]+/g, " ");
    expect(dit).toBe("Le versement minimum sur ce fonds est de 100 000 FCFA.");
  });

  it("applique le minimum récurrent quand le desk l'a négocié", () => {
    const negocie = { ...fonds, fund: { ...fonds.fund!, minRecurring: 25_000 } };
    expect(recurringMinimum(fonds)).toBe(100_000);
    expect(recurringMinimum(negocie)).toBe(25_000);
    expect(standingBlock(negocie, { amount: 25_000, dayOfMonth: 5, startsOn: "2026-10-05" })).toEqual([]);
  });

  it("refuse une fin avant le départ", () => {
    expect(standingBlock(fonds, { amount: 100_000, dayOfMonth: 5, startsOn: "2026-10-05", endsOn: "2026-09-05" })).toContain("La fin ne peut pas précéder le départ.");
  });
});

describe("le versement dû", () => {
  it("est dû le jour dit, et pas avant", () => {
    expect(isDue(ordre(), "2026-01-04")).toBe(false);
    expect(isDue(ordre(), "2026-01-05")).toBe(true);
  });

  it("rattrape un jour manqué, sans servir deux fois le même mois", () => {
    // Le robot n'a pas tourné le 5 : le 9, le versement est toujours dû.
    expect(isDue(ordre(), "2026-01-09")).toBe(true);
    // Une fois servi, plus rien avant le mois suivant.
    const servi = ordre({ lastRunOn: "2026-01-09" });
    expect(isDue(servi, "2026-01-28")).toBe(false);
    expect(isDue(servi, "2026-02-05")).toBe(true);
  });

  it("ne part pas avant le départ ni après la fin", () => {
    expect(isDue(ordre({ startsOn: "2026-03-05" }), "2026-02-05")).toBe(false);
    expect(isDue(ordre({ endsOn: "2026-02-28" }), "2026-03-05")).toBe(false);
  });

  it("ne part pas quand l'instruction ne court plus", () => {
    for (const state of ["suspendue", "terminee", "annulee"] as const) {
      expect(isDue(ordre({ state }), "2026-01-05")).toBe(false);
    }
  });
});

describe("la date annoncée au client", () => {
  it("annonce ce mois-ci tant que le jour n'est pas passé", () => {
    expect(nextRun(ordre(), "2026-03-01")).toBe("2026-03-05");
    expect(nextRun(ordre(), "2026-03-05")).toBe("2026-03-05");
  });

  it("annonce le mois suivant une fois le versement fait", () => {
    expect(nextRun(ordre({ lastRunOn: "2026-03-05" }), "2026-03-06")).toBe("2026-04-05");
  });

  it("passe l'année sans se tromper de mois", () => {
    expect(nextRun(ordre({ dayOfMonth: 5, lastRunOn: "2026-12-05" }), "2026-12-20")).toBe("2027-01-05");
  });

  it("n'annonce rien au-delà de la fin, ni sur une instruction arrêtée", () => {
    expect(nextRun(ordre({ endsOn: "2026-03-31", lastRunOn: "2026-03-05" }), "2026-03-10")).toBeNull();
    expect(nextRun(ordre({ state: "annulee" }), "2026-03-01")).toBeNull();
  });

  it("annonce le départ quand il est encore devant", () => {
    expect(nextRun(ordre({ startsOn: "2026-06-05" }), "2026-01-01")).toBe("2026-06-05");
  });
});
