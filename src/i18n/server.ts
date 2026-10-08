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

/** The viewer's language: the cookie set by the switch, else the browser's preference, else French. */
export const getLang = cache(async (): Promise<Lang> => {
  const jar = await cookies();
  const c = jar.get(LANG_COOKIE)?.value;
  const accept = (await headers()).get("accept-language") ?? "";
  const lang: Lang = isLang(c) ? c : /^en\b/i.test(accept.split(",")[0] ?? "") ? "en" : "fr";
  // Les dates de CETTE requête suivront cette langue, et aucune autre.
  casier().lang = lang;
  return lang;
});

export const getT = cache(async (): Promise<T> => translator(await getLang()));
