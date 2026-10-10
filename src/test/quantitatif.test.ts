import { describe, expect, it } from "vitest";
import {
  DUREES,
  granularitesPossibles,
  granulariteParDefaut,
  operationsDuClient,
  plageDeLaDuree,
  quantitatif,
  tranches,
} from "@/lib/domain/quantitatif";
import type { CashEntry } from "@/lib/domain/cash";
import type { EventLog, Intent, Offer } from "@/lib/domain/types";

/**
 * COMBIEN UN CLIENT A TRAITÉ, ET À QUELLE DATE ON LE COMPTE.
 *
 * La vue quantitative répond à une question simple et se trompe de trois
 * façons simples : compter un ordre au jour où il a été passé plutôt qu'au
 * jour où il a été réglé, compter comme volume une créance que personne n'a
 * payée, et dessiner des barres vides pour une fenêtre plus longue que
 * l'histoire du compte. Ces cas tiennent les trois.
 */
const OFFRE: Offer = {
  id: "o1",
  kind: "MARCHE",
  title: "BDEAC 5,45 % 2029",
  status: "published",
  isin: "CG0000000001",
} as unknown as Offer;

const ordre = (p: Partial<Intent> & { id: string; ref: string }): Intent =>
  ({
    offerId: "o1",
    offerVersion: 1,
    clientName: "Essai",
    clientSegment: "Personne physique",
    clientId: "u1",
    type: "achat",
    amount: 1_000_000,
    channel: "E-mail",
    state: "reglee",
    createdAt: "2026-09-21T09:00:00.000Z",
    updatedAt: "2026-09-21T09:00:00.000Z",
    ...p,
  }) as unknown as Intent;

const passage = (intentId: string, at: string, etat: string): EventLog =>
  ({ id: `e-${intentId}-${etat}`, at, kind: "intent", intentId, html: `L'ordre passe en : <b>${etat}</b>` }) as unknown as EventLog;

const espece = (at: string, amount: number, kind: CashEntry["kind"]): CashEntry =>
  ({ id: `c-${at}-${kind}`, userId: "u1", at, amount, kind, label: "essai" }) as CashEntry;

describe("le découpage des périodes", () => {
  it("couvre la plage de la première tranche entamée à la dernière", () => {
    expect(tranches({ from: "2026-09-21", to: "2026-10-10" }, "mois").map((t) => t.clef)).toEqual(["2026-09", "2026-10"]);
    expect(tranches({ from: "2026-02-10", to: "2026-11-30" }, "trimestre").map((t) => t.clef)).toEqual(["2026-T1", "2026-T2", "2026-T3", "2026-T4"]);
    expect(tranches({ from: "2024-06-01", to: "2026-01-05" }, "annee").map((t) => t.clef)).toEqual(["2024", "2025", "2026"]);
  });

  it("compte une tranche entamée en entier", () => {
    /* Un client arrivé le 21 septembre a un mois de septembre entier. Couper
       la tranche à son arrivée donnerait une première barre toujours basse,
       qu'on relirait comme un démarrage lent. */
    const [sept] = tranches({ from: "2026-09-21", to: "2026-10-10" }, "mois");
    expect(sept).toMatchObject({ from: "2026-09-01", to: "2026-09-30" });
  });

  it("passe les bornes d'année sans se perdre", () => {
    expect(tranches({ from: "2025-11-15", to: "2026-02-03" }, "mois").map((t) => t.clef)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(tranches({ from: "2025-11-15", to: "2026-02-03" }, "trimestre").map((t) => t.clef)).toEqual(["2025-T4", "2026-T1"]);
    // Février 2028 est bissextile : la dernière tranche doit finir le 29.
    expect(tranches({ from: "2028-02-01", to: "2028-02-10" }, "mois")[0].to).toBe("2028-02-29");
  });

  it("ne propose pas un découpage qui ne donnerait qu'une barre", () => {
    // Trois semaines d'histoire : ni l'année ni le trimestre ne veulent dire quoi que ce soit.
    expect(granularitesPossibles({ from: "2026-09-21", to: "2026-10-10" })).toEqual(["mois"]);
    expect(granularitesPossibles({ from: "2024-01-01", to: "2026-10-10" })).toEqual(["mois", "trimestre", "annee"]);
  });

  it("ouvre sur le découpage le plus large qui donne encore trois barres", () => {
    expect(granulariteParDefaut({ from: "2026-09-21", to: "2026-10-10" })).toBe("mois");
    expect(granulariteParDefaut({ from: "2026-01-01", to: "2026-10-10" })).toBe("trimestre");
    expect(granulariteParDefaut({ from: "2024-01-01", to: "2026-10-10" })).toBe("annee");
  });
});

describe("la durée d'observation", () => {
  it("part de la date demandée quand l'histoire est assez longue", () => {
    expect(plageDeLaDuree("a1", "2020-01-01", "2026-10-10")).toEqual({ plage: { from: "2025-10-10", to: "2026-10-10" }, rabotee: false });
    expect(plageDeLaDuree("a5", "2020-01-01", "2026-10-10").plage.from).toBe("2021-10-10");
  });

  it("se rabote à l'ouverture du compte, et le dit", () => {
    /* Cinq ans sur un compte de trois semaines dessinerait soixante barres
       vides, et une suite de zéros se relit comme une chute. */
    const r = plageDeLaDuree("a5", "2026-09-21", "2026-10-10");
    expect(r.plage).toEqual({ from: "2026-09-21", to: "2026-10-10" });
    expect(r.rabotee).toBe(true);
  });

  it("« tout » part de l'ouverture, et n'est jamais raboté", () => {
    expect(plageDeLaDuree("tout", "2026-09-21", "2026-10-10")).toEqual({ plage: { from: "2026-09-21", to: "2026-10-10" }, rabotee: false });
  });

  it("offre les quatre durées de la maison", () => {
    expect(DUREES.map((d) => d.nom)).toEqual(["1 an", "2 ans", "3 ans", "5 ans"]);
  });
});

describe("ce qu'on compte, et quand", () => {
  const intents = [
    ordre({ id: "i1", ref: "PF-0921-AAAA", amount: 3_100_000, type: "souscription" }),
    ordre({ id: "i2", ref: "PF-0929-BBBB", amount: 4_500_000, state: "servie" }),
    ordre({ id: "i3", ref: "PF-1002-CCCC", amount: 800_000, type: "vente" }),
    ordre({ id: "i4", ref: "PF-1005-DDDD", amount: 9_000_000, clientId: "u2" }),
    ordre({ id: "i5", ref: "PF-1006-EEEE", amount: 500_000, state: "annulee" }),
  ];
  const events = [
    passage("i1", "2026-09-23T10:00:00.000Z", "Réglée"),
    passage("i2", "2026-09-29T10:00:00.000Z", "Servie"),
    passage("i3", "2026-10-02T10:00:00.000Z", "Réglée"),
    passage("i4", "2026-10-05T10:00:00.000Z", "Réglée"),
  ];
  const cash = [
    espece("2026-09-22T08:00:00.000Z", 3_500_000, "provision"),
    espece("2026-09-23T08:00:00.000Z", 24_800, "frais"),
    espece("2026-10-08T08:00:00.000Z", 800_000, "restitution"),
    espece("2026-10-09T08:00:00.000Z", 50_000, "coupon"),
  ];
  const q = () => quantitatif("u1", intents, [OFFRE], events, cash, { from: "2026-09-21", to: "2026-10-10" }, "mois");

  it("ne garde que les opérations de ce client", () => {
    expect(operationsDuClient("u1", intents, [OFFRE], events).map((x) => x.ref)).not.toContain("PF-1005-DDDD");
  });

  it("laisse dehors un ordre annulé", () => {
    expect(operationsDuClient("u1", intents, [OFFRE], events).map((x) => x.ref)).not.toContain("PF-1006-EEEE");
  });

  it("situe un ordre à sa date de règlement, pas à celle de sa réception", () => {
    /* Un ordre reçu en septembre et réglé en octobre appartient à octobre,
       sinon le mois d'une adjudication porte un argent qui n'est pas arrivé. */
    const octobre = q().barres.find((b) => b.clef === "2026-10")!;
    expect(octobre.cessions).toBe(800_000);
    expect(q().barres.find((b) => b.clef === "2026-09")!.achats).toBe(3_100_000);
  });

  it("ne compte jamais dans le volume un ordre servi mais jamais réglé", () => {
    // Ce n'est pas du volume, c'est une créance : elle se montre à part.
    const r = q();
    expect(r.totaux.traite).toBe(3_900_000);
    expect(r.totaux.enDefaut).toBe(4_500_000);
    expect(r.totaux.refsEnDefaut).toEqual(["PF-0929-BBBB"]);
  });

  it("sépare les entrées des sorties au sens du mouvement", () => {
    const r = q();
    expect(r.totaux.entrees).toBe(3_550_000);
    expect(r.totaux.sorties).toBe(824_800);
    expect(r.totaux.commissions).toBe(24_800);
  });

  it("cumule l'investi net de tranche en tranche", () => {
    const [sept, oct] = q().barres;
    expect(sept.investiNet).toBe(3_100_000);
    expect(oct.investiNet).toBe(2_300_000);
  });

  it("donne le ticket médian des seules opérations réglées", () => {
    expect(q().totaux.ticketMedian).toBe(1_950_000);
    expect(q().totaux.operations).toBe(2);
  });

  it("et le même calcul au trimestre donne les mêmes totaux", () => {
    /* Changer de découpage ne change pas ce qui s'est passé : si un total
       bouge avec la granularité, c'est qu'une opération tombe entre deux
       tranches. */
    const parMois = quantitatif("u1", intents, [OFFRE], events, cash, { from: "2026-09-21", to: "2026-10-10" }, "mois");
    const parTrimestre = quantitatif("u1", intents, [OFFRE], events, cash, { from: "2026-09-21", to: "2026-10-10" }, "trimestre");
    expect(parTrimestre.totaux).toEqual(parMois.totaux);
    expect(parTrimestre.barres).toHaveLength(2);
  });
});
