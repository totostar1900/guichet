import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { drapeauDe, monogrammeDe, avatarDe } from "@/components/Avatar";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * L'ACCUEIL « CARTES », 2 NOVEMBRE 2026 : sept décisions prises sur la planche de référence.
 * Le chiffre du portefeuille en tête (avant les devoirs) ; quatre gestes ronds ; l'aspect
 * « cartes » posé sur la racine de la page seule ; titres sobres à chevron ; lignes en une
 * carte, précédées d'un rond ; aucun pied réglementaire sur cette page.
 */
describe("l'Accueil « cartes »", () => {
  const page = code("src/app/Console.tsx");

  it("le chiffre du portefeuille vient AVANT les devoirs", () => {
    const hero = page.indexOf("className={styles.hero}");
    const devoirs = page.indexOf("<CeQuiVousAttend");
    expect(hero, "le héros a disparu").toBeGreaterThan(-1);
    expect(devoirs, "les devoirs ont disparu").toBeGreaterThan(-1);
    expect(hero, "le chiffre doit se lire avant les devoirs").toBeLessThan(devoirs);
  });

  it("les quatre gestes ronds mènent aux quatre pages", () => {
    for (const href of ["/moi/provision/alimenter", "/moi/provision/reprendre", "/titres", "/trader"]) expect(page, `le geste vers ${href} a disparu`).toContain(`href: "${href}"`);
  });

  it("l'aspect « cartes » est posé sur la racine de la page, jamais sur <html>", () => {
    expect(page).toContain('data-tuiles="cartes"');
    expect(code("src/lib/config.ts")).toMatch(/export const TUILES: AspectDesTuiles = "tuiles";/);
    expect(lire("src/app/globals.css")).toMatch(/\[data-tuiles="cartes"\]\s*\{[^}]*--tuile-rayon:\s*16px/);
  });

  it("aucun pied réglementaire sur l'Accueil", () => {
    expect(page).not.toMatch(/Votre capital est exposé|risques du marché/);
  });

  it("les lignes de l'Accueil sont sobres : titre à chevron et rond", () => {
    expect(code("src/components/accueil/TuilesDuHaut.tsx")).toMatch(/<SelectionDuDesk offres=\{offres\} sobre \/>/);
    expect(code("src/components/SelectionDuDesk.tsx")).toContain("<TitreDeBloc");
    expect(code("src/components/CeQuiFermeBientot.tsx")).toContain("<TitreDeBloc");
    expect(code("src/components/TitreDeBloc.tsx")).toContain("›");
  });

  it("l'avatar : le drapeau pour le Trésor, le monogramme pour le reste", () => {
    expect(drapeauDe("Cameroun")).toBe("🇨🇲");
    expect(monogrammeDe("Société Générale")).toBe("SO");
    expect(avatarDe({ issuer: "Trésor public du Cameroun", country: "Cameroun", title: "BTA" }).drapeau).toBe("🇨🇲");
    expect(avatarDe({ issuer: "Afriland First Bank", country: "Cameroun", title: "Obligation" })).toEqual({ mono: "AF" });
  });
});
