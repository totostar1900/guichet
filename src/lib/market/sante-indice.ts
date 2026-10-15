/**
 * LA SANTÉ DE L'INDICE : CE QU'IL FAUT SAVOIR AVANT DE LIRE UNE VARIATION.
 *
 * L'indice est publié par la BVMAC et nous le lisons dans le bulletin. Ce
 * module ne construit pas d'indice concurrent : il MESURE celui-là, et il
 * mesure d'abord ce que la page ne disait pas.
 *
 * TROIS FAITS COMMANDENT LA LECTURE DE CE MARCHÉ, et aucun n'était affiché :
 * un émetteur pèse les trois quarts de la cote, une cotation sur cinq porte un
 * échange, et l'indice ne change de valeur qu'un jour sur cinq. Une variation
 * quotidienne lue sans eux dit autre chose que ce qu'on croit.
 *
 * CE QUI N'EST PAS ICI, ET POURQUOI.
 *
 *   LE P/E ET LA CROISSANCE DES BÉNÉFICES. La colonne du bénéfice par action
 *   existe au bulletin et elle est VIDE sur les 4 995 lignes d'actions. Le
 *   résultat net est dans les états financiers des émetteurs, que nous avons
 *   en bibliothèque mais pas encore lus. Un P/E estimé serait inventé.
 *
 *   UN INDICE DE VOLATILITÉ IMPLICITE. Il se calcule sur le prix des options,
 *   et il n'y a pas de marché d'options en zone CEMAC. Rien à en tirer : ce
 *   qui est rendu ici est la volatilité RÉALISÉE, au pas mensuel, ce qui n'est
 *   pas la même chose et ne porte donc pas le même nom.
 *
 *   L'ÉCART DE RÉPLICATION. Aucun fonds ne réplique l'indice : la mesure n'a
 *   pas d'objet tant qu'il n'en existe pas.
 *
 * LE PAS EST MENSUEL POUR TOUT CE QUI SE COMPTE, et c'est une conséquence du
 * premier fait. Au jour le jour, une ligne d'avances et de reculs sur sept
 * titres dont un seul s'échange serait plate : elle mesurerait le calendrier,
 * pas le marché.
 */

export interface PointIndice {
  date: string;
  value: number;
  variationPct?: number;
}

export interface PoidsValeur {
  mnemo: string;
  close: number;
  capTotal: number;
  capFloat: number;
  lastDividend?: number;
}

export interface CotationLue {
  sessionDate: string;
  variationPct?: number;
  volumeTraded?: number;
  trades?: number;
  close?: number;
  marketCapTotal?: number;
  sharesTotal?: number;
  lastDividend?: number;
  dividendDate?: string;
  dividendYear?: number;
}

export type Ponderation = "total" | "flottant";

/** Le pire recul depuis un sommet, et les deux dates qui le bornent. */
export interface Repli {
  pct: number;
  sommetLe?: string;
  sommet?: number;
  creuxLe?: string;
  creux?: number;
}

/**
 * LE REPLI MAXIMUM, AVEC SES DEUX DATES.
 *
 * « −8,9 % » sans dire d'où ne se vérifie pas et ne se raconte pas. Le sommet
 * se recalcule sur la période regardée : un repli mesuré depuis un plus haut
 * antérieur à la fenêtre parlerait d'un autre temps que celui qu'on affiche.
 */
export function repliMaximum(points: PointIndice[]): Repli {
  let sommet = -Infinity;
  let sommetLe = "";
  const out: Repli = { pct: 0 };
  for (const p of points) {
    if (!(p.value > 0)) continue;
    if (p.value > sommet) {
      sommet = p.value;
      sommetLe = p.date;
    }
    const pct = (100 * (p.value - sommet)) / sommet;
    if (pct < out.pct) {
      out.pct = pct;
      out.sommet = sommet;
      out.sommetLe = sommetLe;
      out.creux = p.value;
      out.creuxLe = p.date;
    }
  }
  return out;
}

/** Le dernier niveau de chaque mois, et la variation d'un mois au suivant. */
export function parMois(points: PointIndice[]): { m: string; v: number; r?: number }[] {
  const out: { m: string; v: number; r?: number }[] = [];
  for (const p of points) {
    if (!(p.value > 0)) continue;
    const m = p.date.slice(0, 7);
    const der = out[out.length - 1];
    if (der && der.m === m) der.v = p.value;
    else out.push({ m, v: p.value });
  }
  for (let i = 1; i < out.length; i++) out[i].r = (100 * (out[i].v - out[i - 1].v)) / out[i - 1].v;
  return out;
}

/**
 * LA VOLATILITÉ RÉALISÉE, AU PAS MENSUEL.
 *
 * Au pas quotidien, l'écart type d'une série qui ne bouge que vingt pour cent
 * des jours mesure la fréquence de cotation et non le risque : il tend vers
 * zéro quand le marché s'assèche, ce qui est exactement l'inverse de la
 * vérité. Le mois agrège assez de séances pour que le chiffre parle du prix.
 */
export function volatiliteMensuelle(points: PointIndice[]): number | undefined {
  const r = parMois(points)
    .slice(1)
    .map((x) => x.r!)
    .filter((x) => Number.isFinite(x));
  if (r.length < 2) return undefined;
  const moy = r.reduce((a, b) => a + b, 0) / r.length;
  return Math.sqrt(r.reduce((s, x) => s + (x - moy) ** 2, 0) / (r.length - 1));
}

export interface Concentration {
  /** La part du premier, en pour cent. */
  premier: number;
  /** La part des trois premiers. */
  troisPremiers: number;
  nom?: string;
  /** Les parts, de la plus grosse à la plus petite. */
  parts: { mnemo: string; pct: number }[];
}

/**
 * LA CONCENTRATION, ET POURQUOI LA PONDÉRATION EST LE SUJET.
 *
 * En capitalisation totale, l'indice est le thermomètre du plus gros
 * émetteur ; en flottant, il décrit ce qu'un investisseur peut acheter. Les
 * deux sont défendables et ils ne donnent pas le même chiffre : la page montre
 * les deux plutôt que d'en choisir un en silence.
 */
export function concentration(poids: PoidsValeur[], p: Ponderation): Concentration {
  const val = (x: PoidsValeur) => (p === "total" ? x.capTotal : x.capFloat);
  const total = poids.reduce((s, x) => s + val(x), 0);
  if (!total) return { premier: 0, troisPremiers: 0, parts: [] };
  const parts = poids
    .map((x) => ({ mnemo: x.mnemo, pct: (100 * val(x)) / total }))
    .sort((a, b) => b.pct - a.pct);
  return {
    premier: parts[0]?.pct ?? 0,
    troisPremiers: parts.slice(0, 3).reduce((s, x) => s + x.pct, 0),
    nom: parts[0]?.mnemo,
    parts,
  };
}

/**
 * LE RENDEMENT DU DIVIDENDE, PONDÉRÉ, ET LE DÉNOMINATEUR COMPTE.
 *
 * Un rendement pondéré se divise par la somme des poids RETENUS, pas par la
 * capitalisation entière : une valeur sans dividende connu ne doit pas diluer
 * le résultat comme si elle en versait zéro, puisqu'on ne sait pas. On rend
 * donc aussi le nombre de valeurs comptées.
 */
export function rendementDuDividende(poids: PoidsValeur[], p: Ponderation): { pct?: number; comptees: number; total: number } {
  const val = (x: PoidsValeur) => (p === "total" ? x.capTotal : x.capFloat);
  const avec = poids.filter((x) => x.lastDividend != null && x.lastDividend > 0 && x.close > 0);
  const base = avec.reduce((s, x) => s + val(x), 0);
  if (!base) return { pct: undefined, comptees: avec.length, total: poids.length };
  return { pct: avec.reduce((s, x) => s + (100 * x.lastDividend!) / x.close * val(x), 0) / base, comptees: avec.length, total: poids.length };
}

export interface Souffle {
  /** Couples valeur-séance lus. */
  cotations: number;
  /** Ceux qui portent au moins un échange. */
  negociees: number;
  /** Ceux dont le cours a bougé. */
  bougees: number;
  /** Séances distinctes. */
  seances: number;
}

/**
 * CE QUE LE MARCHÉ RESPIRE.
 *
 * On compte des COUPLES valeur-séance et non des séances : « 20 % des séances
 * ont un échange » et « 20 % des cotations ont un échange » sont deux phrases
 * différentes, et c'est la seconde qui dit si une valeur se négocie. La page
 * de l'indice compte déjà les séances où l'indice bouge ; celle-ci compte
 * autre chose, et le dit autrement.
 */
export function souffle(histoires: { quotes: CotationLue[] }[]): Souffle {
  const seances = new Set<string>();
  let cotations = 0;
  let negociees = 0;
  let bougees = 0;
  for (const h of histoires) {
    for (const q of h.quotes) {
      cotations++;
      seances.add(q.sessionDate);
      if ((q.volumeTraded ?? 0) > 0 || (q.trades ?? 0) > 0) negociees++;
      if ((q.variationPct ?? 0) !== 0) bougees++;
    }
  }
  return { cotations, negociees, bougees, seances: seances.size };
}

/** Les niveaux distincts de l'indice : la mesure de son immobilité. */
export function niveauxDistincts(points: PointIndice[]): { distincts: number; points: number } {
  const v = points.filter((p) => p.value > 0);
  return { distincts: new Set(v.map((p) => p.value)).size, points: v.length };
}


/**
 * LE RENDEMENT TOTAL : LE PRIX ET LES DIVIDENDES, PAR LA MÊME SÉRIE.
 *
 * L'indice publié est un indice de PRIX : il ignore ce que les sociétés
 * versent, et il sous-estime donc ce qu'un porteur a gagné. Sur une cote dont
 * les valeurs servent de un et demi à près de six pour cent, l'écart n'est pas
 * un détail d'arrondi.
 *
 * CE N'EST PAS UN AUTRE INDICE, ET LE NOM COMPTE. Nous ne publions pas un
 * « BVMAC dividendes compris » : nous disons ce que l'indice officiel aurait
 * rendu si les dividendes avaient été réinvestis. La série de référence reste
 * la sienne.
 *
 * CHAQUE INGRÉDIENT EST LU, AUCUN N'EST ESTIMÉ. La date de détachement, le
 * montant par action, le nombre de titres et la capitalisation du jour sont
 * tous au bulletin. Le rendement d'un jour vaut donc celui du prix plus le
 * montant détaché rapporté à la capitalisation de la veille : c'est la
 * construction habituelle, pas une approximation.
 *
 * UN DIVIDENDE NE SE COMPTE QU'UNE FOIS. Le bulletin reporte le même
 * « dernier dividende » à chaque séance pendant des mois : c'est le couple
 * date de détachement et montant qui fait l'événement, pas la ligne.
 */
export interface Evenement {
  date: string;
  mnemo: string;
  parAction: number;
  /** Le montant détaché par la société entière, en francs. */
  total: number;
}

export function evenementsDeDividende(histoires: { mnemo?: string; quotes: CotationLue[] }[]): { evenements: Evenement[]; conflits: string[] } {
  /* Un rapport = un couple date-montant pour un exercice, et le nombre de
     séances qui le portent. */
  interface Rapport {
    date: string;
    parAction: number;
    titres: number;
    seances: number;
  }
  const parExercice = new Map<string, Map<string, Rapport>>();
  for (const h of histoires) {
    for (const q of h.quotes) {
      if (!q.dividendDate || !q.lastDividend || !q.sharesTotal) continue;
      const mnemo = h.mnemo ?? '';
      /* L'EXERCICE EST LA CLEF, pas la ligne : une société paie un dividende
         par exercice sur ce marché. Sans exercice connu, la date sert de
         clef : mieux vaut un doublon possible qu'un paiement perdu. */
      const clef = q.dividendYear != null ? `${mnemo}|${q.dividendYear}` : `${mnemo}|${q.dividendDate}`;
      const rapports = parExercice.get(clef) ?? new Map<string, Rapport>();
      const sous = `${q.dividendDate}|${q.lastDividend}`;
      const r = rapports.get(sous) ?? { date: q.dividendDate, parAction: q.lastDividend, titres: q.sharesTotal, seances: 0 };
      r.seances += 1;
      r.titres = q.sharesTotal;
      rapports.set(sous, r);
      parExercice.set(clef, rapports);
    }
  }

  const evenements: Evenement[] = [];
  const conflits: string[] = [];
  for (const [clef, rapports] of parExercice) {
    const liste = [...rapports.values()].sort((a, b) => b.seances - a.seances || a.date.localeCompare(b.date));
    const retenu = liste[0];
    const mnemo = clef.split('|')[0];
    evenements.push({ date: retenu.date, mnemo, parAction: retenu.parAction, total: retenu.parAction * retenu.titres });
    for (const autre of liste.slice(1)) {
      conflits.push(
        `${clef.replace('|', ' ')} : ${retenu.parAction} au ${retenu.date} sur ${retenu.seances} séance(s), contre ${autre.parAction} au ${autre.date} sur ${autre.seances}`,
      );
    }
  }
  return { evenements: evenements.sort((x, y) => x.date.localeCompare(y.date)), conflits };
}
export interface RendementTotal {
  /** La performance du prix seul, en pour cent sur la période lue. */
  prix?: number;
  /** La même, dividendes réinvestis. */
  total?: number;
  /** Combien de détachements sont tombés dans la période. */
  detachements: number;
  /** Les deux séries, base cent au premier point. */
  serie: { date: string; prix: number; total: number }[];
  /** Les exercices dont deux bulletins ne disent pas la même chose. */
  conflits: string[];
}

export function rendementTotal(points: PointIndice[], histoires: { mnemo?: string; quotes: CotationLue[] }[]): RendementTotal {
  const suite = points.filter((p) => p.value > 0);
  if (suite.length < 2) return { detachements: 0, serie: [], conflits: [] };
  /* La capitalisation de la cote, séance par séance : c'est le dénominateur
     d'un détachement, et il bouge avec les cours. */
  const capital = new Map<string, number>();
  for (const h of histoires) for (const q of h.quotes) if (q.marketCapTotal) capital.set(q.sessionDate, (capital.get(q.sessionDate) ?? 0) + q.marketCapTotal);
  const parDate = new Map<string, number>();
  const { evenements, conflits } = evenementsDeDividende(histoires);
  for (const e of evenements) parDate.set(e.date, (parDate.get(e.date) ?? 0) + e.total);

  const base = suite[0].value;
  const serie = [{ date: suite[0].date, prix: 100, total: 100 }];
  let total = 100;
  let detachements = 0;
  for (let i = 1; i < suite.length; i++) {
    const avant = suite[i - 1];
    const ici = suite[i];
    const detache = parDate.get(ici.date) ?? 0;
    if (detache) detachements++;
    const cap = capital.get(avant.date) ?? 0;
    total *= ici.value / avant.value + (cap ? detache / cap : 0);
    serie.push({ date: ici.date, prix: (100 * ici.value) / base, total });
  }
  return { prix: serie[serie.length - 1].prix - 100, total: total - 100, detachements, serie, conflits };
}

/**
 * LE BÊTA D'UNE VALEUR, AU PAS MENSUEL, ET SON AVERTISSEMENT.
 *
 * Au jour le jour, une valeur qui ne s'échange pas rend un bêta proche de
 * zéro : ce n'est pas de la stabilité, c'est de l'immobilité, et le chiffre
 * dirait l'inverse de la vérité. Le mois agrège assez de séances pour que la
 * covariance porte sur des prix. On rend donc aussi le nombre de mois où la
 * valeur a bougé : sous une poignée, le bêta ne veut rien dire, et la page le
 * montre plutôt que de le cacher.
 *
 * LES AVANCES ET LES RECULS VOYAGENT AVEC LUI. Une ligne d'avances et de
 * reculs au jour le jour serait plate sur sept titres ; comptée par valeur sur
 * toute la période, elle dit lesquelles vivent.
 */
export interface BetaValeur {
  mnemo: string;
  beta?: number;
  /** Mois comparés. */
  mois: number;
  /** Mois où le cours de la valeur a bougé. */
  moisActifs: number;
  hausses: number;
  baisses: number;
}

export function betaMensuel(points: PointIndice[], histoires: { mnemo?: string; quotes: CotationLue[] }[]): BetaValeur[] {
  const indice = new Map(parMois(points).map((x) => [x.m, x.r]));
  return histoires
    .map((h) => {
      const fin = new Map<string, number>();
      let hausses = 0;
      let baisses = 0;
      for (const q of h.quotes) {
        if (q.close) fin.set(q.sessionDate.slice(0, 7), q.close);
        if ((q.variationPct ?? 0) > 0) hausses++;
        else if ((q.variationPct ?? 0) < 0) baisses++;
      }
      const mois = [...fin.keys()].sort();
      const couples: { x: number; y: number }[] = [];
      for (let i = 1; i < mois.length; i++) {
        const ri = indice.get(mois[i]);
        const av = fin.get(mois[i - 1]);
        if (ri == null || !av) continue;
        couples.push({ x: ri, y: (100 * (fin.get(mois[i])! - av)) / av });
      }
      const actifs = couples.filter((c) => c.y !== 0).length;
      const commun = { mnemo: h.mnemo ?? '', mois: couples.length, moisActifs: actifs, hausses, baisses };
      if (couples.length < 3) return { ...commun, beta: undefined };
      const mx = couples.reduce((s2, c) => s2 + c.x, 0) / couples.length;
      const my = couples.reduce((s2, c) => s2 + c.y, 0) / couples.length;
      const cov = couples.reduce((s2, c) => s2 + (c.x - mx) * (c.y - my), 0);
      const varx = couples.reduce((s2, c) => s2 + (c.x - mx) ** 2, 0);
      return { ...commun, beta: varx ? cov / varx : undefined };
    })
    .sort((x, y) => (y.beta ?? -99) - (x.beta ?? -99));
}
export interface SanteIndice {
  repli: Repli;
  volatilite?: number;
  concentration: Concentration;
  rendement: { pct?: number; comptees: number; total: number };
  souffle: Souffle;
  niveaux: { distincts: number; points: number };
  total: RendementTotal;
  betas: BetaValeur[];
  ponderation: Ponderation;
}

/** Tout d'un coup, pour une pondération donnée. */
export function santeIndice(points: PointIndice[], poids: PoidsValeur[], histoires: { mnemo?: string; quotes: CotationLue[] }[], p: Ponderation = "total"): SanteIndice {
  return {
    repli: repliMaximum(points),
    volatilite: volatiliteMensuelle(points),
    concentration: concentration(poids, p),
    rendement: rendementDuDividende(poids, p),
    souffle: souffle(histoires),
    niveaux: niveauxDistincts(points),
    total: rendementTotal(points, histoires),
    betas: betaMensuel(points, histoires),
    ponderation: p,
  };
}
