import "server-only";
import { repo } from "@/lib/data";
import { transitions } from "@/lib/reporting";
import { tenue } from "@/lib/domain/tenue";
import { activite, volumesRegles } from "@/lib/domain/activite";
import { cohorteDe, COHORTES, type Cohorte } from "@/lib/domain/cohortes";
import { comptesDemo } from "@/lib/domain/demo";
import { baremeCourant } from "@/lib/desk/activite-data";

/**
 * LES COHORTES DE TOUT LE MONDE, EN UNE PASSE.
 *
 * Une cohorte a besoin de la tenue, du score et du dernier geste : calculée
 * client par client, elle relirait trois fois les mêmes tables à chaque
 * rangée du répertoire. Tout se lit une fois, ici.
 *
 * Les comptes de démonstration en sont écartés, comme partout où un chiffre
 * se cite : une cohorte sert à écrire à des gens, et la maison ne s'écrit pas
 * à elle-même.
 */
export interface Cohortes {
  parClient: Map<string, Cohorte>;
  comptes: Record<Cohorte, number>;
  /** Le barème qui a servi aux scores : un classement se cite avec le sien. */
  bareme: number;
}

export async function cohortesDeTous(now = new Date()): Promise<Cohortes> {
  const r = repo();
  const b = await baremeCourant();
  const [intents, offers, notifications, mandats, events, contacts, files] = await Promise.all([
    r.listIntents(),
    r.listOffers(),
    r.listNotifications(2000).catch(() => []),
    r.listMandats().catch(() => []),
    r.listEvents(5000),
    r.listContacts().catch(() => []),
    r.listClientFiles().catch(() => []),
  ]);

  const servieLe = new Map<string, string>();
  for (const i of intents) {
    const t = transitions(i.id, events).servie;
    if (t) servieLe.set(i.id, t);
  }
  const volumes = volumesRegles(intents, now);
  const demo = comptesDemo(contacts);

  const parClient = new Map<string, Cohorte>();
  const comptes = Object.fromEntries(COHORTES.map((c) => [c, 0])) as Record<Cohorte, number>;

  for (const c of contacts) {
    if (demo.has(c.id)) continue;
    const [cash, gestes] = await Promise.all([
      r.listCash(c.id).catch(() => []),
      r.listClientActions({ userId: c.id, limit: 1 }).catch(() => []),
    ]);
    const t = tenue({ userId: c.id, intents, offers, notifications, mandats, servieLe }, now);
    const a = activite(
      { userId: c.id, tier: c.tier ?? 1, intents, offers, notifications, cash, gestes: [], dossier: files.find((f) => f.userId === c.id), contacts, volumes },
      b,
      now,
    );
    /* LE DERNIER GESTE VIENT DES TROIS SOURCES. Le registre des gestes a
       commencé le 10 octobre 2026 : s'y fier seul classerait dormant toute
       une clientèle qui traite depuis des mois. */
    const dernier = [gestes[0]?.at, ...intents.filter((i) => i.clientId === c.id).map((i) => i.createdAt), ...cash.map((x) => x.at)].filter(Boolean).sort().pop();
    const co = cohorteDe(t.cran, a.score, dernier, now);
    parClient.set(c.id, co);
    comptes[co] += 1;
  }
  return { parClient, comptes, bareme: b.version };
}
