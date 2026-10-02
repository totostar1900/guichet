import type { FluxSuivi } from "./encaissement";

/**
 * Ce que le client dit d'une échéance, et ce que la maison en fait.
 *
 * DEUX POPULATIONS, ET UNE SEULE A UN TÉMOIN. Pour un client dont la maison a
 * ouvert le sous-compte, le teneur de compte adresse l'avis de paiement et la
 * maison voit le coupon tomber. Pour un client dont le compte-titres est tenu
 * ailleurs, l'argent ne passe pas par elle : le client est la seule personne au
 * monde qui sache si l'émetteur a payé.
 *
 * L'écran lui disait « l'émetteur doit encore ces sommes, et le desk les suit »,
 * sans aucun bouton. C'était vrai et incomplet : il n'y avait rien à REPLACER,
 * mais il y avait quelque chose à DIRE.
 *
 * UN TÉMOIGNAGE NE CRÉDITE RIEN. « Reçu » ne fait pas entrer d'argent au
 * journal : cela donne au desk une raison d'aller chercher la pièce. Le constat
 * reste un geste de la maison, contre un relevé, parce que c'est elle qui
 * l'atteste ensuite par un avis numéroté.
 *
 * Module sans dépendance d'exécution : il se lit du serveur comme du
 * navigateur, et un test l'atteint sans monter de base.
 */

export type CeQueDitLeClient = "recu" | "rien" | "autre";

export interface Temoignage {
  id: string;
  userId: string;
  flowKey: string;
  said: CeQueDitLeClient;
  /** Le montant réellement vu, quand il diffère : la raison d'être de « autre ». */
  saidAmount?: number;
  /** Le jour où le client l'a vu sur son compte. */
  saidOn?: string;
  note?: string;
  at: string;
}

/** Les témoignages par clef de flux : un seul vivant par échéance. */
export const parFlux = (reports: Temoignage[]): Map<string, Temoignage> => new Map(reports.map((t) => [t.flowKey, t]));

/**
 * Ce que le témoignage change pour le desk, et c'est son seul effet.
 *
 * `confirme` : le client a vu l'argent. L'opérateur a une raison d'aller
 * chercher la pièce, et l'échéance passe devant les autres.
 *
 * `nie` : le client n'a rien vu. Ce n'est pas une bonne nouvelle, c'est un
 * SIGNAL : l'émetteur n'a probablement pas payé, et c'est une créance à
 * poursuivre plutôt qu'un encaissement à constater. Le pire des cas serait de
 * le ranger comme un simple retard de plus.
 *
 * `conteste` : une somme est arrivée, mais pas celle-là. C'est le cas qui
 * mérite le plus d'attention, parce qu'il se serait constaté sans bruit : un
 * opérateur qui confirme le montant attendu aurait eu l'air d'avoir raison.
 */
export type Priorite = "confirme" | "conteste" | "nie" | "muet";

export function prioriteDuFlux(f: FluxSuivi, t?: Temoignage): Priorite {
  if (!t) return "muet";
  if (t.said === "autre") return "conteste";
  return t.said === "recu" ? "confirme" : "nie";
}

/** L'ordre de la file : ce qui appelle quelqu'un, d'abord. */
const RANG: Record<Priorite, number> = { conteste: 0, confirme: 1, nie: 2, muet: 3 };

/**
 * La file des échéances attendues, rangée par ce que le client en dit puis par
 * le retard.
 *
 * Elle était rangée par retard décroissant seul, et c'était le mieux qu'on
 * pouvait faire sans témoin. Un coupon contesté de trois jours passe désormais
 * devant un coupon muet de soixante : le premier a une personne qui attend une
 * réponse, le second attend seulement un relevé.
 */
export function fileDesAttendus(flux: FluxSuivi[], reports: Temoignage[]): { flux: FluxSuivi; temoignage?: Temoignage; priorite: Priorite }[] {
  const index = parFlux(reports);
  return flux
    .map((f) => {
      const temoignage = index.get(f.cle);
      return { flux: f, temoignage, priorite: prioriteDuFlux(f, temoignage) };
    })
    .sort((a, b) => RANG[a.priorite] - RANG[b.priorite] || (b.flux.retardJours ?? 0) - (a.flux.retardJours ?? 0));
}

/**
 * Pourquoi ce témoignage ne peut pas s'enregistrer, ou rien.
 *
 * « Autre » sans montant n'est pas un témoignage, c'est une inquiétude : le
 * chiffre est tout ce qui le distingue de « reçu ». Et une date dans l'avenir
 * décrit un crédit qui n'est pas arrivé.
 */
export function pourquoiPasDeTemoignage(p: { said: CeQueDitLeClient; saidAmount?: number; saidOn?: string; aujourdHui: string }): string | null {
  if (p.said !== "recu" && p.said !== "rien" && p.said !== "autre") return "Dites ce que vous avez vu.";
  if (p.said === "autre" && !(p.saidAmount && p.saidAmount > 0)) return "Indiquez la somme que vous avez réellement reçue : c'est elle qui distingue cette réponse de « reçu ».";
  if (p.said !== "rien" && p.saidOn && p.saidOn > p.aujourdHui) return "La date est dans l'avenir : un crédit qui n'est pas arrivé ne se déclare pas.";
  return null;
}

/**
 * Ce que la maison répond au client, dans ses mots à lui.
 *
 * Elle ne promet pas un encaissement : elle promet d'aller voir. Promettre le
 * crédit serait refaire la faute que tout ce lot corrige, à l'envers.
 */
export function accuseDeReception(said: CeQueDitLeClient): string {
  if (said === "recu") return "Merci : le desk rapproche cette échéance de son relevé, et vous recevez l'avis dès qu'elle est constatée.";
  if (said === "autre") return "Merci : un montant différent de celui annoncé est ce qui se perdrait le plus facilement. Le desk reprend l'échéance avec l'émetteur.";
  return "C'est noté, et c'est utile : le desk relance l'émetteur sur cette échéance plutôt que d'attendre.";
}
