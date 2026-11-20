import type { Country, OfferDraft, OfferKind } from "@/lib/domain/types";

/**
 * LE CHARGEMENT D'UN CLASSEUR EXCEL, SA DOCTRINE (20 novembre 2026, le client : « 1 oui, 2 oui, 3 oui, 4 oui, 5 oui »).
 *
 * Trois chemins créent une ligne au Desk : le scan des sites, le PDF déposé à la main, et ce classeur. Tous aboutissent à « À valider » ; rien n'est publié sans qu'une personne ait relu et cliqué sur « Publier ».
 * Ce module est PUR : il dit ce qu'une feuille contient (ses colonnes, une seule fois, pour le modèle qu'on télécharge ET pour la lecture du fichier rempli : les deux ne peuvent pas diverger), ce que le Desk déduit à la place de la personne (nom du pays, émetteur du Trésor, nominal, titre de la fiche, dernier coupon, durée), et ce qu'il refuse.
 *
 * CE QU'ON NE SAISIT PLUS, parce qu'une orthographe de plus est une erreur de plus : le nom du pays et l'émetteur d'un titre du Trésor (déduits du pays, liste fermée), le titre de la fiche (composé), la référence du communiqué (jamais copiée dans l'offre), la durée d'un BTA, le dernier coupon d'un abondement, le texte du volume, la couverture d'un résultat.
 */

export type PaysDeLaZone = Country;
export const PAYS: readonly PaysDeLaZone[] = ["RCA", "Congo", "Cameroun", "Gabon", "Tchad", "Guinée éq."];

/** Le nom officiel de chaque État, tel que les Trésors l'impriment : liste fermée, donc aucune variante. */
export const NOM_OFFICIEL: Record<PaysDeLaZone, string> = {
  RCA: "République centrafricaine",
  Congo: "République du Congo",
  Cameroun: "République du Cameroun",
  Gabon: "République gabonaise",
  Tchad: "République du Tchad",
  "Guinée éq.": "République de Guinée équatoriale",
};

export const emetteurDuTresor = (p: PaysDeLaZone): string => `Trésor public de la ${NOM_OFFICIEL[p]}`;

/** Les Trésors de la zone émettent leurs bons à un million de francs l'unité et leurs obligations à dix mille, sans exception relevée. */
export const NOMINAL_USUEL: Partial<Record<OfferKind, number>> = { BTA: 1_000_000, OTA: 10_000, RACHAT: 1_000_000 };

/* ---------------------------------------------------------------- dates */

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** « 2027-05-21 » → « 21 mai 2027 ». Une chaîne qui n'est pas une date ISO ressort telle quelle. */
export const dateEnClair = (iso: string): string => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])} ${MOIS[Number(m[2]) - 1]} ${m[1]}` : iso;
};

const iso = (d: Date): string => d.toISOString().slice(0, 10);

/** Un jour lu dans une cellule : une vraie date Excel, un numéro de série, « 2026-11-18 » ou « 18/11/2026 ». */
export function jourDeCellule(v: unknown): string | undefined {
  if (v == null || v === "") return undefined;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : iso(v);
  if (typeof v === "number") return v > 20_000 && v < 80_000 ? iso(new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86_400_000)) : undefined;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return Number.isNaN(Date.parse(s.slice(0, 10))) ? undefined : s.slice(0, 10);
  const f = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (f) return iso(new Date(Date.UTC(Number(f[3]), Number(f[2]) - 1, Number(f[1]))));
  return undefined;
}

/** Une heure lue dans une cellule : « hh:mm » ou « 9h00 », une fraction de jour, ou une date Excel (seule l'heure compte). */
export function heureDeCellule(v: unknown): string | undefined {
  if (v == null || v === "") return undefined;
  const hm = (h: number, m: number) => (h >= 0 && h < 24 && m >= 0 && m < 60 ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` : undefined);
  if (v instanceof Date) return hm(v.getUTCHours(), v.getUTCMinutes());
  if (typeof v === "number") {
    const f = v - Math.floor(v);
    const min = Math.round(f * 1440);
    return hm(Math.floor(min / 60) % 24, min % 60);
  }
  const m = String(v).trim().match(/^(\d{1,2})\s*[:hH]\s*(\d{2})?/);
  return m ? hm(Number(m[1]), Number(m[2] ?? 0)) : undefined;
}

/** Le dernier coupon d'une ligne rouverte : le dernier anniversaire de l'échéance qui n'est pas après le règlement. */
export function dernierCoupon(maturityOn: string, settleOn: string): string | undefined {
  const m = maturityOn.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const s = Date.parse(settleOn);
  if (!m || Number.isNaN(s)) return undefined;
  const an = new Date(s).getUTCFullYear();
  const essai = (a: number) => new Date(Date.UTC(a, Number(m[2]) - 1, Number(m[3])));
  let d = essai(an);
  if (d.getTime() > s) d = essai(an - 1);
  return d.getTime() < Date.parse(maturityOn) ? iso(d) : undefined;
}

/** La durée d'un bon, d'après les dates : 13, 26 ou 52 semaines quand elle s'en approche, sinon le nombre de semaines. */
export function dureeDuBon(settleOn: string, maturityOn: string): string | undefined {
  const j = (Date.parse(maturityOn) - Date.parse(settleOn)) / 86_400_000;
  if (!Number.isFinite(j) || j <= 0) return undefined;
  const sem = j / 7;
  const usuelle = [13, 26, 52].find((u) => Math.abs(sem - u) <= 2);
  return `${usuelle ?? Math.round(sem)} semaines`;
}

/* ---------------------------------------------------------------- ce que le Desk déduit */

const tresor = (k: OfferKind | undefined): boolean => k === "OTA" || k === "BTA" || k === "RACHAT";

export function titreDeLaFiche(d: Pick<OfferDraft, "kind" | "operation" | "country" | "issuer" | "couponRate" | "maturityOn" | "settleOn" | "typeKey">): string | undefined {
  const date = d.maturityOn ? dateEnClair(d.maturityOn) : undefined;
  const coupon = d.couponRate != null ? `${d.couponRate.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %` : undefined;
  switch (d.kind) {
    case "BTA": {
      const duree = d.settleOn && d.maturityOn ? dureeDuBon(d.settleOn, d.maturityOn) : undefined;
      return date ? ["BTA", duree].filter(Boolean).join(" ") + ` · ${date}` : undefined;
    }
    case "OTA":
      return date ? `OTA${coupon ? ` ${coupon}` : ""} · ${date}` : undefined;
    case "RACHAT":
      return date ? `Rachat au pair · ${date}` : undefined;
    case "APE":
      return d.issuer && date ? `${d.issuer}${coupon ? ` · ${coupon}` : ""} · ${date}` : undefined;
    case "ACTIONS":
      return d.issuer ? `Introduction en bourse · ${d.issuer}` : undefined;
    default:
      return undefined;
  }
}

/** Une phrase neutre, sans prix ni recommandation, quand personne n'en a écrit : la description client n'est pas à saisir. */
export function phraseNeutre(d: Pick<OfferDraft, "kind" | "country" | "issuer" | "couponRate" | "maturityOn" | "settleOn">): string | undefined {
  const pays = d.country ? NOM_OFFICIEL[d.country] : undefined;
  const echeance = d.maturityOn ? ` ; échéance le ${dateEnClair(d.maturityOn).replace("1 ", "1er ")}` : "";
  switch (d.kind) {
    case "BTA": {
      const duree = d.settleOn && d.maturityOn ? dureeDuBon(d.settleOn, d.maturityOn) : undefined;
      return pays ? `Bon du Trésor de la ${pays}${duree ? ` à ${duree}` : ""}, émis par adjudication, à intérêts précomptés${echeance}.` : undefined;
    }
    case "OTA":
      return pays ? `Obligation du Trésor de la ${pays}, émise par adjudication${d.couponRate != null ? `, à coupon annuel de ${d.couponRate.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} %` : ""}${echeance}.` : undefined;
    case "RACHAT":
      return pays ? `Rachat de titres par le Trésor de la ${pays}, au pair${echeance}.` : undefined;
    case "APE":
      return d.issuer ? `Emprunt obligataire de ${d.issuer}${d.couponRate != null ? `, à coupon annuel de ${d.couponRate.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} %` : ""}${echeance}.` : undefined;
    case "ACTIONS":
      return d.issuer ? `Introduction en bourse de ${d.issuer}.` : undefined;
    default:
      return undefined;
  }
}

/**
 * Ce que le Desk écrit à la place de la personne, sur un brouillon (le formulaire, le lecteur de PDF et le classeur passent tous ici).
 *  - le nom officiel du pays : toujours déduit du pays ;
 *  - l'émetteur d'un titre du Trésor : toujours déduit du pays ; celui d'un emprunt ou d'une IPO se choisit dans la liste ;
 *  - le nominal d'usage quand il manque ;
 *  - le dernier coupon d'un abondement ;
 *  - le titre de la fiche, composé ; la description, une phrase neutre si personne n'en a écrit.
 */
export function completerLeBrouillon(d: OfferDraft): OfferDraft {
  const out: OfferDraft = { ...d, confidence: { ...d.confidence }, remarks: [...d.remarks] };
  if (out.country && (tresor(out.kind) || out.kind === "APE" || out.kind === "ACTIONS")) out.countryName = NOM_OFFICIEL[out.country];
  if (out.country && tresor(out.kind)) out.issuer = emetteurDuTresor(out.country);
  if (out.nominal == null && out.kind && NOMINAL_USUEL[out.kind] != null) {
    out.nominal = NOMINAL_USUEL[out.kind];
    out.confidence.nominal = "check";
  }
  if ((out.kind === "OTA" || out.kind === "APE") && out.operation === "abondement" && !out.lastCouponOn && out.maturityOn && out.settleOn) {
    const lc = dernierCoupon(out.maturityOn, out.settleOn);
    if (lc) {
      out.lastCouponOn = lc;
      out.confidence.lastCouponOn = "check";
    }
  }
  const titre = titreDeLaFiche(out);
  if (titre) out.title = titre;
  if (!out.blurb?.trim()) {
    const phrase = phraseNeutre(out);
    if (phrase) out.blurb = phrase;
  }
  return out;
}

/* ---------------------------------------------------------------- les colonnes (une fois, pour le modèle ET pour la lecture) */

export type FormatDeColonne = "txt" | "int" | "dec" | "date" | "heure";
export interface ColonneDuModele {
  id: string;
  libelle: string;
  /** « obl » : obligatoire ; « opt » : facultative. Les colonnes automatiques (formules) ne sont pas ici : le modèle les ajoute, la lecture les ignore. */
  statut: "obl" | "opt";
  format: FormatDeColonne;
  aide?: string;
  largeur?: number;
}

export type Feuille = "tresor" | "ape" | "ipo" | "resultats";

export const NOM_DE_FEUILLE: Record<Feuille, string> = { tresor: "Trésor (OTA·BTA·Rachat)", ape: "Emprunts (APE)", ipo: "Introductions (IPO)", resultats: "Résultats" };

const C = (id: string, libelle: string, statut: "obl" | "opt", format: FormatDeColonne, aide?: string, largeur?: number): ColonneDuModele => ({ id, libelle, statut, format, aide, largeur });

export const COLONNES: Record<Feuille, ColonneDuModele[]> = {
  tresor: [
    C("type", "Type de produit", "obl", "txt", "OTA : obligation (coupon annuel). BTA : bon (intérêts précomptés). Rachat : rachat au pair par le Trésor.", 12),
    C("pays", "Pays", "obl", "txt", "Le nom officiel et l'émetteur s'en déduisent : rien d'autre à écrire.", 13),
    C("code", "Code d'émission (ISIN)", "obl", "txt", "12 caractères, tel qu'imprimé : GA1200002929. Le pays, la durée et le nom de la fiche s'en déduisent.", 18),
    C("echeance", "Échéance", "obl", "date", undefined, 13),
    C("coupon", "Coupon annuel (%)", "opt", "dec", "OTA seulement (1 à 20). Un BTA n'a pas de coupon : intérêts précomptés.", 13),
    C("limite", "Date limite de souscription", "obl", "date", undefined, 15),
    C("heure", "Heure limite", "opt", "heure", "Vide : 12:00 par convention (le Desk le signale). Les communiqués disent souvent « avant 9h00 ».", 11),
    C("reglement", "Date de règlement / valeur", "obl", "date", undefined, 15),
    C("resultats", "Annonce des résultats", "opt", "date", "Vide : le jour de la date limite.", 15),
    C("volume", "Volume d'émission (millions de FCFA)", "opt", "int", "Tel qu'imprimé : « 15 000 » pour 15 milliards. NE PAS convertir en francs.", 17),
    C("nominal", "Nominal unitaire (FCFA)", "opt", "int", "Vide : l'usage de la zone (BTA 1 000 000 · OTA 10 000). À remplir seulement si le communiqué dit autre chose.", 15),
    C("operation", "Opération", "opt", "txt", "Vide : « Abondement » si le Desk connaît déjà ce code d'émission, sinon « Nouvelle ligne ». À remplir seulement pour forcer.", 15),
    C("piece", "Pièce ou source (nom du PDF, adresse)", "obl", "txt", "Obligatoire : une ligne sans pièce n'est pas tenue pour officielle et arrive « à compléter ».", 46),
  ],
  ape: [
    C("emetteur", "Émetteur", "obl", "txt", "Choisir dans la liste. Absent : l'ajouter d'abord dans « Listes » (colonne H), jamais le taper ici : deux orthographes, deux émetteurs.", 46),
    C("pays", "Pays", "obl", "txt", undefined, 13),
    C("code", "Code d'émission (ISIN)", "obl", "txt", "12 caractères, tel qu'imprimé.", 18),
    C("coupon", "Coupon annuel (%)", "obl", "dec", "1 à 20.", 13),
    C("echeance", "Échéance", "obl", "date", undefined, 13),
    C("ouverture", "Date d'ouverture", "obl", "date", undefined, 14),
    C("limite", "Date limite de souscription", "obl", "date", undefined, 15),
    C("heure", "Heure limite", "opt", "heure", "Vide : 12:00 par convention.", 11),
    C("reglement", "Date de règlement / valeur", "obl", "date", undefined, 15),
    C("resultats", "Annonce des résultats", "opt", "date", "Vide : le jour de la date limite.", 15),
    C("volume", "Volume recherché (millions de FCFA)", "opt", "int", "Tel qu'imprimé.", 17),
    C("nominal", "Valeur nominale unitaire (FCFA)", "obl", "int", "Pas d'usage de la zone pour un emprunt privé : à lire sur la note d'information.", 17),
    C("piece", "Pièce ou source (nom du PDF, adresse)", "obl", "txt", "Obligatoire.", 46),
  ],
  ipo: [
    C("emetteur", "Société émettrice", "obl", "txt", "Choisir dans la liste. Absente : l'ajouter d'abord dans « Listes » (colonne H).", 46),
    C("pays", "Pays", "obl", "txt", undefined, 13),
    C("code", "Code ISIN (ou code provisoire)", "obl", "txt", "12 caractères.", 18),
    C("prix", "Prix par action (FCFA)", "obl", "int", "Prix d'émission, en francs.", 15),
    C("minimum", "Nombre minimum d'actions", "opt", "int"),
    C("offertes", "Nombre d'actions offertes", "opt", "int", undefined, 16),
    C("dividende", "Dividende par action (FCFA)", "opt", "int", "Seulement s'il est annoncé.", 15),
    C("ouverture", "Date d'ouverture", "obl", "date", undefined, 14),
    C("limite", "Date de clôture", "obl", "date", undefined, 14),
    C("heure", "Heure de clôture", "opt", "heure", "Vide : 12:00 par convention.", 12),
    C("reglement", "Date de règlement / cotation", "obl", "date", undefined, 16),
    C("resultats", "Annonce des résultats", "opt", "date", "Vide : le jour de la clôture.", 15),
    C("piece", "Pièce ou source (prospectus, visa COSUMAF)", "obl", "txt", "Obligatoire.", 46),
  ],
  resultats: [
    C("seance", "Date de séance", "obl", "date", "Jour de l'adjudication. Avec le code d'émission, elle identifie la séance : une séance connue est complétée, jamais doublée.", 13),
    C("pays", "Pays", "obl", "txt", undefined, 13),
    C("instrument", "Instrument", "obl", "txt", undefined, 11),
    C("code", "Code d'émission (ISIN)", "obl", "txt", "12 caractères. La durée, l'échéance et le coupon sont repris de la ligne : ne pas les ressaisir.", 18),
    C("annonce", "Montant annoncé (millions de FCFA)", "opt", "int", "Tel qu'imprimé, en MILLIONS (15 000 = 15 milliards).", 16),
    C("soumissions", "Total des soumissions (millions de FCFA)", "obl", "int", undefined, 18),
    C("servi", "Total servi (millions de FCFA)", "obl", "int", "Vide : le communiqué ne le dit pas (jamais 0).", 16),
    C("soumissionnaires", "SVT soumissionnaires", "opt", "int", undefined, 13),
    C("tauxMin", "Taux minimum (%) — BTA", "opt", "dec", "BTA : on lit des taux. Laisser les prix vides.", 12),
    C("tauxMax", "Taux maximum (%) — BTA", "opt", "dec", undefined, 12),
    C("tauxLimite", "Taux limite (%) — BTA", "opt", "dec", undefined, 12),
    C("tauxMoyen", "Taux moyen pondéré (%) — BTA", "opt", "dec", undefined, 14),
    C("prixMin", "Prix minimum — OTA", "opt", "dec", "OTA : on lit des prix (% du nominal). Laisser les taux vides.", 12),
    C("prixMax", "Prix maximum — OTA", "opt", "dec", undefined, 12),
    C("prixLimite", "Prix limite — OTA", "opt", "dec", undefined, 12),
    C("prixMoyen", "Prix moyen pondéré — OTA", "opt", "dec", undefined, 14),
    C("piece", "Pièce ou source (titre du communiqué)", "obl", "txt", "Obligatoire : une valeur sans pièce ne devient pas une référence.", 46),
  ],
};

/** « Date limite de souscription * » et « date limite de souscription » désignent la même colonne : étoile, casse et accents ne comptent pas. */
export const cleDeLibelle = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export type LigneBrute = Record<string, unknown>;

/** Les en-têtes d'une feuille lue → l'identifiant de chaque colonne connue (les colonnes automatiques et inconnues sont ignorées). */
export function indexDesColonnes(feuille: Feuille, entetes: string[]): Map<number, string> {
  const par = new Map(COLONNES[feuille].map((c) => [cleDeLibelle(c.libelle), c.id]));
  const out = new Map<number, string>();
  entetes.forEach((h, i) => {
    const id = par.get(cleDeLibelle(h));
    if (id) out.set(i, id);
  });
  return out;
}

/* ---------------------------------------------------------------- la lecture d'une ligne */

export interface LigneChargee {
  feuille: Exclude<Feuille, "resultats">;
  /** Le numéro de ligne dans la feuille (la première ligne de données est la 2). */
  ligne: number;
  brouillon?: OfferDraft;
  /** Un code d'émission déjà connu : l'opération devient un abondement, et le preview le dit. */
  code?: string;
  erreurs: string[];
  avertissements: string[];
  resume: string;
}

export interface ContexteDeLecture {
  /** Les codes d'émission que le Desk connaît déjà (offres, séances) : « abondement » pour eux, « nouvelle ligne » sinon. */
  codesConnus: ReadonlySet<string>;
  /** Les émetteurs du registre : un emprunt ou une IPO d'un émetteur absent d'ici est signalé, pas refusé. */
  emetteurs: readonly string[];
}

const texte = (v: unknown): string => (v == null ? "" : String(v).trim());
const nombre = (v: unknown): number | undefined => {
  if (v == null || v === "") return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  const n = Number(String(v).replace(/[\s  ]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};

export const estVide = (l: LigneBrute): boolean => Object.entries(l).every(([k, v]) => k === "piece" ? true : v == null || v === "") && texte(l.piece) === "";
export const estUnExemple = (l: LigneBrute): boolean => /^exemple/i.test(texte(l.piece));

const CODE = /^[A-Za-z0-9]{12}$/;

function paysDe(v: unknown): PaysDeLaZone | undefined {
  const s = texte(v);
  return PAYS.find((p) => cleDeLibelle(p) === cleDeLibelle(s));
}

/** Date + heure d'usage : l'heure absente devient 12:00 et le dit. */
function dateHeure(jour: string | undefined, heure: string | undefined, quoi: string, avert: string[]): string | undefined {
  if (!jour) return undefined;
  if (!heure) {
    avert.push(`${quoi} : l'heure n'est pas indiquée, 12 h 00 retenu par convention.`);
    return `${jour}T12:00`;
  }
  return `${jour}T${heure}`;
}

const MILLIARDS = (millions: number): string => `${(millions / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mds FCFA`;

function brouillonVide(official: boolean): OfferDraft {
  return { confidence: {}, official, remarks: [] };
}

export function lireUneLigneTresor(l: LigneBrute, ligne: number, ctx: ContexteDeLecture): LigneChargee {
  const erreurs: string[] = [];
  const avert: string[] = [];
  const t = texte(l.type).toUpperCase();
  const type = t === "OTA" ? "OTA" : t === "BTA" ? "BTA" : t === "RACHAT" ? "RACHAT" : undefined;
  if (!type) erreurs.push("type de produit : OTA, BTA ou Rachat");
  const pays = paysDe(l.pays);
  if (!pays) erreurs.push("pays : à choisir dans la liste");
  const code = texte(l.code).toUpperCase();
  if (!CODE.test(code)) erreurs.push("code d'émission : 12 caractères, sans espace");
  const echeance = jourDeCellule(l.echeance);
  if (!echeance) erreurs.push("échéance : une date");
  const limite = jourDeCellule(l.limite);
  if (!limite) erreurs.push("date limite de souscription : une date");
  const reglement = jourDeCellule(l.reglement);
  if (!reglement) erreurs.push("date de règlement : une date");
  const coupon = nombre(l.coupon);
  if (type === "OTA" && (coupon == null || coupon < 1 || coupon > 20)) erreurs.push("coupon : un nombre entre 1 et 20 (OTA)");
  if (type !== "OTA" && coupon != null) avert.push("coupon ignoré : seule une OTA en porte un.");
  const volume = nombre(l.volume);
  if (volume != null && (volume < 100 || volume > 1_000_000)) erreurs.push("volume : en MILLIONS de FCFA (15 000 pour 15 milliards), entre 100 et 1 000 000");
  const nominal = nombre(l.nominal);
  if (reglement && limite && reglement < limite) erreurs.push("règlement avant la date limite");
  if (echeance && reglement && echeance <= reglement) erreurs.push("échéance avant le règlement");
  const heure = heureDeCellule(l.heure);
  if (l.heure != null && l.heure !== "" && !heure) erreurs.push("heure limite : hh:mm");
  const piece = texte(l.piece);
  if (!piece) avert.push("aucune pièce citée : la ligne arrive « à compléter », non tenue pour officielle.");
  if (type && nominal != null && NOMINAL_USUEL[type] != null && nominal !== NOMINAL_USUEL[type]) avert.push(`nominal de ${nominal.toLocaleString("fr-FR")} F, là où l'usage est ${NOMINAL_USUEL[type]!.toLocaleString("fr-FR")} F : à vérifier sur la pièce.`);
  if (type === "BTA" && echeance && reglement) {
    const sem = (Date.parse(echeance) - Date.parse(reglement)) / 86_400_000 / 7;
    if (![13, 26, 52].some((u) => Math.abs(sem - u) <= 2)) avert.push(`durée de ${Math.round(sem)} semaines : ni 13, ni 26, ni 52 ; à vérifier.`);
  }
  const forcee = texte(l.operation).toLowerCase();
  const connue = ctx.codesConnus.has(code);
  const operation = type === "RACHAT" ? "rachat" : forcee.startsWith("abond") ? "abondement" : forcee.startsWith("nouvelle") ? "nouvelle_ligne" : connue ? "abondement" : "nouvelle_ligne";
  if (type && type !== "RACHAT" && !forcee && connue) avert.push("code d'émission déjà connu : chargé comme un abondement.");

  const resume = [type, pays, code].filter(Boolean).join(" · ");
  if (erreurs.length) return { feuille: "tresor", ligne, erreurs, avertissements: avert, resume };

  const d = brouillonVide(Boolean(piece));
  d.kind = type!;
  d.typeKey = type!;
  d.operation = operation;
  d.country = pays!;
  d.isin = code;
  d.maturityOn = echeance;
  d.nominal = nominal;
  d.couponRate = type === "OTA" ? coupon : undefined;
  d.deadlineAt = dateHeure(limite, heure, "Date limite de souscription", avert);
  d.resultsAt = jourDeCellule(l.resultats) ? dateHeure(jourDeCellule(l.resultats), undefined, "Annonce des résultats", avert) : `${limite}T12:00`;
  d.settleOn = reglement;
  d.sizeLabel = volume != null ? MILLIARDS(volume) : undefined;
  d.lastCouponOn = null;
  for (const k of ["kind", "operation", "country", "isin", "maturityOn", "deadlineAt", "settleOn"] as const) d.confidence[k] = "sure";
  d.confidence.couponRate = type === "OTA" ? "sure" : undefined;
  d.remarks = [`Chargé depuis un classeur Excel (feuille « ${NOM_DE_FEUILLE.tresor} », ligne ${ligne}).`, ...(piece ? [`Pièce citée : ${piece}.`] : []), ...avert];
  return { feuille: "tresor", ligne, brouillon: completerLeBrouillon(d), code, erreurs, avertissements: avert, resume };
}

export function lireUneLigneApe(l: LigneBrute, ligne: number, ctx: ContexteDeLecture): LigneChargee {
  const erreurs: string[] = [];
  const avert: string[] = [];
  const emetteur = texte(l.emetteur);
  if (!emetteur) erreurs.push("émetteur : à choisir dans la liste");
  else if (!ctx.emetteurs.some((e) => cleDeLibelle(e) === cleDeLibelle(emetteur))) avert.push(`émetteur « ${emetteur} » absent du registre : à créer au Desk, ou à corriger si c'est une faute de frappe.`);
  const pays = paysDe(l.pays);
  if (!pays) erreurs.push("pays : à choisir dans la liste");
  const code = texte(l.code).toUpperCase();
  if (!CODE.test(code)) erreurs.push("code d'émission : 12 caractères, sans espace");
  const coupon = nombre(l.coupon);
  if (coupon == null || coupon < 1 || coupon > 20) erreurs.push("coupon : un nombre entre 1 et 20");
  const echeance = jourDeCellule(l.echeance);
  const ouverture = jourDeCellule(l.ouverture);
  const limite = jourDeCellule(l.limite);
  const reglement = jourDeCellule(l.reglement);
  if (!echeance) erreurs.push("échéance : une date");
  if (!ouverture) erreurs.push("date d'ouverture : une date");
  if (!limite) erreurs.push("date limite : une date");
  if (!reglement) erreurs.push("date de règlement : une date");
  if (ouverture && limite && limite < ouverture) erreurs.push("date limite avant l'ouverture");
  if (limite && reglement && reglement < limite) erreurs.push("règlement avant la date limite");
  if (echeance && reglement && echeance <= reglement) erreurs.push("échéance avant le règlement");
  const nominal = nombre(l.nominal);
  if (nominal == null || nominal <= 0) erreurs.push("nominal unitaire : en francs");
  const volume = nombre(l.volume);
  if (volume != null && (volume < 100 || volume > 1_000_000)) erreurs.push("volume : en MILLIONS de FCFA, entre 100 et 1 000 000");
  const heure = heureDeCellule(l.heure);
  if (l.heure != null && l.heure !== "" && !heure) erreurs.push("heure limite : hh:mm");
  const piece = texte(l.piece);
  if (!piece) avert.push("aucune pièce citée : la ligne arrive « à compléter », non tenue pour officielle.");
  const resume = [emetteur || "APE", pays, code].filter(Boolean).join(" · ");
  if (erreurs.length) return { feuille: "ape", ligne, erreurs, avertissements: avert, resume };

  const d = brouillonVide(Boolean(piece));
  d.kind = "APE";
  d.typeKey = "APE";
  d.operation = "emprunt_ape";
  d.country = pays!;
  d.issuer = emetteur;
  d.isin = code;
  d.couponRate = coupon;
  d.maturityOn = echeance;
  d.opensAt = `${ouverture}T00:00`;
  d.deadlineAt = dateHeure(limite, heure, "Date limite de souscription", avert);
  d.resultsAt = jourDeCellule(l.resultats) ? dateHeure(jourDeCellule(l.resultats), undefined, "Annonce des résultats", avert) : `${limite}T12:00`;
  d.settleOn = reglement;
  d.nominal = nominal;
  d.sizeLabel = volume != null ? MILLIARDS(volume) : undefined;
  d.lastCouponOn = null;
  for (const k of ["kind", "operation", "country", "issuer", "isin", "couponRate", "maturityOn", "opensAt", "deadlineAt", "settleOn", "nominal"] as const) d.confidence[k] = "sure";
  d.remarks = [`Chargé depuis un classeur Excel (feuille « ${NOM_DE_FEUILLE.ape} », ligne ${ligne}).`, ...(piece ? [`Pièce citée : ${piece}.`] : []), ...avert];
  return { feuille: "ape", ligne, brouillon: completerLeBrouillon(d), code, erreurs, avertissements: avert, resume };
}

export function lireUneLigneIpo(l: LigneBrute, ligne: number, ctx: ContexteDeLecture): LigneChargee {
  const erreurs: string[] = [];
  const avert: string[] = [];
  const emetteur = texte(l.emetteur);
  if (!emetteur) erreurs.push("société émettrice : à choisir dans la liste");
  else if (!ctx.emetteurs.some((e) => cleDeLibelle(e) === cleDeLibelle(emetteur))) avert.push(`société « ${emetteur} » absente du registre : à créer au Desk, ou à corriger si c'est une faute de frappe.`);
  const pays = paysDe(l.pays);
  if (!pays) erreurs.push("pays : à choisir dans la liste");
  const code = texte(l.code).toUpperCase();
  if (!CODE.test(code)) erreurs.push("code ISIN : 12 caractères, sans espace");
  const prix = nombre(l.prix);
  if (prix == null || prix <= 0) erreurs.push("prix par action : en francs");
  const ouverture = jourDeCellule(l.ouverture);
  const limite = jourDeCellule(l.limite);
  const reglement = jourDeCellule(l.reglement);
  if (!ouverture) erreurs.push("date d'ouverture : une date");
  if (!limite) erreurs.push("date de clôture : une date");
  if (!reglement) erreurs.push("date de règlement : une date");
  if (ouverture && limite && limite < ouverture) erreurs.push("clôture avant l'ouverture");
  if (limite && reglement && reglement < limite) erreurs.push("règlement avant la clôture");
  const heure = heureDeCellule(l.heure);
  if (l.heure != null && l.heure !== "" && !heure) erreurs.push("heure de clôture : hh:mm");
  const piece = texte(l.piece);
  if (!piece) avert.push("aucune pièce citée : la ligne arrive « à compléter », non tenue pour officielle.");
  const resume = [emetteur || "IPO", pays, code].filter(Boolean).join(" · ");
  if (erreurs.length) return { feuille: "ipo", ligne, erreurs, avertissements: avert, resume };

  const offertes = nombre(l.offertes);
  const d = brouillonVide(Boolean(piece));
  d.kind = "ACTIONS";
  d.typeKey = "IPO";
  d.operation = "ipo";
  d.country = pays!;
  d.issuer = emetteur;
  d.isin = code;
  d.pricePerShare = prix;
  d.nominal = prix;
  d.minShares = nombre(l.minimum);
  d.sharesOffered = offertes;
  d.dividendPerShare = nombre(l.dividende);
  d.opensAt = `${ouverture}T00:00`;
  d.deadlineAt = dateHeure(limite, heure, "Date de clôture", avert);
  d.resultsAt = jourDeCellule(l.resultats) ? dateHeure(jourDeCellule(l.resultats), undefined, "Annonce des résultats", avert) : `${limite}T12:00`;
  d.settleOn = reglement;
  d.sizeLabel = offertes != null && prix != null ? MILLIARDS((offertes * prix) / 1_000_000) : undefined;
  for (const k of ["kind", "operation", "country", "issuer", "isin", "pricePerShare", "opensAt", "deadlineAt", "settleOn"] as const) d.confidence[k] = "sure";
  d.remarks = [`Chargé depuis un classeur Excel (feuille « ${NOM_DE_FEUILLE.ipo} », ligne ${ligne}).`, ...(piece ? [`Pièce citée : ${piece}.`] : []), ...avert];
  return { feuille: "ipo", ligne, brouillon: completerLeBrouillon(d), code, erreurs, avertissements: avert, resume };
}

/* ---------------------------------------------------------------- les résultats */

export interface ResultatCharge {
  ligne: number;
  sessionOn?: string;
  country?: PaysDeLaZone;
  instrument?: "BTA" | "OTA";
  code?: string;
  /** En francs : le classeur les saisit en millions, comme le communiqué les imprime. */
  valeurs: { announced?: number; bid?: number; served?: number; bidders?: number; coverage?: number; rateMin?: number; rateMax?: number; rateLimit?: number; rateAvg?: number; priceMin?: number; priceMax?: number; priceLimit?: number; priceAvg?: number };
  piece?: string;
  erreurs: string[];
  avertissements: string[];
  resume: string;
}

export function lireUnResultat(l: LigneBrute, ligne: number): ResultatCharge {
  const erreurs: string[] = [];
  const avert: string[] = [];
  const sessionOn = jourDeCellule(l.seance);
  if (!sessionOn) erreurs.push("date de séance : une date");
  const country = paysDe(l.pays);
  if (!country) erreurs.push("pays : à choisir dans la liste");
  const ins = texte(l.instrument).toUpperCase();
  const instrument = ins === "BTA" ? "BTA" : ins === "OTA" ? "OTA" : undefined;
  if (!instrument) erreurs.push("instrument : BTA ou OTA");
  const code = texte(l.code).toUpperCase();
  if (!CODE.test(code)) erreurs.push("code d'émission : 12 caractères, sans espace");
  const M = (v: unknown, nom: string): number | undefined => {
    const n = nombre(v);
    if (n == null) return undefined;
    if (n < 0 || n > 10_000_000) erreurs.push(`${nom} : en MILLIONS de FCFA`);
    return Math.round(n * 1_000_000);
  };
  const announced = M(l.annonce, "montant annoncé");
  const bid = M(l.soumissions, "total des soumissions");
  const served = M(l.servi, "total servi");
  if (bid == null) erreurs.push("total des soumissions : obligatoire");
  if (served == null) erreurs.push("total servi : obligatoire");
  if (bid != null && served != null && served > bid) erreurs.push("total servi supérieur aux soumissions");
  if (announced != null && served != null && served > announced) avert.push("total servi supérieur au montant annoncé (abondement possible : à vérifier).");
  const piece = texte(l.piece);
  if (!piece) erreurs.push("pièce ou source : obligatoire, une valeur sans pièce ne devient pas une référence");
  const taux = ["tauxMin", "tauxMax", "tauxLimite", "tauxMoyen"].map((k) => nombre(l[k]));
  const prix = ["prixMin", "prixMax", "prixLimite", "prixMoyen"].map((k) => nombre(l[k]));
  if (instrument === "BTA" && prix.some((x) => x != null)) avert.push("prix ignorés : un bon se lit en taux.");
  if (instrument === "OTA" && taux.some((x) => x != null)) avert.push("taux ignorés : une obligation se lit en prix.");
  for (const x of instrument === "BTA" ? taux : prix) if (x != null && (x < 0 || x > 200)) erreurs.push("taux ou prix hors de toute échelle (en %)");
  const bidders = nombre(l.soumissionnaires);
  const resume = [sessionOn, country, instrument, code].filter(Boolean).join(" · ");
  const valeurs: ResultatCharge["valeurs"] = { announced, bid, served, bidders: bidders != null ? Math.round(bidders) : undefined };
  if (announced != null && announced > 0 && bid != null) valeurs.coverage = Math.round((bid / announced) * 10_000) / 100;
  if (instrument === "BTA") [valeurs.rateMin, valeurs.rateMax, valeurs.rateLimit, valeurs.rateAvg] = taux as (number | undefined)[];
  if (instrument === "OTA") [valeurs.priceMin, valeurs.priceMax, valeurs.priceLimit, valeurs.priceAvg] = prix as (number | undefined)[];
  return { ligne, sessionOn, country, instrument, code, valeurs, piece, erreurs, avertissements: avert, resume };
}
