import { describe, expect, it } from "vitest";
import { cashPosition, CLOSED, mayHold, toRestore, type CashEntry } from "@/lib/domain/cash";
import type { Intent } from "@/lib/domain/types";

/**
 * Le journal des espèces, et le verrou.
 *
 * Deux choses doivent rester vraies quoi qu'il arrive au code. Le journal
 * compte juste, parce qu'il dit ce que la maison doit à chacun. Et le verrou
 * reste fermé par défaut : un argent sans destination doit repartir, parce que
 * le garder ressemble à un dépôt et que la maison n'a pas d'agrément pour en
 * recevoir. Un jour où quelqu'un ouvrirait ce verrou sans y penser, ces
 * assertions le retiennent.
 */
const intent = (id: string, state: Intent["state"]): Intent => ({ id, ref: `PF-${id}`, offerId: "o1", offerVersion: 1, clientName: "X", clientSegment: "Y", type: "ferme", amount: 1, channel: "WhatsApp", state, createdAt: "2026-01-01T00:00:00", updatedAt: "2026-01-01T00:00:00" }) as unknown as Intent;
const entry = (over: Partial<CashEntry>): CashEntry => ({ id: Math.random().toString(36).slice(2), userId: "u1", at: "2026-09-01T10:00:00", amount: 0, kind: "provision", label: "", ...over }) as CashEntry;
const NOW = new Date("2026-09-24T12:00:00Z");

describe("le journal des espèces", () => {
  it("compte les entrées et les sorties dans le bon sens", () => {
    const e = [
      entry({ kind: "provision", amount: 1_000_000, intentId: "i1", dueBy: "2026-10-15" }),
      entry({ kind: "coupon", amount: 272_500 }),
      entry({ kind: "souscription", amount: 900_000 }),
      entry({ kind: "frais", amount: 4_500 }),
    ];
    const p = cashPosition(e, [intent("i1", "recue")], NOW);
    expect(p.balance).toBe(1_000_000 + 272_500 - 900_000 - 4_500);
  });

  it("sépare ce qui attend une opération de ce qui ne va nulle part", () => {
    const e = [
      entry({ kind: "provision", amount: 1_000_000, intentId: "i1", dueBy: "2026-10-15" }),
      // Un coupon tombé n'est affecté à rien : c'est exactement l'argent qui dort.
      entry({ kind: "coupon", amount: 272_500, at: "2026-09-10T08:00:00" }),
    ];
    const p = cashPosition(e, [intent("i1", "recue")], NOW);
    expect(p.assigned).toBe(1_000_000);
    expect(p.idle).toBe(272_500);
    expect(p.idleSince).toBe("2026-09-10T08:00:00");
  });

  it("libère l'argent d'une opération close ou échue", () => {
    const provision = entry({ kind: "provision", amount: 500_000, intentId: "i1", dueBy: "2026-10-15" });
    // L'ordre est annulé : ce que sa provision retenait redevient sans destination.
    expect(cashPosition([provision], [intent("i1", "annulee")], NOW).idle).toBe(500_000);
    // L'ordre vit, mais l'affectation est périmée : même effet.
    const perime = entry({ kind: "provision", amount: 500_000, intentId: "i1", dueBy: "2026-09-01" });
    expect(cashPosition([perime], [intent("i1", "recue")], NOW).idle).toBe(500_000);
  });

  it("ne compte jamais une sortie comme de l'argent qui dort", () => {
    const e = [entry({ kind: "provision", amount: 1_000_000, intentId: "i1", dueBy: "2026-10-15" }), entry({ kind: "souscription", amount: 1_000_000 })];
    const p = cashPosition(e, [intent("i1", "recue")], NOW);
    expect(p.balance).toBe(0);
    expect(p.idle).toBe(0);
  });
});

describe("le verrou de l'argent inoccupé", () => {
  const dormant = [entry({ kind: "coupon", amount: 272_500, at: "2026-09-10T08:00:00" })];

  it("est fermé par défaut : tout ce qui dort repart", () => {
    expect(CLOSED.holdIdle).toBe(false);
    expect(toRestore(dormant, [], CLOSED, NOW)).toBe(272_500);
    // Et par défaut, sans politique nommée, c'est la politique fermée qui s'applique.
    expect(toRestore(dormant, [], undefined, NOW)).toBe(272_500);
  });

  it("garde l'argent affecté, verrou fermé ou non", () => {
    const affecte = [entry({ kind: "provision", amount: 1_000_000, intentId: "i1", dueBy: "2026-10-15" })];
    expect(toRestore(affecte, [intent("i1", "recue")], CLOSED, NOW)).toBe(0);
  });

  it("ouvert, il laisse un délai puis restitue quand même", () => {
    const ouvert = { holdIdle: true, graceDays: 30 };
    // 14 jours depuis le coupon : sous le délai, rien ne repart.
    expect(toRestore(dormant, [], ouvert, NOW)).toBe(0);
    // Quarante jours plus tard, le délai est passé.
    expect(toRestore(dormant, [], ouvert, new Date("2026-10-25T12:00:00Z"))).toBe(272_500);
  });

  it("refuse d'encaisser une provision sans destination", () => {
    // C'est la porte d'entrée : un virement qui ne sert à rien ne s'accepte pas.
    expect(mayHold({ kind: "provision" }, CLOSED)).toBe(false);
    expect(mayHold({ kind: "provision", intentId: "i1" }, CLOSED)).toBe(true);
    expect(mayHold({ kind: "provision" }, { holdIdle: true, graceDays: 30 })).toBe(true);
    // Une sortie n'a rien à demander à personne.
    expect(mayHold({ kind: "souscription" }, CLOSED)).toBe(true);
  });
});
