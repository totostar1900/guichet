/**
 * The financial profile: three blocks a client answers in five minutes, kept
 * apart because they answer different questions.
 *  - Appétit (what you can bear and want) : horizon, goal, loss tolerance,
 *    liquidity need. It marks the fiches (« dans votre horizon ») and asks a
 *    confirmation before an intention outside it.
 *  - Connaissance (what you understand) : experience declared, instruments
 *    held, then four short verifications, each tied to a lesson of the Guide;
 *    a wrong answer is a lesson to read, never a fault. Lessons read count.
 *  - Capacité (what you can afford) : income, savings available this year,
 *    reserve, share of savings, regular commitments, dependants ; bands only,
 *    never figures. It sizes the ticket and pre-fills the file.
 * The profile describes what the client told us of themselves ; it never
 * advises and never hides a line. The desk reads the same word, plus what
 * the client knows and what a call should cover.
 */
export type ProfileKind = "prudent" | "equilibre" | "dynamique";
export type ProfileBlock = "appetit" | "connaissance" | "capacite";
export type KnowledgeLevel = "debutant" | "informe" | "averti";
export type CapacityBand = "limitee" | "moyenne" | "bonne";
export type Confidence = "declare" | "verifie" | "confirme";

export interface ProfileQuestion {
  key: string;
  block: ProfileBlock;
  eyebrow: { fr: string; en: string };
  q: { fr: string; en: string };
  options: { fr: string; en: string; score: number; correct?: boolean }[];
  /** A verification : one option is right, the lesson explains it. */
  lesson?: string;
  /** Several options may be chosen ; the answer is a bitmask. */
  multi?: boolean;
  optional?: boolean;
}

export const PROFILE_QUESTIONS: ProfileQuestion[] = [
  /* ---------- appétit ---------- */
  {
    key: "horizon",
    block: "appetit",
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
    block: "appetit",
    eyebrow: { fr: "Objectif", en: "Goal" },
    q: { fr: "Que cherchez-vous d'abord ?", en: "What do you look for first?" },
    options: [
      { fr: "Garder mon capital, avec un revenu régulier", en: "Keep my capital, with a regular income", score: 1 },
      { fr: "Financer un projet daté : études, logement, équipement", en: "Fund a dated project: studies, housing, equipment", score: 2 },
      { fr: "Faire croître mon capital, quitte à le voir bouger", en: "Grow my capital, even if it moves", score: 3 },
      { fr: "Viser haut, en acceptant de perdre une part", en: "Aim high, accepting to lose a part", score: 4 },
    ],
  },
  {
    key: "tolerance",
    block: "appetit",
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
    key: "liquidite",
    block: "appetit",
    eyebrow: { fr: "Besoin de liquidité", en: "Liquidity need" },
    q: { fr: "Si un imprévu arrive, avez-vous une réserve ailleurs ?", en: "If the unexpected happens, do you have a reserve elsewhere?" },
    options: [
      { fr: "Non : ce placement est ma réserve", en: "No: this investment is my reserve", score: 1 },
      { fr: "Un peu, quelques semaines de dépenses", en: "A little, a few weeks of spending", score: 2 },
      { fr: "Oui, plusieurs mois de dépenses", en: "Yes, several months of spending", score: 3 },
    ],
  },

  /* ---------- connaissance ---------- */
  {
    key: "connaissance",
    block: "connaissance",
    eyebrow: { fr: "Expérience", en: "Experience" },
    q: { fr: "Lequel décrit le mieux votre expérience ?", en: "Which describes your experience best?" },
    options: [
      { fr: "C'est mon premier placement hors banque", en: "This is my first investment outside a bank", score: 1 },
      { fr: "J'ai déjà souscrit à un bon du Trésor ou à un fonds", en: "I have already bought a Treasury bill or a fund", score: 2 },
      { fr: "Je suis les adjudications et la cote régulièrement", en: "I follow auctions and the market regularly", score: 3 },
      { fr: "J'ai déjà géré un portefeuille varié, avec des actions", en: "I have managed a varied portfolio, with shares", score: 4 },
    ],
  },
  {
    key: "detenus",
    block: "connaissance",
    multi: true,
    eyebrow: { fr: "Déjà détenu", en: "Already held" },
    q: { fr: "Qu'avez-vous déjà détenu ? Plusieurs réponses possibles.", en: "What have you already held? Several answers possible." },
    options: [
      { fr: "Titres publics (BTA, OTA)", en: "Public securities (BTA, OTA)", score: 1 },
      { fr: "Obligations d'entreprise (APE)", en: "Corporate bonds (public offering)", score: 1 },
      { fr: "Actions cotées", en: "Listed shares", score: 1 },
      { fr: "Parts de fonds (OPCVM)", en: "Fund units", score: 1 },
      { fr: "Aucun de ceux-là", en: "None of these", score: 0 },
    ],
  },
  {
    key: "frequence",
    block: "connaissance",
    eyebrow: { fr: "Fréquence", en: "Frequency" },
    q: { fr: "À quelle fréquence passez-vous des ordres ?", en: "How often do you place orders?" },
    options: [
      { fr: "Jamais encore", en: "Never yet", score: 1 },
      { fr: "Une ou deux fois par an", en: "Once or twice a year", score: 2 },
      { fr: "Chaque mois ou presque", en: "Every month or so", score: 3 },
      { fr: "Chaque semaine", en: "Every week", score: 4 },
    ],
  },
  {
    key: "v_prix",
    block: "connaissance",
    lesson: "coupon-et-rendement",
    eyebrow: { fr: "Vérifions · le prix", en: "Let us check · the price" },
    q: { fr: "Une OTA à 6 % achetée à 95 % du nominal rapporte…", en: "A 6% OTA bought at 95% of par yields…" },
    options: [
      { fr: "Moins que 6 % par an", en: "Less than 6% a year", score: 0 },
      { fr: "Exactement 6 % par an", en: "Exactly 6% a year", score: 0 },
      { fr: "Plus que 6 % par an", en: "More than 6% a year", score: 1, correct: true },
      { fr: "Je ne sais pas", en: "I do not know", score: 0 },
    ],
  },
  {
    key: "v_adjudication",
    block: "connaissance",
    lesson: "adjudication",
    eyebrow: { fr: "Vérifions · l'adjudication", en: "Let us check · the auction" },
    q: { fr: "À une adjudication du Trésor, votre ordre est…", en: "At a Treasury auction, your order is…" },
    options: [
      { fr: "Toujours servi en entier", en: "Always served in full", score: 0 },
      { fr: "Servi, en partie ou pas du tout, selon les offres retenues", en: "Served, in part or not at all, depending on the bids retained", score: 1, correct: true },
      { fr: "Servi si je paie une commission", en: "Served if I pay a fee", score: 0 },
      { fr: "Je ne sais pas", en: "I do not know", score: 0 },
    ],
  },
  {
    key: "v_depositaire",
    block: "connaissance",
    lesson: "qui-fait-quoi",
    eyebrow: { fr: "Vérifions · vos titres", en: "Let us check · your securities" },
    q: { fr: "Une fois achetés, vos titres sont inscrits…", en: "Once bought, your securities are recorded…" },
    options: [
      { fr: "Chez Purpose Capital, en son nom", en: "At Purpose Capital, in its name", score: 0 },
      { fr: "Au dépositaire, à votre nom", en: "At the custodian, in your name", score: 1, correct: true },
      { fr: "À la BEAC, sans nom", en: "At the BEAC, without a name", score: 0 },
      { fr: "Je ne sais pas", en: "I do not know", score: 0 },
    ],
  },
  {
    key: "v_vl",
    block: "connaissance",
    lesson: "fonds-vl",
    eyebrow: { fr: "Vérifions · les fonds", en: "Let us check · funds" },
    q: { fr: "Quand vous souscrivez à un fonds, le prix de la part est…", en: "When you subscribe to a fund, the unit price is…" },
    options: [
      { fr: "Fixé au moment où je passe l'ordre", en: "Set when I place the order", score: 0 },
      { fr: "La prochaine valeur liquidative, calculée après mon ordre", en: "The next net asset value, computed after my order", score: 1, correct: true },
      { fr: "Négocié avec le conseiller", en: "Negotiated with the adviser", score: 0 },
      { fr: "Je ne sais pas", en: "I do not know", score: 0 },
    ],
  },

  /* ---------- capacité ---------- */
  {
    key: "revenus",
    block: "capacite",
    eyebrow: { fr: "Revenus", en: "Income" },
    q: { fr: "Vos revenus réguliers, par mois, sont plutôt…", en: "Your regular income, per month, is rather…" },
    options: [
      { fr: "Irréguliers ou incertains", en: "Irregular or uncertain", score: 1 },
      { fr: "Moins de 250 000 FCFA", en: "Under 250,000 FCFA", score: 2 },
      { fr: "De 250 000 à 1 million", en: "250,000 to 1 million", score: 2 },
      { fr: "De 1 à 3 millions", en: "1 to 3 million", score: 3 },
      { fr: "Plus de 3 millions", en: "Over 3 million", score: 3 },
    ],
  },
  {
    key: "epargne",
    block: "capacite",
    eyebrow: { fr: "Épargne à placer", en: "Savings to invest" },
    q: { fr: "Cette année, l'épargne que vous pouvez placer sans y toucher est plutôt…", en: "This year, the savings you can invest untouched are rather…" },
    options: [
      { fr: "Moins de 500 000 FCFA", en: "Under 500,000 FCFA", score: 1 },
      { fr: "De 500 000 à 2 millions", en: "500,000 to 2 million", score: 2 },
      { fr: "De 2 à 10 millions", en: "2 to 10 million", score: 3 },
      { fr: "Plus de 10 millions", en: "Over 10 million", score: 4 },
    ],
  },
  {
    key: "part",
    block: "capacite",
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
    key: "reserve",
    block: "capacite",
    eyebrow: { fr: "Réserve", en: "Reserve" },
    q: { fr: "Votre réserve de précaution couvre…", en: "Your safety reserve covers…" },
    options: [
      { fr: "Moins d'un mois de dépenses", en: "Under a month of spending", score: 1 },
      { fr: "Un à trois mois", en: "One to three months", score: 2 },
      { fr: "Trois à six mois", en: "Three to six months", score: 3 },
      { fr: "Plus de six mois", en: "Over six months", score: 4 },
    ],
  },
  {
    key: "charges",
    block: "capacite",
    eyebrow: { fr: "Engagements", en: "Commitments" },
    q: { fr: "Vos remboursements réguliers (crédits, loyers, tontines) pèsent…", en: "Your regular repayments (loans, rent, tontines) weigh…" },
    options: [
      { fr: "Peu ou pas", en: "Little or nothing", score: 3 },
      { fr: "Une part raisonnable de mes revenus", en: "A reasonable share of my income", score: 2 },
      { fr: "Lourd : plus d'un tiers de mes revenus", en: "Heavy: over a third of my income", score: 1 },
    ],
  },
  {
    key: "foyer",
    block: "capacite",
    eyebrow: { fr: "Situation", en: "Situation" },
    q: { fr: "Votre âge et les personnes à votre charge…", en: "Your age and dependants…" },
    options: [
      { fr: "Moins de 35 ans, sans personne à charge", en: "Under 35, no dependants", score: 4 },
      { fr: "Moins de 35 ans, avec des personnes à charge", en: "Under 35, with dependants", score: 3 },
      { fr: "35 à 55 ans", en: "35 to 55", score: 3 },
      { fr: "Plus de 55 ans", en: "Over 55", score: 2 },
    ],
  },
];

export const BLOCK_LABEL: Record<ProfileBlock, { fr: string; en: string; short: { fr: string; en: string }; lead: { fr: string; en: string } }> = {
  appetit: { fr: "Ce que vous pouvez supporter", en: "What you can bear", short: { fr: "Supporter", en: "Bear" }, lead: { fr: "Votre horizon, votre objectif, votre réaction à une baisse.", en: "Your horizon, your goal, your reaction to a fall." } },
  connaissance: { fr: "Ce que vous connaissez", en: "What you know", short: { fr: "Connaître", en: "Know" }, lead: { fr: "Votre expérience, puis quatre vérifications : une réponse fausse, c'est une leçon à lire.", en: "Your experience, then four checks: a wrong answer is a lesson to read." } },
  capacite: { fr: "Ce que vous pouvez engager", en: "What you can commit", short: { fr: "Engager", en: "Commit" }, lead: { fr: "Des fourchettes, jamais des chiffres exacts : elles dimensionnent, elles ne jugent pas.", en: "Bands, never exact figures: they size, they do not judge." } },
};

export const VERIFICATIONS = PROFILE_QUESTIONS.filter((q) => q.lesson);

export interface FinancialProfile {
  kind: ProfileKind;
  /** The horizon in years: [min, max]; max 99 for « plus de cinq ans ». */
  horizonYears: [number, number];
  /** Four measures, each 0..1: the bars of the result. */
  measures: { horizon: number; tolerance: number; knowledge: number; capacity: number };
  answers: Record<string, number>; // question key → chosen option index (a bitmask for a multi)
  updatedAt: string;
  /* ----- since version 2 ----- */
  version?: number;
  knowledge?: KnowledgeLevel;
  /** Verifications answered right, over the four. */
  verified?: number;
  /** Lessons of the Guide read when the profile was computed. */
  lessonsRead?: number;
  capacity?: CapacityBand;
  /** Savings the client said they can invest this year: the option index of « epargne ». */
  investable?: number;
  confidence?: Confidence;
  /** The appetite alone said a higher word ; the capacity brought it down. */
  capped?: boolean;
}

const HORIZONS: [number, number][] = [
  [0, 1],
  [1, 3],
  [3, 5],
  [5, 99],
];

/** Upper bound of the « epargne » bands, in FCFA ; the last one has none. */
export const INVESTABLE_MAX: (number | undefined)[] = [500_000, 2_000_000, 10_000_000, undefined];
export const INVESTABLE_LABEL: { fr: string; en: string }[] = PROFILE_QUESTIONS.find((q) => q.key === "epargne")!.options.map((o) => ({ fr: o.fr, en: o.en }));

const byKey = (key: string) => PROFILE_QUESTIONS.find((x) => x.key === key)!;

/** The answer to a question, scored ; a multi counts its ticked options. */
function score(answers: Record<string, number>, key: string): number {
  const qd = byKey(key);
  const i = answers[key];
  if (i == null) return qd.multi ? 0 : 1;
  if (qd.multi) return qd.options.reduce((s, o, k) => s + ((i >> k) & 1 ? o.score : 0), 0);
  return qd.options[i]?.score ?? 1;
}

/**
 * From the answers to the profile: the same arithmetic on both backends, so
 * the desk and the client read the same word. `lessonsRead` (the Guide's
 * done lessons on this device) raises the knowledge and the confidence.
 * Profiles saved before version 2 have seven answers : the rest reads as
 * unknown and the word is computed as before.
 */
export function computeProfile(answers: Record<string, number>, lessonsRead = 0): FinancialProfile {
  const horizon = score(answers, "horizon");
  const tolerance = score(answers, "tolerance");
  const objective = score(answers, "objectif");
  const experience = score(answers, "connaissance");
  const v2 = answers.epargne != null || answers.reserve != null;

  // Capacity : the weakest of what the client said they can commit caps it.
  const liquidity = answers.liquidite != null ? score(answers, "liquidite") + 1 : 4;
  const parts = [score(answers, "part"), liquidity, v2 ? score(answers, "revenus") + 1 : score(answers, "revenus") + 1, v2 ? score(answers, "reserve") : 4, v2 ? score(answers, "charges") + 1 : 4, v2 ? score(answers, "epargne") : 4];
  const capacity = Math.max(1, Math.min(4, ...parts));
  const capacityBand: CapacityBand = capacity <= 1 ? "limitee" : capacity <= 2 ? "moyenne" : "bonne";

  // Knowledge : experience declared, instruments held, the verifications, the lessons read.
  const verified = VERIFICATIONS.filter((q) => answers[q.key] != null && q.options[answers[q.key]]?.correct).length;
  const held = Math.min(3, score(answers, "detenus"));
  const frequency = answers.frequence != null ? score(answers, "frequence") : 1;
  const knowledgeRaw = v2 ? (experience + held + frequency) / 11 + verified / 4 + Math.min(lessonsRead, 12) / 12 : experience / 4;
  const knowledgeScore = Math.min(1, v2 ? knowledgeRaw / 2.2 : knowledgeRaw);
  const knowledge: KnowledgeLevel = knowledgeScore < 0.35 ? "debutant" : knowledgeScore < 0.7 ? "informe" : "averti";
  const knowledgeForWord = Math.max(1, Math.min(4, Math.round(knowledgeScore * 4)));

  // Weighted : what one can bear (capacity, tolerance) counts twice what one wants (objective).
  const total = tolerance * 2 + capacity * 2 + horizon + knowledgeForWord + objective;
  let kind: ProfileKind = total <= 12 ? "prudent" : total <= 20 ? "equilibre" : "dynamique";
  // The honest sentence : a dynamic appetite with a limited capacity reads « équilibré » ; the note says why.
  let capped = false;
  if (kind === "dynamique" && capacityBand === "limitee") {
    kind = "equilibre";
    capped = true;
  }
  const confidence: Confidence = verified >= 3 || lessonsRead >= 8 ? "verifie" : "declare";

  return {
    version: 2,
    kind,
    horizonYears: HORIZONS[horizon - 1] ?? [0, 1],
    measures: { horizon: horizon / 4, tolerance: tolerance / 4, knowledge: knowledgeScore, capacity: capacity / 4 },
    answers,
    updatedAt: new Date().toISOString(),
    knowledge,
    verified,
    lessonsRead,
    capacity: capacityBand,
    investable: answers.epargne,
    confidence,
    capped,
  };
}

export const PROFILE_LABEL: Record<ProfileKind, { fr: string; en: string }> = {
  prudent: { fr: "Prudent", en: "Cautious" },
  equilibre: { fr: "Équilibré", en: "Balanced" },
  dynamique: { fr: "Dynamique", en: "Dynamic" },
};
export const KNOWLEDGE_LABEL: Record<KnowledgeLevel, { fr: string; en: string }> = {
  debutant: { fr: "Débutant", en: "Beginner" },
  informe: { fr: "Informé", en: "Informed" },
  averti: { fr: "Averti", en: "Experienced" },
};
export const CAPACITY_LABEL: Record<CapacityBand, { fr: string; en: string }> = {
  limitee: { fr: "Limitée", en: "Limited" },
  moyenne: { fr: "Moyenne", en: "Medium" },
  bonne: { fr: "Bonne", en: "Good" },
};
export const CONFIDENCE_LABEL: Record<Confidence, { fr: string; en: string }> = {
  declare: { fr: "Déclaré", en: "Declared" },
  verifie: { fr: "Vérifié", en: "Verified" },
  confirme: { fr: "Confirmé par le desk", en: "Confirmed by the desk" },
};

/** The verifications the client missed : what a call, or a lesson, should cover first. */
export function toCover(p: FinancialProfile): { key: string; lesson: string; fr: string; en: string }[] {
  return VERIFICATIONS.filter((q) => !(p.answers[q.key] != null && q.options[p.answers[q.key]]?.correct)).map((q) => ({ key: q.key, lesson: q.lesson!, fr: q.eyebrow.fr.replace(/^Vérifions · /, ""), en: q.eyebrow.en.replace(/^Let us check · /, "") }));
}

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

/** An amount against the savings the client said they can invest this year : a share, and a word when it is most of it. */
export function amountFlag(p: FinancialProfile | undefined, amount: number): { share: number; level: "ok" | "warn"; fr: string; en: string } | null {
  if (!p || p.investable == null || !amount) return null;
  const max = INVESTABLE_MAX[p.investable];
  if (max == null) return null;
  const share = amount / max;
  if (share > 1) return { share, level: "warn", fr: "au-delà de l'épargne que vous avez dite disponible cette année", en: "beyond the savings you said you can invest this year" };
  if (share > 0.5) return { share, level: "warn", fr: "plus de la moitié de l'épargne que vous avez dite disponible cette année", en: "over half of the savings you said you can invest this year" };
  return { share, level: "ok", fr: "dans l'épargne que vous avez dite disponible", en: "within the savings you said available" };
}
