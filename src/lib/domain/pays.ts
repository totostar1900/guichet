/**
 * LES PAYS QUE LE DOSSIER PROPOSE POUR LA NATIONALITÉ (19 novembre 2026, planche « Parcours d'inscription », 6A).
 *
 * Les six pays de la zone CEMAC d'abord, puis les autres par ordre alphabétique : un client de la zone trouve son pays sans défiler cent quatre-vingt-dix lignes. La valeur écrite au dossier est le nom français, comme avant (le champ était un texte libre) : aucune donnée existante ne change de forme.
 */
export const PAYS_CEMAC = ["Cameroun", "Congo", "Gabon", "Guinée équatoriale", "République centrafricaine", "Tchad"] as const;

export const AUTRES_PAYS = [
  "Afghanistan", "Afrique du Sud", "Albanie", "Algérie", "Allemagne", "Andorre", "Angola", "Arabie saoudite", "Argentine", "Arménie", "Australie", "Autriche", "Azerbaïdjan",
  "Bahamas", "Bahreïn", "Bangladesh", "Barbade", "Belgique", "Belize", "Bénin", "Bhoutan", "Biélorussie", "Birmanie", "Bolivie", "Bosnie-Herzégovine", "Botswana", "Brésil", "Brunei", "Bulgarie", "Burkina Faso", "Burundi",
  "Cambodge", "Canada", "Cap-Vert", "Chili", "Chine", "Chypre", "Colombie", "Comores", "Congo (République démocratique)", "Corée du Nord", "Corée du Sud", "Costa Rica", "Côte d'Ivoire", "Croatie", "Cuba",
  "Danemark", "Djibouti", "Dominique",
  "Égypte", "Émirats arabes unis", "Équateur", "Érythrée", "Espagne", "Estonie", "Eswatini", "États-Unis", "Éthiopie",
  "Fidji", "Finlande", "France",
  "Gambie", "Géorgie", "Ghana", "Grèce", "Guatemala", "Guinée", "Guinée-Bissau", "Guyana",
  "Haïti", "Honduras", "Hongrie",
  "Inde", "Indonésie", "Irak", "Iran", "Irlande", "Islande", "Israël", "Italie",
  "Jamaïque", "Japon", "Jordanie",
  "Kazakhstan", "Kenya", "Kirghizistan", "Koweït",
  "Laos", "Lesotho", "Lettonie", "Liban", "Liberia", "Libye", "Liechtenstein", "Lituanie", "Luxembourg",
  "Macédoine du Nord", "Madagascar", "Malaisie", "Malawi", "Maldives", "Mali", "Malte", "Maroc", "Maurice", "Mauritanie", "Mexique", "Moldavie", "Monaco", "Mongolie", "Monténégro", "Mozambique",
  "Namibie", "Népal", "Nicaragua", "Niger", "Nigeria", "Norvège", "Nouvelle-Zélande",
  "Oman", "Ouganda", "Ouzbékistan",
  "Pakistan", "Palestine", "Panama", "Papouasie-Nouvelle-Guinée", "Paraguay", "Pays-Bas", "Pérou", "Philippines", "Pologne", "Portugal",
  "Qatar",
  "République dominicaine", "République tchèque", "Roumanie", "Royaume-Uni", "Russie", "Rwanda",
  "Salvador", "Sénégal", "Serbie", "Seychelles", "Sierra Leone", "Singapour", "Slovaquie", "Slovénie", "Somalie", "Soudan", "Soudan du Sud", "Sri Lanka", "Suède", "Suisse", "Suriname", "Syrie",
  "Tadjikistan", "Tanzanie", "Thaïlande", "Timor oriental", "Togo", "Trinité-et-Tobago", "Tunisie", "Turkménistan", "Turquie",
  "Ukraine", "Uruguay",
  "Venezuela", "Viêt Nam",
  "Yémen",
  "Zambie", "Zimbabwe",
] as const;

/** Le nom sans accent, sans casse : « cote » trouve « Côte d'Ivoire ». */
export const sansAccent = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Les pays qui répondent à la recherche, dans les deux groupes, la zone d'abord. */
export function paysTrouves(recherche: string): { cemac: string[]; autres: string[] } {
  const q = sansAccent(recherche.trim());
  const ok = (p: string) => !q || sansAccent(p).includes(q);
  return { cemac: PAYS_CEMAC.filter(ok), autres: AUTRES_PAYS.filter(ok) };
}
