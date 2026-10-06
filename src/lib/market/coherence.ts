import type { Quote } from "@/lib/domain/market";

/**
 * CE QUI N'AURAIT PAS DÛ CHANGER A-T-IL CHANGÉ ?
 *
 * Un écart dit ce qui a bougé. Un CONTRÔLE dit si ce qu'on lit peut seulement
 * être vrai, et c'est une autre question. Les cinq règles ci-dessous tiennent
 * PAR CONSTRUCTION dans le bulletin : la bourse les applique en le
 * fabriquant. Une ligne qui les dément n'est donc jamais un événement de
 * marché, c'est un chiffre mal lu.
 *
 * LA DISTINCTION QUI PORTE TOUT, et qui a mis une journée à se dire. On
 * appelait « rupture » aussi bien une ligne qui entre ou sort de la cote
 * qu'une valeur impossible. Les deux ne demandent pas le même geste : la
 * première se constate et peut être un vrai mouvement de marché, la seconde
 * se relit, toujours. Les confondre dans un même compte, c'est redonner une
 * seule couleur à deux gestes différents, exactement l'erreur que
 * « passagère / définitive » avait corrigée sur les départs.
 *
 * Ces règles ne jugent pas le marché. Elles jugent NOTRE LECTURE.
 */

/**
 * UNE FAUTE PORTE SES DEUX MONTANTS SÉPARÉMENT, et non une phrase où il
 * faudrait les chercher : « lu » est ce que le bulletin dit, « attendu » ce
 * que la règle exige. Mis l'un à côté de l'autre dans deux colonnes, l'écart
 * se voit sans lire.
 */
export interface Faute {
  isin: string;
  /** Le mnémonique quand on l'a : c'est lui que le desk reconnaît. */
  nom: string;
  lu: string;
  attendu: string;
}

export interface Controle {
  id: "chainage" | "bande" | "nominal" | "saut" | "identite";
  /** Faux quand le couple ne permet pas de l'appliquer : on le dit au lieu de le taire. */
  applicable: boolean;
  /** Combien de lignes la règle a pu examiner. */
  examinees: number;
  fautes: Faute[];
  /**
   * TROIS LIGNES QUI PASSENT, et c'est la correction d'un défaut de principe.
   *
   * Un contrôle sans faute n'avait rien à montrer : il ne s'ouvrait pas. Mais
   * à l'écran il ressemblait trait pour trait à celui qui s'ouvre, donc on le
   * touchait et rien ne venait. Et surtout : UN CONTRÔLE QUI NE MONTRE JAMAIS
   * RIEN EST INDISCERNABLE D'UN CONTRÔLE QUI NE TOURNE PAS, qui est la famille
   * de pannes la plus coûteuse de ce projet. Trois lignes vues passer, avec à
   * côté ce que la règle exigeait d'elles, prouvent qu'elle a bien mordu.
   */
  temoins: Faute[];
}

const nom = (q: Quote) => q.mnemo || q.isin;
const proche = (a: number, b: number, marge: number) => Math.abs(a - b) <= marge;
const fmt = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
/** Le bulletin arrondit ses seuils à l'unité : l'écart maximal est d'un demi. */
const ARRONDI = 0.51;
/** Un nom long ne tient pas dans une phrase : on en garde de quoi le reconnaître. */
const court = (s: string) => (s.length > 44 ? `${s.slice(0, 44)}…` : s);

/**
 * La bande que la bourse ouvre autour du cours précédent.
 *
 * Mesuré le 6 octobre 2026 sur les 4 940 lignes d'actions du dépôt : dix pour
 * cent EXACTEMENT depuis le 1er novembre 2023, et zéro avant, car le régime a
 * changé ce jour-là. Pour les obligations, six pour cent, lu sur le bulletin
 * 1914 (106,00 et 94,00 pour un précédent à 100).
 */
export const BANDE_ACTION_DEPUIS = "2023-11-01";
export const bande = (q: Quote): number | undefined => {
  if (q.instrument === "obligation") return 0.06;
  return q.sessionDate >= BANDE_ACTION_DEPUIS ? 0.1 : 0;
};

/** Assez pour prouver que la règle a mordu, trop peu pour noyer le verdict. */
const TEMOINS = 3;

/**
 * LA FABRIQUE D'UN CONTRÔLE, et les cinq y passent.
 *
 * Les cinq blocs se ressemblaient à la virgule près : même filtre, même mise
 * en forme, chacun recopié. Deux parcours de la même liste au lieu d'un, et
 * surtout cinq endroits à corriger pour une règle commune, ce qui est la
 * manière habituelle de les laisser dériver. `dire` ne s'appelle plus que sur
 * les lignes retenues : fautes d'un côté, trois témoins de l'autre.
 */
function controle<T>(id: Controle["id"], applicable: boolean, lignes: T[], fautive: (x: T) => boolean, dire: (x: T) => Faute): Controle {
  const fautes: Faute[] = [];
  const temoins: Faute[] = [];
  for (const x of lignes) {
    if (fautive(x)) fautes.push(dire(x));
    else if (temoins.length < TEMOINS) temoins.push(dire(x));
  }
  return { id, applicable, examinees: lignes.length, fautes, temoins };
}

/**
 * Les cinq contrôles, sur un couple de séances.
 *
 * `voisines` dit si B suit immédiatement A dans la série. Trois règles n'ont
 * de sens que dans ce cas : le chaînage, le saut, et l'amortissement d'une
 * séance à l'autre. Sur deux séances éloignées elles sont déclarées non
 * applicables plutôt que calculées de travers.
 */
export function controler(avant: Quote[], apres: Quote[], voisines: boolean): Controle[] {
  const a = new Map(avant.map((q) => [q.isin, q]));
  const communes = apres.filter((q) => a.has(q.isin));

  /* 1. LE CHAÎNAGE. Le « cours précédent » d'une séance est la clôture de la
     veille. C'est la plus forte des cinq : elle lie deux documents entre eux,
     donc elle attrape une ligne mal lue d'un côté comme de l'autre. */
  const chainage = controle(
    "chainage",
    voisines,
    voisines ? communes : [],
    (q) => !proche(q.previousClose, a.get(q.isin)!.close, 0.011),
    (q) => ({ isin: q.isin, nom: nom(q), lu: fmt(q.previousClose), attendu: fmt(a.get(q.isin)!.close) }),
  );

  /* 2. LA BANDE. Les seuils se calculent du cours précédent, ils ne se
     constatent pas.
     LA MARGE EST D'UN DEMI-FRANC, et c'est mesuré : le 30 décembre 2025 le
     bulletin imprime 250 894 et 205 277 là où le calcul donne 250 893,5 et
     205 276,5. Il arrondit à l'unité, donc l'écart maximal est d'un demi.
     Six centimes, ma première valeur, condamnaient une ligne juste. */
  const avecBande = apres.filter((q) => (bande(q) ?? 0) > 0 && q.previousClose > 0 && q.thresholdHigh > 0);
  const bandeC = controle(
    "bande",
    true,
    avecBande,
    (q) => {
      const k = bande(q)!;
      return !proche(q.thresholdHigh, q.previousClose * (1 + k), ARRONDI) || !proche(q.thresholdLow, q.previousClose * (1 - k), ARRONDI);
    },
    (q) => {
      const k = bande(q)!;
      return { isin: q.isin, nom: nom(q), lu: `${fmt(q.thresholdHigh)} / ${fmt(q.thresholdLow)}`, attendu: `${fmt(q.previousClose * (1 + k))} / ${fmt(q.previousClose * (1 - k))}` };
    },
  );

  /* 3. LE NOMINAL NE REMONTE PAS. Une obligation amortit : son nominal
     restant décroît. Une remontée est un chiffre mal lu, ou deux lignes
     confondues. Vrai même entre séances éloignées, donc toujours applicable. */
  const avecNominal = communes.filter((q) => q.nominalRemaining != null && a.get(q.isin)!.nominalRemaining != null);
  const nominal = controle(
    "nominal",
    true,
    avecNominal,
    (q) => q.nominalRemaining! > a.get(q.isin)!.nominalRemaining! + 0.011,
    (q) => ({ isin: q.isin, nom: nom(q), lu: fmt(q.nominalRemaining!), attendu: `≤ ${fmt(a.get(q.isin)!.nominalRemaining!)}` }),
  );

  /* 4. AUCUN COURS NE SAUTE SA BANDE. Une clôture ne peut pas franchir les
     seuils que la veille lui a fixés : c'est le mécanisme même de la bourse.
     Si elle le fait, l'un des deux chiffres est faux. */
  const sautables = voisines ? communes.filter((q) => a.get(q.isin)!.thresholdHigh > 0 && a.get(q.isin)!.thresholdLow > 0 && q.close > 0) : [];
  const saut = controle(
    "saut",
    voisines,
    sautables,
    (q) => q.close > a.get(q.isin)!.thresholdHigh + 0.011 || q.close < a.get(q.isin)!.thresholdLow - 0.011,
    (q) => ({ isin: q.isin, nom: nom(q), lu: fmt(q.close), attendu: `${fmt(a.get(q.isin)!.thresholdLow)} – ${fmt(a.get(q.isin)!.thresholdHigh)}` }),
  );

  /* 5. UN ISIN GARDE SON NOM. Le cinquième, et il vient d'une leçon chère :
     la bourse a écrit « FCP BGFI Bank ATLAS » puis « FCP BGFIBank ATLAS », et
     une espace a créé un second fonds resté publié trois ans. Sur les
     cotations l'ISIN protège de la scission, mais un mnémonique qui change
     sous le même ISIN reste le signe d'une ligne mal lue, ou d'un événement
     que la maison doit connaître. On compare sur les lettres et les chiffres
     seuls : une espace ou un trait d'union de plus ne sont pas un autre nom. */
  const forme = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const identite = controle(
    "identite",
    true,
    communes,
    (q) => {
      const v = a.get(q.isin)!;
      return (!!q.mnemo && !!v.mnemo && forme(q.mnemo) !== forme(v.mnemo)) || (!!q.issuer && !!v.issuer && forme(q.issuer) !== forme(v.issuer));
    },
    (q) => {
      const v = a.get(q.isin)!;
      /* Le témoin d'une ligne saine montre le mnémonique, qui est ce que le
         desk reconnaît ; une faute montre celle des deux valeurs qui a bougé. */
      const surLeMnemo = forme(q.mnemo) !== forme(v.mnemo);
      return { isin: q.isin, nom: nom(q), lu: court(surLeMnemo ? q.mnemo : q.issuer), attendu: court(surLeMnemo ? v.mnemo : v.issuer) };
    },
  );

  return [chainage, bandeC, nominal, saut, identite];
}

/** Combien de fautes, tous contrôles applicables confondus. */
export const incoherences = (cs: Controle[]): number => cs.reduce((s, c) => s + (c.applicable ? c.fautes.length : 0), 0);

/** Combien de contrôles applicables passent sans faute. */
export const passes = (cs: Controle[]): number => cs.filter((c) => c.applicable && c.fautes.length === 0).length;
export const applicables = (cs: Controle[]): number => cs.filter((c) => c.applicable).length;
