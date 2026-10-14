import { describe, expect, it } from "vitest";
import { invraisemblances, type LigneDeRapport } from "@/lib/market/rapport-hebdomadaire";

/**
 * LE RAPPORT PORTE LE RÉALISÉ, LÀ OÙ LE TABLEAU DE BORD DONNE LE PRÉVU.
 *
 * 87 rapports dormaient sur le disque, rangés parmi 355 « autres
 * communiqués ». Ils portent ce qu'un communiqué de résultats porte, pour
 * TOUTES les séances et non pour les 252 publiées séparément.
 */
const l = (p: Partial<LigneDeRapport> = {}): LigneDeRapport => ({
  pays: "Congo", instrument: "BTA", tenor: "26 semaines", codeEnchere: "CG1200001895 BTA-26",
  codeEmission: "CG1200001895", couponRate: null, maturityOn: null, operation: "emission",
  montantPrevu: 15_000_000_000, montantRealise: 14_000_000_000,
  tauxParticipation: 16.6667, tauxSouscription: 140, tauxPrixMoyen: 6.9036,
  tauxPrixMarginal: 7, tauxPrixMin: 6.75, tauxPrixMax: 7.6, observations: null,
  ...p,
});

describe("ce que la pièce permet de vérifier d'elle-même", () => {
  it("LAISSE PASSER UNE SÉANCE ORDINAIRE", () => {
    expect(invraisemblances(l())).toEqual([]);
  });

  it("ACCEPTE UN TAUX DE SOUSCRIPTION AU-DESSUS DE CENT, qui est la normale", () => {
    /* C'est le rapport des soumissions au montant annoncé : 140 % veut dire
       que le marché en demandait plus que le Trésor n'en offrait. */
    expect(invraisemblances(l({ tauxSouscription: 140 }))).toEqual([]);
    expect(invraisemblances(l({ tauxSouscription: 1200 }))[0]).toContain("mille");
  });

  it("REFUSE UNE PARTICIPATION AU-DELÀ DE CENT, qui est une part de réseau", () => {
    expect(invraisemblances(l({ tauxParticipation: 140 }))[0]).toContain("cent");
  });

  it("ATTRAPE LES DEUX COLONNES ÉCHANGÉES", () => {
    /* Un Trésor sert au plus ce qu'il a annoncé. Au-delà, c'est que le
       prévu et le réalisé ont été intervertis, ce qui ne se voit pas
       autrement : les deux nombres sont plausibles chacun de son côté. */
    const x = invraisemblances(l({ montantPrevu: 10_000_000_000, montantRealise: 15_000_000_000 }));
    expect(x[0]).toContain("échangées");
  });

  it("ne crie pas sur un abondement, qui peut dépasser son annonce", () => {
    expect(invraisemblances(l({ operation: "abondement", montantPrevu: 10e9, montantRealise: 15e9 }))).toEqual([]);
  });

  it("DIT QU'UN MONTANT HORS D'ÉCHELLE EST HORS D'ÉCHELLE, réalisé comme prévu", () => {
    expect(invraisemblances(l({ montantRealise: 16_678_630_000_000 }))[0]).toContain("trop grand");
  });

  it("ne reproche rien à un paiement d'intérêts sans statistiques de séance", () => {
    /* Un tiret dans la colonne veut dire « ne s'applique pas » : rendre zéro
       ferait lire une séance sans souscripteur. */
    expect(
      invraisemblances(
        l({ operation: "paiement_interets", montantPrevu: 492_500_000, montantRealise: 492_500_000, tauxParticipation: null, tauxSouscription: null, tauxPrixMoyen: null, tauxPrixMarginal: null, tauxPrixMin: null, tauxPrixMax: null }),
      ),
    ).toEqual([]);
  });
});
