import { describe, expect, it } from "vitest";
import { fluxDeLaBande } from "@/components/Reinvest";
import { cleDuFlux } from "@/lib/domain/encaissement";
import type { CashEntry } from "@/lib/domain/cash";
import type { Position } from "@/lib/positions";

/**
 * « Reçu » et « échu » ne se disent pas dans la même bande.
 *
 * Elle disait « échu » pour tout, faute de savoir. Elle sait maintenant, et ce
 * qu'elle ne doit plus jamais faire est de confondre les deux : proposer de
 * replacer un argent qui n'est pas arrivé serait mentir, et additionner les
 * deux sommes perdrait exactement ce que le journal vient d'apporter.
 */

const NOW = new Date("2026-09-29T10:00:00Z");

const position = (id: string, paid: { date: string; amount: number; label: string }[]): Position =>
  ({ intent: { id }, offer: { title: `Ligne ${id}` }, paid, flows: [] }) as unknown as Position;

const recu = (intentId: string, f: { date: string; amount: number; label: string }): CashEntry => ({
  id: `c-${intentId}-${f.date}`,
  userId: "u1",
  at: `${f.date}T12:00:00Z`,
  amount: f.amount,
  kind: "coupon",
  label: f.label,
  flowKey: cleDuFlux(intentId, f),
});

const COUPON = { date: "2026-09-01", amount: 180_000, label: "Coupon" };

describe("ce que la bande sépare", () => {
  it("compte comme attendu ce que le journal ignore", () => {
    const { recus, attendus } = fluxDeLaBande([position("A", [COUPON])], [], 120, NOW);
    expect(recus).toEqual([]);
    expect(attendus).toHaveLength(1);
    expect(attendus[0].retardJours).toBe(28);
  });

  it("le fait passer en reçu dès qu'un mouvement le porte", () => {
    const { recus, attendus } = fluxDeLaBande([position("A", [COUPON])], [recu("A", COUPON)], 120, NOW);
    expect(attendus).toEqual([]);
    expect(recus).toHaveLength(1);
  });

  it("ne mélange pas deux lignes dont une seule est arrivée", () => {
    /* C'est le cas qui compte : un bouton « replacer » posé sur la somme des
       deux engagerait un argent que la maison n'a pas reçu. */
    const autre = { date: "2026-08-15", amount: 90_000, label: "Coupon" };
    const { recus, attendus } = fluxDeLaBande([position("A", [COUPON]), position("B", [autre])], [recu("A", COUPON)], 120, NOW);
    expect(recus.map((f) => f.titre)).toEqual(["Ligne A"]);
    expect(attendus.map((f) => f.titre)).toEqual(["Ligne B"]);
  });
});

describe("la fenêtre et ses bords", () => {
  it("ne signale pas en retard un flux du jour même", () => {
    /* Il n'a pas encore pu atteindre le compte du client : le dire en retard
       ferait passer l'application pour mal informée, ce qu'elle serait. */
    const aujourdHui = { date: "2026-09-29", amount: 50_000, label: "Coupon" };
    expect(fluxDeLaBande([position("A", [aujourdHui])], [], 120, NOW).attendus).toEqual([]);
  });

  it("oublie ce qui est trop ancien pour être encore une occasion", () => {
    const vieux = { date: "2026-01-10", amount: 50_000, label: "Coupon" };
    expect(fluxDeLaBande([position("A", [vieux])], [], 120, NOW).attendus).toEqual([]);
    expect(fluxDeLaBande([position("A", [vieux])], [], 365, NOW).attendus).toHaveLength(1);
  });

  it("écarte un flux nul, et ne s'émeut pas d'un portefeuille vide", () => {
    expect(fluxDeLaBande([position("A", [{ date: "2026-09-01", amount: 0, label: "Coupon" }])], [], 120, NOW).attendus).toEqual([]);
    expect(fluxDeLaBande([], [], 120, NOW)).toEqual({ recus: [], attendus: [] });
    expect(fluxDeLaBande([position("A", [])], [], 120, NOW)).toEqual({ recus: [], attendus: [] });
  });

  it("range du plus récent au plus ancien", () => {
    const a = { date: "2026-09-01", amount: 10_000, label: "Coupon" };
    const b = { date: "2026-07-01", amount: 20_000, label: "Coupon" };
    const { attendus } = fluxDeLaBande([position("A", [b, a])], [], 120, NOW);
    expect(attendus.map((f) => f.date)).toEqual(["2026-09-01", "2026-07-01"]);
  });
});
