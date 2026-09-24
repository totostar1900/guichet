import { describe, expect, it } from "vitest";
import { recentlyPaid } from "@/components/Reinvest";
import type { Position } from "@/lib/positions";

/**
 * Ce que le rappel de réinvestissement montre, et ce qu'il se garde de montrer.
 *
 * Deux erreurs le rendraient nuisible plutôt qu'utile. Rappeler un coupon tombé
 * le matin même, alors qu'il n'a pas encore atteint la banque du client : la
 * maison passerait pour mal informée, ce qu'elle serait, puisqu'elle ne connaît
 * que la date d'échéance et non l'arrivée. Et ressortir un coupon d'il y a deux
 * ans, depuis longtemps dépensé, qui ferait du rappel un bruit qu'on apprend à
 * ignorer.
 */
const position = (title: string, paid: { date: string; amount: number; label: string }[]): Position => ({ offer: { title }, paid, flows: [] }) as unknown as Position;
const NOW = new Date("2026-09-24T12:00:00Z");

describe("le rappel de réinvestissement", () => {
  it("retient les flux échus dans la fenêtre, le plus récent d'abord", () => {
    const p = [
      position("OTA 6,5 % 2029", [
        { date: "2026-09-01", amount: 272_500, label: "Coupon" },
        { date: "2026-07-15", amount: 100_000, label: "Coupon" },
      ]),
      position("ECMR 7,25 %", [{ date: "2026-08-10", amount: 50_000, label: "Coupon" }]),
    ];
    const out = recentlyPaid(p, 120, NOW);
    expect(out.map((f) => f.date)).toEqual(["2026-09-01", "2026-08-10", "2026-07-15"]);
    expect(out[0].title).toBe("OTA 6,5 % 2029");
  });

  it("ignore un flux du jour même : l'échéance n'est pas l'arrivée", () => {
    const p = [position("X", [{ date: "2026-09-24", amount: 10_000, label: "Coupon" }])];
    expect(recentlyPaid(p, 120, NOW)).toEqual([]);
    // La veille, en revanche, a eu le temps d'arriver.
    expect(recentlyPaid([position("X", [{ date: "2026-09-23", amount: 10_000, label: "Coupon" }])], 120, NOW)).toHaveLength(1);
  });

  it("oublie ce qui est ancien", () => {
    // Un coupon d'il y a cinq mois est dépensé : le rappeler serait du bruit.
    const p = [position("X", [{ date: "2026-04-01", amount: 10_000, label: "Coupon" }])];
    expect(recentlyPaid(p, 120, NOW)).toEqual([]);
    expect(recentlyPaid(p, 365, NOW)).toHaveLength(1);
  });

  it("ne retient pas un montant nul", () => {
    expect(recentlyPaid([position("X", [{ date: "2026-09-01", amount: 0, label: "Coupon" }])], 120, NOW)).toEqual([]);
  });

  it("ne dit rien sans position", () => {
    expect(recentlyPaid([], 120, NOW)).toEqual([]);
    expect(recentlyPaid([position("X", [])], 120, NOW)).toEqual([]);
  });
});
