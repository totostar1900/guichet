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
  it("le calendrier a sa page, et plus de place sous la liste", () => {
    const liste = code("src/app/calendrier/page.tsx");
    expect(liste, "le calendrier est revenu sous la liste").not.toMatch(/GrilleDuMois|calendrier-des-seances/);
    expect(liste, "le lien vers la page dédiée a disparu").toMatch(/href="\/calendrier\/seances"/);
    const page = code("src/app/calendrier/seances/page.tsx");
    expect(page).toMatch(/<GrilleDuMois/);
    for (const href of ["/sondage", "/moi/suivies", "/echeances"]) expect(page, `le bouton vers ${href} a disparu`).toContain(`href="${href}"`);
  });
  it("la ligne d'une adjudication a son chevron et son calendrier, quelle que soit la densité", () => {
    expect(code("src/components/OfferBrowser.tsx")).toMatch(/<OfferCard [^>]*extension=\{adj\} \/>/);
    const oc = code("src/components/OfferCard.tsx");
    expect(oc).toMatch(/const compact = useDensity\(\) === "compact" \|\| extension;/);
    expect(oc).toMatch(/\{dos && extension && <CalendrierDeLaLigne o=\{o\}/);
    const cal = code("src/components/CalendrierDeLaLigne.tsx");
    for (const mot of ["Ouverture des soumissions", "Clôture des soumissions", "Résultats", "Règlement", "Échéance de la ligne"]) expect(cal, `l'étape « ${mot} » a disparu`).toContain(mot);
    expect(cal, "le temps qui reste est réécrit au lieu d'appeler joursEnMots").toMatch(/joursEnMots\(/);
  });
  it("la grille du mois : lundi en premier, un point par jour de clôture, jours sans séance inertes", () => {
    const g = code("src/components/market/GrilleDuMois.tsx");
    expect(g).toMatch(/\(premier\.getUTCDay\(\) \+ 6\) % 7/);
    expect(g).toMatch(/disabled=\{n === 0\}/);
    expect(g, "la grille invente des séances").not.toMatch(/Math\.random|faker/);
  });
});
