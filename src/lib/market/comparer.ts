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

/**
 * JUGER LES DÉPARTS ET LES ARRIVÉES PAR LA SUITE DE LA SÉRIE.
 *
 * `comparer` rend l'écart sans le juger, parce que le verdict demande de lire
 * la série entière de chaque ligne. Ce jugement vivait écrit à la main dans le
 * rapport d'une séance ; le comparateur en avait besoin mot pour mot, et deux
 * copies d'une même règle finissent toujours par diverger.
 *
 * LA LECTURE PASSE PAR UN PARAMÈTRE, donc le module reste pur et se teste sans
 * base : l'appelant donne de quoi obtenir la série d'une ligne, et seul lui
 * sait d'où elle vient.
 *
 * `fin` est la séance la plus tardive du couple. Une ligne absente là-bas mais
 * cotée après n'est jamais sortie de la cote ; une ligne apparue là-bas mais
 * déjà cotée avant n'est pas une première cotation, c'est un retour.
 */
export async function juger(e: Ecart, fin: string, suite: (isin: string) => Promise<{ sessionDate: string }[]>): Promise<void> {
  await Promise.all([
    ...e.partis.map(async (x) => {
      const s = await suite(x.isin);
      const apres = s.filter((z) => z.sessionDate > fin).sort((z, y) => z.sessionDate.localeCompare(y.sessionDate))[0];
      if (apres) x.retour = apres.sessionDate;
    }),
    ...e.arrivees.map(async (x) => {
      const s = await suite(x.isin);
      x.premiere = !s.some((z) => z.sessionDate < fin);
    }),
  ]);
}

/* ---------------- Où regarder ---------------- */

export interface Couple {
  avant: string;
  apres: string;
  actions: number;
  obligations: number;
  opcvm: number;
  /** La somme des baisses, qui sert à classer : une perte de douze passe devant une perte d'une. */
  perte: number;
}

interface Compte {
  sessionDate: string;
  counts?: { equities: number; bonds: number; funds: number };
}

/**
 * LES COUPLES OÙ LE COMPTE BAISSE, et pourquoi c'est la bonne porte d'entrée.
 *
 * Comparer deux cotes au hasard ne sert à rien : encore faut-il savoir OÙ
 * regarder. Les comptes de chaque séance sont déjà en main quand la page
 * s'affiche, donc cette liste ne coûte aucune lecture de plus : elle désigne
 * les couples, et la comparaison ligne à ligne dit ensuite ce qui s'est
 * réellement passé.
 *
 * ELLE DÉSIGNE, ELLE NE CONCLUT PAS. Un compte stable peut cacher une ligne
 * partie contre une ligne arrivée, et seule l'ouverture du couple le montre.
 * C'est un filet à gros trous posé sur huit cents séances, pas un verdict.
 *
 * LES SÉANCES VIDES SONT ÉCARTÉES : une séance dont rien n'a été lu tombe à
 * zéro puis remonte, ce qui produirait deux couples par échec et noierait la
 * liste. Cet échec-là porte déjà son état et son code dans le tableau.
 */
export function couplesSuspects(bulletins: Compte[]): Couple[] {
  const ordre = [...bulletins].sort((x, y) => x.sessionDate.localeCompare(y.sessionDate));
  const out: Couple[] = [];
  for (let i = 1; i < ordre.length; i++) {
    const a = ordre[i - 1].counts;
    const b = ordre[i].counts;
    if (!a || !b) continue;
    if (a.equities + a.bonds + a.funds === 0 || b.equities + b.bonds + b.funds === 0) continue;
    const actions = b.equities - a.equities;
    const obligations = b.bonds - a.bonds;
    const opcvm = b.funds - a.funds;
    const perte = [actions, obligations, opcvm].reduce((s, d) => s + (d < 0 ? -d : 0), 0);
    if (perte > 0) out.push({ avant: ordre[i - 1].sessionDate, apres: ordre[i].sessionDate, actions, obligations, opcvm, perte });
  }
  return out.sort((x, y) => y.apres.localeCompare(x.apres));
}
