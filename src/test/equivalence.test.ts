import { describe, expect, it } from "vitest";
import { equivalence } from "@/lib/domain/estimate";
import type { Offer } from "@/lib/domain/types";

/**
 * L'équivalence sous le champ, et surtout le reste non placé.
 *
 * Le reste est la moitié de la vérité qui ne se disait nulle part : un titre
 * est entier, donc une partie du montant demandé ne part pas. Un arrondi qui
 * l'avalerait ne se verrait sur aucun écran, d'où ce cliquet.
 */
const base: Offer = {
  id: "x",
  kind: "BTA",
  title: "BTA 26 semaines",
  issuer: "Trésor",
  country: "CM",
  instrument: "obligation",
  nominal: 1_000_000,
  settleOn: "2026-10-08",
  maturityOn: "2027-04-08",
  precountRate: 4.25,
  status: "ouverte",
} as unknown as Offer;

describe("equivalence", () => {
  it("dit les bons, le décaissement, et ce qui reste sur le compte", () => {
    const e = equivalence(base, 10_000_000, "ferme");
    expect(e).not.toBeNull();
    // 182 jours à 4,25 % précompté : le bon se paie 978 514, donc dix bons.
    expect(e!.line).toContain("10 bons");
    expect(e!.rest).toBe(214_861);
    expect(e!.restLine).toContain("ne sont pas placés");
  });

  it("ne parle pas de reste quand le montant tombe juste", () => {
    const e = equivalence(base, 9_785_139, "ferme");
    expect(e!.rest).toBe(0);
    expect(e!.restLine).toBe("");
  });

  it("sur un fonds, donne les parts avec la date de la valeur liquidative", () => {
    const fonds = { ...base, kind: "FONDS", fund: { nav: 105_750, navDate: "2026-09-30", minAmount: 100_000, entryFeePct: 0, exitFeePct: 0, manager: "X", distributed: true } } as unknown as Offer;
    const e = equivalence(fonds, 5_000_000, "souscription");
    expect(e!.line).toContain("parts");
    // L'espace des milliers est une fine insécable, pas une espace ordinaire.
    expect(e!.line).toContain("105 750");
    // Les parts ont trois décimales : il n'y a rien à laisser de côté.
    expect(e!.rest).toBe(0);
  });

  it("au rachat, l'unité s'inverse : des parts tapées, un montant rendu", () => {
    const fonds = { ...base, kind: "FONDS", fund: { nav: 105_750, navDate: "2026-09-30", minAmount: 100_000, entryFeePct: 0, exitFeePct: 0, manager: "X", distributed: true } } as unknown as Offer;
    const e = equivalence(fonds, 40, "rachat");
    expect(e!.line).toContain("FCFA");
    expect(e!.line).toContain("4 230 000");
  });

  it("laisse les lignes cotées à leur propre conversion", () => {
    expect(equivalence({ ...base, kind: "MARCHE" } as unknown as Offer, 1_000_000, "achat")).toBeNull();
  });
});
