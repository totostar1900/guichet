import { REGLE_FERMEE, recetteDeTiers, retrocessionDuMois, type RegleDeFrais } from "@/lib/domain/frais";
import { encoursMoyenDuMois, finDuMois, type MouvementDeParts, type VlDuJour } from "@/lib/domain/retrocession";

/**
 * LE COMMISSIONNEMENT : CE QUE CHAQUE FONDS VERSE À LA MAISON, FONDS PAR FONDS (25 novembre 2026, planche « Deux tableaux : la tarification client et le commissionnement interne »).
 *
 * DEUX TABLEAUX, UNE SEULE CLÉ COMMUNE. ① La tarification client dit ce que le client paie (une ligne totale par opération) ; elle se lit dans son espace. ② Le commissionnement dit ce que
 * la maison reçoit de ses partenaires ; il est LU ET MODIFIÉ PAR LA DIRECTION SEULE et ne sort jamais. Le lien est le code du fonds. ② peut lire ① (la direction voit la marge) ; ① ne lit
 * jamais ② : ce module n'importe rien du barème public autre que le calcul des sommes, et un test le garde.
 *
 * LES COMMISSIONS SONT PAR FONDS (le client : « en fait les commissions sont par fonds »). La société de gestion REGROUPE : elle porte le code partenaire, le relevé qu'on lui adresse, la somme
 * des dus de ses fonds. Chaque fonds porte ses propres conditions, versionnées par date : une condition qui change ne réécrit jamais le passé.
 *
 * LES CODES. Un code société (`SG-0007`) et un code fonds (`FD-0021`), internes, attribués une fois, jamais réutilisés, jamais calculés depuis un nom. Un fonds est rattaché à sa société PAR UN
 * LIEN DATÉ : si une société reprend la gestion d'un fonds un jour, le code du fonds ne bouge pas et le dû d'un mois se calcule avec la société de ce mois-là.
 *
 * LE CALCUL N'EST PAS RÉÉCRIT : une part des opérations (`recetteDeTiers`) et une rétrocession mensuelle sur l'encours moyen (`retrocessionDuMois`) existaient déjà dans le barème ; ce module
 * les fait lire des conditions du fonds, à la date de chaque ordre.
 *
 * Module sans dépendance serveur : il se lit du serveur comme du navigateur.
 */

export const KIND_SOCIETE = "partenaire";
export const KIND_FONDS = "commission_fonds";
export const KIND_RELEVE = "releve_commissionnement";

export type PrefixeDeCode = "SG" | "FD";
export const FORME_DU_CODE: Record<PrefixeDeCode, RegExp> = { SG: /^SG-\d{4}$/, FD: /^FD-\d{4}$/ };

/** Le code suivant : le plus grand numéro connu, plus un. Un code n'est jamais réutilisé, même d'une société retirée (elle reste, inactive). */
export function codeSuivant(prefixe: PrefixeDeCode, existants: readonly string[]): string {
  const n = existants.filter((c) => FORME_DU_CODE[prefixe].test(c)).map((c) => Number(c.slice(3)));
  return `${prefixe}-${String((n.length ? Math.max(...n) : 0) + 1).padStart(4, "0")}`;
}

export interface Societe {
  /** `SG-0007`. */
  code: string;
  nom: string;
  /** Les autres graphies du même nom (la source officielle en écrit parfois une autre) : un seul code. */
  alias: string[];
  /** Le numéro de la décision d'agrément COSUMAF, quand il est connu. */
  agrementNo?: string;
  interlocuteur?: string;
  /** Où part le relevé. */
  adresseDuReleve?: string;
  actif: boolean;
}

/** Ce que la maison reçoit sur UNE opération d'un fonds : un taux sur le montant et/ou une part des droits du fonds, avec plancher et plafond (zéro au plafond : aucun). */
export interface TiersDOperation {
  /** En % du montant de l'opération. */
  pct: number;
  /** En % des droits d'entrée ou de sortie du fonds, de 0 à 100. */
  partDesDroitsPct: number;
  min: number;
  max: number;
}

/** La rétrocession sur l'encours : en % par an de l'encours moyen, plancher et plafond MENSUELS. */
export interface TiersDEncours {
  pct: number;
  min: number;
  max: number;
}

export interface ConditionsDeFonds {
  souscription: TiersDOperation;
  rachat: TiersDOperation;
  encours: TiersDEncours;
}

export interface VersionDeConditions extends ConditionsDeFonds {
  /** Le premier jour où ces conditions valent (AAAA-MM-JJ). */
  effetLe: string;
  /** Pourquoi : obligatoire, sans motif rien n'est écrit. */
  motif: string;
  par: string;
  /** Quand la direction l'a posée (ISO). */
  le: string;
}

export interface Rattachement {
  /** Le code de la société. */
  societe: string;
  /** Le premier jour où ce fonds relève d'elle. */
  depuis: string;
}

export interface Accord {
  ref?: string;
  /** Le jour où l'accord échoit (AAAA-MM-JJ) : l'écran prévient avant. */
  echeanceLe?: string;
  /** Le délai de paiement propre à cet accord, en jours après l'envoi du relevé ; absent : non précisé. */
  delaiDePaiementJours?: number;
}

export interface FondsCommissionne {
  /** `FD-0021`. */
  code: string;
  /** La ligne du Guichet (l'offre) : le fonds qu'on distribue. */
  offerId: string;
  rattachements: Rattachement[];
  accord?: Accord;
  versions: VersionDeConditions[];
}

export const TIERS_VIDE: TiersDOperation = { pct: 0, partDesDroitsPct: 0, min: 0, max: 0 };
export const CONDITIONS_VIDES: ConditionsDeFonds = { souscription: TIERS_VIDE, rachat: TIERS_VIDE, encours: { pct: 0, min: 0, max: 0 } };

/** La société d'un fonds un jour donné : le dernier rattachement dont le jour est atteint. */
export function societeAu(f: FondsCommissionne, jour: string): string | undefined {
  return [...f.rattachements].filter((r) => r.depuis <= jour).sort((a, b) => b.depuis.localeCompare(a.depuis))[0]?.societe;
}

/** Les conditions qui valaient un jour donné : la dernière version dont le jour de départ est atteint. Aucune avant la première. */
export function conditionsAu(f: FondsCommissionne, jour: string): VersionDeConditions | undefined {
  return [...f.versions].filter((v) => v.effetLe <= jour).sort((a, b) => b.effetLe.localeCompare(a.effetLe))[0];
}

/** Une règle du barème, ne portant que le côté « tiers » des conditions d'un fonds, pour réutiliser le calcul existant tel quel. */
export function regleDeTiers(v: VersionDeConditions, operation: "souscription" | "rachat" | "encours"): RegleDeFrais {
  if (operation === "encours") return { ...REGLE_FERMEE, effetLe: v.effetLe, tiersEncoursPct: v.encours.pct, tiersEncoursMin: v.encours.min, tiersEncoursMax: v.encours.max };
  const o = v[operation];
  return { ...REGLE_FERMEE, effetLe: v.effetLe, tiersPct: o.pct, tiersPartDesDroitsPct: o.partDesDroitsPct, tiersMin: o.min, tiersMax: o.max };
}

/** Un ordre réglé d'un fonds, tel que le dû le lit : sa date, son sens, le montant sur lequel on calcule, les droits du fonds en francs. */
export interface OrdreDeFonds {
  jour: string;
  operation: "souscription" | "rachat";
  base: number;
  /** Les droits d'entrée ou de sortie du fonds sur cet ordre, en francs. */
  droitsDuFonds: number;
}

export interface DuDuMois {
  mois: string;
  /** La société à laquelle le fonds était rattaché à la fin du mois. */
  societe?: string;
  souscriptions: number;
  rachats: number;
  encoursMoyen: number;
  /** Part des opérations du mois (taux et part des droits). */
  transactions: number;
  /** Rétrocession sur l'encours moyen. */
  encours: number;
  total: number;
  /** Des ordres du mois n'avaient aucune condition à leur date : ils comptent zéro et le tableau le dit. */
  ordresSansCondition: number;
}

/** Ce qu'un fonds doit pour un mois : ses ordres, sa rétrocession, chacun avec les conditions de SA date. */
export function duDuMois(f: FondsCommissionne, ordres: OrdreDeFonds[], mouvements: MouvementDeParts[], navs: VlDuJour[], mois: string): DuDuMois {
  const fin = finDuMois(mois);
  const duMois = ordres.filter((o) => o.jour.startsWith(mois));
  let transactions = 0;
  let sans = 0;
  for (const o of duMois) {
    const v = conditionsAu(f, o.jour);
    if (!v) {
      sans++;
      continue;
    }
    transactions += recetteDeTiers(regleDeTiers(v, o.operation), o.base, o.jour, o.droitsDuFonds);
  }
  const encoursMoyen = encoursMoyenDuMois(mouvements, navs, mois);
  const vFin = conditionsAu(f, fin);
  const encours = vFin ? retrocessionDuMois(regleDeTiers(vFin, "encours"), encoursMoyen, fin) : 0;
  return {
    mois,
    societe: societeAu(f, fin),
    souscriptions: duMois.filter((o) => o.operation === "souscription").reduce((s, o) => s + o.base, 0),
    rachats: duMois.filter((o) => o.operation === "rachat").reduce((s, o) => s + o.base, 0),
    encoursMoyen,
    transactions,
    encours,
    total: transactions + encours,
    ordresSansCondition: sans,
  };
}

export interface DuDeSociete {
  societe: string;
  mois: string;
  fonds: { code: string; du: DuDuMois }[];
  transactions: number;
  encours: number;
  total: number;
}

/** Le dû par société : la somme des dus de ses fonds, chacun rattaché à la société de la fin du mois. Un fonds sans société est rangé sous « — ». */
export function duParSociete(dus: { code: string; du: DuDuMois }[], mois: string): DuDeSociete[] {
  const m = new Map<string, DuDeSociete>();
  for (const d of dus) {
    const cle = d.du.societe ?? "—";
    const s = m.get(cle) ?? { societe: cle, mois, fonds: [], transactions: 0, encours: 0, total: 0 };
    s.fonds.push(d);
    s.transactions += d.du.transactions;
    s.encours += d.du.encours;
    s.total += d.du.total;
    m.set(cle, s);
  }
  return [...m.values()].sort((a, b) => a.societe.localeCompare(b.societe));
}

/* ---------------------------------------------------------------- les écarts du bandeau (4B) */

export type GenreD_Ecart = "sans_accord" | "case_vide" | "echeance" | "negatif";

export interface Ecart {
  genre: GenreD_Ecart;
  /** Le code du fonds concerné. */
  code: string;
  phrase: string;
}

/** Ce que le tableau regarde d'un fonds Guichet : son code d'offre, son titre, s'il est distribué, s'il a des ordres réglés. */
export interface FondsConnu {
  offerId: string;
  titre: string;
  distribue: boolean;
  ordresRegles: number;
}

export const JOURS_AVANT_ECHEANCE = 60;
const ajouterJours = (iso: string, n: number): string => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/**
 * Ce que le bandeau d'écarts dit, d'un regard : un fonds distribué sans conditions, une case vide sur un fonds qui en a, un accord qui échoit sous soixante jours, une case où l'on reçoit plus
 * que ce que le client paie. `clientTotalPct` : le prix total du client par fonds et par opération (droits du fonds compris), lu du côté ① par l'appelant ; absent, aucune marge n'est jugée.
 */
export function ecartsDuTableau(
  fonds: FondsCommissionne[],
  connus: FondsConnu[],
  jour: string,
  clientTotalPct: (offerId: string, operation: "souscription" | "rachat") => number | undefined = () => undefined,
  droitsPct: (offerId: string, operation: "souscription" | "rachat") => number = () => 0,
): Ecart[] {
  const out: Ecart[] = [];
  const parOffre = new Map(fonds.map((f) => [f.offerId, f]));
  for (const c of connus) {
    const f = parOffre.get(c.offerId);
    if (!c.distribue) continue;
    if (!f || !conditionsAu(f, jour)) {
      out.push({ genre: "sans_accord", code: f?.code ?? c.offerId, phrase: c.ordresRegles > 0 ? `${c.titre} : ${c.ordresRegles} ordre(s) réglé(s) sans condition à recevoir` : `${c.titre} : distribué, aucune condition posée` });
      continue;
    }
    const v = conditionsAu(f, jour)!;
    const vide = (t: TiersDOperation) => t.pct <= 0 && t.partDesDroitsPct <= 0;
    if (vide(v.souscription) || vide(v.rachat) || v.encours.pct <= 0) {
      const quoi = [vide(v.souscription) ? "souscription" : "", vide(v.rachat) ? "rachat" : "", v.encours.pct <= 0 ? "encours" : ""].filter(Boolean).join(", ");
      out.push({ genre: "case_vide", code: f.code, phrase: `${c.titre} : rien posé sur ${quoi}` });
    }
    if (f.accord?.echeanceLe && f.accord.echeanceLe <= ajouterJours(jour, JOURS_AVANT_ECHEANCE)) {
      out.push({ genre: "echeance", code: f.code, phrase: `${c.titre} : l'accord échoit le ${f.accord.echeanceLe}` });
    }
    for (const op of ["souscription", "rachat"] as const) {
      const client = clientTotalPct(c.offerId, op);
      if (client == null) continue;
      const recu = v[op].pct + (v[op].partDesDroitsPct * droitsPct(c.offerId, op)) / 100;
      if (recu > client + 1e-9) out.push({ genre: "negatif", code: f.code, phrase: `${c.titre} : on reçoit ${recu.toFixed(2)} % sur une ${op} où le client paie ${client.toFixed(2)} %` });
    }
  }
  return out;
}

/* ---------------------------------------------------------------- l'aperçu d'impact et le simulateur (3B, 4C) */

export interface MoisObserve {
  mois: string;
  ordres: OrdreDeFonds[];
  mouvements: MouvementDeParts[];
  navs: VlDuJour[];
}

export interface Simulation {
  /** Chaque mois observé : le dû avec les conditions actuelles, avec les conditions proposées, et l'écart. */
  mois: { mois: string; actuel: number; propose: number; ecart: number }[];
  /** La moyenne mensuelle sur les mois observés. */
  moyenneActuelle: number;
  moyennePropose: number;
  /** La projection sur douze mois À VOLUMES CONSTANTS (moyenne × 12) : une estimation, jamais une promesse. */
  surDouzeMois: { actuel: number; propose: number; ecart: number };
  estimation: true;
}

/**
 * LE MÊME MOTEUR POUR L'APERÇU D'IMPACT ET LE SIMULATEUR : les mois observés sont rejoués avec les conditions proposées appliquées à tous les jours, et comparés au dû réel. La projection à douze mois
 * suppose que les volumes restent ceux de la moyenne observée : c'est dit à l'écran, avec le mot « estimation ».
 */
export function simuler(f: FondsCommissionne, observes: MoisObserve[], proposees: ConditionsDeFonds): Simulation {
  const hypothetique: FondsCommissionne = { ...f, versions: [{ ...proposees, effetLe: "0000-01-01", motif: "simulation", par: "", le: "" }] };
  const mois = observes.map((o) => {
    const actuel = duDuMois(f, o.ordres, o.mouvements, o.navs, o.mois).total;
    const propose = duDuMois(hypothetique, o.ordres, o.mouvements, o.navs, o.mois).total;
    return { mois: o.mois, actuel, propose, ecart: propose - actuel };
  });
  const n = mois.length || 1;
  const moyenneActuelle = Math.round(mois.reduce((s, m) => s + m.actuel, 0) / n);
  const moyennePropose = Math.round(mois.reduce((s, m) => s + m.propose, 0) / n);
  return { mois, moyenneActuelle, moyennePropose, surDouzeMois: { actuel: moyenneActuelle * 12, propose: moyennePropose * 12, ecart: (moyennePropose - moyenneActuelle) * 12 }, estimation: true };
}

/* ---------------------------------------------------------------- les contrôles d'une modification (7B) */

const nombreOk = (x: unknown, max: number): boolean => typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= max;
const operationOk = (t: TiersDOperation): boolean => nombreOk(t.pct, 10) && nombreOk(t.partDesDroitsPct, 100) && nombreOk(t.min, 1e12) && nombreOk(t.max, 1e12) && (t.max === 0 || t.max >= t.min);

/** Refuse des conditions incohérentes ; `null` quand elles conviennent. */
export function conditionsRefusees(c: ConditionsDeFonds): string | null {
  if (!operationOk(c.souscription)) return "Souscription : taux de 0 à 10 %, part des droits de 0 à 100 %, plafond au moins égal au plancher.";
  if (!operationOk(c.rachat)) return "Rachat : taux de 0 à 10 %, part des droits de 0 à 100 %, plafond au moins égal au plancher.";
  const e = c.encours;
  if (!(nombreOk(e.pct, 10) && nombreOk(e.min, 1e12) && nombreOk(e.max, 1e12) && (e.max === 0 || e.max >= e.min))) return "Encours : taux de 0 à 10 % par an, plafond au moins égal au plancher.";
  return null;
}

/** Les états d'un relevé : il se fige à l'envoi, et un mois figé ne se réécrit pas. */
export const ETATS_DU_RELEVE = ["calcule", "envoye", "confirme", "conteste", "encaisse"] as const;
export type EtatDuReleve = (typeof ETATS_DU_RELEVE)[number];
export const LIBELLE_DE_L_ETAT: Record<EtatDuReleve, string> = { calcule: "Calculé", envoye: "Envoyé", confirme: "Confirmé", conteste: "Contesté", encaisse: "Encaissé" };

export interface ReleveSuivi {
  etat: EtatDuReleve;
  envoyeLe?: string;
  /** Le total figé à l'envoi, en francs : le mois ne bouge plus après. */
  totalFige?: number;
  /** L'échéance du paiement (AAAA-MM-JJ), quand l'accord en fixe une. */
  echeanceLe?: string;
  note?: string;
}

export const cleDuReleve = (societe: string, mois: string): string => `${societe}|${mois}`;

/** Les passages permis : en avant seulement, et un contesté peut être renvoyé. */
export function etatsSuivants(e: EtatDuReleve): EtatDuReleve[] {
  switch (e) {
    case "calcule":
      return ["envoye"];
    case "envoye":
      return ["confirme", "conteste", "encaisse"];
    case "confirme":
      return ["encaisse"];
    case "conteste":
      return ["envoye", "confirme"];
    default:
      return [];
  }
}

/** Un mois est figé dès que son relevé a été envoyé. */
export const moisFige = (r: ReleveSuivi | undefined): boolean => Boolean(r && r.etat !== "calcule");

/**
 * Une nouvelle version ne peut pas commencer dans un mois déjà envoyé : elle réécrirait un relevé. Une correction d'un mois figé se fait par une ligne de régularisation, jamais en changeant le
 * passé. `moisFiges` : les mois « AAAA-MM » dont un relevé est parti. Renvoie la raison du refus, ou `null`.
 */
export function departRefuse(effetLe: string, moisFiges: readonly string[]): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effetLe) || Number.isNaN(Date.parse(`${effetLe}T12:00:00Z`))) return "Date invalide.";
  const gele = moisFiges.filter((m) => effetLe <= finDuMois(m)).sort().at(-1);
  return gele ? `Le mois ${gele} est figé : ses relevés sont partis. Un départ au ${effetLe} le réécrirait ; régularisez par une ligne datée.` : null;
}

/** Lit un fonds stocké sans faire confiance à sa forme : les nombres manquants valent zéro, les listes absentes sont vides. */
export function fondsLu(code: string, brut: unknown): FondsCommissionne | undefined {
  const x = brut as Partial<FondsCommissionne> | undefined;
  if (!x || typeof x.offerId !== "string") return undefined;
  const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const op = (v: Partial<TiersDOperation> | undefined): TiersDOperation => ({ pct: num(v?.pct), partDesDroitsPct: num(v?.partDesDroitsPct), min: num(v?.min), max: num(v?.max) });
  const versions: VersionDeConditions[] = (Array.isArray(x.versions) ? x.versions : [])
    .filter((v) => v && typeof v.effetLe === "string")
    .map((v) => ({ effetLe: v.effetLe, motif: typeof v.motif === "string" ? v.motif : "", par: typeof v.par === "string" ? v.par : "", le: typeof v.le === "string" ? v.le : "", souscription: op(v.souscription), rachat: op(v.rachat), encours: { pct: num(v.encours?.pct), min: num(v.encours?.min), max: num(v.encours?.max) } }));
  const rattachements = (Array.isArray(x.rattachements) ? x.rattachements : []).filter((r) => r && typeof r.societe === "string" && typeof r.depuis === "string");
  return { code, offerId: x.offerId, rattachements, versions, ...(x.accord ? { accord: x.accord } : {}) };
}
