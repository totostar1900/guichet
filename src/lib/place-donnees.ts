import "server-only";
import { randomUUID } from "node:crypto";
import { audit } from "@/lib/audit";
import { backendName, repo } from "@/lib/data";
import { positionsFrom } from "@/lib/positions";
import {
  accepter,
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
import { peutTitres, type Session } from "@/lib/auth/types";

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
