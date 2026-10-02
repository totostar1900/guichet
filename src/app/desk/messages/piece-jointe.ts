/**
 * La pièce jointe d'une réponse : ce qu'on accepte, et ce qu'on refuse.
 *
 * CE QU'ELLE FAIT. Le desk savait envoyer un lien de fiche, pas un document,
 * alors que la maison en fabrique : bordereaux, dossiers, note du trimestre. Un
 * client qui demande son bordereau recevait un lien vers une page, ou rien.
 *
 * ELLE NE PASSE PAS PAR LE DÉPÔT. Les octets vont du formulaire au serveur, et
 * du serveur à Resend, sans escale. Garder une copie de chaque pièce envoyée
 * remplirait un dépôt déjà à 593 Mo sur 1 Go, pour un fichier que le desk a
 * forcément ailleurs puisqu'il vient de le choisir. Le journal d'audit garde le
 * nom et la taille : il dit ce qui est parti, sans le stocker deux fois.
 *
 * LE PLAFOND EST DIT, pas découvert. Sans lui, un envoi trop lourd échoue chez
 * Resend et l'opérateur lit « Échec d'envoi » sans savoir pourquoi. Dix mégas
 * tiennent largement un bordereau ou un dossier scanné, et restent sous la
 * limite du corps des actions serveur.
 */
export const PLAFOND_PIECE = 10 * 1024 * 1024;

/** Pourquoi une pièce ne part pas, ou rien si elle part. */
export function refusDePiece(nom: string, taille: number): string | undefined {
  if (!nom.trim()) return "Cette pièce n'a pas de nom : choisissez-la de nouveau.";
  /* Un fichier vide se choisit par accident, d'un double-clic dans un dossier
     ouvert : il part sans erreur et le client reçoit une pièce illisible. */
  if (taille <= 0) return "Cette pièce est vide : rien ne serait joint.";
  if (taille > PLAFOND_PIECE) return `Cette pièce fait ${Math.round(taille / 1024 / 1024)} Mo, et le plafond est de ${PLAFOND_PIECE / 1024 / 1024} Mo. Un lien de téléchargement passe mieux.`;
  return undefined;
}

/** La taille, en mots, pour l'écran et pour l'aperçu. */
export const taillePiece = (octets: number): string => (octets >= 1024 * 1024 ? `${(octets / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(octets / 1024))} ko`);
