import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Prouver que c'est bien Resend qui frappe, et aller chercher le courrier.
 *
 * Resend ne signe pas avec un jeton partagé : il envoie trois en-têtes Svix et
 * une signature HMAC. Quinze lignes de `node:crypto` suffisent, et la maison
 * garde sa liste de dépendances courte : ni `svix` ni le SDK `resend` ne sont
 * installés, et ce n'est pas pour ça qu'on les ajouterait.
 *
 * LE WEBHOOK NE PORTE QUE DES MÉTADONNÉES : ni corps, ni en-têtes, ni pièces
 * jointes, seulement leurs noms et leurs tailles. Il faut donc rappeler l'API,
 * et c'est une bonne nouvelle : la réponse donne `raw.download_url`, le message
 * RFC 822 entier. On le passe à l'analyseur que la maison a déjà, au lieu de
 * télécharger chaque pièce par son propre lien et de recoudre un courriel à la
 * main. Un saut de plus, et aucune fidélité perdue.
 */
const TOLERANCE_S = 5 * 60;

export const resendWebhookConfigured = (): boolean => Boolean(process.env.RESEND_WEBHOOK_SECRET && process.env.RESEND_API_KEY);

/**
 * La signature Svix : HMAC-SHA256 sur « id.timestamp.corps », clef en base64
 * derrière le préfixe « whsec_ ».
 *
 * Le corps doit être la chaîne BRUTE : relire la requête en JSON puis la
 * re-sérialiser change un espace ou l'ordre d'une clef, et la signature ne
 * tombe plus. C'est le piège classique de cette vérification.
 */
export function signatureValide(corps: string, h: { id: string | null; timestamp: string | null; signature: string | null }, secret = process.env.RESEND_WEBHOOK_SECRET): boolean {
  if (!secret || !h.id || !h.timestamp || !h.signature) return false;
  // La fenêtre de temps ferme le rejeu : une requête interceptée ne se
  // represente pas une heure plus tard avec sa signature encore bonne.
  const t = Number(h.timestamp);
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > TOLERANCE_S) return false;

  const clef = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const attendue = createHmac("sha256", clef).update(`${h.id}.${h.timestamp}.${corps}`).digest();
  // L'en-tête peut porter plusieurs versions, séparées par des espaces : on
  // accepte si l'une correspond, parce qu'une rotation de secret en laisse deux.
  return h.signature.split(" ").some((part) => {
    const [version, valeur] = part.split(",");
    if (version !== "v1" || !valeur) return false;
    const donnee = Buffer.from(valeur, "base64");
    return donnee.length === attendue.length && timingSafeEqual(donnee, attendue);
  });
}

interface RecuResend {
  raw?: { download_url?: string };
}

/**
 * Le message complet, en deux sauts : la fiche du courriel, puis son brut.
 *
 * Le lien ne vit qu'une heure, donc on le suit tout de suite : le garder pour
 * plus tard serait garder une adresse morte.
 */
export async function brutDuCourriel(emailId: string): Promise<Uint8Array> {
  const clef = process.env.RESEND_API_KEY;
  if (!clef) throw new Error("RESEND_API_KEY absente");
  const fiche = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, { headers: { authorization: `Bearer ${clef}` } });
  if (!fiche.ok) throw new Error(`fiche du courriel : ${fiche.status}`);
  const lien = ((await fiche.json()) as RecuResend).raw?.download_url;
  if (!lien) throw new Error("la fiche ne porte pas de lien vers le message brut");
  const brut = await fetch(lien);
  if (!brut.ok) throw new Error(`message brut : ${brut.status}`);
  return new Uint8Array(await brut.arrayBuffer());
}
