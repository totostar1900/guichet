import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { alignerSurLaCloture } from "@/lib/domain/cote-alignee";
import type { Quote } from "@/lib/domain/market";
import type { Offer } from "@/lib/domain/types";

const offre = (o: Partial<Offer>) => ({ id: "x", ...o }) as Offer;
const cours = (isin: string, sessionDate: string, close: number) => ({ isin, sessionDate, close }) as Quote;

describe("le dernier prix d'une ligne cotée est sa dernière clôture", () => {
  const quotes = [cours("GA1", "2026-10-01", 97_000), cours("GA1", "2026-09-29", 90_000), cours("GA1", "2026-09-30", 91_000)];

  it("recopie la clôture la plus récente, quel que soit l'ordre des séances", () => {
    const o = offre({ market: "BVMAC", instrument: "action", isin: "GA1", lastPrice: 90_000, lastPriceOn: "2026-09-29" });
    alignerSurLaCloture([o], quotes);
    expect([o.lastPrice, o.lastPriceOn]).toEqual([97_000, "2026-10-01"]);
  });

  it("ne touche ni une offre primaire, ni une ligne sans cote, ni une obligation", () => {
    const primaire = offre({ market: undefined, instrument: "action", isin: "GA1", lastPrice: 1 });
    const sansCote = offre({ market: "BVMAC", instrument: "action", isin: "ZZ9", lastPrice: 2 });
    const obligation = offre({ market: "Trésor secondaire", instrument: "obligation", isin: "GA1", lastPrice: 3 });
    alignerSurLaCloture([primaire, sansCote, obligation], quotes);
    expect([primaire.lastPrice, sansCote.lastPrice, obligation.lastPrice]).toEqual([1, 2, 3]);
  });

  it("le dépôt mémoire l'applique une fois par magasin", () => {
    const src = readFileSync("src/lib/data/memory.ts", "utf8");
    expect(src).toMatch(/alignerSurLaCloture\(g\.__guichetStore\.offers, g\.__guichetStore\.quotes\)/);
  });
});
