import { describe, expect, it } from "vitest";
import { dernierPrincipalConnu, lireLeCouple, principalDuCoupon, TAUX_MAX } from "@/lib/market/principal-par-le-coupon";

/**
 * LE COUPON RÉVÈLE SON PRINCIPAL, ET C'EST TOUT CE QUI RESTAIT POUR L'ENCOURS.
 *
 * Les communiqués ne couvrent que 82 levées sur 536 ; le tableau de bord les
 * couvre toutes mais n'annonce que des intentions. Le paiement d'intérêts est
 * la seule colonne à la fois exacte et complète, et l'identité
 * « coupon ÷ taux = principal » tient 69 fois sur 80 contre une source
 * indépendante.
 */
describe("le principal déduit d'un coupon", () => {
  it("REND LE PRINCIPAL AU FRANC SUR LE CAS MESURÉ", () => {
    /* Cameroun CM2B00000053 OTA 5 ANS 5,50% : 2,75 Mds d'intérêts et 50 Mds
       remboursés le même jour, le 26 février 2026. */
    expect(principalDuCoupon({ taux: 5.5, montant: 2_750_000_000 })).toBe(50_000_000_000);
  });

  it("REFUSE DE DIVISER PAR UN TAUX QUI N'EN EST PAS UN", () => {
    expect(principalDuCoupon({ taux: 0, montant: 1 })).toBeUndefined();
    expect(principalDuCoupon({ taux: TAUX_MAX + 1, montant: 1 })).toBeUndefined();
    expect(principalDuCoupon({ taux: 6, montant: 0 })).toBeUndefined();
  });
});

describe("ce que le couple coupon et remboursement raconte", () => {
  it("dit « en une fois » quand les deux coïncident", () => {
    const l = lireLeCouple({ taux: 5.5, montant: 2_750_000_000 }, 50_000_000_000);
    expect(l.nature).toBe("in_fine");
    expect(l.principal).toBe(50_000_000_000);
  });

  it("DISTINGUE UN DÉCOMPTE DE JOURS D'UN AMORTISSEMENT", () => {
    /* Congo CG2A00000072 : 1 809 863 014 à 6 % sur 30 Mds rendus, soit 101 %.
       Une première période de 367 jours, pas une ligne amortissable. Les
       confondre ferait voir un amortissement partout où il y a un décalage
       de calendrier. */
    const l = lireLeCouple({ taux: 6, montant: 1_809_863_014 }, 30_000_000_000);
    expect(l.nature).toBe("decompte_de_jours");
    expect(l.dit).toContain("trois cent soixante-cinq jours");
  });

  it("LIT LE NOMBRE DE TRANCHES DANS LE RAPPORT", () => {
    /* Gabon GA2J00000135 : coupon à 5,25 % sur 25 Mds déduits contre
       8,02 Mds rendus, soit 3,1. C'est la première mesure directe de
       l'amortissement du marché primaire, que l'encours supposait in fine. */
    const l = lireLeCouple({ taux: 5.25, montant: 1_312_500_000 }, 8_023_340_000);
    expect(l.nature).toBe("amortissable");
    expect(l.tranches).toBe(3);
    expect(l.rapport).toBeCloseTo(3.12, 1);
  });

  it("DÉNONCE LA MÊME SOMME RANGÉE DEUX FOIS", () => {
    /* Centrafrique CF2A00000017 : le « remboursement » vaut exactement le
       coupon. Sans ce cas, le rapport sortirait à 3 390 % et on lirait une
       ligne amortie en trente-quatre tranches. */
    const l = lireLeCouple({ taux: 2.95, montant: 107_885_925 }, 107_885_925);
    expect(l.nature).toBe("etiquette_douteuse");
    expect(l.dit).toContain("deux fois");
  });

  it("AVOUE QUAND IL NE SAIT PAS, plutôt que de ranger de force", () => {
    expect(lireLeCouple({ taux: 6, montant: 1_000_000 }, 0).nature).toBe("pas_encore_rendue");
    expect(lireLeCouple({ taux: 0, montant: 1_000_000 }, 1).nature).toBe("indecidable");
    /* Entre 1,02 et 1,10, rien n'a été observé : on le dit. */
    expect(lireLeCouple({ taux: 6, montant: 6_300_000 }, 100_000_000).nature).toBe("indecidable");
  });
});

describe("le dernier principal connu", () => {
  it("GARDE LE COUPON LE PLUS RÉCENT, qui est le plus proche de l'encours", () => {
    /* Sur une ligne amortissable le coupon diminue avec le capital : le
       premier vu surestimerait ce qui reste dû. */
    const m = dernierPrincipalConnu([
      { code: "X", taux: 6, montant: 6_000_000_000, le: "2024-01-01" },
      { code: "X", taux: 6, montant: 3_000_000_000, le: "2025-01-01" },
    ]);
    expect(m.get("X")?.principal).toBe(50_000_000_000);
    expect(m.get("X")?.le).toBe("2025-01-01");
  });
});
