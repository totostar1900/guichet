import { describe, expect, it } from "vitest";
import { linePerformance, movedOn, portfolioPerformance, xirr } from "@/lib/domain/performance";
import type { Intent, Offer } from "@/lib/domain/types";

/**
 * Un rendement remis à un épargnant doit être juste, ou ne pas être.
 *
 * C'est le seul chiffre de l'application que le client opposera à la maison, et
 * le seul qu'il ne peut pas vérifier lui-même. Les cas partent donc de séries
 * dont la réponse se calcule à la main, plutôt que de comparer le solveur à
 * lui-même : doubler son argent en un an fait 100 %, le récupérer intact fait
 * zéro, et un versement resté trois semaines ne pèse pas comme un versement
 * resté onze mois.
 */

const fonds: Offer = {
  id: "f1",
  kind: "FONDS",
  operation: "secondaire",
  country: "Cameroun",
  countryName: "Cameroun",
  issuer: "Corridor",
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
  fund: { nav: 10_000, navDate: "2026-12-31", manager: "CAM", depositary: "LCB", entryFeePct: 0, exitFeePct: 0, minAmount: 100_000, distributed: true } as Offer["fund"],
};
const ota: Offer = { ...fonds, id: "o1", kind: "OTA", title: "OTA 6,25 % 2031", isin: "CM1L", nominal: 10_000, couponRate: 6.25, settleOn: "2026-01-05", maturityOn: "2031-01-05", fund: undefined };

let n = 0;
const ordre = (over: Partial<Intent>): Intent => {
  n += 1;
  return {
    id: `i${n}`,
    ref: `PF-${n}`,
    offerId: "f1",
    offerVersion: 1,
    clientName: "Client",
    clientSegment: "particulier",
    type: "souscription",
    amount: 100_000,
    channel: "E-mail",
    state: "reglee",
    createdAt: "2026-01-05T09:00:00",
    updatedAt: "2026-01-05T09:00:00",
    ...over,
  };
};

describe("le taux qui annule les mouvements", () => {
  it("dit 100 % quand l'argent double en un an", () => {
    const r = xirr([
      { date: "2026-01-01", amount: -100_000, label: "" },
      { date: "2027-01-01", amount: 200_000, label: "" },
    ]);
    expect(r).toBeCloseTo(100, 1);
  });

  it("dit zéro quand on récupère exactement ce qu'on a mis", () => {
    const r = xirr([
      { date: "2026-01-01", amount: -100_000, label: "" },
      { date: "2027-01-01", amount: 100_000, label: "" },
    ]);
    expect(r).toBeCloseTo(0, 3);
  });

  it("dit une perte quand il en revient moins", () => {
    const r = xirr([
      { date: "2026-01-01", amount: -100_000, label: "" },
      { date: "2027-01-01", amount: 90_000, label: "" },
    ]);
    expect(r).toBeCloseTo(-10, 1);
  });

  it("pèse chaque versement par le temps où il a couru", () => {
    // Deux versements égaux, un an et un mois. Le gain de 10 000 sur le premier
    // seul ferait 10 % ; réparti sur les deux, le taux doit rester bien au-dessus
    // de 5 %, parce que le second n'a presque pas travaillé.
    const r = xirr([
      { date: "2026-01-01", amount: -100_000, label: "" },
      { date: "2026-12-01", amount: -100_000, label: "" },
      { date: "2027-01-01", amount: 210_000, label: "" },
    ]);
    expect(r).toBeGreaterThan(8);
    expect(r).toBeLessThan(11);
  });

  it("ne rend rien quand il n'y a pas de taux à trouver", () => {
    expect(xirr([])).toBeUndefined();
    expect(xirr([{ date: "2026-01-01", amount: -100_000, label: "" }])).toBeUndefined();
    // Que des sorties : aucun taux ne peut annuler cela.
    expect(
      xirr([
        { date: "2026-01-01", amount: -100_000, label: "" },
        { date: "2026-06-01", amount: -100_000, label: "" },
      ]),
    ).toBeUndefined();
  });
});

describe("la date où l'argent a bougé", () => {
  it("est le règlement publié sur le primaire, la mise à jour ailleurs", () => {
    expect(movedOn(ordre({ offerId: "o1" }), ota)).toBe("2026-01-05");
    expect(movedOn(ordre({ updatedAt: "2026-03-20T15:00:00" }), fonds)).toBe("2026-03-20");
  });
});

describe("la performance d'une ligne", () => {
  const total = (i: Intent) => i.amount ?? 0;

  it("compte ce qui est sorti, ce qui reste, et le gain", () => {
    const r = linePerformance(fonds, [ordre({ updatedAt: "2026-01-05T09:00:00" })], { units: 10, marketValue: 110_000, valuedOn: "2026-12-31", paid: [] }, total, "2027-01-05");
    expect(r?.line).toMatchObject({ invested: 100_000, returned: 0, valued: 110_000, gain: 10_000, due: 0, sold: false });
    expect(r?.line.rate).toBeCloseTo(10, 1);
  });

  it("compte un coupon échu comme revenu, et le signale comme échu", () => {
    const r = linePerformance(
      ota,
      [ordre({ offerId: "o1", type: "ferme", amount: 100_000 })],
      { units: 10, marketValue: 100_000, valuedOn: "2026-12-31", paid: [{ date: "2026-07-05", amount: 6_250, label: "Coupon" }] },
      total,
      "2027-01-05",
    );
    expect(r?.line).toMatchObject({ returned: 6_250, gain: 6_250, due: 1 });
  });

  it("marque la ligne dont des parts sont sorties", () => {
    const r = linePerformance(
      fonds,
      [ordre({ updatedAt: "2026-01-05T09:00:00" }), ordre({ type: "rachat", amount: 40_000, updatedAt: "2026-07-05T09:00:00" })],
      { units: 6, marketValue: 70_000, valuedOn: "2026-12-31", paid: [] },
      total,
      "2027-01-05",
    );
    expect(r?.line).toMatchObject({ invested: 100_000, returned: 40_000, valued: 70_000, gain: 10_000, sold: true });
  });

  it("ne rend rien sans ordre réglé sur la ligne", () => {
    expect(linePerformance(fonds, [ordre({ state: "confirmee" })], undefined, total, "2027-01-05")).toBeNull();
    expect(linePerformance(fonds, [ordre({ offerId: "autre" })], undefined, total, "2027-01-05")).toBeNull();
  });
});

describe("une ligne que personne ne cote", () => {
  const total = (i: Intent) => i.amount ?? 0;

  /**
   * Le mensonge le plus grave que ce rapport pourrait servir.
   *
   * Une obligation du primaire gardee jusqu au terme n a pas de cours. Comptee
   * a zero, elle affiche une perte egale a tout ce que le client y a mis : sur
   * les donnees de demonstration, moins quatre millions huit cent quatre-vingt-dix
   * mille francs qui n ont jamais ete perdus.
   */
  it("n est pas comptee comme perdue quand elle n a pas de cours", () => {
    const r = linePerformance(ota, [ordre({ offerId: "o1", type: "ferme", amount: 5_000_000 })], { units: 500, marketValue: undefined, paid: [] }, total, "2027-01-05");
    expect(r?.line.valuable).toBe(false);
    expect(r?.line.rate).toBeUndefined();
  });

  it("reste comptee quand tout en est sorti", () => {
    // Plus rien a valoriser : les mouvements racontent l histoire entiere.
    const r = linePerformance(
      fonds,
      [ordre({ updatedAt: "2026-01-05T09:00:00" }), ordre({ type: "rachat", amount: 110_000, updatedAt: "2027-01-05T09:00:00" })],
      { units: 0, marketValue: 0, paid: [] },
      total,
      "2027-01-05",
    );
    expect(r?.line.valuable).toBe(true);
    expect(r?.line.rate).toBeCloseTo(10, 1);
  });

  it("tient la ligne sans cours hors du total, et l annonce", () => {
    const bon = linePerformance(fonds, [ordre({ updatedAt: "2026-01-05T09:00:00" })], { units: 10, marketValue: 110_000, paid: [] }, total, "2027-01-05")!;
    const sansCours = linePerformance(ota, [ordre({ offerId: "o1", type: "ferme", amount: 5_000_000 })], { units: 500, marketValue: undefined, paid: [] }, total, "2027-01-05")!;
    const p = portfolioPerformance([bon, sansCours]);
    expect(p).toMatchObject({ invested: 100_000, gain: 10_000, unvalued: 1, unvaluedInvested: 5_000_000 });
    expect(p.rate).toBeCloseTo(10, 1);
    // Elle reste visible dans le tableau, derriere celles qu on sait valoriser.
    expect(p.lines).toHaveLength(2);
    expect(p.lines[1].valuable).toBe(false);
  });
});

describe("le portefeuille", () => {
  const total = (i: Intent) => i.amount ?? 0;

  it("additionne les francs et calcule un seul taux sur tous les mouvements", () => {
    const a = linePerformance(fonds, [ordre({ updatedAt: "2026-01-05T09:00:00" })], { units: 10, marketValue: 110_000, paid: [] }, total, "2027-01-05")!;
    const b = linePerformance(
      { ...fonds, id: "f2", title: "FCP Obligations" },
      [ordre({ offerId: "f2", amount: 50_000, updatedAt: "2026-01-05T09:00:00" })],
      { units: 5, marketValue: 45_000, paid: [] },
      total,
      "2027-01-05",
    )!;
    const p = portfolioPerformance([a, b]);
    expect(p).toMatchObject({ invested: 150_000, valued: 155_000, gain: 5_000, since: "2026-01-05" });
    // 150 000 placés un an qui valent 155 000 : le taux d'ensemble est proche de 3,3 %,
    // et surtout pas la moyenne de +10 % et -10 %.
    expect(p.rate).toBeCloseTo(3.33, 1);
    // La ligne qui a le plus rapporté passe devant.
    expect(p.lines[0].offerId).toBe("f1");
  });

  it("ne rend aucun taux sur un portefeuille vide", () => {
    expect(portfolioPerformance([]).rate).toBeUndefined();
  });
});
