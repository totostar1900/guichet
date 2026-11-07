import "server-only";
import { repo } from "@/lib/data";
import { DEF_INDICATEUR, ETATS, INDICATEURS, lireBanqueMondiale, lireFmi, type IndicateurPays, type PaysIndicateur } from "./pays";

/**
 * LA LECTURE DU FMI ET DE LA BANQUE MONDIALE (7 novembre 2026).
 *
 * Deux API publiques et sans clef. Le FMI rend un indicateur pour tous les pays d'un coup (les Perspectives de l'économie mondiale, mises à jour deux fois par an) ;
 * la Banque mondiale se lit un pays à la fois, parce que la requête groupée des six y dépassait régulièrement le délai.
 *
 * UNE SOURCE QUI FAILLIT NE VIDE RIEN : ce qui a été lu avant reste en base avec sa date, et l'échec est rendu à l'appelant, qui le montre. Remplacer un chiffre par du vide
 * parce qu'une API était lente ferait disparaître des fiches ce qui existait la veille.
 */
const UA = { "user-agent": "Guichet/1.0 (+https://guichet.purposecapital.africa)" };

async function lire(url: string, delai = 30_000): Promise<unknown> {
  let derniere: unknown;
  for (let essai = 0; essai < 3; essai++) {
    try {
      const res = await fetch(url, { headers: UA, cache: "no-store", signal: AbortSignal.timeout(delai) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      derniere = e;
      await new Promise((r) => setTimeout(r, 1500 * (essai + 1)));
    }
  }
  throw derniere instanceof Error ? derniere : new Error("source injoignable");
}

export interface BilanDeLecture {
  lues: number;
  erreurs: string[];
}

/** Lit les deux sources et range ce qui vient. Rend le nombre de valeurs écrites et, pour chaque indicateur qui a échoué, la raison. */
export async function rafraichirIndicateurs(now = new Date()): Promise<BilanDeLecture> {
  const luLe = now.toISOString();
  const annee = now.getUTCFullYear();
  const rows: PaysIndicateur[] = [];
  const erreurs: string[] = [];
  for (const ind of INDICATEURS) {
    const def = DEF_INDICATEUR[ind as IndicateurPays];
    try {
      if (def.source === "FMI") {
        rows.push(...lireFmi(await lire(`https://www.imf.org/external/datamapper/api/v1/${def.code}`), def.code, ind, luLe, annee));
      } else {
        for (const e of ETATS) {
          try {
            rows.push(...lireBanqueMondiale(await lire(`https://api.worldbank.org/v2/country/${e.iso}/indicator/${def.code}?format=json&date=2005:${annee}&per_page=60`, 25_000), ind, luLe));
          } catch (x) {
            erreurs.push(`${def.libelle} · ${e.pays} : ${x instanceof Error ? x.message : "échec"}`);
          }
        }
      }
    } catch (x) {
      erreurs.push(`${def.libelle} : ${x instanceof Error ? x.message : "échec"}`);
    }
  }
  const lues = rows.length ? await repo().upsertPaysIndicateurs(rows) : 0;
  return { lues, erreurs };
}
