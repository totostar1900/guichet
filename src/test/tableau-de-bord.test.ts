import { describe, expect, it } from "vitest";
import { horsEchelle, MONTANT_SELON_OPERATION, montantFiable, PLAFOND, PLANCHER } from "@/lib/market/tableau-de-bord";

/**
 * DEUX SOURCES JUSTES SUFFISENT À SE TROMPER, SI ON CONFOND CE QU'ELLES DISENT.
 *
 * Le tableau de bord annonce ce que les Trésors PRÉVOIENT ; le communiqué de
 * résultats dit ce qu'ils ont OBTENU. Mesuré le 14 octobre 2026 : sur 134
 * couples de même date, le montant d'émission du tableau égale 80 fois
 * l'annonce et 34 fois le servi. Employer ces montants dans un encours le
 * gonflerait de tout ce qui n'a pas été levé.
 */
const ligne = (montant: number) => ({
  pays: "Tchad" as const, instrument: "BTA" as const, tenor: "26 semaines",
  codeEnchere: "TD1200001790 BTA-26", codeEmission: "TD1200001790", couponRate: null,
  maturityOn: null, operation: "emission" as const, montant, operationOn: "2024-01-24",
  settleOn: "2024-01-26", observations: null,
});

describe("ce que chaque montant veut dire", () => {
  it("UNE ÉMISSION EST UNE INTENTION, UN REMBOURSEMENT EST UN FAIT", () => {
    expect(montantFiable("emission")).toBe(false);
    expect(montantFiable("abondement")).toBe(false);
    expect(montantFiable("remboursement")).toBe(true);
    expect(montantFiable("paiement_interets")).toBe(true);
  });

  it("couvre tous les types, pour qu'aucun n'entre dans un total par défaut", () => {
    for (const [k, v] of Object.entries(MONTANT_SELON_OPERATION)) {
      expect(["annonce", "exact", "inconnu"], `${k} doit être qualifié`).toContain(v);
    }
    expect(montantFiable("autre")).toBe(false);
  });
});

describe("le garde d'échelle", () => {
  it("LAISSE PASSER CE QU'UN TRÉSOR DE LA ZONE ADJUGE VRAIMENT", () => {
    expect(horsEchelle(ligne(15_000_000_000))).toBeUndefined();
    expect(horsEchelle(ligne(PLANCHER))).toBeUndefined();
    expect(horsEchelle(ligne(PLAFOND))).toBeUndefined();
  });

  it("ARRÊTE LE MILLE FOIS TROP GRAND, qui s'est déjà produit", () => {
    /* Le Tchad du 24 janvier 2024, imprimé en milliers sous un en-tête
       « en millions » : rien ne garantit qu'un scan de tableau soit plus
       docile qu'un communiqué. */
    expect(horsEchelle(ligne(16_678_630_000_000))).toContain("trop grand");
  });

  it("LAISSE PASSER UN PETIT COUPON, ET LE PLANCHER EST CALIBRÉ POUR LUI", () => {
    /* Le plancher vaut ici un million, contre cent millions pour les montants
       servis d'une adjudication, et la différence est voulue : CETTE table
       porte aussi des coupons. Mesuré sur les 1 160 lignes lues, le plus petit
       montant réel est un paiement d'intérêts de 9,45 millions, et AUCUNE
       ligne ne tombe sous le million. Un plancher à cent millions aurait donc
       écarté des coupons parfaitement justes. */
    expect(horsEchelle(ligne(9_450_000))).toBeUndefined();
    expect(horsEchelle(ligne(3_000))).toContain("trop petit");
  });

  it("ne dit rien d'un montant absent, qui n'est pas une erreur d'échelle", () => {
    expect(horsEchelle({ ...ligne(0), montant: null })).toBeUndefined();
  });
});
