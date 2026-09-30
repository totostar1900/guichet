/**
 * La branche d'essai ne peut pas atteindre la production.
 *
 * POURQUOI CE FICHIER NE DEVRAIT PAS AVOIR À EXISTER, et pourquoi il existe.
 *
 * L'environnement d'essai est censé tourner sans Supabase : sans
 * `NEXT_PUBLIC_SUPABASE_URL`, l'application bascule d'elle-même sur son dépôt
 * mémoire. Mais sur Vercel, l'environnement Preview HÉRITE par défaut des
 * variables de Production. Tant que personne n'a ouvert le tableau de bord
 * pour les séparer, une prévisualisation de la branche d'essai lit et écrit
 * dans la base des clients, et rien à l'écran ne le dit.
 *
 * Une consigne aurait suffi si les consignes suffisaient. Celle-ci tient donc
 * dans le code : sur la branche « essai », le dépôt est en mémoire, quoi que
 * disent les variables. Un test ne peut pas toucher un client parce que le
 * chemin n'existe pas, et non parce qu'on a pensé à le couper.
 *
 * CE FICHIER EST TEMPORAIRE. Il porte le nom d'une branche, donc il se périme
 * le jour où elle disparaît ou change de nom, et il doit partir avec le lot de
 * refonte qu'il protège.
 */

/** Le nom de la branche déployée, tel que Vercel le pose. */
const BRANCHE = (process.env.VERCEL_GIT_COMMIT_REF ?? "").trim();

/**
 * Sommes-nous sur l'essai ?
 *
 * Deux portes, et la seconde sert au développement local : `GUICHET_ESSAI=1`
 * force le même comportement sans passer par Vercel.
 */
export const estEssai = (): boolean => BRANCHE === "essai" || process.env.GUICHET_ESSAI === "1";
