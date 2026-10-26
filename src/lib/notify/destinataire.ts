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
  /**
   * UNE ENTRÉE DE RÉPERTOIRE SANS AUCUN CANAL N'EST PAS UNE RÉPONSE, et c'est
   * le défaut que ce module avait en naissant : il rendait `c` dès qu'il
   * existait.
   *
   * En base, le répertoire est la table des profils, et un profil existe pour
   * tout compte — avec un numéro et une adresse qui peuvent être nuls tous les
   * deux. Pire : `createClientFile` n'y recopie rien (seul
   * `updateClientFile` le fait). Donc le client reçu au guichet, dont la fiche
   * vient d'être ouverte avec son numéro et son adresse, avait un profil vide,
   * le résolveur s'arrêtait dessus, et l'envoi échouait sur « aucun canal
   * joignable » — dans le cas EXACT pour lequel le repli sur le dossier avait
   * été écrit. Le repli était inatteignable.
   */
  /**
   * UN SEUL CANAL AU RÉPERTOIRE SUFFIT, et le dossier ne vient PAS compléter
   * l'autre. C'est la moitié surprenante de la règle, et elle est délibérée :
   * un profil qui porte un numéro et pas d'adresse dit que le client est
   * joignable, et aller chercher dans la fiche une adresse que le répertoire
   * ne nomme pas ferait écrire la maison quelque part que le registre confirmé
   * n'annonce pas. Le repli sert le profil VIDE, qui est le cas qui cassait.
   */
  if (c?.phone || c?.email) return c;
  const f = await r.getClientFileByUser(userId).catch(() => undefined);
  const phone = f?.identity.phone;
  const email = f?.identity.email;
  if (!phone && !email) return undefined;
  return {
    ...c,
    id: userId,
    name: c?.name || f?.identity.name || nomDeSecours || userId,
    segment: c?.segment || (f?.kind === "morale" ? "Entreprise" : "Personne physique"),
    phone,
    email,
    /**
     * L'ACCORD WHATSAPP NE SE SUPPOSE NI D'UN NUMÉRO NI DU DOSSIER.
     *
     * Le dossier porte le numéro ; l'accord d'être joint par ce canal est un
     * consentement, et il vit dans le répertoire. Deux raisons de ne pas le
     * reprendre du dossier dès qu'un répertoire existe, et la seconde est la
     * grave : révoquer l'accord écrit `whatsapp_opt_in = false` sur le profil
     * et NE TOUCHE PAS à `consents.whatsappAt` du dossier. Un repli qui lirait
     * le dossier ressusciterait donc un refus — et enverrait un message à
     * quelqu'un qui a dit non.
     *
     * Sans répertoire du tout, la date du dossier est le seul accord qu'on ait,
     * et elle fait foi.
     */
    whatsappOptIn: c ? c.whatsappOptIn : Boolean(f?.consents?.whatsappAt),
  };
}
