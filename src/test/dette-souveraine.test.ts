import { describe, expect, it } from "vitest";
import { adjugeParEmetteur, coteParEmetteur, fiches, RESERVES, total, type CouponAdjuge } from "@/lib/market/dette-souveraine";
import type { EncoursDette } from "@/lib/market/encours-dette";

/**
 * LA DETTE D'UN ÉTAT PAR SES DEUX PORTES, QUI NE SE PARLENT PAS.
 *
 * La cote publie son encours chaque séance ; l'adjudication n'en publie
 * aucun et il se déduit du coupon. Les additionner sans précaution donnerait
 * un chiffre juste à une date floue, d'où deux colonnes et deux dates.
 */
const cotee = (p: Partial<EncoursDette> & { issuer: string }): EncoursDette =>
  ({
    isin: "X", mnemo: "M", designation: "L", units: 1_000_000, nominalRemaining: 10_000,
    couponRate: 6, pricePct: 100, outstanding: 10_000_000_000, sessionDate: "2026-10-13",
    firstListedOn: "2024-01-01", amountRaised: 10_000_000_000, maturityYears: 5,
    amortisation: "IN FINE", periodicity: "AN", previousCouponOn: "2026-01-01", nextCouponOn: "2027-01-01",
    ...p,
  }) as EncoursDette;

const coupon = (p: Partial<CouponAdjuge> & { pays: string; code: string }): CouponAdjuge => ({
  taux: 6, montant: 600_000_000, le: "2026-03-01", echeance: "2029-03-01", ...p,
});

describe("la part cotée", () => {
  it("CALCULE LE COUPON SUR LE NOMINAL RESTANT, PAS SUR L'ENCOURS", () => {
    /* L'encours est au cours du jour : un titre à 95 doit son coupon sur
       cent. Les confondre sous-estimerait le service de cinq pour cent. */
    const m = coteParEmetteur([cotee({ issuer: "ETAT DU GABON", pricePct: 95, outstanding: 9_500_000_000 })]);
    const g = m.get("ETAT DU GABON")!;
    expect(g.encours).toBe(9_500_000_000);
    expect(g.coutAnnuel).toBe(600_000_000);
    expect(g.tauxMoyen).toBeCloseTo(6.32, 2);
  });

  it("additionne les lignes d'un même émetteur et garde la séance la plus récente", () => {
    const m = coteParEmetteur([
      cotee({ issuer: "A", sessionDate: "2026-10-01" }),
      cotee({ issuer: "A", sessionDate: "2026-10-13" }),
    ]);
    expect(m.get("A")!.lignes).toBe(2);
    expect(m.get("A")!.le).toBe("2026-10-13");
  });
});

describe("la part adjugée", () => {
  it("DÉDUIT LE PRINCIPAL DU COUPON", () => {
    const m = adjugeParEmetteur([coupon({ pays: "Congo", code: "CG1", taux: 6, montant: 600_000_000 })], "2026-10-14");
    expect(m.get("Congo")!.encours).toBe(10_000_000_000);
    expect(m.get("Congo")!.tauxMoyen).toBeCloseTo(6, 6);
  });

  it("ÉCARTE UNE LIGNE ÉCHUE : elle a payé son dernier coupon et ne doit plus rien", () => {
    const m = adjugeParEmetteur([coupon({ pays: "Congo", code: "CG1", echeance: "2026-01-01" })], "2026-10-14");
    expect(m.size).toBe(0);
  });

  it("GARDE LE COUPON LE PLUS RÉCENT, qui est le plus proche de ce qui reste dû", () => {
    /* Sur une ligne amortissable le coupon diminue avec le capital : le
       premier vu surestimerait le stock. */
    const m = adjugeParEmetteur(
      [
        coupon({ pays: "Gabon", code: "GA1", montant: 600_000_000, le: "2024-03-01" }),
        coupon({ pays: "Gabon", code: "GA1", montant: 300_000_000, le: "2025-03-01" }),
      ],
      "2026-10-14",
    );
    expect(m.get("Gabon")!.encours).toBe(5_000_000_000);
    expect(m.get("Gabon")!.lignes).toBe(1);
    expect(m.get("Gabon")!.le).toBe("2025-03-01");
  });
});

describe("les deux portes réunies", () => {
  it("GARDE UN ÉMETTEUR QUI N'EMPRUNTE QUE PAR UNE PORTE", () => {
    /* La BDEAC et les émetteurs privés n'adjugent pas : les trier hors de la
       liste ferait croire que la cote est souveraine. */
    const f = fiches(coteParEmetteur([cotee({ issuer: "BDEAC" })]), adjugeParEmetteur([coupon({ pays: "Congo", code: "C1" })], "2026-10-14"));
    expect(f.map((x) => x.emetteur).sort()).toEqual(["BDEAC", "Congo"]);
    expect(f.find((x) => x.emetteur === "BDEAC")!.adjuge).toBeUndefined();
  });

  it("classe du plus endetté au moins endetté, les deux portes comptées", () => {
    const f = fiches(
      coteParEmetteur([cotee({ issuer: "petit", outstanding: 1_000_000_000 })]),
      adjugeParEmetteur([coupon({ pays: "gros", code: "G", montant: 600_000_000 })], "2026-10-14"),
    );
    expect(f[0].emetteur).toBe("gros");
    expect(f[0].total).toBe(10_000_000_000);
  });

  it("le total porte la part adjugée, et les réserves sont nommées", () => {
    const f = fiches(coteParEmetteur([cotee({ issuer: "A" })]), adjugeParEmetteur([coupon({ pays: "A", code: "G" })], "2026-10-14"));
    const t = total(f);
    expect(t.cote).toBe(10_000_000_000);
    expect(t.adjuge).toBe(10_000_000_000);
    expect(t.partAdjugee).toBeCloseTo(50, 6);
    expect(RESERVES).toHaveLength(3);
  });
});

describe("les deux portes n'appellent pas le même État pareil", () => {
  it("RÉUNIT « ETAT DU GABON » ET « Gabon » SOUS UN SEUL TRÉSOR", () => {
    /* Sans cela la fiche brisait le Gabon en deux, 677 milliards cotés d'un
       côté et 424 adjugés de l'autre, et sa dette réelle de 1 101 milliards
       n'apparaissait nulle part. Le nommage est INJECTÉ : une seconde table
       d'alias à côté du registre est la faute qui a déjà coûté dix-sept avis
       de Guinée équatoriale et vingt-deux pièces BEAC. */
    const nommer = (b: string) => (/gabon/i.test(b) ? "État du Gabon" : b);
    const f = fiches(
      coteParEmetteur([cotee({ issuer: "ETAT DU GABON", outstanding: 677_000_000_000 })], nommer),
      adjugeParEmetteur([coupon({ pays: "Gabon", code: "GA1", montant: 600_000_000 })], "2026-10-14", nommer),
    );
    expect(f).toHaveLength(1);
    expect(f[0].emetteur).toBe("État du Gabon");
    expect(f[0].cote?.encours).toBe(677_000_000_000);
    expect(f[0].adjuge?.encours).toBe(10_000_000_000);
    expect(f[0].total).toBe(687_000_000_000);
  });
});
