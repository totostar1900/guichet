import "server-only";
import type { OfferDraft } from "@/lib/domain/types";
import { readEmissionNotice, type NoticeReading } from "@/lib/market/notice-extract";

/**
 * LIRE UN COMMUNIQUÉ D'ANNONCE BTA / OTA PAR LE LECTEUR QUI A DÉJÀ LU 364 AVIS (20 novembre 2026, le client : « option 2, et si ça ne marche pas, option 1 »).
 *
 * Le lecteur d'intake générique (25 champs facultatifs, une consigne de plusieurs pages) n'avait jamais abouti en production : trois lectures du même communiqué, trois abandons à quarante puis cent vingt secondes, avec le modèle rapide comme avec l'autre. Le lecteur des avis, lui, tourne depuis septembre sans incident. Un communiqué d'annonce d'un bon ou d'une obligation du Trésor passe donc d'abord par lui, avec les quatre champs qu'une offre exige en plus (pays en clair, heure limite, annonce des résultats, référence).
 *
 * CE QU'IL NE FAIT PAS : il ne lit ni une IPO, ni un appel public à l'épargne, ni une photo. Quand il ne trouve ni instrument ni code d'émission, le lecteur générique reprend la main, comme avant.
 * IL NE CONFIRME RIEN : ce qui sort est un brouillon « à valider », chaque champ avec sa confiance, et ce qui a été supposé (une heure absente, un titre composé) est marqué « à vérifier ».
 */

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** « 2027-05-21 » → « 21 mai 2027 ». Une chaîne qui n'est pas une date ISO ressort telle quelle. */
const dateEnClair = (iso: string): string => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])} ${MOIS[Number(m[2]) - 1]} ${m[1]}` : iso;
};

const PAYS: [RegExp, NonNullable<OfferDraft["country"]>][] = [
  [/gabon/i, "Gabon"],
  [/congo/i, "Congo"],
  [/cameroun/i, "Cameroun"],
  [/tchad/i, "Tchad"],
  [/centrafri|\brca\b/i, "RCA"],
  [/guin[ée]e.*[ée]quatorial|equatorial|[ée]q\./i, "Guinée éq."],
];

/** Le code d'émission commence par le code du pays : GA1200002929 est gabonais. Repli quand le pays n'est pas lu en clair. */
const PAYS_PAR_CODE: Record<string, NonNullable<OfferDraft["country"]>> = { GA: "Gabon", CG: "Congo", CM: "Cameroun", TD: "Tchad", CF: "RCA", GQ: "Guinée éq." };

export const paysDeLaZone = (texte: string | undefined): OfferDraft["country"] | undefined => (texte ? PAYS.find(([re]) => re.test(texte))?.[1] : undefined);

/** Une date seule devient une date et une heure de convention (12:00, comme pour une adjudication sans heure), et le dit. */
function dateEtHeure(valeur: string | undefined, quoi: string, remarques: string[]): { valeur?: string; sure: boolean } {
  if (!valeur) return { sure: false };
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(valeur)) return { valeur: valeur.slice(0, 16), sure: true };
  if (/^\d{4}-\d{2}-\d{2}$/.test(valeur)) {
    remarques.push(`${quoi} : l'heure n'est pas imprimée, 12 h 00 retenu par convention.`);
    return { valeur: `${valeur}T12:00`, sure: false };
  }
  return { sure: false };
}

/**
 * Le brouillon d'une offre, tiré d'une lecture d'avis.
 * `officiel` : la pièce est-elle tenue pour officielle ? C'est l'attestation du desk, pas celle de la machine : l'appelant la décide.
 */
export function brouillonDepuisUneAnnonce(lecture: NoticeReading, officiel: boolean): OfferDraft | undefined {
  const p = lecture.proposal;
  if (!p.instrument || !p.codeEmission) return undefined;
  const d = lecture.dates ?? {};
  const remarks = [...lecture.remarks];
  const country = paysDeLaZone(d.countryName) ?? PAYS_PAR_CODE[p.codeEmission.slice(0, 2).toUpperCase()];
  const echeance = p.maturityOn;
  const titre = p.instrument === "BTA" ? `BTA ${p.tenor ?? ""}${echeance ? ` · ${dateEnClair(echeance)}` : ""}`.replace(/\s+/g, " ").trim() : `OTA${p.couponRate != null ? ` ${p.couponRate.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} %` : ""}${echeance ? ` · ${dateEnClair(echeance)}` : ""}`;
  const limite = dateEtHeure(d.deadlineAt, "Date limite de souscription", remarks);
  const resultats = dateEtHeure(d.resultsAt, "Annonce des résultats", remarks);
  const milliards = p.issueVolume != null ? p.issueVolume / 1e9 : undefined;
  const emetteur = d.countryName ? `Trésor public de ${/^république/i.test(d.countryName) ? "la " : ""}${d.countryName.replace(/^la\s+/i, "")}` : undefined;
  if (!country) remarks.push("Pays émetteur non reconnu : à choisir à la main.");
  if (p.instrument === "BTA") remarks.push("Taux non annoncé : les intérêts sont précomptés et le taux sort de l'adjudication.");

  const sure = (v: unknown, forte = true): "sure" | "check" | "missing" => (v == null || v === "" ? "missing" : forte ? "sure" : "check");
  return {
    kind: p.instrument,
    operation: p.abondement ? "abondement" : "nouvelle_ligne",
    country,
    countryName: d.countryName,
    issuer: emetteur,
    title: titre,
    isin: p.codeEmission,
    sourceRef: d.sourceRef,
    nominal: p.nominalUnit,
    couponRate: p.instrument === "OTA" ? p.couponRate : undefined,
    maturityOn: echeance,
    lastCouponOn: null,
    deadlineAt: limite.valeur,
    resultsAt: resultats.valeur,
    settleOn: p.settleOn,
    sizeLabel: milliards != null ? `${milliards.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mds FCFA` : undefined,
    typeKey: p.instrument,
    confidence: {
      kind: "sure",
      operation: p.abondement == null ? "check" : "sure",
      country: sure(country, Boolean(paysDeLaZone(d.countryName))),
      issuer: sure(emetteur, false),
      isin: "sure",
      nominal: sure(p.nominalUnit),
      couponRate: p.instrument === "OTA" ? sure(p.couponRate) : undefined,
      maturityOn: sure(echeance),
      deadlineAt: limite.valeur ? (limite.sure ? "sure" : "check") : "missing",
      resultsAt: resultats.valeur ? (resultats.sure ? "sure" : "check") : "missing",
      settleOn: sure(p.settleOn),
      sizeLabel: sure(milliards, false),
      title: "check",
      sourceRef: sure(d.sourceRef),
    },
    official: officiel,
    remarks,
  };
}

/** Lire un PDF d'annonce. `delaiMs` borne l'appel : le dépôt a soixante secondes, le geste du desk plus. */
export async function lireUneAnnonce(pdfBase64: string, options: { delaiMs: number; officiel: boolean; indice?: string }): Promise<{ draft?: OfferDraft; seconds: number; model: string }> {
  const lecture = await readEmissionNotice(pdfBase64, options.indice, process.env.INTAKE_READ_MODEL || undefined, { delaiMs: options.delaiMs, avecDates: true });
  return { draft: brouillonDepuisUneAnnonce(lecture, options.officiel), seconds: lecture.seconds, model: lecture.model };
}
