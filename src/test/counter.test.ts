import { describe, expect, it } from "vitest";
import { counterLapsed, counterTerms, counterText, defaultUntil } from "@/lib/domain/counter";
import { nextStates } from "@/lib/domain/intent";
import type { Intent, Offer } from "@/lib/domain/types";

/**
 * La contre-proposition : ce qu'elle dit, et ce qu'elle ne permet pas.
 *
 * Deux règles tiennent l'objet, et ce sont elles qu'on vérifie : une
 * proposition a une fin, et elle ne se transmet jamais sans le oui du client.
 */
const offer = { id: "o1", kind: "MARCHE", instrument: "action", title: "BHC", nominal: 10000, deadlineAt: undefined } as unknown as Offer;
const bond = { id: "o2", kind: "MARCHE", instrument: "obligation", title: "OTA 6,5 %", nominal: 10000 } as unknown as Offer;
const intent = { id: "i1", ref: "PF-0914-K7Q4", amount: 100, limitPrice: 90000, state: "recue", type: "achat" } as unknown as Intent;

describe("la contre-proposition", () => {
  it("ne nomme que ce qui change", () => {
    // Répéter les conditions inchangées noierait la seule information qui compte.
    expect(counterTerms({ amount: 40, until: "", by: "", at: "" }, intent, offer)).toBe("40 actions au lieu de 100");
    // fmt() separe les milliers par une espace insecable etroite, comme le francais le veut
    const price = counterTerms({ limitPrice: 85000, until: "", by: "", at: "" }, intent, offer).replace(/ /g, " ");
    expect(price).toBe("85 000 FCFA au lieu de 90 000 FCFA");
    const both = counterTerms({ amount: 40, limitPrice: 85000, until: "", by: "", at: "" }, intent, offer);
    expect(both).toContain("40 actions");
    expect(both.replace(/ /g, " ")).toContain("85 000 FCFA");
  });

  it("dit le prix comme la ligne le cote", () => {
    // Une obligation se cote en pourcentage du nominal, une action en francs.
    expect(counterTerms({ limitPrice: 98.5, until: "", by: "", at: "" }, { ...intent, limitPrice: 101 } as Intent, bond)).toMatch(/du nominal/);
  });

  it("porte son échéance dans la phrase du client", () => {
    const c = { amount: 40, until: new Date("2026-10-01T12:00:00Z").toISOString(), by: "Op", at: "" };
    const said = counterText(c, intent, offer);
    expect(said).toContain("40 actions au lieu de 100");
    expect(said).toContain("PF-0914-K7Q4");
    // Ce qui arrive si le client ne répond pas doit être dit, pas deviné.
    expect(said).toMatch(/revient tel qu/);
  });

  it("expire", () => {
    const past = { until: new Date(Date.now() - 1000).toISOString(), by: "", at: "" };
    const future = { until: new Date(Date.now() + 3_600_000).toISOString(), by: "", at: "" };
    expect(counterLapsed(past)).toBe(true);
    expect(counterLapsed(future)).toBe(false);
  });

  it("ne survit pas à la clôture de la ligne", () => {
    const soon = new Date(Date.now() + 3_600_000).toISOString();
    const until = defaultUntil({ ...offer, deadlineAt: soon } as Offer);
    expect(until).toBe(soon);
  });

  it("ne se transmet jamais sans le oui du client", () => {
    // C'est une offre que nous faisons : son acceptation la transforme en ordre.
    expect(nextStates("contre_proposee", "achat")).not.toContain("transmise");
    expect(nextStates("contre_proposee", "achat")).toEqual(["confirmee", "recue", "annulee"]);
  });

  it("se propose depuis un ordre reçu ou confirmé", () => {
    expect(nextStates("recue", "achat")).toContain("contre_proposee");
    expect(nextStates("confirmee", "ferme")).toContain("contre_proposee");
    // Un ordre déjà transmis au marché ne se renégocie plus ici.
    expect(nextStates("transmise", "achat")).not.toContain("contre_proposee");
  });
});
