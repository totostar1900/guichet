import "server-only";
import { cache } from "react";
import { revalidateTag, updateTag } from "next/cache";
import { ETIQUETTE_REFERENTIEL } from "@/lib/reference";
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
  "findAdvisor",
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
  "marketMovements",
  "listFundNavs",
  "listFundCurves",
  "latestFundNavs",
  "listIssuerDocuments",
  "listAuctionResults",
  "getAuctionResult",
  "listNews",
  "listCash",
  "listRelances",
  /* Une LECTURE que le classement par le nom avait laissee dehors : elle ne
     touche pas la table du referentiel, elle rend les nominaux de reference
     d une seance. Non classee, elle VIDAIT le memo a chaque appel, puisque
     tout ce qui n est pas une lecture est traite comme une ecriture. Trouvee
     par le cliquet du referentiel, qui cherchait autre chose. */
  "nominauxDeReference",
]);

/**
 * `findChannelCode` et `getOffer` d'une action ne sont pas ici par hasard :
 * la première lit un code à usage unique dont la valeur change sous elle, la
 * seconde est gardée parce qu'une page la demande deux fois (la métadonnée
 * puis le corps) sans rien écrire entre.
 */
/**
 * LES ÉCRITURES DU RÉFÉRENTIEL, NOMMÉES UNE FOIS.
 *
 * Le référentiel est gardé entre les requêtes (voir « lib/reference.ts »), et
 * la seule chose qui le vide est une écriture. Elles passent TOUTES par le
 * dépôt, donc on purge ici plutôt qu à chaque appelant : six pages du desk
 * écrivent aujourd hui, et la septième n aurait pas pensé à le faire.
 *
 * UN ESSAI REFUSE QU UNE MÉTHODE NOUVELLE ÉCHAPPE AU CLASSEMENT :
 * « reference-purgee.test.ts » compare cette liste à l interface du dépôt, et
 * tombe si une méthode portant « Reference » n est ni une lecture ni ici. Une
 * liste tenue à la main sans garde finit toujours par en oublier une, et
 * celle-ci servirait un barème périmé sans bruit.
 */
const ECRITURES_DU_REFERENTIEL = new Set(["upsertReference", "deleteReference", "saveReferenceDraft", "publishReference", "discardReference"]);

/**
 * La purge, et les deux raisons de sa forme.
 *
 * « updateTag » D ABORD, PARCE QU ON DOIT LIRE CE QU ON VIENT D ECRIRE. Il
 * expire l étiquette TOUT DE SUITE et n existe que dans une action serveur,
 * ce qui est exactement le cas de toutes les écritures du référentiel : le
 * desk publie un barème depuis un formulaire, et la page qui suit doit
 * montrer le nouveau. « revalidateTag », lui, programme une expiration : il
 * servirait encore l ancien une fois, et une fois suffit pour tromper.
 *
 * LE REPLI, ET POURQUOI IL NE JETTE PAS. Hors d une action, « updateTag »
 * refuse. Un cron, un script ou un essai qui écrivent le référentiel ne
 * doivent pas échouer parce que le cache a mal pris : une écriture passe
 * avant son cache. On tente alors l expiration immédiate, puis on renonce.
 */
function purgerLeReferentiel(): void {
  try {
    updateTag(ETIQUETTE_REFERENTIEL);
    return;
  } catch {
    /* pas dans une action serveur : on tente l autre voie */
  }
  try {
    revalidateTag(ETIQUETTE_REFERENTIEL, { expire: 0 });
  } catch {
    /* hors requête : il n y a aucun cache de page à vider */
  }
}

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
        if (ECRITURES_DU_REFERENTIEL.has(prop)) purgerLeReferentiel();
        return fn.apply(target, args);
      };
    },
  });
}
