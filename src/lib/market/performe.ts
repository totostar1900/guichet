import { repo } from "@/lib/data";
import type { Quote } from "@/lib/domain/market";

/**
 * CE QUI A PERFORMÉ SUR TROIS MOIS, EN DEUX LECTURES BORNÉES (3 novembre 2026).
 *
 * DEMANDÉ : « "ce qui performe" sur les 3 derniers mois et non d'une séance à l'autre, avec un petit
 * graphe de performance dans la ligne. On veut toujours 2 à 3 lignes, quitte à afficher des lignes à 0 %. »
 *
 * ─── Pourquoi une lecture à part ───────────────────────────────────────────
 *
 * « indexPageData » répond déjà à cette question, et la page du marché s'en sert : elle lit deux mille
 * bulletins, les derniers cours, les sociétés, puis deux mille cotations PAR LIGNE cotée. C'est juste pour
 * une page où l'on vient étudier le marché ; c'est hors de prix sur la page d'arrivée, qui est la plus
 * visitée de la maison.
 *
 * Le classement sur trois mois et le petit graphe lisent donc la MÊME lecture : le dernier bulletin (la
 * date de fin), puis « actionQuotesSince », qui rend les cotations des actions depuis la borne en une seule
 * requête — une soixantaine de séances par action, jamais l'histoire ligne par ligne.
 *
 * ─── Ce que la fenêtre répare ──────────────────────────────────────────────
 *
 * Une action garde son cours dans 95 % des séances. D'une séance à l'autre, le classement était une colonne
 * de zéros ; sur trente jours il restait court. Sur TROIS MOIS, il a une forme, et le petit graphe la montre.
 *
 * ─── Ce que le classement refuse d'inventer ────────────────────────────────
 *
 * LES ACTIONS SEULES. Une obligation se cote en pourcentage du nominal et son mouvement dit l'état des
 * taux ; une action se cote en francs et son mouvement dit celui de la société.
 *
 * UNE LIGNE ENTRÉE À LA COTE PENDANT LA FENÊTRE n'a pas de cours de départ : sa variation part de sa
 * PREMIÈRE cotation, et la ligne le dit (« entree »). BGFI Holding est entrée le 26 août 2026 : lui prêter un
 * chiffre depuis le 3 août serait le plus gros du classement, et il serait inventé.
 *
 * CELLES QUI N'ONT PAS BOUGÉ Y SONT, À 0,0 % (3 novembre 2026). Elles en étaient écartées par un seuil
 * d'affichage ; mais « toujours deux à trois lignes » vaut mieux qu'un bloc qui se vide sur un marché calme,
 * et un cours inchangé depuis trois mois est lui-même une information. À égalité, l'ordre alphabétique du
 * mnémonique tranche.
 */

import { debutDeFenetre, JOURS_DE_GRACE, MOIS_FENETRE } from "@/lib/market/periodes";

/** La fenêtre et son début se définissent dans `periodes.ts`, partagé avec le graphe de la fiche : une seule définition de « trois mois ». */
export { debutDeFenetre, MOIS_FENETRE };

export interface Performance {
  isin: string;
  mnemo: string;
  nom: string;
  cours: number;
  variationPct: number;
  /** Les cours de clôture de la fenêtre, du plus ancien au plus récent : de quoi dessiner la ligne. */
  serie: number[];
  /** Le jour de la première cotation lue. */
  depuis: string;
  /** Vrai quand la ligne est entrée à la cote après le début de la fenêtre : sa variation part de `depuis`. */
  entree: boolean;
}

export interface Classement {
  jusquAu: string;
  /** La première séance de la fenêtre, celle qu'on écrit : la plus ancienne première cotation lue, pas la borne civile. */
  depuis: string;
  /** Toutes les actions lues, de la plus forte hausse à la plus forte baisse. */
  lignes: Performance[];
}

const jours = (de: string, a: string): number => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);

/**
 * Le classement, écrit une fois et testé sans base : il reçoit les cotations, jamais le dépôt.
 */
export function classerSurFenetre(cotations: Quote[], depuis: string): Performance[] {
  const parLigne = new Map<string, Quote[]>();
  for (const q of cotations) {
    if (q.instrument !== "action" || q.sessionDate < depuis || !q.close) continue;
    parLigne.set(q.isin, [...(parLigne.get(q.isin) ?? []), q]);
  }
  const out: Performance[] = [];
  for (const lot of parLigne.values()) {
    const l = [...lot].sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
    const premier = l[0];
    const dernier = l[l.length - 1];
    /* UNE SEULE COTATION NE FAIT PAS UNE PERFORMANCE : il faut deux bornes. */
    if (l.length < 2 || !premier.close || !dernier.close) continue;
    out.push({
      isin: dernier.isin,
      mnemo: dernier.mnemo,
      nom: dernier.designation || dernier.mnemo,
      cours: dernier.close,
      variationPct: ((dernier.close - premier.close) / premier.close) * 100,
      serie: l.map((q) => q.close as number),
      depuis: premier.sessionDate,
      entree: jours(depuis, premier.sessionDate) > JOURS_DE_GRACE,
    });
  }
  return out.sort((a, b) => b.variationPct - a.variationPct || a.mnemo.localeCompare(b.mnemo, "fr"));
}

/** LA SEULE LECTURE DU FICHIER : le dernier bulletin (la date de fin), puis les cotations des actions depuis la borne, en une requête. Le classement et les fenêtres de six mois à deux ans la partagent. */
async function lire(mois: number): Promise<{ jusquAu: string; depuis: string; cotations: Quote[] } | undefined> {
  const r = repo();
  const [dernier] = await r.listBulletins(1).catch(() => []);
  if (!dernier) return undefined;
  const jusquAu = dernier.sessionDate;
  const depuis = debutDeFenetre(jusquAu, mois);
  return { jusquAu, depuis, cotations: await r.actionQuotesSince(depuis).catch(() => []) };
}

export async function performanceSur(mois = MOIS_FENETRE): Promise<Classement | undefined> {
  const lu = await lire(mois);
  if (!lu) return undefined;
  const lignes = classerSurFenetre(lu.cotations, lu.depuis);
  if (!lignes.length) return undefined;
  return { jusquAu: lu.jusquAu, depuis: lignes.reduce((m, l) => (l.depuis < m ? l.depuis : m), lignes[0].depuis), lignes };
}

/* ------------------------------------------------------------------ *
 * LA VARIATION D'UNE ACTION SUR SIX MOIS, DOUZE MOIS ET DEUX ANS (9 novembre 2026)
 * ------------------------------------------------------------------ */

/** Une fenêtre de la variation : le pourcentage, ou rien quand la ligne n'est pas à la cote depuis assez longtemps (`depuis` dit alors son entrée). */
export interface FenetreDuCours {
  pct: number | null;
  depuis?: string;
}
export interface FenetresDuCours {
  mois6: FenetreDuCours;
  mois12: FenetreDuCours;
  ans2: FenetreDuCours;
}
export const MOIS_DES_FENETRES = [6, 12, 24] as const;

/**
 * Les trois fenêtres de chaque action, depuis UNE lecture des cotations (la plus longue) : jamais ligne par ligne.
 *
 * UNE LIGNE ENTRÉE À LA COTE PENDANT LA FENÊTRE n'a pas de cours de départ : son pourcentage est vide, et `depuis` dit son entrée. Lui prêter un chiffre « depuis six mois » serait l'inventer (même règle que
 * le classement ci-dessus). Écrit sans base : il reçoit les cotations.
 */
export function fenetresDesCours(cotations: Quote[], jusquAu: string): Record<string, FenetresDuCours> {
  const out: Record<string, FenetresDuCours> = {};
  const clefs = ["mois6", "mois12", "ans2"] as const;
  MOIS_DES_FENETRES.forEach((mois, i) => {
    const depuis = debutDeFenetre(jusquAu, mois);
    for (const l of classerSurFenetre(cotations, depuis)) {
      const f: FenetreDuCours = l.entree ? { pct: null, depuis: l.depuis } : { pct: l.variationPct };
      const cur = out[l.isin] ?? { mois6: { pct: null }, mois12: { pct: null }, ans2: { pct: null } };
      cur[clefs[i]] = f;
      out[l.isin] = cur;
    }
  });
  return out;
}

export async function fenetresDeLaCote(): Promise<Record<string, FenetresDuCours>> {
  const lu = await lire(MOIS_DES_FENETRES[MOIS_DES_FENETRES.length - 1]);
  return lu ? fenetresDesCours(lu.cotations, lu.jusquAu) : {};
}
