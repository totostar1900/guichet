import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { changementsDeLaLigne, champsModifiables } from "@/lib/domain/sondage";

const code = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

const base = { instrument: "OTA", country: "GA", tenor: "5 ans", rate: 7, pricePct: 97, montant: 100_000_000, seanceLe: "2026-11-20" };

/**
 * CE QUE LE DESK VOIT D'UNE INTENTION MODIFIÉE (9 novembre 2026). Modifier une intention du sondage est une écriture sur place (même référence) : elle passe par `audit()`, avec l'avant et
 * l'après complets, comme toute écriture métier de la maison ; le fil dit CE QUI a changé, champ par champ ; et la page du desk montre « modifiée le … » sous le client.
 */
describe("les gestes du client sur le sondage passent par l'audit", () => {
  it("dire ce qui change, champ par champ, même quand le montant ne bouge pas", () => {
    const apres = { ...base, rate: 6 };
    expect(changementsDeLaLigne(champsModifiables(base), champsModifiables(apres))).toEqual(["niveau : 7 → 6"]);
    expect(changementsDeLaLigne(champsModifiables(base), champsModifiables({ ...base, montant: 200_000_000, tenor: "7 ans" })).sort()).toEqual(["durée : 5 ans → 7 ans", "montant : 100000000 → 200000000"]);
    expect(changementsDeLaLigne(champsModifiables(base), champsModifiables(base)), "rien n'a changé").toEqual([]);
    expect(changementsDeLaLigne(champsModifiables(base), champsModifiables({ ...base, seanceLe: undefined, dansJours: 14 }))).toContain("séance visée : 2026-11-20 → —");
  });
  it("le dépôt, la modification, le remplacement et le retrait écrivent chacun dans l'audit, avant et après", () => {
    const src = code("src/app/sondage/actions.ts");
    expect(src).toMatch(/audit\("sondage\.depose", "sondage", c\.id, \{ before: null, after:/);
    expect(src).toMatch(/audit\("sondage\.modifie", "sondage", id, \{ before: \{[^}]*champsModifiables\(sienne\)[^}]*\}, after:/);
    expect(src).toMatch(/audit\("sondage\.remplace", "sondage", sienne\.id, \{ before:/);
    expect(src).toMatch(/audit\("sondage\.retire", "sondage", id, \{ before:/);
  });
  it("l'audit est écrit AVANT le fil et le journal, et le fil porte les champs changés", () => {
    const src = code("src/app/sondage/actions.ts");
    expect(src.indexOf('audit("sondage.modifie"'), "l'audit doit précéder le journal").toBeLessThan(src.indexOf('noter("sondage.modifie"'));
    expect(src, "le fil ne dit plus que le montant").toMatch(/<b>modifie<\/b> son intention · \$\{changements\.length/);
    expect(src, "le fil est revenu à « montant → montant »").not.toMatch(/modifie<\/b> son intention · \$\{fmt\(sienne\.montant\)\}/);
  });
  it("la page du desk lit l'audit et marque l'intention modifiée", () => {
    const page = code("src/app/desk/sondage/page.tsx");
    expect(page).toMatch(/listAudit\(\{ entity: "sondage"/);
    expect(page).toMatch(/a\.action !== "sondage\.modifie"/);
    expect(page).toMatch(/t\("modifiée le \{d\}"/);
  });
});
