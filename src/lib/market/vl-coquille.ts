import type { FundNav } from "@/lib/domain/market";

/**
 * CE QUI FAIT QU'UNE VALEUR LIQUIDATIVE S'ÉCRIT, OU NON.
 *
 * LE MESSAGE D'AVANT MENTAIT, ET IL A FALLU ROUVRIR QUARANTE-CINQ SÉANCES POUR
 * LE SAVOIR. Il disait « date ou valeur invraisemblable » sans nommer laquelle
 * des quatre règles avait parlé. Mesuré le 12 octobre 2026 sur les 89 VL
 * écartées que la base garde :
 *
 *   VL antérieure à la création du fonds   56
 *   postérieure de plus de 7 jours         20
 *   plusieurs règles à la fois              7
 *   antérieure de plus de 400 jours         6
 *   valeur nulle ou négative                0
 *
 * ZÉRO. Le message parlait de valeur dans 89 cas sur 89 où aucune valeur
 * n'était en cause. Chaque motif se nomme donc désormais.
 *
 * LA COQUILLE D'ANNÉE DE JANVIER, ET POURQUOI ELLE SE RÉPARE SEULE.
 *
 * Le gros du lot est d'une seule espèce : une séance de janvier 2024 porte une
 * VL datée de janvier 2023 pour un fonds né en septembre 2023. La bourse écrit
 * l'année qui vient de finir, comme on la date sur un chèque le 2 janvier.
 * La date tombe dans la fenêtre des quatre cents jours, donc c'est la règle de
 * la création qui l'attrape, par chance plutôt que par dessein.
 *
 * CE CAS SE PROUVE SANS PERSONNE, et c'est ce qui autorise à le réparer : une
 * VL antérieure à la naissance du fonds n'est pas improbable, elle est
 * IMPOSSIBLE. Si ajouter un an la rend plausible ET postérieure à la création,
 * il n'existe pas d'autre lecture. C'est la mécanique de la seconde identité
 * prix / nominal : on essaie une correction, et on ne la retient que si elle
 * résout tout.
 *
 * TROIS BORNES QUI TIENNENT LA RÉPARATION HONNÊTE.
 *
 *   ON NE RÉPARE QUE L'IMPOSSIBLE. Une VL simplement trop vieille (quatre cent
 *   vingt jours) pourrait être une VL vraiment ancienne que la bourse
 *   réimprime : lui ajouter un an serait un pari. Seule « antérieure à la
 *   création » est une contradiction, et seule elle se répare.
 *
 *   LA CORRECTION DOIT TOUT RÉSOUDRE. Si l'année suivante laisse une seule
 *   des quatre règles en faute, on n'a pas trouvé la bonne lecture : la VL est
 *   écartée comme avant.
 *
 *   ELLE SE DIT. Une réparation muette serait une donnée inventée. Elle sort
 *   en note, avec l'ancienne date et la nouvelle, et jamais en avertissement :
 *   un avertissement laisserait la séance « partielle » pour un défaut déjà
 *   corrigé, et c'est la question périmée qu'on passe son temps à retirer des
 *   écrans du desk.
 */

/** Ce qui peut écarter une VL, nommé. */
export type MotifVl = "future" | "vieille" | "valeur" | "avant_creation";

export const MOTIF_VL: Record<MotifVl, string> = {
  future: "elle est postérieure à la séance de plus de sept jours",
  vieille: "elle est antérieure à la séance de plus de quatre cents jours",
  valeur: "la valeur lue n'est pas un montant positif",
  avant_creation: "elle précède la création annoncée du fonds",
};

export interface VerdictVl {
  /** La VL à écrire, corrigée s'il y avait lieu. Absente : elle est écartée. */
  garde?: FundNav;
  /** L'ancienne date, quand l'année a été réparée. */
  coquille?: string;
  /** Pourquoi elle est écartée, quand elle l'est. */
  motif?: MotifVl;
}

const JOUR = 86_400_000;
/** La VL peut devancer la séance de quelques jours : la table est arrêtée avant d'être imprimée. */
const AVANCE = 7;
/** Au-delà, ce n'est plus une VL ancienne, c'est une date lue de travers. */
const RETARD = 400;

const jours = (a: string, b: string): number => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / JOUR);

/** Les règles en faute, dans l'ordre où on les nomme. */
function fautes(navDate: string, nav: number, inception: string | undefined, sessionDate: string): MotifVl[] {
  const out: MotifVl[] = [];
  const ecart = jours(navDate, sessionDate);
  if (!Number.isFinite(ecart)) return ["vieille"];
  if (ecart > AVANCE) out.push("future");
  if (ecart < -RETARD) out.push("vieille");
  if (!(nav > 0)) out.push("valeur");
  if (inception && navDate < inception) out.push("avant_creation");
  return out;
}

/**
 * La même date, un an plus tard, ou rien.
 *
 * Le 29 février n'existe pas tous les ans, et « 2025-02-29 » se changerait en
 * 1er mars sans le dire : on refuse la correction plutôt que de déplacer la
 * date d'un jour à l'insu de tout le monde.
 */
function anneeSuivante(iso: string): string | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return undefined;
  const essai = `${Number(m[1]) + 1}-${m[2]}-${m[3]}`;
  const d = new Date(`${essai}T12:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== essai ? undefined : essai;
}

/** Garder, réparer, ou écarter en disant pourquoi. */
export function jugerLaVl(n: FundNav, sessionDate: string): VerdictVl {
  const faute = fautes(n.navDate, n.nav, n.inceptionDate, sessionDate);
  if (faute.length === 0) return { garde: n };

  /* On ne répare que l'impossible, et seulement si la correction résout tout. */
  if (faute.includes("avant_creation")) {
    const suivante = anneeSuivante(n.navDate);
    if (suivante && fautes(suivante, n.nav, n.inceptionDate, sessionDate).length === 0) {
      return { garde: { ...n, navDate: suivante }, coquille: n.navDate };
    }
  }
  return { motif: faute[0] };
}
