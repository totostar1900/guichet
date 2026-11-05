/**
 * LES SOCIÉTÉS DE GESTION D'OPC : CE QUE LA MAISON SAIT D'ELLES (10 novembre 2026, planche « fonds » 3A).
 *
 * Le siège, le numéro et la date d'agrément de la COSUMAF s'affichent sur l'onglet « Société de gestion » d'un fonds. Ils sont lus dans le tableau « Sociétés de gestion
 * d'OPC » de la liste des acteurs de marché de la COSUMAF (« L'Essentiel — 2e semestre 2025 », page 15, seize sociétés agréées au 31 décembre 2025). Une société que la
 * liste ne nomme pas AVEC CERTITUDE n'est pas livrée (ESS Asset Management est « Emrald Securities Services Asset Management » dans la liste : confirmé par le client le 5 novembre 2026) : le desk la saisit dans Référentiel › Sociétés de gestion, avec la source et le jour où il l'a relue ; une tuile sans
 * valeur n'est pas écrite. Aucun fait n'est écrit sans source officielle lue.
 *
 * La clef est le nom de la société tel que le bulletin le porte, mis en minuscules sans accent, les séparateurs en tirets : deux graphies du même nom donnent la même clef.
 * Le nom écrit ici est celui du bulletin (la COSUMAF écrit « BRIGTH » pour Africa Bright) ; plusieurs graphies d'une même société ont chacune leur entrée.
 */
export interface Gestionnaire {
  key: string;
  name: string;
  /** Ville et pays du siège, tels que la source les donne. */
  siege?: string;
  /** Numéro de la décision d'agrément. */
  agrementNo?: string;
  /** AAAA-MM-JJ. */
  agrementDate?: string;
  /** Où ces faits ont été lus : le texte ou l'adresse. Obligatoire. */
  source: string;
  /** AAAA-MM-JJ : le jour où le desk a relu la source. */
  verifiedOn: string;
}

/** La clef d'une société : son nom sans accent ni casse, les séparateurs en tirets. Une fonction (et non une constante) : la liste ci-dessous l'appelle à l'initialisation du module. */
export function cleDeGestionnaire(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Lues le 5 novembre 2026 dans la liste de la COSUMAF ; la clef de chaque entrée est celle du nom de bulletin (voir `cleDeGestionnaire`). */
const SOURCE_COSUMAF = "COSUMAF, « L'Essentiel — 2e semestre 2025 », liste des acteurs de marché, sociétés de gestion d'OPC (p. 15)";
const LUE_LE = "2026-11-05";
const lue = (name: string, siege: string, agrementNo: string, agrementDate: string): Gestionnaire => ({ key: cleDeGestionnaire(name), name, siege, agrementNo, agrementDate, source: SOURCE_COSUMAF, verifiedOn: LUE_LE });

export const GESTIONNAIRES: Gestionnaire[] = [
  lue("AFRICA BRIGHT ASSET MANAGEMENT", "Douala, Cameroun", "MFAC-SGP-01/2020", "2020-07-15"),
  lue("ASCA ASSET MANAGEMENT", "Douala, Cameroun", "MFAC-SGP-01/2016", "2016-12-07"),
  lue("CONTACTURER ASSET MANAGEMENT", "Yaoundé, Cameroun", "COSUMAF-SGOPC-01/2025", "2025-03-05"),
  lue("CORRIDOR ASSET MANAGEMENT", "Brazzaville, Congo", "MFAC-SGP-01/2015", "2015-06-15"),
  lue("ESS ASSET MANAGEMENT", "Douala, Cameroun", "COSUMAF-SGP-05/2021", "2021-12-16"),
  lue("EDC ASSET MANAGEMENT CEMAC", "Douala, Cameroun", "MFAC-SGP-01/2019", "2019-12-30"),
  lue("ELITE CAPITAL ASSET MANAGEMENT S.A.", "Yaoundé, Cameroun", "COSUMAF-SGP-02/2021", "2021-07-28"),
  lue("ENKO CAPITAL CENTRAL AFRICA", "Yaoundé, Cameroun", "COSUMAF-SGP-01/2021", "2021-07-28"),
  lue("HARVEST ASSET MANAGEMENT", "Douala, Cameroun", "MFAC-SGP-01/2017", "2017-12-14"),
  lue("KORI ASSET MANAGEMENT", "Douala, Cameroun", "COSUMAF-SGP-01/2023", "2023-03-31"),
  lue("L'ARCHER ASSET MANAGEMENT", "Brazzaville, Congo", "COSUMAF-SGP-03/2021", "2021-07-28"),
  lue("L'ARCHER CAPITAL ASSET MANAGEMENT", "Brazzaville, Congo", "COSUMAF-SGP-03/2021", "2021-07-28"),
  lue("L'ARCHER CAPITAL ASSET MANGEMENT UBA CAMEROUN", "Brazzaville, Congo", "COSUMAF-SGP-03/2021", "2021-07-28"),
  lue("MAKEDA ASSET MANAGEMENT", "Douala, Cameroun", "COSUMAF-SGP-06/2021", "2021-12-16"),
  lue("SOCIETE GENERALE CAPITAL ASSET MANAGEMENT CENTRAL AFRICA", "Douala, Cameroun", "COSUMAF-SGP-04/2023", "2023-10-02"),
];
