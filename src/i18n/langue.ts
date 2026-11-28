/**
 * LA PARTIE LÉGÈRE DE L'I18N (28 novembre 2026, allègement du premier chargement).
 *
 * Le dictionnaire anglais pèse près d'1,4 Mo de source et partait dans le navigateur de chaque lecteur, français compris : c'était la moitié du JavaScript du premier affichage. Ce qui ne dépend
 * pas du dictionnaire (les types, le cookie, le français, qui est le texte lui-même) vit ici ; le navigateur n'importe `core.ts` que pour un lecteur anglais.
 */
export type Lang = "fr" | "en";
export const LANGS: Lang[] = ["fr", "en"];
export const LANG_COOKIE = "guichet_lang";
export const isLang = (v: unknown): v is Lang => v === "fr" || v === "en";

export type T = (s: string, params?: Record<string, string | number>) => string;

/** Les paramètres `{nom}` se posent dans le texte, dans toute langue. */
export const poserLesParametres = (s: string, params?: Record<string, string | number>): string => {
  let out = s;
  if (params) for (const [k, v] of Object.entries(params)) out = out.split(`{${k}}`).join(String(v));
  return out;
};

/** Le traducteur français : le texte est déjà en français. */
export const traducteurFrancais: T = (s, params) => poserLesParametres(s, params);

/** Locale for Intl formatting (dates, lists). Numbers keep the FCFA convention (space thousands) in both languages. */
export const intlLocale = (lang: Lang): string => (lang === "en" ? "en-GB" : "fr-FR");
