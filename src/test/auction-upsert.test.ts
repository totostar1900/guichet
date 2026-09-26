import { beforeEach, describe, expect, it } from "vitest";
import { memoryRepository } from "@/lib/data/memory";
import type { NewAuctionResult } from "@/lib/market/auction-results";

/**
 * Ce qu'un second passage du robot ne doit pas défaire.
 *
 * Le robot rapatrie le communiqué et rend « undefined » quand la BEAC ne répond
 * pas, ce qui arrive : elle renvoie des 502 par intermittence. Écrit tel quel,
 * cet « undefined » effaçait la référence d'un document déjà gardé, et une
 * séance congolaise l'a perdue ainsi entre deux exécutions à quarante minutes
 * d'intervalle. L'écran de relecture n'avait alors plus rien à montrer, et la
 * pièce qui fonde le chiffre était partie.
 *
 * La règle tient en une phrase : le robot ajoute ce qu'il a, il ne retire pas ce
 * qu'il n'a pas.
 */
const seance = (over: Partial<NewAuctionResult> = {}): NewAuctionResult => ({
  country: "Congo",
  instrument: "BTA",
  tenor: "52 semaines",
  sessionOn: "2026-09-15",
  abondement: false,
  sourceUrl: "https://beac.int/resultats-bta-52.pdf",
  sourceTitle: "RESULTATS BTA 52",
  ...over,
});

describe("un second passage du robot sur la même séance", () => {
  const r = memoryRepository;
  beforeEach(async () => {
    for (const x of await r.listAuctionResults()) await r.updateAuctionResult(x.id, {});
  });

  it("garde la pièce quand le nouveau passage n'a rien pu rapatrier", async () => {
    const a = await r.upsertAuctionResult(seance({ fileKey: "beac/resultats-bta-52.pdf" }));
    expect(a.fileKey).toBe("beac/resultats-bta-52.pdf");
    const b = await r.upsertAuctionResult(seance({ fileKey: undefined }));
    expect(b.id).toBe(a.id);
    expect(b.fileKey).toBe("beac/resultats-bta-52.pdf");
  });

  it("remplace la pièce quand le nouveau passage en rapporte une", async () => {
    await r.upsertAuctionResult(seance({ fileKey: "beac/ancien.pdf" }));
    const b = await r.upsertAuctionResult(seance({ fileKey: "beac/nouveau.pdf" }));
    expect(b.fileKey).toBe("beac/nouveau.pdf");
  });

  it("garde la relecture du desk, qui ne se refait pas", async () => {
    const a = await r.upsertAuctionResult(seance({ fileKey: "beac/x.pdf" }));
    await r.updateAuctionResult(a.id, { confirmedBy: "Desk", confirmedAt: "2026-09-16T10:00:00Z", rateAvg: 6.97 });
    const b = await r.upsertAuctionResult(seance({ fileKey: undefined }));
    expect(b.confirmedBy).toBe("Desk");
    expect(b.fileKey).toBe("beac/x.pdf");
  });
});

/**
 * La pièce se garde toujours, et se rattrape.
 *
 * Deux règles que le robot doit tenir ensemble. Ce qui est déjà gardé ne se
 * retélécharge pas : reprendre un Trésor rapatriait quarante-six PDF à chaque
 * passage, pour rien et sur le dos d'une BEAC qui répond mal. Et ce qui manque
 * se retente : un 502 au moment de la création laissait sinon une séance sans
 * sa pièce pour toujours, puisque le passage suivant la reconnaissait et
 * l'ignorait. Le lien, lui, est en base dès la création et n'en bouge plus.
 */
describe("le communiqué d'une séance", () => {
  const r = memoryRepository;

  it("reste attaché à son adresse, qui ne se perd jamais", async () => {
    const a = await r.upsertAuctionResult(seance({ sourceUrl: "https://beac.int/lien.pdf", fileKey: undefined }));
    expect(a.sourceUrl).toBe("https://beac.int/lien.pdf");
    // Sans fichier, la séance existe quand même : on sait où la reprendre.
    expect(a.fileKey).toBeUndefined();
  });

  it("se rattrape au passage suivant quand la BEAC a fini par répondre", async () => {
    const url = "https://beac.int/rattrape.pdf";
    const a = await r.upsertAuctionResult(seance({ sourceUrl: url, fileKey: undefined }));
    expect(a.fileKey).toBeUndefined();
    const b = await r.upsertAuctionResult(seance({ sourceUrl: url, fileKey: "beac/rattrape.pdf" }));
    expect(b.id).toBe(a.id);
    expect(b.fileKey).toBe("beac/rattrape.pdf");
  });
});
