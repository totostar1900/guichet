import "server-only";
import { repo } from "@/lib/data";

/**
 * Dire un refus, une fois par heure et pas plus.
 *
 * LE DÉFAUT QUE CE FICHIER CORRIGE EST LE MIEN. Les deux routes de courrier
 * entrant refusaient en silence, et j'ai posé une ligne au flux à chaque refus
 * pour qu'un jeton désaccordé se voie. Mais ces routes sont publiques : il
 * suffit de les frapper en boucle pour écrire autant de lignes et noyer le flux
 * du desk sous du bruit. Le remède était devenu une porte.
 *
 * Le plafond répond aux deux besoins à la fois. Un apporteur mal configuré
 * frappe toutes les minutes : une ligne par heure suffit largement à le voir, et
 * la deuxième n'apprendrait rien. Un curieux qui frappe mille fois n'écrit
 * qu'une ligne.
 *
 * La fenêtre se lit dans le flux lui-même plutôt que dans une variable de
 * module : un serveur sans état garde plusieurs instances, et un compteur en
 * mémoire laisserait passer une ligne par instance.
 */
const FENETRE_MS = 60 * 60 * 1000;

export async function direLeRefus(html: string): Promise<void> {
  try {
    const recents = await repo().listEvents(40);
    const limite = Date.now() - FENETRE_MS;
    const deja = recents.some((e) => e.html === html && Date.parse(e.at) > limite);
    if (deja) return;
    await repo().logEvent({ kind: "system", html });
  } catch {
    // Un refus qu'on n'a pas su écrire ne doit pas changer la réponse faite à
    // l'appelant : il reste refusé, et c'est le seul point qui compte.
  }
}
