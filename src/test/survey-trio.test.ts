import { describe, expect, it } from "vitest";
import { surveyTrio } from "@/lib/domain/estimate";
import type { Offer } from "@/lib/domain/types";

/**
 * Les trois cases d'une adjudication, et la seule chose qui compte : que le
 * produit soit exact. Un « = » entre trois nombres qui ne tombent pas juste est
 * un mensonge par arithmétique, et il ne se voit sur aucun écran.
 */
const bta: Offer = {
  id: "bta",
  kind: "BTA",
  nominal: 1_000_000,
  settleOn: "2026-10-08",
  maturityOn: "2027-04-08",
  precountRate: 4.25,
} as unknown as Offer;

const ota: Offer = {
  id: "ota",
  kind: "OTA",
  nominal: 10_000,
  settleOn: "2026-10-08",
  maturityOn: "2031-10-08",
  couponRate: 6.25,
  pricePct: 98.5,
} as unknown as Offer;

describe("surveyTrio", () => {
  it("sur un bon, la case du milieu est le prix du bon, pas le taux", () => {
    const t = surveyTrio(bta, 10_000_000, null)!;
    // 182 jours à 4,25 % précompté.
    expect(t.each).toBe(978_514);
    expect(t.count).toBe(10);
    expect(t.total).toBe(9_785_140);
    expect(t.rate).toBe(4.25);
  });

  it("le produit est exact : quantité × prix donne le total affiché", () => {
    const t = surveyTrio(bta, 10_000_000, null)!;
    expect(t.count * t.each).toBe(t.total);
  });

  it("un taux saisi l'emporte sur le taux publié, et change le prix", () => {
    const publie = surveyTrio(bta, 10_000_000, null)!;
    const exige = surveyTrio(bta, 10_000_000, 6)!;
    expect(exige.each).toBeLessThan(publie.each);
    expect(exige.rate).toBe(6);
  });

  it("sur une obligation, le montant porte du nominal et le prix un pourcentage", () => {
    const t = surveyTrio(ota, 10_000_000, null)!;
    expect(t.count).toBe(1000);
    expect(t.each).toBe(9850);
    expect(t.total).toBe(9_850_000);
    expect(t.amountPerUnit).toBe(10_000);
  });

  it("les deux conversions ramènent au montant de départ", () => {
    const t = surveyTrio(ota, 10_000_000, null)!;
    expect(t.count * t.amountPerUnit).toBe(10_000_000);
    expect(Math.round(t.total * t.amountPerTotal)).toBe(10_000_000);
    const b = surveyTrio(bta, 9_785_140, null)!;
    expect(b.count * b.amountPerUnit).toBe(9_785_140);
  });

  it("ne dit rien des compartiments qui ne passent pas par là", () => {
    expect(surveyTrio({ ...bta, kind: "MARCHE" } as unknown as Offer, 1_000_000, null)).toBeNull();
    expect(surveyTrio({ ...bta, kind: "FONDS" } as unknown as Offer, 1_000_000, null)).toBeNull();
  });

  it("un bon sans taux publié ni taux saisi ne donne pas de prix", () => {
    expect(surveyTrio({ ...bta, precountRate: undefined } as unknown as Offer, 1_000_000, null)).toBeNull();
  });
});
