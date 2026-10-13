import { describe, expect, it } from "vitest";
import type { MarketBulletin } from "@/lib/domain/market";
import { construireRapport, diagnostic } from "@/lib/market/rapport-fournisseur";

/**
 * LE RELEVÉ DE QUALITÉ DES DONNÉES DU BOC.
 *
 * Les deux premiers tests gardent deux défauts trouvés EN OUVRANT le premier
 * rapport, et non en relisant le code : c'est la raison d'être de ce fichier.
 */

const seance = (sessionDate: string, p: Partial<MarketBulletin>): MarketBulletin =>
  ({ id: sessionDate, number: 0, sessionDate, ingestedAt: "", ingestedBy: "desk", status: "ok", counts: { equities: 0, bonds: 0, funds: 0 }, warnings: [], anomalies: [], notices: [], notes: [], ...p }) as MarketBulletin;

const X = "OPCVM FCP ECOBANK OBLIGATAIRE CEMAC : date au format Excel convertie, « 46 120,00 » lu 08/04/2026 (variation imprimée 0,14% vérifiée).";
const L1935 = "OPCVM FCP AB CASH : VL du 1936-01-10 ignorée : elle est antérieure à la séance de plus de quatre cents jours.";

describe("le relevé au fournisseur", () => {
  it("compte une phrase une seule fois, même rangée deux fois", () => {
    /* MESURÉ EN OUVRANT LE PREMIER RAPPORT : les 65 conversions de date
       paraissaient 189 fois sous « corrigée » au lieu de 124. Le lecteur
       consigne le même message dans les deux listes, remarques et notes,
       chacune pour son usage : deux rangements d'un seul fait. Un rapport qui
       double ses chiffres ne vaut rien, et rien dans un total ne l'aurait
       trahi. */
    const b = seance("2026-04-29", { warnings: [X], notes: [{ message: X }] });
    const r = construireRapport([b], "2026-01-01", "2026-12-31");
    expect(r.remarques).toBe(1);
    expect(r.corrections).toHaveLength(1);
  });

  it("montre la cellule imprimée même quand rien n'a été réparé", () => {
    /* L'AUTRE DÉFAUT DU PREMIER RAPPORT. La colonne « imprimé » ne se
       remplissait que sur les corrections, donc les lignes les plus graves,
       celles où une valeur liquidative sort au format date, affichaient un
       tiret à l'endroit exact qui désigne la cellule fautive. Sans elle, le
       destinataire ne peut pas retrouver sa cellule, et la ligne ne sert à
       rien. */
    const r = construireRapport([seance("2026-07-10", { warnings: [L1935] })], "2026-01-01", "2026-12-31");
    expect(r.publication).toHaveLength(1);
    expect(r.publication[0].imprime).toBe("1936-01-10");
    expect(r.publication[0].objet).toBe("FCP AB CASH");
  });

  it("n'accuse le document que de ce qui se prouve par lui-même", () => {
    /* La feuille des erreurs de publication part chez un tiers : son seuil
       est volontairement haut. Une rangée illisible est notre limite et n'y
       figure pas ; une valeur liquidative imprimée au format date y figure,
       parce que le document se contredit lui-même. */
    const illisible = "OPCVM : ligne ignorée (format inattendu), jeté « … » avant « … »";
    const dateFuture = "OPCVM FCP KORI SERENITE : VL du 2029-03-13 ignorée : elle est postérieure à la séance de plus de sept jours.";
    const r = construireRapport([seance("2026-03-16", { warnings: [illisible, dateFuture, L1935, X] })], "2026-01-01", "2026-12-31");
    expect(r.publication.map((l) => l.code).sort()).toEqual(["L", "X"]);
    expect(r.perdues.map((l) => l.code)).toEqual(["M"]);
    expect(r.ecartees.map((l) => l.code).sort()).toEqual(["L", "L"]);
  });

  it("sépare ce qui est en base de ce qui manque", () => {
    const r = construireRapport([seance("2026-04-29", { warnings: [X, "FCP RAPEC : VL 11 310 vs 10 000 précédente (> 10 %)."] })], "2026-01-01", "2026-12-31");
    const ecrites = r.parSort.filter((s) => s.ecrite).reduce((a, s) => a + s.remarques, 0);
    expect(ecrites).toBe(2);
    expect(r.parSort.find((s) => s.sort === "corrigee")?.remarques).toBe(1);
    expect(r.parSort.find((s) => s.sort === "telle_quelle")?.remarques).toBe(1);
  });

  it("ne retient que les séances de la plage", () => {
    const lot = [seance("2025-12-31", { warnings: [X] }), seance("2026-01-01", { warnings: [X] }), seance("2026-12-31", { warnings: [X] }), seance("2027-01-01", { warnings: [X] })];
    expect(construireRapport(lot, "2026-01-01", "2026-12-31").seances).toBe(2);
  });

  it("parle au destinataire, pas en codes de famille", () => {
    /* « Famille L » ne veut rien dire chez celui qui publie le bulletin ;
       « une valeur liquidative est imprimée au format date » envoie son
       informaticien au bon endroit de son tableur. */
    expect(diagnostic(L1935)).toMatch(/VALEUR LIQUIDATIVE est imprimée au format DATE/);
    expect(diagnostic(X)).toMatch(/numéro de série du tableur/);
    for (const m of [X, L1935]) expect(diagnostic(m)).not.toMatch(/famille|code/i);
  });
});
