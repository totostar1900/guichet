import { moisDuTitre, paysDuTitre } from "./courbe-beac";

/**
 * LA PAGE DES COURBES DE LA BEAC, LUE POUR SAVOIR CE QU'ELLE PUBLIE.
 *
 * Elle publie une feuille par Trésor et par mois (Cameroun, Congo, Gabon, et le
 * Tchad en 2016-2017), plus une feuille de zone « CEMAC » qui porte les trois
 * courbes à la fois. Elle n'a jamais publié de courbe pour la Centrafrique ni pour
 * la Guinée équatoriale : relevé le 2 novembre 2026 sur 272 feuilles, zéro.
 *
 * Ce module ne fait que lire une page et décider quoi ramasser ; le réseau, la
 * lecture des PDF et l'écriture sont dans `scripts/ramasser-courbes-beac.mjs`.
 */
export interface FeuillePubliee {
  /** Le Trésor que la feuille nomme, ou « CEMAC » pour la feuille de zone. */
  pays: string;
  titre: string;
  url: string;
  /** AAAA-MM, tiré du titre ; absent quand le titre ne dit pas le mois. */
  mois?: string;
}

const LIEN = /<a\b[^>]*href="([^"]+\.(?:pdf|xlsx?)[^"]*)"[^>]*>([^<]*)/gi;

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .trim();

/** Les feuilles de courbes que la page propose, une par lien — et rien d'autre (une note méthodologique n'est pas une courbe). */
export function feuillesDeLaPage(html: string): FeuillePubliee[] {
  const vues = new Set<string>();
  const out: FeuillePubliee[] = [];
  for (const m of html.matchAll(LIEN)) {
    const url = decode(m[1]);
    const titre = decode(m[2]);
    const haystack = `${url} ${titre}`.toLowerCase();
    if (!/rendement|taux-de|courbe/.test(haystack) || /m[ée]thodolog/.test(haystack)) continue;
    const pays = paysDuTitre(`${titre} ${url}`);
    if (!pays || vues.has(url)) continue;
    vues.add(url);
    out.push({ pays, titre, url, mois: moisDuTitre(titre) ?? moisDuTitre(decodeURIComponent(url.split("/").pop() ?? "")) });
  }
  return out;
}

/** La clef d'un couple (Trésor, mois), la même côté page et côté base. */
export const cleDeFeuille = (pays: string, mois: string) => `${pays}|${mois}`;

export interface PlanDuRamassage {
  /** Les feuilles de pays dont le mois n'est pas encore en base : à lire. */
  aLire: FeuillePubliee[];
  /** Déjà en base : on n'y touche pas, une lecture plus riche d'hier vaut mieux qu'une plus pauvre d'aujourd'hui. */
  dejaEnBase: FeuillePubliee[];
  /** Les feuilles de zone, comptées et laissées : un Trésor y figure aussi sur sa propre feuille. */
  deZone: FeuillePubliee[];
  /** Le titre ne dit pas le mois : on les montre, on ne les devine pas. */
  sansMois: FeuillePubliee[];
}

/**
 * Ce qu'il faut ramasser : les feuilles de pays dont le couple (Trésor, mois) n'est pas en base.
 * `enBase` : les clefs `pays|AAAA-MM` déjà écrites. Jamais d'écrasement.
 */
export function planDuRamassage(publiees: FeuillePubliee[], enBase: Set<string>): PlanDuRamassage {
  const plan: PlanDuRamassage = { aLire: [], dejaEnBase: [], deZone: [], sansMois: [] };
  for (const f of publiees) {
    if (f.pays === "CEMAC") plan.deZone.push(f);
    else if (!f.mois) plan.sansMois.push(f);
    else if (enBase.has(cleDeFeuille(f.pays, f.mois))) plan.dejaEnBase.push(f);
    else plan.aLire.push(f);
  }
  return plan;
}
