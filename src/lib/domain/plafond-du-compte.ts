/**
 * LE PLAFOND PAR ORDRE : LA RÈGLE DU PV, ENFIN APPLIQUÉE.
 *
 * Un groupement arrive avec un procès-verbal qui dit « double signature
 * au-delà de 5 millions par ordre ». Jusqu'ici cette phrase vivait dans un
 * champ libre : le client la tapait, le desk la lisait sur la fiche, et
 * aucun code ne la vérifiait. Une règle affichée et non tenue est pire
 * qu'une règle absente, parce que tout le monde la croit tenue.
 *
 * ON N'APPLIQUE PAS LA DOUBLE SIGNATURE, ON APPLIQUE SON INTENTION. Deux
 * signatures sur un ordre demanderaient à deux personnes d'être devant leur
 * téléphone au moment où une adjudication se clôt, et la place ne le fait
 * nulle part : elle met le second regard sur l'ouverture d'un accès, pas sur
 * une transaction. Ce que le PV veut dire est qu'au-delà d'un montant, le
 * groupe ne veut pas qu'une seule personne engage la caisse d'un geste. Nous
 * le tenons autrement : au-delà du plafond, l'ordre QUITTE LE LIBRE-SERVICE
 * et se passe avec un conseiller, qui parle au groupe. Rien n'est refusé ;
 * un chemin plus lent est imposé, ce qui est exactement le but.
 *
 * LE PLAFOND NE REGARDE QUE CE QUI ENGAGE. Vendre, racheter des parts et
 * sortir ses espèces réduisent la position : les borner n'aurait aucun sens
 * et enfermerait le groupe dans son compte.
 *
 * DEUX ÉTAGES, ET LE PLUS BAS GAGNE. Le compte porte le plafond du PV. Une
 * personne peut en porter un plus bas, quand le PV donne des pouvoirs
 * inégaux : le directeur général cinquante millions, le trésorier cinq. Une
 * délégation ne dépasse jamais le mandat dont elle sort, donc un plafond de
 * personne au-dessus de celui du compte ne relève rien.
 */
import type { SensDeLIntention } from "./intent";

export interface PlafondEffectif {
  /** Le montant au-delà duquel l'ordre passe par une personne, ou rien. */
  montant?: number;
  /** D'où il vient, pour que la phrase dise la vérité au client. */
  source: "aucun" | "compte" | "personne";
}

/** Le plafond qui s'applique vraiment : le plus bas des deux, et il se dit. */
export function plafondEffectif(duCompte: number | undefined, delaPersonne: number | undefined): PlafondEffectif {
  const c = duCompte && duCompte > 0 ? duCompte : undefined;
  const p = delaPersonne && delaPersonne > 0 ? delaPersonne : undefined;
  if (c == null && p == null) return { source: "aucun" };
  if (p == null) return { montant: c, source: "compte" };
  if (c == null) return { montant: p, source: "personne" };
  return p <= c ? { montant: p, source: "personne" } : { montant: c, source: "compte" };
}

/**
 * L'ordre dépasse-t-il le plafond ?
 *
 * Un montant inconnu ne dépasse rien : on ne refuse pas sur une ignorance.
 * C'est un choix, et il est du bon côté : les ordres dont la dépense ne se
 * calcule pas d'avance sont ceux qui passent déjà par une borne signée, et
 * le desk les voit.
 */
export function depasseLePlafond(o: { plafond: PlafondEffectif; montant?: number; sens: SensDeLIntention }): boolean {
  if (o.sens !== "augmente") return false;
  if (o.plafond.montant == null) return false;
  return (o.montant ?? 0) > o.plafond.montant;
}

/** Ce que le client lit quand son ordre dépasse : le montant, d'où il vient, et par où passer. */
export function direLePlafond(p: PlafondEffectif, fmt: (n: number) => string): string {
  const d = p.source === "personne" ? "qui vous est fixé" : "fixé pour ce compte";
  return `Le plafond ${d} est de ${fmt(p.montant ?? 0)} FCFA par ordre. Au-delà, l'ordre ne se passe pas tout seul : écrivez-nous et un conseiller le prend avec vous, après confirmation du groupe.`;
}
