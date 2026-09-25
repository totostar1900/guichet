import { describe, expect, it } from "vitest";
import { switchBlock, switchProceeds, switchTargets } from "@/lib/domain/switch";
import type { Offer } from "@/lib/domain/types";

/**
 * Un passage engage le client deux fois d'un seul geste.
 *
 * Il sort d'un fonds et entre dans un autre sans repasser par la case départ,
 * ce qui veut dire que la destination n'est plus vérifiée par personne au
 * moment où elle sert : le desk exécute le rachat, et la souscription part.
 * D'où ces cas, qui refusent tout ce qui n'est pas un fonds réellement
 * souscriptible, et refusent de promettre un montant qu'on n'a pas.
 */

const fonds = (over: Partial<Offer> & { id: string }): Offer => ({
  kind: "FONDS",
  operation: "secondaire",
  country: "Cameroun",
  countryName: "Cameroun",
  issuer: "Corridor Asset Management",
  title: `FCP ${over.id}`,
  isin: `CM${over.id}`,
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
  fund: { nav: 10_500, navDate: "2026-09-20", manager: "CAM", depositary: "LCB", entryFeePct: 1, exitFeePct: 0.5, minAmount: 100_000, distributed: true } as Offer["fund"],
  ...over,
});

const a = fonds({ id: "a", title: "FCP Monétaire" });
const b = fonds({ id: "b", title: "FCP Obligataire" });

describe("ce qui empêche un passage", () => {
  it("laisse passer un fonds distribué qui n'est pas celui de départ", () => {
    expect(switchBlock(a, b)).toBeNull();
  });

  it("refuse une destination absente, ou qui n'est pas un fonds", () => {
    expect(switchBlock(a, undefined)).toMatch(/introuvable/);
    expect(switchBlock(a, { ...b, kind: "MARCHE" })).toMatch(/arrive sur un fonds/);
    expect(switchBlock({ ...a, kind: "OTA" }, b)).toMatch(/part d'un fonds/);
  });

  it("refuse le fonds de départ lui-même", () => {
    expect(switchBlock(a, a)).toMatch(/fonds de départ/);
  });

  it("refuse un fonds que la maison ne distribue pas", () => {
    // Lu au bulletin mais sans convention : le proposer promettrait une opération qui n'existe pas.
    expect(switchBlock(a, fonds({ id: "c", fund: { ...b.fund!, distributed: false } }))).toMatch(/pas encore distribué/);
  });

  it("refuse un fonds retiré du Guichet", () => {
    expect(switchBlock(a, { ...b, hidden: true })).toMatch(/plus proposé/);
    expect(switchBlock(a, { ...b, status: "withdrawn" })).toMatch(/plus proposé/);
  });
});

describe("les fonds atteignables", () => {
  it("ne garde que les destinations valables, par ordre de titre", () => {
    const hors = fonds({ id: "d", title: "FCP Caché", hidden: true });
    const ok = fonds({ id: "e", title: "FCP Actions" });
    expect(switchTargets(a, [a, b, hors, ok]).map((x) => x.title)).toEqual(["FCP Actions", "FCP Obligataire"]);
  });

  it("ne renvoie rien quand il n'y a nulle part où aller", () => {
    expect(switchTargets(a, [a])).toEqual([]);
  });
});

describe("le produit du rachat", () => {
  it("retourne le signe du règlement et arrondit au franc", () => {
    // « positionFor » compte ce que le client reçoit en négatif : c'est ce qu'il n'a pas à régler.
    expect(switchProceeds(-1_234_567.89)).toBe(1_234_567);
  });

  it("ne promet jamais un montant négatif", () => {
    expect(switchProceeds(0)).toBe(0);
    expect(switchProceeds(500)).toBe(0);
  });
});
