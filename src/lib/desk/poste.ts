import "server-only";
import { repo } from "@/lib/data";
import type { Role } from "@/lib/auth/types";

/**
 * LE POSTE D UN OPERATEUR : ce qu il a le droit de faire, et ce qu il a fait.
 *
 * La feuille du compte reprenait celle du Guichet : identite, canaux prouves,
 * notifications, statut KYC. Elle repond a « qui suis-je comme CLIENT », et un
 * opérateur n y a presque rien a faire : il n a ni palier, ni dossier, ni
 * canal a prouver. Les cases etaient vides.
 *
 * Celle du desk repond a deux questions, et a aucune autre :
 *
 *   CE QUE MON ROLE AUTORISE. Un operateur ouvre cette feuille pour verifier
 *   un droit avant d agir, et il vaut mieux qu il le lise que de l apprendre
 *   en se faisant refuser.
 *
 *   CE QUE J AI FAIT AUJOURD HUI, et ce qui attend mon second regard.
 *
 * ON NE RECALCULE RIEN ICI : les gestes viennent du registre, les
 * approbations de la file. Un transport qui recalcule finit par mentir.
 */
export interface Poste {
  role: Role;
  /** Les gestes que cette personne a posés aujourd'hui, du registre. */
  gestes: number;
  /** Ceux d'entre eux qui engagent sa signature. */
  signatures: number;
  /** Ce qui attend SON second regard, et qu'elle peut donc trancher. */
  aRegarder: { id: string; quoi: string; depuis: string }[];
  /**
   * CE QU ELLE NE PEUT PAS TRANCHER PARCE QU ELLE L A DEMANDE.
   *
   * On le COMPTE sans le montrer. Un compteur qui tombe de trois a deux sans
   * rien dire laisse croire a une panne ; la regle « deux personnes, pas deux
   * roles » se dit, elle ne se devine pas.
   */
  siennes: number;
}

/**
 * CE QUI ENGAGE UNE SIGNATURE, dans le vocabulaire de la chaine d audit.
 *
 * Les actions y sont nommees « offer.publish », « approval.decide »,
 * « intent.transition »… Un geste qui PUBLIE, DECIDE ou ARRETE engage la
 * personne ; consulter ou chercher, non.
 */
const SIGNE = /\.(publish|decide|sign|arrete|approve|quote)$/i;

/**
 * LE REGISTRE DES GESTES NE SERT PAS ICI, et c est une correction.
 *
 * « listClientActions » indexe par CLIENT : son « userId » est celui du
 * compte sur lequel le geste a porte, pas celui de l operateur. Compter mes
 * gestes avec lui aurait rendu les gestes faits SUR mon propre compte, ce
 * qui pour un operateur fait zero. La chaine d audit, elle, porte « actorId ».
 */
export async function chargerPoste(userId: string, role: Role, maintenant = new Date()): Promise<Poste> {
  const jour = `${maintenant.toISOString().slice(0, 10)}T00:00:00`;
  const r = repo();
  const [traces, approbations] = await Promise.all([
    r.listAudit({ actorId: userId, from: jour, limit: 500 }).catch(() => []),
    r.listApprovals(true).catch(() => []),
  ]);
  /* UN SEUL PARCOURS POUR LES DEUX COMPTES : lire deux fois la meme liste
     pour en tirer deux nombres est une occasion de les voir diverger. */
  let signatures = 0;
  for (const a of traces) if (SIGNE.test(a.action)) signatures += 1;

  const aRegarder: Poste["aRegarder"] = [];
  let siennes = 0;
  for (const ap of approbations) {
    /* La personne qui demande ne tranche pas : c'est la règle des quatre yeux,
       et elle est appliquée ailleurs. Ici on ne fait que la DIRE. */
    if (ap.requestedBy === userId) {
      siennes += 1;
      continue;
    }
    aRegarder.push({ id: ap.id, quoi: ap.title, depuis: ap.requestedAt });
  }
  return { role, gestes: traces.length, signatures, aRegarder: aRegarder.slice(0, 5), siennes };
}
