/**
 * LA PLACE DE MARCHÉ DE GRÉ À GRÉ : LE DOMAINE (28 novembre 2026, discussion avec le client ; la conformité valide le rôle d'arrangeur et le contrat-type).
 *
 * CE QUE C'EST. Des clients postent des annonces d'achat ou de vente sur des lignes quelconques (toutes les lignes sont admises, cotées ou non) et reçoivent des propositions. Purpose n'est ni la bourse ni
 * une contrepartie : il est l'ARRANGEUR de la transaction une fois l'accord de principe pris. Chacun accepte ce rôle en postant ou en répondant ; le contrat d'échange le formalise. Les frais se négocient
 * au cas par cas, DANS UNE FOURCHETTE posée par la direction ; hors fourchette, une dérogation de la direction est nécessaire.
 *
 * LES RÈGLES, LES UNES APRÈS LES AUTRES :
 *  - UNE ANNONCE N'EST PUBLIÉE QU'APRÈS LE DESK (modération). Elle est anonyme : la vue publique ne porte jamais l'identité de l'annonceur.
 *  - IL N'Y A PAS DE MESSAGERIE. La seule interaction est une PROPOSITION : une quantité (partielle permise) et un PRIX. L'annonceur l'accepte, ou non ; répondre au prix de l'annonce vaut accord dès qu'il est accepté.
 *  - ON PARLE EN FACIAL, COMME LE MARCHÉ : le montant nominal total (titres × nominal) est ce qu'on lit d'abord, avec le nombre de titres à côté. Le marché est habitué aux montants, pas aux quantités.
 *  - LE DÉCOUPAGE EST UN CHOIX DE L'ANNONCEUR. Permis, on peut échanger une partie du facial (un nombre entier de titres). Non permis, tout ou rien : une proposition porte sur la totalité encore offerte.
 *  - UN ACCORD DE PRINCIPE VIT 72 HEURES. Sans les deux signatures du contrat d'échange dans ce délai, il tombe et la quantité qu'il retenait revient à l'annonce.
 *  - LA QUANTITÉ RETENUE PAR UN ACCORD N'EST PLUS OFFERTE : une annonce de 100 titres dont 40 sont sous accord n'en offre que 60. Une annonce est conclue quand plus rien n'est offert ni retenu.
 *  - NUL NE RÉPOND À SA PROPRE ANNONCE.
 *  - LES FRAIS SONT UNE SOMME CONVENUE PAR PARTIE, vérifiée contre la fourchette ; chaque partie ne voit que la sienne.
 *  - LE RÈGLEMENT SUIT UN ORDRE : deux signatures, puis le blocage des fonds de l'acheteur ET des titres du vendeur, puis l'échange, jamais l'un sans l'autre. Guichet coordonne : il ne garantit pas le règlement.
 *
 * AUCUN PRIX DE RÉFÉRENCE N'EST IMPOSÉ ICI : sans bourse, la référence (le dernier prix servi à l'adjudication, ou le prix indicatif du desk) et l'écart permis sont des PARAMÈTRES que la direction pose. Sans
 * paramètre, le prix n'est pas encadré.
 *
 * Module sans dépendance : il se lit du serveur comme du navigateur. Il ne lit rien, n'écrit rien ; les identifiants et les dates lui sont donnés.
 */

export type Sens = "vend" | "achete";
/** Le prix d'une ligne de dette est un pourcentage du nominal ; celui d'une action ou d'une part, une somme en francs par titre. */
export type UnitePrix = "pct" | "fcfa";

export type EtatDeLAnnonce = "en_moderation" | "publiee" | "refusee" | "retiree" | "expiree" | "conclue";
export type EtatDeLaProposition = "ouverte" | "acceptee" | "refusee" | "retiree" | "expiree";
export type EtatDeLAccord = "accord_de_principe" | "signe" | "bloque" | "regle" | "expire" | "annule" | "echec";

/** Les heures que vit un accord de principe sans les deux signatures. */
export const HEURES_D_UN_ACCORD = 72;
/** La durée d'une annonce publiée, en jours. À CONFIRMER avec le client : paramètre, jamais une règle écrite deux fois. */
export const JOURS_D_UNE_ANNONCE = 30;

export interface Annonce {
  id: string;
  sens: Sens;
  offerId: string;
  /** Le porteur qui annonce : interne, jamais montré. */
  porteur: string;
  quantite: number;
  /** Le nominal d'un titre en francs : le facial est quantité × nominal. */
  nominal: number;
  /** L'annonceur permet-il d'échanger une partie du facial ? Non : tout ou rien. */
  decoupage: boolean;
  prix: number;
  unite: UnitePrix;
  etat: EtatDeLAnnonce;
  deposeeLe: string;
  expireLe?: string;
  moderation?: { par: string; le: string; motif?: string };
}

export interface Proposition {
  id: string;
  annonceId: string;
  /** Le porteur qui répond : interne, jamais montré à l'autre. */
  porteur: string;
  quantite: number;
  prix: number;
  etat: EtatDeLaProposition;
  le: string;
}

export interface FraisConvenus {
  /** En francs. */
  montant: number;
  /** Le desk qui l'a convenu avec la partie. */
  par: string;
  le: string;
  motif: string;
  /** Posée par la direction quand le montant sort de la fourchette. */
  derogation?: { par: string; le: string; motif: string };
}

export interface Accord {
  id: string;
  annonceId: string;
  propositionId: string;
  offerId: string;
  vendeur: string;
  acheteur: string;
  quantite: number;
  /** Le nominal d'un titre, repris de l'annonce. */
  nominal: number;
  prix: number;
  unite: UnitePrix;
  etat: EtatDeLAccord;
  creeLe: string;
  expireLe: string;
  frais: { vendeur?: FraisConvenus; acheteur?: FraisConvenus };
  signatures: { vendeur?: string; acheteur?: string };
  bloque: { fonds?: string; titres?: string };
  regleLe?: string;
}

export type Resultat<T> = ({ ok: true } & T) | { ok: false; erreur: string };
const non = (erreur: string): { ok: false; erreur: string } => ({ ok: false, erreur });

const plusDeJours = (iso: string, jours: number): string => new Date(Date.parse(iso) + jours * 86_400_000).toISOString();
const plusDHeures = (iso: string, h: number): string => new Date(Date.parse(iso) + h * 3_600_000).toISOString();

/** Dépose une annonce : elle attend le desk. */
/** Le facial : le montant nominal de `quantite` titres. C'est lui que le marché lit. */
export const facialDe = (quantite: number, nominal: number): number => Math.round(quantite * nominal);

export function creerUneAnnonce(a: { id: string; sens: Sens; offerId: string; porteur: string; quantite: number; nominal: number; decoupage: boolean; prix: number; unite: UnitePrix; le: string }): Resultat<{ annonce: Annonce }> {
  if (!Number.isFinite(a.quantite) || a.quantite < 1 || !Number.isInteger(a.quantite)) return non("La quantité est un nombre entier de titres, au moins un.");
  if (!Number.isFinite(a.nominal) || a.nominal <= 0) return non("Le nominal d'un titre doit être positif.");
  if (!Number.isFinite(a.prix) || a.prix <= 0) return non("Le prix doit être positif.");
  return { ok: true, annonce: { id: a.id, sens: a.sens, offerId: a.offerId, porteur: a.porteur, quantite: a.quantite, nominal: a.nominal, decoupage: a.decoupage, prix: a.prix, unite: a.unite, etat: "en_moderation", deposeeLe: a.le } };
}

/** Le desk publie : l'annonce vit `JOURS_D_UNE_ANNONCE` jours. */
export function publier(a: Annonce, par: string, le: string): Resultat<{ annonce: Annonce }> {
  if (a.etat !== "en_moderation") return non("Seule une annonce en attente de modération peut être publiée.");
  return { ok: true, annonce: { ...a, etat: "publiee", expireLe: plusDeJours(le, JOURS_D_UNE_ANNONCE), moderation: { par, le } } };
}

/** Le desk refuse : un motif est obligatoire, l'annonceur le lit. */
export function refuser(a: Annonce, par: string, le: string, motif: string): Resultat<{ annonce: Annonce }> {
  if (a.etat !== "en_moderation") return non("Seule une annonce en attente de modération peut être refusée.");
  if (motif.trim().length < 3) return non("Un motif est obligatoire pour refuser une annonce.");
  return { ok: true, annonce: { ...a, etat: "refusee", moderation: { par, le, motif: motif.trim() } } };
}

/** La quantité encore offerte : celle de l'annonce moins ce que retiennent les accords vivants et ce que les accords réglés ont pris. */
export function quantiteOfferte(a: Annonce, accords: Accord[]): number {
  const prise = accords.filter((x) => x.annonceId === a.id && x.etat !== "expire" && x.etat !== "annule" && x.etat !== "echec").reduce((s, x) => s + x.quantite, 0);
  return Math.max(0, a.quantite - prise);
}

/** Ce que tout le monde peut lire d'une annonce : jamais le porteur. Le facial d'abord, le nombre de titres à côté. */
export interface AnnoncePublique {
  id: string;
  sens: Sens;
  offerId: string;
  /** Le facial total de l'annonce, et ce qui en reste offert. */
  facial: number;
  facialOffert: number;
  /** Le nombre de titres, total et encore offert. */
  titres: number;
  titresOfferts: number;
  /** Le découpage est-il permis ? Non : tout ou rien. */
  decoupage: boolean;
  prix: number;
  unite: UnitePrix;
  deposeeLe: string;
  expireLe?: string;
}
export const vuePublique = (a: Annonce, accords: Accord[]): AnnoncePublique => {
  const offerts = quantiteOfferte(a, accords);
  return { id: a.id, sens: a.sens, offerId: a.offerId, facial: facialDe(a.quantite, a.nominal), facialOffert: facialDe(offerts, a.nominal), titres: a.quantite, titresOfferts: offerts, decoupage: a.decoupage, prix: a.prix, unite: a.unite, deposeeLe: a.deposeeLe, expireLe: a.expireLe };
};

/** Le prix s'écarte-t-il du repère de plus que le permis ? Sans repère ou sans écart posé, il n'est pas encadré. */
export function ecartAuRepere(prix: number, repere: number | undefined): number | undefined {
  return repere && repere > 0 ? ((prix - repere) / repere) * 100 : undefined;
}
export function prixDansLEcart(prix: number, repere: number | undefined, ecartMaxPct: number | undefined): boolean {
  if (ecartMaxPct == null) return true;
  const e = ecartAuRepere(prix, repere);
  return e == null || Math.abs(e) <= ecartMaxPct;
}

/** Quelqu'un répond à une annonce publiée : une quantité (partielle permise) et un prix. */
export function proposer(a: Annonce, accords: Accord[], p: { id: string; porteur: string; quantite: number; prix: number; le: string }, repere?: number, ecartMaxPct?: number): Resultat<{ proposition: Proposition }> {
  if (a.etat !== "publiee") return non("Cette annonce n'est pas ouverte aux réponses.");
  if (a.expireLe && Date.parse(p.le) > Date.parse(a.expireLe)) return non("Cette annonce a expiré.");
  if (p.porteur === a.porteur) return non("Vous ne pouvez pas répondre à votre propre annonce.");
  if (!Number.isInteger(p.quantite) || p.quantite < 1) return non("La quantité est un nombre entier de titres, au moins un.");
  const restant = quantiteOfferte(a, accords);
  if (p.quantite > restant) return non(`Il ne reste que ${restant} titre(s) à offrir (facial ${facialDe(restant, a.nominal)} FCFA).`);
  if (!a.decoupage && p.quantite !== restant) return non(`Le découpage n'est pas permis : la proposition porte sur la totalité encore offerte, ${restant} titre(s), facial ${facialDe(restant, a.nominal)} FCFA.`);
  if (!Number.isFinite(p.prix) || p.prix <= 0) return non("Le prix doit être positif.");
  if (!prixDansLEcart(p.prix, repere, ecartMaxPct)) return non("Ce prix s'écarte trop du repère du marché.");
  return { ok: true, proposition: { id: p.id, annonceId: a.id, porteur: p.porteur, quantite: p.quantite, prix: p.prix, etat: "ouverte", le: p.le } };
}

/**
 * L'annonceur accepte une proposition : l'accord de principe naît, pour 72 heures. La quantité qu'il retient n'est plus offerte.
 * Une annonce de vente donne le vendeur à l'annonceur ; une annonce d'achat, l'acheteur.
 */
export function accepter(a: Annonce, accords: Accord[], p: Proposition, id: string, le: string): Resultat<{ accord: Accord; proposition: Proposition }> {
  if (a.etat !== "publiee") return non("Cette annonce n'est plus ouverte.");
  if (p.annonceId !== a.id || p.etat !== "ouverte") return non("Cette proposition n'est plus ouverte.");
  if (p.quantite > quantiteOfferte(a, accords)) return non("La quantité proposée n'est plus offerte.");
  const accord: Accord = {
    id,
    annonceId: a.id,
    propositionId: p.id,
    offerId: a.offerId,
    vendeur: a.sens === "vend" ? a.porteur : p.porteur,
    acheteur: a.sens === "vend" ? p.porteur : a.porteur,
    quantite: p.quantite,
    nominal: a.nominal,
    prix: p.prix,
    unite: a.unite,
    etat: "accord_de_principe",
    creeLe: le,
    expireLe: plusDHeures(le, HEURES_D_UN_ACCORD),
    frais: {},
    signatures: {},
    bloque: {},
  };
  return { ok: true, accord, proposition: { ...p, etat: "acceptee" } };
}

/** La valeur d'un accord en francs : le facial × le prix % pour une dette, quantité × prix pour une action. */
export function valeurDeLAccord(x: Pick<Accord, "quantite" | "nominal" | "prix" | "unite">): number {
  return Math.round(x.unite === "pct" ? (x.quantite * x.nominal * x.prix) / 100 : x.quantite * x.prix);
}

/** Le facial d'un accord : ce qui s'échange, en montant nominal. */
export const facialDeLAccord = (x: Pick<Accord, "quantite" | "nominal">): number => facialDe(x.quantite, x.nominal);

/** La fourchette de frais posée par la direction : un pourcentage de la valeur, avec un plancher et un plafond en francs. */
export interface FourchetteDeFrais {
  pctMin: number;
  pctMax: number;
  plancher: number;
  plafond: number;
}

/** La somme que la fourchette permet : entre le plus bas et le plus haut, planchers et plafonds compris. */
export function fraisPermis(valeur: number, f: FourchetteDeFrais): { min: number; max: number } {
  const min = Math.min(Math.max(Math.round((valeur * f.pctMin) / 100), f.plancher), f.plafond);
  const max = Math.min(Math.max(Math.round((valeur * f.pctMax) / 100), f.plancher), f.plafond);
  return { min, max: Math.max(min, max) };
}

/** Le desk convient de frais avec une partie : dans la fourchette, il suffit de son motif ; hors fourchette, la dérogation de la direction est nécessaire. */
export function convenirDesFrais(x: Accord, partie: "vendeur" | "acheteur", f: FraisConvenus, valeur: number, fourchette: FourchetteDeFrais): Resultat<{ accord: Accord }> {
  if (x.etat !== "accord_de_principe") return non("Les frais se conviennent avant la signature du contrat.");
  if (!Number.isFinite(f.montant) || f.montant < 0) return non("Les frais sont une somme positive ou nulle.");
  if (f.motif.trim().length < 3) return non("Un motif est obligatoire : il dit pourquoi cette somme a été convenue.");
  const { min, max } = fraisPermis(valeur, fourchette);
  const dedans = f.montant >= min && f.montant <= max;
  if (!dedans && !f.derogation) return non(`Ces frais sortent de la fourchette (${min} à ${max} FCFA) : la direction doit valider une dérogation.`);
  if (f.derogation && f.derogation.motif.trim().length < 3) return non("La dérogation de la direction demande son motif.");
  return { ok: true, accord: { ...x, frais: { ...x.frais, [partie]: f } } };
}

/** Le contrat peut être signé quand chaque partie a ses frais convenus. */
export const peutEtreSigne = (x: Accord): boolean => x.etat === "accord_de_principe" && Boolean(x.frais.vendeur && x.frais.acheteur);

/** Une partie signe le contrat d'échange. Avec les deux signatures, l'accord est signé. */
export function signer(x: Accord, partie: "vendeur" | "acheteur", le: string): Resultat<{ accord: Accord }> {
  if (x.etat !== "accord_de_principe") return non("Ce contrat ne peut plus être signé.");
  if (Date.parse(le) > Date.parse(x.expireLe)) return non("Les 72 heures sont écoulées : l'accord est tombé.");
  if (!peutEtreSigne(x)) return non("Les frais de chaque partie doivent être convenus avant la signature.");
  if (x.signatures[partie]) return non("Cette partie a déjà signé.");
  const signatures = { ...x.signatures, [partie]: le };
  const deux = Boolean(signatures.vendeur && signatures.acheteur);
  return { ok: true, accord: { ...x, signatures, etat: deux ? "signe" : "accord_de_principe" } };
}

/** Les accords de principe dont les 72 heures sont écoulées tombent : la quantité qu'ils retenaient revient à l'annonce. */
export function expirerLesAccords(accords: Accord[], maintenant: string): Accord[] {
  return accords.map((x) => (x.etat === "accord_de_principe" && Date.parse(maintenant) > Date.parse(x.expireLe) ? { ...x, etat: "expire" as const } : x));
}

/** Les annonces dont la durée est écoulée, ou dont tout est pris, changent d'état. Une annonce publiée dont un accord vit encore n'est pas conclue. */
export function mettreAJourLesAnnonces(annonces: Annonce[], accords: Accord[], maintenant: string): Annonce[] {
  return annonces.map((a) => {
    if (a.etat !== "publiee") return a;
    const vivants = accords.filter((x) => x.annonceId === a.id && (x.etat === "accord_de_principe" || x.etat === "signe" || x.etat === "bloque"));
    const reglees = accords.filter((x) => x.annonceId === a.id && x.etat === "regle").reduce((s, x) => s + x.quantite, 0);
    if (quantiteOfferte(a, accords) === 0 && vivants.length === 0 && reglees > 0) return { ...a, etat: "conclue" as const };
    if (a.expireLe && Date.parse(maintenant) > Date.parse(a.expireLe) && vivants.length === 0) return { ...a, etat: "expiree" as const };
    return a;
  });
}

/** Le blocage : les fonds de l'acheteur ET les titres du vendeur, chacun à son tour, jamais le règlement avant les deux. */
export function bloquer(x: Accord, quoi: "fonds" | "titres", le: string): Resultat<{ accord: Accord }> {
  if (x.etat !== "signe") return non("Rien n'est bloqué avant que les deux signatures soient posées.");
  const bloque = { ...x.bloque, [quoi]: le };
  return { ok: true, accord: { ...x, bloque, etat: bloque.fonds && bloque.titres ? "bloque" : "signe" } };
}

/** L'échange : seulement quand les fonds ET les titres sont bloqués. */
export function regler(x: Accord, le: string): Resultat<{ accord: Accord }> {
  if (x.etat !== "bloque" || !x.bloque.fonds || !x.bloque.titres) return non("Le règlement attend que les fonds de l'acheteur et les titres du vendeur soient bloqués.");
  return { ok: true, accord: { ...x, etat: "regle", regleLe: le } };
}

/** Un échec de règlement : tout se débloque, l'accord est clos, la quantité n'est pas rendue à l'annonce sans décision du desk. */
export function echouer(x: Accord): Resultat<{ accord: Accord }> {
  if (x.etat !== "signe" && x.etat !== "bloque") return non("Seul un accord signé peut échouer au règlement.");
  return { ok: true, accord: { ...x, etat: "echec", bloque: {} } };
}

/** Annule un accord de principe : un désaccord avant signature, ou un retrait. */
export function annuler(x: Accord): Resultat<{ accord: Accord }> {
  if (x.etat !== "accord_de_principe") return non("Seul un accord de principe peut être annulé : après la signature, c'est un contrat.");
  return { ok: true, accord: { ...x, etat: "annule" } };
}

/** Les frais d'une partie, et seulement les siens : l'autre partie ne les lit jamais. */
export function fraisDeLaPartie(x: Accord, partie: "vendeur" | "acheteur"): number | undefined {
  return x.frais[partie]?.montant;
}
