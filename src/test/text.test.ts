import { describe, expect, it } from "vitest";
import { fold, textMatch } from "@/lib/text";

/** Every search box compares without accents or case. */
describe("fold", () => {
  it("drops accents and case", () => {
    expect(fold("État du Congo · Échéance")).toBe("etat du congo · echeance");
    expect(textMatch("etat", "État du Congo")).toBe(true);
    expect(textMatch("ÉCHÉANCE", "echeance exacte")).toBe(true);
    expect(textMatch("tresor", "Trésor public")).toBe(true);
    expect(textMatch("xyz", "Trésor public")).toBe(false);
  });
});
