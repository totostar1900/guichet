import type { Tombee } from "./amortissement";

/**
 * LE MUR DES ÉCHÉANCES : QUAND LA ZONE DOIT PAYER, ET COMBIEN.
 *
 * C'est la question qu'un encours ne répond pas. Deux mille quatre cents
 * milliards dus ne disent rien du risque ; deux cents milliards dus le même
 * trimestre le disent. Le mur est ce qui transforme un stock en calendrier,
 * et c'est la seule lecture qui annonce une difficulté avant qu'elle arrive.
 *
 * DEUX COLONNES QUI NE SE CONFONDENT PAS, et la distinction porte tout :
 *
 *   LE CAPITAL tombe une fois, ou par tranches quand la ligne s'amortit. Il
 *   faut le refinancer ou le rembourser : c'est lui qui fait les murs.
 *
 *   LE COUPON revient chaque période jusqu'à l'échéance. Il se paie sur la
 *   trésorerie courante et ne se refinance pas. Les additionner en un seul
 *   « service » cache lequel des deux pèse, et c'est pourtant la première
 *   chose qu'un Trésor regarde.
 *
 * LE PAS EST LE TRIMESTRE, et ce n'est pas un réglage d'affichage. Au mois,
 * le mur se hérisse de pics qui ne sont que des dates de coupon ; à l'année,
 * un trimestre à deux cents milliards disparaît dans la moyenne. Le trimestre
 * est l'échelle à laquelle un Trésor arbitre.
 *
 * CE MODULE NE CALCULE PAS L'ÉCHÉANCIER, IL L'ASSEMBLE. `amortissement.ts`
 * rend les tombées d'une ligne cotée, en disant si le pas vient d'une mesure
 * ou d'une hypothèse ; ici on les range par trimestre et par porte, et on
 * garde cette distinction jusqu'à l'écran.
 */

export type Porte = "cote" | "adjuge";

/** Une tombée, rapportée à la porte par laquelle elle a été empruntée. */
export interface TombeeSituee extends Tombee {
  porte: Porte;
  emetteur: string;
}

export interface Trimestre {
  /** « 2027-T1 », qui se trie comme une chaîne. */
  clef: string;
  annee: number;
  trimestre: 1 | 2 | 3 | 4;
  /** Le premier jour, pour un axe de temps. */
  debut: string;
  capital: number;
  coupon: number;
  /** La part du capital dont le pas vient d'une mesure et non d'une hypothèse. */
  capitalMesure: number;
  parPorte: Record<Porte, { capital: number; coupon: number }>;
  lignes: number;
}

export const clefDuTrimestre = (iso: string): string => {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${d.getUTCFullYear()}-T${Math.floor(d.getUTCMonth() / 3) + 1}`;
};

const debutDuTrimestre = (clef: string): string => {
  const [a, t] = clef.split("-T");
  return `${a}-${String((Number(t) - 1) * 3 + 1).padStart(2, "0")}-01`;
};

/**
 * Le mur, trimestre par trimestre, à partir d'aujourd'hui.
 *
 * ON NE REND QUE L'AVENIR, et les tombées passées sont écartées plutôt que
 * cumulées à zéro : un mur qui commence en 2019 noie les trois trimestres qui
 * comptent sous vingt colonnes mortes.
 *
 * LES TRIMESTRES VIDES EXISTENT AUSSI, parce qu'un trou dans le mur est une
 * information : sauter de 2027-T2 à 2028-T1 laisserait croire à une tombée
 * continue, alors que le vide est précisément le répit.
 */
export function mur(tombees: TombeeSituee[], depuis: string, trimestres = 12): Trimestre[] {
  const vide = (clef: string): Trimestre => ({
    clef,
    annee: Number(clef.slice(0, 4)),
    trimestre: Number(clef.slice(-1)) as 1 | 2 | 3 | 4,
    debut: debutDuTrimestre(clef),
    capital: 0,
    coupon: 0,
    capitalMesure: 0,
    parPorte: { cote: { capital: 0, coupon: 0 }, adjuge: { capital: 0, coupon: 0 } },
    lignes: 0,
  });

  /* La suite des clefs, du trimestre courant aux suivants, sans trou. */
  const out: Trimestre[] = [];
  const d = new Date(`${debutDuTrimestre(clefDuTrimestre(depuis))}T12:00:00Z`);
  for (let i = 0; i < trimestres; i++) {
    out.push(vide(clefDuTrimestre(d.toISOString().slice(0, 10))));
    d.setUTCMonth(d.getUTCMonth() + 3);
  }
  const par = new Map(out.map((x) => [x.clef, x]));

  const vues = new Map<string, Set<string>>();
  for (const t of tombees) {
    if (t.quand < depuis) continue;
    const q = par.get(clefDuTrimestre(t.quand));
    if (!q) continue;
    q.capital += t.capital;
    q.coupon += t.coupon;
    if (t.source === "mesure") q.capitalMesure += t.capital;
    q.parPorte[t.porte].capital += t.capital;
    q.parPorte[t.porte].coupon += t.coupon;
    const s = vues.get(q.clef) ?? new Set<string>();
    s.add(t.isin);
    vues.set(q.clef, s);
  }
  for (const q of out) q.lignes = vues.get(q.clef)?.size ?? 0;
  return out;
}

/** Le trimestre le plus lourd du mur, celui qu'on cite. */
export const plusLourd = (m: Trimestre[]): Trimestre | undefined => m.reduce<Trimestre | undefined>((a, x) => (!a || x.capital + x.coupon > a.capital + a.coupon ? x : a), undefined);

/**
 * Ce que le mur doit dire de lui-même.
 *
 * La part mesurée du capital est le seul chiffre qui dise si le mur est une
 * lecture ou une estimation : un pas d'amortissement supposé étale le capital
 * régulièrement, ce qui lisse précisément les pics qu'on cherche.
 */
export function partMesuree(m: Trimestre[]): number {
  const total = m.reduce((a, x) => a + x.capital, 0);
  return total > 0 ? (m.reduce((a, x) => a + x.capitalMesure, 0) / total) * 100 : 0;
}
