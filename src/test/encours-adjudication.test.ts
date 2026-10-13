import { describe, expect, it } from "vitest";
import { type Adjugee, couverture, dureeEnJours, echeanceCalculee, encoursA, PLAFOND, preparer, serieMensuelle } from "@/lib/market/encours-adjudication";

/**
 * UN STOCK RECONSTITUÉ NE VAUT QUE PAR CE QU'IL LAISSE DEHORS.
 *
 * Ces tests gardent trois choses, et ce sont les trois qui ont failli être
 * fausses : qu'une ligne sorte à son échéance et pas un jour plus tard, qu'un
 * montant hors d'échelle n'entre jamais dans un total, et qu'un code qui
 * reparaît à une autre date soit un abondement et non un doublon.
 */
const a = (p: Partial<Adjugee> & { cle: string; seance: string }): Adjugee => ({
  pays: "Tchad",
  instrument: "BTA",
  tenor: "26 semaines",
  servi: 10_000_000_000,
  ...p,
});

describe("la durée telle que le Trésor l'écrit", () => {
  it("rend les semaines, les mois et les ans", () => {
    expect(dureeEnJours("26 semaines")).toBe(182);
    expect(dureeEnJours("13 semaines")).toBe(91);
    expect(dureeEnJours("3 ans")).toBe(1096);
    expect(dureeEnJours("6 mois")).toBe(183);
  });

  it("REFUSE DE DEVINER CE QU'ELLE NE CONNAÎT PAS", () => {
    /* Une durée inventée place une échéance fausse, donc fait sortir une
       ligne du stock un jour qui n'est pas le sien. Mieux vaut la laisser
       dehors avec son motif. */
    expect(dureeEnJours("moyen terme")).toBeUndefined();
    expect(dureeEnJours("")).toBeUndefined();
    expect(dureeEnJours(undefined)).toBeUndefined();
  });

  it("calcule l'échéance quand la pièce la tait", () => {
    expect(echeanceCalculee("2024-01-24", "26 semaines")).toBe("2024-07-24");
  });
});

describe("ce qui entre dans le stock", () => {
  it("SORT LA LIGNE LE JOUR DE SON ÉCHÉANCE, PAS LE LENDEMAIN", () => {
    const { retenues } = preparer([a({ cle: "1", seance: "2024-01-24", echeance: "2024-07-26" })]);
    expect(encoursA(retenues, "2024-07-25").total).toBe(10_000_000_000);
    expect(encoursA(retenues, "2024-07-26").total).toBe(0);
  });

  it("N'EST PAS ENCORE AU STOCK LA VEILLE DE SA SÉANCE", () => {
    const { retenues } = preparer([a({ cle: "1", seance: "2024-01-24", echeance: "2024-07-26" })]);
    expect(encoursA(retenues, "2024-01-23").total).toBe(0);
    expect(encoursA(retenues, "2024-01-24").total).toBe(10_000_000_000);
  });

  it("GARDE DEHORS UN MONTANT HORS D'ÉCHELLE, ET DIT POURQUOI", () => {
    /* Le Tchad du 24 janvier 2024 : la pièce imprime 16 678 630 sous un
       en-tête « en millions », quand le bon de la même page imprime 2 703.
       Seize mille milliards servis en une séance par un Trésor de la zone
       n'est pas un record, c'est une unité. */
    const { retenues, laissees } = preparer([a({ cle: "1", seance: "2024-01-24", instrument: "OTA", tenor: "2 ans", servi: 16_678_630_000_000 })]);
    expect(retenues).toHaveLength(0);
    expect(laissees[0].motif).toBe("hors_echelle");
    expect(laissees[0].dit).toContain("unité");
    expect(PLAFOND).toBeLessThan(16_678_630_000_000);
  });

  it("GARDE DEHORS UN MONTANT MILLE FOIS TROP PETIT", () => {
    /* La Guinée équatoriale, trois millions de francs servis par un État. */
    const { retenues, laissees } = preparer([a({ cle: "1", seance: "2020-01-08", pays: "Guinée éq.", servi: 3_000_000 })]);
    expect(retenues).toHaveLength(0);
    expect(laissees[0].motif).toBe("hors_echelle");
  });

  it("UN CODE QUI REPARAÎT À UNE AUTRE DATE EST UN ABONDEMENT, PAS UN DOUBLON", () => {
    /* Le Trésor rouvre sa ligne : les deux montants s'ajoutent au stock. Les
       confondre amputerait la dette de tout ce qui a été abondé. */
    const { retenues, laissees } = preparer([
      a({ cle: "1", seance: "2024-01-17", codeEmission: "GA2K00000090", echeance: "2028-01-17", servi: 10_000_000_000 }),
      a({ cle: "2", seance: "2024-02-07", codeEmission: "GA2K00000090", echeance: "2028-01-17", servi: 20_000_000_000 }),
    ]);
    expect(retenues).toHaveLength(2);
    expect(laissees).toHaveLength(0);
    expect(encoursA(retenues, "2024-03-01").total).toBe(30_000_000_000);
  });

  it("LE MÊME CODE LE MÊME JOUR EST UNE PIÈCE COMPTÉE DEUX FOIS", () => {
    const { retenues, laissees } = preparer([
      a({ cle: "1", seance: "2020-01-29", codeEmission: "CG2A00000072", echeance: "2022-01-29", servi: 30_000_000_000 }),
      a({ cle: "2", seance: "2020-01-29", codeEmission: "CG2A00000072", echeance: "2022-01-29", servi: 30_000_000_000 }),
    ]);
    expect(retenues).toHaveLength(1);
    expect(laissees[0].motif).toBe("doublon");
    expect(encoursA(retenues, "2020-06-30").total).toBe(30_000_000_000);
  });

  it("LE MOTIF D'UNE PERSONNE PASSE AVANT LE NÔTRE", () => {
    /* Une séance écartée à la main pour « ce n'est pas un résultat » ne doit
       pas être rendue comme « hors d'échelle » : qui lit le rapport doit
       retrouver la décision qui a été prise, pas notre contrôle. */
    const { laissees } = preparer([a({ cle: "1", seance: "2019-10-02", servi: 3_000_000, ecartee: "avis d'annonce, pas un résultat" })]);
    expect(laissees[0].motif).toBe("ecartee");
    expect(laissees[0].dit).toContain("avis d'annonce");
  });

  it("UNE SÉANCE SERVIE À ZÉRO EST UN RÉSULTAT, ET ELLE LE RESTE", () => {
    const { retenues, laissees } = preparer([a({ cle: "1", seance: "2025-04-16", servi: 0 })]);
    expect(retenues).toHaveLength(0);
    expect(laissees[0].motif).toBe("servi_nul");
    expect(laissees[0].dit).toContain("résultat");
  });

  it("DIT SI L'ÉCHÉANCE VIENT DE LA PIÈCE OU D'UN CALCUL", () => {
    const { retenues } = preparer([
      a({ cle: "1", seance: "2024-01-24", echeance: "2024-07-26" }),
      a({ cle: "2", seance: "2024-01-24", servi: 12_000_000_000 }),
    ]);
    expect(retenues.map((r) => r.origineEcheance)).toEqual(["imprimee", "calculee"]);
    expect(retenues[1].echeance).toBe("2024-07-24");
  });

  it("SANS CODE, DEUX LIGNES IDENTIQUES LE MÊME JOUR NE SE DISTINGUENT PAS", () => {
    /* Et le doute profite au moins-disant : pour un STOCK, compter deux fois
       une pièce unique est pire que manquer une seconde séance réelle, parce
       qu'un encours trop gros ne se voit pas alors qu'un trou se cherche. */
    const { retenues, laissees } = preparer([
      a({ cle: "1", seance: "2024-01-24" }),
      a({ cle: "2", seance: "2024-01-24" }),
    ]);
    expect(retenues).toHaveLength(1);
    expect(laissees[0].motif).toBe("doublon");
  });
});

describe("la série et son aveu", () => {
  it("rend un point par fin de mois, et le stock y monte puis retombe", () => {
    const { retenues } = preparer([a({ cle: "1", seance: "2024-01-24", echeance: "2024-04-30" })]);
    const s = serieMensuelle(retenues);
    expect(s.map((p) => p.date)).toEqual(["2024-01-31", "2024-02-29", "2024-03-31", "2024-04-30"]);
    expect(s.map((p) => p.total)).toEqual([10_000_000_000, 10_000_000_000, 10_000_000_000, 0]);
  });

  it("LE TOTAL SE PRÉSENTE AVEC SA PART PUBLIÉE", () => {
    const c = couverture(252, 382);
    expect(c.part).toBeCloseTo(0.66, 2);
    expect(c.dit).toContain("plancher");
  });

  it("sépare les pays et les instruments sans perdre le total", () => {
    const { retenues } = preparer([
      a({ cle: "1", seance: "2024-01-24", echeance: "2026-01-24", pays: "Tchad", instrument: "OTA", tenor: "2 ans", servi: 16_000_000_000 }),
      a({ cle: "2", seance: "2024-01-24", echeance: "2024-07-24", pays: "Gabon", servi: 15_000_000_000 }),
    ]);
    const p = encoursA(retenues, "2024-03-01");
    expect(p.total).toBe(31_000_000_000);
    expect(p.parPays).toEqual({ Tchad: 16_000_000_000, Gabon: 15_000_000_000 });
    expect(p.parInstrument).toEqual({ OTA: 16_000_000_000, BTA: 15_000_000_000 });
    expect(Object.values(p.parPays).reduce((x, y) => x + y, 0)).toBe(p.total);
  });
});
