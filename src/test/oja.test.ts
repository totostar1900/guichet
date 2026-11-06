import { describe, expect, it } from "vitest";
import { agregerOja, apparier, entetesManquants, jourDe, reconnaitreFichier, type LigneOja } from "@/lib/market/oja";
import { CHAMPS, DATE_SANS_ETAT, champsEnEcart, ecartsOuverts, erreurDEchelle, etatSource, exclure, origineDuChamp, patchDesColonnes, proposer, seContredit, sourcesDe, trancher, valeursRetenues, verserExcel, vueParSource, type SeancePlate } from "@/lib/market/sources-seance";

/* Les trois communiqués du Trésor gabonais des 21 et 28 octobre 2026 (archive OJA du 04/11/2026) : les chiffres publiés servent de vérité. */
const offre = (titre: string, etat: string | null, volume: number, prix: number, jour: string, compte = "8101", op = "IPO"): LigneOja => ({
  Titre: titre, Etat: etat, "Type d'opération": op, Volume: volume, "Prix ajusté": prix, "Date de confirmation": new Date(`${jour}T14:00:00Z`), "Compte du détenteur d'achteur": compte, "Heure de modification": new Date(`${jour}T15:00:00Z`),
});
const enchere = (titre: string, etat: string, montant: number, jour: string): LigneOja => ({ Titre: titre, Etat: etat, Montant: montant, "Type d'opération": "IPO", "Date de confirmation": new Date(`${jour}T14:00:00Z`), "Code des enchères": `${titre}/MN`, "multy auction code": null });
const titre = (code: string, nominal: number, terme = "13S ( 13 semaines )", taux = 0, echeance = "2027-01-22"): LigneOja => ({ Code: code, "Valeur nominale": nominal, "Type de titre": "x", Terme: terme, Taux: taux, "Date d'échéance": new Date(`${echeance}T00:00:00Z`) });

const BTA = "GA1100002359";
const OTA = "GA2A00000480";
const J = "2026-10-21";
const OFFRES: LigneOja[] = [
  offre(BTA, "Acceptée", 50_000_000, 6.2, J, "8101"),
  offre(BTA, "Acceptée", 4_000_000_000, 6.5, J, "8112"),
  offre(BTA, "Acceptée", 10_000_000, 6.5, J, "8103"),
  offre(BTA, null, 10_000_000, 7.5, J, "8120"),
  offre(BTA, "Annulée", 4_000_000_000, 6.75, J, "8112"),
  offre(OTA, "Acceptée", 10_000_000_000, 94, J, "8115"),
  offre(OTA, null, 10_000_000, 87, J, "8101"),
];
const ENCHERES: LigneOja[] = [enchere(BTA, "Finie", 7500, J), enchere(OTA, "Rejetée", 1_250_000, "2026-06-03"), enchere(OTA, "Finie", 1_000_000, J)];
const TITRES: LigneOja[] = [titre(BTA, 1_000_000), titre(OTA, 10_000, "2A ( 2 ans )", 5.5, "2028-06-05")];

describe("lire un export OJA", () => {
  const r = agregerOja({ offres: OFFRES, encheres: ENCHERES, titres: TITRES });
  const bta = r.seances.find((s) => s.isin === BTA)!;
  const ota = r.seances.find((s) => s.isin === OTA)!;

  it("retrouve, au chiffre près, le communiqué du BTA 13 semaines du 21/10/2026", () => {
    expect(bta.valeurs.announced).toBe(7_500_000_000);
    expect(bta.valeurs.bid).toBe(4_070_000_000);
    expect(bta.valeurs.served).toBe(4_060_000_000);
    expect(bta.valeurs.coverage).toBeCloseTo(54.27, 2);
    expect([bta.valeurs.rateMin, bta.valeurs.rateMax, bta.valeurs.rateLimit]).toEqual([6.2, 7.5, 6.5]);
    expect(bta.valeurs.rateAvg).toBeCloseTo(6.4963, 4);
    expect(bta.valeurs.bidders).toBe(4);
    expect(bta.fiabilite).toBe("fiable");
    expect(bta.carnet.rejeteAuPrix).toBe(10_000_000);
  });

  it("retrouve celui de l'OTA à 2 ans : l'offre à 87 %, sous le prix limite, est rejetée au prix", () => {
    expect(ota.valeurs.announced).toBe(10_000_000_000);
    expect(ota.valeurs.bid).toBe(10_010_000_000);
    expect(ota.valeurs.served).toBe(10_000_000_000);
    expect(ota.valeurs.coverage).toBeCloseTo(100.1, 2);
    expect([ota.valeurs.priceMin, ota.valeurs.priceMax, ota.valeurs.priceLimit, ota.valeurs.priceAvg]).toEqual([87, 94, 94, 94]);
    expect(ota.valeurs.rateLimit).toBeUndefined();
  });

  it("ignore la séance rejetée de juin et ne la compte pas parmi les séances", () => {
    expect(r.seances.map((s) => s.isin).sort()).toEqual([BTA, OTA]);
  });

  it("le servi ne dépasse jamais l'annoncé, la moyenne sert les meilleurs prix d'abord", () => {
    const o: LigneOja[] = [offre(BTA, "Acceptée", 6_000_000_000, 6.0, J, "1"), offre(BTA, "Acceptée", 3_000_000_000, 6.5, J, "2")];
    const s = agregerOja({ offres: o, encheres: [enchere(BTA, "Finie", 7500, J)], titres: TITRES }).seances[0];
    expect(s.valeurs.served).toBe(7_500_000_000);
    expect(s.valeurs.rateAvg).toBeCloseTo((6000 * 6.0 + 1500 * 6.5) / 7500, 4);
    expect(s.valeurs.rateLimit).toBe(6.5);
  });

  it("avant le 1er février 2023 un rejet au prix est une offre Annulée au-dessus de la limite ; un retrait reste hors du total", () => {
    const j = "2022-03-23";
    const o: LigneOja[] = [offre(BTA, "Acceptée", 5_000_000_000, 6.0, j, "1"), offre(BTA, "Annulée", 2_000_000_000, 7.0, j, "2"), offre(BTA, "Annulée", 3_000_000_000, 5.5, j, "3")];
    const s = agregerOja({ offres: o, encheres: [enchere(BTA, "Finie", 7500, j)], titres: TITRES }).seances[0];
    expect(s.valeurs.bid).toBe(7_000_000_000);
    expect(s.valeurs.bidders).toBe(3);
    expect(s.fiabilite).toBe("a_confirmer");
  });

  it("depuis le 1er février 2023 une offre Annulée n'est jamais comptée dans les soumissions", () => {
    const j = DATE_SANS_ETAT;
    const o: LigneOja[] = [offre(BTA, "Acceptée", 5_000_000_000, 6.0, j, "1"), offre(BTA, "Annulée", 2_000_000_000, 7.0, j, "2")];
    const s = agregerOja({ offres: o, encheres: [enchere(BTA, "Finie", 7500, j)], titres: TITRES }).seances[0];
    expect(s.valeurs.bid).toBe(5_000_000_000);
  });

  it("ignore une séance dont une offre est « Reçue » (le carnet du jour) et le dit", () => {
    const rr = agregerOja({ offres: [...OFFRES, offre("GA1100002375", "Reçue", 10_000_000, 6.5, "2026-11-04")], encheres: ENCHERES, titres: TITRES });
    expect(rr.seances.some((s) => s.isin === "GA1100002375")).toBe(false);
    expect(rr.ignorees.enCours).toBe(1);
  });

  it("reprend du fichier Titres la durée, le coupon d'une obligation et l'échéance", () => {
    expect([bta.tenor, bta.couponRate, bta.maturityOn]).toEqual(["13 semaines", undefined, "2027-01-22"]);
    expect([ota.tenor, ota.couponRate, ota.maturityOn]).toEqual(["2 ans", 5.5, "2028-06-05"]);
  });

  it("ne garde ni compte ni nom : la séance porte des comptages", () => {
    expect(JSON.stringify(r.seances)).not.toMatch(/8101|8112|8115/);
  });

  it("sans fichier Enchères : pas d'annoncé, donc ni servi ni couverture, et le rapport le dit", () => {
    const sans = agregerOja({ offres: OFFRES, titres: TITRES });
    expect(sans.seances[0].valeurs.announced).toBeUndefined();
    expect(sans.seances[0].valeurs.coverage).toBeUndefined();
    expect(sans.seances[0].fiabilite).toBe("a_confirmer");
    expect(sans.avertissements.join(" ")).toMatch(/Enchères/);
  });

  it("reconnaît un fichier à ses en-têtes et refuse un fichier incomplet", () => {
    expect(reconnaitreFichier(["Titre", "Etat", "Volume", "Prix ajusté", "Compte du détenteur d'achteur"])).toBe("offres");
    expect(reconnaitreFichier(["Type des enchères", "Code des enchères", "multy auction code", "Etat"])).toBe("encheres");
    expect(reconnaitreFichier(["Type de titre", "Code", "Terme"])).toBe("titres");
    expect(reconnaitreFichier(["a", "b"])).toBeUndefined();
    expect(entetesManquants("offres", ["Titre", "Etat"])).toContain("Volume");
  });

  it("lit une date du classeur sous trois formes", () => {
    expect(jourDe(new Date("2026-10-21T14:00:00Z"))).toBe("2026-10-21");
    expect(jourDe("2026-10-21 14:00:00")).toBe("2026-10-21");
    expect(jourDe(46316)).toBe("2026-10-21");
    expect(jourDe(null)).toBeUndefined();
  });

  it("apparie par code et jour, puis au jour le plus proche à sept jours près (Tchad : deux jours d'écart)", () => {
    const desk = [{ codeEmission: "TD1200000826", sessionOn: "2020-05-20" }, { codeEmission: "TD1200000826", sessionOn: "2020-09-01" }];
    expect(apparier({ isin: "TD1200000826", date: "2020-05-22" }, desk)?.seance.sessionOn).toBe("2020-05-20");
    expect(apparier({ isin: "TD1200000826", date: "2020-05-20" }, desk)?.ecartJours).toBe(0);
    expect(apparier({ isin: "TD1200000826", date: "2020-06-20" }, desk)).toBeUndefined();
    expect(apparier({ isin: "TD1200000999", date: "2020-05-20" }, desk)).toBeUndefined();
  });
});

describe("la règle de priorité des sources (option 3B)", () => {
  const ctx = (date: string, pdf: Record<string, number>, excel: Record<string, number>, anomaliesVues?: string[]) => ({ date, pdf, excel, anomaliesVues });

  it("une erreur d'unité ×1000 : l'Excel est proposé", () => {
    expect(proposer("announced", ctx("2025-04-22", { announced: 16_055_000 }, { announced: 15_000_000_000 }))).toEqual({ source: "excel", raison: "erreur_unite" });
    expect(erreurDEchelle(30_000_000_000_000, 30_000_000_000)).toBe(true);
    expect(erreurDEchelle(5_000_000_000, 7_000_000_000)).toBe(false);
  });

  it("des valeurs égales à la tolérance près : concordant, le PDF reste", () => {
    expect(proposer("rateLimit", ctx("2026-10-21", { rateLimit: 6.5 }, { rateLimit: 6.504 })).raison).toBe("concordant");
  });

  it("quand le communiqué publie lui-même une contradiction, le PDF est gardé", () => {
    const p = proposer("priceAvg", ctx("2024-02-07", { priceAvg: 91.696, priceMin: 90, priceMax: 91 }, { priceAvg: 90.501 }, ["chiffre retenu {v} hors de la fourchette publiée"]));
    expect(p).toEqual({ source: "pdf", raison: "communique_contradictoire" });
  });

  it("avant le 1er février 2023 les soumissions et les soumissionnaires restent au PDF", () => {
    expect(proposer("bid", ctx("2021-03-10", { bid: 5e9 }, { bid: 7e9 }))).toEqual({ source: "pdf", raison: "ere_ambigue" });
    expect(proposer("bidders", ctx("2021-03-10", { bidders: 3 }, { bidders: 4 })).source).toBe("pdf");
    expect(proposer("bid", ctx("2024-03-10", { bid: 5e9, served: 6e9 }, { bid: 7e9 })).source).toBe("excel");
  });

  it("un écart sans contradiction ni erreur d'unité est laissé au desk : le PDF par défaut, « à trancher »", () => {
    expect(proposer("announced", ctx("2025-06-01", { announced: 10e9 }, { announced: 12e9 }))).toEqual({ source: "pdf", raison: "a_trancher" });
  });

  it("détecte un chiffre qui se contredit lui-même", () => {
    expect(seContredit({ served: 9.72e9, bid: 9.262e9 })).toBe(true);
    expect(seContredit({ rateMin: 6, rateMax: 6.5, rateLimit: 7 })).toBe(true);
    expect(seContredit({ announced: 10e9, bid: 5e9, coverage: 50, served: 5e9, rateMin: 6, rateMax: 7, rateLimit: 6.5, rateAvg: 6.4 })).toBe(false);
  });
});

describe("garder les deux sources, en exclure une, rapporter sur l'une ou sur les deux", () => {
  const base: SeancePlate & { codeEmission: string } = { codeEmission: BTA, sessionOn: "2025-04-22", announced: 16_055_000, bid: 16_055_000_000, served: 15_000_000, rateLimit: 6.6 };
  const excel = { announced: 15_000_000_000, bid: 16_055_000_000, served: 15_000_000_000, rateLimit: 6.6 };
  const versee = verserExcel(base, excel, { importId: "imp1", fiabilite: "fiable", carnet: { rejeteAuPrix: 0, nbOffres: 7 } });

  it("une séance sans source déclarée est un communiqué", () => {
    expect(sourcesDe(base).pdf?.announced).toBe(16_055_000);
    expect(etatSource(base).libelle).toBe("PDF");
  });

  it("verser l'Excel garde le PDF, propose l'Excel pour l'unité, et laisse les champs concordants au PDF", () => {
    expect(versee.pdf?.announced).toBe(16_055_000);
    expect(versee.excel?.announced).toBe(15_000_000_000);
    expect(valeursRetenues(versee).announced).toBe(15_000_000_000);
    expect(versee.retenu.rateLimit).toBe("pdf");
    expect(champsEnEcart(versee).sort()).toEqual(["announced", "served"]);
    expect(etatSource({ ...base, sources: versee }).libelle).toBe("PDF + Excel");
  });

  it("le desk tranche : la valeur écartée, le motif, l'auteur et la date sont gardés, et l'écart n'est plus ouvert", () => {
    const t = trancher(versee, "announced", "pdf", "le communiqué fait foi", "desk", "2026-11-06");
    expect(valeursRetenues(t).announced).toBe(16_055_000);
    expect(t.ecarts?.[0]).toMatchObject({ champ: "announced", pdf: 16_055_000, excel: 15_000_000_000, retenu: "pdf", par: "desk" });
    expect(ecartsOuverts(t)).toEqual(["served"]);
  });

  it("un second import ne défait pas un choix du desk", () => {
    const t = trancher(versee, "announced", "pdf", "le communiqué fait foi", "desk", "2026-11-06");
    const encore = verserExcel({ ...base, sources: t }, excel, { importId: "imp2", fiabilite: "fiable" });
    expect(encore.retenu.announced).toBe("pdf");
  });

  it("exclure l'Excel rend les valeurs du PDF ; exclure le PDF rend celles de l'Excel ; la séance garde ses deux jeux", () => {
    const sansExcel = exclure(versee, "excel", true);
    expect(valeursRetenues(sansExcel).announced).toBe(16_055_000);
    expect(patchDesColonnes(sansExcel).served).toBe(15_000_000);
    const sansPdf = exclure(versee, "pdf", true);
    expect(valeursRetenues(sansPdf).announced).toBe(15_000_000_000);
    expect(sansPdf.pdf?.announced).toBe(16_055_000);
    expect(etatSource({ ...base, sources: sansPdf }).libelle).toBe("Excel");
    const rien = exclure(sansPdf, "excel", true);
    expect(patchDesColonnes(rien).announced).toBeNull();
    expect(valeursRetenues(exclure(rien, "excel", false)).announced).toBe(15_000_000_000);
  });

  it("une puce par champ dit d'où vient la valeur", () => {
    const r = { ...base, sources: versee };
    expect(origineDuChamp(r, "rateLimit")).toBe("PDF + Excel");
    expect(origineDuChamp(r, "announced")).toBe("Excel");
    expect(origineDuChamp({ ...base }, "announced")).toBe("PDF");
  });

  it("un rapport lit une source seule ou les deux ensemble", () => {
    const seul: SeancePlate = { sessionOn: "2024-01-01", announced: 1 };
    const both = { ...base, sources: versee };
    const xl: SeancePlate = { sessionOn: "2025-01-01", sources: { excel: { announced: 5 }, retenu: { announced: "excel" } } };
    const rows = [seul, both, xl];
    expect(vueParSource(rows, "retenu")).toHaveLength(3);
    expect(vueParSource(rows, "pdf")).toHaveLength(2);
    expect(vueParSource(rows, "pdf").find((r) => r === undefined)).toBeUndefined();
    expect(vueParSource(rows, "pdf").map((r) => r.announced)).toEqual([1, 16_055_000]);
    expect(vueParSource(rows, "excel").map((r) => r.announced)).toEqual([15_000_000_000, 5]);
    expect(vueParSource(rows, "les-deux")).toEqual([both]);
    expect(CHAMPS).toContain("rateAvg");
  });
});
