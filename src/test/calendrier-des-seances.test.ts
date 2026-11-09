import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { nomDeSeance } from "@/lib/domain/nom-de-ligne";

const code = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

/**
 * LES ADJUDICATIONS (9 novembre 2026, planche « Cartes, adjudications, portefeuille », 2B) : la séance est nommée par sa ligne, le titre de groupe ne colle plus et n'a plus de menu à droite, et un calendrier
 * des séances avec ses boutons ferme la page.
 */
describe("la page des adjudications", () => {
  it("nomme la séance par sa ligne, sans son pays, sauf quand le dernier segment porte un chiffre", () => {
    expect(nomDeSeance("OTA 6,25 % · 5 ans · Gabon")).toBe("OTA 6,25 % · 5 ans");
    expect(nomDeSeance("BTA 13 semaines · Tchad")).toBe("BTA 13 semaines");
    expect(nomDeSeance("Rachat OTA 6,50 % · éch. 14 févr. 2028")).toBe("Rachat OTA 6,50 % · éch. 14 févr. 2028");
    expect(nomDeSeance("BGFI Holding")).toBe("BGFI Holding");
  });
  it("le titre de groupe ne colle plus et n'a plus de menu à chevron à droite", () => {
    const b = code("src/components/OfferBrowser.tsx");
    expect(b).toMatch(/groupes=\{adj \? \[\] : titres\} collant=\{!adj\}/);
    expect(fs.readFileSync(path.join(process.cwd(), "src/components/market/TeteGroupe.module.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "")).toMatch(/\.teteLibre \{\s*position: static;/);
  });
  it("le calendrier des séances et ses boutons sont sous la liste", () => {
    const p = code("src/app/calendrier/page.tsx");
    expect(p).toMatch(/<OfferBrowser[^>]*lieu="adjudications"[^>]*\/>\s*\{\}\s*<BlocPlat id="calendrier-des-seances"/);
    expect(p).toMatch(/<GrilleDuMois/);
    expect(p).toMatch(/href="\/sondage"/);
    expect(p).toMatch(/href="\/moi\/suivies"/);
    expect(p, "le calendrier ne mène plus aux échéances").toMatch(/href="\/echeances" tout="Toutes les échéances"/);
  });
  it("la grille du mois : lundi en premier, un point par jour de clôture, jours sans séance inertes", () => {
    const g = code("src/components/market/GrilleDuMois.tsx");
    expect(g).toMatch(/\(premier\.getUTCDay\(\) \+ 6\) % 7/);
    expect(g).toMatch(/disabled=\{n === 0\}/);
    expect(g, "la grille invente des séances").not.toMatch(/Math\.random|faker/);
  });
});
