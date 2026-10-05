import type { FundNav, MarketBulletin, Quote } from "@/lib/domain/market";
import { REF_OFFERS } from "./reference";
import { SEED_OFFERS } from "./seed";

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

/**
 * LES OBLIGATIONS ET LES FONDS NE S'INVENTENT PAS NON PLUS.
 *
 * Les trente-cinq lignes obligataires et les quarante-cinq fonds du semis
 * dense existent déjà comme OFFRES, avec leur ISIN, leur libellé, leur prix et
 * leur valeur liquidative. Leur donner ici des chiffres à eux créerait deux
 * vérités sur le même titre : la carte dirait 1 293,52 et la courbe finirait
 * ailleurs. On reprend donc les leurs, et on leur construit l'historique qui
 * manquait.
 *
 * LE COMPARTIMENT OBLIGATAIRE NE BOUGE PRESQUE PAS, et c'est mesuré : sur
 * douze mois de production, zéro transaction sur 7 709 couples ligne-séance,
 * et vingt et une lignes sur trente-cinq figées au même cours depuis 397
 * jours. Une cote obligataire animée donnerait à croire qu'on y entre et qu'on
 * en sort tous les jours, ce qui est le malentendu même que la fiche s'efforce
 * de dissiper.
 */
interface LigneObligataire {
  isin: string;
  titre: string;
  emetteur: string;
  prix: number;
  nominal?: number;
}

/**
 * Toutes les lignes que le dépôt sert, des deux semis.
 *
 * Le jeu de départ porte deux fonds et une obligation que le semis dense ne
 * reprend pas ; sans eux, deux cartes sur quarante-sept n'avaient pas de
 * courbe. Un trou de cette taille ne se voit pas tant qu'on ne compte pas.
 */
const lignes = () => {
  const vues = new Set<string>();
  return [...SEED_OFFERS, ...REF_OFFERS].filter((o) => {
    const clef = o.kind === "FONDS" ? (o.fund?.key ?? "") : (o.isin ?? "");
    if (!clef || vues.has(clef)) return false;
    vues.add(clef);
    return true;
  });
};

const obligations = (): LigneObligataire[] =>
  lignes()
    .filter((o) => o.kind === "MARCHE" && o.instrument === "obligation" && o.isin)
    .map((o) => ({
      isin: o.isin!,
      titre: o.title,
      emetteur: o.issuer,
      prix: o.lastPrice && o.lastPrice > 0 ? o.lastPrice : 100,
      nominal: o.nominal,
    }));

/** Le pas entre deux valeurs liquidatives, en jours, selon ce que le fonds annonce. */
const PAS_VL: Record<string, number> = { quotidienne: 1, hebdomadaire: 7, mensuelle: 30, trimestrielle: 91 };

/**
 * QUATRE-VINGT-DIX POINTS, ET LE DERNIER EST CELUI DE LA CARTE.
 *
 * La courbe se construit À REBOURS depuis la valeur publiée : c'est la seule
 * façon d'être certain que le dernier point de la courbe est le chiffre que la
 * carte affiche. Construite à l'endroit, elle arriverait à côté, et la carte
 * et sa propre courbe se contrediraient sur le même écran.
 *
 * La dérive annuelle vient de la performance sur douze mois quand le fonds en
 * publie une, sinon de sa performance depuis l'origine. Un fonds monétaire
 * monte presque en ligne droite ; un fonds d'actions respire. Le bruit suit
 * donc la catégorie, et non le hasard.
 */
const AMPLITUDE: Record<string, number> = { M: 0.04, O: 0.25, D: 0.5, A: 0.8 };

function navsDEssai(tirage: () => number): FundNav[] {
  const out: FundNav[] = [];
  for (const o of lignes()) {
    if (o.kind !== "FONDS" || !o.fund) continue;
    const f = o.fund;
    const pas = PAS_VL[f.frequency] ?? 7;
    const points = Math.min(90, Math.max(12, Math.round(((Date.parse(f.navDate) - Date.parse(f.inceptionDate)) / 86400e3 / pas) | 0) || 12));
    const annees = Math.max(0.5, (Date.parse(f.navDate) - Date.parse(f.inceptionDate)) / 86400e3 / 365);
    const deriveAnnuelle = f.perf1yPct ?? f.perfSinceInceptionPct / annees;
    const parPas = Math.pow(1 + deriveAnnuelle / 100, pas / 365) - 1;
    const bruit = AMPLITUDE[f.category] ?? 0.3;

    /* Le dernier point d'abord : la variation publiée donne l'avant-dernier,
       donc la carte, la variation et la courbe tombent d'accord. */
    const valeurs: { date: string; nav: number }[] = [{ date: f.navDate, nav: f.nav }];
    let v = f.variationPct ? f.nav / (1 + f.variationPct / 100) : f.nav / (1 + parPas);
    let d = Date.parse(f.navDate);
    for (let i = 1; i < points; i++) {
      d -= pas * 86400e3;
      if (i > 1) v = v / (1 + parPas + ((tirage() - 0.5) * bruit) / 100);
      valeurs.push({ date: new Date(d).toISOString().slice(0, 10), nav: Number(v.toFixed(2)) });
    }
    valeurs.reverse();

    valeurs.forEach((pt, i) => {
      const avant = i > 0 ? valeurs[i - 1] : undefined;
      out.push({
        fundKey: f.key,
        name: o.title,
        manager: f.manager,
        depositary: f.depositary,
        category: f.category,
        frequency: f.frequency,
        navDate: pt.date,
        nav: pt.nav,
        previousNav: avant?.nav,
        previousDate: avant?.date,
        navOrigin: f.navOrigin,
        inceptionDate: f.inceptionDate,
        perfSinceInceptionPct: Number((((pt.nav - f.navOrigin) / f.navOrigin) * 100).toFixed(2)),
        variationPct: avant ? Number((((pt.nav - avant.nav) / avant.nav) * 100).toFixed(2)) : undefined,
        bulletinNo: PREMIER_BULLETIN,
        sessionDate: pt.date,
      });
    });
  }
  return out;
}

export interface CoteDEssai {
  bulletins: MarketBulletin[];
  quotes: Quote[];
  navs: FundNav[];
}

export function coteDEssai(): CoteDEssai {
  const tirage = dés(20261001);
  const lignesObligataires = obligations();
  const navs = navsDEssai(dés(20261002));
  const nbFonds = new Set(navs.map((n) => n.fundKey)).size;
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

  /* Deux lignes obligataires sur cinq bougeront dans l'année ; les autres
     garderont leur cours. Le tirage est fait une fois pour toutes : une ligne
     figée le lundi ne se dégèle pas le mardi. */
  const obligationVivante = new Map(lignesObligataires.map((l) => [l.isin, tirage() < 0.4]));
  const coursObligataire = new Map(lignesObligataires.map((l) => [l.isin, l.prix]));
  const dateObligataire = new Map(lignesObligataires.map((l) => [l.isin, PREMIERE]));

  seances.forEach((date, i) => {
    const bulletinNo = PREMIER_BULLETIN + i;
    /* La première séance sert d'origine : elle ne bouge pas, sinon la variation
       se mesurerait contre un cours qui n'a jamais été publié. */
    const coursAvant = new Map(cours);
    for (const l of LIGNES) {
      if (i === 0 || tirage() >= 0.05) continue;
      const avant = cours.get(l.mnemo)!;
      const sens = tirage() < 0.5 ? -1 : 1;
      const ampleur = PAS_DE_VARIATION[Math.floor(tirage() * PAS_DE_VARIATION.length)];
      const p = pas(avant);
      const marche = Math.max(p, Math.round((avant * ampleur) / 100 / p) * p);
      cours.set(l.mnemo, Math.max(p, avant + sens * marche));
    }

    let niveau = Number(((capFlottante() / base) * 1000).toFixed(3));
    let variation = Number((((niveau - precedent) / precedent) * 100).toFixed(3));
    /**
     * UNE SÉANCE QUI S'ANNULE PRESQUE NE PASSE PAS LE CONTRÔLE.
     *
     * Deux lignes qui bougent en sens inverse peuvent laisser un net de
     * −0,01 %, et à cette taille l'arrondi de l'indice à trois décimales crée
     * un écart d'un facteur avec la variation reconstituée : le desk voit
     * « séance à éclaircir », à juste titre. Elle n'apprend rien ici et coûte
     * une alerte : on la rend plate.
     */
    if (Math.abs(variation) < 0.02 && [...cours].some(([m, v]) => v !== coursAvant.get(m))) {
      for (const [m, v] of coursAvant) cours.set(m, v);
      niveau = Number(((capFlottante() / base) * 1000).toFixed(3));
      variation = Number((((niveau - precedent) / precedent) * 100).toFixed(3));
    }

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

    for (const l of lignesObligataires) {
      const avant = coursObligataire.get(l.isin)!;
      /* Un mouvement obligataire est rare et petit : un quart de point, et
         seulement sur une ligne qu'on a déclarée vivante. */
      const bouge = i > 0 && obligationVivante.get(l.isin) && tirage() < 0.012;
      const close = bouge ? Number((avant + (tirage() < 0.5 ? -0.25 : 0.25)).toFixed(3)) : avant;
      quotes.push({
        isin: l.isin,
        sessionDate: date,
        bulletinNo,
        instrument: "obligation",
        mnemo: l.isin.slice(-6),
        issuer: l.emetteur,
        designation: l.titre,
        previousClose: avant,
        previousDate: dateObligataire.get(l.isin)!,
        open: close,
        close,
        thresholdHigh: close * 1.02,
        thresholdLow: close * 0.98,
        variationPct: close === avant ? 0 : Number((((close - avant) / avant) * 100).toFixed(2)),
        referenceNext: close,
        /* Aucune transaction : c'est l'état du compartiment, pas un trou. */
        volumeTraded: 0,
        valueTraded: 0,
        trades: 0,
        status: "NC",
        nominalRemaining: l.nominal,
      });
      if (close !== avant) {
        coursObligataire.set(l.isin, close);
        dateObligataire.set(l.isin, date);
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
      counts: { equities: LIGNES.length, bonds: lignesObligataires.length, funds: nbFonds },
      warnings: [],
      anomalies: [],
      notices: [],
    });
    precedent = niveau;
  });

  return { bulletins, quotes, navs };
}
