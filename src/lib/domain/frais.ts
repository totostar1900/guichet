/**
 * LE BARÈME DES FRAIS : cinq règles, une date de départ par règle (14 novembre 2026, planche 2A · 3B · 5B).
 *
 * UN BARÈME, CINQ CASES. Fonds (souscription, rachat), titres cotés (achat, vente), adjudication. Chaque case est une règle ;
 * le desk la lit d'un regard, la direction l'arrête, l'audit garde l'avant et l'après.
 *
 * LES FRAIS D'UN CLIENT ET CE QUE LA MAISON REÇOIT DE TIERS NE SONT PAS LA MÊME CHOSE. `client*` est ce que le client couvre ;
 * `tiers*` est ce que la maison perçoit d'un partenaire ou d'un émetteur. Le client ne lit QUE le premier, sous le mot
 * « Frais », sans dire qui perçoit : l'écran du client ne nomme jamais une destination (décision du 14 novembre 2026). Le second
 * ne vit qu'au desk.
 *
 * TOUT EST FERMÉ PAR DÉFAUT. Une règle sans date de départ calcule zéro, et un taux à zéro aussi : un tarif posé par défaut
 * serait un prélèvement décidé par le code. Avant sa date, une règle calcule zéro. La date ne peut pas précéder
 * « aujourd'hui + 30 jours » : le préavis de l'article 6 de la convention.
 *
 * Le plancher ne s'applique qu'à ce qui est DÉJÀ dû, exactement comme celui des droits de garde.
 *
 * Module sans dépendance : il se lit du serveur comme du navigateur.
 */

export type FamilleDeFrais = "fonds" | "titres" | "adjudication";
export type OperationDeFrais = "souscription" | "rachat" | "achat" | "vente";

export const CLES_DE_REGLE = ["fonds.souscription", "fonds.rachat", "titres.achat", "titres.vente", "adjudication.souscription"] as const;
export type CleDeRegle = (typeof CLES_DE_REGLE)[number];

export const LIBELLE_DE_REGLE: Record<CleDeRegle, string> = {
  "fonds.souscription": "Fonds · souscription",
  "fonds.rachat": "Fonds · rachat",
  "titres.achat": "Titres · achat",
  "titres.vente": "Titres · vente",
  "adjudication.souscription": "Adjudication",
};

export interface RegleDeFrais {
  /** Ce que le client couvre, en % du montant. Zéro : rien. */
  clientPct: number;
  /** Plancher en francs, appliqué à ce qui est déjà dû. */
  clientMin: number;
  /** Plafond en francs ; zéro : pas de plafond. */
  clientMax: number;
  /** Desk seulement : ce que la maison perçoit de l'émetteur (adjudication) ou du partenaire, en % du montant. */
  tiersPct: number;
  /** Desk seulement, fonds : la part des droits d'entrée ou de sortie du fonds qui revient à la maison, en %. */
  tiersPartDesDroitsPct: number;
  /** Desk seulement : plancher et plafond de ce que la maison reçoit PAR OPÉRATION (taux + part des droits), en francs ; zéro au plafond : aucun. */
  tiersMin: number;
  tiersMax: number;
  /** Desk seulement, fonds : la rétrocession sur l'encours, en % par an. */
  tiersEncoursPct: number;
  /** Desk seulement : plancher et plafond de la rétrocession MENSUELLE, en francs ; zéro au plafond : aucun. */
  tiersEncoursMin: number;
  tiersEncoursMax: number;
  /** Le jour d'entrée en vigueur (AAAA-MM-JJ). Absent : la règle n'est pas arrêtée et calcule zéro. */
  effetLe?: string;
  /** Le jour où le client en a été prévenu : sert à prouver le préavis. */
  annonceLe?: string;
}

export type BaremeDeFrais = Record<CleDeRegle, RegleDeFrais>;

export const REGLE_FERMEE: RegleDeFrais = { clientPct: 0, clientMin: 0, clientMax: 0, tiersPct: 0, tiersPartDesDroitsPct: 0, tiersEncoursPct: 0, tiersMin: 0, tiersMax: 0, tiersEncoursMin: 0, tiersEncoursMax: 0 };

export const BAREME_DE_FRAIS_FERME: BaremeDeFrais = {
  "fonds.souscription": REGLE_FERMEE,
  "fonds.rachat": REGLE_FERMEE,
  "titres.achat": REGLE_FERMEE,
  "titres.vente": REGLE_FERMEE,
  "adjudication.souscription": REGLE_FERMEE,
};

/** La clé du barème dans la table de référence (famille « policy »). */
export const FRAIS_POLICY_KEY = "bareme-frais";

/**
 * LES RÈGLES QUE LE CALCUL DE L'ORDRE LIT (14 novembre 2026) : les titres cotés et l'adjudication. Un ordre se calcule dans `positionFor`,
 * qui lit le barème posé avec le référentiel (`frais-registre.ts`). Les fonds n'y sont pas : leurs frais sont ceux du fonds (droits
 * d'entrée et de sortie, dans le prix), et une règle client sur un fonds serait un prélèvement que l'ordre ne tiendrait pas. Le desk
 * refuse donc un taux client avec date sur une règle qui n'est pas dans cette liste ; elle s'y ajoute quand le calcul la lit.
 */
export const REGLES_LUES_PAR_L_ORDRE: readonly CleDeRegle[] = ["titres.achat", "titres.vente", "adjudication.souscription"];

/** Le barème tel que le client peut le porter : ce que la maison reçoit de tiers est remis à zéro. Sûr à envoyer au navigateur. */
export function baremePourLeClient(b: BaremeDeFrais): BaremeDeFrais {
  const out = { ...BAREME_DE_FRAIS_FERME };
  for (const cle of CLES_DE_REGLE) {
    const { clientPct, clientMin, clientMax, effetLe, annonceLe } = b[cle];
    out[cle] = { ...REGLE_FERMEE, clientPct, clientMin, clientMax, ...(effetLe ? { effetLe } : {}), ...(annonceLe ? { annonceLe } : {}) };
  }
  return out;
}

/** Le nombre de jours de préavis de l'article 6 de la convention. */
export const PREAVIS_JOURS = 30;

const ajouterJours = (iso: string, n: number): string => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Le premier jour où une règle peut démarrer si on l'annonce aujourd'hui. */
export const premierDepartPossible = (aujourdHui: string): string => ajouterJours(aujourdHui, PREAVIS_JOURS);

/** Refuse une date de départ qui ne laisse pas trente jours au client ; `null` quand elle convient. */
export function departRefuse(effetLe: string, aujourdHui: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effetLe) || Number.isNaN(Date.parse(`${effetLe}T12:00:00Z`))) return "Date invalide.";
  const mini = premierDepartPossible(aujourdHui);
  return effetLe < mini ? `Le préavis de ${PREAVIS_JOURS} jours impose le ${mini} au plus tôt.` : null;
}

/** La règle d'une opération, ou rien quand la maison ne tarife pas cette opération. */
export function cleDeRegle(famille: FamilleDeFrais, operation: OperationDeFrais): CleDeRegle | undefined {
  const k = `${famille}.${operation}`;
  return (CLES_DE_REGLE as readonly string[]).includes(k) ? (k as CleDeRegle) : undefined;
}

/** Une règle est en vigueur le jour J quand elle a une date de départ passée ou présente et un taux client. */
export const enVigueur = (r: RegleDeFrais, jour: string): boolean => Boolean(r.effetLe) && (r.effetLe as string) <= jour && r.clientPct > 0;

/**
 * Les frais d'un montant pour le client, plancher et plafond compris, et jamais avant la date de départ.
 * Le plafond coupe le résultat ; le plancher ne s'applique qu'à une somme déjà due.
 */
export function fraisDuClient(r: RegleDeFrais, montant: number, jour: string): number {
  if (!enVigueur(r, jour) || montant <= 0) return 0;
  return borner(Math.round((montant * r.clientPct) / 100), r.clientMin, r.clientMax);
}

/** Plancher sur une somme déjà due, puis plafond ; zéro au plafond : aucun. Le même pli pour tous les montants du barème. */
const borner = (du: number, min: number, max: number): number => {
  if (du <= 0) return 0;
  const m = Math.max(du, min);
  return max > 0 ? Math.min(m, max) : m;
};

/** Ce que la maison perçoit de tiers sur une opération, plancher et plafond compris : jamais lu par le client. `droits` : le montant des droits du fonds, en francs. */
export function recetteDeTiers(r: RegleDeFrais, montant: number, jour: string, droits = 0): number {
  if (!r.effetLe || r.effetLe > jour || montant <= 0) return 0;
  return borner(Math.round((montant * r.tiersPct) / 100 + (droits * r.tiersPartDesDroitsPct) / 100), r.tiersMin, r.tiersMax);
}

/** La rétrocession du mois sur un encours moyen : encours × taux annuel ÷ 12, plancher et plafond mensuels compris. */
export function retrocessionDuMois(r: RegleDeFrais, encoursMoyen: number, jour: string): number {
  if (!r.effetLe || r.effetLe > jour || encoursMoyen <= 0) return 0;
  return borner(Math.round((encoursMoyen * r.tiersEncoursPct) / 100 / 12), r.tiersEncoursMin, r.tiersEncoursMax);
}

export interface FraisDeLOrdre {
  /** Les frais en francs, zéro quand rien n'est dû. */
  montant: number;
  /** Le taux appliqué, en %. */
  pct: number;
  /** D'où il vient : le barème, ou le taux propre à la ligne fixé par le desk. */
  source: "bareme" | "ligne" | "aucune";
}

/**
 * LES FRAIS D'UN ORDRE, LUS UNE SEULE FOIS : l'annexe, le récapitulatif et l'avis passent par ici.
 * Un taux fixé sur la ligne elle-même (`Offer.commissionPct`, de 0 à 5 %) l'emporte sur le barème : c'est la surcharge par ligne.
 */
export function fraisDeLOrdre(b: BaremeDeFrais, famille: FamilleDeFrais, operation: OperationDeFrais, montant: number, jour: string, pctDeLaLigne = 0): FraisDeLOrdre {
  if (pctDeLaLigne > 0 && montant > 0) return { montant: Math.round((montant * pctDeLaLigne) / 100), pct: pctDeLaLigne, source: "ligne" };
  const cle = cleDeRegle(famille, operation);
  if (!cle) return { montant: 0, pct: 0, source: "aucune" };
  const r = b[cle];
  const m = fraisDuClient(r, montant, jour);
  return m > 0 ? { montant: m, pct: r.clientPct, source: "bareme" } : { montant: 0, pct: 0, source: "aucune" };
}

export interface LigneDeFraisClient {
  cle: CleDeRegle;
  libelle: string;
  pct: number;
  min: number;
  max: number;
  /** Le jour de départ ; `enVigueur` dit s'il est passé. */
  effetLe: string;
  enVigueur: boolean;
}

/**
 * CE QUE LE CLIENT PEUT LIRE : les règles dont le client couvre quelque chose et dont la date est fixée, rien d'autre.
 * Aucun champ `tiers*` n'en sort. Une règle sans date ou à taux nul n'est pas écrite.
 */
export function fraisLusParLeClient(b: BaremeDeFrais, jour: string): LigneDeFraisClient[] {
  const out: LigneDeFraisClient[] = [];
  for (const cle of CLES_DE_REGLE) {
    const r = b[cle];
    if (!r.effetLe || r.clientPct <= 0) continue;
    out.push({ cle, libelle: LIBELLE_DE_REGLE[cle], pct: r.clientPct, min: r.clientMin, max: r.clientMax, effetLe: r.effetLe, enVigueur: enVigueur(r, jour) });
  }
  return out;
}

/** Complète un barème lu de la base avec les règles fermées : une clé absente ne casse rien. */
export function baremeDeFraisLu(lu: Partial<Record<CleDeRegle, Partial<RegleDeFrais>>> | undefined): BaremeDeFrais {
  const out = { ...BAREME_DE_FRAIS_FERME };
  for (const cle of CLES_DE_REGLE) out[cle] = { ...REGLE_FERMEE, ...(lu?.[cle] ?? {}) };
  return out;
}

/**
 * UNE HAUSSE SE PRÉVIENT, UNE BAISSE NON. Le préavis de trente jours protège le client d'un prix plus cher ; fermer une règle ou
 * en baisser le taux ne lui retire rien et s'applique tout de suite. Une règle qui n'avait pas de taux et en prend un est une hausse.
 */
export function exigeUnPreavis(avant: RegleDeFrais, apres: RegleDeFrais): boolean {
  if (apres.clientPct <= 0) return false;
  if (apres.clientPct > avant.clientPct || apres.clientMin > avant.clientMin) return true;
  if (avant.clientMax > 0 && (apres.clientMax === 0 || apres.clientMax > avant.clientMax)) return true;
  return avant.clientPct <= 0;
}
