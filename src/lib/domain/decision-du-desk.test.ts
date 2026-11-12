import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { chiffreDeSaisie, lireDecision } from "./decision-du-desk";

const fr = (v: number, n: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n });

describe("la décision du desk se lit comme le desk l'écrit", () => {
  it("le prix pré-rempli par le niveau du marché (format français) est accepté : « 97,500 »", () => {
    const r = lireDecision({ itemId: "i1", pricePct: "97,500", minTitles: "10" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.pricePct).toBe(97.5);
  });

  it("tout ce que le champ peut afficher se relit à l'identique, séparateur de milliers compris", () => {
    for (const v of [97.5, 100, 6.2501, 105.125, 1234.5, 1000000]) {
      for (const n of [2, 3, 4]) expect(Number(chiffreDeSaisie(fr(v, n)))).toBeCloseTo(v, n);
    }
  });

  it("un taux précompté en virgule, une souscription minimale avec espaces (dont l'insécable fine)", () => {
    const t = lireDecision({ itemId: "i2", precountRate: "6,2500" });
    expect(t.ok && t.data.precountRate).toBe(6.25);
    const f = lireDecision({ itemId: "i3", minAmount: "1 000 000" });
    expect(f.ok && f.data.minAmount).toBe(1_000_000);
  });

  it("une valeur hors plage n'est pas « incomplète » : le message nomme le champ fautif et sa plage", () => {
    const r = lireDecision({ itemId: "i4", pricePct: "130" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/le prix \(de 50 à 120 % du nominal\)/);
      expect(r.error).not.toMatch(/incomplète/);
    }
  });

  it("un ticket non entier est refusé, nommé, sans accuser le prix", () => {
    const r = lireDecision({ itemId: "i5", pricePct: "97,5", minTitles: "1,5" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/ticket minimum/);
      expect(r.error).not.toMatch(/le prix/);
    }
  });

  it("une décision sans nombre est valide (tous les champs sont facultatifs) ; la source reste obligatoire", () => {
    expect(lireDecision({ itemId: "i6" }).ok).toBe(true);
    expect(lireDecision({}).ok).toBe(false);
  });

  it("la publication passe par cette lecture, et plus par un schéma qui ne lisait pas la virgule", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../app/desk/a-valider/actions.ts"), "utf8");
    expect(src).toMatch(/lireDecision\(raw\)/);
    expect(src).not.toMatch(/Décision incomplète/);
    expect(src).not.toMatch(/const decisionSchema/);
  });
});
