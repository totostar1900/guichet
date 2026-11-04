import type { Offer } from "./types";
import { bondTerms, marketAmortInput, marketBondCalc, marketBondInput } from "./status";
import { bondCalc, btaAmountForBonds, btaCalc, couponDates, daysBetween, firstCouponDate, parseDate } from "../finance";
import { fmt, fmtDate, fmtDateTime, fmtPct, localIso } from "../format";

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
  /** Le dos ne porte pas la grille de chiffres de la face avant (dividende, acheteur / vendeur, ticket) : elle la redirait. */
  sansChiffres?: boolean;
  /** Le nom du bloc de dates, quand ce ne sont pas les étapes d'une opération. */
  calendarTitle?: string;
  /**
   * TROIS CHIFFRES CÔTE À CÔTE : combien ça vaut, ce que ça rapporte, jusqu'à
   * quand. Ils remplacent les quatre cases de la liste quand une ligne a mieux
   * à dire : le rendement y prend la place du coupon, parce que le coupon est
   * déjà écrit deux lignes plus bas et que le rendement ne l'était qu'au terme
   * d'un calcul, tout en bas, alors que c'est lui que porte la façade.
   */
  band?: [string, string, string?, string?][]; // étiquette, valeur, glose, seconde glose
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
const ageDuCours = (o: Offer, now: Date): [string?, string?] => {
  if (o.priceSince) {
    const j = daysBetween(o.priceSince, localIso(now));
    /* DEUX LIGNES, LA DATE PUIS LA DURÉE. Sur une seule, « depuis le 18 août
       2026, 47 jours » se coupe où la colonne le décide, et la virgule se
       retrouve en bout de ligne. Séparées, chacune se lit d'un coup : la
       première dit QUAND, la seconde DEPUIS COMBIEN DE TEMPS. */
    return j > 0 ? [`depuis le ${fmtDate(o.priceSince)}`, `${fmt(j)} jours`] : ["fixé à la dernière séance"];
  }
  return [o.lastPriceOn ? `séance du ${fmtDate(o.lastPriceOn)}` : undefined];
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

export function backFacts(o: Offer, now: Date, cours?: number[]): BackFacts {
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
      /* LE DOS D'UNE OBLIGATION DIT CE QUE LA FAÇADE NE DIT PAS (5 novembre 2026, choix 4A de la planche) : les FLUX (quand tombent les
         versements, combien), la LIQUIDITÉ (dernier échange, écart acheteur / vendeur) et ce que coûte et rapporte la ligne gardée
         jusqu'au terme. Le bandeau Cours · Rendement · Échéance en est parti : c'était, au mot près, la face avant. */
      const flux = r.flows;
      const vus = flux.length > 3 ? [flux[0], flux[1], flux[flux.length - 1]] : flux;
      const calendar: CalendarStep[] = vus.map((fl, i) => ({
        label: i === vus.length - 1 ? "Dernier versement + capital" : "Versement",
        when: fmtDate(fl.date.toISOString().slice(0, 10)),
        state: i === 0 ? "on" : "next",
      }));
      if (flux.length > 0 && r.titles > 0) lines.unshift(["Prochain versement par titre", `${fmt(Math.round(flux[0].amount / r.titles))} FCFA`]);
      const echange = ageDuCours(o, now).filter(Boolean).join(" · ");
      if (echange) lines.push(["Dernier échange", echange]);
      if (o.bid && o.ask && o.ask > 0) lines.push(["Écart acheteur / vendeur", fmtPct(((o.ask - o.bid) / o.ask) * 100, 1)]);
      return {
        title: o.title,
        sub: `${o.isin} · ${o.market ?? "BVMAC"}, cotation continue`,
        sansChiffres: true,
        calendarTitle: "Ce que la ligne verse",
        calendar,
        lines,
        reference: {
          title: `Pour ${fmt(1000)} titres au cours de référence`,
          rows: [
            [`Vous payez le ${fmtDate(src.settleOn)}, coupon couru inclus`, `${fmt(r.outlay)} FCFA`],
            ["Coupons et remboursement jusqu'au terme", `${fmt(r.outlay + r.gain)} FCFA`],
            ["Gain brut si gardée jusqu'au terme", `${fmt(r.gain)} FCFA`, true],
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
    /* LE DOS D'UNE ACTION NE DIT QUE CE QU'IL COÛTE ET CE QU'IL RAPPORTE (5 novembre 2026, choix 3B de la planche) : le dividende, l'acheteur / vendeur et le
       ticket sont déjà sur la face avant, le dernier cours aussi. Reste ce que la face ne calcule pas : le montant à T+n, le dividende d'un lot de cent
       actions, et l'écart entre l'offre et la demande, qui est le vrai coût d'une action peu liquide. */
    const n = 100;
    const rows: [string, string, boolean?][] = [];
    if (o.dividendPerShare) rows.push(["Dividende annuel attendu", `${fmt(n * o.dividendPerShare)} FCFA`]);
    /* LA FOURCHETTE DE TROIS MOIS, quand la carte a son graphe : où se situe le cours que l'on va payer, ce que la face ne dit pas. */
    if (cours && cours.length > 1 && Math.max(...cours) > Math.min(...cours)) rows.push(["Cours sur 3 mois", `${fmt(Math.min(...cours))} – ${fmt(Math.max(...cours))} FCFA`]);
    if (o.bid && o.ask && o.ask > 0) rows.push(["Écart acheteur / vendeur", fmtPct(((o.ask - o.bid) / o.ask) * 100, 1)]);
    rows.push([`Vous payez, règlement à T+${o.settlementDays ?? 3}`, `${fmt(n * ref)} FCFA`, true]);
    return { sansChiffres: true, reference: { title: `Pour ${n} actions au cours vendeur`, rows } };
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
