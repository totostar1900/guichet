import type { DisplayStatus, Offer } from "./types";
import { addBusinessDays, amortCalc, type AmortInput, bondCalc, type BondInput, type BondResult, btaCalc, parseDate, yearsBetween } from "../finance";
import { fmtDate, localIso } from "../format";
import { enabledTypes, getRegistry, typeOf, type MarketSegment, type ProductType } from "@/lib/registry";
export type { MarketSegment } from "@/lib/registry";

/** Bond schedule on file for an ISIN (desk-editable reference data). */
export const bondTerms = (isin: string) => getRegistry().bondTerms.get(isin);

/**
 * La date que porte une ligne qui ne ferme jamais.
 *
 * Une ligne cotée et un fonds se traitent en continu : ils n'ont pas de
 * clôture, mais le modèle en exige une. On leur pose donc une date si lointaine
 * qu'elle ne peut être prise pour une échéance. C'est une SENTINELLE, pas une
 * date, et qui la rencontre doit le savoir.
 *
 * Le desk affichait « Prochaine clôture dans 26755 j 4 h · jeu. 31 déc. 17 h 00 »
 * parce qu'il prenait le minimum des échéances sans l'écarter. Le compte à
 * rebours était juste ; c'est la question qui était fausse.
 *
 * Cinq endroits réécrivaient la règle à la main en listant les genres
 * concernés, et un sixième l'a oubliée. Ce prédicat ne liste rien : une ligne a
 * une clôture si sa date n'est pas la sentinelle, et cela restera vrai le jour
 * où un genre s'ajoutera.
 */
export const SANS_CLOTURE = "2099-12-31T17:00:00";
export const aUneCloture = (o: Offer): boolean => o.deadlineAt < SANS_CLOTURE;

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  quoted: "Cotée",
  on_request: "Sur demande",
  upcoming: "À venir",
  open: "Ouverte",
  closing: "Clôture imminente",
  closed: "Clôturée",
  results: "Résultats publiés",
  live: "En vie",
  matured: "Échue",
};

/**
 * The pill a client reads: four words. « Cotée » or « Souscription ouverte »
 * for what trades any day, « À venir », « Ouverte » (the last hours are told
 * by the countdown, not by another word), and « Clôturée » for every window
 * that is over, whatever the desk's finer state (closed, results, live,
 * matured). `fine` gives the desk its precise word.
 */
export function statusLabel(o: Offer, s: DisplayStatus, fine = false): string {
  if (o.kind === "FONDS" && s === "quoted") return "Souscription ouverte";
  if (fine) {
    if (s === "results" && !o.resultLine && !o.servedPricePct) return "Clôturée";
    return STATUS_LABEL[s];
  }
  if (s === "closing") return "Ouverte";
  if (s === "closed" || s === "results" || s === "live" || s === "matured") return "Clôturée";
  return STATUS_LABEL[s];
}

/** The client's four filter families, from the nine display states. */
export function clientStatusGroup(s: DisplayStatus): "quoted" | "upcoming" | "open" | "closed" {
  if (s === "quoted" || s === "on_request") return "quoted";
  if (s === "upcoming") return "upcoming";
  if (s === "open" || s === "closing") return "open";
  return "closed";
}

export const CLOSING_WINDOW_MS = 6 * 3600 * 1000;

/** What the client sees, derived from stored status + clock. */
export function displayStatus(o: Offer, now: Date = new Date()): DisplayStatus {
  // Une ligne cotée sort de la cote (« matured ») ou est retirée par le desk
  // (« withdrawn ») : dans les deux cas elle n'est plus commandable, mais seule
  // la seconde est une décision de la maison. Le client lit « Clôturée », qui
  // dit notre position et ne prête aucune conduite à la Bourse.
  if (o.kind === "MARCHE") return o.status === "withdrawn" || o.status === "matured" ? "matured" : "quoted";
  if (o.kind === "FONDS") return o.status === "withdrawn" ? "matured" : o.fund?.distributed && !o.hidden ? "quoted" : "on_request";
  if (o.status === "live") return "live";
  if (o.status === "matured") return "matured";
  if (o.status === "results") return "results";
  const opens = parseDate(o.opensAt);
  const deadline = parseDate(o.deadlineAt);
  if (opens > now) return "upcoming";
  if (deadline <= now) {
    return o.resultsAt && parseDate(o.resultsAt) <= now ? "results" : "closed";
  }
  if (deadline.getTime() - now.getTime() < CLOSING_WINDOW_MS) return "closing";
  return "open";
}

export const PAST_STATUSES: DisplayStatus[] = ["closed", "results", "live", "matured"];
export function isPast(s: DisplayStatus): boolean {
  return PAST_STATUSES.includes(s);
}
export function isActionable(s: DisplayStatus): boolean {
  return s === "open" || s === "closing" || s === "upcoming" || s === "quoted";
}

/** "2 h 30", "1 j 4 h", or "clôturée". */
export function countdown(toIso: string, now: Date = new Date()): string {
  const ms = parseDate(toIso).getTime() - now.getTime();
  if (ms <= 0) return "clôturée";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h < 24) return `${h} h ${String(m).padStart(2, "0")}`;
  const d = Math.floor(h / 24);
  return `${d} j ${h % 24} h`;
}

/** Remaining life in years (0 for equities). */
export function tenorYears(o: Offer): number {
  if (!o.maturityOn) return 0;
  return yearsBetween(o.settleOn, o.maturityOn);
}

/**
 * A listed bond bought today: settlement T+3, and : the BOC prints clean prices
 * the buyer pays the coupon accrued since the last anniversary of the maturity
 * date. Without this a bond at par would show a yield far above its coupon.
 */
/** Repayment schedule of a listed bond when its fiche signalétique is on file; settlement T+3 from today. */
/**
 * Comment le capital revient : « in fine », ou par tranches.
 *
 * La question décide de tout le reste et ne paraissait nulle part. Deux lignes
 * de même taux et de même échéance ne se valent pas si l'une rend le capital
 * d'un coup et l'autre par tranches : la seconde rend l'argent plus tôt, donc
 * en risque moins, et son coupon décroît. Le client lisait deux fiches
 * identiques.
 *
 * Le mot se déduit de ce qui construit déjà l'échéancier, et jamais d'un champ
 * saisi à part : un libellé qui pourrait contredire le tableau des flux juste
 * en dessous vaudrait moins que pas de libellé du tout. Le référentiel porte
 * l'échéancier d'une ligne cotée, et lui seul : sans lui, un remboursement en
 * une fois, ce que dit aussi le communiqué de toute adjudication du primaire.
 */
export function repaymentLabel(o: Offer): string | undefined {
  if (o.kind === "FONDS" || o.kind === "ACTIONS" || o.kind === "APE") return undefined;
  const t = bondTerms(o.isin);
  if (t && o.instrument === "obligation" && o.couponRate != null) {
    return t.graceUntil
      ? `par tranches, après un différé jusqu'au ${fmtDate(t.graceUntil)}`
      : "par tranches, à chaque échéance de coupon";
  }
  return "in fine : tout le capital à l'échéance";
}

export function marketAmortInput(o: Offer, now = new Date(), settleOn?: string): AmortInput | null {
  const t = bondTerms(o.isin);
  if (!t || o.instrument !== "obligation" || o.couponRate == null) return null;
  const settle = addBusinessDays(now, o.settlementDays ?? 3);
  return { nominal: o.nominal, couponRate: o.couponRate, settleOn: settleOn ?? localIso(settle), maturityOn: t.maturityOn, periodsPerYear: t.periodsPerYear, graceUntil: t.graceUntil, commissionPct: o.commissionPct };
}

/**
 * Le calcul d'une obligation cotée, moteur compris.
 *
 * Une obligation d'État de la zone s'amortit : le capital revient par
 * tranches, et le coupon suit le nominal qui reste. Quand le référentiel
 * porte son échéancier, c'est celui-là qu'il faut ; sinon il ne reste que
 * l'approximation « in fine », capital remboursé en une fois à l'échéance.
 *
 * Les deux donnent des rendements très différents sur le même titre : à 97 %
 * d'un nominal qui revient vite, la décote se récupère sur une durée de vie
 * moyenne courte et le rendement annualisé monte. Écrire ce choix une seule
 * fois est donc la seule façon d'éviter que la carte annonce un chiffre et
 * que le panneau censé l'expliquer en affiche un autre : c'est exactement ce
 * qui arrivait, 10,91 % contre 9,18 % sur la même ligne.
 */
export function marketBondCalc(o: Offer, nominalAmount: number, pricePct: number, opts: { now?: Date; settleOn?: string } = {}): BondResult | null {
  const now = opts.now ?? new Date();
  const a = marketAmortInput(o, now, opts.settleOn);
  if (a) return a.maturityOn > a.settleOn ? amortCalc(a, nominalAmount, pricePct) : null;
  const b = marketBondInput(o, now, opts.settleOn);
  if (!b || b.maturityOn <= b.settleOn) return null;
  return bondCalc(b, nominalAmount, pricePct);
}

/** True when the BOC's year is all we know about the maturity (no fiche on file). */
export const maturityIsGuess = (o: Offer): boolean => o.kind === "MARCHE" && o.instrument === "obligation" && !bondTerms(o.isin) && o.priceSource !== "desk" && Boolean(o.maturityOn?.endsWith("-12-31"));

export function marketBondInput(o: Offer, now = new Date(), on?: string): BondInput | null {
  if (o.instrument !== "obligation" || o.couponRate == null || !o.maturityOn) return null;
  const settle = addBusinessDays(now, o.settlementDays ?? 3);
  const settleOn = on ?? localIso(settle);
  let last = o.lastCouponOn ?? undefined;
  if (!last) {
    const d = parseDate(o.maturityOn);
    while (localIso(d) > settleOn) d.setFullYear(d.getFullYear() - 1);
    last = localIso(d);
  }
  return { nominal: o.nominal, couponRate: o.couponRate, settleOn, maturityOn: o.maturityOn, lastCouponOn: last, commissionPct: o.commissionPct };
}

/**
 * What the Guichet prints as « rendement ».
 *
 * LA RÈGLE « AU PAIR » NE VAUT PLUS SUR LA COTE, depuis le 4 octobre 2026.
 * Elle rendait le TAUX NOMINAL pour une obligation cotée à 100 ± 0,05, au
 * motif que le rendement actuariel n'en différerait que de quelques points de
 * base de pure convention de calcul, et qu'afficher « 7,46 % » à côté d'un nom
 * qui dit « 7,50 % » ressemblerait à une erreur.
 *
 * TROIS MESURES ONT DÉFAIT CE MOTIF, prises sur les trente-cinq lignes cotées
 * en production :
 *
 * 1. VINGT-CINQ SONT EXACTEMENT À 100,00. La règle ne gouvernait pas une
 *    exception, elle gouvernait 71 % du tableau : la même pastille or portait
 *    un taux nominal sur vingt-quatre cartes et un rendement actuariel sur
 *    onze, et la liste se triait sur ce mélange.
 * 2. « QUELQUES POINTS DE BASE » EST VRAI POUR LES ANNUITÉS, de 0 à −9 pb, et
 *    FAUX POUR LES AMORTISSEURS FRÉQUENTS : +9 pb sur ALIOS 6,5 2028, +10 sur
 *    ACEP 7 2027, +13 sur ALIOS-05, +18 sur ALIOS-06 7 2030. Le signe lui-même
 *    s'inverse. Là ce n'est pas une convention : le capital revient par
 *    tranches, se replace, et le rendement dépasse réellement le coupon.
 * 3. Hors du pair l'écart va de +191 à +388 pb, donc les deux mesures ne sont
 *    comparables en rien.
 *
 * LA CONTRADICTION APPARENTE SE RÈGLE PAR LA PHRASE, pas en masquant le
 * chiffre : la carte écrit « 7,46 % · actuariel annuel brut au cours 100 % ·
 * coupon 7,50 % ». Les deux nombres sont là et leur différence est nommée.
 *
 * LES ADJUDICATIONS GARDENT LA RÈGLE, et c'est voulu : leur 100 % n'est pas un
 * cours figé mais un prix à servir, le taux nominal y est le taux contractuel
 * d'une opération à venir, et une séance ne se compare pas à une ligne cotée.
 *
 * `approx` flags a maturity known by its year only.
 */
export function displayYield(o: Offer): { pct: number | null; atPar: boolean; approx: boolean } {
  const isBond = o.kind === "OTA" || o.kind === "APE" || (o.kind === "MARCHE" && o.instrument === "obligation");
  // A listed bond past its maturity is still printed by the BOC for a while: nothing to earn.
  if (o.kind === "MARCHE" && isBond && o.maturityOn && o.maturityOn < localIso(new Date())) return { pct: null, atPar: false, approx: false };
  if (isBond && o.couponRate != null && o.kind !== "MARCHE") {
    const price = o.servedPricePct ?? o.pricePct;
    if (price != null && Math.abs(price - 100) <= 0.05) return { pct: o.couponRate, atPar: true, approx: false };
  }
  return { pct: auPairJamaisSousLeCoupon(o, headlineYield(o)), atPar: false, approx: maturityIsGuess(o) };
}

/**
 * AU PAIR, LE RENDEMENT NE PASSE PAS SOUS LE COUPON.
 *
 * Une obligation cotée exactement à 100 et sans commission rapporte son
 * coupon : c'est la définition du pair. Le calcul en rend pourtant un peu
 * moins, de 0 à 9 points de base selon la ligne, et cet écart ne vient de
 * rien de réel. Il vient de la convention : le moteur résout un taux
 * actuariel sur les dates réelles en Act/365, là où le coupon est un taux
 * nominal annuel, et une année ne fait pas exactement 365 jours. Afficher
 * « 7,46 % » sur une ligne qui s'appelle « 7,50 % » et qui cote 100 donnait
 * donc un chiffre faux dans le sens de la prudence, ce qui reste faux.
 *
 * VÉRIFIÉ AVANT D'AGIR, parce qu'un rendement est un chiffre sur lequel un
 * client décide : la commission vaut 0 sur les trente-cinq lignes cotées en
 * production. L'écart n'est donc pas un frais que ce plancher viendrait
 * cacher. S'il devenait un frais, ce plancher le cacherait, et il faudrait
 * le retirer le jour où une commission apparaît : l'épreuve le dit.
 *
 * LE PLANCHER NE VAUT QU'AU PAIR, ET C'EST LE POINT. Au-dessus du pair, une
 * obligation rapporte RÉELLEMENT moins que son coupon : on paie plus que ce
 * qu'on sera remboursé, et la perte en capital mange une part du coupon. Y
 * relever le chiffre ne serait plus un arrondi, ce serait un mensonge de
 * plusieurs dizaines de points de base sur un rendement. Aucune ligne ne cote
 * au-dessus du pair aujourd'hui, les trente-cinq sont à 100 ou en dessous ;
 * le jour où l'une y passe, elle montrera son vrai rendement.
 *
 * Sous le pair, le rendement dépasse le coupon de 191 à 388 pb : le plancher
 * n'y touche pas. Et sur les amortisseurs trimestriels il le dépasse déjà de
 * 9 à 18 pb, par l'effet du taux effectif : il n'y touche pas non plus.
 */
function auPairJamaisSousLeCoupon(o: Offer, pct: number | null): number | null {
  if (pct == null || o.kind !== "MARCHE" || o.instrument !== "obligation" || o.couponRate == null) return pct;
  if (o.commissionPct > 0) return pct; // un frais est réel : il doit se voir dans le rendement
  const price = o.ask ?? o.lastPrice;
  if (price == null || Math.abs(price - 100) > 0.05) return pct;
  return Math.max(pct, o.couponRate);
}

/** The single number on the card. Null when nothing sensible exists (buybacks). */
export function headlineYield(o: Offer): number | null {
  switch (o.kind) {
    case "OTA":
    case "APE": {
      if (o.couponRate == null || !o.maturityOn) return null;
      const price = o.servedPricePct ?? o.pricePct ?? 100;
      return bondCalc(
        { nominal: o.nominal, couponRate: o.couponRate, settleOn: o.settleOn, maturityOn: o.maturityOn, lastCouponOn: o.lastCouponOn },
        o.nominal * 1000,
        price,
      ).irr;
    }
    case "BTA": {
      if (o.precountRate == null || !o.maturityOn) return null;
      return btaCalc({ nominal: o.nominal, settleOn: o.settleOn, maturityOn: o.maturityOn }, o.nominal, o.precountRate).yieldPct;
    }
    case "ACTIONS":
      if (!o.dividendPerShare || !o.pricePerShare) return null;
      return (o.dividendPerShare / o.pricePerShare) * 100;
    case "MARCHE": {
      if (o.instrument === "obligation" && o.lastPrice != null) {
        // Only the year of maturity is printed in the BOC: with less than a year left the
        // guess (31/12) swings the yield by tens of points : better no figure than a wrong one.
        // Le calcul, lui, reste possible : c'est la publication d'un rendement qu'on refuse.
        if (maturityIsGuess(o)) {
          const b = marketBondInput(o);
          if (b && yearsBetween(b.settleOn, b.maturityOn) < 1) return null;
        }
        return marketBondCalc(o, o.nominal * 1000, o.ask ?? o.lastPrice)?.irr ?? null;
      }
      if (o.instrument === "action" && o.dividendPerShare && o.lastPrice) return (o.dividendPerShare / o.lastPrice) * 100;
      return null;
    }
    default:
      return null;
  }
}

export const KIND_LABEL: Record<Offer["kind"], string> = {
  OTA: "OTA",
  BTA: "BTA",
  ACTIONS: "Actions",
  APE: "Obligations APE",
  RACHAT: "Rachat",
  MARCHE: "Marché secondaire",
  FONDS: "OPCVM",
};

/**
 * What the client actually buys, finer than `kind`: a listed share and a listed
 * bond are both MARCHE offers but read very differently. Each family belongs to
 * one market segment : primary (new paper), secondary (already listed) or funds.
 */
export type OfferFamily = string; // a product-type key
export const offerFamily = (o: Pick<Offer, "kind" | "instrument" | "typeKey">): OfferFamily => typeOf(o).key;
export const familyType = (key: string): ProductType => typeOf({ kind: "OTA", typeKey: key });
export const familyLabel = (key: string): string => familyType(key).label;
export const familyShort = (key: string): string => familyType(key).short;
export const familySegment = (key: string): MarketSegment => familyType(key).segment;
export const FAMILIES = (): string[] => enabledTypes().map((x) => x.key);
export const SEGMENT_LABEL: Record<MarketSegment, string> = { primaire: "Marché primaire", secondaire: "Marché secondaire", fonds: "Gestion collective" };
export const SEGMENT_HINT: Record<MarketSegment, string> = {
  primaire: "Titres neufs : vous souscrivez auprès de l'émetteur (Trésor, entreprise) pendant une fenêtre, à un prix fixé par adjudication ou par le desk.",
  secondaire: "Titres déjà cotés à la BVMAC : vous achetez ou vendez à un autre investisseur, au cours du jour, en séance.",
  fonds: "Parts de fonds communs de placement : vous souscrivez ou rachetez à la prochaine valeur liquidative.",
};

export const OPERATION_LABEL: Record<Offer["operation"], string> = {
  nouvelle_ligne: "Nouvelle ligne",
  abondement: "Abondement",
  rachat: "Rachat par le Trésor",
  ipo: "IPO",
  emprunt_ape: "Emprunt obligataire",
  secondaire: "Cotation",
  opcvm: "Fonds commun de placement",
};
