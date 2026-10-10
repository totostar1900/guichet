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
  /**
   * L'expression de l'ordonnanceur, recopiée de `vercel.json`.
   *
   * Elle vit ici pour que la page Santé puisse dire la cadence et le prochain
   * tour sans aller lire un fichier de configuration à l'exécution. Un cliquet
   * tient les deux listes identiques au caractère : une expression qui
   * dériverait ferait annoncer une heure à laquelle plus rien ne part, ce qui
   * est pire que de ne rien annoncer.
   */
  cron: string;
}

/**
 * Un tour manqué, et non un tour en retard : chaque seuil vaut à peu près deux
 * passages. Les robots de jours ouvrés tolèrent le week-end, celui du mois
 * tolère le mois.
 */
export const ROBOTS: Robot[] = [
  { cle: "coupons", quoi: "Rappels de coupon à J-3 et le jour même", heures: 48, cron: "0 7 * * *" },
  { cle: "boc", quoi: "Lecture du bulletin de la BVMAC", heures: 96, cron: "30 18 * * 1-5" },
  { cle: "emetteurs", quoi: "Rafraîchissement des émetteurs", heures: 24 * 15, cron: "0 6 * * 1" },
  { cle: "suivi", quoi: "Alerte des lignes suivies", heures: 48, cron: "15 7 * * *" },
  { cle: "point", quoi: "Synthèse du matin au desk", heures: 96, cron: "30 6 * * 1-5" },
  { cle: "actualites", quoi: "Collecte des actualités", heures: 48, cron: "0 4 * * *" },
  { cle: "actualites-hebdo", quoi: "Revue hebdomadaire", heures: 24 * 15, cron: "0 16 * * 5" },
  { cle: "note-indice", quoi: "Note mensuelle de l'indice", heures: 24 * 62, cron: "40 6 3 * *" },
  { cle: "note-trimestre", quoi: "Note trimestrielle", heures: 24 * 185, cron: "0 7 5 1,4,7,10 *" },
  { cle: "epargne", quoi: "Préavis et exécution des instructions permanentes", heures: 48, cron: "0 8 * * *" },
  { cle: "beac", quoi: "Collecte des adjudications BEAC", heures: 48, cron: "0 9 * * *" },
  { cle: "beac-courbe", quoi: "Courbe mensuelle de la BEAC", heures: 24 * 62, cron: "0 5 3 * *" },
  /* Soixante-deux heures de tolérance comme les autres mensuels : un tour
     manqué se voit, et celui-ci tient une promesse écrite à l'article 8 de la
     convention, pas un simple réglage. */
  { cle: "purge-gestes", quoi: "Résumé puis purge du registre des gestes", heures: 24 * 62, cron: "0 3 2 * *" },
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

/* ─────────────── Ce que l'expression de l'ordonnanceur dit ───────────────
 *
 * La page Santé disait depuis quand un robot se taisait, et pas à quel moment
 * il était censé parler. Les deux manquaient ensemble : « muet depuis 30
 * heures » ne se juge pas sans savoir qu'il passe tous les matins, et un desk
 * qui attend un tour ne savait pas s'il fallait attendre dix minutes ou deux
 * semaines.
 *
 * TOUT EST EN UTC, parce que l'ordonnanceur de Vercel l'est et que la colonne
 * « Dernier tour » l'est déjà. Yaoundé est à UTC+1 : la page le dit une fois,
 * en tête du tableau, plutôt que de mélanger deux fuseaux dans une même ligne.
 */

/** Le plan d'un robot : une heure unique, et les jours qui la portent. */
export interface Plan {
  minute: number;
  heure: number;
  /** Les jours du mois retenus, ou rien pour « tous ». */
  jours?: number[];
  /** Les mois retenus, de 1 à 12, ou rien pour « tous ». */
  mois?: number[];
  /** Les jours de semaine retenus, dimanche = 0, ou rien pour « tous ». */
  semaine?: number[];
}

/** Un champ de l'expression : « * », « 5 », « 1-5 » ou « 1,4,7,10 ». */
const champ = (s: string, min: number, max: number): number[] | undefined => {
  if (s === "*") return undefined;
  const out: number[] = [];
  for (const part of s.split(",")) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!m) throw new Error(`champ cron non géré : « ${s} »`);
    const a = Number(m[1]);
    const b = m[2] == null ? a : Number(m[2]);
    if (a < min || b > max || b < a) throw new Error(`champ cron hors bornes : « ${s} »`);
    for (let v = a; v <= b; v++) out.push(v);
  }
  return out;
};

/**
 * L'expression, lue. Cinq champs, et une seule heure de départ : c'est tout ce
 * que l'ordonnanceur de Vercel accepte, et toute autre forme lève plutôt que
 * de s'afficher de travers.
 */
export function lirePlan(cron: string): Plan {
  const f = cron.trim().split(/\s+/);
  if (f.length !== 5) throw new Error(`expression cron à ${f.length} champs : « ${cron} »`);
  const minute = champ(f[0], 0, 59);
  const heure = champ(f[1], 0, 23);
  if (minute?.length !== 1 || heure?.length !== 1) throw new Error(`une heure de départ unique est attendue : « ${cron} »`);
  // Cron accepte 7 pour dimanche autant que 0 : les deux doivent se ranger ensemble.
  const semaine = champ(f[4], 0, 7)?.map((j) => j % 7);
  return { minute: minute[0], heure: heure[0], jours: champ(f[2], 1, 31), mois: champ(f[3], 1, 12), semaine };
}

/**
 * Ce jour-là porte-t-il un tour ?
 *
 * Quand le jour du mois ET le jour de semaine sont tous deux restreints, cron
 * fait un OU, et non un ET. Aucun de nos robots n'est dans ce cas, et c'est
 * justement pourquoi la règle est écrite ici : le jour où l'un y entrera,
 * personne ne la redécouvrira à ses dépens.
 */
const jourRetenu = (p: Plan, d: Date): boolean => {
  if (p.mois && !p.mois.includes(d.getUTCMonth() + 1)) return false;
  const parJour = p.jours ? p.jours.includes(d.getUTCDate()) : null;
  const parSemaine = p.semaine ? p.semaine.includes(d.getUTCDay()) : null;
  if (parJour == null) return parSemaine ?? true;
  if (parSemaine == null) return parJour;
  return parJour || parSemaine;
};

/**
 * Le prochain départ après `now`, en UTC.
 *
 * On avance jour par jour : un robot trimestriel peut attendre trois mois, et
 * quatre cents jours couvrent le pire cas avec de la marge. L'heure du jour ne
 * compte qu'une fois le jour retenu, sinon le tour d'aujourd'hui déjà passé
 * serait annoncé comme à venir.
 */
export function prochainTour(cron: string, now: Date): Date {
  const p = lirePlan(cron);
  const minuit = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (let i = 0; i < 400; i++) {
    const jour = new Date(minuit + i * 86_400_000);
    if (!jourRetenu(p, jour)) continue;
    const t = new Date(Date.UTC(jour.getUTCFullYear(), jour.getUTCMonth(), jour.getUTCDate(), p.heure, p.minute));
    if (t.getTime() > now.getTime()) return t;
  }
  throw new Error(`aucun départ trouvé en 400 jours : « ${cron} »`);
}

/**
 * La cadence, en morceaux plutôt qu'en phrase.
 *
 * La phrase se compose dans la page, avec des clefs écrites en clair : une
 * phrase assemblée ici serait invisible au script qui cherche les traductions
 * manquantes, et c'est l'angle mort qui a déjà coûté deux passages.
 *
 * L'heure, elle, sort formatée. Elle suit la maison (« 18 h 30 », « 7 h »)
 * dans les deux langues, comme les pourcentages qui restent en fr-FR partout.
 */
export type Cadence =
  | { quand: "quotidien"; heure: string }
  | { quand: "ouvre"; heure: string }
  | { quand: "hebdo"; jour: number; heure: string }
  | { quand: "mensuel"; jourDuMois: number; heure: string }
  | { quand: "trimestriel"; jourDuMois: number; heure: string }
  | { quand: "autre"; heure: string };

const OUVRE = [1, 2, 3, 4, 5];
const TRIMESTRE = [1, 4, 7, 10];
const memes = (a: number[] | undefined, b: number[]): boolean => Boolean(a) && a!.length === b.length && b.every((v) => a!.includes(v));

export function cadence(cron: string): Cadence {
  const p = lirePlan(cron);
  // « 7 h » et non « 7 h 00 » : la minute ronde ne s'écrit pas.
  const heure = p.minute ? `${p.heure} h ${String(p.minute).padStart(2, "0")}` : `${p.heure} h`;
  const tousLesJours = !p.jours && !p.semaine && !p.mois;
  if (tousLesJours) return { quand: "quotidien", heure };
  if (!p.jours && !p.mois && memes(p.semaine, OUVRE)) return { quand: "ouvre", heure };
  if (!p.jours && !p.mois && p.semaine?.length === 1) return { quand: "hebdo", jour: p.semaine[0], heure };
  if (p.jours?.length === 1 && !p.semaine) {
    if (!p.mois) return { quand: "mensuel", jourDuMois: p.jours[0], heure };
    if (memes(p.mois, TRIMESTRE)) return { quand: "trimestriel", jourDuMois: p.jours[0], heure };
  }
  // Rien d'inventé : la page montrera l'expression telle quelle.
  return { quand: "autre", heure };
}
