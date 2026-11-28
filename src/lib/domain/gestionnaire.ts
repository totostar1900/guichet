import { partsAuJour, vlAuJour, type VlDuJour } from "./retrocession";

/**
 * L'ESPACE DU GESTIONNAIRE DE FONDS : LES SÉRIES JOURNALIÈRES (28 novembre 2026, planche « Espace gestionnaire », 2C ; le client : « chaque jour, par fonds ou au global, et des évolutions dans le
 * temps sous plusieurs formes de graphes »).
 *
 * CE QUE LE GESTIONNAIRE VOIT, ET CE QU'IL NE VOIT JAMAIS. Il voit, pour ses fonds, ce qui vient de NOS clients : l'encours (les parts détenues ce jour-là × la dernière valeur liquidative connue ce
 * jour-là), les souscriptions et les rachats du jour, la valeur liquidative, et le nombre de porteurs. Il ne voit jamais l'identité d'un client, un ordre individuel, ni ce que la maison reçoit de lui :
 * ce module ne lit ni ne rend rien de tout cela. Un porteur n'est qu'un identifiant qu'on compte, jamais rendu.
 *
 * LE NOMBRE DE PORTEURS SOUS CINQ N'EST PAS DIT : avec un, deux, trois ou quatre porteurs, le chiffre désignerait quelqu'un. Il vaut `null` ; zéro reste zéro (personne ne détient rien).
 *
 * Module sans dépendance serveur : il se lit du navigateur comme du serveur.
 */

/** Sous ce nombre de porteurs, le chiffre n'est pas montré. */
export const SEUIL_DE_PORTEURS = 5;

/** Un mouvement de parts d'un client : positif à une souscription réglée, négatif à un rachat réglé. `porteur` n'est jamais rendu. */
export interface MouvementDeClient {
  jour: string;
  porteur: string;
  units: number;
}

/** Un fonds tel que le calcul le lit : ses mouvements et ses valeurs liquidatives. */
export interface FondsDuCalcul {
  mouvements: MouvementDeClient[];
  navs: VlDuJour[];
}

export interface PointDuJour {
  jour: string;
  /** La dernière valeur liquidative connue ce jour ; absente avant la première. Sur un global, absente (les fonds n'ont pas la même). */
  vl?: number;
  /** L'encours de nos clients en francs : les parts × la valeur liquidative. Un jour sans valeur connue n'est pas valorisé : zéro, jamais une invention. */
  encours: number;
  souscriptions: number;
  rachats: number;
  /** Le nombre de porteurs, ou `null` s'il en désignerait un (de un à quatre). */
  porteurs: number | null;
}

/** Les jours d'un intervalle, de `du` à `au` inclus. */
export function joursEntre(du: string, au: string): string[] {
  const out: string[] = [];
  const fin = Date.parse(`${au}T00:00:00Z`);
  for (let t = Date.parse(`${du}T00:00:00Z`); t <= fin; t += 86_400_000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

/** Retire `n` jours à une date. */
export function jourAvant(jour: string, n: number): string {
  return new Date(Date.parse(`${jour}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);
}

const masque = (n: number): number | null => (n > 0 && n < SEUIL_DE_PORTEURS ? null : n);

/**
 * La série d'un fonds, ou la série globale de plusieurs : un point par jour.
 *
 * UN SEUL CALCUL POUR LES DEUX : « un fonds » est une liste d'un fonds. L'encours et les flux s'additionnent ; les porteurs se comptent sans doublon (un porteur de deux fonds est un porteur). Sur un
 * global, `vl` est absente : additionner des valeurs liquidatives ne voudrait rien dire.
 */
export function serieJournaliere(fonds: FondsDuCalcul[], du: string, au: string): PointDuJour[] {
  return joursEntre(du, au).map((jour) => {
    let encours = 0;
    let souscriptions = 0;
    let rachats = 0;
    const porteurs = new Set<string>();
    for (const f of fonds) {
      const vl = vlAuJour(f.navs, jour);
      for (const m of f.mouvements) {
        if (m.jour === jour && vl != null) {
          if (m.units > 0) souscriptions += m.units * vl;
          else rachats += -m.units * vl;
        }
      }
      if (vl != null) encours += partsAuJour(f.mouvements, jour) * vl;
      const parPorteur = new Map<string, number>();
      for (const m of f.mouvements) if (m.jour <= jour) parPorteur.set(m.porteur, (parPorteur.get(m.porteur) ?? 0) + m.units);
      for (const [p, parts] of parPorteur) if (parts > 0) porteurs.add(p);
    }
    return {
      jour,
      ...(fonds.length === 1 ? { vl: vlAuJour(fonds[0].navs, jour) } : {}),
      encours: Math.round(encours),
      souscriptions: Math.round(souscriptions),
      rachats: Math.round(rachats),
      porteurs: masque(porteurs.size),
    };
  });
}

/** Les quatre chiffres du jour le plus récent de la série, et leur variation sur la période. */
export function resumeDeLaSerie(serie: PointDuJour[]): { encours: number; souscriptions: number; rachats: number; porteurs: number | null; variationEncours: number } {
  const dernier = serie[serie.length - 1];
  const premier = serie[0];
  return {
    encours: dernier?.encours ?? 0,
    souscriptions: serie.reduce((s, p) => s + p.souscriptions, 0),
    rachats: serie.reduce((s, p) => s + p.rachats, 0),
    /* « null » est une réponse (de un à quatre porteurs : non dit), pas une absence : il ne devient jamais zéro. */
    porteurs: dernier ? dernier.porteurs : 0,
    variationEncours: (dernier?.encours ?? 0) - (premier?.encours ?? 0),
  };
}

/** Les périodes proposées : des jours, ou « tout » depuis le premier mouvement. */
export const PERIODES_DU_GESTIONNAIRE = [
  { cle: "30j", jours: 30, libelle: "30 jours" },
  { cle: "90j", jours: 90, libelle: "90 jours" },
  { cle: "12m", jours: 365, libelle: "12 mois" },
] as const;
export type PeriodeDuGestionnaire = (typeof PERIODES_DU_GESTIONNAIRE)[number]["cle"];
export const PERIODE_DU_GESTIONNAIRE_PAR_DEFAUT: PeriodeDuGestionnaire = "90j";
export const estPeriodeDuGestionnaire = (v: string | null | undefined): v is PeriodeDuGestionnaire => PERIODES_DU_GESTIONNAIRE.some((p) => p.cle === v);

/** Les formes de graphe : l'évolution se lit en courbe, en aires, ou en barres (les flux du jour). */
export const FORMES_DE_GRAPHE = ["courbe", "aires", "barres"] as const;
export type FormeDeGraphe = (typeof FORMES_DE_GRAPHE)[number];
export const estFormeDeGraphe = (v: string | null | undefined): v is FormeDeGraphe => FORMES_DE_GRAPHE.some((f) => f === v);
