import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { auctionReadingAvailable, toFrancs } = await import("@/lib/market/auction-extract");

/**
 * Ce que la lecture assistée doit tenir, sans appeler le modèle.
 *
 * L'appel lui-même n'est pas testable ici : il coûte de l'argent, il dépend
 * d'une clef, et ce qu'il rend varie. Ce qui doit être tenu, en revanche, c'est
 * tout ce qui entoure l'appel : l'unité des montants, et le fait que l'écran se
 * comporte correctement quand la lecture n'est pas disponible.
 */
describe("l'unité des montants du communiqué", () => {
  it("ramène les millions en francs, ce que le tableau annonce presque toujours", () => {
    // « 15 000 » sous un en-tête « en millions de FCFA » : quinze milliards.
    expect(toFrancs(15_000, "millions")).toBe(15_000_000_000);
  });

  it("ramène aussi les milliers, qu'un Trésor emploie parfois", () => {
    expect(toFrancs(15_000, "milliers")).toBe(15_000_000);
  });

  it("laisse les francs tels quels", () => {
    expect(toFrancs(15_000, "francs")).toBe(15_000);
  });

  it("ne multiplie rien quand l'unité n'a pas été lue", () => {
    // Deviner l'unité reviendrait à inventer trois zéros. Le chiffre passe brut
    // et une remarque prévient le desk : c'est à lui de trancher sur la pièce.
    expect(toFrancs(15_000, null)).toBe(15_000);
  });

  it("laisse vide ce qui n'est pas imprimé", () => {
    expect(toFrancs(null, "millions")).toBeUndefined();
    expect(toFrancs(null, null)).toBeUndefined();
  });

  it("ne confond pas zéro avec l'absence : un Trésor peut ne rien servir", () => {
    expect(toFrancs(0, "millions")).toBe(0);
  });
});

describe("quand la lecture automatique n'est pas configurée", () => {
  it("se déclare indisponible plutôt que d'échouer à l'usage", () => {
    // Sans clef, l'écran doit le dire d'avance et laisser saisir à la main,
    // plutôt que de proposer un bouton qui tombera en erreur.
    const avant = { key: process.env.ANTHROPIC_API_KEY, tok: process.env.ANTHROPIC_AUTH_TOKEN };
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    expect(auctionReadingAvailable()).toBe(false);
    process.env.ANTHROPIC_API_KEY = "sk-essai";
    expect(auctionReadingAvailable()).toBe(true);
    delete process.env.ANTHROPIC_API_KEY;
    if (avant.key) process.env.ANTHROPIC_API_KEY = avant.key;
    if (avant.tok) process.env.ANTHROPIC_AUTH_TOKEN = avant.tok;
  });
});
