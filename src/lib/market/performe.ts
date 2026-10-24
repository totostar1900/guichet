import { repo } from "@/lib/data";
import type { Quote } from "@/lib/domain/market";

/**
 * CE QUI A PERFORMÉ SUR UNE FENÊTRE, EN TROIS LECTURES BORNÉES.
 *
 * ─── Pourquoi une lecture à part ───────────────────────────────────────────
 *
 * « indexPageData » répond déjà à cette question, et la page du marché s'en
 * sert : elle lit deux mille bulletins, les derniers cours, les sociétés,
 * puis deux mille cotations PAR LIGNE cotée. Une dizaine de requêtes, dont
 * sept non bornées. C'est juste pour une page où l'on vient étudier le
 * marché ; c'est hors de prix sur la page d'arrivée, qui est la plus visitée
 * de la maison et qui en fait déjà huit pour le dossier du client.
 *
 * Un classement sur trente jours ne demande pourtant que DEUX COURS par
 * ligne : celui d'aujourd'hui et celui d'il y a trente jours. Et « quotesOn »
 * rend toutes les lignes d'une séance en une requête. D'où trois lectures,
 * toutes bornées : le calendrier récent des séances, puis les deux bornes.
 *
 * ─── Ce que la fenêtre répare ──────────────────────────────────────────────
 *
 * Relevé dans « IndexPulse » et dans la page du marché : l'indice bouge sur
 * 70 des 271 séances lues, et une action garde son cours dans 95 % d'entre
 * elles. Un classement du JOUR serait donc une colonne de zéros trois jours
 * sur quatre, et « les plus fortes baisses » resterait vide. La fenêtre est
 * déclarée, et c'est elle qui rend le classement lisible.
 *
 * ─── Deux restrictions, et elles sont dans la donnée ───────────────────────
 *
 * LES ACTIONS SEULES. Une obligation se cote en pourcentage du nominal et son
 * mouvement dit l'état des taux ; une action se cote en francs et son
 * mouvement dit celui de la société. Les ranger dans un même classement
 * reviendrait à comparer deux grandeurs qui n'ont ni la même unité ni la même
 * cause.
 *
 * CELLES QUI N'ONT PAS BOUGÉ N'Y SONT PAS. Une ligne à « 0,0 % » sur trente
 * jours n'a pas performé : l'inscrire dans un classement de performance
 * remplirait la liste de lignes immobiles, ce que la fenêtre venait
 * justement d'éviter. Le seuil est celui de l'affichage — une variation
 * arrondie à zéro à l'écran n'est pas un mouvement pour le lecteur.
 */

/** La fenêtre par défaut : trente jours, comme le dit la section. */
export const JOURS_FENETRE = 30;

/**
 * Le nombre de bulletins lus pour retrouver la séance de référence.
 *
 * La BVMAC cote environ cinq fois par semaine : quarante-cinq bulletins
 * couvrent largement trente jours, même avec des trous. C'est la seule des
 * trois lectures dont la borne est un pari, et elle se trompe du bon côté :
 * trop court, la fonction ne rend rien plutôt qu'une fenêtre fausse.
 */
const BULLETINS_LUS = 45;

/** En deçà, la variation s'affiche « 0,0 % » : ce n'est pas un mouvement pour le lecteur. */
const SEUIL = 0.05;

export interface Performance {
  isin: string;
  mnemo: string;
  nom: string;
  /** Le cours de clôture à la borne récente, dans l'unité de la ligne. */
  cours: number;
  /** La variation entre les deux bornes, en pour-cent. */
  variationPct: number;
}

export interface Classement {
  /** La séance la plus récente lue, et celle qui sert de référence. */
  jusquAu: string;
  depuis: string;
  /** Les lignes qui ont bougé, de la plus forte hausse à la plus forte baisse. */
  lignes: Performance[];
}

/**
 * Le classement, à partir des deux bornes. Pur : c'est ici que tout se
 * décide, et c'est ici que les épreuves regardent.
 */
export function classer(fin: Quote[], debut: Quote[], seuil = SEUIL): Performance[] {
  /* UN SEUL FILTRE SUR L'INSTRUMENT, et il est plus bas. Il y en avait deux
     — ici et sur la borne récente — qui produisaient le même effet : aucune
     épreuve ne pouvait alors distinguer celui qui travaille de celui qui
     dort, et retirer l'un des deux ne cassait rien. */
  const avant = new Map(debut.map((q) => [q.isin, q]));
  const out: Performance[] = [];
  for (const q of fin) {
    if (q.instrument !== "action") continue;
    const d = avant.get(q.isin);
    /* UNE LIGNE ARRIVÉE APRÈS LA BORNE N'A PAS DE PERFORMANCE SUR LA FENÊTRE.
       BGFI Holding est entrée à la cote le 26 août 2026 : lui prêter une
       variation depuis une séance où elle n'était pas cotée donnerait un
       chiffre inventé. */
    if (!d || !d.close || !q.close) continue;
    const variationPct = ((q.close - d.close) / d.close) * 100;
    if (Math.abs(variationPct) < seuil) continue;
    out.push({ isin: q.isin, mnemo: q.mnemo, nom: q.designation || q.mnemo, cours: q.close, variationPct });
  }
  return out.sort((a, b) => b.variationPct - a.variationPct || a.mnemo.localeCompare(b.mnemo, "fr"));
}

/**
 * Les trois lectures, puis le classement.
 *
 * Rend « undefined » quand l'histoire lue ne couvre pas la fenêtre : mieux
 * vaut pas de section qu'une fenêtre plus courte que son titre.
 *
 * LA FENÊTRE S'ANCRE SUR LA DERNIÈRE SÉANCE, PAS SUR L'HORLOGE. Si la place
 * n'a rien publié depuis une semaine — vacances, panne de collecte, jours
 * fériés nationaux — compter trente jours depuis aujourd'hui donnerait une
 * fenêtre de vingt-trois séances sous un titre qui en annonce trente. Les
 * deux bornes sont deux séances réelles, et la section dit lesquelles.
 */
export async function performanceSur(jours = JOURS_FENETRE): Promise<Classement | undefined> {
  const r = repo();
  const bulletins = await r.listBulletins(BULLETINS_LUS).catch(() => []);
  if (bulletins.length < 2) return undefined;
  /* « listBulletins » rend du plus récent au plus ancien. */
  const jusquAu = bulletins[0].sessionDate;
  const limite = new Date(new Date(`${jusquAu}T12:00:00Z`).getTime() - jours * 86_400_000).toISOString().slice(0, 10);
  const reference = bulletins.find((b) => b.sessionDate <= limite);
  if (!reference) return undefined;
  const [fin, debut] = await Promise.all([r.quotesOn(jusquAu).catch(() => []), r.quotesOn(reference.sessionDate).catch(() => [])]);
  const lignes = classer(fin, debut);
  if (!lignes.length) return undefined;
  return { jusquAu, depuis: reference.sessionDate, lignes };
}
