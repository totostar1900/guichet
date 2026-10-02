
import { describe, expect, it } from "vitest";
import { inventaire } from "./couverture";
import { orderChecks } from "@/lib/domain/checks";
import { backFacts, fundBackFacts } from "@/lib/domain/back";
import { summarize } from "@/lib/domain/summary";
import { offerReference, offerRisks } from "@/lib/domain/sheet";
import { explainKpis } from "@/lib/domain/explain";
import { displayStatus, repaymentLabel, statusLabel } from "@/lib/domain/status";
import { tenorText } from "@/lib/finance";
import { compareLine } from "@/lib/domain/compare";
import { standingBlock } from "@/lib/domain/standing";
import { reasonForClient, reasonForDesk } from "@/lib/domain/cancel-reasons";
import { receivedLabel } from "@/lib/domain/intent";
import type { IntentType, Offer } from "@/lib/domain/types";

const base = { settleOn: "2026-10-08", country: "CM", issuer: "Trésor", status: "ouverte", deadlineAt: "2026-12-01T12:00:00Z" };
const bta = { ...base, id: "b", kind: "BTA", nominal: 1_000_000, maturityOn: "2027-04-08", precountRate: 4.25, minTitles: 2 } as unknown as Offer;
const ota = { ...base, id: "o", kind: "OTA", nominal: 10_000, maturityOn: "2031-10-08", couponRate: 6.25, pricePct: 98.5, lastCouponOn: "2026-04-08", minTitles: 10, periodsPerYear: 1 } as unknown as Offer;
const ape = { ...ota, id: "ap", kind: "APE" } as unknown as Offer;
const actions = { ...base, id: "a", kind: "ACTIONS", nominal: 1, pricePerShare: 12_300, minShares: 10, dividendPerShare: 500 } as unknown as Offer;
const marche = { ...base, id: "m", kind: "MARCHE", nominal: 10_000, instrument: "action", lastPrice: 90_500, ask: 90_500, bid: 89_000, lotSize: 10, settlementDays: 3 } as unknown as Offer;
const marcheObl = { ...marche, id: "mo", instrument: "obligation", lastPrice: 98.5, ask: 98.5, bid: 97.5, couponRate: 6, maturityOn: "2030-10-08", lastCouponOn: "2026-04-08", periodsPerYear: 1 } as unknown as Offer;
const rachatO = { ...base, id: "r", kind: "RACHAT", nominal: 10_000 } as unknown as Offer;
const fonds = { ...base, id: "f", kind: "FONDS", nominal: 1, fund: { nav: 105_750, navDate: "2026-09-30", minAmount: 100_000, entryFeePct: 2.5, exitFeePct: 1, manager: "X", distributed: true, cutoff: "11:00", settlementDays: 2, inceptionDate: "2021-04-01" } } as unknown as Offer;

const OFFRES: Offer[] = [bta, ota, ape, actions, marche, marcheObl, rachatO, fonds];
const TYPES: IntentType[] = ["ferme", "appetit", "cession", "achat", "vente", "souscription", "rachat", "rappel", "info"];
const NOW = new Date("2026-10-02T09:00:00Z");

const sans = <T,>(f: () => T, defaut: T): T => {
  try {
    return f();
  } catch {
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
            for (const ctx of [undefined, { held: 5, needsAccount: true }]) for (const c of sans(() => orderChecks(o, t, m, l, ctx), [])) checksPhrases.push(c.text, c.why);

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
      deskPhrases.push(...sans(() => aPlat(backFacts(o, NOW)), []));
      const r = sans(() => offerReference(o, NOW), undefined);
      if (r) deskPhrases.push(r.title, ...r.rows.flatMap((x) => [x[0], x[1]]));
      deskPhrases.push(...sans(() => offerRisks(o).flat(), []));
      const s = sans(() => summarize(o, NOW), undefined);
      if (s) deskPhrases.push(s.status, s.kind, s.subtitle, s.hero, s.heroSub, s.heroUnit ?? "", s.deadline, s.countdown ?? "", s.coupon, ...(s.badges ?? []).map((b: { label: string }) => b.label));
      for (const k of sans(() => explainKpis(o, NOW), [])) deskPhrases.push(k.title, ...k.lines.flatMap((l) => [l[0], String(l[1])]), ...(k.caveats ?? []));
      for (const fine of [false, true]) deskPhrases.push(sans(() => statusLabel(o, displayStatus(o, NOW), fine), ""));
      const c = sans(() => compareLine(o, [], NOW), undefined);
      if (c) deskPhrases.push(c.family, c.ret.note, c.flows?.title ?? "");
      deskPhrases.push(...sans(() => standingBlock(o, { amount: 50_000, dayOfMonth: 5, startsOn: "2026-11-05" }), []));
      deskPhrases.push(sans(() => repaymentLabel(o) ?? "", ""));
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
      deskPhrases.push(sans(() => tenorText(a, b), ""));
    deskPhrases.push(...sans(() => aPlat(fundBackFacts({ nav: 105_750, entryFeePct: 2.5, exitFeePct: 1, minAmount: 100_000, cutoff: "11:00", settlementDays: 2, inceptionDate: "2021-04-01" })), []));
    for (const k of ["client", "echeance", "documents", "ligne_close", "position", "capacite", "doublon"]) deskPhrases.push(sans(() => reasonForDesk(k), ""), sans(() => reasonForClient(k), ""));
    for (const t of TYPES) deskPhrases.push(sans(() => receivedLabel(t), ""));

    expect(deskPhrases.filter(Boolean).length).toBeGreaterThan(100);
    expect(inventaire(deskPhrases)).toEqual([]);
  });
});
