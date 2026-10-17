import { describe, expect, it } from "vitest";
import { auctionYield, limiteDeduite, priceOf, yieldMissing } from "@/lib/market/yield";

/**
 * LE LIMITE QUE LA PIÈCE N'ÉCRIT PAS.
 *
 * Le Trésor du Tchad publie les deux bornes du carnet et rien d'autre : ni
 * limite, ni moyen pondéré. Deux configurations le déterminent quand même, par
 * identité et non par estimation, et c'est tout ce que la déduction s'autorise.
 *
 * Les cas de refus comptent autant que les cas d'acceptation : une déduction
 * qui accepterait une séance servie à moitié inventerait un nombre, et un
 * nombre inventé ne se distingue plus d'un nombre lu une fois rangé.
 */

const bon = {
  instrument: "BTA" as const,
  tenor: "26 semaines",
  sessionOn: "2024-01-17",
  maturityOn: "2024-07-19",
  yieldAvg: undefined,
  yieldLimit: undefined,
  rateAvg: undefined,
  rateLimit: undefined,
  priceAvg: undefined,
  priceLimit: undefined,
  priceAvgFcfa: undefined,
  priceMin: undefined,
  priceMax: undefined,
  couponRate: undefined,
};

describe("limiteDeduite", () => {
  it("prend le carnet plat pour ce qu'il est : un seul prix servi", () => {
    const d = limiteDeduite({ instrument: "BTA", rateMin: 6.5, rateMax: 6.5, bid: 30_280_000_000, served: 15_000_000_000 });
    expect(d?.pct).toBe(6.5);
    expect(d?.assumed.key).toContain("carnet plat");
  });

  it("retient le PIRE taux quand tout a été servi, soit le plus haut", () => {
    const d = limiteDeduite({ instrument: "BTA", rateMin: 6.5, rateMax: 6.75, bid: 5_063_000_000, served: 5_063_000_000 });
    expect(d?.pct).toBe(6.75);
    expect(d?.assumed.key).toContain("tout a été servi");
  });

  it("retient le PIRE prix quand tout a été servi, soit le plus bas", () => {
    const d = limiteDeduite({ instrument: "OTA", priceMin: 90, priceMax: 91, bid: 14_187_000_000, served: 14_187_000_000 });
    expect(d?.pct).toBe(90);
  });

  it("refuse une séance servie partiellement : le limite est entre les bornes et la pièce ne le dit pas", () => {
    expect(limiteDeduite({ instrument: "BTA", rateMin: 6.5, rateMax: 7, bid: 26_900_000_000, served: 15_000_000_000 })).toBeUndefined();
  });

  it("refuse quand une borne manque", () => {
    expect(limiteDeduite({ instrument: "BTA", rateMin: 6.5, bid: 5_000_000_000, served: 5_000_000_000 })).toBeUndefined();
  });

  it("tolère l'arrondi au million, les montants étant imprimés en millions", () => {
    expect(limiteDeduite({ instrument: "BTA", rateMin: 6, rateMax: 6.5, bid: 5_063_000_000, served: 5_062_400_000 })?.pct).toBe(6.5);
    expect(limiteDeduite({ instrument: "BTA", rateMin: 6, rateMax: 6.5, bid: 7_810_000_000, served: 7_800_000_000 })).toBeUndefined();
  });
});

describe("le Tchad entre dans la courbe, en le disant", () => {
  it("donne un rendement à un bon qui ne porte que ses bornes", () => {
    const y = auctionYield({ ...bon, rateMin: 6.5, rateMax: 6.75, bid: 5_063_000_000, served: 5_063_000_000 });
    expect(y).toBeDefined();
    expect(y?.assumptions.some((a) => a.key.includes("tout a été servi"))).toBe(true);
  });

  it("n'en donne pas à une séance servie partiellement, et dit pourquoi", () => {
    const r = { ...bon, rateMin: 6.5, rateMax: 7, bid: 26_900_000_000, served: 15_000_000_000 };
    expect(auctionYield(r)).toBeUndefined();
    expect(yieldMissing(r)).toContain("ne publie que les bornes du carnet");
  });

  it("ne touche à rien quand le Trésor imprime son taux", () => {
    const y = auctionYield({ ...bon, rateAvg: 6.1, rateMin: 6.5, rateMax: 6.75, bid: 5_063_000_000, served: 5_063_000_000 });
    expect(y?.assumptions.some((a) => a.key.includes("tout a été servi"))).toBe(false);
  });

  it("laisse passer le prix moyen imprimé avant toute déduction", () => {
    const p = priceOf({ priceAvg: 92.5, priceLimit: undefined, priceAvgFcfa: undefined, priceMin: 90, priceMax: 95, bid: 10, served: 10 });
    expect(p?.pct).toBe(92.5);
    expect(p?.assumed).toBeUndefined();
  });
});
