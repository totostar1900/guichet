import type { ActionClient } from "@/lib/domain/journal-client";
import { semisDense } from "./reference";

/**
 * DES GESTES DE CLIENTS DANS LE JEU D'ESSAI, et il n'y en avait aucun.
 *
 * Le registre des gestes est né le 10 octobre 2026 avec sa table vide côté
 * démonstration : la colonne de cadence du répertoire, les compteurs par
 * genre de la fiche et l'écran « Votre activité » du client étaient donc
 * exerçables en production seulement. C'est la deuxième fois dans la même
 * semaine qu'un écran neuf arrive sans donnée d'essai, après la séance de
 * bulletin en difficulté.
 *
 * SIX FORMES DE CADENCE, pas six clients au hasard : la colonne ne sert à rien
 * si toutes les lignes se ressemblent, et c'est justement ce qu'elle doit
 * distinguer d'un coup d'œil.
 *
 *   régulier     douze mois servis, à peu près également
 *   en hausse    rien au début, de plus en plus ensuite
 *   en baisse    fort au début, éteint depuis quatre mois
 *   d'un coup    tout en un seul mois, rien autour
 *   endormi      quelques visites il y a un an, rien depuis
 *   consultant   beaucoup de consultations, presque aucun ordre
 */

/** Un mois en arrière depuis le mois courant, au quinze, en UTC. */
const leQuinze = (ilYAMois: number, jour = 15): string => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - ilYAMois, jour, 10, 0, 0)).toISOString();
};

/** Un geste du catalogue, genre « consultation ». */
const CONSULTATION = "vu.fiche";

/** n gestes dans le mois, étalés sur des jours différents pour rester crédibles. */
const dansLeMois = (userId: string, ilYAMois: number, n: number, geste: string, genre: ActionClient["genre"]): ActionClient[] =>
  [...Array(n)].map((_, i) => ({
    id: `g-${userId}-${ilYAMois}-${i}`,
    at: leQuinze(ilYAMois, 2 + ((i * 3) % 26)),
    userId,
    geste,
    genre,
    canal: "Guichet",
  }));

/* LE JEU DENSE S'ALLUME À LA DEMANDE, et pas dans le socle des suites.
   Versés dans le dépôt en mémoire nu, ces gestes ont cassé deux cliquets du
   registre qui comptaient leurs propres lignes : on ne déplace pas le socle
   d'une suite parce qu'on voulait un environnement d'essai plus fourni. La
   règle existait déjà pour la cote ; elle vaut ici mot pour mot. */
export const SEED_GESTES: ActionClient[] = !semisDense() ? [] : [
  /* Régulier : il agit tous les mois, sans pic. */
  ...[...Array(12)].flatMap((_, m) => dansLeMois("c-avc", m, m % 3 === 0 ? 3 : 2, "ordre.depose", "ordre")),

  /* En hausse : rien avant six mois, de plus en plus depuis. */
  ...[...Array(6)].flatMap((_, m) => dansLeMois("c-tontine", m, 6 - m, "mandat.signe", "especes")),

  /* En baisse : soutenu l'an dernier, éteint depuis quatre mois. C'est la
     forme qui doit sauter aux yeux, parce qu'elle appelle un geste du desk. */
  ...[...Array(5)].flatMap((_, i) => dansLeMois("c-mbaiki", i + 4, 5 - i, "ordre.signe", "ordre")),

  /* D'un coup : tout au même mois, rien autour. Un score moyen ne le
     distingue pas du régulier ; les barres, oui. */
  ...dansLeMois("c-se", 3, 9, "ordre.appetit", "ordre"),

  /* Endormi : quelques visites il y a onze mois, rien depuis. */
  ...dansLeMois("c-jpo", 11, 2, CONSULTATION, "consultation"),

  /* Consultant : il regarde beaucoup, il engage peu. */
  ...[...Array(12)].flatMap((_, m) => dansLeMois("c-am", m, 4, CONSULTATION, "consultation")),
  ...dansLeMois("c-am", 2, 1, "ordre.depose", "ordre"),
];
