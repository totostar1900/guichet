import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dernierMouvement, echangesDeLaSeance } from "@/lib/market/echanges";

/** Ce que « indexPageData » passe : séance → ce qui s'y est échangé. */
interface Echange {
  titles: number;
  amount: number;
  trades: number;
  shares: Record<string, { titles: number }>;
}

/**
 * QUAND LE COURS NE BOUGE PAS, IL RESTE DEUX CHOSES À DIRE.
 *
 * Mesuré sur la production le 5 octobre 2026 : l'indice bouge sur 70 des 271
 * séances lues, et sur 1 733 couples action-séance le cours ne change que dans
 * 79. Une page bâtie sur la variation du jour affiche donc des zéros trois
 * fois sur quatre. La date du dernier mouvement et ce qui s'est échangé sont
 * dans la base depuis le premier jour.
 */
describe("ce qui s'est échangé, et quand le cours a bougé", () => {
  /* Le seuil est celui de l'affichage : « 0,004 % » s'écrit « 0,00 % », donc
     le lecteur n'a rien vu bouger, et le dater serait lui mentir. */
  it("ne retient pas un mouvement que l'écran arrondit à zéro", () => {
    expect(dernierMouvement([{ sessionDate: "2026-09-10", variationPct: 1.2 }, { sessionDate: "2026-09-30", variationPct: 0.004 }])).toBe("2026-09-10");
  });

  it("donne la dernière séance qui a bougé, et non la dernière séance", () => {
    const q = [
      { sessionDate: "2026-07-15", variationPct: -2.5 },
      { sessionDate: "2026-09-30", variationPct: 0 },
      { sessionDate: "2026-10-01", variationPct: 0 },
    ];
    expect(dernierMouvement(q)).toBe("2026-07-15");
    expect(dernierMouvement([{ sessionDate: "2026-10-01", variationPct: 0 }])).toBeUndefined();
  });

  /* Le cas mesuré sur la BVMAC : SOCAP a vu 877 titres changer de mains le
     1er octobre, et son cours n'avait pas bougé depuis le 15 juillet. */
  it("compte une ligne servie même quand son cours n'a pas bougé", () => {
    const trading = new Map<string, Echange>([
      ["2026-10-01", { titles: 1371, amount: 53_567_500, trades: 8, shares: { BHC: { titles: 4 }, SOCAP: { titles: 877 }, SCGRE: { titles: 490 }, SEMC: { titles: 0 } } }],
    ]);
    const e = echangesDeLaSeance(trading, "2026-10-01", 7)!;
    expect(e.lignes).toBe(3);
    expect(e.cotees).toBe(7);
    expect(e.servies.map((x) => x.mnemo)).toEqual(["SOCAP", "SCGRE", "BHC"]);
  });

  it("donne au montant l'échelle du mois, séance comprise", () => {
    const trading = new Map<string, Echange>([
      ["2026-08-20", { titles: 10, amount: 9_000_000, trades: 1, shares: {} }],
      ["2026-09-15", { titles: 10, amount: 50_000_000, trades: 4, shares: {} }],
      ["2026-10-01", { titles: 1371, amount: 50_000_000, trades: 8, shares: { BHC: { titles: 4 } } }],
    ]);
    const e = echangesDeLaSeance(trading, "2026-10-01", 7)!;
    /* Le 20 août est hors fenêtre : sans cette borne, l'échelle serait celle
       de toute l'histoire lue, et la part de la séance tendrait vers zéro. */
    expect(e.fenetreSeances).toBe(2);
    expect(e.fenetreMontant).toBe(100_000_000);
    expect(e.part).toBe(50);
  });

  /* Zéro sur zéro s'afficherait « 0 % », qui est une affirmation. */
  it("ne donne aucune part quand rien ne s'est échangé", () => {
    const trading = new Map<string, Echange>([["2026-10-01", { titles: 0, amount: 0, trades: 0, shares: { BHC: { titles: 0 } } }]]);
    const e = echangesDeLaSeance(trading, "2026-10-01", 7)!;
    expect(e.lignes).toBe(0);
    expect(e.part).toBeUndefined();
  });

  /* La promesse de ce lot : deux lectures de plus, aucune requête de plus. */
  it("n'ajoute aucune lecture à la page du marché", () => {
    const page = readFileSync(join(process.cwd(), "src/app/marche/page.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(page, "la page lit « indexPageData », et rien d'autre").not.toMatch(/\brepo\(\)/);
    expect(page).toContain("echangesDeLaSeance(");
    expect(page).toContain("dernierMouvement(");
  });
});
