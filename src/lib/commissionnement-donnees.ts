import "server-only";
import { repo } from "@/lib/data";
import { ordreExecute } from "@/lib/frais-ordres";
import { servedUnits } from "@/lib/positions";
import { jourDesParts, sensDeLIntention } from "@/lib/domain/intent";
import type { MouvementDeParts, VlDuJour } from "@/lib/domain/retrocession";
import type { Intent, Offer } from "@/lib/domain/types";
import {
  KIND_FONDS,
  KIND_RELEVE,
  KIND_SOCIETE,
  duDuMois,
  fondsLu,
  type DuDuMois,
  type FondsCommissionne,
  type MoisObserve,
  type OrdreDeFonds,
  type ReleveSuivi,
  type Societe,
} from "@/lib/domain/commissionnement";

/**
 * LE COMMISSIONNEMENT, LU DU MAGASIN RÉSERVÉ (25 novembre 2026). Tout ce que ce fichier lit vit dans la table du desk (`desk_prive`), réservée à la direction ; aucune page du client ne
 * l'importe (cliquet : `commissionnement.test.ts`). Le calcul, lui, est dans le domaine : ici on ne fait que rassembler les ordres, les parts et les VL d'un fonds.
 */

export interface Commissionnement {
  societes: Map<string, Societe>;
  /** Par offre (la ligne du Guichet). */
  fonds: Map<string, FondsCommissionne>;
  /** Par « société|mois ». */
  releves: Map<string, ReleveSuivi>;
}

const societeLue = (code: string, brut: unknown): Societe | undefined => {
  const x = brut as Partial<Societe> | undefined;
  if (!x || typeof x.nom !== "string") return undefined;
  return { code, nom: x.nom, alias: Array.isArray(x.alias) ? x.alias.filter((a): a is string => typeof a === "string") : [], actif: x.actif !== false, ...(x.agrementNo ? { agrementNo: x.agrementNo } : {}), ...(x.interlocuteur ? { interlocuteur: x.interlocuteur } : {}), ...(x.adresseDuReleve ? { adresseDuReleve: x.adresseDuReleve } : {}) };
};

export async function chargerLeCommissionnement(): Promise<Commissionnement> {
  const r = repo();
  const [s, f, rel] = await Promise.all([r.listPrive(KIND_SOCIETE), r.listPrive(KIND_FONDS), r.listPrive(KIND_RELEVE)]);
  const societes = new Map<string, Societe>();
  for (const row of s) {
    const x = societeLue(row.key, row.data);
    if (x) societes.set(x.code, x);
  }
  const fonds = new Map<string, FondsCommissionne>();
  for (const row of f) {
    const x = fondsLu(row.key, row.data);
    if (x) fonds.set(x.offerId, x);
  }
  const releves = new Map(rel.map((row) => [row.key, row.data as ReleveSuivi]));
  return { societes, fonds, releves };
}

/** Les ordres d'un fonds que le dû lit : servis ou réglés, avec leur montant et les droits du fonds. */
export function ordresDeFonds(intents: Intent[], o: Offer): OrdreDeFonds[] {
  return intents
    .filter((i) => i.offerId === o.id && (i.state === "servie" || i.state === "reglee"))
    .flatMap((i) => {
      const x = ordreExecute(i, o);
      return x && (x.operation === "souscription" || x.operation === "rachat") ? [{ jour: x.jour, operation: x.operation, base: x.base, droitsDuFonds: x.droitsDuFonds }] : [];
    });
}

/** Les mouvements de parts de nos clients dans un fonds : positifs à la souscription réglée, négatifs au rachat réglé. */
export function mouvementsDe(intents: Intent[], o: Offer): MouvementDeParts[] {
  return intents.filter((i) => i.offerId === o.id && i.state === "reglee").map((i) => ({ jour: jourDesParts(i), units: (sensDeLIntention(i.type) === "reduit" ? -1 : 1) * servedUnits(i, o) }));
}

/** L'historique des VL d'un fonds ; sans historique, la seule VL connue (les jours d'avant sa date ne sont pas valorisés). */
export async function vlsDe(o: Offer, avecMouvements: boolean): Promise<VlDuJour[]> {
  if (!o.fund || !avecMouvements) return [];
  const h = await repo().listFundNavs(o.fund.key, 500);
  return h.length ? h : [{ navDate: o.fund.navDate, nav: o.fund.nav }];
}

/** Les n derniers mois « AAAA-MM », le plus récent d'abord. */
export function moisRecents(n: number, de: Date = new Date()): string[] {
  return Array.from({ length: n }, (_, k) => new Date(Date.UTC(de.getUTCFullYear(), de.getUTCMonth() - k, 1)).toISOString().slice(0, 7));
}

/** Les mois observés d'un fonds, pour rejouer le dû avec d'autres conditions (aperçu d'impact, simulateur). */
export async function moisObservesDe(o: Offer, intents: Intent[], mois: string[]): Promise<MoisObserve[]> {
  const ordres = ordresDeFonds(intents, o);
  const mouvements = mouvementsDe(intents, o);
  const navs = await vlsDe(o, mouvements.length > 0);
  return mois.map((m) => ({ mois: m, ordres, mouvements, navs }));
}

export interface DuDeFonds {
  offre: Offer;
  fonds: FondsCommissionne;
  du: DuDuMois;
}

/** Le dû d'un mois pour chaque fonds qui a des conditions. */
export async function dusDuMois(mois: string, c: Commissionnement): Promise<DuDeFonds[]> {
  const r = repo();
  const [offres, intents] = await Promise.all([r.listOffers(), r.listIntents()]);
  const out: DuDeFonds[] = [];
  for (const o of offres) {
    if (o.kind !== "FONDS" || !o.fund) continue;
    const f = c.fonds.get(o.id);
    if (!f) continue;
    const [obs] = await moisObservesDe(o, intents, [mois]);
    out.push({ offre: o, fonds: f, du: duDuMois(f, obs.ordres, obs.mouvements, obs.navs, mois) });
  }
  return out;
}
