import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MONTANT_PAR_DEFAUT, calculer, montantDeLaQuantite, quantiteDuMontant, type ParamsSeance } from "@/lib/domain/simulation-seance";

const lire = (p: string) => readFileSync(`${__dirname}/../../${p}`, "utf8");
const dir = "src/app/offres/[id]";

/** L'OTA 6,25 % · 5 ans de la démonstration : règlement le 21 nov. 2026, échéance le 16 nov. 2031, prix Purpose 97 %. */
const OTA: ParamsSeance = { genre: "obligation", nominal: 10_000, couponRate: 6.25, settleOn: "2026-11-21", maturityOn: "2031-11-16", lastCouponOn: null, prix: 97, servi: false, minimum: 500_000 };
/** Le BTA 52 semaines du Congo : taux précompté 6,98 %, règlement le 17 sept. 2026, échéance le 16 sept. 2027. */
const BTA: ParamsSeance = { genre: "bon", nominal: 1_000_000, settleOn: "2026-09-17", maturityOn: "2027-09-16", taux: 6.98, minimum: 1_000_000 };

describe("la fiche d'une séance du Trésor chez le client (6 novembre 2026, planche « A · 10 000 000 par défaut »)", () => {
  it("le montant de départ est 10 000 000 et donne le bilan qu'affichait la fiche : 9 700 000 payés, 13 125 000 reçus, 7,00 %", () => {
    expect(MONTANT_PAR_DEFAUT).toBe(10_000_000);
    const c = calculer(OTA, MONTANT_PAR_DEFAUT);
    expect(Math.round(c.paye)).toBe(9_700_000);
    expect(Math.round(c.recu)).toBe(13_125_000);
    expect(c.rendement).toBeCloseTo(7, 1);
    expect(c.titres).toBe(1000);
  });

  it("un montant saisi change le bilan en proportion : 25 000 000 donnent 24 250 000 payés et 32 812 500 reçus", () => {
    const c = calculer(OTA, 25_000_000);
    expect(Math.round(c.paye)).toBe(24_250_000);
    expect(Math.round(c.recu)).toBe(32_812_500);
    expect(c.titres).toBe(2500);
  });

  it("un montant qui n'est pas un multiple du titre est arrondi vers le bas, et la carte dit le montant retenu", () => {
    const c = calculer(OTA, 10_005_000);
    expect(c.titres).toBe(1000);
    expect(c.retient).toBe(10_000_000);
  });

  it("un bon : dix bons au départ, 9 294 244 payés, 10 000 000 remboursés, un seul flux dessiné au remboursement", () => {
    const c = calculer(BTA, MONTANT_PAR_DEFAUT);
    expect(c.titres).toBe(10);
    expect(Math.round(c.paye)).toBe(9_294_244);
    expect(c.recu).toBe(10_000_000);
    expect(c.graphe.flows).toHaveLength(1);
    expect(c.graphe.flows?.[0].amount).toBe(10_000_000);
    expect(c.graphe.flows?.[0].label).toBe("Remboursement");
    expect(Math.round(c.graphe.outlay ?? 0)).toBe(9_294_244);
  });

  it("la fiche fusionne « Chiffres » dans l'Essentiel pour une séance chez le client, le desk et les autres lignes gardent la leur", () => {
    const r = lire(`${dir}/FicheReading.tsx`);
    expect(r, "la séance n'est plus reconnue chez le client").toMatch(/const seanceClient = mode !== "desk" && \(o\.kind === "OTA" \|\| o\.kind === "APE" \|\| o\.kind === "BTA" \|\| o\.kind === "RACHAT"\);/);
    expect(r, "l'onglet Chiffres est revenu pour une séance").toMatch(/\.\.\.\(seanceClient \? \["chiffres"\] : \[\]\)/);
    expect(r, "le résultat de la séance est revenu dans la fiche du client").toMatch(/\{seance && !seanceClient && <Seance r=\{seance\} t=\{t\} \/>\}/);
    expect(r, "la fiche d'une séance n'appelle plus le montant saisi").toMatch(/if \(paramsSeance\) return <SimulationSeance params=\{paramsSeance\} titresInitiaux=\{qty\} fin=\{noteBulle\} \/>;/);
    expect(r, "les autres lignes ont perdu leur bloc de calcul au desk").toMatch(/<section className=\{styles\.sec\} data-pane="chiffres">\s*<Reference o=\{o\} mode=\{mode\} fin=\{noteBulle\} \/>/);
  });

  it("le champ est une tuile de la surface, jamais une case blanche : fond transparent dans une tuile « --surface-2 », aucune couleur en dur", () => {
    const css = lire(`${dir}/SimulationSeance.module.css`);
    expect(css, "la tuile du champ n'est plus sur la surface").toMatch(/\.saisie \{[^}]*background: var\(--surface-2\);/);
    expect(css, "le champ a repris un fond").toMatch(/\.saisie input \{[^}]*background: transparent;[^}]*color: var\(--ink\);/);
    expect(css, "une couleur est écrite en dur dans le champ").not.toMatch(/#[0-9a-fA-F]{3,8}\b|:\s*(?:white|black)\b|rgba?\(/);
  });

  it("le champ est numérique, nommé, annonce son erreur, et porte le montant par défaut", () => {
    const t = lire(`${dir}/SimulationSeance.tsx`);
    expect(t, "le montant de départ n'est plus 10 000 000").toMatch(/useState\(fmt\(depart >= p\.minimum \? depart : MONTANT_PAR_DEFAUT\)\)/);
    expect(t).toMatch(/inputMode="numeric"/);
    expect(t).toMatch(/<label htmlFor=\{id\}/);
    expect(t).toMatch(/aria-invalid=\{refuse\}/);
    expect(t).toMatch(/const refuse = montant < p\.minimum;/);
    expect(t, "le calcul n'est plus celui de finance.ts").not.toMatch(/Math\.pow|\*\* ?\(1 ?\/|irr\(/);
  });

  it("le dessin des versements suit le montant et un bon a le sien", () => {
    expect(lire(`${dir}/SimulationSeance.tsx`)).toMatch(/\{c && \(\s*<section[\s\S]*?<FlowsChart \{\.\.\.c\.graphe\} settleOn=\{p\.settleOn\} \/>/);
    expect(lire("src/components/FlowsChart.tsx"), "le bandeau d'un seul versement dit « 1 versements »").toMatch(/pts\.length - 1 === 1 \? t\("1 remboursement"\)/);
  });

  it("les lignes similaires d'une séance portent le libellé de leur chiffre (« si servi à 94 % »)", () => {
    const s = lire(`${dir}/LignesSimilaires.tsx`);
    expect(s, "la carte d'une séance a perdu le libellé de son chiffre").toMatch(/\{seance && l\.libelle && <span className=\{cartes\.libelle\}>\{l\.libelle\}<\/span>\}/);
  });

  it("la quantité de l'adresse et le montant se répondent : 25 000 000 = 2 500 titres, 10 bons = 10 000 000", () => {
    expect(quantiteDuMontant(OTA, 25_000_000)).toBe(2500);
    expect(montantDeLaQuantite(OTA, 2500)).toBe(25_000_000);
    expect(quantiteDuMontant(OTA, 10_005_000)).toBe(1000);
    expect(quantiteDuMontant(BTA, 10_000_000)).toBe(10);
    expect(montantDeLaQuantite(BTA, 10)).toBe(10_000_000);
    expect(quantiteDuMontant(BTA, 500_000)).toBe(0);
  });

  it("le montant se garde dans l'adresse (« ?qty= »), la page le relit et le formulaire d'intention le reprend", () => {
    const t = lire(`${dir}/SimulationSeance.tsx`);
    expect(t, "le montant ne s'écrit plus dans l'adresse").toMatch(/router\.replace\(`\$\{pathname\}\?\$\{q\.toString\(\)\}`, \{ scroll: false \}\)/);
    expect(t, "l'adresse n'amorce plus le montant").toMatch(/const depart = titresInitiaux \? montantDeLaQuantite\(p, titresInitiaux\) : 0;/);
    expect(t, "un montant refusé efface l'adresse").toMatch(/const qtyVoulue = refuse \|\| \(montant === MONTANT_PAR_DEFAUT && qtyActuelle == null\) \? undefined :/);
    expect(lire(`${dir}/page.tsx`), "la page ne passe plus la quantité à la fiche").toMatch(/<FicheReading o=\{o\} data=\{fiche\} qty=\{qty\}>/);
    expect(lire(`${dir}/FicheReading.tsx`), "la fiche ne passe plus la quantité au montant").toMatch(/<SimulationSeance params=\{paramsSeance\} titresInitiaux=\{qty\}/);
    expect(lire("src/components/IntentForm.tsx"), "le formulaire ne reprend plus la quantité de l'adresse quand elle change").toMatch(/if \(amorce !== initialAmount\) \{\s*setAmorce\(initialAmount\);\s*if \(offer\.kind === "OTA" \|\| offer\.kind === "APE" \|\| offer\.kind === "BTA"\) setAmount\(/);
  });
});
