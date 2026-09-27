import { describe, expect, it } from "vitest";
import { memoryRepository } from "@/lib/data/memory";
import type { NewAuctionResult } from "@/lib/market/auction-results";

/**
 * Ce qu'une mise à jour partielle n'a pas le droit de faire.
 *
 * Le piège s'est refermé trois fois, et toujours de la même façon. Une mise à
 * jour partielle se construit avec un opérateur qui rend « undefined » quand il
 * ne faut rien changer ; l'objet porte alors la clef avec la valeur
 * « undefined », le convertisseur voit la clef, et écrit null. Le champ qu'on
 * voulait préserver est exactement celui qu'on efface, et rien ne le signale :
 * l'appel réussit, la ligne existe toujours, et la colonne est vide.
 *
 * La troisième fois a coûté le prix et les montants de trente et une
 * obligations, récupérés depuis les communiqués gardés au dépôt. Ces cliquets
 * disent la règle une fois pour toutes : « undefined » veut dire « non
 * fourni », seul un « null » écrit efface, et rouvrir une séance a son propre
 * nom.
 */

// Chaque cas prend sa propre adresse : l'upsert se recale sur « source_url »,
// et deux cas qui la partageraient écriraient dans la même ligne.
const neuve = (cle: string): NewAuctionResult => ({
  country: "Congo",
  instrument: "OTA",
  tenor: "3 ans",
  sessionOn: "2026-09-15",
  abondement: false,
  sourceUrl: `https://beac.int/${cle}.pdf`,
  sourceTitle: "RESULTATS",
  priceAvg: 90,
  announced: 5_000_000_000,
  bid: 3_500_000_000,
  bidders: 1,
  confirmedBy: "Desk",
  confirmedAt: "2026-09-16T10:00:00Z",
});

describe("une mise à jour partielle", () => {
  it("ne touche pas un champ passé à undefined", async () => {
    const r = await memoryRepository.upsertAuctionResult(neuve("garde"));
    // C'est exactement la forme que produit un « ne change que ce qui est
    // vide » : la clef est là, la valeur ne l'est pas.
    const apres = await memoryRepository.updateAuctionResult(r.id, { priceAvg: undefined, announced: undefined, couponRate: 6.5 });
    expect(apres.priceAvg).toBe(90);
    expect(apres.announced).toBe(5_000_000_000);
    expect(apres.couponRate).toBe(6.5);
  });

  it("ne défait pas une confirmation en passant à côté", async () => {
    const r = await memoryRepository.upsertAuctionResult(neuve("confirmation"));
    const apres = await memoryRepository.updateAuctionResult(r.id, { confirmedBy: undefined, couponRate: 6.5 });
    expect(apres.confirmedBy).toBe("Desk");
  });

  it("remplace bien une valeur réellement fournie", async () => {
    const r = await memoryRepository.upsertAuctionResult(neuve("remplace"));
    expect((await memoryRepository.updateAuctionResult(r.id, { priceAvg: 91.5 })).priceAvg).toBe(91.5);
  });
});

describe("rouvrir une séance", () => {
  /**
   * Le seul effacement légitime de la table, et il a son propre nom. Passer
   * par une mise à jour « à undefined » marchait tant que undefined effaçait,
   * c'est-à-dire tant que le piège était armé.
   */
  it("efface la confirmation et rien d'autre", async () => {
    const r = await memoryRepository.upsertAuctionResult(neuve("rouvrir"));
    const apres = await memoryRepository.reopenAuctionResult(r.id);
    expect(apres.confirmedBy).toBeUndefined();
    expect(apres.confirmedAt).toBeUndefined();
    expect(apres.priceAvg).toBe(90);
    expect(apres.tenor).toBe("3 ans");
  });
});
