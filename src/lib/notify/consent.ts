import type { Contact, NotifyChannel, NotifyKind } from "@/lib/domain/types";

/**
 * Qui peut recevoir quoi.
 *
 * Deux axes, et les confondre est la faute classique.
 *
 * Ce qu'est le message. Un message de **service** découle de quelque chose que
 * le client a fait : accusé de réception, avis de résultat, avis d'opéré,
 * relevé. Un message **promotionnel** part de nous : une ligne publiée, une
 * opportunité, le résumé du mois.
 *
 * Ce qui l'autorise. La relation autorise le service : ces messages-là sont
 * dus, et une case à cocher ne peut pas en dispenser la maison. Seul le
 * consentement autorise le promotionnel, canal par canal.
 *
 * La distinction existait déjà dans les données, par `NotifyKind` ; rien ne
 * l'appliquait. WhatsApp avait sa case et l'e-mail n'en avait pas, si bien
 * qu'une diffusion partait à toute adresse connue. C'est ce que ce fichier
 * ferme, en un seul endroit par lequel les deux chemins d'envoi passent.
 */
const PROMOTIONAL = new Set<NotifyKind>(["offer_published", "opportunity", "digest"]);

/** Le message part-il de nous, ou de ce que le client a fait ? */
export const isPromotional = (kind: NotifyKind): boolean => PROMOTIONAL.has(kind);

/**
 * Le client a-t-il dit oui sur ce canal ?
 *
 * Le push n'a pas de case : s'abonner depuis son téléphone est le
 * consentement, et se désabonner est le retirer.
 */
export function consented(c: Contact, channel: NotifyChannel): boolean {
  if (channel === "whatsapp") return Boolean(c.whatsappOptIn);
  if (channel === "email") return Boolean(c.emailOptIn);
  return true;
}

/**
 * Ce message peut-il partir sur ce canal ?
 *
 * « watch » reste à part : suivre une ligne est une demande explicite portant
 * sur cette ligne, donc le consentement est dans le geste même. Le refuser au
 * nom d'une case générale reviendrait à ne pas répondre à une question posée.
 */
export const mayReceive = (c: Contact, kind: NotifyKind, channel: NotifyChannel): boolean => !isPromotional(kind) || consented(c, channel);
