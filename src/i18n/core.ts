import { EN as EN_BASE } from "./en";
import { EN_MORE } from "./en-desk";
import { EN_CONTENT } from "./en-content";
import { EN_LESSONS } from "./en-lessons";
import { EN_REST } from "./en-rest";

const EN: Record<string, string> = { ...EN_BASE, ...EN_MORE, ...EN_CONTENT, ...EN_LESSONS, ...EN_REST };

/**
 * Two languages, one source: French is written in the code, English is a
 * dictionary keyed by the French text. `t("Voir la fiche")` returns the
 * English line when the viewer chose English, the French text otherwise —
 * a missing entry never breaks anything, it just stays in French.
 * `{name}` placeholders are filled from the params.
 */
export type Lang = "fr" | "en";
export const LANGS: Lang[] = ["fr", "en"];
export const LANG_COOKIE = "guichet_lang";
export const isLang = (v: unknown): v is Lang => v === "fr" || v === "en";

export type T = (s: string, params?: Record<string, string | number>) => string;

export function translate(lang: Lang, s: string, params?: Record<string, string | number>): string {
  let out = lang === "en" ? (EN[s] ?? s) : s;
  if (params) for (const [k, v] of Object.entries(params)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

export const translator =
  (lang: Lang): T =>
  (s, params) =>
    translate(lang, s, params);

/** Locale for Intl formatting (dates, lists). Numbers keep the FCFA convention (space thousands) in both languages. */
export const intlLocale = (lang: Lang): string => (lang === "en" ? "en-GB" : "fr-FR");
