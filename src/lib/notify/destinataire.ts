import "server-only";
import { repo } from "@/lib/data";
import type { Contact } from "@/lib/domain/types";

/**
 * À QUI ON PARLE, QUAND ON NE PARLE PAS D'UN ORDRE.
 *
 * L'intention porte son propre contact — celui que le client a donné en
 * passant l'ordre — et « dispatch » le résout pour elle. Tout le reste n'a
 * qu'un identifiant : un encaissement, un versement, une attente de sondage,
 * un mandat.
 *
 * DEUX SOURCES, ET DANS CET ORDRE. Le répertoire d'abord, qui porte ce que le
 * client a confirmé par un code ; le dossier ensuite, qui porte ce qu'il a
 * déclaré en l'ouvrant. Un client dont le répertoire est vide mais dont le
 * dossier porte un numéro doit être joignable : c'est le cas du client reçu
 * par le desk, dont la fiche existe avant le répertoire.
 *
 * ÉCRIT UNE FOIS, parce que trois modules s'étaient mis à le résoudre chacun
 * à sa façon : un client aurait été prévenu d'un versement et pas d'une
 * consolidation, pour la seule raison que l'un des trois cherchait moins loin
 * que l'autre.
 */
export async function contactDuClient(userId: string, nomDeSecours?: string): Promise<Contact | undefined> {
  const r = repo();
  const c = await r.getContact(userId).catch(() => undefined);
  if (c) return c;
  const f = await r.getClientFileByUser(userId).catch(() => undefined);
  const phone = f?.identity.phone;
  const email = f?.identity.email;
  if (!phone && !email) return undefined;
  return {
    id: userId,
    name: f?.identity.name || nomDeSecours || userId,
    segment: f?.kind === "morale" ? "Entreprise" : "Personne physique",
    phone,
    email,
    /* L'ACCORD WHATSAPP NE SE SUPPOSE PAS D'UN NUMÉRO. Le dossier porte le
       numéro ; l'accord d'être joint par ce canal est un consentement, et il
       vit dans le répertoire. Sans répertoire, l'e-mail reste. */
    whatsappOptIn: Boolean(f?.consents?.whatsappAt),
  };
}
