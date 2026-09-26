import "server-only";
import { unstable_cache } from "next/cache";
import { BEAC_ANNONCES, parseBeacRows, readBeacDoc, type BeacAuction } from "./beac";

export interface BeacFeed {
  /** La source a-t-elle répondu ? Sinon, la liste ne prouve rien. */
  ok: boolean;
  auctions: BeacAuction[];
}

/**
 * La page des annonces de la BEAC, lue une fois par heure.
 *
 * Une adjudication s'annonce une semaine avant sa séance : à l'heure près rien
 * ne se joue, et interroger la BEAC à chaque visiteur reviendrait à lui envoyer
 * notre trafic sans raison.
 *
 * Deux choses apprises en la lisant pour de bon.
 *
 * Elle répond 502 de temps en temps, sans motif apparent et pour quelques
 * minutes. D'où un second essai, et surtout la dernière lecture réussie gardée
 * de côté : une panne passagère ne doit pas vider le calendrier pour une heure.
 *
 * Et « aucune séance annoncée » n'est pas la même phrase que « nous n'avons pas
 * pu lire la BEAC ». La première est un fait sur le marché, la seconde un fait
 * sur nous, et les confondre ferait dire au Guichet une chose qu'il ne sait pas.
 * D'où ce « ok » que la page lit avant d'écrire quoi que ce soit.
 */
let lastGood: BeacAuction[] = [];

async function read(): Promise<BeacFeed> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(BEAC_ANNONCES, {
        headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0; +https://guichet.purposecapital.africa)" },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const rows = parseBeacRows(await res.text());
      if (!rows.length) continue;
      lastGood = rows.map(readBeacDoc);
      return { ok: true, auctions: lastGood };
    } catch {
      // On retente une fois, puis on rend ce qu'on avait.
    }
  }
  return { ok: lastGood.length > 0, auctions: lastGood };
}

export const loadBeacAuctions = unstable_cache(read, ["beac-annonces"], { revalidate: 3600, tags: ["beac"] });
