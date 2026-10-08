import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { isLang, LANG_COOKIE, translator, type Lang, type T } from "./core";
import { setFormatLangSource } from "@/lib/format";

/**
 * LA LANGUE DE LA REQUÊTE EN COURS, ET NON CELLE DE LA DERNIÈRE SERVIE.
 *
 * « setFormatLang » écrivait une variable de module. Un processus Node sert
 * plusieurs lecteurs à la fois : deux requêtes de langues différentes se la
 * disputaient, et la dernière posée gagnait pour tout ce qui restait à rendre,
 * y compris dans l'autre requête. Un PDF réglementaire pouvait en sortir avec
 * les mois d'un inconnu.
 *
 * « cache » de React donne un objet par requête : c'est la seule mémoire de ce
 * genre qu'on ait ici, et elle suffit. Le formateur reçoit une LECTURE, posée
 * une fois au chargement de ce module ; elle interroge ce casier à chaque date
 * écrite. Hors requête (une tâche de fond, un PDF de cron), le casier rend le
 * français, qui est la langue des documents de la maison.
 */
const casier = cache((): { lang: Lang } => ({ lang: "fr" }));
setFormatLangSource(() => {
  try {
    return casier().lang;
  } catch {
    // Hors d'une requête React, « cache » lève : le français par défaut.
    return "fr";
  }
});

/**
 * LA LANGUE SUIT LA PERSONNE, PAS SEULEMENT LE NAVIGATEUR.
 *
 * Elle ne se lisait qu'au cookie, puis à l'en-tête du navigateur. Le choix
 * était pourtant déjà écrit AU COMPTE depuis le 6 octobre 2026
 * (`ClientPrefs.lang`, posé par display-actions), avec ce commentaire :
 * « gardée au compte pour qu'elle suive ailleurs ». Personne ne la relisait.
 * Résultat mesuré le 8 octobre : le même client voyait le français sur un
 * appareil et l'anglais sur l'autre, selon le cookie de chacun.
 *
 * L'ordre dit ce qu'on respecte, du plus local au plus général : un choix
 * explicite SUR CET APPAREIL d'abord, car c'est le dernier geste de la
 * personne ici ; sinon le choix gardé au compte, qui la suit partout ;
 * sinon la langue du navigateur ; sinon le français, langue de la maison.
 */
const langueDuCompte = async (): Promise<Lang | undefined> => {
  try {
    const { getSession } = await import("@/lib/auth");
    const s = await getSession();
    if (!s || s.role !== "client") return undefined;
    const { repo } = await import("@/lib/data");
    const prefs = await repo().getPrefs(s.userId);
    return isLang(prefs?.lang) ? prefs.lang : undefined;
  } catch {
    // Hors requête, sans base, ou pendant une panne : la langue n'en dépend pas.
    return undefined;
  }
};

/** The viewer's language: this device's choice, else the one kept on the account, else the browser's, else French. */
export const getLang = cache(async (): Promise<Lang> => {
  const jar = await cookies();
  const c = jar.get(LANG_COOKIE)?.value;
  const accept = (await headers()).get("accept-language") ?? "";
  const lang: Lang = isLang(c) ? c : ((await langueDuCompte()) ?? (/^en\b/i.test(accept.split(",")[0] ?? "") ? "en" : "fr"));
  // Les dates de CETTE requête suivront cette langue, et aucune autre.
  casier().lang = lang;
  return lang;
});

export const getT = cache(async (): Promise<T> => translator(await getLang()));
