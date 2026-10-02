/**
 * Le texte qu'un client reçoit, construit à UN SEUL endroit.
 *
 * POURQUOI CE FICHIER. L'aperçu de relecture doit montrer le message exact, et
 * le serveur doit envoyer ce même message. Deux codes qui composent le même
 * texte finissent toujours par diverger : une virgule change d'un côté, et
 * l'aperçu se met à mentir sans que rien ne le dise. C'est la pire espèce de
 * défaut, parce que la relecture est précisément ce qui devait attraper les
 * erreurs. Alors il n'y a qu'un constructeur, et les deux l'appellent.
 *
 * CE QUI PART VRAIMENT. `sendEmail` n'enveloppe rien : pas d'en-tête de marque,
 * pas de pied de page, pas de mention de désabonnement. Le client reçoit ce
 * texte seul, dans un `<p>` dont les retours à la ligne sont des `<br>`. Donc
 * ce que ce fichier compose est littéralement tout le message.
 *
 * AUCUNE DE CES PHRASES NE PASSE PAR t(). Elles s'adressent au client, pas à
 * l'opérateur : le serveur les écrit en français quelle que soit la langue de
 * l'écran du desk. Les traduire dans l'aperçu donnerait un aperçu faux.
 *
 * Pas d'import serveur ici : le composant client de relecture s'en sert aussi.
 */

/** La phrase qui accompagne un lien de fiche sur WhatsApp, écrite par le serveur. */
export const MENTION_LIEN_WHATSAPP = "Ce lien reconnaît votre numéro : votre intention ne demande plus que le code e-mail.";

export type Ligne = { titre: string; url: string };

export type PiecesDuMessage = {
  /** Ce que l'opérateur a tapé. */
  corps: string;
  /** La fiche jointe, quand « Répondre avec la ligne » en désigne une. */
  ligne?: Ligne;
  canal: "whatsapp" | "email";
  /** Le nom de l'opérateur : il signe, la maison suit. */
  signataire: string;
};

/**
 * Le bloc de la fiche, tel qu'il s'insère : deux lignes vides avant, puis le
 * titre, puis l'adresse. Sur WhatsApp une phrase de plus, parce que le lien y
 * porte une marque qui reconnaît le numéro.
 */
export function blocLigne(p: Pick<PiecesDuMessage, "ligne" | "canal">): string {
  if (!p.ligne) return "";
  const mention = p.canal === "whatsapp" ? `\n${MENTION_LIEN_WHATSAPP}` : "";
  return `\n\n${p.ligne.titre}\n${p.ligne.url}${mention}`;
}

/** La signature : le nom de l'opérateur, puis la maison. */
export const signature = (signataire: string): string => `${signataire}, Purpose Capital`;

/** Le message entier, octet pour octet, tel qu'il part. */
export function texteExact(p: PiecesDuMessage): string {
  return `${p.corps.trim()}${blocLigne(p)}\n\n${signature(p.signataire)}`;
}

/**
 * Le message reçu, repris sous la réponse.
 *
 * POURQUOI. Le client lit souvent la réponse des jours plus tard, dans une
 * boîte où sa propre question a défilé. La citation lui remet sous les yeux ce
 * à quoi on répond, et c'est la convention que toutes les messageries suivent.
 *
 * `quand` arrive déjà écrit, en français, par l'appelant : la date se formate
 * dans le fuseau de l'opérateur, qui est celui où la phrase a un sens, et ce
 * fuseau n'existe que dans le navigateur. Cette fonction tient la forme, pas
 * l'horloge.
 *
 * Comme tout ce fichier, la phrase ne passe pas par t() : elle part chez le
 * client, en français, quelle que soit la langue de l'écran du desk.
 */
export function citation(quand: string, texte: string): string {
  const lignes = texte
    .replace(/\r\n?/g, "\n")
    .split("\n")
    /* Une ligne vide garde son chevron : sans lui, la citation se casse en deux
       blocs et le client ne voit plus où elle finit. */
    .map((l) => `> ${l}`.trimEnd())
    .join("\n");
  return `Le ${quand}, vous écriviez :\n${lignes}`;
}
