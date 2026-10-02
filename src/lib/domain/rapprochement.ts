import { cashPosition, type CashEntry } from "./cash";
import type { Intent } from "./types";

/**
 * Ce que la maison doit à ses clients, face à ce qu'elle tient.
 *
 * Depuis le 2 octobre 2026, l'argent qui se trouve sur les comptes de la maison
 * appartient au client et peut y rester aussi longtemps qu'il le souhaite. Cette
 * phrase crée l'obligation de contrôle que l'ancienne règle évitait en ne
 * gardant rien, et ce module en porte l'arithmétique.
 *
 * L'APPLICATION NE CONNAÎT QU'UN CÔTÉ. Le journal des espèces dit ce que la
 * maison doit à chacun, et c'est le seul endroit qui le dise : la ségrégation
 * repose entièrement sur lui. Mais rien ici ne lit le solde des comptes de la
 * maison à la BEAC, à la BVMAC ou en banque. L'autre côté se déclare, contre sa
 * pièce, comme l'encaissement d'un coupon.
 *
 * Module sans dépendance d'exécution : il se lit du serveur comme du
 * navigateur, et un test l'atteint sans monter de base.
 */

/** Un compte de la maison, tel qu'un relevé le donne. */
export interface CompteDeclare {
  /** « BEAC · compte de règlement », « Afriland · 0472… » : le nom du relevé. */
  label: string;
  balance: number;
  /** La pièce : relevé du jour, extrait, avis. Sans elle, c'est un souvenir. */
  evidence: string;
}

export interface Rapprochement {
  id: string;
  onDate: string;
  /** Le dû, gelé au moment du contrôle. */
  owed: number;
  /** Sa part qui attend le règlement d'un ordre vivant. */
  owedAssigned: number;
  held: number;
  accounts: CompteDeclare[];
  note?: string;
  createdAt: string;
  createdBy: string;
}

/**
 * Ce que la maison doit, tous clients confondus, et comment ce dû se partage.
 *
 * `assigned` attend le règlement d'un ordre vivant : cet argent a une
 * destination et une échéance. `reclamable` est le reste, que chaque client peut
 * demander à tout moment. La distinction ne change pas le total dû, mais elle
 * change ce qu'un contrôleur en pense : un solde affecté est du règlement, un
 * solde réclamable est de l'argent gardé pour quelqu'un.
 */
export function duAuxClients(journaux: { entries: CashEntry[]; intents: Intent[] }[], now = new Date()): { owed: number; assigned: number; reclamable: number; clients: number } {
  let owed = 0;
  let assigned = 0;
  let clients = 0;
  for (const j of journaux) {
    const p = cashPosition(j.entries, j.intents, now);
    /* Un solde négatif ne se compense pas avec le solde d'un autre client : la
       maison ne doit pas « le net », elle doit à chacun ce qu'elle lui doit. Un
       journal négatif est d'ailleurs une anomalie en soi, que le total ne doit
       pas absorber en silence. */
    if (p.balance === 0) continue;
    owed += Math.max(0, p.balance);
    assigned += Math.min(p.assigned, Math.max(0, p.balance));
    clients += 1;
  }
  return { owed: Math.round(owed), assigned: Math.round(assigned), reclamable: Math.round(owed - assigned), clients };
}

/** La somme des comptes déclarés. */
export const tenuParLaMaison = (accounts: CompteDeclare[]): number => Math.round(accounts.reduce((t, a) => t + a.balance, 0));

export type SensDeLEcart = "juste" | "excedent" | "manque";

/**
 * L'écart, et son sens, qui n'est pas symétrique.
 *
 * Tenir PLUS que ce qu'on doit est ordinaire : l'argent propre de la maison est
 * sur les mêmes comptes, et un virement peut être en route. Tenir MOINS que ce
 * qu'on doit à ses clients est la seule chose grave que ce contrôle existe pour
 * voir, et l'écran ne doit pas peindre les deux de la même couleur.
 */
export function ecart(owed: number, held: number): { montant: number; sens: SensDeLEcart } {
  const montant = Math.round(held) - Math.round(owed);
  return { montant, sens: montant === 0 ? "juste" : montant > 0 ? "excedent" : "manque" };
}

/**
 * Pourquoi cette déclaration ne peut pas s'enregistrer, ou rien.
 *
 * Un écart sans explication n'est pas un contrôle, c'est un constat
 * d'ignorance : la note devient obligatoire dès que les deux chiffres
 * diffèrent. Et un compte sans pièce est un souvenir, pas un relevé.
 */
export function pourquoiPasDeRapprochement(p: { accounts: CompteDeclare[]; owed: number; note?: string }): string | null {
  if (!p.accounts.length) return "Déclarez au moins un compte, avec son solde et sa pièce.";
  if (p.accounts.some((a) => !a.label.trim())) return "Chaque ligne porte le nom du compte, tel que le relevé l'écrit.";
  if (p.accounts.some((a) => a.evidence.trim().length < 3)) return "Chaque solde porte sa pièce : relevé du jour, extrait, avis. Sans elle, c'est un souvenir.";
  if (p.accounts.some((a) => !Number.isFinite(a.balance))) return "Un solde doit être un nombre.";
  const e = ecart(p.owed, tenuParLaMaison(p.accounts));
  if (e.sens !== "juste" && (p.note ?? "").trim().length < 3) return "Expliquez l'écart : un écart sans explication n'est pas un contrôle.";
  return null;
}
