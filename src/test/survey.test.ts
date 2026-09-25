import { describe, expect, it } from "vitest";
import { demandLadder, surveyLimitBlock, surveyUnit } from "@/lib/domain/survey";
import type { Intent, Offer } from "@/lib/domain/types";

/**
 * L'échelle se porte à un émetteur : elle doit être juste dans les deux sens.
 *
 * Un prix se compare vers le haut, un taux vers le bas, et se tromper de sens
 * ferait annoncer comme la meilleure demande celle qui sert l'émetteur le moins
 * bien. C'est l'erreur que ces cas rendent impossible à commettre en silence.
 */

const ota: Offer = {
  id: "o1",
  kind: "OTA",
  operation: "nouvelle_ligne",
  country: "Cameroun",
  countryName: "Cameroun",
  issuer: "État du Cameroun",
  title: "OTA 6,25 % 2031",
  isin: "CM1L",
  status: "published",
  blurb: "",
  documents: [],
  opensAt: "2026-09-01T09:00:00",
  deadlineAt: "2026-10-30T12:00:00",
  settleOn: "2026-11-02",
  maturityOn: "2031-11-02",
  lastCouponOn: null,
  nominal: 10_000,
  couponRate: 6.25,
  pricePct: 97,
  commissionPct: 0.5,
  version: 1,
};
const bta: Offer = { ...ota, id: "b1", kind: "BTA", couponRate: undefined, precountRate: 5.5, nominal: 1_000_000, maturityOn: "2027-09-16" };

let n = 0;
const ask = (over: Partial<Intent>): Intent => {
  n += 1;
  return {
    id: `i${n}`,
    ref: `AP-${n}`,
    offerId: "o1",
    offerVersion: 1,
    clientName: `Client ${n}`,
    clientSegment: "particulier",
    type: "appetit",
    amount: 10_000_000,
    channel: "WhatsApp",
    state: "recue",
    createdAt: "2026-09-10T09:00:00",
    updatedAt: "2026-09-10T09:00:00",
    ...over,
  };
};

describe("le sens de la condition", () => {
  it("se lit en prix sur un OTA, en taux sur un BTA", () => {
    expect(surveyUnit(ota)).toBe("prix");
    expect(surveyUnit(bta)).toBe("taux");
  });

  it("écarte la faute de frappe, pas l'opinion", () => {
    expect(surveyLimitBlock(ota, 97)).toBeNull();
    expect(surveyLimitBlock(ota, 9)).toMatch(/pourcentage du nominal/);
    expect(surveyLimitBlock(bta, 6.5)).toBeNull();
    expect(surveyLimitBlock(bta, 65)).toMatch(/faute de frappe/);
    expect(surveyLimitBlock(ota, 0)).toMatch(/nombre positif/);
  });
});

describe("l'échelle de la demande", () => {
  it("cumule un prix vers le haut : le mieux servi d'abord", () => {
    const l = demandLadder([ask({ limitPrice: 99, amount: 5_000_000 }), ask({ limitPrice: 97, amount: 10_000_000 }), ask({ limitPrice: 95, amount: 20_000_000 })], ota);
    expect(l.rows.map((r) => r.limit)).toEqual([99, 97, 95]);
    expect(l.rows.map((r) => r.soft)).toEqual([5_000_000, 15_000_000, 35_000_000]);
    expect(l.soft).toBe(35_000_000);
  });

  it("cumule un taux vers le bas : un taux plus bas sert mieux l'émetteur", () => {
    const l = demandLadder(
      [ask({ offerId: "b1", limitPrice: 5, amount: 5_000_000 }), ask({ offerId: "b1", limitPrice: 6, amount: 10_000_000 }), ask({ offerId: "b1", limitPrice: 7, amount: 20_000_000 })],
      bta,
    );
    expect(l.rows.map((r) => r.limit)).toEqual([5, 6, 7]);
    expect(l.rows.map((r) => r.soft)).toEqual([5_000_000, 15_000_000, 35_000_000]);
  });

  it("sépare le ferme de l'appétit à chaque palier", () => {
    const l = demandLadder([ask({ type: "ferme", limitPrice: 98, amount: 8_000_000 }), ask({ type: "appetit", limitPrice: 96, amount: 12_000_000 })], ota);
    expect(l.rows[0]).toMatchObject({ limit: 98, firm: 8_000_000, soft: 0, orders: 1 });
    expect(l.rows[1]).toMatchObject({ limit: 96, firm: 8_000_000, soft: 12_000_000, orders: 2 });
    expect(l.firm).toBe(8_000_000);
    expect(l.soft).toBe(12_000_000);
  });

  it("met les demandes sans condition en tête, et les compte à tous les paliers", () => {
    const l = demandLadder([ask({ amount: 3_000_000 }), ask({ limitPrice: 97, amount: 10_000_000 })], ota);
    expect(l.unconditional).toBe(3_000_000);
    expect(l.rows[0]).toMatchObject({ limit: null, soft: 3_000_000 });
    // Une demande sans condition tient à n'importe quel prix : elle est dans le palier suivant aussi.
    expect(l.rows[1]).toMatchObject({ limit: 97, soft: 13_000_000, orders: 2 });
  });

  it("n'invente aucun palier que personne n'a posé", () => {
    const l = demandLadder([ask({ limitPrice: 97 })], ota);
    expect(l.rows).toHaveLength(1);
  });

  it("ne compte ni le passé, ni l'annulé, ni ce qui n'est pas une demande", () => {
    const hors = [
      ask({ state: "servie", limitPrice: 97 }),
      ask({ state: "non_servie", limitPrice: 97 }),
      ask({ state: "annulee", limitPrice: 97 }),
      ask({ state: "contre_proposee", limitPrice: 97 }),
      ask({ type: "info", limitPrice: 97 }),
      ask({ type: "rappel", limitPrice: 97 }),
      ask({ amount: 0, limitPrice: 97 }),
      ask({ offerId: "autre", limitPrice: 97 }),
    ];
    const l = demandLadder(hors, ota);
    expect(l).toMatchObject({ rows: [], firm: 0, soft: 0, orders: 0 });
  });

  it("compte une demande déjà transmise : elle tient toujours", () => {
    const l = demandLadder([ask({ state: "transmise", type: "ferme", limitPrice: 97, amount: 4_000_000 })], ota);
    expect(l.firm).toBe(4_000_000);
  });
});
