import { describe, expect, it } from "vitest";
import { montantPourUnites, surveyTrio } from "@/lib/domain/estimate";
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
    // 182 jours à 4,25 % précompté, et ses centimes : ils étaient arrondis au
    // franc, ce qui mettait deux « total à décaisser » différents sur un même
    // écran et faisait revenir la quantité tapée diminuée d'une unité.
    expect(t.each).toBeCloseTo(978_513.89, 2);
    expect(t.count).toBe(10);
    expect(t.total).toBeCloseTo(9_785_138.89, 2);
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
  });

  /**
   * LA QUANTITÉ QU'ON TAPE DOIT REVENIR, ET ELLE NE REVENAIT PAS.
   *
   * L'épreuve d'au-dessus tenait déjà la bonne règle — « les deux conversions
   * ramènent au montant de départ » — mais sur un bon dont le prix,
   * 978 513,888…, s'arrondit vers le HAUT. Le produit tombait donc au-dessus
   * du vrai coût, et la division qui le relit retrouvait ses dix bons.
   *
   * Un prix qui s'arrondit vers le bas — une fois sur deux — faisait l'inverse,
   * et c'est ce que l'écran montrait : sur le bon camerounais à 975 772,22, on
   * tapait « 1 » et la case se vidait, puis la frappe suivante effaçait le
   * montant. La case « quantité » d'une adjudication ne rendait rien.
   *
   * L'épreuve parcourt donc les deux cas d'arrondi, et elle vérifie le CHEMIN
   * de l'écran : on tape n, on pose le montant au franc supérieur, on relit.
   */
  it("rend la quantité qu'on a tapée, des deux côtés de l'arrondi", () => {
    // 182 jours à 4,25 % : le prix s'arrondit vers le haut (978 513,88).
    // 178 jours à 4,90 % : il s'arrondit vers le bas (975 772,22).
    const basVersLeHaut = { ...bta, precountRate: 4.25 } as unknown as Offer;
    const basVersLeBas = { ...bta, settleOn: "2026-11-26", maturityOn: "2027-05-23", precountRate: 4.9 } as unknown as Offer;
    for (const [nom, o] of [["arrondi par le haut", basVersLeHaut], ["arrondi par le bas", basVersLeBas]] as const) {
      const unite = surveyTrio(o, 1, null)!.amountPerUnit;
      // Non-vacuité : sans fraction, l'épreuve ne distinguerait pas les deux cas.
      expect(unite % 1, `${nom} : le prix du bon n'a pas de fraction, le cas n'est pas celui qu'on croit`).not.toBe(0);
      for (const n of [1, 3, 10, 137]) {
        const montant = montantPourUnites(surveyTrio(o, 1, null)!, n); // ce que l'écran pose, par le même chemin
        expect(surveyTrio(o, montant, null)!.count, `${nom} : ${n} bons tapés reviennent autrement`).toBe(n);
      }
    }
  });

  it("ne dit rien des compartiments qui ne passent pas par là", () => {
    expect(surveyTrio({ ...bta, kind: "MARCHE" } as unknown as Offer, 1_000_000, null)).toBeNull();
    expect(surveyTrio({ ...bta, kind: "FONDS" } as unknown as Offer, 1_000_000, null)).toBeNull();
  });

  it("un bon sans taux publié ni taux saisi ne donne pas de prix", () => {
    expect(surveyTrio({ ...bta, precountRate: undefined } as unknown as Offer, 1_000_000, null)).toBeNull();
  });
});
