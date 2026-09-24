import { describe, expect, it } from "vitest";
import { setRegistry } from "@/lib/registry";
import { BOND_TERMS } from "@/data/bond-terms";
import { displayYield, marketBondCalc } from "@/lib/domain/status";
import { explainKpis } from "@/lib/domain/explain";
import { estimate } from "@/lib/domain/estimate";
import type { Offer } from "@/lib/domain/types";

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
