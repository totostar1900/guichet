
const nf = new Intl.NumberFormat("fr-FR");
/**
 * L'ESPACE DES MILLIERS EST UNE INSÉCABLE ORDINAIRE, PAS LA FINE.
 *
 * « Intl » sépare le français par U+202F, une espace FINE insécable. Elle est
 * juste typographiquement et illisible à l'écran : signalé le 4 octobre 2026
 * sur le dos d'une carte, où « 9 059 000 » se lisait « 9059000 » à 11 px. Les
 * grands chiffres de la fiche la montraient, eux, parce qu'ils font le double
 * de cette taille, et c'est ce qui a fait croire si longtemps que le
 * séparateur était posé partout. Il l'était ; il ne se voyait pas.
 *
 * RIEN NE DÉPEND DU CARACTÈRE, et c'est mesuré : les quatre endroits qui
 * relisent un montant saisi (format.ts, grouped.ts, FicheForm, le PDF)
 * retirent déjà les DEUX espaces, et le PDF les aplatit en espace ordinaire
 * avant de composer. Le changement ne touche donc que ce qui s'affiche.
 */
const ESPACE_DES_MILLIERS = " ";
const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const DAYS_FR = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/**
 * LA LANGUE DES DATES, ET POURQUOI CE N'EST PLUS UNE VARIABLE DE MODULE.
 *
 * Elle l'était, et le serveur l'écrivait à chaque requête : un processus Node
 * sert plusieurs lecteurs à la fois, deux requêtes de langues différentes se la
 * disputaient, et la dernière posée gagnait pour tout ce qui restait à rendre.
 * Trois conséquences, par ordre de gravité : un PDF réglementaire pouvait
 * sortir avec les mois d'un autre lecteur ; une page française recevait « 3 Oct
 * 2025 » là où le navigateur réécrivait « 3 oct. 2025 », donc un échec
 * d'hydratation ; et personne ne pouvait le reproduire, puisqu'il faut deux
 * requêtes simultanées pour le voir.
 *
 * Le navigateur n'a pas ce problème : un document, un lecteur, une langue pour
 * toute sa vie. « setFormatLang » reste donc pour lui, et pour les tests.
 * Le serveur, lui, pose une LECTURE au lieu d'une valeur : i18n/server.ts lui
 * donne une fonction qui lit la langue de la requête en cours. La fonction est
 * posée une fois, au chargement du module, pas à chaque requête.
 */
type LangueDesDates = "fr" | "en";
let lireLaLangue: () => LangueDesDates = () => "fr";
/** Une langue fixe, pour toute la vie du document : le navigateur, et les tests. */
export const setFormatLang = (l: LangueDesDates): void => {
  lireLaLangue = () => l;
};
/** Une lecture par requête : le serveur la pose une fois, voir src/i18n/server.ts. */
export const setFormatLangSource = (lecture: () => LangueDesDates): void => {
  lireLaLangue = lecture;
};
const MONTHS = new Proxy([] as string[], { get: (_t, i) => (lireLaLangue() === "en" ? MONTHS_EN : MONTHS_FR)[i as unknown as number] });
const DAYS = new Proxy([] as string[], { get: (_t, i) => (lireLaLangue() === "en" ? DAYS_EN : DAYS_FR)[i as unknown as number] });

export const fmt = (n: number): string => nf.format(Math.round(n)).split(" ").join(ESPACE_DES_MILLIERS);

export const fmtPct = (v: number, decimals = 1): string =>
  `${v.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} %`;

/** Price in % of nominal : 3 decimals only when needed. */
export const fmtPrice = (v: number): string => fmtPct(v, Number.isInteger(v) ? 0 : 3);

/**
 * L'HEURE DE LA PLACE, ÉPINGLÉE.
 *
 * Ces quatre formateurs lisaient l'heure LOCALE du moteur qui les exécute. Le
 * même horodatage sortait donc « 18 h 42 » sur Vercel, qui tourne en UTC, et
 * « 21 h 42 » dans un navigateur à UTC+3 : deux heures différentes pour la même
 * pièce, et surtout un texte rendu par le serveur que le client réécrit, donc
 * un échec d'hydratation (React #418) qui casse la page entière. Mesuré le
 * 8 octobre 2026 sur « Ouvrir un compte », où plus aucun bouton ne répondait.
 *
 * La place est en Afrique centrale, UTC+01:00 toute l'année, sans heure d'été :
 * un décalage fixe suffit, et les parties se lisent ensuite en UTC, donc à
 * l'identique partout. Trois formes d'entrée, trois lectures :
 *
 *   « 2026-10-08 »             une date seule ne porte pas d'heure : son jour
 *                              est son jour, on ne le déplace pas.
 *   « 2026-09-22T09:00:00 »    sans fuseau : c'est l'heure écrite sur la pièce,
 *                              donc déjà l'heure de la place, lue telle quelle.
 *   « 2026-10-07T23:30:00Z »   un instant : projeté sur la place, ici le
 *                              8 octobre à 00 h 30.
 */
const ZONE_MINUTES = 60;
const SANS_FUSEAU = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/;
const AVEC_FUSEAU = /(?:Z|[+-]\d{2}:?\d{2})$/i;

function partsDeLaPlace(iso: string): { a: number; m: number; j: number; js: number; h: number; min: number } {
  const brut = SANS_FUSEAU.exec(iso);
  if (brut && !AVEC_FUSEAU.test(iso)) {
    const [, a, m, j, h, min] = brut;
    return { a: +a, m: +m - 1, j: +j, js: new Date(Date.UTC(+a, +m - 1, +j)).getUTCDay(), h: +(h ?? 0), min: +(min ?? 0) };
  }
  const z = new Date(new Date(iso).getTime() + ZONE_MINUTES * 60_000);
  return { a: z.getUTCFullYear(), m: z.getUTCMonth(), j: z.getUTCDate(), js: z.getUTCDay(), h: z.getUTCHours(), min: z.getUTCMinutes() };
}

const hhmm = (h: number, min: number): string => `${String(h).padStart(2, "0")}${lireLaLangue() === "en" ? ":" : " h "}${String(min).padStart(2, "0")}`;

export const fmtDate = (iso: string, withYear = true): string => {
  const d = partsDeLaPlace(iso);
  return `${d.j} ${MONTHS[d.m]}${withYear ? ` ${d.a}` : ""}`;
};

export const fmtDateTime = (iso: string): string => {
  const d = partsDeLaPlace(iso);
  return `${DAYS[d.js]} ${d.j} ${MONTHS[d.m]} ${hhmm(d.h, d.min)}`;
};

/** Weekday, day, month and year : the heading of a day in a feed. */
export const fmtDay = (iso: string): string => {
  const d = partsDeLaPlace(iso);
  return `${DAYS[d.js]} ${d.j} ${MONTHS[d.m]} ${d.a}`;
};

export const fmtTime = (iso: string): string => {
  const d = partsDeLaPlace(iso);
  return `${String(d.h).padStart(2, "0")}:${String(d.min).padStart(2, "0")}`;
};

export const fmtMillions = (n: number): string => `${nf.format(Math.round(n / 1e6))} M`;

/** "10 000 000" → 10000000 */
export const parseAmount = (s: string | null | undefined): number => Number(String(s ?? "").replace(/[^\d]/g, "")) || 0;
/** Fund units keep their decimals: "175,207" → 175.207 (thousands spaces removed, comma or dot accepted). */
export const parseUnits = (s: string | null | undefined): number => {
  const t = String(s ?? "").replace(/[\s  ]/g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) / 1000 : 0;
};

/** YYYY-MM-DD in local time (toISOString would shift the day in UTC+1). */
export const localIso = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Human units for FCFA amounts: 1 234 567 890 → "1,23 Md", 45 600 000 → "45,6 M",
 * 812 000 → "812 k", 4 500 → "4 500". `unit` appends " FCFA".
 */
export const fmtUnits = (n: number, unit = false): string => {
  const a = Math.abs(n);
  const s =
    a >= 1e9
      ? `${(n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} Md`
      : a >= 1e6
        ? `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`
        : a >= 1e4
          ? `${(n / 1e3).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} k`
          : nf.format(Math.round(n));
  return unit ? `${s} FCFA` : s;
};

/** The scale that fits a whole series, so a table reads in one unit: "millions de FCFA". */
export const pickScale = (values: number[]): { div: number; label: string; short: string } => {
  const m = Math.max(0, ...values.map((v) => Math.abs(v)));
  if (m >= 1e10) return { div: 1e9, label: "milliards de FCFA", short: "Md FCFA" };
  if (m >= 1e7) return { div: 1e6, label: "millions de FCFA", short: "M FCFA" };
  if (m >= 1e4) return { div: 1e3, label: "milliers de FCFA", short: "k FCFA" };
  return { div: 1, label: "FCFA", short: "FCFA" };
};
export const fmtScaled = (n: number, div: number, decimals = 1): string => (n / div).toLocaleString("fr-FR", { minimumFractionDigits: div === 1 ? 0 : decimals, maximumFractionDigits: div === 1 ? 0 : decimals });

/** "6 87 67 67 67" → "+237687676767"; a number already in +E.164 is kept. */
export const normalizePhone = (s: string | undefined): string => {
  const d = String(s ?? "").replace(/[^\d+]/g, "");
  if (!d) return "";
  if (d.startsWith("+")) return d;
  if (d.startsWith("00")) return `+${d.slice(2)}`;
  return d.length === 9 ? `+237${d}` : `+${d}`;
};

/** FCFA in a short form : 1,2 Md · 340 M · 850 k. */
export const money = (v: number): string => {
  const d = (x: number, n: number) => x.toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n });
  return v >= 1e9 ? `${d(v / 1e9, 1)} Md` : v >= 1e6 ? `${d(v / 1e6, v >= 1e8 ? 0 : 1)} M` : v >= 1e3 ? `${d(v / 1e3, 0)} k` : fmt(v);
};

/**
 * Le texte d'un humain, rendu inoffensif avant d'entrer dans un fragment HTML.
 *
 * Le fil du desk affiche ses lignes en HTML, parce qu'elles portent des gras et
 * des liens que le code écrit. Ce que quelqu'un a tapé n'en fait pas partie.
 */
export const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Une date, avec son heure seulement si quelqu'un l'a donnée.
 *
 * Les communiqués ne se ressemblent pas : le Cameroun écrit « lundi 21 septembre
 * 2026 avant 09 h 00 », le Congo écrit « mardi 22 septembre 2026 » et s'arrête
 * là. Une fiche qui affiche une heure dans les deux cas en invente une, et un
 * client qui arrive à 10 h sur une clôture qu'il croyait à midi ne se console pas
 * en apprenant que le chiffre venait d'une valeur par défaut.
 *
 * Minuit tient lieu de silence : aucune séance ne se clôt à minuit, et c'est ce
 * que pose l'ingestion quand le document ne dit rien. L'heure reparaît dès que
 * le desk la lit sur la pièce et la saisit.
 */
export const fmtWhen = (iso: string): string => (/T00:00(:00)?/.test(iso) ? fmtDate(iso) : fmtDateTime(iso));
