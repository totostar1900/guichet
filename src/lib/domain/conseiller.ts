import { COMPANY } from "@/lib/config";
import type { StaffMember } from "./types";

/**
 * Qui répond au client, et par où on le joint.
 *
 * Le rattachement est facultatif et le repli n'est pas un cas dégradé : une
 * maison de cette taille n'affecte pas forcément un conseiller à chacun, et le
 * desk répond très bien. La carte dit donc toujours quelque chose de vrai, avec
 * ou sans affectation.
 *
 * UN NOM SANS NUMÉRO EST UNE IMPASSE. La carte mène par WhatsApp : annoncer une
 * personne qu'on ne peut pas joindre sur ce canal est pire que d'annoncer le
 * desk, qui répond. Un conseiller sans téléphone reste rattaché en base, il ne
 * s'affiche simplement pas : le dossier garde l'information, l'écran ne promet
 * rien qu'il ne tienne.
 */
export interface Conseiller {
  /** Le nom affiché : une personne, ou la maison. */
  nom: string;
  /** Vrai quand une personne est rattachée ET joignable. */
  nomme: boolean;
  telephone: string;
  email?: string;
  /** Les initiales de l'avatar. La maison n'en a pas : elle porte une figure. */
  initiales?: string;
}

/** « Awa Ndongo » donne « AN ». Deux lettres au plus : trois tiennent mal dans un rond. */
export const initialesDe = (nom: string): string =>
  nom
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]!.toUpperCase())
    .join("");

export function conseillerDe(staff: StaffMember | undefined): Conseiller {
  if (staff?.phone) return { nom: staff.name, nomme: true, telephone: staff.phone, email: staff.email, initiales: initialesDe(staff.name) };
  return { nom: COMPANY.name, nomme: false, telephone: COMPANY.phone, email: COMPANY.email };
}

/**
 * Le lien WhatsApp.
 *
 * Le numéro part en chiffres seulement : « +237 6 87 67 67 67 » tel quel ne
 * résout pas. Le texte est pré-écrit mais le client le relit et le modifie
 * avant d'envoyer, c'est le navigateur qui le lui présente : ce qui part est
 * donc ce qu'il a accepté, et la carte le dit.
 */
export const lienWhatsApp = (telephone: string, texte: string): string => `https://wa.me/${telephone.replace(/\D/g, "")}?text=${encodeURIComponent(texte)}`;
