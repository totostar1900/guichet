import { describe, expect, it } from "vitest";
import { setRegistry } from "@/lib/registry";
import { BOND_TERMS } from "@/data/bond-terms";
import { displayYield, marketBondCalc, marketBondInput } from "@/lib/domain/status";
import { explainKpis } from "@/lib/domain/explain";
import { summarize } from "@/lib/domain/summary";
import { estimate } from "@/lib/domain/estimate";
import type { Offer } from "@/lib/domain/types";
import { tradedSession, type Quote } from "@/lib/domain/market";

/**
 * Une obligation cotée, un seul rendement.
 *
 * La zone n'émet presque que des obligations amortissables : le capital revient
 * par tranches, et une décote sur le cours se récupère donc sur une durée de vie
 * moyenne bien plus courte que l'échéance. Calculée « in fine », la même ligne
 * rend nettement moins.
 *
 * C'est ce qui arrivait : la carte annonçait 10,91 % par le bon moteur, et le
 * panneau censé expliquer ce chiffre en affichait 9,18 % par l'autre. Deux
 * vérités sur le même titre, sur le même écran, dont une fausse.
 */
const TERMS = BOND_TERMS.find((t) => t.isin === "GA0000020552")!;

const line = (over: Partial<Offer> = {}): Offer =>
  ({
    id: "eog",
    kind: "MARCHE",
    instrument: "obligation",
    operation: "cotation",
    title: "EOG MT 6,6 % NET 2024-2027-II",
    issuer: "État du Gabon",
    country: "Gabon",
    isin: "GA0000020552",
    market: "BVMAC",
    nominal: 10_000,
    couponRate: 6.6,
    lastPrice: 97,
    lastPriceOn: "2026-09-09",
    maturityOn: TERMS.maturityOn,
    priceSource: "boc",
    commissionPct: 0,
    settlementDays: 3,
    version: 1,
    ...over,
  }) as unknown as Offer;

describe("le rendement d'une obligation cotée", () => {
  it("suit l'échéancier du référentiel, pas une échéance in fine", () => {
    setRegistry({ bondTerms: new Map([[TERMS.isin, TERMS]]) });
    const o = line();
    const amorti = marketBondCalc(o, o.nominal * 1000, 97)!;

    // Sans l'échéancier, la même ligne est calculée « in fine » et rend moins :
    // la décote de 3 points est étalée jusqu'en 2027 au lieu d'être récupérée
    // à chaque tranche de capital.
    setRegistry({ bondTerms: new Map() });
    const inFine = marketBondCalc(o, o.nominal * 1000, 97)!;

    expect(amorti.irr).toBeGreaterThan(inFine.irr);
    expect(amorti.irr).toBeGreaterThan(o.couponRate!);
  });

  it("dit le même chiffre sur la carte et dans le panneau qui l'explique", () => {
    setRegistry({ bondTerms: new Map([[TERMS.isin, TERMS]]) });
    const o = line();
    const head = displayYield(o).pct!;
    const panel = explainKpis(o).find((p) => p.key === "yield")!;
    const said = panel.lines.find(([label]) => label === "Rendement")![1];
    expect(said).toContain(head.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    // Et il dit pourquoi : le capital revient par tranches.
    expect(panel.lines.find(([label]) => label === "Remboursement")![1]).toMatch(/tranches/);
  });

  it("chiffre le décaissement d'un ordre avec le même échéancier", () => {
    setRegistry({ bondTerms: new Map([[TERMS.isin, TERMS]]) });
    const o = line();
    const e = estimate(o, 10 * o.nominal);
    const r = marketBondCalc(o, 10 * o.nominal, 97)!;
    expect(e.ok).toBe(true);
    // Le décaissement porte le coupon couru du bon échéancier, au centime près.
    expect(e.outlay).toBeCloseTo(r.outlay, 6);
  });

  it("ne publie pas de rendement quand le BOC ne donne que l'année", () => {
    // Sans fiche et à moins d'un an, l'échéance supposée au 31/12 ferait bouger
    // le rendement de dizaines de points : mieux vaut pas de chiffre du tout.
    setRegistry({ bondTerms: new Map() });
    const soon = `${new Date().getFullYear()}-12-31`;
    expect(displayYield(line({ maturityOn: soon })).pct).toBeNull();
  });
});

/**
 * Le règlement tombe un jour ouvré.
 *
 * Il était compté en jours de calendrier : un ordre du jeudi réglait le
 * dimanche. Deux jours de coupon couru de trop facturés au client, et une date
 * de règlement impossible imprimée sur le bulletin d'ordre.
 */
describe("la date de règlement", () => {
  const settleOf = (iso: string) => marketBondInput(line(), new Date(`${iso}T09:00:00Z`))!.settleOn;

  it("saute le week-end", () => {
    // Jeudi 24 sept. 2026 + 3 ouvrés = mardi 29, et non dimanche 27.
    expect(settleOf("2026-09-24")).toBe("2026-09-29");
    // Lundi + 3 = jeudi, aucune fin de semaine traversée.
    expect(settleOf("2026-09-21")).toBe("2026-09-24");
    // Vendredi + 3 = mercredi.
    expect(settleOf("2026-09-25")).toBe("2026-09-30");
  });

  it("ne tombe jamais un samedi ni un dimanche", () => {
    for (let i = 0; i < 14; i++) {
      const d = new Date("2026-09-21T09:00:00Z");
      d.setUTCDate(d.getUTCDate() + i);
      const day = new Date(`${settleOf(d.toISOString().slice(0, 10))}T12:00:00Z`).getUTCDay();
      expect(day, `règlement du ${d.toISOString().slice(0, 10)}`).toBeGreaterThan(0);
      expect(day).toBeLessThan(6);
    }
  });
});

/**
 * Une séance cotée n'est pas une séance échangée.
 *
 * Le BOC imprime une clôture pour chaque ligne à chaque séance. « Cours 97,00 %
 * du 9 sept. » se lisait donc comme « elle a traité le 9 septembre » alors
 * qu'elle pouvait n'avoir rien traité depuis mai. Sur un marché étroit, c'est
 * la date de l'échange qui dit si un ordre a une chance d'être servi.
 */
describe("la dernière séance échangée", () => {
  const q = (over: Partial<Quote> = {}): Quote => ({ isin: "GA0000020552", sessionDate: "2026-09-09", bulletinNo: 2591, instrument: "obligation", mnemo: "EGA15", issuer: "État du Gabon", designation: "EOG", previousClose: 97, previousDate: "2026-09-08", open: 97, close: 97, thresholdHigh: 99, thresholdLow: 95, variationPct: 0, referenceNext: 97, volumeTraded: 0, valueTraded: 0, trades: 0, status: "NC", ...over }) as Quote;

  it("ne compte pas une séance où rien ne s'est formé", () => {
    expect(tradedSession(q())).toBe(false);
    expect(tradedSession(q({ status: "" }))).toBe(false);
  });

  it("compte les titres échangés, et rien d autre", () => {
    // Une action : le bulletin donne des volumes, c est la preuve la plus forte.
    expect(tradedSession(q({ volumeTraded: 218, trades: 2 }))).toBe(true);
    expect(tradedSession(q({ trades: 1 }))).toBe(true);
  });

  it("ne prend pas un code de statut pour une transaction", () => {
    /* CE TEST DISAIT L INVERSE, et il encodait une supposition : « une
       obligation n a pas de volume imprimé, le code de séance est tout ce
       qu il y a ». Mesuré le 4 octobre 2026 sur toute l histoire du
       compartiment obligataire : 8 340 séances « NC » et 40 « PEq », et les
       QUARANTE « PEq » sont à volume nul et zéro transaction. Huit d entre
       elles portent un changement de cours : « PEq » marque une bourse qui
       RE-MARQUE un prix, jamais une contrepartie.

       Le coût de la supposition : la carte annonçait « dernier échange le
       1er sept. 2026 » sur une ligne gabonaise qui n a jamais traité. */
    expect(tradedSession(q({ status: "PEq" }))).toBe(false);
    expect(tradedSession(q({ status: "PEq", volumeTraded: 5 }))).toBe(true);
  });});

describe("la cote ne retient plus le taux nominal", () => {
  /**
   * LA RÈGLE « AU PAIR » RENDAIT LE COUPON pour une obligation cotée à 100,
   * au motif que l'écart avec le rendement actuariel ne tenait qu'à la
   * convention de calcul. Trois mesures du 4 octobre 2026 sur les trente-cinq
   * lignes cotées en production ont défait ce motif :
   *
   *  - VINGT-CINQ cotent exactement 100,00 : la règle gouvernait 71 % du
   *    tableau, pas une exception, et la même pastille or portait deux
   *    grandeurs différentes selon la carte ;
   *  - l'écart est bien de 0 à −9 pb sur les annuités, mais il monte à
   *    +9, +10, +13 et +18 pb sur les quatre amortisseurs semestriels et
   *    trimestriels, en changeant de signe : là ce n'est plus une
   *    convention, c'est le capital qui revient par tranches et se replace ;
   *  - hors du pair l'écart va de +191 à +388 pb.
   *
   * LES ADJUDICATIONS GARDENT LA RÈGLE : leur 100 % n'est pas un cours figé
   * mais un prix à servir, et le taux nominal y est le taux contractuel.
   */
  it("une obligation cotée à 100 affiche son rendement actuariel", () => {
    const auPair = line({ lastPrice: 100, ask: undefined });
    const dy = displayYield(auPair);
    expect(dy.atPar, "la cote ne connaît plus le pair").toBe(false);
    expect(dy.pct).not.toBe(auPair.couponRate);
    expect(dy.pct).toBeCloseTo(marketBondCalc(auPair, 10_000_000, 100)!.irr, 6);
  });

  it("une adjudication au pair garde son taux nominal", () => {
    /* L'exception est assumée et doit rester vraie : si elle tombait avec la
       règle de la cote, personne ne le verrait avant un client. */
    const ota = line({ kind: "OTA", instrument: undefined, lastPrice: undefined, pricePct: 100, couponRate: 7, settleOn: "2026-10-07", maturityOn: "2031-10-07" });
    const dy = displayYield(ota);
    expect(dy.atPar, "une séance servie au pair garde le taux du contrat").toBe(true);
    expect(dy.pct).toBe(7);
  });
});

/* Ce que « summarize » attend en plus du jeu d essai des rendements. */
const POUR_RESUME = { settleOn: "2026-10-07", opensAt: "2026-01-01", deadlineAt: "2026-12-31T17:00:00.000Z", blurb: "", documents: [], lotSize: 1, countryName: "Gabon", operation: "secondaire", sizeLabel: "" } as unknown as Partial<Offer>;

describe("le cours est dans la rangée des faits", () => {
  /**
   * Le grand chiffre est le rendement À CE COURS : sans le cours sous les
   * yeux, on ne peut ni le vérifier ni le comparer d'une ligne à l'autre.
   * Il se range entre le coupon et l'échéance, et il ne porte que son âge,
   * parce que sur ce marché un prix de quatre cents jours et un prix d'hier
   * ne valent pas la même confiance. La date entière se lit au dos.
   */
  it("entre le coupon et l'échéance, avec le nombre de jours", () => {
    const s = summarize(line({ priceSince: "2026-05-07", ...POUR_RESUME }), new Date("2026-10-04T12:00:00"));
    const etiquettes = s.facts.map(([k]) => k);
    expect(etiquettes).toEqual(["Coupon", "Cours", "Échéance", "Ticket min."]);
    const cours = s.facts.find(([k]) => k === "Cours")!;
    expect(cours[1]).toBe("97 %");
    expect(cours[2], "l'âge du cours, et rien d'autre").toBe("150 j");
  });

  it("sans date de dernier changement, le cours n'invente pas d'âge", () => {
    const s = summarize(line({ priceSince: undefined, ...POUR_RESUME }), new Date("2026-10-04T12:00:00"));
    expect(s.facts.find(([k]) => k === "Cours")![2]).toBeUndefined();
  });
});
