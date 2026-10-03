/**
 * Les robots, leur cadence, et ce que leur silence veut dire.
 *
 * Un robot qui n'a rien à faire ne laissait aucune trace, et c'est la panne la
 * plus confortable : son silence ressemble exactement à son silence ordinaire.
 * Le 3 octobre 2026, pour dire si le robot de l'épargne avait tourné le matin
 * même, il a fallu prouver que l'ordonnanceur marchait par un AUTRE robot.
 *
 * CE QUI COMPTE EST L'ABSENCE. Une ligne de tour ne dit rien d'intéressant ;
 * une ligne qui manque depuis plus longtemps que la cadence du robot est le
 * signal. D'où ce tableau : chaque robot déclare au bout de combien d'heures
 * son silence devient anormal.
 *
 * LA TOLÉRANCE EST LARGE, et c'est voulu. Un robot quotidien attendu à 8 h et
 * signalé à 8 h 05 crierait tous les matins pour un ordonnanceur qui prend cinq
 * minutes, et une alerte qui crie tous les matins ne se lit plus. On signale
 * quand un TOUR ENTIER a été manqué, pas quand il est en retard.
 *
 * Module sans dépendance d'exécution : il se lit du serveur comme du
 * navigateur, et un test l'atteint sans monter de base.
 */

export interface Robot {
  /** La clef : le dernier segment du chemin, et la valeur écrite en base. */
  cle: string;
  /** Ce qu'il fait, en une ligne, pour la page Santé. */
  quoi: string;
  /** Au-delà, son silence est anormal. */
  heures: number;
}

/**
 * Un tour manqué, et non un tour en retard : chaque seuil vaut à peu près deux
 * passages. Les robots de jours ouvrés tolèrent le week-end, celui du mois
 * tolère le mois.
 */
export const ROBOTS: Robot[] = [
  { cle: "coupons", quoi: "Rappels de coupon à J-3 et le jour même", heures: 48 },
  { cle: "boc", quoi: "Lecture du bulletin de la BVMAC", heures: 96 },
  { cle: "emetteurs", quoi: "Rafraîchissement des émetteurs", heures: 24 * 15 },
  { cle: "suivi", quoi: "Alerte des lignes suivies", heures: 48 },
  { cle: "point", quoi: "Synthèse du matin au desk", heures: 96 },
  { cle: "actualites", quoi: "Collecte des actualités", heures: 48 },
  { cle: "actualites-hebdo", quoi: "Revue hebdomadaire", heures: 24 * 15 },
  { cle: "note-indice", quoi: "Note mensuelle de l'indice", heures: 24 * 62 },
  { cle: "note-trimestre", quoi: "Note trimestrielle", heures: 24 * 185 },
  { cle: "epargne", quoi: "Préavis et exécution des instructions permanentes", heures: 48 },
  { cle: "beac", quoi: "Collecte des adjudications BEAC", heures: 48 },
  { cle: "beac-courbe", quoi: "Courbe mensuelle de la BEAC", heures: 24 * 62 },
];

export interface TourVu {
  robot: string;
  /**
   * Qui a lancé le tour : « cron » pour l'ordonnanceur, « main » pour un humain.
   *
   * Seul un tour de l'ordonnanceur prouve que l'ordonnanceur vit, et c'est la
   * seule chose que ce registre sert à voir. Un tour à la main s'inscrit et se
   * montre, mais il n'éteint aucune alarme : sans cela, le premier qui lance un
   * robot pour vérifier qu'il marche ferait taire la page pour une cadence
   * entière.
   */
  par?: "cron" | "main";
  startedAt: string;
  finishedAt?: string;
  ok?: boolean;
  detail?: unknown;
  error?: string;
}

export type EtatRobot = "muet" | "echoue" | "va";

export interface RobotVu extends Robot {
  dernier?: TourVu;
  /** Les heures écoulées depuis le dernier tour, ou rien s'il n'a jamais tourné. */
  depuis?: number;
  etat: EtatRobot;
}

/**
 * L'état de chaque robot, le plus inquiétant d'abord.
 *
 * `muet` : aucun tour, ou le dernier est plus vieux que sa cadence. C'est le
 * cas que cette table existe pour voir, et il ne se distingue d'un robot en
 * bonne santé par aucun autre signe.
 *
 * `echoue` : il a tourné et il a levé. Ce n'est pas la même panne et elle ne se
 * répare pas pareil : l'un demande de regarder l'ordonnanceur, l'autre le code.
 */
export function etatDesRobots(tours: TourVu[], now = new Date()): RobotVu[] {
  /* Le dernier tour tout court, pour le montrer ; et le dernier tour DE
     L'ORDONNANCEUR, qui est le seul à prouver quelque chose. */
  const dernierPar = new Map<string, TourVu>();
  const dernierCron = new Map<string, TourVu>();
  for (const t of tours) {
    const vu = dernierPar.get(t.robot);
    if (!vu || t.startedAt > vu.startedAt) dernierPar.set(t.robot, t);
    if (t.par === "main") continue;
    const vc = dernierCron.get(t.robot);
    if (!vc || t.startedAt > vc.startedAt) dernierCron.set(t.robot, t);
  }
  const rang: Record<EtatRobot, number> = { muet: 0, echoue: 1, va: 2 };
  return ROBOTS.map((r) => {
    const dernier = dernierPar.get(r.cle);
    const planifie = dernierCron.get(r.cle);
    const depuis = planifie ? (now.getTime() - new Date(planifie.startedAt).getTime()) / 3_600_000 : undefined;
    const etat: EtatRobot = depuis == null || depuis > r.heures ? "muet" : planifie?.ok === false ? "echoue" : "va";
    return { ...r, dernier, depuis, etat };
  }).sort((a, b) => rang[a.etat] - rang[b.etat] || (b.depuis ?? Infinity) - (a.depuis ?? Infinity));
}

/** Ce qui appelle quelqu'un : les muets et les échoués. */
export const robotsAVoir = (vus: RobotVu[]): RobotVu[] => vus.filter((r) => r.etat !== "va");
