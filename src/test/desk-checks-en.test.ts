
import { describe, expect, it } from "vitest";
import { inventaire } from "./couverture";
import { orderChecks } from "@/lib/domain/checks";
import { backFacts, fundBackFacts } from "@/lib/domain/back";
import { summarize } from "@/lib/domain/summary";
import { offerReference, offerRisks } from "@/lib/domain/sheet";
import { explainKpis } from "@/lib/domain/explain";
import { displayStatus, repaymentLabel, statusLabel } from "@/lib/domain/status";
import { tenorText } from "@/lib/finance";
import { ficheStops } from "@/lib/domain/fiche-stops";
import { compareLine } from "@/lib/domain/compare";
import { standingBlock } from "@/lib/domain/standing";
import { reasonForClient, reasonForDesk } from "@/lib/domain/cancel-reasons";
import { receivedLabel } from "@/lib/domain/intent";
import type { IntentType, Offer } from "@/lib/domain/types";

const base = { settleOn: "2026-10-08", country: "CM", issuer: "Trésor", status: "ouverte", opensAt: "2026-09-01T08:00:00Z", deadlineAt: "2026-12-01T12:00:00Z", resultsAt: "2026-12-01T15:00:00Z", title: "Une ligne", isin: "CM0000000000", commissionPct: 0.5, sizeLabel: "", operation: "nouvelle_ligne", market: "BVMAC" };
const bta = { ...base, id: "b", kind: "BTA", nominal: 1_000_000, maturityOn: "2027-04-08", precountRate: 4.25, minTitles: 2 } as unknown as Offer;
const ota = { ...base, id: "o", kind: "OTA", nominal: 10_000, maturityOn: "2031-10-08", couponRate: 6.25, pricePct: 98.5, lastCouponOn: "2026-04-08", minTitles: 10, periodsPerYear: 1 } as unknown as Offer;
const ape = { ...ota, id: "ap", kind: "APE" } as unknown as Offer;
const actions = { ...base, id: "a", kind: "ACTIONS", nominal: 1, pricePerShare: 12_300, minShares: 10, dividendPerShare: 500 } as unknown as Offer;
const marche = { ...base, id: "m", kind: "MARCHE", nominal: 10_000, instrument: "action", lastPrice: 90_500, ask: 90_500, bid: 89_000, lotSize: 10, settlementDays: 3 } as unknown as Offer;
const marcheObl = { ...marche, id: "mo", instrument: "obligation", lastPrice: 98.5, ask: 98.5, bid: 97.5, couponRate: 6, maturityOn: "2030-10-08", lastCouponOn: "2026-04-08", periodsPerYear: 1 } as unknown as Offer;
const rachatO = { ...base, id: "r", kind: "RACHAT", nominal: 10_000 } as unknown as Offer;
const fonds = { ...base, id: "f", kind: "FONDS", operation: "opcvm", nominal: 1, fund: { depositary: "LCB Bank", nav: 105_750, navDate: "2026-09-30", minAmount: 100_000, entryFeePct: 2.5, exitFeePct: 1, manager: "X", distributed: true, cutoff: "11:00", settlementDays: 2, inceptionDate: "2021-04-01", perfSinceInceptionPct: 8.2, perf1yPct: 1.44, perf1yFrom: "2025-09-30", navOrigin: 10_000, managementFeePct: 1.2 } } as unknown as Offer;

/** Un fonds sans performance sur douze mois : son chiffre principal change de phrase. */
const fondsJeune = { ...fonds, id: "fj", fund: { ...(fonds as unknown as { fund: Record<string, unknown> }).fund, perf1yPct: undefined, perf1yFrom: undefined } } as unknown as Offer;

const OFFRES: Offer[] = [bta, ota, ape, actions, marche, marcheObl, rachatO, fonds, fondsJeune];
const TYPES: IntentType[] = ["ferme", "appetit", "cession", "achat", "vente", "souscription", "rachat", "rappel", "info"];
const NOW = new Date("2026-10-02T09:00:00Z");

/**
 * UN PRODUCTEUR QUI LÈVE DOIT LE DIRE, et non être sauté.
 *
 * La première version de ce cliquet attrapait les exceptions en silence pour
 * qu'un jeu d'essai incomplet ne fasse pas tomber le reste. Résultat : il a
 * passé au vert alors que `summarize` levait sur chaque ligne, donc que ni le
 * résumé ni les repères du tour n'étaient jamais composés. Un contrôle qui ne
 * peut pas échouer ne prouve rien, et celui-ci ne le pouvait plus.
 *
 * Les ratés sont donc collectés et contrôlés à la fin, avec leur nom.
 */
const rates: string[] = [];
const sans = <T,>(nom: string, f: () => T, defaut: T): T => {
  try {
    return f();
  } catch (e) {
    rates.push(`${nom} : ${(e as Error).message}`);
    return defaut;
  }
};

/**
 * LES CONTRÔLES D'ORDRE ET LES TEXTES DU DESK PASSENT EN ANGLAIS, EUX AUSSI.
 *
 * Même règle et même raison que pour les estimations : ces phrases se composent
 * avec des chiffres puis traversent t() sous forme de variable, donc le scanner
 * de clefs ne les voit pas et rien ne signalait qu'elles restaient en français.
 *
 * On les compose ici pour de vrai, sur chaque compartiment, avec des montants
 * qui passent et d'autres qui ne passent pas, et on exige du dictionnaire qu'il
 * connaisse chaque segment. La question est une couverture, pas une
 * ressemblance : voir `couverture.ts`.
 */
describe("les contrôles d'ordre passent en anglais", () => {
  it("toutes les natures de ligne, tous les types de demande", () => {
    const checksPhrases: string[] = [];
    for (const o of OFFRES)
      for (const t of TYPES)
        for (const m of [0, 1, 500, 5_000, 1_000_000, 10_000_000])
          for (const l of [null, 0.97, 97, 6, 88_000])
            for (const ctx of [undefined, { held: 5, needsAccount: true }]) for (const c of sans("orderChecks", () => orderChecks(o, t, m, l, ctx), [])) checksPhrases.push(c.text, c.why);

    expect(rates).toEqual([]);
    expect(checksPhrases.length).toBeGreaterThan(100);
    expect(inventaire(checksPhrases)).toEqual([]);
  });
});

describe("les textes du desk et de la fiche passent en anglais", () => {
  it("bloc de référence, résumé, explications, statuts, comparaison, versements, motifs, accusés", () => {
    const aPlat = (f: { calendar?: { label: string; when: string }[]; lines?: [string, string][]; reference: { title: string; rows: [string, string, boolean?][] } }): string[] => [
      ...(f.calendar ?? []).flatMap((s) => [s.label, s.when]),
      ...(f.lines ?? []).flat(),
      f.reference.title,
      ...f.reference.rows.flatMap((r) => [r[0], r[1]]),
    ];

    const deskPhrases: string[] = [];
    for (const o of OFFRES) {
      deskPhrases.push(...sans("backFacts", () => aPlat(backFacts(o, NOW)), []));
      const r = sans("offerReference", () => offerReference(o, NOW), undefined);
      if (r) deskPhrases.push(r.title, ...r.rows.flatMap((x) => [x[0], x[1]]));
      deskPhrases.push(...sans("offerRisks", () => offerRisks(o).flat(), []));
      const s = sans(`summarize ${o.id}`, () => summarize(o, NOW), undefined);
      if (s) deskPhrases.push(s.status, s.kind, s.hero, s.heroSub, s.heroUnit ?? "", s.deadline, s.countdown ?? "", s.coupon, ...(s.badges ?? []).map((b: { label: string }) => b.label));
      for (const k of sans(`explainKpis ${o.id}`, () => explainKpis(o, NOW), [])) deskPhrases.push(k.title, ...k.lines.flatMap((l) => [l[0], l[1] == null ? "" : String(l[1])]), ...(k.caveats ?? []));
      for (const fine of [false, true]) deskPhrases.push(sans("statusLabel", () => statusLabel(o, displayStatus(o, NOW), fine), ""));
      const c = sans("compareLine", () => compareLine(o, [], NOW), undefined);
      if (c) deskPhrases.push(c.family, c.ret.note, c.flows?.title ?? "");
      deskPhrases.push(...sans("standingBlock", () => standingBlock(o, { amount: 50_000, dayOfMonth: 5, startsOn: "2026-11-05" }), []));
      deskPhrases.push(sans("repaymentLabel", () => repaymentLabel(o) ?? "", ""));
      // Les repères du tour de la fiche : ils parlent de cette ligne, avec son
      // chiffre principal, et une clôture proche change le troisième.
      const s2 = sans(`summarize ${o.id}`, () => summarize(o, NOW), undefined);
      if (s2)
        for (const hasNews of [false, true])
          for (const countdown of [undefined, "2 h 10"]) deskPhrases.push(...sans("ficheStops", () => ficheStops(o, { ...s2, countdown }, { hasNews }).flatMap((c) => [c.title, c.text]), []));
    }
    // La durée réelle : deux mots que la fiche répète partout, et que
    // l'inventaire des producteurs du desk avait d'abord laissés de côté.
    for (const [a, b] of [
      ["2026-10-08", "2026-10-20"],
      ["2026-10-08", "2027-04-08"],
      ["2026-10-08", "2027-10-08"],
      ["2026-10-08", "2028-10-08"],
      ["2026-10-08", "2029-09-08"],
    ])
      deskPhrases.push(sans("tenorText", () => tenorText(a, b), ""));
    deskPhrases.push(...sans("fundBackFacts", () => aPlat(fundBackFacts({ nav: 105_750, entryFeePct: 2.5, exitFeePct: 1, minAmount: 100_000, cutoff: "11:00", settlementDays: 2, inceptionDate: "2021-04-01" })), []));
    for (const k of ["client", "echeance", "documents", "ligne_close", "position", "capacite", "doublon"]) deskPhrases.push(sans("reasonForDesk", () => reasonForDesk(k), ""), sans("reasonForClient", () => reasonForClient(k), ""));
    for (const t of TYPES) deskPhrases.push(sans("receivedLabel", () => receivedLabel(t), ""));

    expect(rates).toEqual([]);
    expect(deskPhrases.filter(Boolean).length).toBeGreaterThan(100);
    expect(inventaire(deskPhrases)).toEqual([]);
  });
});
