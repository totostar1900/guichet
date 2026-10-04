import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * UN CHAMP VIDE N'EST PAS UN PRIX.
 *
 * La page des résultats montre désormais toute séance close, qu'elle porte un
 * ordre client ou non : c'était la correction du 4 octobre 2026, puisque le
 * prix servi d'une séance est un fait de marché et ne dépend pas de ce que la
 * maison y avait placé.
 *
 * MAIS CETTE OUVERTURE A MIS DANS LE MÊME BOUTON des lignes qui ont leur
 * dépouillement et des lignes qui n'en ont pas. Les secondes seraient parties
 * au prix ANNONCÉ par le desk, c'est-à-dire à une hypothèse présentée comme un
 * résultat, et ce prix se recopie ensuite dans un avis d'allocation, dans une
 * position client et sur une courbe. C'est exactement l'invention que le
 * rapprochement refuse par ailleurs, revenue par la porte de derrière.
 *
 * Le défaut n'a jamais atteint la production : il a vécu une heure, entre deux
 * commits du même jour. Le cliquet reste, parce que la prochaine ouverture de
 * cette page posera la même question.
 */
describe("une ligne sans dépouillement ne part pas au prix annoncé", () => {
  const action = readFileSync("C:/dev/guichet/src/app/desk/resultats/actions.ts", "utf8");
  const page = readFileSync("C:/dev/guichet/src/app/desk/resultats/page.tsx", "utf8");

  it("le bouton saute une ligne sans chiffre et sans ordre", () => {
    expect(action).toContain("if (vide(price) && vide(rate) && allocations.length === 0) continue;");
  });

  it("une ligne qui porte des ordres garde son défaut", () => {
    /* L'allocation doit pouvoir s'appliquer même quand le prix annoncé tient
       lieu de prix servi : c'est le fonctionnement d'avant, et le desk compte
       dessus. La condition exige donc les trois à la fois. */
    expect(action).toMatch(/allocations\.length === 0\) continue;/);
    expect(page).toContain("l.transmitted.length > 0 ?");
  });

  it("le champ reste vide quand rien n'est proposable", () => {
    // Un champ pré-rempli se valide sans se lire : c'est tout le danger.
    expect(page).toContain("(l.o.kind === \"BTA\" ? prop?.tauxPct : prop?.prixPct) ??");
    const forms = readFileSync("C:/dev/guichet/src/app/desk/resultats/Forms.tsx", "utf8");
    expect(forms).toContain("defaultValue={l.proposed ?? \"\"}");
    expect(forms).toContain("en attente du communiqué");
  });
});
