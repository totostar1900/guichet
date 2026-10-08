import "server-only";
import { repo } from "@/lib/data";
import type { ClientFile } from "@/lib/domain/kyc";
import { emailConfigured, whatsappConfigured } from "@/lib/notify/providers";

export type CanalDuCode = {
  channel: "whatsapp" | "email";
  /** Le numéro ou l'adresse, en clair : le client doit pouvoir le lire pour savoir où regarder. */
  to: string;
  /** Vrai quand ce canal a été prouvé par un code, à la connexion ou dans Sécurité. */
  prouve: boolean;
};

/**
 * OÙ PART LE CODE D'ACCEPTATION, ET POURQUOI CE N'EST PLUS LE CHAMP DU FORMULAIRE.
 *
 * La règle était « le téléphone saisi, sinon l'adresse saisie ». Elle a coûté une
 * matinée : un dossier portait une adresse Yahoo tapée dans le formulaire, le
 * client regardait la boîte avec laquelle il s'était connecté, et les trois codes
 * partis sont bien arrivés, ailleurs. Le fournisseur les a acceptés, la table des
 * notifications les donnait pour « sent », et personne n'avait tort : l'app
 * envoyait au mauvais endroit, en silence.
 *
 * Un canal prouvé par un code vaut mieux qu'un canal tapé dans un champ libre :
 * il est vérifié, il appartient bien à la personne connectée, et c'est là qu'elle
 * attend ses messages. Entre deux canaux prouvés, l'adresse e-mail passe devant :
 * elle laisse une trace que le client peut retrouver, chercher et relire, là où un
 * message effacé sur un téléphone est perdu.
 *
 * Le canal tapé reste le dernier recours, pour un client qui n'a encore rien
 * prouvé. L'écran nomme la destination avant l'envoi dans les deux cas.
 *
 * « prefererWhatsApp » renverse l'ordre des deux canaux prouvés, sans jamais
 * faire passer un canal tapé devant un canal prouvé : la décision du desk suit
 * WhatsApp quand le client l'a demandé, le code d'acceptation garde l'e-mail.
 */
export async function canalDuCode(userId: string, f: ClientFile, prefererWhatsApp = false): Promise<CanalDuCode | undefined> {
  const ch = await repo()
    .getChannelStatus(userId)
    .catch(() => undefined);
  const mail = emailConfigured();
  const wa = whatsappConfigured();
  const parMail = mail && ch?.email && ch.emailVerifiedAt ? ({ channel: "email", to: ch.email, prouve: true } as const) : undefined;
  const parWa = wa && ch?.phone && ch.phoneVerifiedAt ? ({ channel: "whatsapp", to: ch.phone, prouve: true } as const) : undefined;
  const prouve = prefererWhatsApp ? (parWa ?? parMail) : (parMail ?? parWa);
  if (prouve) return prouve;
  if (prefererWhatsApp && wa && f.identity.phone) return { channel: "whatsapp", to: f.identity.phone, prouve: false };
  if (mail && f.identity.email) return { channel: "email", to: f.identity.email, prouve: false };
  if (wa && f.identity.phone) return { channel: "whatsapp", to: f.identity.phone, prouve: false };
  return undefined;
}

/** Comment le dire au client : « par e-mail à georges@… » plutôt qu'un nom de canal seul. */
export function nommerCanal(c: CanalDuCode | undefined): string {
  if (!c) return "";
  return c.channel === "email" ? `e-mail, à ${c.to}` : `WhatsApp, au ${c.to}`;
}
