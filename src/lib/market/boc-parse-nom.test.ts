import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseBoc } from "./boc-parse";

/**
 * LE NOM DE L'ÉMETTEUR AVALAIT LA LIGNE DE LA VALEUR D'AVANT.
 *
 * De mai à novembre 2025, le bulletin coupe chaque action en trois lignes (le
 * cours précédent, la date, puis tout le reste collé). Le nom de l'émetteur se
 * lit en remontant depuis la ligne de l'ISIN, et la remontée s'arrêtait sur
 * une ligne faite UNIQUEMENT de chiffres. Or la ligne dense de la valeur
 * précédente porte son statut en lettres (« NC », « PEq ») : elle n'était donc
 * pas reconnue comme un nombre, et elle entrait dans le nom.
 *
 * Résultat en base, mesuré le 5 octobre 2026 : 525 cotations dont l'émetteur
 * s'appelle « 2230000NC26 50026 50029 15023 8500,00%… SOCIETE CAMEROUNAISE DE
 * PALMERAIE », dont 105 pour SOCAPALM. Rien n'échoue, et ce nom s'affiche.
 *
 * Un nom d'émetteur ne commence jamais par un chiffre : c'est la règle qui
 * arrête la remontée.
 */
const text = readFileSync(new URL("./__fixtures__/BOC-20250701.txt", import.meta.url), "utf8");
const boc = parseBoc(text);

describe("BOC du 01/07/2025, la ligne éclatée en trois", () => {
  it("lit les six actions", () => {
    expect(boc.equities.map((e) => e.mnemo)).toEqual(["SEMC", "SAF", "SOCAP", "REG", "BANGE", "SCGRE"]);
  });

  it("ne fait commencer aucun nom d'émetteur par un chiffre", () => {
    const sales = boc.equities.filter((e) => /^\d/.test(e.issuer)).map((e) => `${e.mnemo} : ${e.issuer.slice(0, 60)}`);
    expect(sales, "le nom a avalé la ligne de cours de la valeur précédente").toEqual([]);
  });

  it("donne à SOCAPALM son nom, et rien d'autre", () => {
    const socap = boc.equities.find((e) => e.mnemo === "SOCAP")!;
    expect(socap.issuer).toBe("SOCIETE CAMEROUNAISE DE PALMERAIE");
    expect(socap.close).toBe(45000);
  });
});
