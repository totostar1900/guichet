import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PLUS_PAGES, pagePlusDe } from "@/lib/plus/pages";

const code = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

/**
 * « PLUS » SE RETROUVE SUR CHAQUE PAGE QU'IL OUVRE (9 novembre 2026) : un bouton flottant reprend ses entrées, pour passer d'une page à l'autre sans repasser par l'Accueil.
 */
describe("le bouton flottant de « Plus »", () => {
  it("reconnaît les pages qu'ouvre « Plus », sous-pages comprises, et aucune autre", () => {
    expect(pagePlusDe("/moi/ordres")?.cle).toBe("ordres");
    expect(pagePlusDe("/moi/ordres/42")?.cle).toBe("ordres");
    expect(pagePlusDe("/sondage")?.cle).toBe("sondages");
    expect(pagePlusDe("/trader")?.cle).toBe("services");
    expect(pagePlusDe("/moi/suivies"), "une page que « Plus » n'ouvre pas porte le bouton").toBeUndefined();
    expect(pagePlusDe("/"), "l'Accueil a le menu, pas le bouton").toBeUndefined();
    expect(pagePlusDe("/moi/ordresX")).toBeUndefined();
  });
  it("les neuf entrées sont celles du menu de l'Accueil, lues d'une seule table", () => {
    expect(PLUS_PAGES.map((p) => p.cle)).toEqual(["ordres", "sondages", "coupons", "rentabilite", "provision", "versements", "prelevements", "documents", "services"]);
    expect(code("src/components/accueil/PlusDeLAccueil.tsx")).toMatch(/PLUS_PAGES\.map\(/);
    expect(code("src/components/mobile/PlusFab.tsx")).toMatch(/PLUS_PAGES\.filter\(/);
  });
  it("le bouton est monté avec l'enveloppe, pour un client connecté hors du desk, et retire la page où l'on se tient", () => {
    expect(code("src/components/mobile/MobileShell.tsx")).toMatch(/\{!deskHost && signedIn && <PlusFab \/>\}/);
    expect(code("src/components/mobile/PlusFab.tsx")).toMatch(/p\.cle !== ici\.cle/);
  });
});
