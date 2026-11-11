import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PLUS_PAGES } from "@/lib/plus/pages";

const code = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

/**
 * L'ACTIVITÉ REMPLACE « PLUS » (10 novembre 2026, planche « Accueil et page Trade », 2A) : le menu de l'Accueil, son bouton flottant et la page « Mon activité » sont une seule page, l'onglet « Activité » (/activite).
 */
describe("la page Activité", () => {
  it("lit les rubriques d'une seule table, et la page « Mon activité » y renvoie", () => {
    expect(PLUS_PAGES.map((p) => p.cle)).toEqual(["ordres", "sondages", "argent", "regles", "rentabilite", "provision", "documents"]);
    expect(code("src/app/activite/Rubriques.tsx")).toMatch(/PLUS_PAGES\.filter\(/);
    expect(code("src/app/moi/activite/page.tsx"), "l'ancienne page ne renvoie plus à l'Activité").toMatch(/redirect\("\/activite"\)/);
  });
  it("le menu de l'Accueil et le bouton flottant « Plus » ne reviennent pas", () => {
    for (const f of ["src/components/accueil/PlusDeLAccueil.tsx", "src/components/mobile/PlusFab.tsx"]) expect(fs.existsSync(path.join(process.cwd(), f)), `${f} est revenu`).toBe(false);
    expect(code("src/components/mobile/MobileShell.tsx")).not.toMatch(/PlusFab/);
  });
  it("porte le disponible avec ses deux gestes, les rubriques du dossier et les services sous leur ancre", () => {
    const p = code("src/app/activite/page.tsx");
    expect(p).toContain('href="/moi/argent"');
    expect(p).toContain('href="/moi/provision/reprendre"');
    expect(p).toMatch(/<section id="services"/);
    const r = code("src/app/activite/Rubriques.tsx");
    for (const h of ["/moi/profil", "/moi/compte", "/moi/securite", "/moi/documents"]) expect(r, `la rubrique ${h} a disparu`).toContain(h);
  });
});
