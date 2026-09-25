import { describe, expect, it } from "vitest";
import { crossCheck, crossOrder, crossings, facingSignal, matchLine, CROSS_CLOSED, type CrossOrder, type CrossPolicy } from "@/lib/domain/crossing";
import type { Intent, Offer } from "@/lib/domain/types";

/**
 * L'appariement doit être prévisible avant d'être utile.
 *
 * Deux clients de la maison se partagent une quantité de titres, et l'ordre du
 * service décide lequel des deux est servi quand il n'y en a pas pour tout le
 * monde. Une règle qu'on ne peut pas rejouer à l'identique n'est pas une règle :
 * c'est un arbitrage, et le desk aurait à le défendre client par client. D'où
 * ces cas, qui fixent le prix d'abord, l'ancienneté ensuite, et rien d'autre.
 */

const line: Offer = {
  id: "m1",
  kind: "MARCHE",
  operation: "secondaire",
  instrument: "obligation",
  country: "Cameroun",
  countryName: "Cameroun",
  issuer: "État du Cameroun",
  title: "ECMR 7,25 % 2031",
  isin: "CM1L",
  status: "published",
  blurb: "",
  documents: [],
  opensAt: "2026-09-01T09:00:00",
  deadlineAt: "2026-12-31T12:00:00",
  settleOn: "2026-10-02",
  maturityOn: "2031-10-02",
  lastCouponOn: null,
  nominal: 10_000,
  couponRate: 7.25,
  commissionPct: 0.5,
  lastPrice: 97,
  lotSize: 1,
  version: 1,
};

let n = 0;
const order = (side: "achat" | "vente", qty: number, limit: number | null, at = `2026-09-0${(n % 9) + 1}T09:00:00`): CrossOrder => {
  n += 1;
  return { id: `i${n}`, ref: `PF-000${n}`, clientName: `Client ${n}`, side, qty, limit, state: "confirmee", at };
};

const intent = (over: Partial<Intent>): Intent => ({
  id: "x",
  ref: "PF-0001",
  offerId: "m1",
  offerVersion: 1,
  clientName: "Client",
  clientSegment: "particulier",
  type: "achat",
  amount: 100,
  channel: "WhatsApp",
  state: "confirmee",
  createdAt: "2026-09-01T09:00:00",
  updatedAt: "2026-09-01T09:00:00",
  ...over,
});

describe("l'ordre tel que l'appariement le lit", () => {
  it("ne retient qu'un achat ou une vente vivants sur une ligne cotée", () => {
    expect(crossOrder(intent({}), line)).not.toBeNull();
    expect(crossOrder(intent({ type: "vente" }), line)).not.toBeNull();
    expect(crossOrder(intent({ state: "recue" }), line)).not.toBeNull();
    // Transmis, servi, annulé : l'ordre a quitté le carnet.
    expect(crossOrder(intent({ state: "transmise" }), line)).toBeNull();
    expect(crossOrder(intent({ state: "annulee" }), line)).toBeNull();
    // Une contre-proposition n'est pas un ordre : sans le oui du client, ses conditions ne valent rien.
    expect(crossOrder(intent({ state: "contre_proposee" }), line)).toBeNull();
    expect(crossOrder(intent({ type: "info" }), line)).toBeNull();
    expect(crossOrder(intent({ amount: 0 }), line)).toBeNull();
  });

  it("ne retient pas une ligne qui n'est pas cotée, ni une ligne masquée", () => {
    expect(crossOrder(intent({}), { ...line, kind: "OTA" })).toBeNull();
    expect(crossOrder(intent({}), { ...line, hidden: true })).toBeNull();
  });

  it("lit « au marché » comme l'absence de limite, jamais comme un zéro", () => {
    expect(crossOrder(intent({ limitPrice: null }), line)?.limit).toBeNull();
    expect(crossOrder(intent({ limitPrice: 0 }), line)?.limit).toBeNull();
    expect(crossOrder(intent({ limitPrice: 96 }), line)?.limit).toBe(96);
  });
});

describe("l'appariement d'une ligne", () => {
  it("apparie deux ordres qui se répondent, pour ce qu'ils ont en commun", () => {
    const r = matchLine([order("achat", 100, 97), order("vente", 40, 96)]);
    expect(r.crosses).toHaveLength(1);
    expect(r.crosses[0].qty).toBe(40);
    expect(r.restBuy).toBe(60);
    expect(r.restSell).toBe(0);
    expect(r.qty).toBe(40);
  });

  it("n'apparie rien quand le vendeur demande plus que l'acheteur ne donne", () => {
    const r = matchLine([order("achat", 100, 95), order("vente", 100, 97)]);
    expect(r.crosses).toEqual([]);
    expect(r.restBuy).toBe(100);
    expect(r.restSell).toBe(100);
  });

  it("apparie toujours un ordre au marché : il ne pose aucune condition de prix", () => {
    const r = matchLine([order("achat", 50, null), order("vente", 50, 99)]);
    expect(r.crosses).toHaveLength(1);
    // La bande n'a qu'une borne énoncée, et c'est elle qui tient.
    expect(r.crosses[0].low).toBe(99);
    expect(r.crosses[0].high).toBeNull();
    expect(r.crosses[0].mid).toBe(99);
  });

  it("laisse la bande vide quand les deux sont au marché", () => {
    const r = matchLine([order("achat", 10, null), order("vente", 10, null)]);
    expect(r.crosses[0].mid).toBeNull();
  });

  it("partage l'écart en deux quand les deux ont posé une limite", () => {
    const r = matchLine([order("achat", 10, 98), order("vente", 10, 96)]);
    expect(r.crosses[0]).toMatchObject({ low: 96, high: 98, mid: 97 });
  });

  it("sert le meilleur prix d'abord", () => {
    const petit = order("achat", 10, 96);
    const gros = order("achat", 10, 98);
    const r = matchLine([petit, gros, order("vente", 10, 95)]);
    expect(r.crosses).toHaveLength(1);
    expect(r.crosses[0].buy.id).toBe(gros.id);
  });

  it("sert le plus ancien à prix égal", () => {
    const tard = order("achat", 10, 97, "2026-09-05T09:00:00");
    const tot = order("achat", 10, 97, "2026-09-02T09:00:00");
    const r = matchLine([tard, tot, order("vente", 10, 95)]);
    expect(r.crosses[0].buy.id).toBe(tot.id);
  });

  it("répartit un gros ordre sur plusieurs contreparties", () => {
    const r = matchLine([order("achat", 100, 98), order("vente", 30, 95), order("vente", 50, 96)]);
    expect(r.crosses.map((c) => c.qty)).toEqual([30, 50]);
    expect(r.restBuy).toBe(20);
    expect(r.restSell).toBe(0);
  });

  it("s'arrête dès que les deux meilleurs ne se répondent plus", () => {
    // Le deuxième vendeur est plus cher que le premier : si le premier ne passe
    // pas, aucun de ceux qui le suivent ne passera.
    const r = matchLine([order("achat", 100, 94), order("vente", 10, 95), order("vente", 10, 99)]);
    expect(r.crosses).toEqual([]);
  });

  it("compte ce qui attend quand un seul sens est présent", () => {
    const r = matchLine([order("vente", 30, 96), order("vente", 20, 97)]);
    expect(r.crosses).toEqual([]);
    expect(r.restSell).toBe(50);
    expect(r.restBuy).toBe(0);
  });
});

describe("le carnet de toutes les lignes", () => {
  it("garde les lignes sans contrepartie et met les appariables devant", () => {
    const autre: Offer = { ...line, id: "m2", title: "BDEAC 5,45 % 2029" };
    const r = crossings(
      [line, autre],
      [
        intent({ id: "a", offerId: "m2", type: "vente", amount: 500, limitPrice: 96 }),
        intent({ id: "b", offerId: "m1", type: "achat", amount: 100, limitPrice: 98 }),
        intent({ id: "c", offerId: "m1", type: "vente", amount: 100, limitPrice: 97 }),
      ],
    );
    expect(r.map((l) => l.offerId)).toEqual(["m1", "m2"]);
    expect(r[0].qty).toBe(100);
    expect(r[1].qty).toBe(0);
    expect(r[1].restSell).toBe(500);
  });

  it("ignore une intention dont la ligne n'existe plus", () => {
    expect(crossings([], [intent({})])).toEqual([]);
  });
});

/**
 * Le signal est la seule chose que le carnet laisse sortir, et un silence coûte
 * moins qu'un mot de trop : chaque cas ici garde une porte fermée.
 */
describe("ce que le client apprend du carnet", () => {
  const open: CrossPolicy = { tell: true, minOrders: 1, showDepth: false, execute: false };
  const deux = [intent({ id: "a", type: "achat", amount: 300, clientId: "c1" }), intent({ id: "b", type: "achat", amount: 200, clientId: "c2" })];

  it("ne dit rien tant que la politique est fermée", () => {
    expect(CROSS_CLOSED.tell).toBe(false);
    expect(facingSignal(deux, line, CROSS_CLOSED)).toEqual([]);
  });

  it("dit la présence sans la quantité", () => {
    expect(facingSignal(deux, line, open)).toEqual([{ side: "achat", orders: 2, qty: null }]);
  });

  it("dit la quantité quand la politique l'ouvre", () => {
    expect(facingSignal(deux, line, { ...open, showDepth: true })).toEqual([{ side: "achat", orders: 2, qty: 500 }]);
  });

  it("se tait sous le seuil d'ordres", () => {
    expect(facingSignal([deux[0]], line, { ...open, minOrders: 2 })).toEqual([]);
    expect(facingSignal(deux, line, { ...open, minOrders: 2 })).toHaveLength(1);
  });

  it("ne montre pas au lecteur son propre ordre", () => {
    expect(facingSignal(deux, line, open, { exceptClientId: "c1" })).toEqual([{ side: "achat", orders: 1, qty: null }]);
    expect(facingSignal([deux[0]], line, open, { exceptClientId: "c1" })).toEqual([]);
  });

  it("ne compte ni les ordres partis ni les autres lignes", () => {
    expect(facingSignal([intent({ state: "transmise" })], line, open)).toEqual([]);
    expect(facingSignal([intent({ offerId: "m2" })], line, open)).toEqual([]);
  });

  it("annonce les deux sens, l'achat d'abord", () => {
    const r = facingSignal([intent({ id: "a", type: "achat" }), intent({ id: "b", type: "vente" })], line, open);
    expect(r.map((x) => x.side)).toEqual(["achat", "vente"]);
  });

  it("ne laisse sortir ni nom, ni référence, ni limite", () => {
    const r = facingSignal([intent({ clientName: "Mme Abena", ref: "PF-9999", limitPrice: 96 })], line, { ...open, showDepth: true });
    expect(Object.keys(r[0]).sort()).toEqual(["orders", "qty", "side"]);
    expect(JSON.stringify(r)).not.toMatch(/Abena|PF-9999|96/);
  });
});

/**
 * Ce qui empêche un appariement doit l'empêcher avant le geste, et le dire.
 *
 * Chaque cas ici garde un client de se voir engagé sur un prix qu'il n'a pas
 * accepté : la confirmation, ses limites, sa quantité, et la quotité de la
 * ligne. Le serveur repasse la même fonction, donc l'écran annonce exactement
 * ce qu'il refusera.
 */
describe("ce qui empêche un appariement", () => {
  const ok = { ...order("achat", 1_000, 97.25), state: "confirmee" as const, clientId: "c1" };
  const okSell = { ...order("vente", 900, 96.75), state: "confirmee" as const, clientId: "c2" };

  it("laisse passer un appariement propre", () => {
    expect(crossCheck(ok, okSell, 900, 97)).toEqual([]);
  });

  it("refuse un ordre qui n'est pas confirmé", () => {
    expect(crossCheck({ ...ok, state: "recue" }, okSell, 900, 97)).toContainEqual({ key: "L'ordre d'achat n'est pas confirmé." });
    expect(crossCheck(ok, { ...okSell, state: "recue" }, 900, 97)).toContainEqual({ key: "L'ordre de vente n'est pas confirmé." });
  });

  it("refuse le même client des deux côtés", () => {
    expect(crossCheck(ok, { ...okSell, clientId: "c1" }, 900, 97)).toContainEqual({ key: "Les deux ordres sont du même client." });
  });

  it("refuse plus de titres que l'un des deux n'en porte", () => {
    expect(crossCheck(ok, okSell, 1_000, 97)).toContainEqual({ key: "Le vendeur n'en offre que {n}.", qty: 900 });
    expect(crossCheck({ ...ok, qty: 500 }, okSell, 900, 97)).toContainEqual({ key: "L'acheteur n'en demande que {n}.", qty: 500 });
  });

  it("refuse une quantité qui n'est pas un compte de titres", () => {
    expect(crossCheck(ok, okSell, 0, 97)).toContainEqual({ key: "La quantité appariée se compte en titres entiers." });
    expect(crossCheck(ok, okSell, 12.5, 97)).toContainEqual({ key: "La quantité appariée se compte en titres entiers." });
  });

  it("respecte la quotité de la ligne", () => {
    expect(crossCheck(ok, okSell, 95, 97, { lotSize: 10 })).toContainEqual({ key: "La quotité de la ligne est de {n} titres.", qty: 10 });
    expect(crossCheck(ok, okSell, 900, 97, { lotSize: 10 })).toEqual([]);
  });

  it("refuse un prix hors de la bande, des deux côtés", () => {
    expect(crossCheck(ok, okSell, 900, 97.5)).toContainEqual({ key: "L'acheteur ne va pas au-delà de {n}.", price: 97.25 });
    expect(crossCheck(ok, okSell, 900, 96.5)).toContainEqual({ key: "Le vendeur ne descend pas sous {n}.", price: 96.75 });
    // Les bornes elles-mêmes servent les deux : elles passent.
    expect(crossCheck(ok, okSell, 900, 97.25)).toEqual([]);
    expect(crossCheck(ok, okSell, 900, 96.75)).toEqual([]);
  });

  it("accepte tout prix quand les deux sont au marché, mais pas l'absence de prix", () => {
    const a = { ...ok, limit: null };
    const b = { ...okSell, limit: null };
    expect(crossCheck(a, b, 900, 42)).toEqual([]);
    expect(crossCheck(a, b, 900, 0)).toContainEqual({ key: "Le prix d'exécution manque." });
  });

  it("refuse deux ordres du même sens, et un ordre avec lui-même", () => {
    expect(crossCheck(ok, { ...ok, id: "autre", clientId: "c2" }, 900, 97)).toContainEqual({ key: "Un appariement va d'un acheteur à un vendeur." });
    expect(crossCheck(ok, { ...okSell, id: ok.id }, 900, 97)).toContainEqual({ key: "Un ordre ne s'apparie pas avec lui-même." });
  });
});
