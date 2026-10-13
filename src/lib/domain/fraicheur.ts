/**
 * LA FRAÎCHEUR D'UNE SÉRIE, QUI N'EST PAS LA SANTÉ DE SON ROBOT.
 *
 * POURQUOI CE MODULE EXISTE. Les robots disent « j'ai tourné » et la page
 * Santé le montre déjà, cadence comprise. Aucun ne dit « la donnée est
 * arrivée ». Ce sont deux pannes différentes, et c'est la seconde qui a
 * coûté le 13 octobre 2026 : le volume échangé des obligations était écrit
 * EN DUR à zéro sur 18 576 rangées depuis trois ans et demi, tous les robots
 * au vert, et j'en ai conclu que le marché obligataire n'échangeait jamais.
 * Le lecteur lisait le champ, l'écrivain ne le portait pas.
 *
 * Le robot répond « ai-je tourné ». La série répond « ai-je reçu ».
 *
 * DEUX NATURES DE SÉRIE, ET LES CONFONDRE REND LE GARDE INUTILE.
 *
 * Une série CADENCÉE reçoit à chaque tour : l'encours de la dette arrive avec
 * le bulletin de chaque séance. Son silence est une panne.
 *
 * Une série ÉVÉNEMENTIELLE ne reçoit que si la source a du neuf : le journal
 * BEAC n'écrit que ce qui change, donc une semaine calme écrit zéro ligne, et
 * un seuil posé là crierait au loup chaque semaine. Une alerte qui crie
 * toutes les semaines ne se lit plus, c'est la leçon des robots.
 *
 * MAIS SON SILENCE RESTE UN FAIT QUI SE DIT. Le 13 octobre 2026, la page
 * d'annonces de la BEAC n'avait rien publié depuis le 22 septembre : trois
 * semaines sans une seule annonce sur les six pays. Vérifié à la source, ce
 * n'est pas une panne de lecture. Pour une société de bourse c'est une
 * information de premier ordre, et rien ne la montrait. Une série
 * événementielle silencieuse se signale donc, en nommant la source et non
 * nous : « la BEAC n'a rien publié depuis N jours » n'accuse pas le robot.
 *
 * CE QUE CE GARDE NE REGARDE PAS, écrit ici plutôt que découvert plus tard.
 * Il voit qu'une série ne reçoit plus. Il ne voit pas une série qui reçoit
 * des rangées fausses, ni une COLONNE constante dans une série vivante, qui
 * est précisément le défaut du volume obligataire. Ce second garde reste à
 * poser.
 *
 * Module sans dépendance d'exécution : il se lit du serveur comme du
 * navigateur, et un test l'atteint sans monter de base.
 */

export type Nature = "cadencee" | "evenementielle";

export interface Serie {
  /** La clef : elle nomme la série, et sert de clef de point dans Santé. */
  cle: string;
  /** Ce que la série porte, en une ligne. */
  quoi: string;
  /** Le robot qui l'alimente. C'est la comparaison des deux qui diagnostique. */
  robot: string;
  nature: Nature;
  /**
   * Au-delà, le silence se signale.
   *
   * Cadencée : c'est une panne. Événementielle : c'est un fait sur la source,
   * dit sans accuser personne.
   */
  heures: number;
  /** Qui publie, pour que la phrase d'une série événementielle nomme la bonne partie. */
  source: string;
}

/**
 * Les séries suivies, et pourquoi chaque seuil vaut ce qu'il vaut.
 *
 * Comme pour les robots, la tolérance est large : on signale un rendez-vous
 * entier manqué, jamais un retard.
 */
export const SERIES: Serie[] = [
  {
    cle: "serie-encours",
    quoi: "Encours des titres de dette",
    robot: "boc",
    nature: "cadencee",
    // Comme le robot du bulletin : quatre jours tolèrent un week-end et un férié.
    heures: 96,
    source: "BVMAC",
  },
  {
    cle: "serie-cotations",
    quoi: "Cotations de la cote",
    robot: "boc",
    nature: "cadencee",
    heures: 96,
    source: "BVMAC",
  },
  {
    cle: "serie-calendrier-beac",
    quoi: "Journal du calendrier BEAC",
    robot: "beac",
    nature: "evenementielle",
    /* Une adjudication s'annonce une semaine avant sa séance, et la place
       émet toutes les semaines ou presque. Quinze jours sans une ligne n'est
       donc pas une accalmie ordinaire : c'est à regarder. */
    heures: 24 * 15,
    source: "BEAC",
  },
  {
    cle: "serie-adjudications",
    quoi: "Résultats d'adjudication",
    robot: "beac",
    nature: "evenementielle",
    /* Les résultats suivent la séance de quelques jours, et six pays émettent.
       Trois semaines sans un seul résultat sur toute la zone est anormal. */
    heures: 24 * 21,
    source: "BEAC",
  },
  {
    cle: "serie-avis-emission",
    quoi: "Avis d'émission",
    robot: "boc",
    nature: "evenementielle",
    /* Un avis par émission nouvelle, et la cote en reçoit quelques-unes par
       trimestre. Deux mois de silence restent plausibles, au-delà on regarde. */
    heures: 24 * 60,
    source: "BVMAC",
  },
];

export type EtatSerie = "recoit" | "tarie" | "vide";

export interface SerieVue extends Serie {
  /** L'horodatage de la dernière écriture, en ISO, s'il y en a une. */
  dernier?: string;
  /** Depuis combien d'heures, pour juger le seuil. */
  depuis?: number;
  etat: EtatSerie;
  /** Son robot se tait-il aussi ? Alors la panne est en amont, et on le dit. */
  robotMuet: boolean;
  /** La phrase qui nomme la panne, ou le silence. Vide quand tout va. */
  diagnostic: string;
}

const jours = (heures: number) => Math.floor(heures / 24);

/**
 * L'état de chaque série, et la phrase qui va avec.
 *
 * `derniers` donne la dernière écriture par clef de série ; `robotsMuets`
 * donne les robots dont la page Santé dit déjà qu'ils se taisent. Les deux
 * viennent du serveur, ce module ne lit rien.
 */
export function etatDesSeries(
  derniers: Record<string, string | undefined>,
  robotsMuets: Set<string>,
  now = new Date(),
): SerieVue[] {
  const rang: Record<EtatSerie, number> = { vide: 0, tarie: 1, recoit: 2 };
  return SERIES.map((s): SerieVue => {
    const dernier = derniers[s.cle];
    const robotMuet = robotsMuets.has(s.robot);
    if (!dernier) {
      return { ...s, robotMuet, etat: "vide" as const, diagnostic: "la série n'a jamais rien reçu" };
    }
    const depuis = (now.getTime() - Date.parse(dernier)) / 3_600_000;
    if (depuis <= s.heures) return { ...s, dernier, depuis, robotMuet, etat: "recoit" as const, diagnostic: "" };

    /* LA PHRASE DÉSIGNE LE RESPONSABLE, et c'est tout son intérêt. Un robot
       muet se répare chez nous ; un robot qui tourne au-dessus d'une série
       tarie veut dire que l'écriture est cassée, pas l'horloge ; et une
       source événementielle muette n'est une panne de personne, c'est un
       fait de marché qu'il faut regarder. */
    const diagnostic = robotMuet
      ? `le robot « ${s.robot} » se tait aussi : c'est lui qu'il faut regarder d'abord`
      : s.nature === "cadencee"
        ? `le robot « ${s.robot} » tourne et la série ne reçoit plus rien depuis ${jours(depuis)} jour(s) : la panne est dans l'écriture, pas dans l'horloge`
        : `${s.source} n'a rien publié depuis ${jours(depuis)} jour(s). Lecture faite, ce n'est pas une panne de notre côté`;
    return { ...s, dernier, depuis, robotMuet, etat: "tarie" as const, diagnostic };
  }).sort((a, b) => rang[a.etat] - rang[b.etat] || (b.depuis ?? Infinity) - (a.depuis ?? Infinity));
}

/** Ce qui appelle quelqu'un. Une série qui reçoit n'a rien à dire. */
export const seriesAVoir = (vues: SerieVue[]): SerieVue[] => vues.filter((v) => v.etat !== "recoit");

/**
 * Le niveau de Santé d'une série.
 *
 * Une série cadencée tarie est une panne ; une série événementielle tarie est
 * une information. Les deux méritent d'être vues, une seule mérite qu'on se
 * lève la nuit.
 */
export function niveauDeSerie(v: SerieVue): "ok" | "warn" | "crit" {
  if (v.etat === "recoit") return "ok";
  if (v.etat === "vide") return v.nature === "cadencee" ? "crit" : "warn";
  return v.nature === "cadencee" ? "crit" : "warn";
}
