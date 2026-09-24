import { describe, expect, it } from "vitest";
import { groupDigits, regroup } from "@/lib/ui/grouped";
import { parseAmount, parseUnits } from "@/lib/format";

/**
 * Les milliers, pendant la frappe.
 *
 * Les champs de montant ne groupaient qu'au départ du curseur : on tapait
 * « 10000000 » et on ne voyait « 10 000 000 » qu'après avoir quitté la case.
 * C'est pourtant pendant la frappe qu'on compte les zéros, et là qu'on se
 * trompe d'un facteur dix.
 *
 * Ce qui suit tient la condition qui rend l'affaire sûre : quoi qu'on écrive
 * dans le champ, les analyseurs de l'application doivent y relire le nombre
 * qu'on a voulu. Un séparateur qui casserait la relecture ferait partir un
 * ordre à côté.
 */
describe("grouper un montant", () => {
  it("pose une espace tous les trois chiffres", () => {
    expect(groupDigits("1")).toBe("1");
    expect(groupDigits("100")).toBe("100");
    expect(groupDigits("1000")).toBe("1 000");
    expect(groupDigits("10000000")).toBe("10 000 000");
  });

  it("ne passe pas par un nombre, donc ne perd rien sur les très grands", () => {
    // 2^53 est dépassé : un aller-retour par Number arrondirait.
    expect(groupDigits("9007199254740993")).toBe("9 007 199 254 740 993");
  });

  it("ignore ce qui n'est pas un chiffre", () => {
    expect(regroup("10 000 000")).toBe("10 000 000");
    expect(regroup("10.000,00 FCFA")).toBe("1 000 000");
    expect(regroup("")).toBe("");
    expect(regroup("abc")).toBe("");
  });

  it("garde les décimales des parts de fonds, et n'en groupe que l'entier", () => {
    expect(regroup("1234,5", true)).toBe("1 234,5");
    expect(regroup("1234.567", true)).toBe("1 234,567");
    // Trois décimales au plus : c'est le pas d'une part au registre.
    expect(regroup("1,23456", true)).toBe("1,234");
    expect(regroup(",5", true)).toBe(",5");
  });

  it("se relit par les analyseurs de l'application", () => {
    // La condition qui compte : ce que le champ montre doit rendre le nombre
    // qu'on a tapé, sans quoi un ordre partirait à côté.
    expect(parseAmount(regroup("10000000"))).toBe(10_000_000);
    expect(parseAmount(regroup("1 000 000"))).toBe(1_000_000);
    expect(parseUnits(regroup("1234,567", true))).toBe(1234.567);
    expect(parseUnits(regroup("1234", true))).toBe(1234);
  });
});
