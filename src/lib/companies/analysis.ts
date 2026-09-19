import type { Company, YearFigures } from "@/data/companies";
import type { Quote } from "@/lib/domain/market";
import { fmt, fmtDate, fmtPct, localIso } from "@/lib/format";

/** Price chart periods and their start date. */
export const PERIODS: [string, string][] = [
  ["1m", "1 mois"],
  ["3m", "3 mois"],
  ["ytd", "Depuis le 1er janv."],
  ["1a", "1 an"],
  ["max", "Max"],
];
export function periodFrom(p: string, now = new Date()): string {
  const d = new Date(now);
  if (p === "1m") d.setMonth(d.getMonth() - 1);
  else if (p === "3m") d.setMonth(d.getMonth() - 3);
  else if (p === "1a") d.setFullYear(d.getFullYear() - 1);
  else if (p === "ytd") return `${now.getFullYear()}-01-01`;
  else return "2000-01-01";
  return localIso(d);
}

/**
 * Everything the company pages and reports say, computed from the certified
 * figures and the bulletin's quotes : with the plain-language reading of each
 * number, written once here so the site and the PDF tell the same story.
 */

export interface Ratio {
  key: string;
  label: string;
  value: string;
  raw?: number;
  /** How to read it, in one or two sentences a first-time investor understands. */
  reading: string;
}

export interface PricePeriod {
  from: string;
  to: string;
  first: number;
  last: number;
  changePct: number;
  high: number;
  low: number;
  sessions: number;
  volume: number; // titres échangés
  value: number; // FCFA échangés
  tradedSessions: number;
}

export interface Analysis {
  company: Company;
  latest: YearFigures;
  previous?: YearFigures;
  quote?: Quote;
  price?: number;
  marketCap?: number;
  eps?: number; // bénéfice net par action, dernier exercice
  bookValuePerShare?: number;
  per?: number;
  priceToBook?: number;
  dividendYieldPct?: number;
  payoutPct?: number;
  netMarginPct: number;
  roePct: number;
  revenueGrowthPct?: number;
  netIncomeGrowthPct?: number;
  revenueCagrPct?: number; // over the available years
  ratios: Ratio[];
  headline: string; // one sentence
  comments: string[]; // 3–5 short paragraphs
}

const pct = (a: number, b: number) => (b ? ((a - b) / Math.abs(b)) * 100 : 0);
const signed = (v: number, d = 1) => `${v > 0 ? "+" : ""}${fmtPct(v, d)}`;
const x1 = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const bn = (v: number) => `${(v / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Md`;

export function analyse(company: Company, quote?: Quote): Analysis {
  const figs = [...company.figures].sort((a, b) => a.year - b.year);
  const latest = figs[figs.length - 1];
  const previous = figs[figs.length - 2];
  const first = figs[0];
  const price = quote?.close;
  const shares = quote?.sharesTotal ?? company.sharesTotal;
  const marketCap = price != null ? price * shares : undefined;
  const eps = latest.netIncome / shares;
  const bookValuePerShare = latest.equity / shares;
  // A PER above 100 means the profit is negligible next to the price: printing it misleads more than it informs.
  const per = price != null && eps > 0 && price / eps < 100 ? price / eps : undefined;
  const priceToBook = price != null && bookValuePerShare > 0 ? price / bookValuePerShare : undefined;
  const lastDividend = quote?.lastDividend ?? latest.dividendPerShare ?? undefined;
  const dividendYieldPct = price != null && lastDividend ? (lastDividend / price) * 100 : undefined;
  const payoutPct = latest.dividendPerShare && eps > 0 ? (latest.dividendPerShare / eps) * 100 : undefined;
  const netMarginPct = (latest.netIncome / latest.revenue) * 100;
  const roePct = (latest.netIncome / latest.equity) * 100;
  const revenueGrowthPct = previous ? pct(latest.revenue, previous.revenue) : undefined;
  const netIncomeGrowthPct = previous ? pct(latest.netIncome, previous.netIncome) : undefined;
  const years = latest.year - first.year;
  const revenueCagrPct = years > 0 ? (Math.pow(latest.revenue / first.revenue, 1 / years) - 1) * 100 : undefined;
  const isBank = company.sector === "Banque" || company.sector === "Holding bancaire" || company.sector === "Réassurance";

  const ratios: Ratio[] = [
    {
      key: "per",
      label: "Cours / bénéfice (PER)",
      value: per != null ? `${x1(per)} ×` : "—",
      raw: per,
      reading: per != null ? `Au cours actuel, vous payez ${x1(per)} années du bénéfice ${latest.year}. Sur les marchés africains, entre 5 et 12 est courant ; au-delà, on paie la croissance attendue ou la rareté du titre.` : eps > 0 ? "Le bénéfice du dernier exercice est trop faible par rapport au cours pour que le ratio ait un sens (plus de 100 années de bénéfice)." : "Pas de bénéfice positif ou pas de cours : le ratio n'a pas de sens.",
    },
    {
      key: "yield",
      label: "Rendement du dividende",
      value: dividendYieldPct != null ? fmtPct(dividendYieldPct, 2) : "—",
      raw: dividendYieldPct,
      reading: dividendYieldPct != null ? `Le dernier dividende (${fmt(lastDividend ?? 0)} FCFA brut) représente ${fmtPct(dividendYieldPct, 2)} du cours : ce que rapporte l'action chaque année si le dividende est maintenu, avant impôt (retenue de 16,5 % au Cameroun).` : "Pas de dividende récent.",
    },
    {
      key: "payout",
      label: "Part du bénéfice distribuée",
      value: payoutPct != null ? fmtPct(payoutPct, 0) : latest.dividendPerShare === null ? "0 % (non distribué)" : "—",
      raw: payoutPct,
      reading: payoutPct != null ? (payoutPct > 80 ? "La société reverse presque tout son bénéfice : bon pour le revenu immédiat, mais elle garde peu pour investir ou absorber une mauvaise année." : payoutPct < 30 ? "La société garde l'essentiel de son bénéfice pour se renforcer ; le dividende est modeste par rapport à ce qu'elle gagne." : "Un équilibre classique : environ la moitié du bénéfice revient aux actionnaires, le reste renforce les fonds propres.") : "Aucun dividende sur le dernier exercice : le bénéfice est conservé (ou absent).",
    },
    {
      key: "margin",
      label: isBank ? "Résultat net / produit net bancaire" : "Marge nette",
      value: fmtPct(netMarginPct, 1),
      raw: netMarginPct,
      reading: isBank ? `Sur 100 FCFA de revenus d'exploitation, ${netMarginPct.toFixed(0)} restent en bénéfice après charges, provisions et impôt.` : `Sur 100 FCFA de ventes, ${netMarginPct.toFixed(0)} restent en bénéfice net. Plus c'est haut, plus l'activité est rentable ; à comparer d'une année sur l'autre plutôt qu'entre secteurs.`,
    },
    {
      key: "roe",
      label: "Rentabilité des fonds propres (ROE)",
      value: fmtPct(roePct, 1),
      raw: roePct,
      reading: `Le bénéfice représente ${roePct.toFixed(0)} % de l'argent que les actionnaires ont dans la société. Au-dessus de 10 %, l'entreprise rémunère bien son capital.`,
    },
    {
      key: "pb",
      label: "Cours / fonds propres par action",
      value: priceToBook != null ? `${x1(priceToBook)} ×` : "—",
      raw: priceToBook,
      reading: priceToBook != null ? (priceToBook < 1 ? `L'action se paie moins que sa valeur comptable (${fmt(bookValuePerShare)} FCFA par action) : le marché doute de la rentabilité future, ou le titre est simplement peu recherché.` : `L'action se paie ${x1(priceToBook)} fois sa valeur comptable (${fmt(bookValuePerShare)} FCFA par action) : le marché valorise la marque, la position ou la rentabilité au-delà des seuls fonds propres.`) : "Pas de cours.",
    },
    {
      key: "float",
      label: "Flottant",
      value: `${fmtPct(company.freeFloatPct, 1)} · ${fmt(company.sharesFloat)} actions`,
      raw: company.freeFloatPct,
      reading: company.freeFloatPct < 10 ? "Moins de 10 % du capital est en bourse : très peu de titres à acheter ou vendre, le cours peut ne pas bouger pendant des semaines puis sauter sur une seule transaction." : "Environ un cinquième du capital est en bourse : c'est la norme à la BVMAC, la liquidité reste limitée : prévoyez des ordres patients.",
    },
  ];

  const trend = revenueGrowthPct != null ? (revenueGrowthPct > 3 ? "en hausse" : revenueGrowthPct < -3 ? "en baisse" : "stable") : "";
  const headline = `${company.shortName} : ${latest.revenueLabel.toLowerCase()} de ${bn(latest.revenue)} FCFA en ${latest.year} (${trend}${revenueGrowthPct != null ? ` ${signed(revenueGrowthPct)}` : ""}), bénéfice net de ${bn(latest.netIncome)}${netIncomeGrowthPct != null ? ` (${signed(netIncomeGrowthPct)})` : ""}${dividendYieldPct != null ? `, dividende rapportant ${fmtPct(dividendYieldPct, 1)} au cours actuel` : ""}.`;

  const comments: string[] = [];
  comments.push(`Activité : ${company.activity}`);
  if (previous) {
    comments.push(
      `Dernier exercice : ${latest.revenueLabel} ${signed(revenueGrowthPct ?? 0)} à ${bn(latest.revenue)} FCFA ; bénéfice net ${signed(netIncomeGrowthPct ?? 0)} à ${bn(latest.netIncome)}. ${netIncomeGrowthPct != null && Math.abs(netIncomeGrowthPct) > 25 ? "Une variation de cette ampleur vient rarement des ventes seules : regardez les charges, les provisions ou les éléments exceptionnels dans le rapport." : "Une évolution mesurée, cohérente avec l'activité."}${revenueCagrPct != null ? ` Sur ${years} ans, la croissance moyenne des revenus est de ${signed(revenueCagrPct)} par an.` : ""}`,
    );
  }
  comments.push(`Solidité : fonds propres de ${bn(latest.equity)} FCFA pour un bilan de ${bn(latest.totalAssets)} (${fmtPct((latest.equity / latest.totalAssets) * 100, 0)}${isBank ? ", un ratio faible est normal pour une banque, dont le bilan est fait des dépôts des clients" : " du bilan financé par les actionnaires, le reste par les dettes et fournisseurs"}).`);
  if (price != null) {
    comments.push(`Valorisation : au cours de ${fmt(price)} FCFA, la société vaut ${bn(marketCap ?? 0)} FCFA en bourse${per != null ? `, soit ${x1(per)} fois son bénéfice ${latest.year}` : ""}${priceToBook != null ? ` et ${x1(priceToBook)} fois ses fonds propres` : ""}. ${dividendYieldPct != null ? `Le dividende rapporte ${fmtPct(dividendYieldPct, 1)} brut.` : "Pas de dividende récent."}`);
  }
  for (const r of company.reading) comments.push(r);

  return { company, latest, previous, quote, price, marketCap, eps, bookValuePerShare, per, priceToBook, dividendYieldPct, payoutPct, netMarginPct, roePct, revenueGrowthPct, netIncomeGrowthPct, revenueCagrPct, ratios, headline, comments };
}

/** Price behaviour over a slice of the quote history (oldest → newest). */
export function pricePeriod(quotes: Quote[]): PricePeriod | undefined {
  if (!quotes.length) return undefined;
  const q = [...quotes].sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
  const first = q[0].close;
  const last = q[q.length - 1].close;
  return {
    from: q[0].sessionDate,
    to: q[q.length - 1].sessionDate,
    first,
    last,
    changePct: first ? ((last - first) / first) * 100 : 0,
    high: Math.max(...q.map((x) => x.close)),
    low: Math.min(...q.map((x) => x.close)),
    sessions: q.length,
    volume: q.reduce((s, x) => s + x.volumeTraded, 0),
    value: q.reduce((s, x) => s + x.valueTraded, 0),
    tradedSessions: q.filter((x) => x.volumeTraded > 0).length,
  };
}

export function periodComment(p: PricePeriod, company: Company): string {
  const move = Math.abs(p.changePct) < 0.5 ? "n'a pratiquement pas bougé" : p.changePct > 0 ? `a gagné ${fmtPct(p.changePct, 1)}` : `a perdu ${fmtPct(-p.changePct, 1)}`;
  const liq = p.tradedSessions === 0 ? "Aucune transaction sur la période : le cours affiché est le dernier prix d'échange, pas un prix auquel on peut être sûr de traiter." : `${p.tradedSessions} séance${p.tradedSessions > 1 ? "s" : ""} avec des échanges sur ${p.sessions}, ${fmt(p.volume)} titres (${bn(p.value)} FCFA) : ${p.tradedSessions / p.sessions > 0.5 ? "un titre relativement actif pour la BVMAC" : "peu d'échanges, comptez plusieurs séances pour un ordre de taille"}.`;
  return `Du ${fmtDate(p.from)} au ${fmtDate(p.to)}, l'action ${company.shortName} ${move}, entre ${fmt(p.low)} et ${fmt(p.high)} FCFA. ${liq}`;
}
