/**
 * LES RÈGLES DU NUAGE DE LA COTE, hors de la vue.
 *
 * Trois décisions y sont prises, et aucune n'est une affaire de pixels : ce
 * qui nomme une ligne sur le tracé, ce qui fait qu'elle a quitté le pair, et
 * quelle teinte porte son pays. Une règle qu'on ne peut pas éprouver sans un
 * navigateur ne s'éprouve pas.
 */

export type MesureNuage = "nuage" | "rendement" | "duree";
export const MESURES: MesureNuage[] = ["nuage", "rendement", "duree"];
export const MESURE_PAR_DEFAUT: MesureNuage = "nuage";
export const estMesure = (v: string | null | undefined): v is MesureNuage => MESURES.includes(v as MesureNuage);

export interface PointTitre {
  id: string;
  titre: string;
  /** Le pays de l'émetteur : c'est lui qui porte la couleur. */
  pays: string;
  /** La vie restante en années, et le rendement quand il se calcule. */
  ans: number;
  ytm: number | null;
  coupon?: number;
  cours?: number;
}

/**
 * QUATRE TEINTES ET UN « AUTRES », et ce n'est pas un raccourci.
 *
 * La CEMAC compte six pays. Six teintes distinguables en vision daltonienne
 * dans une bande de clarté étroite, cela n'existe pas : trois palettes
 * passées au validateur, trois refus sur la séparation protan/deutan, la
 * pire paire à ΔE 1,4 là où le plancher est 8. La règle du métier est alors
 * de ne pas fabriquer une teinte de plus mais de replier. Les quatre pays qui
 * ont des lignes cotées gardent la leur, les deux autres partagent un gris
 * nommé.
 *
 * LA TEINTE SUIT LE PAYS, JAMAIS SON RANG : cocher un filtre ne repeint
 * personne. C'est pourquoi la table est écrite et non calculée sur ce qui est
 * présent.
 */
const TEINTES: Record<string, string> = { CM: "t1", CG: "t2", GA: "t3", TD: "t4" };
export const teinteDe = (pays: string): string => TEINTES[pays] ?? "tx";

/**
 * AU-DELÀ D'UN DEMI-POINT, L'ÉCART AU COUPON VIENT DU COURS.
 *
 * Mesuré le 6 octobre 2026 sur les trente-deux obligations cotées :
 * vingt-cinq cotent exactement 100,00 et leur rendement est leur coupon à
 * quelques points de base de convention près, jusqu'à +18 pb pour les
 * amortisseurs fréquents. Les six autres s'en écartent de 138 à 452 points de
 * base, et c'est leur cours qui le dit. Un demi-point sépare proprement les
 * deux familles, et c'est ce que l'anneau or signale sur le tracé.
 */
export const ECART_PAIR = 0.5;
export const horsDuPair = (p: Pick<PointTitre, "ytm" | "coupon">): boolean =>
  p.ytm != null && p.coupon != null && Math.abs(p.ytm - p.coupon) > ECART_PAIR;

/**
 * LE NOM COURT D'UNE LIGNE, et il n'est pas toujours au même bout du titre.
 *
 * Une ligne cotée s'écrit « État du Gabon · EOG MT 6,6 % NET 2024-2027-II » :
 * prendre les premiers mots donnait « État du » sur cinq étiquettes voisines,
 * qui ne distinguent rien. Une séance d'adjudication s'écrit à l'envers,
 * « OTA Cameroun · 8 juil. 2031 : seconde tranche », et c'est le devant qui la
 * nomme. Le morceau de derrière commence alors par un chiffre : c'est à cela
 * qu'on les départage.
 */
export function nomCourt(titre: string, max = 20): string {
  const bouts = titre.split(" · ");
  const choisi = bouts.length > 1 && /^\d/.test(bouts[bouts.length - 1]) ? bouts[0] : bouts[bouts.length - 1];
  return choisi.length > max ? `${choisi.slice(0, max - 1)}…` : choisi;
}

/**
 * Les bornes d'un axe, avec leur marge.
 *
 * `plancher` dit où la marge s'arrête : une durée ne descend pas sous zéro,
 * l'axe partait à moins deux dixièmes d'année. Un rendement, lui, peut être
 * négatif, donc rien ne le borne.
 */
export function bornesAxe(valeurs: number[], plancher?: number): [number, number] {
  const bas = Math.min(...valeurs);
  const haut = Math.max(...valeurs);
  const marge = Math.max((haut - bas) * 0.08, 0.15);
  const b = Math.floor((bas - marge) * 10) / 10;
  return [plancher != null ? Math.max(plancher, b) : b, Math.ceil((haut + marge) * 10) / 10];
}
