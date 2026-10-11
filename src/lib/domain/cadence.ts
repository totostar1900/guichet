import type { ActionClient } from "./journal-client";

/**
 * LA CADENCE D'UN CLIENT : DOUZE BARRES, UN COMPTE, UN DERNIER GESTE.
 *
 * Les trois colonnes que la maquette du 10 octobre 2026 dessinait au
 * répertoire, et qui n'avaient pas été construites : « Cadence, 12 mois »,
 * « Actions 30 j », « Dernière action ». Relevé le 12 octobre : cent neuf
 * barres dessinées sur les sept planches, zéro construite.
 *
 * CE QU'ELLES APPORTENT, ET QU'AUCUN NOMBRE N'APPORTE. Un score dit où en est
 * un client ; douze barres disent dans quel SENS il va. « 56 sur 100 » ne
 * distingue pas celui qui monte de celui qui s'éteint, et c'est pourtant la
 * seule chose qui décide d'un appel. Posées à côté du score, elles se lisent
 * d'un coup d'œil, sans comparer deux chiffres de deux mois différents.
 *
 * Module pur : il reçoit des gestes et rend des nombres, donc un test
 * l'atteint sans monter de base.
 */

/** Combien de mois la cadence montre. Douze : une saison ne se juge pas sur six. */
export const MOIS_DE_CADENCE = 12;

/** La fenêtre du compte court, en jours. */
export const JOURS_DU_COMPTE = 30;

export interface Cadence {
  /** Un compte par mois, du plus ancien au plus récent, de longueur MOIS_DE_CADENCE. */
  mois: number[];
  /** Le plus haut des douze : l'échelle des barres, jamais un maximum global. */
  plafond: number;
  /** Les gestes des trente derniers jours. */
  recents: number;
  /** Combien des douze mois portent au moins un geste : la régularité. */
  moisActifs: number;
  /** Le dernier geste, s'il y en a un. */
  dernier?: { at: string; geste: string; jours: number };
}

/** Le premier jour du mois, décalé de n mois en arrière, en UTC. */
const moisDe = (d: Date, n = 0): string => {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - n, 1));
  return x.toISOString().slice(0, 7);
};

/**
 * La cadence d'un client, depuis ses gestes.
 *
 * L'ÉCHELLE EST CELLE DE LA LIGNE, PAS CELLE DU TABLEAU. Un plafond commun à
 * tous les clients écraserait les onze autres dès qu'un institutionnel passe
 * quatre cents gestes dans un mois : on ne lirait plus que sa colonne. Chaque
 * client est donc mis à sa propre échelle, et la colonne « Actions 30 j »
 * porte le niveau absolu que les barres ne disent pas. Les deux ensemble
 * disent la forme ET la taille ; l'une sans l'autre trompe.
 */
export function cadenceDe(gestes: ActionClient[], maintenant = new Date()): Cadence {
  const index = new Map<string, number>();
  for (let n = MOIS_DE_CADENCE - 1; n >= 0; n--) index.set(moisDe(maintenant, n), MOIS_DE_CADENCE - 1 - n);
  const mois = new Array<number>(MOIS_DE_CADENCE).fill(0);

  const limite = maintenant.getTime() - JOURS_DU_COMPTE * 86_400_000;
  let recents = 0;
  let dernier: ActionClient | undefined;

  for (const g of gestes) {
    const i = index.get(g.at.slice(0, 7));
    if (i !== undefined) mois[i] += 1;
    const t = new Date(g.at).getTime();
    if (Number.isFinite(t) && t >= limite) recents += 1;
    if (!dernier || g.at > dernier.at) dernier = g;
  }

  return {
    mois,
    plafond: Math.max(1, ...mois),
    recents,
    moisActifs: mois.filter((x) => x > 0).length,
    dernier: dernier
      ? {
          at: dernier.at,
          geste: dernier.geste,
          jours: Math.max(0, Math.floor((maintenant.getTime() - new Date(dernier.at).getTime()) / 86_400_000)),
        }
      : undefined,
  };
}

/**
 * La forme de la cadence, en une phrase.
 *
 * ELLE N'EST PAS UN ORNEMENT : c'est le seul contenu de la colonne pour qui
 * n'a pas les barres sous les yeux, et la maquette portait cette phrase sur
 * chaque série (« actions par mois sur douze mois : faible au début, forte en
 * juin et septembre, en baisse en octobre »). Sans elle, douze barres sont un
 * dessin muet pour un lecteur d'écran.
 *
 * On la calcule plutôt que de l'écrire : comparer le dernier tiers au premier
 * donne le sens, et le compte des mois actifs donne la régularité.
 */
export function formeDeLaCadence(c: Cadence): string {
  const total = c.mois.reduce((a, b) => a + b, 0);
  if (total === 0) return "aucun geste sur douze mois";
  const t = Math.floor(MOIS_DE_CADENCE / 3);
  const debut = c.mois.slice(0, t).reduce((a, b) => a + b, 0);
  const fin = c.mois.slice(-t).reduce((a, b) => a + b, 0);
  /* UN SEUL COUP N'EST PAS UNE TENDANCE. Neuf gestes dans un seul mois, posé
     dans le dernier tiers, sortaient « en hausse » : la phrase promettait un
     mouvement là où il n'y a qu'un épisode. Vu à l'écran sur le jeu d'essai,
     pas déduit. Deux mois actifs au plus se nomment pour ce qu'ils sont. */
  if (c.moisActifs <= 2) return `${total} geste(s) sur douze mois, d'un seul coup sur ${c.moisActifs} mois`;
  /* Le sens se juge sur un écart net : à moins d'un quart, c'est stable, et
     annoncer une hausse sur trois gestes de plus serait un faux signal. */
  const sens = fin > debut * 1.25 ? "en hausse" : debut > fin * 1.25 ? "en baisse" : "stable";
  const regularite = c.moisActifs >= MOIS_DE_CADENCE - 1 ? "tous les mois" : c.moisActifs >= MOIS_DE_CADENCE / 2 ? `${c.moisActifs} mois sur douze` : `seulement ${c.moisActifs} mois sur douze`;
  return `${total} geste(s) sur douze mois, ${regularite}, ${sens}`;
}
