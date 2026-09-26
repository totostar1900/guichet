import { describe, expect, it } from "vitest";
import { summarize } from "@/lib/domain/summary";
import type { Offer } from "@/lib/domain/types";

/**
 * Un bon du Trésor ne promet pas son taux.
 *
 * Le taux sort de l'adjudication : l'émetteur ne l'impose pas, et la maison ne
 * le décide pas davantage. La fiche affichait pourtant « à 5,50 % précompté »
 * sur la carte comme dans le tableau, ce qui se lit comme un rendement acquis,
 * alors que le client s'apprête à participer à une enchère dont il ne connaît
 * pas encore le prix. Le mot « si » change tout, et il doit voyager partout où
 * le chiffre paraît : la carte, le partage et le tableau, pas seulement une
 * ligne de sous-titre.
 */
const bta: Offer = {
  id: "b1",
  kind: "BTA",
  operation: "nouvelle_ligne",
  country: "Cameroun",
  countryName: "République du Cameroun",
  issuer: "Trésor public de la République du Cameroun",
  title: "BTA 26 semaines · 24 mars 2027",
  isin: "CM1200002465",
  status: "published",
  blurb: "",
  documents: [],
  opensAt: "2026-09-17T09:00:00",
  deadlineAt: "2099-09-21T09:00:00",
  settleOn: "2026-09-23",
  maturityOn: "2027-03-24",
  lastCouponOn: null,
  nominal: 1_000_000,
  precountRate: 6.97,
  commissionPct: 0,
  minTitles: 1,
  version: 1,
};

describe("le taux d'un bon, avant l'adjudication", () => {
  const avant = summarize({ ...bta, rateNote: "taux indicatif : fixé à l'adjudication" }, new Date("2026-09-18T09:00:00"));

  it("dit « si adjugé » sur la carte et dans le partage, pas seulement en sous-titre", () => {
    expect(avant.heroUnit).toContain("si adjugé à");
    expect(avant.heroSub).toContain("si adjugé à");
  });

  it("porte la mention « indicatif » avec le chiffre", () => {
    expect(avant.heroSub).toContain("(indicatif)");
  });

  it("le dit aussi dans le tableau des chiffres", () => {
    const ligne = avant.ledger?.find((l) => String(l[0]).startsWith("Rendement"));
    expect(String(ligne?.[2])).toContain("si adjugé à");
  });
});

describe("le taux d'un bon, une fois l'adjudication passée", () => {
  // Le desk efface la note en inscrivant le taux servi : le conditionnel tombe.
  const apres = summarize(bta, new Date("2026-09-24T09:00:00"));

  it("dit « adjugé », sans condition ni mention d'indication", () => {
    expect(apres.heroUnit).toContain("adjugé à");
    expect(apres.heroUnit).not.toContain("si adjugé");
    expect(apres.heroSub).not.toContain("(indicatif)");
  });
});

describe("le bon dont personne n'a encore posé de taux", () => {
  it("le dit en toutes lettres plutôt que d'afficher un zéro", () => {
    const sansTaux = summarize({ ...bta, precountRate: undefined }, new Date("2026-09-18T09:00:00"));
    expect(sansTaux.heroUnit).toBe("taux à fixer");
    expect(sansTaux.heroSub).toContain("à fixer par le desk");
  });
});
