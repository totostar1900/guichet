import "server-only";
import { randomUUID } from "node:crypto";
import { audit } from "@/lib/audit";
import { backendName, repo } from "@/lib/data";
import { positionsFrom } from "@/lib/positions";
import {
  accepter,
  annuler,
  bloquer,
  convenirDesFrais,
  echouer,
  fraisDeLaPartie,
  fraisPermis,
  regler,
  signer,
  valeurDeLAccord,
  type FourchetteDeFrais,
  creerUneAnnonce,
  expirerLesAccords,
  facialDe,
  mettreAJourLesAnnonces,
  proposer,
  publier,
  quantiteOfferte,
  refuser,
  vuePublique,
  type Accord,
  type Annonce,
  type AnnoncePublique,
  type Proposition,
  type Sens,
  type UnitePrix,
} from "@/lib/domain/place-de-marche";
import type { Offer } from "@/lib/domain/types";
import { isResponsable, peutTitres, type Session } from "@/lib/auth/types";

/**
 * LA PLACE DE MARCHÉ : LE STOCKAGE ET LES GESTES (28 novembre 2026). Le domaine (`place-de-marche.ts`) dit les règles ; ce fichier les applique à ce que le dépôt garde.
 *
 * LE STOCKAGE EST LA TABLE RÉSERVÉE DU DESK (`desk_prive`, trois kinds), SANS MIGRATION : le serveur seul la lit, aucune page n'y lit un identifiant de porteur pour l'afficher. Une migration dédiée
 * viendra avec l'ouverture au public ; elle ajoutera ces kinds à la liste réservée à la direction.
 *
 * ELLE N'EST OUVERTE QUE PAR UN INTERRUPTEUR : `PLACE_DE_MARCHE=on`, ou le mode démonstration (aucun backend). En production, sans l'interrupteur, aucune page ne répond.
 */
export const KIND_ANNONCE = "place_annonce";
export const KIND_PROPOSITION = "place_proposition";
export const KIND_ACCORD = "place_accord";

export const placeOuverte = (): boolean => process.env.PLACE_DE_MARCHE === "on" || backendName() === "memory";

/** Qui peut participer : un client au dossier approuvé et à la convention à jour ; en démonstration, tout client. */
export const peutParticiper = (s: Session): boolean => peutTitres(s) || backendName() === "memory";

const lire = async <T,>(kind: string): Promise<T[]> => (await repo().listPrive(kind)).map((r) => r.data as T);
const ecrire = (kind: string, id: string, data: unknown, par: string) => repo().upsertPrive(kind, id, data, par);

export const annonces = (): Promise<Annonce[]> => lire<Annonce>(KIND_ANNONCE);
export const propositions = (): Promise<Proposition[]> => lire<Proposition>(KIND_PROPOSITION);
export const accords = async (maintenant = new Date().toISOString()): Promise<Accord[]> => expirerLesAccords(await lire<Accord>(KIND_ACCORD), maintenant);

/** Les lignes que la place admet : toutes, cotées ou non, sauf les parts de fonds (elles ont leur valeur liquidative) et ce qui n'a pas de nominal. */
export const ligneAdmise = (o: Offer): boolean => o.kind !== "FONDS" && o.nominal > 0 && !o.hidden;

/** L'unité du prix : un pourcentage du nominal pour la dette, une somme en francs par titre pour une action. */
export const unitePourLaLigne = (o: Offer): UnitePrix => (o.kind === "MARCHE" && o.instrument === "action") || o.kind === "ACTIONS" ? "fcfa" : "pct";

/** Les titres qu'un client détient d'une ligne : la somme de ses positions. */
export async function titresDetenus(userId: string): Promise<Map<string, number>> {
  const [intents, offres] = await Promise.all([repo().listIntents(), repo().listOffers()]);
  const out = new Map<string, number>();
  for (const p of positionsFrom(intents.filter((i) => i.clientId === userId), offres)) out.set(p.offer.id, (out.get(p.offer.id) ?? 0) + p.units);
  return out;
}

export interface AnnonceEnVue extends AnnoncePublique {
  titre: string;
  /** Vrai quand c'est l'annonce du lecteur : l'identité ne sort jamais, ce drapeau seul le dit. */
  mienne: boolean;
}

/** Les annonces publiées et vivantes, anonymes, les plus récentes d'abord. */
export async function annoncesPubliees(userId: string): Promise<AnnonceEnVue[]> {
  const maintenant = new Date().toISOString();
  const [liste, acc, offres] = await Promise.all([annonces(), accords(maintenant), repo().listOffers()]);
  const titres = new Map(offres.map((o) => [o.id, o.title]));
  return mettreAJourLesAnnonces(liste, acc, maintenant)
    .filter((a) => a.etat === "publiee")
    .sort((a, b) => b.deposeeLe.localeCompare(a.deposeeLe))
    .map((a) => ({ ...vuePublique(a, acc), titre: titres.get(a.offerId) ?? a.offerId, mienne: a.porteur === userId }));
}

export type Gest = { ok: true; id: string } | { ok: false; erreur: string };

/** Un client dépose une annonce, en facial : le nombre de titres s'en déduit et doit être entier. Une vente exige les titres. */
export async function deposerUneAnnonce(s: Session, d: { sens: Sens; offerId: string; facial: number; decoupage: boolean; prix: number }): Promise<Gest> {
  const o = (await repo().listOffers()).find((x) => x.id === d.offerId);
  if (!o || !ligneAdmise(o)) return { ok: false, erreur: "Cette ligne n'est pas admise sur la place." };
  const titres = d.facial / o.nominal;
  if (!Number.isInteger(titres) || titres < 1) return { ok: false, erreur: `Le facial doit être un multiple du nominal d'un titre (${o.nominal} FCFA).` };
  if (d.sens === "vend") {
    const detenus = (await titresDetenus(s.userId)).get(o.id) ?? 0;
    if (titres > detenus) return { ok: false, erreur: `Vous détenez ${detenus} titre(s) de cette ligne (facial ${facialDe(detenus, o.nominal)} FCFA).` };
  }
  const id = randomUUID();
  const c = creerUneAnnonce({ id, sens: d.sens, offerId: o.id, porteur: s.userId, quantite: titres, nominal: o.nominal, decoupage: d.decoupage, prix: d.prix, unite: unitePourLaLigne(o), le: new Date().toISOString() });
  if (!c.ok) return { ok: false, erreur: c.erreur };
  await ecrire(KIND_ANNONCE, id, c.annonce, s.email ?? s.name);
  await audit("place.annonce_deposee", KIND_ANNONCE, id, { after: { sens: d.sens, offerId: o.id, titres, decoupage: d.decoupage } });
  return { ok: true, id };
}

/** Le desk publie ou refuse. */
export async function modererUneAnnonce(s: Session, id: string, decision: "publier" | "refuser", motif?: string): Promise<Gest> {
  const a = (await annonces()).find((x) => x.id === id);
  if (!a) return { ok: false, erreur: "Annonce introuvable." };
  const maintenant = new Date().toISOString();
  const r = decision === "publier" ? publier(a, s.email ?? s.name, maintenant) : refuser(a, s.email ?? s.name, maintenant, motif ?? "");
  if (!r.ok) return { ok: false, erreur: r.erreur };
  await ecrire(KIND_ANNONCE, id, r.annonce, s.email ?? s.name);
  await audit(decision === "publier" ? "place.annonce_publiee" : "place.annonce_refusee", KIND_ANNONCE, id, { after: { etat: r.annonce.etat }, reason: motif });
  return { ok: true, id };
}

/** Un client répond à une annonce : un facial (une partie si le découpage est permis) et un prix. */
export async function repondre(s: Session, annonceId: string, d: { facial?: number; prix: number }): Promise<Gest> {
  const maintenant = new Date().toISOString();
  const [liste, acc] = await Promise.all([annonces(), accords(maintenant)]);
  const a = liste.find((x) => x.id === annonceId);
  if (!a) return { ok: false, erreur: "Annonce introuvable." };
  const restant = quantiteOfferte(a, acc);
  const titres = a.decoupage ? (d.facial ?? 0) / a.nominal : restant;
  if (!Number.isInteger(titres)) return { ok: false, erreur: `Le facial doit être un multiple du nominal d'un titre (${a.nominal} FCFA).` };
  const id = randomUUID();
  const r = proposer(a, acc, { id, porteur: s.userId, quantite: titres, prix: d.prix, le: maintenant });
  if (!r.ok) return { ok: false, erreur: r.erreur };
  await ecrire(KIND_PROPOSITION, id, r.proposition, s.email ?? s.name);
  await audit("place.proposition", KIND_PROPOSITION, id, { after: { annonceId, titres, prix: d.prix } });
  return { ok: true, id };
}

export interface PropositionEnVue {
  id: string;
  facial: number;
  titres: number;
  prix: number;
  etat: Proposition["etat"];
  le: string;
}

/** Les propositions reçues sur une annonce, pour son annonceur seul, sans nom. */
export async function propositionsRecues(s: Session, annonceId: string): Promise<{ annonce: Annonce; liste: PropositionEnVue[] } | null> {
  const a = (await annonces()).find((x) => x.id === annonceId);
  if (!a || a.porteur !== s.userId) return null;
  const liste = (await propositions())
    .filter((p) => p.annonceId === annonceId)
    .sort((x, y) => y.le.localeCompare(x.le))
    .map((p) => ({ id: p.id, titres: p.quantite, facial: facialDe(p.quantite, a.nominal), prix: p.prix, etat: p.etat, le: p.le }));
  return { annonce: a, liste };
}

/** L'annonceur accepte une proposition : l'accord de principe naît, pour 72 heures. */
export async function accepterUneProposition(s: Session, annonceId: string, propositionId: string): Promise<Gest> {
  const maintenant = new Date().toISOString();
  const [liste, props, acc] = await Promise.all([annonces(), propositions(), accords(maintenant)]);
  const a = liste.find((x) => x.id === annonceId);
  const p = props.find((x) => x.id === propositionId);
  if (!a || !p || a.porteur !== s.userId) return { ok: false, erreur: "Proposition introuvable." };
  const id = randomUUID();
  const r = accepter(a, acc, p, id, maintenant);
  if (!r.ok) return { ok: false, erreur: r.erreur };
  await ecrire(KIND_ACCORD, id, r.accord, s.email ?? s.name);
  await ecrire(KIND_PROPOSITION, p.id, r.proposition, s.email ?? s.name);
  await audit("place.accord_de_principe", KIND_ACCORD, id, { after: { annonceId, titres: r.accord.quantite, prix: r.accord.prix } });
  return { ok: true, id };
}

/** L'annonceur refuse une proposition. */
export async function refuserUneProposition(s: Session, annonceId: string, propositionId: string): Promise<Gest> {
  const [liste, props] = await Promise.all([annonces(), propositions()]);
  const a = liste.find((x) => x.id === annonceId);
  const p = props.find((x) => x.id === propositionId);
  if (!a || !p || a.porteur !== s.userId || p.etat !== "ouverte") return { ok: false, erreur: "Proposition introuvable." };
  await ecrire(KIND_PROPOSITION, p.id, { ...p, etat: "refusee" }, s.email ?? s.name);
  await audit("place.proposition_refusee", KIND_PROPOSITION, p.id, { after: { etat: "refusee" } });
  return { ok: true, id: p.id };
}

/** Les annonces à modérer, pour le desk. */
export async function annoncesAModerer(): Promise<(Annonce & { titre: string })[]> {
  const [liste, offres] = await Promise.all([annonces(), repo().listOffers()]);
  const titres = new Map(offres.map((o) => [o.id, o.title]));
  return liste.filter((a) => a.etat === "en_moderation").sort((a, b) => a.deposeeLe.localeCompare(b.deposeeLe)).map((a) => ({ ...a, titre: titres.get(a.offerId) ?? a.offerId }));
}


/* ------------------------------------------------------------------ ÉTAPE 2 : l'accord, le contrat, les frais, le règlement ------------------------------------------------------------------ */

export const KIND_FOURCHETTE = "place_fourchette";
const CLE_FOURCHETTE = "courante";
/** Tant que la direction n'a rien posé, la fourchette est nulle : tout montant convenu demande sa dérogation. */
export const FOURCHETTE_NON_POSEE: FourchetteDeFrais = { pctMin: 0, pctMax: 0, plancher: 0, plafond: 0 };

export async function fourchette(): Promise<{ posee: boolean; f: FourchetteDeFrais }> {
  const r = (await repo().listPrive(KIND_FOURCHETTE)).find((x) => x.key === CLE_FOURCHETTE);
  return r ? { posee: true, f: r.data as FourchetteDeFrais } : { posee: false, f: FOURCHETTE_NON_POSEE };
}

/** La direction pose la fourchette de frais, et elle seule. L'écart des bornes au journal est le seul chiffre qui sort. */
export async function poserLaFourchette(s: Session, f: FourchetteDeFrais): Promise<Gest> {
  if (!isResponsable(s)) return { ok: false, erreur: "La fourchette de frais est posée par la direction." };
  const ok = [f.pctMin, f.pctMax, f.plancher, f.plafond].every((n) => Number.isFinite(n) && n >= 0) && f.pctMin <= f.pctMax && f.plancher <= f.plafond;
  if (!ok) return { ok: false, erreur: "Une fourchette va du plus bas au plus haut, en nombres positifs." };
  const avant = await fourchette();
  await ecrire(KIND_FOURCHETTE, CLE_FOURCHETTE, f, s.email ?? s.name);
  await audit("place.fourchette", KIND_FOURCHETTE, CLE_FOURCHETTE, { before: avant.posee ? avant.f : undefined, after: f });
  return { ok: true, id: CLE_FOURCHETTE };
}

/** L'accord tel que son participant le lit : son rôle, ses frais à lui, l'état des signatures et des blocages. Jamais l'identité ni les frais de l'autre. */
export interface AccordEnVue {
  id: string;
  annonceId: string;
  titre: string;
  role: "vendeur" | "acheteur";
  quantite: number;
  facial: number;
  prix: number;
  unite: UnitePrix;
  valeur: number;
  etat: Accord["etat"];
  creeLe: string;
  expireLe: string;
  mesFrais?: number;
  jAiSigne: boolean;
  lAutreASigne: boolean;
  peutSigner: boolean;
  fondsBloques: boolean;
  titresBloques: boolean;
  regleLe?: string;
}

const enVue = (x: Accord, userId: string, titre: string): AccordEnVue => {
  const role = x.vendeur === userId ? "vendeur" : "acheteur";
  const autre = role === "vendeur" ? "acheteur" : "vendeur";
  return {
    id: x.id,
    annonceId: x.annonceId,
    titre,
    role,
    quantite: x.quantite,
    facial: facialDe(x.quantite, x.nominal),
    prix: x.prix,
    unite: x.unite,
    valeur: valeurDeLAccord(x),
    etat: x.etat,
    creeLe: x.creeLe,
    expireLe: x.expireLe,
    mesFrais: fraisDeLaPartie(x, role),
    jAiSigne: Boolean(x.signatures[role]),
    lAutreASigne: Boolean(x.signatures[autre]),
    peutSigner: x.etat === "accord_de_principe" && Boolean(x.frais.vendeur && x.frais.acheteur) && !x.signatures[role],
    fondsBloques: Boolean(x.bloque.fonds),
    titresBloques: Boolean(x.bloque.titres),
    regleLe: x.regleLe,
  };
};

/** Les accords d'un participant, les plus récents d'abord. */
export async function mesAccords(userId: string): Promise<AccordEnVue[]> {
  const [liste, offres] = await Promise.all([accords(), repo().listOffers()]);
  const titres = new Map(offres.map((o) => [o.id, o.title]));
  return liste
    .filter((x) => x.vendeur === userId || x.acheteur === userId)
    .sort((a, b) => b.creeLe.localeCompare(a.creeLe))
    .map((x) => enVue(x, userId, titres.get(x.offerId) ?? x.offerId));
}

export async function monAccord(userId: string, id: string): Promise<AccordEnVue | undefined> {
  return (await mesAccords(userId)).find((x) => x.id === id);
}

/** Le participant signe le contrat d'échange avec le code de son compte (le même que celui du verrou et des ordres). */
export async function signerMonAccord(s: Session, id: string, pin: string): Promise<Gest> {
  const maintenant = new Date().toISOString();
  const x = (await accords(maintenant)).find((a) => a.id === id);
  if (!x || (x.vendeur !== s.userId && x.acheteur !== s.userId)) return { ok: false, erreur: "Accord introuvable." };
  const partie = x.vendeur === s.userId ? "vendeur" : "acheteur";
  const { verifierCodeDuCompte } = await import("@/lib/auth/devices");
  const v = await verifierCodeDuCompte(s, pin);
  if (!v.ok) return { ok: false, erreur: v.error };
  const r = signer(x, partie, maintenant);
  if (!r.ok) return { ok: false, erreur: r.erreur };
  await ecrire(KIND_ACCORD, id, r.accord, s.email ?? s.name);
  await audit("place.signature", KIND_ACCORD, id, { after: { partie, etat: r.accord.etat, maniere: "code du compte" } });
  return { ok: true, id };
}

/** L'accord vu du desk : il sait qui sont les parties (il les a au téléphone), voit les deux frais et la fourchette. */
export interface AccordPourLeDesk {
  id: string;
  titre: string;
  vendeur: string;
  acheteur: string;
  quantite: number;
  facial: number;
  prix: number;
  unite: UnitePrix;
  valeur: number;
  etat: Accord["etat"];
  expireLe: string;
  frais: Accord["frais"];
  signatures: Accord["signatures"];
  bloque: Accord["bloque"];
  permis: { min: number; max: number };
  regleLe?: string;
}

async function nomDuClient(userId: string): Promise<string> {
  const f = await repo().getClientFileByUser(userId).catch(() => undefined);
  const nom = f && "name" in f ? String((f as { name?: string }).name ?? "") : "";
  return nom || `Client ···${userId.slice(-4)}`;
}

export async function accordsDuDesk(): Promise<AccordPourLeDesk[]> {
  const [liste, offres, four] = await Promise.all([accords(), repo().listOffers(), fourchette()]);
  const titres = new Map(offres.map((o) => [o.id, o.title]));
  const noms = new Map<string, string>();
  for (const id of new Set(liste.flatMap((x) => [x.vendeur, x.acheteur]))) noms.set(id, await nomDuClient(id));
  return liste
    .sort((a, b) => b.creeLe.localeCompare(a.creeLe))
    .map((x) => ({
      id: x.id,
      titre: titres.get(x.offerId) ?? x.offerId,
      vendeur: noms.get(x.vendeur) ?? "",
      acheteur: noms.get(x.acheteur) ?? "",
      quantite: x.quantite,
      facial: facialDe(x.quantite, x.nominal),
      prix: x.prix,
      unite: x.unite,
      valeur: valeurDeLAccord(x),
      etat: x.etat,
      expireLe: x.expireLe,
      frais: x.frais,
      signatures: x.signatures,
      bloque: x.bloque,
      permis: fraisPermis(valeurDeLAccord(x), four.f),
      regleLe: x.regleLe,
    }));
}

async function chargerAccord(id: string): Promise<Accord | undefined> {
  return (await accords()).find((x) => x.id === id);
}

/**
 * Le desk convient de frais avec une partie (au téléphone ou sur WhatsApp ; l'application garde le résultat). Dans la fourchette, le motif suffit ; hors fourchette, la dérogation est posée par
 * la direction : un opérateur qui sort de la fourchette est refusé, et le motif de la dérogation est exigé.
 */
export async function convenirLesFrais(s: Session, id: string, partie: "vendeur" | "acheteur", d: { montant: number; motif: string; derogation?: string }): Promise<Gest> {
  const x = await chargerAccord(id);
  if (!x) return { ok: false, erreur: "Accord introuvable." };
  const maintenant = new Date().toISOString();
  const four = await fourchette();
  const valeur = valeurDeLAccord(x);
  const { min, max } = fraisPermis(valeur, four.f);
  const dehors = d.montant < min || d.montant > max;
  if (dehors && !isResponsable(s)) return { ok: false, erreur: `Ces frais sortent de la fourchette (${min} à ${max} FCFA) : seule la direction pose une dérogation.` };
  const frais = { montant: d.montant, par: s.email ?? s.name, le: maintenant, motif: d.motif, ...(dehors ? { derogation: { par: s.email ?? s.name, le: maintenant, motif: d.derogation ?? "" } } : {}) };
  const r = convenirDesFrais(x, partie, frais, valeur, four.f);
  if (!r.ok) return { ok: false, erreur: r.erreur };
  await ecrire(KIND_ACCORD, id, r.accord, s.email ?? s.name);
  await audit("place.frais_convenus", KIND_ACCORD, id, { after: { partie, montant: d.montant, derogation: dehors } });
  return { ok: true, id };
}

type Passage = "bloquer_fonds" | "bloquer_titres" | "regler" | "echouer" | "annuler";

/** Les passages du desk : blocage des fonds de l'acheteur et des titres du vendeur, règlement, échec, annulation avant signature. */
export async function passageDuDesk(s: Session, id: string, passage: Passage): Promise<Gest> {
  const x = await chargerAccord(id);
  if (!x) return { ok: false, erreur: "Accord introuvable." };
  const maintenant = new Date().toISOString();
  const r =
    passage === "bloquer_fonds" ? bloquer(x, "fonds", maintenant)
    : passage === "bloquer_titres" ? bloquer(x, "titres", maintenant)
    : passage === "regler" ? regler(x, maintenant)
    : passage === "echouer" ? echouer(x)
    : annuler(x);
  if (!r.ok) return { ok: false, erreur: r.erreur };
  await ecrire(KIND_ACCORD, id, r.accord, s.email ?? s.name);
  await audit(`place.${passage}`, KIND_ACCORD, id, { after: { etat: r.accord.etat } });
  return { ok: true, id };
}
