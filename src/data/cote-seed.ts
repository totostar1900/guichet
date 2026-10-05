import type { MarketBulletin, Quote } from "@/lib/domain/market";

/**
 * LA COTE DU JEU DE DÉMONSTRATION.
 *
 * Le dépôt mémoire n'avait ni bulletin ni cotation, et trois pages du siège
 * Marché s'effaçaient donc en local : l'indice, les sociétés, et la vue
 * d'ensemble, dont la moitié du contenu ne paraissait pas. C'est ce qui m'a
 * empêché de voir la page des échanges avant de la pousser, le 5 octobre 2026.
 *
 * CE QUI EST VRAI ICI, ET CE QUI NE L'EST PAS. Les sept lignes portent leurs
 * identités réelles, qui sont publiques et vivent déjà dans « data/companies » :
 * le mnémonique, l'ISIN, le nombre de titres et le flottant. Les COURS sont
 * inventés, ronds, et ne sont ceux d'aucune séance : une démonstration ne doit
 * pas pouvoir se lire comme un relevé. L'écran le dit par ailleurs, avec son
 * étiquette « demo · memory ».
 *
 * CE QUE LA SÉRIE IMITE, ET POURQUOI. Mesuré sur la production le 5 octobre
 * 2026 : l'indice bouge sur 70 des 271 séances lues, et sur 1 733 couples
 * action-séance le cours ne change que dans 79, soit 4,6 %, tandis qu'un
 * échange a lieu dans 24 %. Un jeu d'essai où tout bouge tous les jours
 * donnerait une fausse idée de ce marché, et surtout il cacherait les défauts
 * qui ne se voient que sur une séance plate : c'est précisément la séance
 * plate qu'on vient éprouver ici.
 *
 * LA SÉRIE EST CALCULÉE, PAS ÉCRITE. Deux mille lignes de littéraux ne se
 * relisent pas ; et surtout l'indice doit rester cohérent avec les cours,
 * sinon le contrôle de santé le signale à chaque séance. Il est donc dérivé
 * des capitalisations flottantes, base 1 000 à la première séance, et il ne
 * bouge que si un cours a bougé.
 */

interface Ligne {
  mnemo: string;
  isin: string;
  issuer: string;
  designation: string;
  total: number;
  flottant: number;
  /** Un cours de départ rond, qui n'est celui de personne. */
  depart: number;
}

const LIGNES: Ligne[] = [
  { mnemo: "BHC", isin: "GA0000010074", issuer: "BGFI Holding Corporation", designation: "BGFI HOLDING CORPORATION", total: 14_728_385, flottant: 566_561, depart: 85_000 },
  { mnemo: "SOCAP", isin: "CM0000010025", issuer: "SOCAPALM", designation: "SOCIETE CAMEROUNAISE DE PALMERAIES", total: 4_575_789, flottant: 787_080, depart: 47_500 },
  { mnemo: "BANGE", isin: "GQ0000010050", issuer: "BANGE", designation: "BANCO NACIONAL DE GUINEA ECUATORIAL", total: 558_960, flottant: 50_000, depart: 225_000 },
  { mnemo: "SAF", isin: "CM0000010017", issuer: "SAFACAM", designation: "SOCIETE AFRICAINE FORESTIERE ET AGRICOLE DU CAMEROUN", total: 1_242_000, flottant: 248_400, depart: 36_000 },
  { mnemo: "REG", isin: "CM0000010041", issuer: "La Régionale", designation: "LA REGIONALE D'EPARGNE ET DE CREDIT", total: 1_012_536, flottant: 72_089, depart: 36_500 },
  { mnemo: "SCGRE", isin: "GA0000010066", issuer: "SCG-Ré", designation: "SOCIETE COMMERCIALE GABONAISE DE REASSURANCE", total: 1_500_000, flottant: 300_000, depart: 19_000 },
  { mnemo: "SEMC", isin: "CM0000010009", issuer: "SEMC", designation: "SOCIETE DES EAUX MINERALES DU CAMEROUN", total: 192_473, flottant: 38_367, depart: 50_000 },
];

/** La première et la dernière séance du jeu. Fixes : un jeu d'essai qui suit l'horloge ne se compare plus à lui-même. */
const PREMIERE = "2025-10-01";
const DERNIERE = "2026-10-01";
const PREMIER_BULLETIN = 2347;

/**
 * Un tirage reproductible.
 *
 * Deux exécutions doivent donner la même cote, sinon une capture d'écran du
 * guide ne vaut plus rien et un cliquet ne peut rien tenir.
 */
function dés(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const jourSuivant = (iso: string) => new Date(new Date(`${iso}T12:00:00Z`).getTime() + 86400e3).toISOString().slice(0, 10);
const ouvre = (iso: string) => {
  const j = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return j >= 1 && j <= 5;
};

/** Le pas de cotation : un cours rond reste rond. */
const pas = (cours: number) => (cours >= 20_000 ? 500 : 100);

/**
 * LE MOUVEMENT NE DESCEND PAS SOUS UN POUR CENT, ET C'EST UNE CONTRAINTE.
 *
 * La plus petite ligne pèse 1,6 % du flottant coté : en dessous d'un pour cent
 * de variation, son mouvement s'arrondirait à « 0,00 % » sur l'indice, et le
 * contrôle de santé signalerait à juste titre un cours changé pour un indice
 * immobile. Ce n'est pas une facilité : c'est la même règle que la vraie cote,
 * où les pas de cotation sont larges.
 */
const PAS_DE_VARIATION = [1.0, 1.5, 2.0, 3.0];

export interface CoteDEssai {
  bulletins: MarketBulletin[];
  quotes: Quote[];
}

export function coteDEssai(): CoteDEssai {
  const tirage = dés(20261001);
  const seances: string[] = [];
  for (let d = PREMIERE; d <= DERNIERE; d = jourSuivant(d)) if (ouvre(d)) seances.push(d);

  const cours = new Map(LIGNES.map((l) => [l.mnemo, l.depart]));
  const dernierCours = new Map(LIGNES.map((l) => [l.mnemo, l.depart]));
  const dateDuCours = new Map(LIGNES.map((l) => [l.mnemo, PREMIERE]));
  const capFlottante = () => LIGNES.reduce((s, l) => s + cours.get(l.mnemo)! * l.flottant, 0);
  const base = capFlottante();

  const bulletins: MarketBulletin[] = [];
  const quotes: Quote[] = [];
  let precedent = 1000;

  seances.forEach((date, i) => {
    const bulletinNo = PREMIER_BULLETIN + i;
    /* La première séance sert d'origine : elle ne bouge pas, sinon la variation
       se mesurerait contre un cours qui n'a jamais été publié. */
    for (const l of LIGNES) {
      if (i === 0 || tirage() >= 0.05) continue;
      const avant = cours.get(l.mnemo)!;
      const sens = tirage() < 0.5 ? -1 : 1;
      const ampleur = PAS_DE_VARIATION[Math.floor(tirage() * PAS_DE_VARIATION.length)];
      const p = pas(avant);
      const marche = Math.max(p, Math.round((avant * ampleur) / 100 / p) * p);
      cours.set(l.mnemo, Math.max(p, avant + sens * marche));
    }

    const niveau = Number(((capFlottante() / base) * 1000).toFixed(3));
    const variation = Number((((niveau - precedent) / precedent) * 100).toFixed(3));

    for (const l of LIGNES) {
      const close = cours.get(l.mnemo)!;
      const avant = dernierCours.get(l.mnemo)!;
      const bouge = close !== avant;
      const vp = bouge ? Number((((close - avant) / avant) * 100).toFixed(2)) : 0;
      /* Un échange une séance sur quatre, et jamais le jour de l'origine. */
      const echange = i > 0 && tirage() < 0.22;
      const titres = echange ? Math.max(1, Math.round(tirage() * (l.flottant / 900))) : 0;
      quotes.push({
        isin: l.isin,
        sessionDate: date,
        bulletinNo,
        instrument: "action",
        mnemo: l.mnemo,
        issuer: l.issuer,
        designation: l.designation,
        previousClose: avant,
        previousDate: dateDuCours.get(l.mnemo)!,
        open: close,
        close,
        thresholdHigh: close * 1.05,
        thresholdLow: close * 0.95,
        variationPct: vp,
        referenceNext: close,
        volumeTraded: titres,
        valueTraded: titres * close,
        trades: echange ? 1 + Math.floor(tirage() * 4) : 0,
        /* « NC » : aucun prix ne s'est formé, et c'est l'état ordinaire. */
        status: echange ? "PEq" : "NC",
        sharesFloat: l.flottant,
        sharesTotal: l.total,
        marketCapFloat: close * l.flottant,
        marketCapTotal: close * l.total,
      });
      if (bouge) {
        dernierCours.set(l.mnemo, close);
        dateDuCours.set(l.mnemo, date);
      }
    }

    bulletins.push({
      id: date,
      number: bulletinNo,
      sessionDate: date,
      ingestedAt: `${date}T17:30:00.000Z`,
      ingestedBy: "cron",
      status: "ok",
      indexValue: niveau,
      indexVariationPct: i === 0 ? 0 : variation,
      counts: { equities: LIGNES.length, bonds: 0, funds: 0 },
      warnings: [],
      anomalies: [],
      notices: [],
    });
    precedent = niveau;
  });

  return { bulletins, quotes };
}
