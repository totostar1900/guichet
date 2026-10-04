import type { Offer } from "./types";
import { bondTerms, marketAmortInput, marketBondCalc, marketBondInput, maturityIsGuess } from "./status";
import { amortCalc, bondCalc, btaAmountForBonds, btaCalc, couponDates, daysBetween, firstCouponDate, parseDate, tenorText } from "../finance";
import { fmt, fmtDate, fmtDateTime, fmtPct, fmtPrice, localIso } from "../format";

/**
 * What the back of a card says, from the offer alone (pure, client-side):
 * the calendar of an operation with its current step, or, for a line that
 * has no operation (listed, fund), a couple of dated facts; and the
 * reference calculation of the fiche, in four lines. The curve (quotes,
 * NAVs, past auctions) needs the repository: see `lineCurve` in the actions.
 */
export interface CalendarStep {
  label: string;
  when: string; // short, as shown
  state: "done" | "on" | "next";
}
export interface BackFacts {
  /**
   * LE NOM COMPLET DE LA LIGNE, en tête du dos. La façade compacte ne porte
   * que « GAB » : c'est au dos qu'on vérifie de quelle ligne on parle avant de
   * passer un ordre en banque. `sub` porte l'ISIN et la place.
   */
  title?: string;
  sub?: string;
  /**
   * TROIS CHIFFRES CÔTE À CÔTE : combien ça vaut, ce que ça rapporte, jusqu'à
   * quand. Ils remplacent les quatre cases de la liste quand une ligne a mieux
   * à dire : le rendement y prend la place du coupon, parce que le coupon est
   * déjà écrit deux lignes plus bas et que le rendement ne l'était qu'au terme
   * d'un calcul, tout en bas, alors que c'est lui que porte la façade.
   */
  band?: [string, string, string?][]; // label, value, note
  calendar?: CalendarStep[]; // an operation
  lines?: [string, string][]; // dated facts of a line without operation
  reference: { title: string; rows: [string, string, boolean?][] }; // label, value, total?
}

const short = (iso: string, now: Date): string => {
  const d = parseDate(iso);
  return d.getFullYear() === now.getFullYear() ? fmtDate(iso, false) : fmtDate(iso);
};
/**
 * DEPUIS QUAND LE COURS EST CE COURS, en toutes lettres.
 *
 * La façade abrège en « 97 % · 47 j », et cette abréviation se lit « dernière
 * transaction il y a 47 jours à 97 % ». C'est le contresens exact qu'elle rend
 * possible, et il a été fait, le 4 octobre 2026, par la personne qui a demandé
 * la carte. Le dos n'a pas la contrainte de place de la façade : il écrit la
 * phrase entière, et la ligne du dessous dit si la ligne a traité.
 *
 * `priceSince` et `lastPriceOn` ne disent pas la même chose : la seconde porte
 * la date de la SÉANCE, donc souvent celle d'aujourd'hui, et ne renseigne en
 * rien l'âge du cours.
 */
const ageDuCours = (o: Offer, now: Date): string | undefined => {
  if (o.priceSince) {
    const j = daysBetween(o.priceSince, localIso(now));
    return j > 0 ? `inchangé depuis le ${fmtDate(o.priceSince)}, ${fmt(j)} jours` : "fixé à la dernière séance";
  }
  return o.lastPriceOn ? `séance du ${fmtDate(o.lastPriceOn)}` : undefined;
};

const hm = (iso: string): string => {
  const t = fmtDateTime(iso);
  return t.replace(/^\S+\s/, ""); // drop the weekday
};

function steps(now: Date, items: [string, string | undefined, string | undefined][]): CalendarStep[] {
  // items: label, iso date (undefined = unknown), shown text override
  const list = items.filter(([, iso]) => iso !== undefined) as [string, string, string | undefined][];
  let onSet = false;
  return list.map(([label, iso, shown]) => {
    const past = parseDate(iso).getTime() < now.getTime();
    let state: CalendarStep["state"] = "next";
    if (past) state = "done";
    else if (!onSet) {
      state = "on";
      onSet = true;
    }
    return { label, when: shown ?? short(iso, now), state };
  });
}

export function backFacts(o: Offer, now: Date): BackFacts {
  if ((o.kind === "OTA" || o.kind === "APE") && o.maturityOn) {
    const first = o.kind === "OTA" ? firstCouponDate(o.settleOn, o.maturityOn) : undefined;
    const price = o.servedPricePct ?? o.pricePct ?? 100;
    const r = bondCalc({ nominal: o.nominal, couponRate: o.couponRate ?? 0, settleOn: o.settleOn, maturityOn: o.maturityOn, lastCouponOn: o.lastCouponOn, commissionPct: o.commissionPct }, 10_000_000, price);
    return {
      calendar: steps(now, [
        ["Dépôt", o.deadlineAt, hm(o.deadlineAt)],
        ["Résultats", o.resultsAt, undefined],
        ["Règlement", o.settleOn, undefined],
        ["1er coupon", first ? first.toISOString().slice(0, 10) : undefined, undefined],
        ["Échéance", o.maturityOn, undefined],
      ]),
      reference: {
        title: o.servedPricePct ? "Pour 10 000 000 FCFA de nominal, au prix servi" : "Pour 10 000 000 FCFA de nominal, au prix Purpose",
        rows: [
          [`Titres de ${fmt(o.nominal)}`, fmt(r.titles)],
          [`Décaissement le ${fmtDate(o.settleOn, false)}`, `${fmt(r.outlay)} FCFA`],
          ["Coupons et remboursement", fmt(r.outlay + r.gain)],
          ["Gain brut jusqu'au terme", `${fmt(r.gain)} FCFA`, true],
        ],
      },
    };
  }
  if (o.kind === "BTA" && o.maturityOn) {
    const b = { nominal: o.nominal, settleOn: o.settleOn, maturityOn: o.maturityOn };
    const rate = o.precountRate ?? 0;
    const r = btaCalc(b, btaAmountForBonds(b, 10, rate), rate);
    return {
      calendar: steps(now, [
        ["Dépôt", o.deadlineAt, hm(o.deadlineAt)],
        ["Résultats", o.resultsAt, undefined],
        ["Règlement", o.settleOn, undefined],
        ["Échéance", o.maturityOn, undefined],
      ]),
      reference: {
        title: `Pour 10 bons de ${fmt(o.nominal)} FCFA`,
        rows: [
          ["Prix d'achat par bon", fmt(r.pricePerBond)],
          [`Décaissement le ${fmtDate(o.settleOn, false)}`, `${fmt(r.outlay)} FCFA`],
          [`Remboursement le ${fmtDate(o.maturityOn, false)}`, fmt(r.redemption)],
          ["Intérêt (précompté)", `${fmt(r.gain)} FCFA`, true],
        ],
      },
    };
  }
  if (o.kind === "ACTIONS") {
    const n = 100;
    const price = o.pricePerShare ?? 0;
    const rows: [string, string, boolean?][] = [
      ["Montant à libérer", `${fmt(n * price)} FCFA`],
      [`Dividende attendu (${fmt(o.dividendPerShare ?? 0)} / action)`, fmt(n * (o.dividendPerShare ?? 0))],
    ];
    if (o.lastPrice) {
      rows.push([`Valeur au dernier cours (${fmt(o.lastPrice)})`, fmt(n * o.lastPrice)]);
      rows.push(["Plus-value latente au dernier cours", `${o.lastPrice >= price ? "+" : ""}${fmt(n * (o.lastPrice - price))} FCFA`, true]);
    } else rows.push(["Total à libérer", `${fmt(n * price)} FCFA`, true]);
    return {
      calendar: steps(now, [
        ["Ouverture", o.opensAt, undefined],
        ["Clôture", o.deadlineAt, hm(o.deadlineAt)],
        ["Règlement", o.settleOn, undefined],
        ["Cotation", o.settleOn, "BVMAC"],
      ]),
      reference: { title: `Pour ${n} actions`, rows },
    };
  }
  if (o.kind === "RACHAT") {
    const n = 500;
    return {
      calendar: steps(now, [
        ["Dépôt", o.deadlineAt, hm(o.deadlineAt)],
        ["Règlement", o.settleOn, undefined],
        ["Échéance initiale", o.maturityOn, undefined],
      ]),
      reference: {
        title: `Pour ${n} titres cédés`,
        rows: [
          ["Produit de cession à 100 %", `${fmt(n * o.nominal)} FCFA`],
          ["Coupon couru", "réglé par le Trésor"],
          [`Encaissement le ${fmtDate(o.settleOn, false)}`, `${fmt(n * o.nominal)} FCFA`, true],
        ],
      },
    };
  }
  if (o.kind === "FONDS" && o.fund) return fundBackFacts(o.fund);
  // A listed line: a couple of dated facts, then the reference at the asking price.
  const isBond = o.kind === "MARCHE" && o.instrument === "obligation";
  const ref = o.ask ?? o.lastPrice ?? 0;
  const lines: [string, string][] = [];
  if (isBond) {
    const ai = marketAmortInput(o);
    const bi = marketBondInput(o);
    const src = ai && ai.maturityOn > ai.settleOn ? ai : bi && bi.maturityOn > bi.settleOn ? bi : null;
    const r = src ? marketBondCalc(o, 1000 * o.nominal, ref) : null;
    if (src && r) {
      const next = couponDates(src.settleOn, src.maturityOn)[0];
      /* L'ANNÉE EST ÉCRITE, TOUJOURS. `short` l'enlève quand la date tombe
         dans l'année en cours : sur une ligne qui court jusqu'en 2028 et dont
         le coupon tombe tous les 30 décembre, « 30 déc. » ne dit pas lequel.
         L'année n'est pas une décoration sur le dos d'une obligation. */
      if (next) lines.push(["Prochain coupon", `${fmtDate(next.toISOString().slice(0, 10))} · ${fmtPct(o.couponRate ?? 0, 2)}`]);
      const terms = bondTerms(o.isin);
      lines.push(["Amortissement", terms ? `${terms.periodsPerYear === 1 ? "annuités" : terms.periodsPerYear === 2 ? "semestrialités" : "trimestrialités"} égales` : "in fine (à confirmer)"]);
      /* LE TICKET DESCEND DE LA FAÇADE. En compacte la façade ne montre qu'un
         chiffre ; le ticket était l'une des quatre cases du dos, il reprend la
         place laissée par la ligne de règlement. */
      const lot = o.lotSize ?? 1;
      if (ref > 0) lines.push(["Ticket minimum", `${fmt((lot * o.nominal * ref) / 100)} FCFA`]);
      return {
        title: o.title,
        sub: `${o.isin} · ${o.market ?? "BVMAC"}, cotation continue`,
        band: [
          ["Cours", fmtPrice(ref), ageDuCours(o, now)],
          ["Rendement", fmtPct(r.irr, 2), "actuariel brut à ce cours"],
          ["Échéance", maturityIsGuess(o) ? `${o.maturityOn?.slice(0, 4) ?? "—"} ≈` : fmtDate(o.maturityOn ?? ""), o.maturityOn ? tenorText(localIso(now), o.maturityOn) : undefined],
        ],
        lines,
        reference: {
          title: `Pour ${fmt(1000)} titres au cours de référence`,
          rows: [
            [`Prix ${fmtPrice(ref)}`, fmt(r.titles * r.pricePerTitle)],
            [`Coupon couru (${r.accruedDays} jours)`, fmt(r.accrued)],
            /* LA LIGNE DE RÈGLEMENT EST PARTIE : « T+3 · cotation continue » se
               répétait à côté d'un décaissement qui le disait déjà, et la place
               valait mieux. Elle ne disparaît pas pour autant : le décaissement
               porte désormais SA DATE, ce qui est plus utile qu'un délai, et
               c'est elle qui compte les jours de coupon couru juste au-dessus. */
            [`Décaissement le ${fmtDate(src.settleOn)}`, `${fmt(r.outlay)} FCFA`],
            ["Rendement actuariel annuel brut à ce cours", fmtPct(r.irr, 2), true],
          ],
        },
      };
    }
    if (src) {
      const next = couponDates(src.settleOn, src.maturityOn)[0];
      if (next) lines.push(["Prochain coupon", `${fmtDate(next.toISOString().slice(0, 10))} · ${fmtPct(o.couponRate ?? 0, 2)}`]);
      const terms = bondTerms(o.isin);
      lines.push(["Amortissement", terms ? `${terms.periodsPerYear === 1 ? "annuités" : terms.periodsPerYear === 2 ? "semestrialités" : "trimestrialités"} égales` : "in fine (à confirmer)"]);
    }
  } else {
    if (o.dividendPerShare) lines.push(["Dernier dividende brut", `${fmt(o.dividendPerShare)} FCFA`]);
    if (o.lastPriceOn) lines.push(["Dernier cours", `${fmt(o.lastPrice ?? 0)} FCFA · ${short(o.lastPriceOn, now)}`]);
  }
  /* Une action, ou une obligation dont le calcul n'aboutit pas : le règlement
     reste dit ici, puisque aucun décaissement daté ne le porte. */
  lines.push(["Règlement", `T+${o.settlementDays ?? 3} · cotation continue`]);
  const n = isBond ? 1000 : 100;
  return {
    lines,
    reference: {
      title: `Pour ${n} actions au cours vendeur`,
      rows: [
        ["Cours vendeur", `${fmt(ref)} FCFA`],
        ["Montant", `${fmt(n * ref)} FCFA`],
        ...(o.dividendPerShare ? ([["Dividende annuel attendu", fmt(n * o.dividendPerShare)]] as [string, string][]) : []),
        ["Total à décaisser", `${fmt(n * ref)} FCFA`, true],
      ],
    },
  };
}

/** The back of a fund, from the few fields the list carries (the funds page has rows, not offers). */
export function fundBackFacts(f: { nav: number; entryFeePct: number; exitFeePct: number; minAmount: number; cutoff?: string; settlementDays?: number; inceptionDate?: string }): BackFacts {
  const amount = Math.max(f.minAmount, 1_000_000);
  const net = amount / (1 + f.entryFeePct / 100);
  const units = f.nav > 0 ? Math.floor((net / f.nav) * 1000) / 1000 : 0;
  const lines: [string, string][] = [["Prochaine VL · centralisation", f.cutoff ?? "sur demande"]];
  if (f.settlementDays != null) lines.push(["Règlement", `J+${f.settlementDays} après la VL`]);
  if (f.inceptionDate) lines.push(["Création du fonds", fmtDate(f.inceptionDate)]);
  const rows: [string, string, boolean?][] = [];
  if (f.entryFeePct > 0) rows.push([`Frais du fonds à l'entrée ${fmtPct(f.entryFeePct, 2)}`, fmt(amount - net)]);
  rows.push(["Investi dans le fonds", fmt(net)]);
  rows.push([`Parts (VL ${fmt(f.nav)})`, `≈ ${units.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}`, true]);
  if (f.exitFeePct > 0) rows.push(["Frais du fonds à la sortie", fmtPct(f.exitFeePct, 2)]);
  return { lines, reference: { title: `Pour ${fmt(amount)} FCFA à la dernière VL`, rows } };
}
