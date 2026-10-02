/**
 * « Reporter » : à quand, exactement.
 *
 * POURQUOI UNE DATE ET NON UN DRAPEAU. Le desk n'avait que deux issues pour un
 * fil qu'il ne peut pas traiter tout de suite : le marquer traité à tort, ou le
 * laisser non lu pour toujours. Les deux mentent, et la seconde finit par noyer
 * la file sous ce qu'on a décidé d'ignorer. Un drapeau « à revoir » aurait le
 * même défaut : il ne revient jamais tout seul.
 *
 * LE FUSEAU EST CELUI DE LA MAISON, pas celui du serveur. « Demain 9 h » veut
 * dire neuf heures à Douala, et le serveur tourne en UTC : calculé sans le
 * décalage, le fil reviendrait à 10 h locale. La zone CEMAC est à UTC+1 toute
 * l'année, sans heure d'été, donc un décalage fixe suffit et vaut mieux qu'une
 * bibliothèque de fuseaux pour une seule heure.
 */
export const DECALAGE_WAT_MS = 60 * 60 * 1000;

export type Report = { cle: string; mot: string };

export const REPORTS: Report[] = [
  { cle: "3h", mot: "dans 3 heures" },
  { cle: "demain", mot: "demain 9 h" },
  { cle: "lundi", mot: "lundi 9 h" },
];

/** L'heure locale de Douala, portée sur l'horloge du serveur. */
const neufHeuresLocales = (jour: Date): Date => {
  const d = new Date(jour);
  d.setUTCHours(9 - DECALAGE_WAT_MS / 3_600_000, 0, 0, 0);
  return d;
};

/**
 * La date de retour d'un fil, ou `undefined` si la clef est inconnue : un report
 * qu'on ne sait pas calculer ne se pose pas en silence à une heure inventée.
 */
export function quandRevient(cle: string, maintenant: number): string | undefined {
  const ici = new Date(maintenant);
  if (cle === "3h") return new Date(maintenant + 3 * 3_600_000).toISOString();
  if (cle === "demain") {
    const d = neufHeuresLocales(ici);
    /* Si neuf heures locales sont déjà passées, « demain » est bien demain ; si
       on reporte à six heures du matin, c'est aujourd'hui à neuf heures, et
       c'est ce que l'opérateur veut dire. */
    if (d.getTime() <= maintenant) d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString();
  }
  if (cle === "lundi") {
    const d = neufHeuresLocales(ici);
    /* Le lundi SUIVANT, toujours : reporter à lundi un lundi matin veut dire la
       semaine d'après, sinon le geste n'aurait rien reporté du tout. */
    do {
      d.setUTCDate(d.getUTCDate() + 1);
    } while (d.getUTCDay() !== 1);
    return d.toISOString();
  }
  return undefined;
}

/** Un fil reporté dont l'heure n'est pas venue : il sort de la file jusque-là. */
export const estReporte = (jusqua: string | undefined, maintenant: number): boolean => Boolean(jusqua && Date.parse(jusqua) > maintenant);
