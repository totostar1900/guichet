import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NiveauEtPrix } from "@/app/desk/a-valider/NiveauEtPrix";
import { bondCalc, btaCalc } from "@/lib/finance";
import type { NiveauMarche } from "@/lib/market/niveau-marche";

/**
 * CE QUE LE DESK VOIT AVANT DE TAPER QUOI QUE CE SOIT.
 *
 * Un rendu statique ne clique pas et ne saisit rien : il éprouve donc ce qui
 * compte le plus, l'état d'ARRIVÉE. C'est celui que le desk lit avant d'avoir
 * rien fait, et c'est précisément là que vivait le défaut d'avant : un champ
 * pré-rempli à « 95 » ou « 5,5 », sorti d'une valeur par défaut et non d'une
 * adjudication, qu'on ne distingue pas d'une mesure une fois dans la case.
 *
 * Le va-et-vient entre le rendement et le prix est éprouvé ailleurs, sur les
 * fonctions elles-mêmes, où il se mesure au dix-millième plutôt qu'à l'œil.
 */

const bond = { nominal: 10_000, couponRate: 6.25, settleOn: "2026-10-20", maturityOn: "2031-07-08", lastCouponOn: null };

const niveau = (p: Partial<NiveauMarche> = {}): NiveauMarche => {
  const seance = {
    id: "s1",
    sessionOn: "2026-09-14",
    tenor: "5 ans",
    annees: 4.72,
    rendement: 7.68,
    auLimite: 7.99,
    auMoyen: 7.68,
    hypotheses: [],
  };
  return {
    point: 7.68,
    bas: 7.68,
    haut: 7.99,
    panier: "4-5 ans",
    seances: [seance],
    derniere: seance,
    ageJours: 34,
    uneSeule: true,
    ecartees: { abondements: 0, nonRelues: 0, horsFenetre: 0 },
    ...p,
  };
};

describe("le bloc du niveau et du prix", () => {
  it("pose dans le champ le prix que le niveau mesuré donnerait, et non une valeur par défaut", () => {
    const html = renderToStaticMarkup(<NiveauEtPrix kind="OTA" niveau={niveau()} bond={bond} pays="Cameroun" />);
    const m = /name="pricePct"[^>]*value="([^"]+)"/.exec(html);
    expect(m, "le champ posté doit être rendu avec sa valeur").not.toBeNull();
    const prix = Number(m![1].replace(/\s/g, "").replace(",", "."));
    /* Le prix rendu doit redonner le niveau mesuré quand la fiche le relit :
       c'est la seule vérification qui prouve que les deux écrans s'accordent. */
    expect(bondCalc(bond, 10_000_000, prix).irr).toBeCloseTo(7.68, 2);
    expect(html).not.toContain('value="95"');
  });

  it("montre le niveau, sa fourchette, son âge et son panier", () => {
    const html = renderToStaticMarkup(<NiveauEtPrix kind="OTA" niveau={niveau()} bond={bond} />);
    expect(html).toContain("7,68");
    expect(html).toContain("7,99");
    expect(html).toContain("2026-09-14");
    expect(html).toContain("34");
    expect(html).toContain("4-5 ans");
  });

  it("dit qu'une seule séance ne mesure aucune dispersion", () => {
    const html = renderToStaticMarkup(<NiveauEtPrix kind="OTA" niveau={niveau()} bond={bond} />);
    expect(html).toContain("Une seule séance");
  });

  it("compte les séances écartées plutôt que de les taire", () => {
    const html = renderToStaticMarkup(
      <NiveauEtPrix kind="OTA" niveau={niveau({ ecartees: { abondements: 3, nonRelues: 2, horsFenetre: 0 } })} bond={bond} />,
    );
    expect(html).toContain("abondement");
    expect(html).toContain("relue");
  });

  it("sans niveau mesuré, laisse le champ vide et le dit, plutôt que d'inventer un nombre", () => {
    const html = renderToStaticMarkup(<NiveauEtPrix kind="OTA" bond={bond} />);
    expect(html).toContain("Aucune séance comparable");
    expect(html).toMatch(/name="pricePct"[^>]*value=""/);
  });

  it("garde la valeur déjà arrêtée par le desk plutôt que de la remplacer par la mesure", () => {
    const html = renderToStaticMarkup(<NiveauEtPrix kind="OTA" niveau={niveau()} bond={bond} valeurInitiale={91.25} />);
    expect(html).toMatch(/name="pricePct"[^>]*value="91,250"/);
  });

  it("poste un taux précompté pour un bon, jamais un prix", () => {
    const html = renderToStaticMarkup(
      <NiveauEtPrix kind="BTA" niveau={niveau({ point: 7.6 })} bta={{ nominal: 10_000, settleOn: "2026-10-20", maturityOn: "2027-09-16" }} />,
    );
    expect(html).toContain('name="precountRate"');
    expect(html).not.toContain('name="pricePct"');
  });

  /**
   * LE CHAMP DU BON PART DU NIVEAU MESURÉ, ET DE RIEN D'AUTRE.
   *
   * Jusqu'au 29 octobre 2026 il partait de l'ANCIENNE référence, appariée par
   * l'étiquette de durée. Mesuré sur l'historique réel des BTA, sur une cible
   * congolaise à 52 semaines, elle y posait 6,9700 % : le taux d'une séance à
   * UN soumissionnaire couverte à 2,50 % — l'exemple même que son propre
   * commentaire donnait de ce qui n'est pas un prix de marché. Une phrase de
   * mise en garde à côté ne pèse rien contre un chiffre déjà dans la case.
   *
   * La vérification est la même que celle du prix d'une obligation, plus
   * haut : le taux posé, relu par la fonction que la fiche emploiera, doit
   * redonner le niveau mesuré. C'est la seule qui prouve que les deux écrans
   * s'accordent, et elle passe par « lib/finance », jamais par un calcul
   * refait ici.
   */
  it("pose dans le champ du bon le taux précompté que le niveau donnerait", () => {
    const bta = { nominal: 10_000, settleOn: "2026-10-31", maturityOn: "2027-10-30" };
    const html = renderToStaticMarkup(<NiveauEtPrix kind="BTA" niveau={niveau({ point: 7.605 })} bta={bta} pays="Congo" />);
    const m = /name="precountRate"[^>]*value="([^"]+)"/.exec(html);
    expect(m, "le champ posté doit être rendu avec sa valeur").not.toBeNull();
    const taux = Number(m![1].replace(/\s/g, "").replace(",", "."));
    expect(btaCalc(bta, 10_000_000, taux).yieldPct).toBeCloseTo(7.605, 2);
    /* Non-vacuité : le taux précompté d'un bon à un an N'EST PAS son rendement.
       Sans cette clause, un champ qui recopierait le niveau tel quel passerait. */
    expect(Math.abs(taux - 7.605), "le taux posé est le rendement recopié, non converti").toBeGreaterThan(0.3);
  });

  /* ET SANS NIVEAU, LE CHAMP DU BON RESTE VIDE. Relevé le même jour : sur une
     cible gabonaise à 13 semaines, l'ancienne référence proposait 6,0000 %
     tirés d'une séance dont le bon est échu depuis. Ne rien proposer est une
     réponse ; proposer le prix d'un titre mort n'en est pas une. */
  it("sans niveau mesuré, laisse vide le champ du bon lui aussi", () => {
    const html = renderToStaticMarkup(<NiveauEtPrix kind="BTA" bta={{ nominal: 10_000, settleOn: "2026-10-31", maturityOn: "2027-01-30" }} />);
    expect(html).toMatch(/name="precountRate"[^>]*value=""/);
    expect(html).toContain("Aucune séance comparable");
  });
});
