/**
 * UNE SEULE SIMULATION DE « next/cache », POUR LES DIX-SEPT ESSAIS.
 *
 * Chacun la posait à sa façon, avec les seules fonctions dont il avait besoin
 * ce jour-là. Le jour où la source en a importé une de plus, « unstable_cache »
 * pour garder le référentiel, cinquante-sept essais sont tombés d'un coup avec
 * « No export is defined on the mock ».
 *
 * Une simulation partielle ne protège de rien : elle casse au premier ajout,
 * et dix-sept fois. Celle-ci rend TOUT ce que la source utilise, et un cliquet
 * (« reference-purgee ») vérifie qu'aucun essai n'en repose une à la main.
 *
 *   vi.mock("next/cache", () => FAUX_NEXT_CACHE);
 */
export const FAUX_NEXT_CACHE = {
  revalidatePath: () => undefined,
  revalidateTag: () => undefined,
  updateTag: () => undefined,
  /* Le cache rend la fonction telle quelle : un essai mesure ce que la
     fonction fait, pas ce que Next en garde. */
  unstable_cache: <T,>(fn: T) => fn,
  unstable_noStore: () => undefined,
};
