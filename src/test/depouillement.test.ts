import { describe, expect, it } from "vitest";
import { dureeDite, joursDAttente, propositions, sansResultat } from "@/lib/results/depouillement";
import type { AuctionResult } from "@/lib/market/auction-results";
import type { Offer } from "@/lib/domain/types";

/**
 * LE DÉPOUILLEMENT N'ARRIVAIT JAMAIS JUSQU'À LA LIGNE.
 *
 * Mesuré le 4 octobre 2026 : onze lignes du primaire avaient leur clôture
 * derrière elles, de douze à vingt jours, sans prix servi ; le dépouillement
 * des séances des 14 et 15 septembre existait pourtant au dépôt, confirmé par
 * une personne ; et `offer_id` est vide sur les deux cent quarante-neuf
 * séances gardées depuis 2019.
 *
 * CE QUE CE CLIQUET TIENT EST LE REFUS DE DEVINER. Le rapprochement naïf par
 * pays, instrument et date donne, pour la séance centrafricaine du 14, UN
 * dépouillement en face de TROIS lignes : deux prix seraient inventés, et ils
 * partiraient dans des avis d'allocation. Les cas ci-dessous sont les vrais,
 * recopiés de la base.
 */
const NOW = new Date("2026-10-04T09:00:00.000Z");

const ligne = (over: Partial<Offer>): Offer =>
  ({ id: "o", kind: "OTA", title: "", isin: "", issuer: "", country: "RCA", countryName: "RCA", status: "published", operation: "nouvelle_ligne", settleOn: "2026-09-16", deadlineAt: "2026-09-14T14:00:00.000Z", resultsAt: "2026-09-14T15:00:00.000Z", nominal: 10_000, commissionPct: 0.5, sizeLabel: "", documents: [], version: 1, ...over }) as unknown as Offer;

const seance = (over: Partial<AuctionResult>): AuctionResult => ({ id: `a-${Math.random()}`, country: "RCA", instrument: "OTA", tenor: "2 ans", sessionOn: "2026-09-14", confirmedBy: "Desk", priceAvg: 94, ...over }) as unknown as AuctionResult;

describe("une séance close sans résultat se reconnaît", () => {
  it("après la clôture, sans prix servi ni dépouillement", () => {
    expect(sansResultat(ligne({}), NOW)).toBe(true);
    expect(joursDAttente(ligne({}), NOW)).toBe(19);
  });

  it("une ligne servie ne l'est plus", () => {
    expect(sansResultat(ligne({ servedPricePct: 96.5 }), NOW)).toBe(false);
    expect(sansResultat(ligne({ resultLine: "Servie à 96,500 %" }), NOW)).toBe(false);
  });

  it("une ligne retirée ne compte pas, et une clôture à venir non plus", () => {
    expect(sansResultat(ligne({ status: "withdrawn" }), NOW)).toBe(false);
    expect(sansResultat(ligne({ deadlineAt: "2026-12-01T14:00:00.000Z" }), NOW)).toBe(false);
  });
});

describe("la durée se dit comme la BEAC l'écrit", () => {
  it("en semaines pour un bon, en années pour une obligation", () => {
    expect(dureeDite(ligne({ kind: "BTA", settleOn: "2026-09-17", maturityOn: "2027-09-16" }))).toBe("52 semaines");
    expect(dureeDite(ligne({ kind: "BTA", settleOn: "2026-09-24", maturityOn: "2026-12-24" }))).toBe("13 semaines");
    expect(dureeDite(ligne({ settleOn: "2026-09-16", maturityOn: "2028-09-16" }))).toBe("2 ans");
  });

  it("ne dit rien quand l'échéance manque", () => {
    // Mieux vaut pas de proposition qu'une durée supposée : elle sert à départager.
    expect(dureeDite(ligne({ maturityOn: undefined }))).toBeUndefined();
  });
});

describe("le rapprochement refuse de deviner", () => {
  it("propose quand la durée répond, une fois de chaque côté", () => {
    const o = ligne({ id: "rca-2028", maturityOn: "2028-09-16" });
    const p = propositions([o], [seance({})], NOW).get("rca-2028");
    expect(p?.prixPct).toBe(94);
    expect(p?.seance).toBe("2026-09-14");
    expect(p?.confirmee).toBe(true);
  });

  it("ne propose rien à trois lignes qui n'ont qu'un dépouillement", () => {
    /* LE CAS RÉEL DU 14 SEPTEMBRE. Trois OTA centrafricaines d'échéances 2028,
       2029 et 2028-II ; un seul dépouillement, « OTA 2 ans ». Sans la durée,
       les trois recevaient 94 % et deux prix étaient inventés. */
    const trois = [ligne({ id: "a", maturityOn: "2028-09-16" }), ligne({ id: "b", maturityOn: "2029-08-12" }), ligne({ id: "c", maturityOn: "2028-02-14" })];
    const m = propositions(trois, [seance({})], NOW);
    expect(m.get("b")).toBeUndefined();
    expect(m.get("c")).toBeUndefined();
    // Celle dont la durée répond vraiment, elle, est servie.
    expect(m.get("a")?.prixPct).toBe(94);
  });

  it("ne propose rien quand deux dépouillements répondent à une ligne", () => {
    /* LE CAS RÉEL DU 15 SEPTEMBRE, Congo : un bon 26 semaines à 7,00 % et un
       bon 52 semaines à 6,97 % dans la même séance. La durée les sépare ; si
       elle manquait, aucun des deux ne passerait. */
    const o = ligne({ id: "cg", kind: "BTA", country: "Congo", settleOn: "2026-09-17", maturityOn: "2027-09-16", deadlineAt: "2026-09-15T14:00:00.000Z" });
    const deux = [seance({ country: "Congo", instrument: "BTA", tenor: "26 semaines", sessionOn: "2026-09-15", rateAvg: 7, priceAvg: undefined }), seance({ country: "Congo", instrument: "BTA", tenor: "52 semaines", sessionOn: "2026-09-15", rateAvg: 6.97, priceAvg: undefined })];
    expect(propositions([o], deux, NOW).get("cg")?.tauxPct).toBe(6.97);
    // Sans durée lisible, rien : deux candidats et aucun moyen de trancher.
    const sansEcheance = ligne({ id: "cg2", kind: "BTA", country: "Congo", maturityOn: undefined, deadlineAt: "2026-09-15T14:00:00.000Z" });
    expect(propositions([sansEcheance], deux, NOW).get("cg2")).toBeUndefined();
  });

  it("ne propose rien quand la séance n'a pas été dépouillée", () => {
    // Le cas du 22 septembre : quatre lignes, aucun communiqué au dépôt.
    const o = ligne({ id: "tard", deadlineAt: "2026-09-22T14:00:00.000Z", maturityOn: "2029-09-24" });
    expect(propositions([o], [seance({})], NOW).get("tard")).toBeUndefined();
  });

  it("écarte un dépouillement mis de côté", () => {
    // Une pièce écartée à la main porte son motif : elle ne revient pas par ici.
    const o = ligne({ id: "ec", maturityOn: "2028-09-16" });
    expect(propositions([o], [seance({ setAsideAt: "2026-09-20T10:00:00.000Z" })], NOW).get("ec")).toBeUndefined();
  });

  it("dit si le chiffre a été confirmé par une personne", () => {
    /* La machine lit, une personne confirme. Un chiffre seulement lu peut être
       proposé, mais la page doit pouvoir le dire. */
    const o = ligne({ id: "nc", maturityOn: "2028-09-16" });
    expect(propositions([o], [seance({ confirmedBy: undefined })], NOW).get("nc")?.confirmee).toBe(false);
  });
});
