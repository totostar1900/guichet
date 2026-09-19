/**
 * The financial profile: seven questions a client answers in two minutes,
 * a profile (prudent · équilibré · dynamique) and four measures. It describes
 * what the client told us of themselves; it never advises and never hides a
 * line. It marks the fiches (« dans votre horizon ») and asks a confirmation
 * before an intention outside it; the desk sees the flag.
 */
export type ProfileKind = "prudent" | "equilibre" | "dynamique";

export interface ProfileQuestion {
  key: "horizon" | "objectif" | "tolerance" | "connaissance" | "part" | "liquidite" | "revenus";
  eyebrow: { fr: string; en: string };
  q: { fr: string; en: string };
  options: { fr: string; en: string; score: number }[];
}

export const PROFILE_QUESTIONS: ProfileQuestion[] = [
  {
    key: "horizon",
    eyebrow: { fr: "Horizon", en: "Horizon" },
    q: { fr: "Dans combien de temps aurez-vous besoin de cet argent ?", en: "When will you need this money?" },
    options: [
      { fr: "Avant un an", en: "Within a year", score: 1 },
      { fr: "Dans un à trois ans", en: "In one to three years", score: 2 },
      { fr: "Dans trois à cinq ans", en: "In three to five years", score: 3 },
      { fr: "Dans plus de cinq ans", en: "In more than five years", score: 4 },
    ],
  },
  {
    key: "objectif",
    eyebrow: { fr: "Objectif", en: "Goal" },
    q: { fr: "Que cherchez-vous d'abord ?", en: "What do you look for first?" },
    options: [
      { fr: "Garder mon capital, avec un revenu régulier", en: "Keep my capital, with a regular income", score: 1 },
      { fr: "Faire un peu mieux que l'inflation", en: "Do a little better than inflation", score: 2 },
      { fr: "Faire croître mon capital, quitte à le voir bouger", en: "Grow my capital, even if it moves", score: 3 },
      { fr: "Viser haut, en acceptant de perdre une part", en: "Aim high, accepting to lose a part", score: 4 },
    ],
  },
  {
    key: "tolerance",
    eyebrow: { fr: "Tolérance aux pertes", en: "Loss tolerance" },
    q: { fr: "Votre placement de 10 M perd 1 M en un mois. Que faites-vous ?", en: "Your 10 M investment loses 1 M in a month. What do you do?" },
    options: [
      { fr: "Je vends tout : je ne dors plus.", en: "I sell everything: I cannot sleep.", score: 1 },
      { fr: "J'attends l'échéance : le coupon tombera.", en: "I wait for maturity: the coupon will come.", score: 2 },
      { fr: "J'en rachète : c'est moins cher.", en: "I buy more: it is cheaper.", score: 4 },
      { fr: "Je ne sais pas encore.", en: "I do not know yet.", score: 1 },
    ],
  },
  {
    key: "connaissance",
    eyebrow: { fr: "Connaissance des marchés", en: "Market knowledge" },
    q: { fr: "Lequel décrit le mieux votre expérience ?", en: "Which describes your experience best?" },
    options: [
      { fr: "C'est mon premier placement hors banque", en: "This is my first investment outside a bank", score: 1 },
      { fr: "J'ai déjà souscrit à un bon du Trésor ou à un fonds", en: "I have already bought a Treasury bill or a fund", score: 2 },
      { fr: "Je suis les adjudications et la cote régulièrement", en: "I follow auctions and the market regularly", score: 3 },
      { fr: "J'ai déjà géré un portefeuille varié, avec des actions", en: "I have managed a varied portfolio, with shares", score: 4 },
    ],
  },
  {
    key: "part",
    eyebrow: { fr: "Part de votre épargne", en: "Share of your savings" },
    q: { fr: "Ce que vous placez ici représente quelle part de votre épargne ?", en: "What you invest here is what share of your savings?" },
    options: [
      { fr: "Plus de la moitié", en: "More than half", score: 1 },
      { fr: "Entre un tiers et la moitié", en: "Between a third and a half", score: 2 },
      { fr: "Moins d'un tiers", en: "Less than a third", score: 3 },
      { fr: "Une petite part, que je peux immobiliser sans y toucher", en: "A small part, which I can lock up untouched", score: 4 },
    ],
  },
  {
    key: "liquidite",
    eyebrow: { fr: "Besoin de liquidité", en: "Liquidity need" },
    q: { fr: "Si un imprévu arrive, avez-vous une réserve ailleurs ?", en: "If the unexpected happens, do you have a reserve elsewhere?" },
    options: [
      { fr: "Non : ce placement est ma réserve", en: "No: this investment is my reserve", score: 1 },
      { fr: "Un peu, quelques semaines de dépenses", en: "A little, a few weeks of spending", score: 2 },
      { fr: "Oui, plusieurs mois de dépenses", en: "Yes, several months of spending", score: 3 },
    ],
  },
  {
    key: "revenus",
    eyebrow: { fr: "Revenus", en: "Income" },
    q: { fr: "Vos revenus sont…", en: "Your income is…" },
    options: [
      { fr: "Irréguliers ou incertains", en: "Irregular or uncertain", score: 1 },
      { fr: "Réguliers, sans marge", en: "Regular, with no margin", score: 2 },
      { fr: "Réguliers, avec une capacité d'épargne", en: "Regular, with a capacity to save", score: 3 },
    ],
  },
];

export interface FinancialProfile {
  kind: ProfileKind;
  /** The horizon in years: [min, max]; max 99 for « plus de cinq ans ». */
  horizonYears: [number, number];
  /** Four measures, each 0..1: the bars of the result. */
  measures: { horizon: number; tolerance: number; knowledge: number; capacity: number };
  answers: Record<string, number>; // question key → chosen option index
  updatedAt: string;
}

const HORIZONS: [number, number][] = [
  [0, 1],
  [1, 3],
  [3, 5],
  [5, 99],
];

/** From the answers to the profile: the same arithmetic on both backends, so the desk and the client read the same word. */
export function computeProfile(answers: Record<string, number>): FinancialProfile {
  const score = (key: ProfileQuestion["key"]) => {
    const qd = PROFILE_QUESTIONS.find((x) => x.key === key)!;
    const i = answers[key];
    return qd.options[i]?.score ?? 1;
  };
  const horizon = score("horizon");
  const tolerance = score("tolerance");
  const knowledge = score("connaissance");
  const capacity = Math.min(score("part"), score("liquidite") + 1, score("revenus") + 1); // the weakest of the three caps the capacity
  const objective = score("objectif");
  // Weighted: what one can bear (capacity, tolerance) counts twice what one wants (objective).
  const total = tolerance * 2 + capacity * 2 + horizon + knowledge + objective;
  const kind: ProfileKind = total <= 12 ? "prudent" : total <= 20 ? "equilibre" : "dynamique";
  return {
    kind,
    horizonYears: HORIZONS[horizon - 1] ?? [0, 1],
    measures: { horizon: horizon / 4, tolerance: tolerance / 4, knowledge: knowledge / 4, capacity: capacity / 4 },
    answers,
    updatedAt: new Date().toISOString(),
  };
}

export const PROFILE_LABEL: Record<ProfileKind, { fr: string; en: string }> = {
  prudent: { fr: "Prudent", en: "Cautious" },
  equilibre: { fr: "Équilibré", en: "Balanced" },
  dynamique: { fr: "Dynamique", en: "Dynamic" },
};

/**
 * What a line says next to this profile: nothing, « dans votre horizon », or a
 * flag the intention will carry. Tenor in years from settlement to maturity;
 * shares and equity funds are read against tolerance.
 */
export function profileFlag(p: FinancialProfile | undefined, line: { tenorYears?: number; equity?: boolean }): { level: "ok" | "warn"; fr: string; en: string } | null {
  if (!p) return null;
  const [, max] = p.horizonYears;
  if (line.equity && p.measures.tolerance <= 0.25) return { level: "warn", fr: "au-delà de votre tolérance aux pertes", en: "beyond your loss tolerance" };
  if (line.tenorYears != null) {
    if (line.tenorYears > max + 0.5) return { level: "warn", fr: `au-delà de votre horizon : ${Math.round(line.tenorYears)} ans, vous ${max === 99 ? "plus de 5" : `jusqu'à ${max}`}`, en: `beyond your horizon: ${Math.round(line.tenorYears)} years, you ${max === 99 ? "over 5" : `up to ${max}`}` };
    return { level: "ok", fr: "dans votre horizon", en: "within your horizon" };
  }
  return null;
}
