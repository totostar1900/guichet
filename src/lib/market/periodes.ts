/**
 * LES PÉRIODES DU GRAPHE DU COURS ET LA VARIATION QUI LEUR RÉPOND (9 novembre 2026).
 *
 * UNE SEULE DÉFINITION, celle de « Ce qui performe » (`performe.ts`) : le début de la période est une date civile avant la dernière séance ; la première
 * clôture lue à partir de ce jour (avec échange, pour un cours : voir `lirePeriode`) est la base ; la variation est (dernière clôture − base) / base, hors dividendes. La fiche, l'Accueil, la page Titres et le
 * comparateur disent donc la même chose pour la même période. Ce fichier ne lit rien : il reçoit les points, jamais le dépôt (il est partagé avec le navigateur).
 *
 * UNE PÉRIODE QUE L'HISTORIQUE NE COUVRE PAS N'A PAS DE VARIATION : on ne prête pas un chiffre à « 5 ans » quand la série tient en un an. « Max » prend toute la série.
 */
export const MOIS_FENETRE = 3;

/** Une première cotation plus tardive que ceci (en jours) après la borne : la série ne couvre pas la période. */
export const JOURS_DE_GRACE = 10;

/** Le début de la fenêtre : `mois` mois civils avant la dernière séance. */
export function debutDeFenetre(jusquAu: string, mois = MOIS_FENETRE): string {
  const d = new Date(`${jusquAu}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - mois);
  return d.toISOString().slice(0, 10);
}

export type PeriodeCours = "3m" | "6m" | "1a" | "debut" | "2a" | "3a" | "5a" | "max";

/** Dans l'ordre de la liste déroulante. `mois` : la fenêtre civile ; « debut » commence au 1er janvier, « max » à la première séance. */
export const PERIODES: { cle: PeriodeCours; libelle: string; mois?: number }[] = [
  { cle: "3m", libelle: "3 mois", mois: 3 },
  { cle: "6m", libelle: "6 mois", mois: 6 },
  { cle: "1a", libelle: "1 an", mois: 12 },
  { cle: "debut", libelle: "Début d'année" },
  { cle: "2a", libelle: "2 ans", mois: 24 },
  { cle: "3a", libelle: "3 ans", mois: 36 },
  { cle: "5a", libelle: "5 ans", mois: 60 },
  { cle: "max", libelle: "Max" },
];

export interface PointCours {
  /** AAAA-MM-JJ. */
  d: string;
  /** Clôture, en FCFA. */
  c: number;
  /** Volume échangé, en titres. */
  v: number;
  /** Valeur échangée (le volume des transactions), en FCFA. */
  val?: number;
}

export interface LecturePeriode {
  cle: PeriodeCours;
  libelle: string;
  /** Faux quand l'historique ne couvre pas la période. */
  disponible: boolean;
  /** La première séance lue de la période (la base de la variation) : le premier ÉCHANGE quand la lecture l'exige. */
  depuis?: string;
  variationPct?: number;
  /** Les séances de la période, de la plus ancienne à la plus récente. */
  serie: PointCours[];
}

/** Le jour où la période commence, ou `undefined` pour « Max ». */
export function debutDePeriode(cle: PeriodeCours, jusquAu: string): string | undefined {
  if (cle === "max") return undefined;
  if (cle === "debut") return `${jusquAu.slice(0, 4)}-01-01`;
  const p = PERIODES.find((x) => x.cle === cle);
  return debutDeFenetre(jusquAu, p?.mois ?? MOIS_FENETRE);
}

const jours = (de: string, a: string): number => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);

/**
 * Lit une période dans une série triée du plus ancien au plus récent.
 *
 * `echangesSeulement` : LA VARIATION D'UN COURS NE SE LIT QUE SUR DES SÉANCES AVEC ÉCHANGE (20 novembre 2026, le client, après BANGE). Le bulletin de la cote publie, un jour sans transaction, un cours ajusté (« cotation ex-dividende », statut NC, variation 0,00 %) ou un prix d'équilibre indicatif (PEq) : lire ces clôtures comme des prix faisait de BANGE une hausse de 2,16 % sur trois mois, alors que ses échanges disent 228 085 avant et après. Base et dernier cours sont donc le premier et le dernier échange de la période ; moins de deux échanges, pas de variation. Le dessin garde toutes les séances (`serie`). Une série qui n'a pas de volume (un indice, une VL) ne passe pas `echangesSeulement`.
 */
export function lirePeriode(points: PointCours[], cle: PeriodeCours, echangesSeulement = false): LecturePeriode {
  const libelle = PERIODES.find((x) => x.cle === cle)?.libelle ?? cle;
  if (points.length < 2) return { cle, libelle, disponible: false, serie: [] };
  const fin = points[points.length - 1].d;
  const debut = debutDePeriode(cle, fin);
  const serie = debut ? points.filter((p) => p.d >= debut) : points;
  /* « Début d'année » d'une ligne entrée en cours d'année part de sa première cotation, comme « Max » : la série couvre la période dès qu'elle commence avant la grâce. */
  const couvre = !debut || jours(debut, points[0].d) <= JOURS_DE_GRACE || cle === "debut";
  if (!couvre || serie.length < 2) return { cle, libelle, disponible: false, serie: [] };
  const lus = echangesSeulement ? serie.filter((p) => p.v > 0) : serie;
  if (lus.length < 2) return { cle, libelle, disponible: true, serie };
  const base = lus[0];
  const dernier = lus[lus.length - 1];
  return { cle, libelle, disponible: true, depuis: base.d, variationPct: base.c > 0 ? ((dernier.c - base.c) / base.c) * 100 : undefined, serie };
}

/** La première période lisible, dans l'ordre de la liste : « 3 mois » quand la série la couvre, sinon la plus longue qu'elle couvre (« Max » au pire). */
export function periodeParDefaut(points: PointCours[]): PeriodeCours {
  return lirePeriode(points, "3m").disponible ? "3m" : "max";
}

/** Ce que la période dit des échanges : de quoi lire la volumétrie sans deviner. */
export function volumetrie(serie: PointCours[]): { total: number; valeur: number; seancesAvecEchange: number; seances: number; plusFort: number } {
  const total = serie.reduce((s, p) => s + p.v, 0);
  return { total, valeur: serie.reduce((s, p) => s + (p.val ?? 0), 0), seancesAvecEchange: serie.filter((p) => p.v > 0).length, seances: serie.length, plusFort: serie.reduce((m, p) => Math.max(m, p.v), 0) };
}
