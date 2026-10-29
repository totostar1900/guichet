import type { IntentType, Offer } from "./types";
import { bondCalc, btaCalc } from "../finance";
import { marketBondCalc } from "./status";
import { fmt, fmtDate, fmtPct, fmtPrice } from "../format";

/**
 * One-line sizing of a client's amount at the published price : used in the
 * intent form (client) and in the desk's confirmation. Returns plain segments
 * so both React and text channels (WhatsApp) can render it.
 */
export interface Estimate {
  ok: boolean;
  text: string;
  titles?: number;
  outlay?: number;
}

export function estimate(o: Offer, amount: number): Estimate {
  if (!amount) return { ok: false, text: "Indiquez un montant pour voir le décaissement estimé au prix publié." };

  if ((o.kind === "OTA" || o.kind === "APE") && o.couponRate != null && o.maturityOn) {
    const price = o.servedPricePct ?? o.pricePct ?? 100;
    const r = bondCalc({ nominal: o.nominal, couponRate: o.couponRate, settleOn: o.settleOn, maturityOn: o.maturityOn, lastCouponOn: o.lastCouponOn }, amount, price);
    if (!r.titles) return { ok: false, text: `Montant inférieur à un titre (${fmt(o.nominal)} FCFA).` };
    if (o.minTitles && r.titles < o.minTitles) return { ok: false, text: `Minimum ${fmt(o.minTitles)} titres, soit ${fmt(o.minTitles * o.nominal)} FCFA de nominal.` };
    const accrued = r.accruedDays ? ` (dont ${fmt(r.accrued)} de coupon couru)` : "";
    return {
      ok: true,
      titles: r.titles,
      outlay: r.outlay,
      text: `≈ ${fmt(r.titles)} titres · décaissement ${fmt(r.outlay)} FCFA le ${fmtDate(o.settleOn, false)}${accrued} · rendement ${fmtPct(r.irr)} si servi à ${fmtPrice(price)}`,
    };
  }
  if (o.kind === "BTA" && o.precountRate != null && o.maturityOn) {
    const r = btaCalc({ nominal: o.nominal, settleOn: o.settleOn, maturityOn: o.maturityOn }, amount, o.precountRate);
    if (!r.n) return { ok: false, text: `Montant inférieur à un bon (≈ ${fmt(r.pricePerBond)} FCFA).` };
    return { ok: true, titles: r.n, outlay: r.outlay, text: `≈ ${fmt(r.n)} bons · décaissement ${fmt(r.outlay)} FCFA · remboursé ${fmt(r.redemption)} le ${fmtDate(o.maturityOn, false)}` };
  }
  if (o.kind === "ACTIONS" && o.pricePerShare) {
    const n = Math.floor(amount / o.pricePerShare);
    const min = o.minShares ?? 1;
    if (n < min) return { ok: false, text: `Minimum ${min} actions, soit ${fmt(min * o.pricePerShare)} FCFA.` };
    const div = o.dividendPerShare ? ` · dividende attendu ${fmt(n * o.dividendPerShare)}` : "";
    return { ok: true, titles: n, outlay: n * o.pricePerShare, text: `≈ ${fmt(n)} actions · à libérer ${fmt(n * o.pricePerShare)} FCFA${div}` };
  }
  if (o.kind === "MARCHE") {
    const isBond = o.instrument === "obligation";
    const ref = o.ask ?? o.lastPrice ?? 0;
    const unit = isBond ? (o.nominal * ref) / 100 : ref;
    const n = Math.floor(amount / Math.max(unit, 1));
    if (o.lotSize && n < o.lotSize) return { ok: false, text: `Quantité minimale ${o.lotSize} : soit ${fmt(o.lotSize * unit)} FCFA au cours actuel.` };
    // Le moteur de la carte, et la date de règlement du marché (T+n depuis aujourd'hui) :
    // « o.settleOn » est la date du primaire, elle n'a pas de sens sur une ligne cotée.
    const r = isBond ? (marketBondCalc(o, n * o.nominal, ref) ?? undefined) : undefined;
    return { ok: n > 0, titles: n, outlay: r ? r.outlay : n * unit, text: n > 0 ? `≈ ${fmt(n)} ${isBond ? "titres" : "actions"} au cours de référence ${isBond ? fmtPrice(ref) : fmt(ref) + " FCFA"} · ${fmt(r ? r.outlay : n * unit)} FCFA${r?.accruedDays ? ` dont ${fmt(r.accrued)} de coupon couru` : ""} · règlement T+${o.settlementDays ?? 3} · le prix d'exécution dépend du marché` : "Montant inférieur à une unité." };
  }
  if (o.kind === "FONDS" && o.fund) {
    const f = o.fund;
    if (amount < f.minAmount) return { ok: false, text: `Souscription minimale ${fmt(f.minAmount)} FCFA.` };
    const net = amount / (1 + f.entryFeePct / 100);
    const units = f.nav > 0 ? Math.floor((net / f.nav) * 1000) / 1000 : 0;
    return { ok: units > 0, titles: units, outlay: amount, text: `≈ ${units.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts à la VL du ${fmtDate(f.navDate, false)} (${fmt(f.nav)} FCFA)${f.entryFeePct ? ` · droits d'entrée ${fmtPct(f.entryFeePct, 2)} inclus` : " · sans droits d'entrée"} · le nombre exact de parts dépend de la VL retenue à la centralisation` };
  }
  if (o.kind === "RACHAT") {
    const proceeds = amount * o.nominal;
    return { ok: true, titles: amount, outlay: -proceeds, text: `${fmt(amount)} titres · produit de cession ${fmt(proceeds)} FCFA à 100 %` };
  }
  return { ok: false, text: "" };
}

/**
 * L'ÉQUIVALENCE, SOUS LE CHAMP : le même montant dit dans l'autre unité.
 *
 * Elle existait déjà, dans `estimate`, mais le formulaire l'envoyait dans la
 * bulle « Le calcul » du bloc de totaux dès que le montant devenait valable :
 * il fallait la demander pour la voir. Or un client qui tape dix millions veut
 * savoir combien de parts, ou combien de bons, cela fait, et il le veut
 * pendant qu'il tape. Elle sort donc de la bulle et passe sous le champ, plus
 * courte, avec la date de la valeur sur laquelle elle est calculée : sans
 * cette date, une estimation se lit comme un prix.
 *
 * `rest` est la seconde moitié de la vérité et elle ne se disait nulle part :
 * un titre ne se coupe pas, donc une partie du montant demandé ne part pas
 * toujours. Sur un fonds il n'y a pas de reste, les parts ont trois décimales.
 *
 * Les lignes cotées ne passent pas par ici : leur conversion a son propre
 * champ et sa propre phrase, parce qu'on y saisit indifféremment des titres ou
 * des francs.
 */
export interface Equivalence {
  /** La phrase, en français, comme `text` : elle passe par t() telle quelle. */
  line: string;
  /** Ce que le montant demandé laisse de côté, ou rien. */
  rest: number;
  /** Pourquoi ce reste existe, quand il existe. */
  restLine: string;
}

/**
 * Marché secondaire : comment le total se compose, et non un second total.
 *
 * La phrase annonçait « = 990 000 FCFA à décaisser » juste sous un total de
 * 1 009 466 : deux chiffres, tous deux présentés comme la somme à payer, et
 * rien pour dire lequel croire. Le premier oubliait le coupon couru, qui
 * s'achète avec le titre. Le total a sa ligne au-dessus ; celle-ci dit
 * seulement d'où il vient.
 *
 * Elle vivait dans le formulaire, avec sa jumelle du rachat. Elles rejoignent
 * les autres estimations pour que le cliquet qui vérifie leur passage en
 * anglais puisse les atteindre : une phrase fabriquée hors de ce fichier est
 * une phrase que personne ne surveille.
 */
export function marketEstimate(o: Offer, qty: number, type: IntentType, limit: number | null): string {
  if (!qty) return "Indiquez une quantité pour voir l'estimation au cours de référence.";
  const isBond = o.instrument === "obligation";
  const ref = limit ?? (type === "vente" ? (o.bid ?? o.lastPrice ?? 0) : (o.ask ?? o.lastPrice ?? 0));
  if (o.lotSize && qty < o.lotSize) return `Quantité minimale : ${o.lotSize}.`;
  if (!isBond) return `${fmt(qty)} actions × ${fmt(ref)} FCFA · prix d'exécution selon le marché`;
  const principal = (qty * o.nominal * ref) / 100;
  const r = marketBondCalc(o, qty * o.nominal, ref);
  const accrued = r?.accruedDays ? ` · + ${fmt(Math.round(r.accrued))} FCFA de coupon couru` : "";
  return `${fmt(qty)} titres × ${ref} % = ${fmt(Math.round(principal))} FCFA de principal${accrued} · prix d'exécution selon le marché`;
}

/** Le rachat d'un fonds : le champ porte des parts, et c'est un montant qui revient. */
/**
 * CE QU'UN RACHAT DE PARTS RAPPORTE, EN FRANCS.
 *
 * Le calcul existait, mais il ne SORTAIT que sous forme de phrase : la
 * fonction d'à côté l'écrivait et jetait le nombre. Tout ce qui voulait le
 * comparer — un plancher d'arbitrage, par exemple — devait donc soit le
 * refaire, soit se taire ; il s'est tu.
 */
export function produitDuRachat(o: Offer, units: number): number {
  if (!o.fund || !(units > 0)) return 0;
  const gross = units * o.fund.nav;
  return Math.round(gross - gross * (o.fund.exitFeePct / 100));
}

export function redemptionEstimate(o: Offer, units: number): string {
  if (!o.fund) return "";
  if (!units) return "Indiquez un nombre de parts pour voir l'estimation à la dernière VL.";
  const gross = units * o.fund.nav;
  const fee = gross * (o.fund.exitFeePct / 100);
  return `${units.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts × VL ${fmt(o.fund.nav)} FCFA = ${fmt(gross)} FCFA${fee ? ` · frais du fonds à la sortie ${fmt(fee)}` : ""} · net ≈ ${fmt(produitDuRachat(o, units))} FCFA à la VL de rachat`;
}

/**
 * CE QUE CETTE VENTE RAPPORTERAIT AUJOURD'HUI, QUELLE QUE SOIT LA SORTIE.
 *
 * Trois sorties, et trois conventions de signe qui se croisaient dans l'écran :
 * sur une ligne cotée le décaissement calculé EST le produit et il est positif ;
 * sur un rachat du Trésor « estimate » le rend NÉGATIF, par la convention des
 * flux ; sur un fonds il vaut zéro, parce que « estimate » attend des francs
 * là où le client compte des parts. Qui voulait comparer un plancher à ce que
 * la vente rapporte tombait donc sur « sans objet » deux fois sur trois — et
 * se taisait, ce qui ressemblait à un accord.
 *
 * Le produit du marché est passé en argument plutôt que recalculé : il porte
 * déjà la limite saisie et le cas d'une obligation cotée, et le refaire ici
 * serait un second calcul du même fait.
 */
export function produitAttendu(o: Offer, type: IntentType, quantite: number, produitDuMarche: number): number {
  if (type !== "vente" && type !== "rachat" && type !== "cession") return 0;
  if (o.kind === "FONDS") return produitDuRachat(o, quantite);
  if (o.kind === "RACHAT") return Math.max(0, Math.round(quantite * o.nominal));
  return Math.max(0, Math.round(produitDuMarche));
}

/**
 * LES TROIS NOMBRES LIÉS D'UNE DEMANDE AU PRIMAIRE.
 *
 * Quantité × prix unitaire = somme, et le produit est exact : c'est ce qui
 * autorise à écrire un signe « = » entre trois cases. Ce qui dépasse le
 * produit, le coupon couru d'une obligation ou le reste non placé d'un bon, se
 * dit ailleurs, en toutes lettres, et jamais dans la case du total.
 *
 * Le piège est que `amount` ne porte pas la même chose selon le compartiment :
 * des francs à décaisser sur un bon du Trésor, du nominal demandé sur une
 * obligation. Les deux facteurs de conversion le disent, pour que l'appelant
 * n'ait pas à le savoir une seconde fois.
 */
export interface SurveyTrio {
  /** Titres ou bons, à l'entier : on n'en achète pas des fractions. */
  count: number;
  /**
   * Ce que coûte une unité, en francs — AVEC SES CENTIMES SUR UN BON.
   *
   * Il était arrondi au franc, et l'arrondi mentait deux fois. Au bas du
   * formulaire, « Total à décaisser » calcule sur le prix réel : les deux
   * nombres différaient de deux francs sur le même écran, sous deux
   * étiquettes qui disent la même chose. Et la case « quantité », qui
   * multipliait par cet arrondi, retombait un franc trop bas une fois sur
   * deux — la quantité qu'on venait de taper revenait alors diminuée d'une
   * unité, quand elle ne vidait pas la case.
   *
   * Un prix de bon s'écrit avec ses centimes partout ailleurs : le Trésor
   * camerounais imprime « 9 899,45 ». L'arrondi n'était donc pas une
   * convention de la place, seulement une commodité d'affichage.
   */
  each: number;
  /** Le produit exact des deux. */
  total: number;
  /** Ce qu'une unité de plus ajoute à `amount`. */
  amountPerUnit: number;
  /** Par quoi multiplier un total saisi pour retrouver `amount`. */
  amountPerTotal: number;
  /** Le prix tel qu'on le saisit : un taux précompté, ou un pourcentage du nominal. */
  rate: number;
}

/**
 * LE MONTANT À POSER POUR N UNITÉS, ET POURQUOI IL EST ARRONDI PAR LE HAUT.
 *
 * Le formulaire ne porte qu'un nombre, en francs : c'est lui qui part au desk,
 * et c'est lui que « surveyTrio » relit pour réafficher une quantité. La
 * relecture divise et prend l'entier par le bas, donc le montant posé doit
 * couvrir les n unités À LA FRANCHE SUPÉRIEURE — sans quoi la quantité qu'on
 * vient de taper revient diminuée d'une unité dès que le prix porte des
 * centimes, c'est-à-dire presque toujours sur un bon.
 *
 * Le calcul vit ici plutôt que dans le gestionnaire du champ pour la raison
 * habituelle : une épreuve qui le refait à côté ne garde rien, et c'est
 * exactement ce qu'on a constaté en essayant de la faire tomber.
 */
export const montantPourUnites = (t: SurveyTrio, unites: number): number => Math.ceil(Math.max(0, unites) * t.amountPerUnit);

export function surveyTrio(o: Offer, amount: number, limit: number | null): SurveyTrio | null {
  if (o.kind === "BTA") {
    const rate = limit ?? o.precountRate;
    if (rate == null || !o.maturityOn) return null;
    const r = btaCalc({ nominal: o.nominal, settleOn: o.settleOn, maturityOn: o.maturityOn }, amount, rate);
    const each = r.pricePerBond;
    if (each <= 0) return null;
    return { count: r.n, each, total: r.n * each, amountPerUnit: each, amountPerTotal: 1, rate };
  }
  if (o.kind === "OTA" || o.kind === "APE") {
    const rate = limit ?? o.servedPricePct ?? o.pricePct ?? 100;
    const each = Math.round((o.nominal * rate) / 100);
    if (each <= 0) return null;
    const count = Math.max(0, Math.floor(amount / o.nominal));
    return { count, each, total: count * each, amountPerUnit: o.nominal, amountPerTotal: 100 / rate, rate };
  }
  return null;
}

export function equivalence(o: Offer, amount: number, type: IntentType): Equivalence | null {
  if (!amount || o.kind === "MARCHE") return null;

  if (o.kind === "FONDS" && o.fund) {
    const f = o.fund;
    const vl = `la VL du ${fmtDate(f.navDate, false)}, ${fmt(f.nav)} FCFA`;
    if (type === "rachat") return { line: `≈ ${fmt(Math.round(amount * f.nav))} FCFA à ${vl} · la VL de rachat arrêtera le montant`, rest: 0, restLine: "" };
    const net = amount / (1 + f.entryFeePct / 100);
    const units = f.nav > 0 ? Math.floor((net / f.nav) * 1000) / 1000 : 0;
    if (!units) return null;
    return { line: `≈ ${units.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts à ${vl} · le nombre exact sera celui de la VL d'exécution`, rest: 0, restLine: "" };
  }

  if (o.kind === "RACHAT") return { line: `≈ ${fmt(amount * o.nominal)} FCFA de produit de cession, au pair`, rest: 0, restLine: "" };

  const e = estimate(o, amount);
  if (!e.ok || !e.titles || e.outlay == null) return null;
  const unit = o.kind === "BTA" ? "bons" : o.kind === "ACTIONS" ? "actions" : "titres";
  // Sur une obligation du primaire le champ porte du nominal, et le décaissement
  // peut le dépasser : prix au-dessus du pair, coupon couru. Le reste s'y mesure
  // donc contre le nominal servi, et non contre la somme payée.
  const placed = o.kind === "OTA" || o.kind === "APE" ? e.titles * o.nominal : Math.round(e.outlay);
  const rest = Math.max(0, Math.round(amount) - placed);
  const each = Math.round(e.outlay / e.titles);
  const oneMore = unit === "bons" ? "un bon de plus" : unit === "actions" ? "une action de plus" : "un titre de plus";
  return {
    line: `≈ ${fmt(e.titles)} ${unit} · ${fmt(Math.round(e.outlay))} FCFA à décaisser`,
    rest,
    restLine: rest > 0 ? `${fmt(rest)} FCFA ne sont pas placés : ${oneMore} coûterait ${fmt(Math.max(0, each - rest))} FCFA de trop.` : "",
  };
}
