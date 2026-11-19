import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PARAMETRES_PAGES } from "@/lib/nav-groups";

const lire = (f: string) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * PARAMÈTRES ET CONNEXION (19 novembre 2026, planche « Paramètres et connexion », 1A · 2A · 3A · 4A).
 * Le client : « Paramètres remonte et sort de Mon compte » ; Face ID, alertes et informations en interrupteurs ; le code se change sur sa page, code actuel exigé ; la méthode choisie s'offre toute seule à la connexion et au verrou.
 */
describe("Paramètres : une ligne du menu, hors de Mon compte (1A)", () => {
  it("le menu a sa ligne, juste sous « Mon compte »", () => {
    const menu = lire("src/components/mobile/BarreDuHaut.tsx");
    expect(menu).toMatch(/href="\/moi\/compte"[\s\S]{0,200}Mon compte[\s\S]{0,120}href="\/parametres"[\s\S]{0,200}Paramètres/);
    expect(PARAMETRES_PAGES.map((p) => p.href)).toEqual(["/parametres"]);
  });
});

describe("Paramètres : des interrupteurs, sans Apparence ni langue (2A)", () => {
  it("Face ID et le code ouvrent la section Connexion ; le code a sa page", () => {
    const c = lire("src/app/parametres/Connexion.tsx");
    expect(c).toMatch(/<Interrupteur[^>]*label=\{t\("Face ID ou empreinte"\)\}/);
    expect(c).toMatch(/href="\/parametres\/code"/);
  });
  it("le code du compte ne s'éteint pas : aucun interrupteur ne le porte", () => {
    expect(lire("src/app/parametres/Connexion.tsx")).not.toMatch(/Interrupteur[^>]*Code de connexion/);
  });
  it("un réglage qui échoue revient en arrière", () => {
    expect(lire("src/app/moi/appareil/Appareil.tsx")).toMatch(/setPrefs\(avant\)/);
    expect(lire("src/app/moi/appareil/Appareil.tsx")).toMatch(/\[canal\]: !on/);
  });
});

describe("Modifier le code : l'actuel d'abord, la coche à la fin (3A)", () => {
  const page = lire("src/app/parametres/code/ModifierLeCode.tsx");
  it("demande le code actuel, puis le nouveau, puis encore le nouveau", () => {
    expect(page).toMatch(/useState<Etape>\(aUnCode \? "actuel" : "nouveau"\)/);
    expect(page).toMatch(/verifierLeCode\(c\)/);
    expect(page).toMatch(/modifierLeCode\(actuel, c\)/);
  });
  it("le serveur revérifie l'ancien code avant de poser le nouveau", () => {
    const s = lire("src/app/verrou/actions.ts");
    const f = s.slice(s.indexOf("export async function modifierLeCode"));
    expect(f.indexOf("verifierCodeDuCompte(s, actuel)")).toBeGreaterThan(0);
    expect(f.indexOf("verifierCodeDuCompte(s, actuel)")).toBeLessThan(f.indexOf("poserCodeDuCompte(s, nouveau)"));
  });
  it("le code de ce navigateur reprend les nouveaux chiffres, et la fin se montre par une coche", () => {
    expect(page).toMatch(/enrolPin\(token, c, deviceLabel\(\)\)/);
    expect(page).toMatch(/Code modifié/);
    expect(lire("src/app/parametres/code/modifier.module.css")).toMatch(/prefers-reduced-motion/);
  });
});

describe("La méthode choisie s'offre toute seule (4A)", () => {
  it("le verrou propose Face ID dès qu'il paraît, avec le code dans un coin et « Code oublié ? » en bas", () => {
    const v = lire("src/components/VerrouDeLApp.tsx");
    expect(v).toMatch(/propose\.current = true;\s*parLaCle\(\)/);
    expect(v).toMatch(/Utiliser le code/);
    expect(v).toMatch(/Utiliser Face ID ou l'empreinte/);
    expect(v).toMatch(/marquerCodeOublie\(\)/);
  });
  it("la porte propose l'empreinte d'elle-même, une fois, et « Toucher pour réessayer » prend le relais", () => {
    const p = lire("src/app/connexion/PorteDeConnexion.tsx");
    expect(p).toMatch(/proposee\.current = true;\s*ouvrirParLaCle\(\)/);
    expect(p).toMatch(/Toucher pour réessayer/);
  });
  it("« Code oublié ? » : l'adresse est prouvée par le code reçu, puis un NOUVEAU code est choisi", () => {
    const c = lire("src/app/connexion/creer/CreerCompte.tsx");
    expect(c).toMatch(/const codeExiste = codeExisteBrut && !oublie/);
    expect(c).toMatch(/effacerCodeOublie\(\)/);
  });
  it("les anciennes adresses mènent à Paramètres", () => {
    for (const f of ["src/app/moi/securite/page.tsx", "src/app/moi/appareil/page.tsx"]) expect(lire(f)).toMatch(/redirect\("\/parametres"/);
  });
});
