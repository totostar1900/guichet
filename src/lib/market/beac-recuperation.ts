import type { ReleveBeac } from "./beac-bulletin";
import type { PointCourbeBeac } from "@/lib/data/repository";

/**
 * LA RÉCUPÉRATION DES BULLETINS D'AVANT 2023 (10 novembre 2026).
 *
 * La base porte les feuilles mensuelles de la BEAC par Trésor, mais il y manque des mois : avant 2023, la plupart des années n'en ont que cinq à dix sur douze, et le Congo ne commence qu'en 2020. Le bulletin mensuel des statistiques
 * du marché des valeurs du Trésor porte, page 5, la courbe des trois Trésors du mois : c'est la seconde source, qui comble ce que les feuilles ne donnent pas.
 *
 * TROIS RÈGLES :
 *
 *  Un mois couvert reste celui de la feuille. Le bulletin ne remplace jamais un point déjà en base (la feuille est une table imprimée, le bulletin un tracé relevé) : il ne comble que les mois et les Trésors qui manquent.
 *
 *  Chaque point cite sa pièce, et dit qu'il vient d'un tracé : « source_chemin » est l'adresse du bulletin, « reserves » dit « relevé sur le tracé ».
 *
 *  Le robot dit ce qu'il a fait, bulletin par bulletin, et ce qu'il n'a pas pu faire : un scan sans texte, une échelle qui ne se vérifie pas.
 */
export const TRESORS_DU_BULLETIN = ["Cameroun", "Congo", "Gabon"] as const;

export interface BulletinListe {
  numero: number;
  mois: string;
  url: string;
}

/** Les mois « AAAA-MM » que la base porte déjà, par Trésor. */
export type Couverture = Map<string, Set<string>>;

export function couvertureDe(points: Pick<PointCourbeBeac, "mois" | "pays">[]): Couverture {
  const out: Couverture = new Map();
  for (const p of points) {
    const s = out.get(p.pays) ?? new Set<string>();
    s.add(p.mois.slice(0, 7));
    out.set(p.pays, s);
  }
  return out;
}

/** Les Trésors du bulletin auxquels il manque ce mois-là. */
export const manquantsDuMois = (couv: Couverture, mois: string): string[] => TRESORS_DU_BULLETIN.filter((p) => !couv.get(p)?.has(mois));

export interface PlanDeRecuperation {
  /** Les bulletins à relever, du plus récent au plus ancien, avec les Trésors qu'ils comblent. */
  aTenter: (BulletinListe & { pour: string[] })[];
  /** Combien de bulletins listés tombent avant la borne. */
  avantLaBorne: number;
  /** Combien de ceux-là ne comblent rien : tous leurs Trésors ont déjà leur mois. */
  dejaCouverts: number;
  /** Combien comblent au moins un mois : le travail qui reste, au-delà de la limite d'un tour. */
  aComblerEnTout: number;
  /** Le plus ancien et le plus récent des bulletins listés : dit jusqu'où la page remonte. */
  plusAncien?: string;
  plusRecent?: string;
}

/**
 * Quels bulletins relever : ceux d'avant la borne qui comblent au moins un mois manquant, dans la limite fixée (un PDF se lit en plusieurs secondes, et un tour de robot a un plafond de temps).
 */
export function planDeRecuperation(bulletins: BulletinListe[], couv: Couverture, opts: { avant: string; limite: number }): PlanDeRecuperation {
  const tri = [...bulletins].sort((a, b) => b.mois.localeCompare(a.mois) || b.numero - a.numero);
  const avant = tri.filter((b) => b.mois < opts.avant);
  const utiles = avant.map((b) => ({ ...b, pour: manquantsDuMois(couv, b.mois) })).filter((b) => b.pour.length > 0);
  return {
    aTenter: utiles.slice(0, Math.max(0, opts.limite)),
    avantLaBorne: avant.length,
    dejaCouverts: avant.length - utiles.length,
    aComblerEnTout: utiles.length,
    plusAncien: tri[tri.length - 1]?.mois,
    plusRecent: tri[0]?.mois,
  };
}

/** La durée telle qu'un axe l'écrit : « 3 mois », « 1 an », « 1,5 ans ». */
export function tenorDe(annees: number): string {
  if (annees < 1) return `${Math.round(annees * 12)} mois`;
  const n = Math.round(annees * 10) / 10;
  return n === 1 ? "1 an" : `${String(n).replace(".", ",")} ans`;
}

/** Les points à écrire pour un bulletin : seulement ceux des Trésors dont le mois manque encore, jamais un point déjà couvert. */
export function pointsAEcrire(releve: ReleveBeac, b: BulletinListe, couv: Couverture): PointCourbeBeac[] {
  const manquants = new Set(manquantsDuMois(couv, b.mois));
  const out: PointCourbeBeac[] = [];
  for (const s of releve.series) {
    if (!manquants.has(s.pays)) continue;
    for (const p of s.points) out.push({ mois: `${b.mois}-01`, pays: s.pays, tenor: tenorDe(p.annees), annees: p.annees, taux: p.pct, sourceChemin: b.url });
  }
  return out;
}

/** Ce que la ligne dit de son origine : un tracé relevé, pas une table lue. */
export const RESERVE_DU_TRACE = "relevé sur le tracé du bulletin mensuel, faute de table publiée";

/** Une adresse de liste n'est acceptée que sur le site de la BEAC : le robot ne va pas où on le lui dit. */
export const estUneListeDeLaBeac = (u: string): boolean => {
  try {
    const x = new URL(u);
    return x.protocol === "https:" && (x.hostname === "www.beac.int" || x.hostname === "beac.int");
  } catch {
    return false;
  }
};
