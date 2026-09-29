import { describe, expect, it } from "vitest";
import { attendus, bilan, cleDuFlux, encaisseDepuis, natureDuFlux, suivre, type LigneTenue } from "@/lib/domain/encaissement";
import type { CashEntry } from "@/lib/domain/cash";

/**
 * « Échu » n'est pas « reçu », et c'est tout le service.
 *
 * L'application connaissait la date d'un coupon et jamais son encaissement ;
 * elle disait donc « échu », qui est vérifié, et ce mot prudent tenait lieu de
 * comptabilité. Ces contrôles portent sur la seule chose qui permette de dire
 * l'autre mot : le rapprochement d'un flux et d'un mouvement au journal.
 */

const LE_JOUR = new Date("2026-06-30T12:00:00Z");

const ligne = (intentId: string, titre: string, echus: [string, number, string][], aVenir: [string, number, string][] = []): LigneTenue => ({
  intentId,
  titre,
  echus: echus.map(([date, amount, label]) => ({ date, amount, label })),
  aVenir: aVenir.map(([date, amount, label]) => ({ date, amount, label })),
});

const mouvement = (flowKey: string, amount: number, at = "2026-05-16T09:00:00Z"): CashEntry => ({
  id: `e-${flowKey}`,
  userId: "u1",
  at,
  amount,
  kind: "coupon",
  label: "Coupon",
  flowKey,
});

describe("les trois états d'un flux", () => {
  const lignes = [ligne("i1", "Cameroun 2030", [["2026-03-15", 180_000, "Coupon"], ["2026-05-15", 180_000, "Coupon"]], [["2026-09-15", 180_000, "Coupon"]])];

  it("porte à venir ce dont l'échéance n'est pas passée", () => {
    const s = suivre(lignes, [], LE_JOUR);
    expect(s.find((f) => f.date === "2026-09-15")?.etat).toBe("a_venir");
  });

  it("porte attendu ce qui est échu et que le journal ignore", () => {
    const s = suivre(lignes, [], LE_JOUR);
    const mars = s.find((f) => f.date === "2026-03-15");
    expect(mars?.etat).toBe("attendu");
    /* Le retard est l'information qui décide : trois jours est un délai de
       place, cent sept jours est un incident. */
    expect(mars?.retardJours).toBe(107);
  });

  it("ne porte encaissé que ce qu'un mouvement clefé rapproche", () => {
    const cle = cleDuFlux("i1", { date: "2026-05-15", amount: 180_000, label: "Coupon" });
    const s = suivre(lignes, [mouvement(cle, 180_000)], LE_JOUR);
    expect(s.find((f) => f.date === "2026-05-15")?.etat).toBe("encaisse");
    expect(s.find((f) => f.date === "2026-05-15")?.encaisseLe).toBe("2026-05-16");
    /* Et le voisin ne bouge pas : un mouvement encaisse un flux, pas une ligne. */
    expect(s.find((f) => f.date === "2026-03-15")?.etat).toBe("attendu");
  });

  it("ignore les mouvements sans clef", () => {
    /* Provisions, règlements et frais ne répondent d'aucune échéance : les
       rapprocher par montant ferait passer une provision pour un coupon. */
    const provision: CashEntry = { id: "p", userId: "u1", at: "2026-03-16T00:00:00Z", amount: 180_000, kind: "provision", label: "Virement" };
    expect(suivre(lignes, [provision], LE_JOUR).every((f) => f.etat !== "encaisse")).toBe(true);
  });
});

describe("la clef d'un flux", () => {
  it("distingue deux lignes qui paient le même jour le même montant", () => {
    /* C'est le cas que le rapprochement par montant et par date confondrait, et
       une comptabilité qui devine n'est pas une comptabilité. */
    const a = cleDuFlux("i1", { date: "2026-05-15", amount: 180_000, label: "Coupon" });
    const b = cleDuFlux("i2", { date: "2026-05-15", amount: 180_000, label: "Coupon" });
    expect(a).not.toBe(b);
  });

  it("distingue deux flux identiques d'une même ligne par leur rang", () => {
    const lignes = [ligne("i1", "Ligne", [["2026-05-15", 90_000, "Coupon"], ["2026-05-15", 90_000, "Coupon"]])];
    const s = suivre(lignes, [], LE_JOUR);
    expect(new Set(s.map((f) => f.cle)).size).toBe(2);
  });

  it("n'en encaisse qu'un quand un seul mouvement se présente", () => {
    /* Sans le rang, les deux partageraient une clef et le second paraîtrait
       encaissé dès que le premier l'est. */
    const lignes = [ligne("i1", "Ligne", [["2026-05-15", 90_000, "Coupon"], ["2026-05-15", 90_000, "Coupon"]])];
    const premiere = suivre(lignes, [], LE_JOUR)[0].cle;
    const s = suivre(lignes, [mouvement(premiere, 90_000)], LE_JOUR);
    expect(s.filter((f) => f.etat === "encaisse")).toHaveLength(1);
    expect(s.filter((f) => f.etat === "attendu")).toHaveLength(1);
  });
});

describe("la nature comptable d'un flux", () => {
  it("range en remboursement ce qui rend du capital, même avec son dernier coupon", () => {
    expect(natureDuFlux("Coupon")).toBe("coupon");
    expect(natureDuFlux("Coupon + capital")).toBe("remboursement");
    expect(natureDuFlux("Remboursement")).toBe("remboursement");
  });
});

describe("ce qu'un réinvestissement a de quoi financer", () => {
  const lignes = [ligne("i1", "Ligne", [["2026-03-15", 100_000, "Coupon"], ["2026-05-15", 200_000, "Coupon"]], [["2026-09-15", 200_000, "Coupon"]])];
  const cle = (d: string, m: number) => cleDuFlux("i1", { date: d, amount: m, label: "Coupon" });
  const s = suivre(lignes, [mouvement(cle("2026-03-15", 100_000), 100_000, "2026-03-16T00:00:00Z"), mouvement(cle("2026-05-15", 200_000), 200_000)], LE_JOUR);

  it("ne compte que ce qui est arrivé", () => {
    /* Trois cent mille encaissés, et rien de ce qui est à venir : on ne
       réinvestit pas une promesse. */
    expect(encaisseDepuis(s)).toBe(300_000);
    expect(encaisseDepuis(s, "2026-04-01")).toBe(200_000);
  });

  it("résume les trois états sans jamais les additionner", () => {
    const b = bilan(s);
    expect(b.encaisse).toBe(300_000);
    expect(b.attendu).toBe(0);
    expect(b.aVenir).toBe(200_000);
    expect(b.nbAttendus).toBe(0);
  });

  it("donne au desk son retard le plus long", () => {
    const b = bilan(suivre(lignes, [], LE_JOUR));
    expect(b.nbAttendus).toBe(2);
    expect(b.retardMax).toBe(107);
    expect(attendus(suivre(lignes, [], LE_JOUR))).toHaveLength(2);
  });
});
