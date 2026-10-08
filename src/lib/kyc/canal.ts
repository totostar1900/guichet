import "server-only";
import { getSession } from "@/lib/auth";
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
  const [ch, s] = await Promise.all([
    repo()
      .getChannelStatus(userId)
      .catch(() => undefined),
    getSession().catch(() => null),
  ]);
  /* LA PREUVE LA PLUS FORTE EST CELLE QU'ON NE RANGEAIT NULLE PART.
     S'être connecté avec une adresse la prouve : c'est un code reçu à cette
     adresse qui a ouvert la session. Mais la connexion par code e-mail n'écrit
     pas « email_verified_at » dans le profil, si bien que cette règle, qui ne
     lisait que cette colonne, tenait l'adresse du compte pour non prouvée et
     pouvait repasser derrière le champ libre du formulaire. L'écran Sécurité,
     lui, dit « prouvé par votre connexion » depuis toujours : les deux disent
     maintenant la même chose. Même raison pour le numéro, que la session
     marque « phoneVerified » quand un code l'a confirmé. */
  const moi = s && s.userId === userId ? s : undefined;
  const mail = emailConfigured();
  const wa = whatsappConfigured();
  const mailProuve = moi?.email ?? (ch?.emailVerifiedAt ? ch.email : undefined);
  const telProuve = moi?.phoneVerified ? moi.phone : ch?.phoneVerifiedAt ? ch.phone : undefined;
  const parMail = mail && mailProuve ? ({ channel: "email", to: mailProuve, prouve: true } as const) : undefined;
  const parWa = wa && telProuve ? ({ channel: "whatsapp", to: telProuve, prouve: true } as const) : undefined;
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
