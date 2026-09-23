import { EN as EN_BASE } from "./en";
import { EN_MORE } from "./en-desk";
import { EN_CONTENT } from "./en-content";
import { EN_LESSONS } from "./en-lessons";
import { EN_REST } from "./en-rest";
import { EN_PROSE } from "./en-prose";
import { EN_TEMPLATES } from "./en-templates";
import { EN_DATA } from "./en-data";
import { EN_NEWS } from "./en-news";
import { EN_DOCS } from "./en-docs";
import { EN_PARCOURS } from "./en-parcours";

const EN: Record<string, string> = { ...EN_BASE, ...EN_MORE, ...EN_CONTENT, ...EN_LESSONS, ...EN_REST, ...EN_PROSE, ...EN_TEMPLATES, ...EN_DATA, ...EN_NEWS, ...EN_DOCS, ...EN_PARCOURS };

/**
 * Two languages, one source: French is written in the code, English is a
 * dictionary keyed by the French text. `t("Voir la fiche")` returns the
 * English line when the viewer chose English, the French text otherwise
 * a missing entry never breaks anything, it just stays in French.
 * `{name}` placeholders are filled from the params.
 */
/** Le dictionnaire entier, pour que les tests puissent le relire contre lui-même. */
export const EN_ALL: Readonly<Record<string, string>> = EN;

export type Lang = "fr" | "en";
export const LANGS: Lang[] = ["fr", "en"];
export const LANG_COOKIE = "guichet_lang";
export const isLang = (v: unknown): v is Lang => v === "fr" || v === "en";

export type T = (s: string, params?: Record<string, string | number>) => string;

/**
 * Entries whose key holds {placeholders} also work as templates: the French
 * sentence with figures inside (« si servi à 94 % ») matches the key
 * (« si servi à {p} ») and the captured pieces are re-injected into the English.
 */
const TEMPLATES: { re: RegExp; keys: string[]; en: string }[] = Object.entries(EN)
  .filter(([k]) => k.includes("{"))
  .map(([k, en]) => {
    const keys: string[] = [];
    const src = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\{(\w+)\\\}/g, (_, name) => {
      keys.push(name);
      return "(.+?)";
    });
    return { re: new RegExp(`^${src}$`), keys, en };
  })
  .sort((a, b) => b.re.source.length - a.re.source.length);

const SEPARATORS = [" · ", " — ", " ; ", ". ", " : "];

let LOWER: Record<string, string> | null = null;
const lowerIndex = (): Record<string, string> => {
  if (!LOWER) {
    LOWER = {};
    for (const k of Object.keys(EN)) if (k.length <= 120) LOWER[k.toLowerCase()] = EN[k];
  }
  return LOWER;
};

const DATE_EN: Record<string, string> = {
  "janv.": "Jan", "févr.": "Feb", "mars": "Mar", "avr.": "Apr", "mai": "May", "juin": "Jun", "juil.": "Jul", "août": "Aug", "sept.": "Sep", "oct.": "Oct", "nov.": "Nov", "déc.": "Dec",
  "lun.": "Mon", "mar.": "Tue", "mer.": "Wed", "jeu.": "Thu", "ven.": "Fri", "sam.": "Sat", "dim.": "Sun",
  "éch.": "mat.",
};
// a month abbreviation right after a day number ("4 déc. 2026"), a weekday before a day number, or "éch." before a date
const DATE_TOKEN = /(?<=\d )(?:janv\.|févr\.|mars|avr\.|mai|juin|juil\.|août|sept\.|oct\.|nov\.|déc\.)(?![\p{L}])|(?:lun|mar|mer|jeu|ven|sam|dim)\.(?= \d)|éch\.(?= \d)/gu;

function toEnglish(s: string, depth = 0): string {
  const exact = EN[s];
  if (exact != null) return exact;
  if (depth > 0 && !s.endsWith(".")) {
    const dotted = EN[s + "."];
    if (dotted != null) return dotted.replace(/\.$/, "");
  }
  const trimmed = s.trim();
  if (trimmed !== s && trimmed) {
    const inner = toEnglish(trimmed, depth);
    return inner === trimmed ? s : s.replace(trimmed, inner);
  }
  for (const tpl of TEMPLATES) {
    const m = tpl.re.exec(s);
    if (!m) continue;
    let out = tpl.en;
    tpl.keys.forEach((k, i) => {
      out = out.split(`{${k}}`).join(toEnglish(m[i + 1], depth + 1));
    });
    return out;
  }
  // lowercased variants ("justificatif de domicile (< 3 mois)") reuse the original key
  if (s && s !== s.toLowerCase()) {
    /* not a lowercased variant */
  } else if (s) {
    const en = lowerIndex()[s];
    if (en != null) return en[0].toLowerCase() + en.slice(1);
  }
  if (depth < 3) {
    for (const sep of SEPARATORS) {
      if (!s.includes(sep)) continue;
      const parts = s.split(sep);
      if (parts.length < 2) continue;
      const done = parts.map((p) => toEnglish(p, depth + 1));
      if (done.some((p, i) => p !== parts[i])) return done.join(sep);
    }
  }
  // Last resort for data strings (offer titles, notes): French date tokens read in English.
  return s.replace(DATE_TOKEN, (m) => DATE_EN[m] ?? m);
}

export function translate(lang: Lang, s: string, params?: Record<string, string | number>): string {
  let out = lang === "en" ? toEnglish(s) : s;
  if (params) for (const [k, v] of Object.entries(params)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

export const translator =
  (lang: Lang): T =>
  (s, params) =>
    translate(lang, s, params);

/** Locale for Intl formatting (dates, lists). Numbers keep the FCFA convention (space thousands) in both languages. */
export const intlLocale = (lang: Lang): string => (lang === "en" ? "en-GB" : "fr-FR");
