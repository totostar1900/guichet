/**
 * Les droits de garde, et le barème que la maison n'a pas encore arrêté.
 *
 * Conserver des titres pour un client est un service rendu tous les jours et
 * facturé nulle part : les positions étaient suivies, aucune n'était tarifée.
 * Ce module calcule ce qui serait dû, produit l'avis qui le justifie ligne à
 * ligne, et le porte au journal des espèces. Tout y est, sauf le prix.
 *
 * LE BARÈME EST FERMÉ PAR DÉFAUT, comme le verrou des espèces l'est. Zéro point
 * de base : rien n'est dû, aucun avis ne se porte au journal, et le calcul se
 * prévisualise à n'importe quel taux sans que personne soit prélevé. Il
 * s'ouvrira le jour où la maison aura arrêté son tarif, et pas avant. Un
 * barème posé par défaut « pour que ça marche » serait un prélèvement décidé
 * par le code, et cette décision n'appartient pas au code.
 *
 * QUATRE RÈGLES, et chacune est une décision de méthode.
 *
 *   L'ASSIETTE est la valeur de conservation : le cours quand la ligne en a un,
 *   le nominal sinon. Elle porte son origine, parce qu'un nominal n'est pas un
 *   prix : une obligation primaire tenue jusqu'à l'échéance n'a pas de cours,
 *   et facturer sur son nominal doit se dire plutôt que se supposer.
 *
 *   LE PRORATA se compte en jours réellement gardés dans la période. Une ligne
 *   entrée le dernier jour du trimestre ne doit pas un trimestre entier, et une
 *   ligne remboursée au milieu cesse d'être gardée ce jour-là.
 *
 *   LA FRANCHISE porte sur l'assiette, pas sur le montant dû. Un portefeuille
 *   de cent mille francs ne se facture pas, quel que soit le taux : le coût de
 *   l'avis dépasserait ce qu'il réclame.
 *
 *   LE PLANCHER ne s'applique qu'à ce qui est déjà dû. Un barème fermé ne le
 *   déclenche jamais, sans quoi zéro point de base prélèverait le minimum, ce
 *   qui est exactement le prélèvement accidentel qu'on veut empêcher.
 *
 * Module sans dépendance : il se lit du serveur comme du navigateur.
 */

export interface BaremeGarde {
  /** Le taux annuel, en points de base de l'assiette. Zéro : le barème est fermé. */
  bps: number;
  /** Le plancher par période, en francs, appliqué à ce qui est déjà dû. */
  minimum: number;
  /** L'assiette en deçà de laquelle la période ne se facture pas. */
  franchise: number;
  /**
   * Les natures exonérées.
   *
   * Un fonds porte déjà ses frais de gestion dans sa valeur liquidative : le
   * facturer une seconde fois ferait payer deux fois la même conservation.
   */
  exonerees: string[];
}

/** Le barème fermé : rien n'est dû tant que la maison n'a pas arrêté le sien. */
export const BAREME_FERME: BaremeGarde = { bps: 0, minimum: 0, franchise: 0, exonerees: ["FONDS"] };

/** Le barème est-il ouvert, c'est-à-dire la maison a-t-elle arrêté son tarif ? */
export const baremeOuvert = (b: BaremeGarde): boolean => b.bps > 0;

/** Une ligne en conservation, telle que la période la voit. */
export interface LigneGardee {
  /** L'opération réglée qui a créé la position. */
  intentId: string;
  titre: string;
  /** La nature de la ligne, qui décide de l'exonération. */
  nature: string;
  /** Le jour où elle est entrée en conservation. */
  depuis: string;
  /** Le jour où elle en sort : échéance ou cession. Absent, elle y est encore. */
  jusqua?: string;
  /** La valeur de conservation en francs. */
  assiette: number;
  /** D'où vient l'assiette : un nominal n'est pas un prix, et cela se dit. */
  origine: "cours" | "nominal";
}

export interface Periode {
  /** Son nom, « 2026-T3 » : il rend la facturation idempotente. */
  cle: string;
  /** Premier jour compté. */
  du: string;
  /** Dernier jour compté, inclus. */
  au: string;
}

export interface DroitLigne extends LigneGardee {
  /** Les jours réellement gardés dans la période. */
  jours: number;
  /** Ce que la ligne doit, avant franchise et plancher. */
  brut: number;
  /** Exonérée par sa nature : elle paraît à l'avis, à zéro, plutôt que d'en disparaître. */
  exoneree: boolean;
}

export interface Droits {
  periode: Periode;
  bareme: BaremeGarde;
  lignes: DroitLigne[];
  /** Le nombre de jours de la période, dénominateur du prorata. */
  joursPeriode: number;
  /** L'assiette moyenne pondérée par les jours gardés : c'est elle que la franchise regarde. */
  assietteMoyenne: number;
  /** La somme des bruts, avant franchise et plancher. */
  brut: number;
  /** Ce qui est réellement dû. */
  du: number;
  /** Pourquoi rien n'est dû, quand rien ne l'est. */
  raison?: "barème fermé" | "sous la franchise" | "aucune ligne gardée";
  /** Le plancher a-t-il relevé le montant ? */
  plancherApplique: boolean;
}

const AN = 365;
const jourDe = (iso: string) => iso.slice(0, 10);
const enJours = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** Le trimestre civil qui contient cette date, sous la forme que l'avis porte. */
export function trimestreDe(iso: string): Periode {
  const d = new Date(`${jourDe(iso)}T00:00:00Z`);
  const an = d.getUTCFullYear();
  const t = Math.floor(d.getUTCMonth() / 3) + 1;
  const m0 = (t - 1) * 3;
  const debut = new Date(Date.UTC(an, m0, 1));
  const fin = new Date(Date.UTC(an, m0 + 3, 0));
  return { cle: `${an}-T${t}`, du: debut.toISOString().slice(0, 10), au: fin.toISOString().slice(0, 10) };
}

/** Le trimestre qui précède celui de cette date : on facture une période close. */
export function trimestrePrecedent(iso: string): Periode {
  const courant = trimestreDe(iso);
  const veille = new Date(`${courant.du}T00:00:00Z`);
  veille.setUTCDate(veille.getUTCDate() - 1);
  return trimestreDe(veille.toISOString().slice(0, 10));
}

/**
 * Les jours qu'une ligne a réellement passés en conservation dans la période.
 *
 * Bornes incluses des deux côtés : une ligne entrée le premier jour et sortie
 * le dernier a gardé toute la période, et une ligne entrée et sortie le même
 * jour a gardé un jour, pas zéro.
 */
export function joursGardes(l: LigneGardee, p: Periode): number {
  const debut = l.depuis > p.du ? jourDe(l.depuis) : p.du;
  const fin = l.jusqua && jourDe(l.jusqua) < p.au ? jourDe(l.jusqua) : p.au;
  if (fin < debut) return 0;
  return enJours(debut, fin) + 1;
}

/**
 * Ce qu'un client doit pour une période, ligne à ligne.
 *
 * L'ordre des règles n'est pas indifférent : barème, puis prorata, puis
 * franchise, puis plancher. Inverser les deux dernières ferait payer le
 * plancher à un portefeuille sous la franchise, c'est-à-dire précisément à
 * celui qu'on a décidé de ne pas facturer.
 */
export function droitsDeGarde(lignes: LigneGardee[], bareme: BaremeGarde, periode: Periode): Droits {
  const joursPeriode = enJours(periode.du, periode.au) + 1;
  const detail: DroitLigne[] = lignes.map((l) => {
    const jours = joursGardes(l, periode);
    const exoneree = bareme.exonerees.includes(l.nature);
    const brut = exoneree || jours <= 0 ? 0 : (l.assiette * (bareme.bps / 10_000) * jours) / AN;
    return { ...l, jours, brut, exoneree };
  });
  const gardees = detail.filter((l) => l.jours > 0 && !l.exoneree);
  const brut = detail.reduce((s, l) => s + l.brut, 0);
  /* Pondérée par les jours : une ligne entrée la veille de la clôture ne pèse
     pas autant qu'une tenue tout le trimestre. */
  const assietteMoyenne = gardees.reduce((s, l) => s + (l.assiette * l.jours) / joursPeriode, 0);

  const socle = { periode, bareme, lignes: detail, joursPeriode, assietteMoyenne, brut, plancherApplique: false };
  if (!baremeOuvert(bareme)) return { ...socle, du: 0, raison: "barème fermé" };
  if (!gardees.length) return { ...socle, du: 0, raison: "aucune ligne gardée" };
  if (assietteMoyenne < bareme.franchise) return { ...socle, du: 0, raison: "sous la franchise" };
  const plancherApplique = brut > 0 && brut < bareme.minimum;
  return { ...socle, du: plancherApplique ? bareme.minimum : brut, plancherApplique };
}
