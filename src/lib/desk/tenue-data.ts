import "server-only";
import { repo } from "@/lib/data";
import { transitions } from "@/lib/reporting";
import { tenue, type Tenue } from "@/lib/domain/tenue";

/**
 * LES LECTURES DE LA TENUE, EN UN SEUL ENDROIT.
 *
 * Les dates de passage en « servie » vivent dans le journal des événements,
 * que quatre pages du desk lisent déjà : le cliquet du domicile plafonne ces
 * lectures, et une page de plus les éparpillerait. La page demande donc la
 * tenue, pas ce qu'il faut lire pour la calculer.
 *
 * Et une seule lecture sert pour TOUT LE MONDE : le répertoire affiche une
 * colonne pour vingt-huit clients, et vingt-huit lectures du même journal
 * seraient vingt-huit fois la même requête.
 */
export async function tenuesDeTous(now = new Date()): Promise<Map<string, Tenue>> {
  const r = repo();
  const [intents, offers, notifications, mandats, events, contacts] = await Promise.all([
    r.listIntents(),
    r.listOffers(),
    r.listNotifications(2000).catch(() => []),
    r.listMandats().catch(() => []),
    r.listEvents(5000),
    r.listContacts().catch(() => []),
  ]);
  const servieLe = new Map<string, string>();
  for (const i of intents) {
    const t = transitions(i.id, events).servie;
    if (t) servieLe.set(i.id, t);
  }
  const out = new Map<string, Tenue>();
  for (const c of contacts) out.set(c.id, tenue({ userId: c.id, intents, offers, notifications, mandats, servieLe }, now));
  return out;
}

export async function tenueDe(userId: string, now = new Date()): Promise<Tenue> {
  return (await tenuesDeTous(now)).get(userId) ?? { cran: "impeccable", manquements: [] };
}
