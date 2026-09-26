import { describe, expect, it } from "vitest";
import { storageKey } from "@/lib/intake/storage";

/**
 * Une clef refusée au dépôt est un fichier perdu en silence.
 *
 * Supabase rejette une clef qui porte un caractère non ASCII. Les communiqués du
 * Trésor congolais en portent tous, et ils étaient déposés sans être gardés :
 * l'appel échouait, et la fiche restait sans sa pièce. Ces cas fixent ce qui
 * sort de la moulinette, y compris ce qu'elle ne doit pas toucher.
 */
describe("la clef d'un objet stocké", () => {
  it("laisse intacte une clef déjà saine, dossiers compris", () => {
    expect(storageKey("boc/BOC-20260925.pdf")).toBe("boc/BOC-20260925.pdf");
    expect(storageKey("kyc/u-123/piece-1a2b3c.png")).toBe("kyc/u-123/piece-1a2b3c.png");
  });

  it("fait tomber les accents plutôt que de les remplacer par un tiret", () => {
    // « Communique » se relit ; « Communiqu- » non.
    expect(storageKey("beac/Communiqué-dannonce-BTA-52-semaines.pdf")).toBe("beac/Communique-dannonce-BTA-52-semaines.pdf");
    expect(storageKey("issuers/SEMC/États-financiers-2025.pdf")).toBe("issuers/SEMC/Etats-financiers-2025.pdf");
  });

  it("garde les dossiers, qui ont un sens chez Supabase", () => {
    expect(storageKey("beac/x.pdf")).toContain("/");
  });

  it("remplace d'un seul tiret ce qui reste inacceptable", () => {
    expect(storageKey("beac/communiqué n° 480 (annonce).pdf")).toBe("beac/communique-n-480-annonce-.pdf");
  });
});
