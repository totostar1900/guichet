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
  it("la ligne d'une adjudication a son chevron et son calendrier, quelle que soit la densité", () => {
    expect(code("src/components/OfferBrowser.tsx")).toMatch(/<OfferCard [^>]*extension=\{adj\} \/>/);
    const oc = code("src/components/OfferCard.tsx");
    expect(oc).toMatch(/const compact = useDensity\(\) === "compact" \|\| extension \|\| sansExtension;/);
    expect(oc).toMatch(/\{dos && extension && <CalendrierDeLaLigne o=\{o\}/);
    const cal = code("src/components/CalendrierDeLaLigne.tsx");
    for (const mot of ["Ouverture des soumissions", "Clôture des soumissions", "Résultats", "Règlement", "Échéance de la ligne"]) expect(cal, `l'étape « ${mot} » a disparu`).toContain(mot);
    expect(cal, "le temps qui reste est réécrit au lieu d'appeler joursEnMots").toMatch(/joursEnMots\(/);
  });
  it("le calendrier des séances n'existe plus : ni la page, ni la grille, ni un lien qui y mène", () => {
    expect(fs.existsSync(path.join(process.cwd(), "src/app/calendrier/seances/page.tsx")), "la page du calendrier est revenue").toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), "src/components/market/GrilleDuMois.tsx")), "la grille du mois est revenue").toBe(false);
    for (const f of ["src/components/OfferBrowser.tsx", "src/app/marche/adjudications/page.tsx", "src/app/calendrier/page.tsx"]) expect(code(f), `${f} mène de nouveau au calendrier des séances`).not.toContain("/calendrier/seances");
  });
});
