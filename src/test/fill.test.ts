import { describe, expect, it } from "vitest";
import { deskFills } from "@/lib/market/fill";
import type { Intent } from "@/lib/domain/types";

/**
 * Le taux de service, et ce qu'il refuse de compter.
 *
 * Un taux se déshonore de deux façons. En comptant au dénominateur ce qui n'est
 * pas tranché : un ordre en cours n'est ni servi ni non servi, et l'y mettre
 * ferait bouger le chiffre au fil de la journée sans qu'il se soit rien passé.
 * Et en s'affichant sur un seul cas, où il ne dit rien du tout.
 */
const order = (offerId: string, state: Intent["state"]): Intent => ({ id: `${offerId}-${state}-${Math.random()}`, ref: "PF-0000-000", offerId, offerVersion: 1, clientName: "X", clientSegment: "Y", type: "achat", amount: 100, channel: "WhatsApp", state, createdAt: "2026-01-01T00:00:00", updatedAt: "2026-01-01T00:00:00" }) as unknown as Intent;

describe("le taux de service du desk", () => {
  it("ne compte que les ordres tranchés", () => {
    const f = deskFills([order("a", "servie"), order("a", "non_servie"), order("a", "recue"), order("a", "transmise")]).get("a")!;
    expect(f.total).toBe(4);
    expect(f.open).toBe(2);
    // Deux tranchés, un servi : la moitié, et les deux en cours n'y sont pour rien.
    expect(f.rate).toBe(0.5);
  });

  it("compte « réglée » comme servie, et « annulée » à part", () => {
    // Un ordre réglé a bien été exécuté : s'arrêter à « servie » oublierait
    // tous ceux que le règlement a fait avancer d'un cran.
    const f = deskFills([order("b", "reglee"), order("b", "annulee")]).get("b")!;
    expect(f.served).toBe(1);
    expect(f.closed).toBe(1);
    // Une clôture sans suite n'est pas un échec d'exécution : hors dénominateur.
    expect(f.rate).toBe(1);
  });

  it("n'invente pas de taux sans ordre tranché", () => {
    const f = deskFills([order("c", "recue"), order("c", "confirmee")]).get("c")!;
    expect(f.rate).toBeUndefined();
    expect(f.total).toBe(2);
  });

  it("sépare les lignes", () => {
    const m = deskFills([order("d", "servie"), order("e", "non_servie")]);
    expect(m.get("d")!.rate).toBe(1);
    expect(m.get("e")!.rate).toBe(0);
    expect(m.has("f")).toBe(false);
  });
});
