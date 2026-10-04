import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fmt, parseAmount } from "@/lib/format";
import { groupDigits, regroup } from "@/lib/ui/grouped";

/**
 * Un montant groupé à l'écran doit se relire sur le serveur.
 *
 * LE PIÈGE, ET IL EST SILENCIEUX. Les champs de montant séparent maintenant les
 * milliers pendant la frappe, donc le formulaire envoie « 10 000 » et non
 * « 10000 ». Un `z.coerce.number()` en fait un NaN : le formulaire serait refusé
 * avec « Saisie invalide » pour un montant parfaitement bien tapé, et personne ne
 * verrait pourquoi. C'est exactement la panne qui ne se nomme pas.
 *
 * La convention de la maison est celle de l'intention : le schéma prend une
 * CHAÎNE, et `parseAmount` la lit en retirant tout ce qui n'est pas un chiffre.
 * Ce cliquet tient les deux bouts ensemble, le format posé et le format relu.
 */
/* L'espace insécable ordinaire, U+00A0, celle que pose « fmt » depuis le
   4 octobre 2026. Écrite par son code et non tapée : à l'oeil elle ne se
   distingue pas d'une espace ordinaire, et un test qui compare deux espaces
   différentes échoue en montrant deux chaînes identiques.
   La fine, U+202F, est celle que « Intl » emploie et que la maison a quittée :
   à 11 px elle ne se voyait pas, et « 9 059 000 » se lisait « 9059000 ». */
const espace = " ";
const espaceFine = " ";

describe("ce que le champ écrit", () => {
  it("sépare les milliers avec l'espace que pose « fmt »", () => {
    expect(groupDigits("10000000")).toBe(`10${espace}000${espace}000`);
    // Et surtout : la MÊME que l'affichage, sinon le champ et la carte se
    // contrediraient à l'oeil sur le même montant.
    expect(groupDigits("10000000")).toBe(fmt(10_000_000));
    expect(groupDigits("10000000")).not.toContain(espaceFine);
  });

  it("ne groupe pas en deçà du millier", () => {
    expect(groupDigits("999")).toBe("999");
  });

  it("ignore ce qui n'est pas un chiffre pendant la frappe", () => {
    expect(regroup("10a0b0c0")).toBe(`10${espace}000`);
  });
});

describe("ce que le serveur relit", () => {
  it("retrouve le nombre derrière les espaces fines", () => {
    expect(parseAmount(groupDigits("10000000"))).toBe(10_000_000);
  });

  it("retrouve le nombre derrière une espace ordinaire, celle d'un copier-coller", () => {
    expect(parseAmount("10 000 000")).toBe(10_000_000);
  });

  it("rend zéro sur un champ vide, plutôt que NaN", () => {
    expect(parseAmount("")).toBe(0);
    expect(parseAmount(undefined)).toBe(0);
  });

  it("fait l'aller-retour pour une poignée de montants", () => {
    for (const n of [0, 1, 999, 1000, 50_000, 1_234_567, 999_999_999]) {
      expect(parseAmount(groupDigits(String(n)))).toBe(n);
    }
  });
});

describe("pourquoi le schéma ne coerce plus", () => {
  it("z.coerce.number() casse sur un montant groupé, et c'est la raison du changement", () => {
    /* Ce cas est gardé pour que personne ne remette le coerce en pensant
       simplifier : il échoue, et il échoue en silence côté écran. */
    expect(z.coerce.number().safeParse("10 000").success).toBe(false);
    expect(z.string().min(1).safeParse("10 000").success).toBe(true);
  });
});
