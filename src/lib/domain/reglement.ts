import { SETTLEMENT } from "@/lib/config";

/**
 * OÙ LE CLIENT ENVOIE SON ARGENT.
 *
 * Trois lignes qu'un client recopie dans le formulaire de sa banque, et qui
 * étaient en dur : le bénéficiaire dans le code, la banque et le RIB dans deux
 * variables d'environnement. Une maison qui change de banque de règlement
 * devait donc déployer — et, en attendant, la page affichait
 * « …………… (RIB à renseigner) » : des points de suspension à l'endroit exact
 * où le client tape un numéro de compte.
 *
 * UN CHAMP VIDE N'EST PAS UNE LIGNE DE POINTS. Les défauts ne portent plus de
 * texte d'attente, ils portent le vide, et c'est l'écran qui dit ce qui manque
 * au lieu d'imiter une valeur. La doctrine des trous nommés vaut ici plus que
 * partout ailleurs : un client qui recopie des points fait un virement qui
 * n'arrive nulle part, et personne ne le sait avant que son argent manque.
 *
 * LE BIC EST NOUVEAU, et il n'est pas décoratif : le répertoire compte des
 * clients « Diaspora · Paris », et un virement depuis la France ne part pas
 * avec un RIB seul. Il reste facultatif, parce qu'un virement intra-CEMAC n'en
 * a pas besoin, et une ligne vide de plus ne vaut mieux qu'une ligne absente.
 *
 * CE N'EST PAS UN RÉGLAGE, C'EST LA DESTINATION DE L'ARGENT. Changer ce RIB
 * détourne les virements de toute la clientèle, et c'est exactement la forme
 * que prend la fraude au virement. D'où le chemin qu'impose la page du desk :
 * un brouillon, puis une publication par QUELQU'UN D'AUTRE.
 */
export interface CoordonneesDeReglement {
  /** Le titulaire, tel qu'il doit être tapé chez la banque du client. */
  beneficiaire: string;
  /** La banque de règlement : son nom, tel qu'il figure sur un relevé. */
  banque: string;
  /** Le RIB ou l'IBAN du compte de règlement clients. */
  rib: string;
  /** Le BIC / SWIFT, pour un virement qui vient de l'étranger. */
  bic?: string;
}

export const REGLEMENT_KEY = "reglement";

/**
 * Le défaut : ce que le code livre, et ce que deux variables d'environnement
 * remplissaient jusqu'au 25 octobre 2026. Elles restent lues, pour qu'un
 * déploiement qui les porte déjà ne perde rien ; le desk passe par-dessus.
 */
export const REGLEMENT_DEFAUT: CoordonneesDeReglement = {
  beneficiaire: SETTLEMENT.beneficiary,
  banque: SETTLEMENT.bank,
  rib: SETTLEMENT.iban,
  bic: SETTLEMENT.bic,
};

/** Les lignes obligatoires, dans l'ordre où une banque les demande. */
export const LIGNES_DE_REGLEMENT: { cle: "beneficiaire" | "banque" | "rib"; libelle: string }[] = [
  { cle: "beneficiaire", libelle: "Bénéficiaire" },
  { cle: "banque", libelle: "Banque du bénéficiaire" },
  { cle: "rib", libelle: "RIB / IBAN" },
];

/**
 * CE QUI MANQUE ENCORE, NOMMÉ.
 *
 * Le BIC n'en fait pas partie : il est facultatif, et le compter manquant
 * ferait tenir tout le chemin du virement pour fermé dans une maison qui ne
 * reçoit que des virements de la zone.
 */
export function cequiManque(c: CoordonneesDeReglement): string[] {
  return LIGNES_DE_REGLEMENT.filter((l) => !c[l.cle].trim()).map((l) => l.libelle);
}

/** Un client peut-il virer ? Oui quand les trois lignes obligatoires sont là. */
export const reglementUtilisable = (c: CoordonneesDeReglement): boolean => cequiManque(c).length === 0;
