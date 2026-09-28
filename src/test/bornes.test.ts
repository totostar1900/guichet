import { describe, expect, it } from "vitest";
import { fourchette, rangerBornes } from "@/lib/market/auction-results";
import { priceOf } from "@/lib/market/yield";

const { ordonner } = await import("@/lib/market/auction-extract");

/**
 * Un bon et une obligation emploient le même canevas dans deux sens opposés.
 *
 * Pour un bon, la borne est un taux : le plus grand nombre est aussi le plus
 * coûteux pour l'émetteur, et les deux façons de nommer coïncident.
 *
 * Pour une obligation, la borne est un prix en pourcentage du nominal. À 90
 * l'émetteur reçoit 90 et remboursera 100 ; à 95 il reçoit 95. Le prix le plus
 * BAS est donc celui qui lui coûte le plus, et c'est celui qu'il nomme
 * « maximum ». Le Congo et le Tchad nomment ainsi, le Cameroun et le Gabon
 * nomment par le prix : deux lectures contraires du même tableau.
 */
describe("les deux bornes d'une séance", () => {
  describe("le rangement, quelle que soit la porte d'entrée", () => {
    it("range un prix nommé du côté du coût", () => {
      /* La pièce congolaise imprime « maximum 90 » au-dessus de « minimum 93 ». */
      expect(rangerBornes({ priceMin: 93, priceMax: 90 })).toEqual({ priceMin: 90, priceMax: 93 });
    });

    it("laisse en place ce qui est déjà dans l'ordre", () => {
      expect(rangerBornes({ priceMin: 88, priceMax: 91.5 })).toEqual({ priceMin: 88, priceMax: 91.5 });
      expect(rangerBornes({ rateMin: 6.5, rateMax: 7 })).toEqual({ rateMin: 6.5, rateMax: 7 });
    });

    it("ne touche pas à une borne seule, ni au reste de la fiche", () => {
      expect(rangerBornes({ priceMin: 93, tenor: "3 ans" })).toEqual({ priceMin: 93, tenor: "3 ans" });
      expect(rangerBornes({ priceMax: 90, country: "Tchad" })).toEqual({ priceMax: 90, country: "Tchad" });
    });

    it("range aussi la séance tchadienne du 5 août 2026, entrée à la main", () => {
      /* priceMin 91 et priceMax 90 : les deux nombres sont justes, ce sont les
         colonnes qui étaient échangées, et rien ne l'avait vu. */
      const range = rangerBornes({ priceMin: 91, priceMax: 90, priceLimit: 90.5, priceAvg: 90.5 });
      expect(range.priceMin).toBe(90);
      expect(range.priceMax).toBe(91);
      expect(range.priceAvg).toBe(90.5);
    });
  });

  describe("ce que la lecture automatique en dit", () => {
    it("explique l'inversion d'un prix par la convention de l'émetteur", () => {
      const remarques: string[] = [];
      expect(ordonner(93, 90, "prix", remarques)).toEqual([90, 93]);
      expect(remarques[0]).toContain("du côté de l'émetteur");
    });

    it("refuse de ranger un taux inversé, et laisse les champs vides", () => {
      /* Pour un taux, les deux façons de nommer coïncident : une inversion est
         une faute de lecture. La ranger la rendrait plausible, et le desk
         confirmerait une fourchette bien ordonnée sans rouvrir la pièce. */
      const remarques: string[] = [];
      expect(ordonner(7.2, 6.4, "taux", remarques)).toEqual([undefined, undefined]);
      expect(remarques[0]).not.toContain("du côté de l'émetteur");
      expect(remarques[0]).toContain("erreur de lecture");
      expect(remarques[0]).toContain("7.2");
      expect(remarques[0]).toContain("6.4");
    });

    it("ne dit rien quand il n'y a rien à dire", () => {
      const remarques: string[] = [];
      ordonner(6.5, 7, "taux", remarques);
      ordonner(88, 91, "prix", remarques);
      expect(remarques).toEqual([]);
    });
  });

  describe("ce que les bornes commandent", () => {
    /**
     * La borne haute n'est pas décorative : priceOf() s'en sert pour décider si
     * le prix moyen publié inclut le coupon couru. Onze rendements publiés en
     * dépendent, pour un écart moyen de cent cinquante et un points de base.
     */
    it("écarte un prix moyen au-dessus de la borne, coupon couru compris", () => {
      const p = priceOf({ priceMin: 88, priceMax: 91.5, priceAvg: 93.794, priceLimit: 91.5 });
      expect(p?.pct).toBe(91.5);
      expect(p?.assumed?.key).toContain("coupon couru");
    });

    it("retient le prix moyen quand il tombe dans la fourchette", () => {
      expect(priceOf({ priceMin: 88, priceMax: 95, priceAvg: 93.794, priceLimit: 91.5 })?.pct).toBe(93.794);
    });

    it("lit la borne haute même si les colonnes sont échangées", () => {
      /* La défense vaut mieux que la confiance : le rangement est en place, et
         priceOf() n'en dépend pas pour autant. */
      expect(priceOf({ priceMin: 91.5, priceMax: 88, priceAvg: 93.794, priceLimit: 91.5 })?.pct).toBe(91.5);
    });

    it("rend une fourchette dans l'ordre, d'où qu'elle vienne", () => {
      expect(fourchette({ instrument: "OTA", priceMin: 93, priceMax: 90, rateMin: undefined, rateMax: undefined })).toEqual({ lo: 90, hi: 93, unit: "prix" });
      expect(fourchette({ instrument: "BTA", rateMin: 6.4, rateMax: 7.2, priceMin: undefined, priceMax: undefined })).toEqual({ lo: 6.4, hi: 7.2, unit: "taux" });
    });
  });
});
