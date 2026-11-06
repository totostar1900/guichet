/**
 * LES SOURCES D'UNE SÉANCE (6 novembre 2026, planche « import OJA » : 1A · 2A · 3B · 4A · 5A · 6A).
 *
 * Une séance d'adjudication a deux sources possibles : le communiqué du Trésor (PDF, lu puis confirmé par le desk) et l'export OJA (Excel, calculé sur le carnet d'offres).
 * Chacune garde SES valeurs, côte à côte. Les colonnes plates de la séance (annoncé, soumissions, taux…) sont la valeur RETENUE : celle que tout le reste de l'application lit.
 *
 * POURQUOI GARDER LES DEUX. Le desk a demandé de pouvoir exclure une source, même déjà chargée, et de produire des rapports sur une source ou sur les deux ensemble. Une valeur
 * écrasée ne se retrouve plus : les deux jeux restent donc en place, et la valeur retenue se recalcule quand on exclut l'un d'eux.
 *
 * LA RÈGLE DE PRIORITÉ (option 3B), mesurée sur 231 séances rapprochées : le communiqué reste la pièce opposable ; l'Excel est proposé par défaut seulement quand la règle OJA est
 * exacte ET que le chiffre lu se contredit lui-même (erreur d'unité, servi supérieur aux soumissions…). Le PDF est gardé avant le 1er février 2023 pour les soumissions et les
 * soumissionnaires (OJA n'écrit pas encore « sans état » : le total ne se déduit pas des offres), et quand le communiqué publie lui-même la contradiction (« anomaliesVues »).
 * Le desk tranche, en lot ; son choix est écrit avec la valeur écartée et le motif.
 *
 * Module pur : il tourne dans le navigateur (aperçu d'import) comme sur le serveur.
 */

export type Source = "pdf" | "excel";

/** Les grandeurs que le communiqué imprime ET que l'export OJA permet de recalculer. */
export const CHAMPS = ["announced", "bid", "served", "bidders", "coverage", "rateMin", "rateMax", "rateLimit", "rateAvg", "priceMin", "priceMax", "priceLimit", "priceAvg"] as const;
export type Champ = (typeof CHAMPS)[number];
export type Valeurs = Partial<Record<Champ, number>>;

/** Le jour où OJA commence à écrire « sans état » pour une offre rejetée parce que hors de la limite (premier cas relevé : 01/02/2023 12:00). */
export const DATE_SANS_ETAT = "2023-02-01";

export const LIBELLE_CHAMP: Record<Champ, string> = {
  announced: "Montant annoncé",
  bid: "Total des soumissions",
  served: "Total servi",
  bidders: "SVT soumissionnaires",
  coverage: "Taux de couverture",
  rateMin: "Taux minimum",
  rateMax: "Taux maximum",
  rateLimit: "Taux limite",
  rateAvg: "Taux moyen pondéré",
  priceMin: "Prix minimum",
  priceMax: "Prix maximum",
  priceLimit: "Prix limite",
  priceAvg: "Prix moyen pondéré",
};

/** Ce que le desk a tranché pour un champ, et pourquoi : la valeur écartée ne disparaît pas. */
export interface EcartTranche {
  champ: Champ;
  pdf?: number;
  excel?: number;
  retenu: Source;
  motif: string;
  par: string;
  le: string;
}

export interface SourcesSeance {
  pdf?: Valeurs;
  excel?: Valeurs;
  /** Quelle source fait foi, champ par champ. Un champ absent suit la règle : la source qui a une valeur. */
  retenu: Partial<Record<Champ, Source>>;
  /** Une source exclue ne compte plus pour la valeur retenue, ni dans les rapports. Réversible. */
  exclues?: Source[];
  importId?: string;
  /** Fiable : règle exacte (séance depuis le 1er février 2023). À confirmer : état des offres ambigu avant. */
  fiabilite?: "fiable" | "a_confirmer";
  ecarts?: EcartTranche[];
  /** Ce que seul le carnet d'offres sait. Réservé au desk : jamais montré au client. */
  carnet?: { rejeteAuPrix?: number; nbOffres?: number; traiteLe?: string };
}

/** Une séance telle que le dépôt la porte : les colonnes plates et, depuis l'import OJA, ses sources. */
export interface SeancePlate extends Valeurs {
  sessionOn: string;
  sources?: SourcesSeance;
  anomaliesVues?: string[];
}

const ECHELLE = 1000;

/** Les tolérances de comparaison : un million de francs, deux centièmes de point sur un taux moyen, aucune sur un compte. */
export function tolerance(champ: Champ): number {
  if (champ === "announced" || champ === "bid" || champ === "served") return 1_000_000;
  if (champ === "bidders") return 0;
  if (champ === "coverage") return 0.05;
  if (champ === "rateAvg" || champ === "priceAvg") return 0.02;
  return 0.006;
}

export const egal = (champ: Champ, a: number, b: number): boolean => Math.abs(a - b) <= tolerance(champ);

/** Les valeurs lues dans les colonnes plates : tout ce qui existait avant l'import OJA est du communiqué. */
export function valeursPlates(r: Valeurs): Valeurs {
  const v: Valeurs = {};
  for (const c of CHAMPS) {
    const x = r[c];
    if (typeof x === "number" && Number.isFinite(x)) v[c] = x;
  }
  return v;
}

/** Les sources de la séance, même quand elle n'en a jamais eu : elle est alors un communiqué, et seulement cela. */
export function sourcesDe(r: SeancePlate): SourcesSeance {
  if (r.sources) return r.sources;
  const retenu: Partial<Record<Champ, Source>> = {};
  const pdf = valeursPlates(r);
  for (const c of Object.keys(pdf) as Champ[]) retenu[c] = "pdf";
  return { pdf, retenu };
}

const actives = (s: SourcesSeance): Source[] => (["pdf", "excel"] as Source[]).filter((x) => s[x] && !(s.exclues ?? []).includes(x));

/** La valeur retenue d'un champ : la source choisie si elle est active et renseignée, sinon l'autre source active. */
export function valeurRetenue(s: SourcesSeance, champ: Champ): number | undefined {
  const act = actives(s);
  const voulue = s.retenu[champ];
  if (voulue && act.includes(voulue)) {
    const v = s[voulue]?.[champ];
    if (v != null) return v;
  }
  for (const src of act) {
    const v = s[src]?.[champ];
    if (v != null) return v;
  }
  return undefined;
}

export function valeursRetenues(s: SourcesSeance): Valeurs {
  const v: Valeurs = {};
  for (const c of CHAMPS) {
    const x = valeurRetenue(s, c);
    if (x != null) v[c] = x;
  }
  return v;
}

/** Le patch des colonnes plates : une valeur, ou `null` quand plus aucune source active n'en porte (une colonne ne se laisse pas périmée). */
export function patchDesColonnes(s: SourcesSeance): Record<Champ, number | null> {
  const out = {} as Record<Champ, number | null>;
  for (const c of CHAMPS) out[c] = valeurRetenue(s, c) ?? null;
  return out;
}

/** Les champs où les deux sources ont une valeur et diffèrent. */
export function champsEnEcart(s: SourcesSeance): Champ[] {
  if (!s.pdf || !s.excel) return [];
  return CHAMPS.filter((c) => s.pdf![c] != null && s.excel![c] != null && !egal(c, s.pdf![c]!, s.excel![c]!));
}

/** Les écarts que personne n'a encore tranchés. */
export function ecartsOuverts(s: SourcesSeance): Champ[] {
  const tranches = new Set((s.ecarts ?? []).map((e) => e.champ));
  return champsEnEcart(s).filter((c) => !tranches.has(c));
}

export type EtatSource = { sources: Source[]; libelle: "PDF" | "Excel" | "PDF + Excel"; ecartsOuverts: number; concordantes: boolean };

/** Ce que la liste affiche : PDF, Excel, ou les deux (avec ses écarts non tranchés). */
export function etatSource(r: SeancePlate): EtatSource {
  const s = sourcesDe(r);
  const act = actives(s);
  const ouverts = ecartsOuverts(s).length;
  const libelle = act.length === 2 ? "PDF + Excel" : act[0] === "excel" ? "Excel" : "PDF";
  return { sources: act, libelle, ecartsOuverts: ouverts, concordantes: act.length === 2 && champsEnEcart(s).length === 0 };
}

/** D'où vient un champ précis, pour la puce du formulaire. */
export function origineDuChamp(r: SeancePlate, champ: Champ): "PDF" | "Excel" | "PDF + Excel" | undefined {
  const s = sourcesDe(r);
  const act = actives(s);
  const p = act.includes("pdf") ? s.pdf?.[champ] : undefined;
  const x = act.includes("excel") ? s.excel?.[champ] : undefined;
  if (p != null && x != null) return egal(champ, p, x) ? "PDF + Excel" : s.retenu[champ] === "excel" ? "Excel" : "PDF";
  if (p != null) return "PDF";
  if (x != null) return "Excel";
  return undefined;
}

/**
 * Le chiffre lu se contredit-il lui-même ?
 *
 * Les motifs qui ne demandent pas d'ouvrir la pièce : un servi plus grand que les soumissions ou que l'annoncé, une couverture qui n'est pas soumissions ÷ annoncé, un minimum
 * au-dessus du maximum, une limite ou un moyen hors de la fourchette. Aucun ne dit que la pièce est fausse : certains communiqués se contredisent eux-mêmes (c'est alors
 * « anomaliesVues » qui le dit, et le PDF est gardé).
 */
export function seContredit(v: Valeurs): boolean {
  const { announced: a, bid: b, served: s, coverage: c } = v;
  if (s != null && b != null && s > b + 1_000_000) return true;
  if (s != null && a != null && s > a + 1_000_000) return true;
  if (c != null && b != null && a != null && a > 0 && Math.abs((b / a) * 100 - c) > 0.5) return true;
  for (const [lo, hi, li, av] of [[v.rateMin, v.rateMax, v.rateLimit, v.rateAvg], [v.priceMin, v.priceMax, v.priceLimit, v.priceAvg]] as const) {
    if (lo != null && hi != null && lo > hi + 1e-9) return true;
    if (lo != null && hi != null && li != null && (li < lo - 1e-9 || li > hi + 1e-9)) return true;
    if (lo != null && hi != null && av != null && (av < lo - 1e-9 || av > hi + 1e-9)) return true;
  }
  return false;
}

/** Les deux valeurs sont-elles à l'échelle l'une de l'autre, à un facteur mille près ? C'est la signature d'une erreur d'unité de lecture. */
export function erreurDEchelle(pdf: number, excel: number): boolean {
  if (!(pdf > 0) || !(excel > 0)) return false;
  const k = excel / pdf;
  return (k > ECHELLE * 0.7 && k < ECHELLE * 1.4) || (1 / k > ECHELLE * 0.7 && 1 / k < ECHELLE * 1.4);
}

export type Proposition = { source: Source; raison: "concordant" | "erreur_unite" | "pdf_se_contredit" | "ere_ambigue" | "communique_contradictoire" | "a_trancher" | "une_seule_source" };

/** Les champs qu'OJA ne sait pas établir avant le 1er février 2023. */
const AMBIGUS_AVANT = new Set<Champ>(["bid", "bidders", "coverage"]);

/**
 * La source que la règle 3B PROPOSE pour un champ en écart. Elle n'écrit rien : le desk valide, et peut prendre l'autre.
 */
export function proposer(champ: Champ, ctx: { date: string; pdf: Valeurs; excel: Valeurs; anomaliesVues?: string[] }): Proposition {
  const p = ctx.pdf[champ];
  const x = ctx.excel[champ];
  if (p == null && x == null) return { source: "pdf", raison: "une_seule_source" };
  if (p == null) return { source: "excel", raison: "une_seule_source" };
  if (x == null) return { source: "pdf", raison: "une_seule_source" };
  if (egal(champ, p, x)) return { source: "pdf", raison: "concordant" };
  if ((ctx.anomaliesVues ?? []).length > 0) return { source: "pdf", raison: "communique_contradictoire" };
  if ((champ === "announced" || champ === "bid" || champ === "served") && erreurDEchelle(p, x)) return { source: "excel", raison: "erreur_unite" };
  if (ctx.date < DATE_SANS_ETAT && AMBIGUS_AVANT.has(champ)) return { source: "pdf", raison: "ere_ambigue" };
  if (seContredit(ctx.pdf)) return { source: "excel", raison: "pdf_se_contredit" };
  return { source: "pdf", raison: "a_trancher" };
}

/** Les sources d'une séance quand on y verse un jeu OJA : le jeu Excel entre, la règle propose, les choix déjà faits par le desk sont gardés. */
export function verserExcel(r: SeancePlate, excel: Valeurs, opts: { importId: string; fiabilite: "fiable" | "a_confirmer"; carnet?: SourcesSeance["carnet"] }): SourcesSeance {
  const avant = sourcesDe(r);
  const pdf = avant.pdf ?? {};
  const retenu: Partial<Record<Champ, Source>> = { ...avant.retenu };
  const tranches = new Set((avant.ecarts ?? []).map((e) => e.champ));
  for (const c of CHAMPS) {
    if (tranches.has(c)) continue;
    const p = proposer(c, { date: r.sessionOn, pdf, excel, anomaliesVues: r.anomaliesVues });
    if (p.raison === "une_seule_source" || p.raison === "concordant") retenu[c] = pdf[c] != null ? "pdf" : excel[c] != null ? "excel" : retenu[c];
    else retenu[c] = p.source;
  }
  return { ...avant, pdf: avant.pdf, excel, retenu, importId: opts.importId, fiabilite: opts.fiabilite, carnet: opts.carnet ?? avant.carnet };
}

/** Le desk tranche un champ : on garde la valeur écartée, le motif, l'auteur et la date. */
export function trancher(s: SourcesSeance, champ: Champ, source: Source, motif: string, par: string, le: string): SourcesSeance {
  const ecarts = (s.ecarts ?? []).filter((e) => e.champ !== champ);
  ecarts.push({ champ, pdf: s.pdf?.[champ], excel: s.excel?.[champ], retenu: source, motif, par, le });
  return { ...s, retenu: { ...s.retenu, [champ]: source }, ecarts };
}

/** Exclure ou rétablir une source, pour une séance. */
export function exclure(s: SourcesSeance, source: Source, exclue: boolean): SourcesSeance {
  const reste = (s.exclues ?? []).filter((x) => x !== source);
  return { ...s, exclues: exclue ? [...reste, source] : reste };
}

export type ModeDeVue = "retenu" | "pdf" | "excel" | "les-deux";
export const MODES_DE_VUE: ModeDeVue[] = ["retenu", "pdf", "excel", "les-deux"];
export const LIBELLE_VUE: Record<ModeDeVue, string> = { retenu: "Valeurs retenues", pdf: "PDF seul", excel: "Excel seul", "les-deux": "Séances des deux sources" };

/**
 * Les séances telles qu'un rapport les lit, selon la source choisie.
 *
 *  - retenu : les colonnes plates, comme partout ailleurs.
 *  - pdf / excel : seulement les séances qui portent cette source, avec SES valeurs.
 *  - les-deux : seulement les séances qui portent les deux, valeurs retenues.
 * Une source exclue pour la séance ne compte pas.
 */
export function vueParSource<T extends SeancePlate>(rows: T[], mode: ModeDeVue): T[] {
  if (mode === "retenu") return rows;
  const out: T[] = [];
  for (const r of rows) {
    const s = sourcesDe(r);
    const act = actives(s);
    if (mode === "les-deux") {
      if (act.length === 2) out.push(r);
      continue;
    }
    if (!act.includes(mode)) continue;
    const propres = s[mode] ?? {};
    const plat: Record<string, number | undefined> = {};
    for (const c of CHAMPS) plat[c] = propres[c];
    out.push({ ...r, ...plat });
  }
  return out;
}

/** Les champs du communiqué : tout ce que Guichet peut montrer d'une séance. Ni carnet d'offres, ni rejet au prix, ni identité. */
export const CHAMPS_DU_COMMUNIQUE = [...CHAMPS, "networkSize"] as const;

/** Une séance née de l'Excel seul, d'avant le 1er février 2023 : l'état des offres est ambigu, elle attend sa pièce et ne se signe pas en lot. */
export const aConfirmerSurPiece = (r: Pick<SeancePlate, "sources">): boolean => Boolean(r.sources && !r.sources.pdf && r.sources.fiabilite === "a_confirmer");
