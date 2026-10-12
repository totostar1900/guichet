import "server-only";
import { repo } from "@/lib/data";
import { GESTES } from "@/lib/domain/journal-client";
import { alertesDe, type AlerteClient } from "@/lib/domain/alertes-client";
import type { TrustedDevice } from "@/lib/domain/types";
import { cadenceDUn } from "./cadence-data";
import { tenueDe } from "./tenue-data";
import { activiteDe } from "./activite-data";
import type { Cadence } from "@/lib/domain/cadence";
import type { ActionClient, Genre } from "@/lib/domain/journal-client";
import type { Activite } from "@/lib/domain/activite";
import type { Tenue } from "@/lib/domain/tenue";

/**
 * TOUT CE QU'UNE FICHE CLIENT MONTRE, EN UNE SEULE LECTURE.
 *
 * La page dessinée par la maquette du 10 octobre 2026 porte six tuiles, un
 * fil de gestes, les manquements, les cinq ingrédients du score, les alertes
 * et les actions : chacun de ces blocs a sa source, et les demander un par un
 * depuis la page éparpillerait huit lectures que le cliquet du domicile
 * refuse. La page demande donc sa fiche, pas ce qu'il faut lire pour la
 * composer.
 */
export interface FicheClient {
  cadence: Cadence;
  tenue: Tenue;
  /* Absente tant qu'aucun barème n'est publié : un score sans barème ne se
     compare à rien, et en inventer un vaudrait mieux que rien seulement si
     personne ne devait s'en servir. */
  activite?: Activite;
  alertes: AlerteClient[];
  /** Les gestes affichés au fil, les plus récents d'abord. */
  gestes: ActionClient[];
  /** Combien de gestes par genre, et au total : les huit compteurs de la maquette. */
  comptes: { total: number; parGenre: Record<Genre, number> };
  /** Le premier geste connu, pour dire depuis quand le fil court. */
  depuis?: string;
}

/** Ce que le fil montre d'un coup. Au-delà, un lien dit combien restent. */
export const GESTES_AU_FIL = 40;

export async function ficheDe(userId: string, maintenant = new Date()): Promise<FicheClient> {
  const r = repo();
  const [cadence, tenue, activite, gestes, partages, dossiers, contacts] = await Promise.all([
    cadenceDUn(userId, maintenant),
    tenueDe(userId).catch(() => ({ cran: "impeccable" as const, manquements: [] }) as Tenue),
    activiteDe(userId),
    /* UN SEUL PASSAGE SUR LE REGISTRE sert le fil ET les huit compteurs : les
       compter par huit requêtes de plus serait huit fois la même lecture. */
    r.listClientActions({ userId, limit: 2000 }).catch(() => []),
    /* Les clefs partagées, et non les appareils : cette lecture ne rend que
       des identifiants de clef et des comptes, donc aucune empreinte de code
       ni clef publique ne sort vers une page du desk. */
    r.credentialsPartages().catch(() => []),
    r.listClientFiles().catch(() => []),
    r.listContacts().catch(() => []),
  ]);

  const parGenre = {} as Record<Genre, number>;
  for (const g of gestes) parGenre[g.genre] = (parGenre[g.genre] ?? 0) + 1;

  /* La règle du domaine raisonne sur des appareils ; le dépôt ne rend que les
     clefs partagées. On rebâtit juste ce qu'il faut, sans secret. */
  const appareils: TrustedDevice[] = partages
    .filter((c) => c.userIds.includes(userId))
    .flatMap((c) => c.userIds.map((u) => ({ id: `${u}-${c.credentialId}`, userId: u, kind: "passkey" as const, name: "clef d'accès", credentialId: c.credentialId, failures: 0, createdAt: "" })));

  const nomDe = (id: string) => contacts.find((c) => c.id === id)?.name ?? id;
  const phraseDe = (geste: string) => GESTES[geste]?.auDesk ?? geste;

  return {
    cadence,
    tenue,
    activite,
    alertes: alertesDe({ userId, gestes, appareils, dossiers, nomDe, phraseDe }),
    gestes: gestes.slice(0, GESTES_AU_FIL),
    comptes: { total: gestes.length, parGenre },
    /* Le registre rend les plus récents d'abord : le plus ancien ferme la liste. */
    depuis: gestes.at(-1)?.at,
  };
}
