import { describe, expect, it } from "vitest";
import type { EmissionNotice } from "@/lib/market/emission-notices";
import { completerDepuisAvis, emissionLines, rembourseInFine } from "@/lib/market/emission-notices";

/**
 * Les modalités d'un emprunt, et ce qu'on refuse d'en faire.
 *
 * Ce document est arrivé tard : nous avons calculé des rendements pendant un
 * mois en supposant un remboursement in fine sans pouvoir le vérifier, et la
 * phrase qui le dit était imprimée depuis le début sur un second communiqué que
 * nous ne ramassions pas. Les règles ci-dessous portent donc moins sur la
 * lecture que sur la prudence : ne rien faire dire à un avis qu'il ne dit pas,
 * et ne jamais moyenner deux avis qui se contredisent.
 */

const a = (over: Partial<EmissionNotice>): EmissionNotice => ({
  id: over.id ?? "n1",
  sourceUrl: `https://beac.int/${over.id ?? "n1"}.pdf`,
  sourceTitle: "Communiqué d'annonce",
  country: "Congo",
  instrument: "OTA",
  sessionOn: "2026-09-22",
  abondement: false,
  remarks: [],
  confirmedBy: "Desk",
  confirmedAt: "2026-09-28T10:00:00Z",
  createdAt: "2026-09-28T10:00:00Z",
  updatedAt: "2026-09-28T10:00:00Z",
  ...over,
});

describe("la mention de remboursement", () => {
  /**
   * La colonne garde la phrase et non un booléen, parce qu'un amortissement
   * s'écrit en une phrase et qu'un oui/non l'aurait déjà jetée.
   */
  it("reconnaît « In fine » quelle que soit la casse ou l'espace", () => {
    expect(rembourseInFine("In fine")).toBe(true);
    expect(rembourseInFine("IN FINE")).toBe(true);
    expect(rembourseInFine("infine")).toBe(true);
  });

  it("dit non, plutôt que peut-être, devant un amortissement décrit", () => {
    expect(rembourseInFine("Amortissement constant après un différé de deux ans")).toBe(false);
  });

  /**
   * Une mention absente n'est pas une mention négative. Un avis dont la ligne
   * « Remboursement » n'a pas été lue ne dit rien, et le dire serait pire que
   * se taire : le calcul choisirait un échéancier sur un silence.
   */
  it("ne tranche pas quand la mention manque", () => {
    expect(rembourseInFine(undefined)).toBeUndefined();
    expect(rembourseInFine("  ")).toBeUndefined();
  });
});

describe("les lignes d'emprunt", () => {
  it("replie plusieurs avis d'un même code en une ligne", () => {
    const [l] = emissionLines([
      a({ id: "x", codeEmission: "CG2K00000187", couponRate: 6.2, maturityOn: "2028-02-01", redemption: "In fine", sessionOn: "2026-08-25" }),
      a({ id: "y", codeEmission: "CG2K00000187", couponRate: 6.2, maturityOn: "2028-02-01", redemption: "In fine", sessionOn: "2026-09-22" }),
    ]);
    expect(l.notices).toHaveLength(2);
    expect(l.couponRate).toBe(6.2);
    expect(l.desaccords).toHaveLength(0);
  });

  /**
   * Deux avis de la même ligne qui ne disent pas la même chose.
   *
   * Aucun des deux n'est plus vrai que l'autre : l'un est mal lu, ou le Trésor
   * s'est contredit, et seule la pièce tranche. Moyenner deux coupons, ou garder
   * le plus récent en silence, fabriquerait un chiffre que personne n'a imprimé.
   */
  it("nomme le désaccord au lieu de choisir", () => {
    const [l] = emissionLines([
      a({ id: "x", codeEmission: "CG2J00000867", couponRate: 6, sessionOn: "2026-08-11" }),
      a({ id: "y", codeEmission: "CG2J00000867", couponRate: 6.5, sessionOn: "2026-09-01" }),
    ]);
    expect(l.desaccords).toEqual([{ champ: "coupon", valeurs: ["6.5", "6"] }]);
  });

  /**
   * Ces modalités nourrissent un rendement, donc une référence donnée à un
   * client : la règle de la maison ne change pas parce que le document change.
   */
  it("ne retient que les avis relus par une personne", () => {
    const lus = [a({ id: "x", codeEmission: "CG2A00000668", couponRate: 5.5, confirmedBy: undefined, confirmedAt: undefined })];
    expect(emissionLines(lus)).toHaveLength(0);
    expect(emissionLines(lus, { confirmedOnly: false })).toHaveLength(1);
  });

  it("laisse de côté un avis dont le code n'a pas été lu", () => {
    expect(emissionLines([a({ id: "x", codeEmission: undefined, couponRate: 6 })])).toHaveLength(0);
  });
});

describe("ce qu'un avis apporte à une séance", () => {
  const lignes = emissionLines([a({ id: "x", codeEmission: "CG2K00000187", couponRate: 6.2, maturityOn: "2028-02-01", redemption: "In fine" })]);

  /**
   * Beaucoup de communiqués de résultats n'impriment pas le coupon. La séance
   * restait alors sans point de courbe, comptée comme un trou, alors que l'avis
   * de la même ligne portait le chiffre.
   */
  it("comble le coupon absent, par le code d'émission", () => {
    const comble = completerDepuisAvis({ codeEmission: "CG2K00000187", couponRate: undefined, maturityOn: undefined }, lignes);
    expect(comble!.couponRate).toBe(6.2);
    expect(comble!.maturityOn).toBe("2028-02-01");
    expect(comble!.depuis.redemption).toBe("In fine");
  });

  /**
   * Les deux pièces viennent du même Trésor, mais c'est le communiqué de
   * résultats qui fait foi sur sa propre séance.
   */
  it("ne remplace jamais ce que la séance porte déjà", () => {
    expect(completerDepuisAvis({ codeEmission: "CG2K00000187", couponRate: 6.5, maturityOn: "2028-03-01" }, lignes)).toBeUndefined();
  });

  it("ne dit rien sans code d'émission, qui est le seul lien entre les deux pièces", () => {
    expect(completerDepuisAvis({ codeEmission: undefined, couponRate: undefined, maturityOn: undefined }, lignes)).toBeUndefined();
    expect(completerDepuisAvis({ codeEmission: "  ", couponRate: undefined, maturityOn: undefined }, lignes)).toBeUndefined();
  });
});
