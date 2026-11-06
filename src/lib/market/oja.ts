import { DATE_SANS_ETAT, type Valeurs } from "./sources-seance";

/**
 * LES EXPORTS OJA, LUS PAR LE DESK (6 novembre 2026).
 *
 * OJA est la plateforme d'adjudication des Trésors : chaque offre y est une ligne, avec son état. Trois exports : « Toutes les offres », « Enchères » (une ligne par instruction de
 * séance : son état, son montant annoncé) et « Titres » (le référentiel : nominal, coupon, échéance). Ce module les agrège en SÉANCES finales, avec les mêmes grandeurs que le
 * communiqué du Trésor. Pur : il tourne dans le navigateur, où le fichier est lu et réduit AVANT d'être envoyé (un export pèse 8 Mo, et les comptes acheteurs n'ont aucune raison
 * de quitter le poste du desk : on n'envoie que des comptes).
 *
 * LES RÈGLES, établies sur 231 séances rapprochées de celles du Desk (classeur « Rapprochement OJA × Desk ») :
 *  R1 annoncé      = montant de l'instruction finale (« Finie ») × valeur nominale du titre. Une instruction « Rejetée » suivie d'une « Finie » est une relance : seule la dernière compte.
 *  R2 ensemble E   = offres acceptées + offres rejetées au prix. Depuis le 1er février 2023 : celles SANS ÉTAT. Avant : les « Annulée » dont le prix dépasse la limite.
 *                    Les autres « Annulée » sont des retraits et des ressaisies : leur volume égale celui des acceptées, les compter doublerait la demande.
 *  R3 soumissions  = somme des volumes de E.
 *  R4 servi        = min(somme des acceptées ; annoncé) : les acceptées incluent le rationnement à la limite, le communiqué plafonne à l'annoncé.
 *  R5 limite       = taux : le plus haut taux accepté (bon) ; prix : le plus bas prix accepté (obligation).
 *  R6 min et max   = sur l'ensemble E.
 *  R7 moyen        = moyenne des offres acceptées pondérée par le SERVI : les meilleurs prix d'abord, le reliquat à la limite.
 *  R8 soumissionnaires = comptes acheteurs distincts parmi TOUTES les offres (les annulées comprises), sauf « Reçue » : celui qui a retiré son offre a bien soumissionné.
 *  R10 une séance dont toutes les instructions sont « Rejetée », ou dont une offre est « Reçue » (le carnet du jour), n'est pas importée.
 *
 * LA COLONNE « DATE DE CUTOFF » N'EST PAS UTILISÉE : 32 % des offres acceptées sont créées après elle, ce n'est pas l'heure limite de dépôt.
 */

export const PAYS_DU_TRESOR = { GA: "Gabon", CM: "Cameroun", CG: "Congo", TD: "Tchad", CF: "RCA", GQ: "Guinée éq." } as const;
export type PrefixePays = keyof typeof PAYS_DU_TRESOR;
export const NOMINAL_PAR_DEFAUT = { BTA: 1_000_000, OTA: 10_000 } as const;
export const JOURS_DE_RAPPROCHEMENT = 7;

export type LigneOja = Record<string, unknown>;
export type TypeFichier = "offres" | "encheres" | "titres";

/** Le fichier se reconnaît à ses en-têtes, jamais à son nom. */
export function reconnaitreFichier(entetes: string[]): TypeFichier | undefined {
  const e = new Set(entetes.map((h) => String(h ?? "").trim()));
  if (e.has("Titre") && e.has("Etat") && e.has("Volume") && e.has("Prix ajusté") && e.has("Compte du détenteur d'achteur")) return "offres";
  if (e.has("Code des enchères") && e.has("multy auction code") && e.has("Etat")) return "encheres";
  if (e.has("Type de titre") && e.has("Terme") && e.has("Code")) return "titres";
  return undefined;
}

const ENTETES_REQUIS: Record<TypeFichier, string[]> = {
  offres: ["Titre", "Etat", "Type d'opération", "Volume", "Prix ajusté", "Date de confirmation", "Compte du détenteur d'achteur"],
  encheres: ["Titre", "Etat", "Montant", "Date de confirmation", "Type d'opération"],
  titres: ["Code", "Valeur nominale"],
};

/** Les colonnes qui manquent : on refuse le fichier plutôt que de calculer sur du vide. */
export function entetesManquants(type: TypeFichier, entetes: string[]): string[] {
  const e = new Set(entetes.map((h) => String(h ?? "").trim()));
  return ENTETES_REQUIS[type].filter((h) => !e.has(h));
}

/** « 2026-10-21 » depuis une date du classeur (objet Date, texte ISO ou numéro de série Excel). */
export function jourDe(v: unknown): string | undefined {
  if (v == null || v === "") return undefined;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v.toISOString().slice(0, 10);
  if (typeof v === "number") return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : undefined;
}

const nombre = (v: unknown): number | undefined => {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};
const texte = (v: unknown): string => (v == null ? "" : String(v).trim());
/** « 13S ( 13 semaines ) » → « 13 semaines » ; « 2A ( 2 ans ) » → « 2 ans ». */
export function dureeDe(v: unknown): string | undefined {
  const m = texte(v).match(/\(\s*([^)]+?)\s*\)/);
  return m ? m[1].replace(/\s+/g, " ") : undefined;
}
const codeIsin = (v: unknown): string => texte(v).replace(/\s/g, "").slice(0, 12).toUpperCase();

/** Le Trésor et l'instrument d'un code : « GA1100002359 » est un bon gabonais (1), « GA2A00000480 » une obligation (2). */
export function identiteDuCode(code: string): { pays: string; prefixe: PrefixePays; instrument: "BTA" | "OTA" } | undefined {
  const p = code.slice(0, 2) as PrefixePays;
  if (!(p in PAYS_DU_TRESOR)) return undefined;
  const c = code.charAt(2);
  if (c !== "1" && c !== "2") return undefined;
  return { pays: PAYS_DU_TRESOR[p], prefixe: p, instrument: c === "1" ? "BTA" : "OTA" };
}

export interface SeanceOja {
  isin: string;
  date: string;
  pays: string;
  instrument: "BTA" | "OTA";
  /** Les valeurs, dans les unités du Desk (francs, %). */
  valeurs: Valeurs;
  /** Du fichier Titres : « 13 semaines », « 2 ans » ; le coupon et l'échéance d'une obligation. */
  tenor?: string;
  couponRate?: number;
  maturityOn?: string;
  fiabilite: "fiable" | "a_confirmer";
  carnet: { rejeteAuPrix: number; nbOffres: number; traiteLe?: string };
}

export interface RapportOja {
  seances: SeanceOja[];
  ignorees: { enCours: number; rejetees: number; sansAnnonce: number; horsPerimetre: number; sansOffreRetenue: number };
  lignes: { offres: number; encheres: number; titres: number };
  /** Les séances que toutes leurs instructions disent « Rejetée » : jamais importées ; gardées ici pour signaler un résultat du Desk qu'OJA contredit. */
  rejeteesCles: string[];
  avertissements: string[];
  plage?: { du: string; au: string };
}

interface Offre {
  etat: "acc" | "vide" | "ann" | "rec";
  volume: number;
  prix?: number;
  compte: string;
  traite?: string;
}

const etatOffre = (v: unknown): Offre["etat"] | undefined => {
  const e = texte(v);
  if (e === "Acceptée") return "acc";
  if (e === "Annulée") return "ann";
  if (e === "Reçue") return "rec";
  if (e === "") return "vide";
  return undefined;
};

/** La fourchette de l'ensemble E et ses statistiques, pour un lot d'offres d'une même séance. */
function calculer(instrument: "BTA" | "OTA", date: string, offres: Offre[], annonce: number | undefined): { valeurs: Valeurs; rejeteAuPrix: number } | undefined {
  const taux = instrument === "BTA";
  const acc = offres.filter((o) => o.etat === "acc");
  const vid = offres.filter((o) => o.etat === "vide");
  const ann = offres.filter((o) => o.etat === "ann");
  const prixAcc = acc.map((o) => o.prix).filter((p): p is number => p != null);
  const limite = prixAcc.length ? (taux ? Math.max(...prixAcc) : Math.min(...prixAcc)) : undefined;
  const horsLimite = limite == null ? [] : ann.filter((o) => o.prix != null && (taux ? o.prix > limite + 1e-9 : o.prix < limite - 1e-9));
  const rejetees = date >= DATE_SANS_ETAT ? vid : horsLimite;
  const E = [...acc, ...rejetees];
  const volAcc = acc.reduce((s, o) => s + o.volume, 0);
  const soum = E.reduce((s, o) => s + o.volume, 0);
  const servi = annonce != null ? Math.min(volAcc, annonce) : undefined;
  const prixE = E.map((o) => o.prix).filter((p): p is number => p != null);
  let moyen: number | undefined;
  if (servi != null && servi > 0 && acc.length) {
    const tri = [...acc].filter((o) => o.prix != null).sort((a, b) => (taux ? a.prix! - b.prix! : b.prix! - a.prix!));
    let reste = servi;
    let somme = 0;
    let poids = 0;
    for (const o of tri) {
      const part = Math.min(o.volume, reste);
      reste -= part;
      somme += part * o.prix!;
      poids += part;
      if (reste <= 0) break;
    }
    if (poids > 0) moyen = somme / poids;
  }
  const comptes = new Set(offres.filter((o) => o.etat !== "rec").map((o) => o.compte).filter(Boolean));
  const v: Valeurs = {};
  if (annonce != null) v.announced = annonce;
  if (E.length) v.bid = soum;
  if (servi != null) v.served = servi;
  if (comptes.size) v.bidders = comptes.size;
  if (annonce != null && annonce > 0 && E.length) v.coverage = Math.round((soum / annonce) * 10000) / 100;
  const r2 = (x: number) => Math.round(x * 10000) / 10000;
  if (prixE.length) {
    const mn = r2(Math.min(...prixE));
    const mx = r2(Math.max(...prixE));
    if (taux) { v.rateMin = mn; v.rateMax = mx; } else { v.priceMin = mn; v.priceMax = mx; }
  }
  if (limite != null) { if (taux) v.rateLimit = r2(limite); else v.priceLimit = r2(limite); }
  if (moyen != null) { if (taux) v.rateAvg = r2(moyen); else v.priceAvg = r2(moyen); }
  return { valeurs: v, rejeteAuPrix: rejetees.reduce((s, o) => s + o.volume, 0) };
}

/**
 * Les séances finales d'un jeu d'exports. « Toutes les offres » est exigé ; « Enchères » et « Titres » sont recommandés : sans eux, l'annoncé reste inconnu (donc le servi et
 * la couverture) et le nominal est celui par défaut, ce que le rapport dit.
 */
export function agregerOja(f: { offres: LigneOja[]; encheres?: LigneOja[]; titres?: LigneOja[] }): RapportOja {
  const avertissements: string[] = [];
  const ignorees = { enCours: 0, rejetees: 0, sansAnnonce: 0, horsPerimetre: 0, sansOffreRetenue: 0 };
  const rejeteesCles: string[] = [];

  // Titres : le nominal de chaque code.
  const nominal = new Map<string, number>();
  const fiche = new Map<string, { tenor?: string; coupon?: number; echeance?: string }>();
  for (const t of f.titres ?? []) {
    const c = codeIsin(t["Code"]);
    const n = nombre(t["Valeur nominale"]);
    if (c && n && !nominal.has(c)) nominal.set(c, n);
    if (c && !fiche.has(c)) fiche.set(c, { tenor: dureeDe(t["Terme"]), coupon: nombre(t["Taux"]), echeance: jourDe(t["Date d'échéance"]) });
  }
  if (!f.titres?.length) avertissements.push("Fichier « Titres » absent : valeur nominale par défaut (1 000 000 pour un bon, 10 000 pour une obligation).");

  // Enchères : l'état final de chaque séance et son annoncé.
  interface Ench { etats: Set<string>; montant: number }
  const encheres = new Map<string, Ench>();
  for (const e of f.encheres ?? []) {
    if (texte(e["Type d'opération"]) !== "IPO") continue;
    const c = codeIsin(e["Titre"]);
    const d = jourDe(e["Date de confirmation"]);
    if (!c || !d || !identiteDuCode(c)) continue;
    const k = `${c}|${d}`;
    const x = encheres.get(k) ?? { etats: new Set<string>(), montant: 0 };
    const etat = texte(e["Etat"]);
    x.etats.add(etat);
    if (etat === "Finie" || etat === "Partiallement finie") x.montant += nombre(e["Montant"]) ?? 0;
    encheres.set(k, x);
  }
  if (!f.encheres?.length) avertissements.push("Fichier « Enchères » absent : montant annoncé inconnu, donc ni servi ni couverture.");

  // Offres, groupées par séance.
  const groupes = new Map<string, Offre[]>();
  let du = "";
  let au = "";
  for (const o of f.offres) {
    const c = codeIsin(o["Titre"]);
    const id = identiteDuCode(c);
    if (!id || texte(o["Type d'opération"]) !== "IPO") { ignorees.horsPerimetre++; continue; }
    const d = jourDe(o["Date de confirmation"]);
    const etat = etatOffre(o["Etat"]);
    const volume = nombre(o["Volume"]);
    if (!d || !etat || volume == null) { ignorees.horsPerimetre++; continue; }
    if (!du || d < du) du = d;
    if (!au || d > au) au = d;
    const k = `${c}|${d}`;
    const l = groupes.get(k) ?? [];
    l.push({ etat, volume, prix: nombre(o["Prix ajusté"]), compte: texte(o["Compte du détenteur d'achteur"]), traite: jourDe(o["Heure de modification"]) });
    groupes.set(k, l);
  }

  let sansNominal = 0;
  const seances: SeanceOja[] = [];
  for (const [k, offres] of groupes) {
    const [isin, date] = k.split("|");
    const id = identiteDuCode(isin)!;
    const ench = encheres.get(k);
    if (offres.some((o) => o.etat === "rec")) { ignorees.enCours++; continue; }
    if (ench && ench.etats.size && ![...ench.etats].some((e) => e === "Finie" || e === "Partiallement finie")) {
      if ([...ench.etats].every((e) => e === "Rejetée")) { ignorees.rejetees++; rejeteesCles.push(k); continue; }
      ignorees.enCours++;
      continue;
    }
    let annonce: number | undefined;
    if (ench && ench.montant > 0) {
      let nom = nominal.get(isin);
      if (!nom) { nom = NOMINAL_PAR_DEFAUT[id.instrument]; sansNominal++; }
      annonce = ench.montant * nom;
    } else ignorees.sansAnnonce++;
    const calc = calculer(id.instrument, date, offres, annonce);
    if (!calc || !offres.some((o) => o.etat === "acc")) { ignorees.sansOffreRetenue++; continue; }
    const traite = offres.map((o) => o.traite).filter(Boolean).sort().pop();
    seances.push({
      isin,
      date,
      pays: id.pays,
      instrument: id.instrument,
      valeurs: calc.valeurs,
      tenor: fiche.get(isin)?.tenor,
      couponRate: id.instrument === "OTA" ? fiche.get(isin)?.coupon : undefined,
      maturityOn: fiche.get(isin)?.echeance,
      fiabilite: date >= DATE_SANS_ETAT && annonce != null ? "fiable" : "a_confirmer",
      carnet: { rejeteAuPrix: calc.rejeteAuPrix, nbOffres: offres.length, traiteLe: traite },
    });
  }
  if (sansNominal) avertissements.push(`${sansNominal} séance(s) sans valeur nominale dans « Titres » : nominal par défaut.`);
  seances.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.isin < b.isin ? -1 : 1));
  return {
    seances,
    ignorees,
    rejeteesCles,
    lignes: { offres: f.offres.length, encheres: f.encheres?.length ?? 0, titres: f.titres?.length ?? 0 },
    avertissements,
    plage: du ? { du, au } : undefined,
  };
}

/** La séance du Desk qui correspond à une séance OJA : même code et même jour ; à défaut, le jour le plus proche à sept jours près (le Tchad date ses séances deux jours avant OJA). */
export function apparier<T extends { codeEmission?: string; sessionOn: string }>(s: Pick<SeanceOja, "isin" | "date">, desk: T[], dejaPris: Set<T> = new Set()): { seance: T; ecartJours: number } | undefined {
  const memeCode = desk.filter((d) => codeIsin(d.codeEmission) === s.isin && !dejaPris.has(d));
  const exacte = memeCode.find((d) => d.sessionOn === s.date);
  if (exacte) return { seance: exacte, ecartJours: 0 };
  const t0 = Date.parse(`${s.date}T12:00:00Z`);
  let meilleure: { seance: T; ecartJours: number } | undefined;
  for (const d of memeCode) {
    const e = Math.round((Date.parse(`${d.sessionOn}T12:00:00Z`) - t0) / 86400000);
    if (Math.abs(e) <= JOURS_DE_RAPPROCHEMENT && (!meilleure || Math.abs(e) < Math.abs(meilleure.ecartJours))) meilleure = { seance: d, ecartJours: -e };
  }
  return meilleure;
}

/** Le journal d'un import : de quoi afficher le dernier, et en exclure un entier. Les fichiers ne sont pas gardés (ils portent les comptes acheteurs). */
export interface OjaImport {
  id: string;
  at: string;
  by: string;
  fichiers: { type: TypeFichier; nom: string; lignes: number }[];
  plage?: { du: string; au: string };
  seances: number;
  nouvelles: number;
  rapprochees: number;
  concordantes: number;
  ecarts: number;
  ignorees: number;
  exclu: boolean;
}
export type NouvelImportOja = Omit<OjaImport, "id" | "at">;

export { codeIsin };
