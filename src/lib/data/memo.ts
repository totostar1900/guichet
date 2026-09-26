import "server-only";
import { cache } from "react";
import type { Repository } from "./repository";

/**
 * Une lecture, une fois par requête.
 *
 * Une fiche appelait `listOffers()` trois fois pour la rendre : une fois pour
 * les lignes du même émetteur, une fois pour la position détenue, une fois
 * pour le dernier BTA de référence. Avec `listIntents()` et jusqu'à deux mille
 * valeurs liquidatives à côté, cela fait cinq lectures de tables entières pour
 * une page, en série, chacune payant son aller-retour. C'est ce qui rendait le
 * passage d'une carte à la suivante long sur téléphone.
 *
 * Plutôt que d'aller corriger chaque appelant et d'espérer qu'aucun ne revienne,
 * le dépôt se souvient de ce qu'il a lu pendant la requête en cours. Le sac est
 * créé par `cache()`, donc il naît et meurt avec la requête : rien ne fuit d'un
 * lecteur à l'autre, et deux pages rendues en même temps ne partagent rien.
 *
 * Une écriture vide le sac. Une action serveur qui enregistre puis relit doit
 * voir ce qu'elle vient d'écrire, et un cache qui mentirait là-dessus serait
 * pire que pas de cache du tout.
 *
 * Hors requête (un cron, un script), `cache()` ne mémorise rien : chaque appel
 * reçoit un sac neuf, et tout se comporte comme avant.
 */
const bag = cache((): Map<string, Promise<unknown>> => new Map());

/** Les lectures : tout ce qui rend des données sans en changer. */
const READS = new Set([
  "listOffers",
  "getOffer",
  "listIntents",
  "listEvents",
  "listIntake",
  "getIntake",
  "listOfferVersions",
  "listAudit",
  "listApprovals",
  "listDocuments",
  "getDocument",
  "listContacts",
  "getContact",
  "listStaff",
  "findProfileByEmail",
  "listReference",
  "listWatches",
  "getPrefs",
  "listTemplateTexts",
  "getConsent",
  "getFinancialProfile",
  "getChannelStatus",
  "listDevices",
  "listPushSubscriptions",
  "listNotifications",
  "listInbound",
  "listClientFiles",
  "getClientFile",
  "getClientFileByUser",
  "listBulletins",
  "getBulletin",
  "listQuotes",
  "latestQuotes",
  "quotesOn",
  "quoteActivity",
  "listFundNavs",
  "listFundCurves",
  "latestFundNavs",
  "listIssuerDocuments",
  "listAuctionResults",
  "getAuctionResult",
  "listNews",
  "listCash",
]);

/**
 * `findChannelCode` et `getOffer` d'une action ne sont pas ici par hasard :
 * la première lit un code à usage unique dont la valeur change sous elle, la
 * seconde est gardée parce qu'une page la demande deux fois (la métadonnée
 * puis le corps) sans rien écrire entre.
 */
export function memoRepo(r: Repository, bagOf: () => Map<string, Promise<unknown>> = bag): Repository {
  return new Proxy(r, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function" || typeof prop !== "string") return value;
      const fn = value as (...args: unknown[]) => unknown;
      if (READS.has(prop)) {
        return (...args: unknown[]) => {
          let m: Map<string, Promise<unknown>>;
          try {
            m = bagOf();
          } catch {
            // Pas de requête autour de nous : on appelle sans se souvenir.
            return fn.apply(target, args);
          }
          const k = `${prop}(${JSON.stringify(args)})`;
          const hit = m.get(k);
          if (hit) return hit;
          const p = Promise.resolve(fn.apply(target, args));
          m.set(k, p);
          // Une lecture qui échoue ne doit pas rester en travers de la requête.
          void p.catch(() => m.delete(k));
          return p;
        };
      }
      return (...args: unknown[]) => {
        try {
          bagOf().clear();
        } catch {
          // hors requête : rien à vider
        }
        return fn.apply(target, args);
      };
    },
  });
}
