import path from "node:path";

/**
 * LA RACINE DU DÉPÔT, CALCULÉE ET NON ÉCRITE.
 *
 * Dix-neuf essais portaient « C:/dev/guichet » en dur, et trois cent dix-sept
 * scripts avec eux. Tant que le dépôt vit à cet endroit sur cette machine,
 * rien ne proteste ; cloné ailleurs, ou simplement rangé dans un autre
 * dossier, la suite entière tombe sur « ENOENT », et le message parle d'un
 * fichier absent plutôt que d'un chemin absolu.
 *
 * Ce n'est pas l'application qui en dépendait : ni les pages, ni les
 * composants, ni la configuration ne citaient ce chemin, et la production n'a
 * jamais été en cause. C'étaient les GARDES, c'est-à-dire précisément ce qui
 * doit survivre à un changement de poste.
 *
 * Elle se déduit de l'emplacement de ce fichier : « src/test » est à deux
 * crans de la racine, où qu'elle soit.
 */
export const RACINE = path.resolve(__dirname, "../..").replace(/\\/g, "/");
