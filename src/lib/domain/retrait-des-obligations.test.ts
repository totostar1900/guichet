import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { lignesDeLaCote, motifDeRetrait } from "./listes";
import type { Offer } from "./types";

const obl = (id: string, maturityOn: string, extra: Partial<Offer> = {}): Offer =>
  ({ id, kind: "MARCHE", instrument: "obligation", status: "published", hidden: false, isin: `CM${id}`, title: id, couponRate: 6, nominal: 10000, maturityOn, lastPrice: 100, priceSource: "boc", operation: "cote", country: "Cameroun", countryName: "Cameroun", issuer: "x", blurb: "", documents: [], opensAt: "2020-01-01T09:00:00", deadlineAt: "2099-01-01T00:00:00", settleOn: "2026-11-11", commissionPct: 0, version: 1, ...extra }) as Offer;

const JOUR = "2026-11-12";

describe("les obligations retirées de la liste : remboursées, ou à échéance incertaine et proche", () => {
  it("une obligation dont l'échéance est passée est remboursée", () => {
    expect(motifDeRetrait(obl("a", "2026-08-16"), JOUR)).toBe("remboursee");
    expect(motifDeRetrait(obl("b", "2023-12-31"), JOUR)).toBe("remboursee");
  });

  it("le jour même de l'échéance, elle n'est pas encore remboursée", () => {
    expect(motifDeRetrait(obl("c", JOUR), JOUR)).toBeUndefined();
  });

  it("seule l'année est connue (31 décembre posé) et il reste moins d'un an : échéance incertaine", () => {
    expect(motifDeRetrait(obl("d", "2026-12-31"), JOUR)).toBe("echeance_incertaine");
  });

  it("une échéance au 31 décembre mais à plus d'un an, ou une date réelle proche, reste dans la liste", () => {
    expect(motifDeRetrait(obl("e", "2028-12-31"), JOUR)).toBeUndefined();
    expect(motifDeRetrait(obl("f", "2027-03-24"), JOUR)).toBeUndefined();
  });

  it("une action, un fonds ou une ligne du primaire ne sont jamais retirés par cette règle", () => {
    expect(motifDeRetrait({ ...obl("g", "2020-01-01"), instrument: "action" }, JOUR)).toBeUndefined();
    expect(motifDeRetrait({ ...obl("h", "2020-01-01"), kind: "OTA" }, JOUR)).toBeUndefined();
  });

  it("la liste de la cote ne les montre plus ; les autres obligations y restent", () => {
    const toutes = [obl("rembourse", "2026-08-16"), obl("incertaine", "2026-12-31"), obl("vivante", "2027-03-24")];
    expect(lignesDeLaCote(toutes, new Date(2026, 10, 12)).map((o) => o.id)).toEqual(["vivante"]);
  });

  it("le rapport BOC de la séance nomme ces lignes avec leur motif", () => {
    const rapport = fs.readFileSync(path.join(__dirname, "../../app/desk/bulletins/[seance]/Rapport.tsx"), "utf8");
    expect(rapport).toMatch(/motifDeRetrait\(o, seance\)/);
    expect(rapport).toMatch(/obligations retirées de la liste du Guichet/);
  });
});
