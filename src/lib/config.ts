/**
 * L'ASPECT DES TUILES, DE TOUTE L'APPLICATION, EN UN MOT (ETALON.md § 8).
 *
 *   "tuiles" : des cartes à fond et à bord, séparées de 12 px (l'allure d'origine) ;
 *   "douces" : les mêmes, en moins prononcé (fond et bord atténués, rayon réduit) ;
 *   "lignes" : plus de cartes, des lignes fines de séparation ;
 *   "cartes" : des cartes arrondies (16 px) sans bord, dont les lignes sont groupées dans UNE carte, sans trait.
 *              Posé par page (« data-tuiles » sur sa racine) : l'Accueil seul, depuis le 2 novembre 2026.
 *
 * Changer ce mot change toutes les listes de tuiles. Les trois préréglages vivent
 * dans « globals.css » (« html[data-tuiles=…] ») ; la mise en page pose le mot sur « <html> ».
 */
export type AspectDesTuiles = "tuiles" | "douces" | "lignes" | "cartes";
export const TUILES: AspectDesTuiles = "tuiles";

/**
 * L'ACCENT DE CHAQUE FAMILLE DE PAGES, EN UN MOT PAR FAMILLE (21 novembre 2026, planches « Marché en bleu » puis « généraliser l'accent »).
 *
 *   "or"   : l'accent de la maison (liens, traits de titre, entrée de menu active, bouton principal) ;
 *   "bleu" : dans les pages de la famille, tout cet or devient le bleu de l'information (« --info »).
 *
 * Les familles suivent les sièges de la navigation (« REGLES », src/lib/famille.ts) : instruments, trader, marché, aide, accueil. Changer le mot d'une famille change toutes ses pages, sans en toucher une. LE BUT EST CELUI DES CAMPAGNES : une couleur d'ambiance par famille, posée ou retirée en une ligne. Il n'y a PAS de catalogue de couleurs : « or » et « bleu » sont les deux accents qui existent ; une couleur de plus se mesure (contraste dans les trois thèmes, puis les palettes) et s'ajoute le jour où une campagne la demande.
 *
 * La barre du haut, la cloche et le bouton flottant gardent l'or : ils servent toute l'application. Les règles vivent dans « globals.css » (« data-accent ») ; le script du <head> et le suivi de navigation posent « data-famille » et « data-accent » sur « <html> ».
 */
export type Accent = "or" | "bleu";
export const ACCENTS: Record<"instruments" | "trader" | "marche" | "aide" | "accueil", Accent> = { instruments: "or", trader: "or", marche: "bleu", aide: "or", accueil: "or" };

/** Product and company identity : the one place to change names. */
export const PRODUCT = {
  name: "Guichet",
  tagline: "Opportunités & instruments",
};

export const COMPANY = {
  name: "Purpose Capital",
  legalName: "Purpose Capital S.A.",
  tagline: "Guider le capital avec sens.",
  licence: "Société de bourse agréée COSUMAF · n° COSUMAF-SDB-01/2026",
  address: "Rue Joseph Essono Balla, Elig-Essono, Yaoundé, Cameroun",
  phone: "+237\u00a06\u00a087\u00a067\u00a067\u00a067", // espaces insécables : un numéro ne se coupe jamais en deux lignes
  email: "info@purposecapital.africa",
  site: "purposecapital.africa",
};

export const DISCLAIMER =
  "Communication à caractère promotionnel. Rendements actuariels bruts, convention Exact/Exact, hors commission et hors fiscalité, sous réserve du prix effectivement servi à l'adjudication. Une intention d'investissement n'est ni un ordre ni une garantie d'allocation. Risque de perte en capital.";

/**
 * Settlement instructions: the CODE DEFAULT only. The desk writes the live
 * values at desk › Référentiel › Compte de règlement, and everything reads
 * them through `loadReglement` — see src/lib/domain/reglement.ts.
 *
 * LES POINTS DE SUSPENSION SONT PARTIS. « …………… (RIB à renseigner) » était un
 * texte d'attente à l'endroit précis où un client tape un numéro de compte :
 * ce qui manque se nomme, et ne s'imite pas. Un champ vide est donc vide, et
 * l'écran dit lequel.
 */
export const SETTLEMENT = {
  beneficiary: "Purpose Capital S.A. : compte de règlement clients (ségrégué)",
  bank: process.env.SETTLEMENT_BANK ?? "",
  iban: process.env.SETTLEMENT_IBAN ?? "",
  bic: process.env.SETTLEMENT_BIC ?? "",
};

/** Specialist in Treasury Securities used per issuer country (bordereau addressee). */
export const SVT_BY_COUNTRY: Record<string, { name: string; address: string }> = {
  RCA: { name: "Ecobank Centrafrique · Direction Trésorerie & Marchés", address: "Place de la République, B.P. 910 Bangui" },
  Congo: { name: "Ecobank Congo · Direction Trésorerie & Marchés", address: "B.P. 2485 Brazzaville" },
  Cameroun: { name: "Afriland First Bank · Salle des marchés", address: "B.P. 11834 Yaoundé" },
  Gabon: { name: "BGFI Bank Gabon · Salle des marchés", address: "B.P. 2253 Libreville" },
  Tchad: { name: "Orabank Tchad", address: "N'Djamena" },
  "Guinée éq.": { name: "BGFI Bank Guinée équatoriale", address: "B.P. 749 Malabo" },
};
