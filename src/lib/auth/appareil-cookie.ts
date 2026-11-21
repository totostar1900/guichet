import "server-only";
import { cookies } from "next/headers";

/**
 * L'APPAREIL RECONNU, GARDÉ AUSSI PAR LE SERVEUR (21 novembre 2026, planche « Plaisir d'usage », 5A).
 *
 * Le navigateur garde l'identifiant et le jeton de l'appareil dans son stockage local (`guichet_device`). Safari peut effacer ce stockage pour un site qu'on n'a pas visité pendant une semaine : le client revient, la porte ne le reconnaît plus, et lui demande de nouveau son adresse e-mail. Un cookie posé par le SERVEUR, de longue durée et fermé au JavaScript (`httpOnly`), n'est pas touché par cette règle : il porte la même chose, et la porte s'en sert quand le stockage est vide.
 *
 * LE JETON SEUL N'OUVRE RIEN : le serveur ne garde que le condensé HMAC (jeton · code), et le code à six chiffres reste exigé. Cinq codes faux oublient l'appareil, et le cookie avec lui (`oublierAppareil`).
 */
export const COOKIE_APPAREIL = "guichet_appareil";
/** Quatre cent jours : le plafond que les navigateurs acceptent pour un cookie. */
const DUREE = 60 * 60 * 24 * 400;

export type AppareilDuServeur = { id: string; token: string; who: string; name: string };

const FORME_ID = /^[a-zA-Z0-9-]{4,60}$/;
const FORME_JETON = /^[A-Za-z0-9_-]{40,50}$/;

export async function retenirAppareil(a: AppareilDuServeur): Promise<void> {
  if (!FORME_ID.test(a.id) || !FORME_JETON.test(a.token)) return;
  const valeur = Buffer.from(JSON.stringify({ id: a.id, token: a.token, who: a.who.slice(0, 60), name: a.name.slice(0, 60) })).toString("base64url");
  (await cookies()).set(COOKIE_APPAREIL, valeur, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DUREE });
}

export async function lireAppareil(): Promise<AppareilDuServeur | null> {
  const v = (await cookies()).get(COOKIE_APPAREIL)?.value;
  if (!v) return null;
  try {
    const a = JSON.parse(Buffer.from(v, "base64url").toString("utf8")) as Partial<AppareilDuServeur>;
    if (typeof a.id !== "string" || typeof a.token !== "string" || !FORME_ID.test(a.id) || !FORME_JETON.test(a.token)) return null;
    return { id: a.id, token: a.token, who: typeof a.who === "string" ? a.who : "", name: typeof a.name === "string" ? a.name : "" };
  } catch {
    return null;
  }
}

/** Oublie l'appareil du cookie ; avec `id`, seulement si c'est lui (retirer un AUTRE appareil de la liste ne touche pas celui-ci). */
export async function oublierAppareil(id?: string): Promise<void> {
  const jar = await cookies();
  if (id) {
    const a = await lireAppareil();
    if (!a || a.id !== id) return;
  }
  jar.delete(COOKIE_APPAREIL);
}
