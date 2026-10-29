import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { sensDeLaCondition } from "@/lib/domain/survey";
import { repereDuMarche } from "@/lib/market/repere";
import type { AuctionResult } from "@/lib/market/auction-results";
import type { Offer } from "@/lib/domain/types";

const ROOT = path.join(__dirname, "../..");
const code = (p: string) =>
  fs
    .readFileSync(path.join(ROOT, p), "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * POSER UNE ENCHÈRE SANS SAVOIR — RELEVÉ LE 29 OCTOBRE 2026.
 *
 * Une adjudication demande deux nombres : combien, et à quelle condition. Le
 * second décide si la demande est servie, et le formulaire le laissait seul
 * avec son gabarit de champ. Mesuré à l'écran, il ne portait qu'une phrase :
 * « Sans condition, votre demande tient quel que soit le résultat. »
 *
 *   DANS QUEL SENS POUSSER n'était écrit nulle part — et le sens S'INVERSE
 *   entre un bon et une obligation, puisque le Trésor sert d'abord ce qui lui
 *   coûte le moins : les taux les plus bas, les prix les plus hauts. Qui a
 *   compris la règle sur un bon se fait servir à coup sûr, au pire prix, sur
 *   une obligation.
 *
 *   CE QUE LA PLACE A SERVI n'y était pas non plus. Le gabarit du champ porte
 *   le niveau ANNONCÉ, qui est le vœu du Trésor : sur le bon camerounais à six
 *   mois, 4,90 % annoncés contre 6,70 % réellement servis le 3 août. Cent
 *   quatre-vingts points de base, soit toute la différence entre être servi et
 *   ne pas l'être.
 *
 *   LA CONDITION DISPARAISSAIT AU RÉCAPITULATIF. On signait un taux minimum
 *   qu'on ne voyait plus depuis deux écrans.
 */
const bon: Offer = { id: "b", kind: "BTA", country: "Cameroun", nominal: 1_000_000, settleOn: "2026-11-26", maturityOn: "2027-05-23", precountRate: 4.9 } as unknown as Offer;
const obligation: Offer = { id: "o", kind: "OTA", country: "Cameroun", nominal: 10_000, settleOn: "2026-11-13", maturityOn: "2031-11-08", couponRate: 6.25, pricePct: 97 } as unknown as Offer;

/** Une séance relue, du même pays et du même panier que la ligne visée. */
const seance = (p: Partial<AuctionResult>): AuctionResult =>
  ({
    id: "s1",
    country: "Cameroun",
    instrument: "BTA",
    tenor: "26 semaines",
    sessionOn: "2026-08-03",
    abondement: false,
    maturityOn: "2027-02-03",
    confirmedBy: "desk",
    ...p,
  }) as unknown as AuctionResult;

const LE_JOUR = new Date("2026-10-29T10:00:00Z");

describe("poser une enchère", () => {
  /* LE SENS, ET SON INVERSION. C'est la clause qui compte : une épreuve qui ne
     regarderait qu'un compartiment laisserait passer la faute qu'on corrige. */
  it("inverse le sens du levier entre un bon et une obligation", () => {
    const b = sensDeLaCondition(bon);
    const o = sensDeLaCondition(obligation);
    // Sur un bon, descendre fait servir ; sur une obligation, descendre fait gagner.
    expect(b.dessous, "sous le taux, un bon ne dit plus qu'il est servi plus souvent").toMatch(/servi plus souvent/);
    expect(o.dessous, "sous le prix, une obligation ne dit plus qu'elle rapporte davantage").toMatch(/rapporte davantage/);
    expect(b.dessus, "au-dessus du taux, un bon ne dit plus qu'il rapporte davantage").toMatch(/rapporte davantage/);
    expect(o.dessus, "au-dessus du prix, une obligation ne dit plus qu'elle est servie plus souvent").toMatch(/servi plus souvent/);
    // Non-vacuité : les deux compartiments ne disent pas la même chose.
    expect(b.dessous).not.toBe(o.dessous);
    expect(b.attente).not.toBe(o.attente);
  });

  /* LE REPÈRE EST DANS L'UNITÉ DU CHAMP, ET C'EST TOUT LE SOIN DU DISPOSITIF.
     « niveauDuMarche » rend un RENDEMENT, la seule grandeur qui se compare
     d'un compartiment à l'autre ; le client, lui, tape un taux précompté ou un
     prix. Poser l'un sous l'autre serait la faute d'unité que la maison
     traque, celle qui fait écrire 0,97 pour 97. */
  it("rend le niveau servi dans l'unité où le client tape", () => {
    const sur = repereDuMarche(bon, [seance({ rateAvg: 6.7, rateLimit: 6.9, yieldAvg: 6.95 })], LE_JOUR);
    expect(sur?.niveau, "le repère d'un bon n'est plus le taux servi").toBe(6.7);
    expect(sur?.le).toBe("2026-08-03");

    const sous = repereDuMarche(obligation, [seance({ instrument: "OTA", tenor: "5 ans", maturityOn: "2031-08-03", priceAvg: 96, priceLimit: 95, yieldAvg: 7.4 })], LE_JOUR);
    expect(sous?.niveau, "le repère d'une obligation n'est plus le prix servi").toBe(96);

    // Non-vacuité : le rendement imprimé diffère des deux, donc une épreuve qui
    // passerait en le rendant par mégarde serait prise.
    expect(sur?.niveau).not.toBe(6.95);
    expect(sous?.niveau).not.toBe(7.4);
  });

  /* LE SILENCE, QUI VAUT MIEUX QU'UNE APPROCHE. Un repère faux est pire que
     pas de repère, puisqu'on s'y appuie. */
  it("se tait plutôt que d'approcher", () => {
    // Rien de comparable dans le pays.
    expect(repereDuMarche(bon, [], LE_JOUR), "un repère sort de nulle part").toBeUndefined();
    expect(repereDuMarche(bon, [seance({ country: "Tchad", rateAvg: 6.7 })], LE_JOUR), "le repère sort du pays").toBeUndefined();
    // Une séance qui n'imprime qu'un rendement : on ne sait pas l'écrire dans
    // l'unité du champ, donc on ne l'écrit pas. Le cas est réel — le Tchad.
    expect(repereDuMarche(bon, [seance({ yieldAvg: 6.95 })], LE_JOUR), "un rendement est posé sous un champ qui attend un taux").toBeUndefined();
    // Un abondement n'est pas une ligne neuve : la règle vient du niveau.
    expect(repereDuMarche(bon, [seance({ rateAvg: 6.7, tenor: "26 semaines", maturityOn: "2026-09-03" })], LE_JOUR), "un abondement sert de repère").toBeUndefined();
    // Et les compartiments qui ne s'adjugent pas n'en ont pas.
    expect(repereDuMarche({ ...bon, kind: "MARCHE" } as unknown as Offer, [seance({ rateAvg: 6.7 })], LE_JOUR)).toBeUndefined();
  });

  /* UNE SEULE SÉANCE SE DIT. C'est la forme d'un seul carnet, pas celle du
     marché, et la maison l'écrit déjà pour le desk. */
  it("dit quand le repère ne tient qu'à une séance", () => {
    const une = repereDuMarche(bon, [seance({ rateAvg: 6.7 })], LE_JOUR);
    expect(une?.uneSeule, "une séance unique se présente comme un marché").toBe(true);
    const deux = repereDuMarche(bon, [seance({ rateAvg: 6.7 }), seance({ id: "s2", sessionOn: "2026-06-01", maturityOn: "2026-12-01", rateAvg: 6.2 })], LE_JOUR);
    expect(deux?.seances, "deux séances comparables n'en font pas deux").toBe(2);
    expect(deux?.uneSeule).toBe(false);
    // La plus récente est le point, pas le milieu de la fourchette.
    expect(deux?.niveau).toBe(6.7);
  });

  /* L'ÉCRAN : la condition au moment où l'on signe, et le sens aux DEUX champs
     qui posent la même question. */
  it("porte la condition au récapitulatif et le sens aux deux champs", () => {
    const src = code("src/components/IntentForm.tsx");
    expect(src, "la condition a de nouveau disparu du récapitulatif").toMatch(/survey && lim != null/);
    expect(src, "le « si » du récapitulatif a disparu").toMatch(/Si l'adjudication sort au-delà/);
    expect((src.match(/styles\.sens/g) || []).length, "un des deux champs de condition a perdu le sens du levier").toBe(2);
    expect((src.match(/\{repereDit\}/g) || []).length, "un des deux champs de condition a perdu le repère").toBe(2);
  });

  /* LE MONTANT POSÉ SE CALCULE DANS LE DOMAINE, et cette clause-ci existe
     parce que la précédente version ne gardait rien : l'épreuve du trio
     refaisait l'arrondi de son côté, si bien que casser le gestionnaire du
     champ ne la faisait pas tomber. Un calcul recopié dans un écran est
     exactement ce que la maison interdit, et c'est aussi ce qui rend une
     épreuve vide sans qu'elle le dise. */
  it("laisse le domaine calculer le montant que pose la case « quantité »", () => {
    const src = code("src/components/IntentForm.tsx");
    expect(src, "la case « quantité » refait son arrondi à côté du domaine").toMatch(/montantPourUnites\(trio,/);
    expect(src, "un arrondi du montant est réapparu dans l'écran").not.toMatch(/Math\.(ceil|round)\([^)]*trio\.amountPerUnit/);
  });
});
