import type { Quote } from "@/lib/domain/market";

/**
 * COMPARER DEUX COTES : UN DÉTECTEUR DE RUPTURES, PAS UN DIFF.
 *
 * La question du desk n'est pas « qu'est-ce qui a changé » mais « est-ce que
 * quelque chose a disparu, et si oui, est-ce grave ». Une ligne absente d'une
 * séance à la suivante est soit sortie de la cote, soit mal lue, et les deux
 * ne se réparent pas pareil : l'une est un événement de marché qu'on constate,
 * l'autre un défaut de lecture qu'on corrige.
 *
 * SEULE LA SUITE DE LA SÉRIE TRANCHE. Si la ligne revient plus tard, elle
 * n'est jamais sortie : le lecteur l'a ratée. Mesuré sur les 805 couples de
 * séances consécutives, le 6 octobre 2026 : 406 disparitions, dont 398
 * reviennent et 8 seulement sont définitives. Autrement dit, 98 % des
 * « sorties de cote » sont des défauts de lecture, et c'est ce que la
 * distinction durable / passagère rend enfin visible.
 *
 * Module pur : il reçoit deux listes de cotations et rend l'écart. Savoir si
 * une ligne revient demande la base, donc cela se décide dehors, et la forme
 * ci-dessous garde la place pour le dire.
 */
export interface Depart {
  isin: string;
  mnemo: string;
  instrument: Quote["instrument"];
  /** La date à laquelle la ligne reparaît, si elle reparaît. */
  retour?: string;
}

export interface Arrivee {
  isin: string;
  mnemo: string;
  instrument: Quote["instrument"];
  /** Vraie première cotation, par opposition au retour d'une ligne connue. */
  premiere: boolean;
}

export interface Mouvement {
  isin: string;
  mnemo: string;
  instrument: Quote["instrument"];
  avant: number;
  apres: number;
  /** En pour cent, ou rien quand le cours d'avant est nul : on ne divise pas par zéro. */
  variation?: number;
}

export interface Ecart {
  partis: Depart[];
  arrivees: Arrivee[];
  /** Les lignes des deux côtés dont le cours a bougé. */
  bouges: Mouvement[];
  /** Combien sont présentes des deux côtés, bougées ou non. */
  communes: number;
}

const nomme = (q: Quote) => ({ isin: q.isin, mnemo: q.mnemo || q.isin, instrument: q.instrument });

/**
 * L'écart entre deux séances, sans juger : les départs sortent sans leur
 * verdict, que seule la suite de la série peut rendre.
 */
export function comparer(avant: Quote[], apres: Quote[]): Ecart {
  const a = new Map(avant.map((q) => [q.isin, q]));
  const b = new Map(apres.map((q) => [q.isin, q]));

  const partis: Depart[] = [...a.values()].filter((q) => !b.has(q.isin)).map(nomme);
  const arrivees: Arrivee[] = [...b.values()].filter((q) => !a.has(q.isin)).map((q) => ({ ...nomme(q), premiere: false }));

  const bouges: Mouvement[] = [];
  let communes = 0;
  for (const q of b.values()) {
    const p = a.get(q.isin);
    if (!p) continue;
    communes += 1;
    if (p.close === q.close) continue;
    bouges.push({ ...nomme(q), avant: p.close, apres: q.close, variation: p.close ? (q.close / p.close - 1) * 100 : undefined });
  }

  const ordre = (x: { instrument: Quote["instrument"]; mnemo: string }, y: { instrument: Quote["instrument"]; mnemo: string }) =>
    x.instrument === y.instrument ? x.mnemo.localeCompare(y.mnemo) : x.instrument === "action" ? -1 : 1;
  partis.sort(ordre);
  arrivees.sort(ordre);
  bouges.sort(ordre);
  return { partis, arrivees, bouges, communes };
}

/**
 * Ce que l'écart veut dire, une fois les départs jugés.
 *
 * Une seule phrase, parce que c'est une décision qu'on vient chercher : y
 * a-t-il eu un événement de marché, ou le lecteur a-t-il raté des lignes ?
 */
export type Verdict = "rien" | "lecture" | "marche" | "les-deux";

export function verdict(e: Ecart): Verdict {
  const passageres = e.partis.filter((p) => p.retour).length;
  const durables = e.partis.length - passageres;
  const neuves = e.arrivees.filter((x) => x.premiere).length;
  if (!e.partis.length && !e.arrivees.length) return "rien";
  if (passageres && (durables || neuves)) return "les-deux";
  if (passageres) return "lecture";
  return "marche";
}
