import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ordreSignable } from "@/lib/domain/intent";
import { etatDe, pisteDe } from "@/app/moi/ordres/piste";
import type { Intent } from "@/lib/domain/types";

const ordre = (o: Partial<Intent>): Intent =>
  ({ id: "i1", ref: "R1", offerId: "x", clientId: "c", type: "souscription", state: "recue", createdAt: "2026-11-17T08:00:00Z", amount: 500000, ...o }) as Intent;
const SIGNE = "2026-11-17T09:00:00Z";

/* Décidé le 17 novembre 2026, planche « Feuilles et ordres » (2A, 3) : seuls les fonds sont confirmés par la signature ; un ordre ferme ou d'achat sur un titre va au desk, plafond ou non. */
describe("la piste d'un ordre de fonds signé", () => {
  it("commence à « signé » : ni « reçue » ni « confirmée »", () => {
    const p = pisteDe(ordre({ state: "confirmee", signedAt: SIGNE }));
    expect(p.arrets).toEqual(["signé", "transmis", "exécuté", "parts inscrites"]);
    expect(p.etape).toBe(0);
    expect(etatDe(ordre({ state: "confirmee", signedAt: SIGNE }))).toBe("Signé");
  });
  it("avance avec l'état, un rachat finit sur le produit viré", () => {
    expect(pisteDe(ordre({ state: "transmise", signedAt: SIGNE })).etape).toBe(1);
    expect(pisteDe(ordre({ state: "servie", signedAt: SIGNE })).etape).toBe(2);
    expect(pisteDe(ordre({ state: "reglee", signedAt: SIGNE })).etape).toBe(3);
    expect(pisteDe(ordre({ type: "rachat", state: "reglee", signedAt: SIGNE })).arrets[3]).toBe("produit viré");
  });
  it("avant la signature : « À signer » et pas de piste, rien ne court", () => {
    const o = ordre({});
    expect(etatDe(o)).toBe("À signer");
    expect(pisteDe(o).arrets).toEqual([]);
  });
  it("un ordre que le desk mène garde ses cinq arrêts", () => {
    const p = pisteDe(ordre({ type: "ferme", state: "recue", maxAmount: 9_000_000 }));
    expect(p.arrets).toHaveLength(5);
    expect(p.arrets[0]).toBe("reçue");
  });
  it("un titre ne se signe pas dans l'app, même avec un plafond", () => {
    expect(ordreSignable(ordre({ type: "ferme", maxAmount: 9_000_000 }))).toBe(false);
    expect(ordreSignable(ordre({ type: "achat", maxAmount: 9_000_000 }))).toBe(false);
  });
});

describe("le fond des fenêtres glissantes", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  it("lit un jeton propre, calculé depuis --surface, dans les trois thèmes", () => {
    expect(css).toMatch(/--feuille: var\(--surface\)/);
    expect(css).toMatch(/:root\[data-theme="dim"\] \{\s*--feuille: color-mix/);
    expect(css).toMatch(/:root\[data-theme="dark"\] \{\s*--feuille: color-mix/);
  });
  it("Sheet et LineMenu le lisent, et plus le fond des cartes", () => {
    for (const f of ["src/components/mobile/Sheet.module.css", "src/components/mobile/LineMenu.module.css"]) {
      const s = readFileSync(f, "utf8");
      const feuille = s.match(/\.sheet \{[^}]*\}/)?.[0] ?? "";
      expect(feuille, f).toContain("background: var(--feuille)");
      expect(feuille, f).toContain("border: 1px solid var(--feuille-trait)");
    }
  });
});
