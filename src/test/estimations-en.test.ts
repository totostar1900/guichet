import { describe, expect, it } from "vitest";
import { segmentsDecouverts } from "./couverture";
import { equivalence, estimate, marketEstimate, redemptionEstimate } from "@/lib/domain/estimate";
import type { Offer } from "@/lib/domain/types";

/**
 * LES PHRASES FABRIQUÉES DOIVENT PASSER EN ANGLAIS, ELLES AUSSI.
 *
 * Les estimations ne sont pas écrites dans le code comme des littéraux : elles
 * se composent avec des chiffres, puis traversent t() sous forme de variable.
 * Le scanner de clefs ne peut donc pas les voir, et le cliquet qui veille sur
 * les clefs littérales ne les couvrait pas : elles sont restées en français
 * dans une interface anglaise sans que rien ne le signale.
 *
 * Ce cliquet-ci les compose pour de vrai, segment par segment, et exige que le
 * dictionnaire connaisse chacun. Il ne juge pas si une phrase « a l'air
 * française » : ce détecteur-là a échoué deux fois dans ce dépôt. Il demande
 * une couverture, ce qui est un fait et non une impression.
 *
 * Un segment fait de chiffres, d'unités et de ponctuation se lit pareil dans
 * les deux langues : il est déclaré neutre ici, en une règle étroite qui ne
 * peut pas avaler une vraie phrase, puisque toute phrase porte d'autres
 * lettres.
 */
const bta: Offer = { id: "b", kind: "BTA", nominal: 1_000_000, settleOn: "2026-10-08", maturityOn: "2027-04-08", precountRate: 4.25 } as unknown as Offer;
const ota: Offer = { id: "o", kind: "OTA", nominal: 10_000, settleOn: "2026-10-08", maturityOn: "2031-10-08", couponRate: 6.25, pricePct: 98.5, lastCouponOn: "2026-04-08" } as unknown as Offer;
const actions: Offer = { id: "a", kind: "ACTIONS", nominal: 1, settleOn: "2026-10-08", pricePerShare: 12_300, minShares: 10, dividendPerShare: 500 } as unknown as Offer;
const marche: Offer = { id: "m", kind: "MARCHE", nominal: 10_000, settleOn: "2026-10-08", instrument: "action", lastPrice: 90_500, ask: 90_500, lotSize: 1, settlementDays: 3 } as unknown as Offer;
const marcheObl: Offer = { ...marche, instrument: "obligation", lastPrice: 98.5, ask: 98.5 } as unknown as Offer;
const rachat: Offer = { id: "r", kind: "RACHAT", nominal: 10_000, settleOn: "2026-10-08" } as unknown as Offer;
const fonds: Offer = { id: "f", kind: "FONDS", nominal: 1, settleOn: "2026-10-08", fund: { nav: 105_750, navDate: "2026-09-30", minAmount: 100_000, entryFeePct: 2.5, exitFeePct: 1, manager: "X", distributed: true } } as unknown as Offer;
const fondsSansDroits: Offer = { ...fonds, fund: { ...(fonds as unknown as { fund: Record<string, unknown> }).fund, entryFeePct: 0 } } as unknown as Offer;

/** Chaque compartiment, avec un montant qui passe et un qui ne passe pas. */
const CAS: [string, Offer, number][] = [
  ["bon du Trésor", bta, 10_000_000],
  ["bon du Trésor, montant trop petit", bta, 1_000],
  ["bon du Trésor, rien de saisi", bta, 0],
  ["obligation du primaire", ota, 10_000_000],
  ["obligation du primaire, montant trop petit", ota, 5_000],
  ["actions du primaire", actions, 1_000_000],
  ["actions du primaire, sous le minimum", actions, 100],
  ["ligne cotée, une action", marche, 1_000_000],
  ["ligne cotée, une obligation", marcheObl, 1_000_000],
  ["ligne cotée, somme insuffisante", marche, 100],
  ["cession de titres", rachat, 500],
  ["fonds, avec droits d'entrée", fonds, 5_000_000],
  ["fonds, sans droits d'entrée", fondsSansDroits, 5_000_000],
  ["fonds, sous le minimum", fonds, 1_000],
];

describe("les estimations composées passent en anglais", () => {
  for (const [nom, o, montant] of CAS) {
    it(`estimation : ${nom}`, () => {
      expect(segmentsDecouverts(estimate(o, montant).text)).toEqual([]);
    });
  }

  /** La cote a sa propre phrase, et le rachat d'un fonds la sienne. */
  const AUTRES: [string, string][] = [
    ["cote, une action au mieux", marketEstimate(marche, 11, "achat", null)],
    ["cote, une action à cours limité", marketEstimate(marche, 11, "achat", 88_000)],
    ["cote, une action à la vente", marketEstimate(marche, 11, "vente", null)],
    ["cote, une obligation", marketEstimate(marcheObl, 100, "achat", null)],
    ["cote, rien de saisi", marketEstimate(marche, 0, "achat", null)],
    ["cote, sous la quotité", marketEstimate({ ...marche, lotSize: 50 } as unknown as Offer, 10, "achat", null)],
    ["rachat de parts", redemptionEstimate(fonds, 40)],
    ["rachat de parts, sans frais de sortie", redemptionEstimate(fondsSansDroits, 40)],
    ["rachat, rien de saisi", redemptionEstimate(fonds, 0)],
  ];
  for (const [nom, phrase] of AUTRES) {
    it(`phrase : ${nom}`, () => {
      expect(segmentsDecouverts(phrase)).toEqual([]);
    });
  }

  for (const [nom, o, montant] of CAS) {
    for (const type of ["ferme", "souscription", "rachat"] as const) {
      const e = equivalence(o, montant, type);
      if (!e) continue;
      it(`équivalence ${type} : ${nom}`, () => {
        expect(segmentsDecouverts(e.line)).toEqual([]);
        expect(segmentsDecouverts(e.restLine)).toEqual([]);
      });
    }
  }
});
