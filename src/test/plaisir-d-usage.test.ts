import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lire = (f: string) => readFileSync(f, "utf8");
const sansNotes = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * « PLAISIR D'USAGE » (21 novembre 2026, planche du même nom, 5A · 6A · 7).
 *
 * 5A : l'appareil reconnu est gardé AUSSI par le serveur (cookie fermé au JavaScript), parce que Safari peut effacer le stockage du navigateur ; le bandeau « Entrer sans attendre un code » est parti, l'écran qui suit la connexion dit pourquoi on saisit son code.
 * 6A : la bulle de statut mesure 44 px. 7 : un champ écrit en 16 px au moins sur un écran tactile (sinon Safari zoome), les feuilles se bornent en « dvh », les petits boutons gardent une zone de toucher de 44 px.
 */
describe("l'appareil reconnu survit à un stockage effacé (5A)", () => {
  it("le serveur retient l'appareil à l'enrôlement et l'oublie avec lui", () => {
    const a = lire("src/app/moi/securite/actions.ts");
    expect(a, "l'enrôlement ne pose plus le cookie").toMatch(/retenirAppareil\(\{ id: r\.device\.id, token/);
    expect(a, "retirer l'appareil laisse son cookie").toMatch(/oublierAppareil\(id\)/);
    const c = lire("src/lib/auth/appareil-cookie.ts");
    expect(c, "le cookie n'est plus fermé au JavaScript").toMatch(/httpOnly: true/);
    expect(c, "le cookie n'est plus de longue durée").toMatch(/60 \* 60 \* 24 \* 400/);
  });
  it("la porte lit le jeton dans le cookie quand le navigateur n'en a plus, pour CET appareil seulement", () => {
    const a = sansNotes(lire("src/app/connexion/actions.ts"));
    expect(a).toMatch(/if \(!jeton\) \{[\s\S]*c\.id !== deviceId/);
    expect(a, "cinq codes faux ne retirent plus le cookie").toMatch(/forgotten\) await oublierAppareil\(deviceId\)/);
    expect(lire("src/app/connexion/page.tsx"), "la page ne donne plus l'appareil retenu à la porte").toMatch(/retenu=\{retenu \?/);
  });
  it("le jeton ne sort jamais du serveur : la porte ne reçoit ni jeton ni condensé", () => {
    expect(lire("src/app/connexion/page.tsx")).toMatch(/\{ id: retenu\.id, who: retenu\.who, name: retenu\.name \}/);
  });
  it("le bandeau de l'Accueil est parti ; l'écran du code dit pourquoi, et le refus aussi", () => {
    expect(existsSync("src/components/TrustNudge.tsx")).toBe(false);
    expect(lire("src/app/Console.tsx")).not.toMatch(/TrustNudge/);
    const c = lire("src/app/connexion/creer/CreerCompte.tsx");
    expect(c).toMatch(/Entrer sans attendre un code/);
    expect(c).toMatch(/t\("Pas sur cet appareil"\)/);
  });
});

describe("la bulle de statut (6A)", () => {
  const css = sansNotes(lire("src/components/statuts/Statuts.module.css"));
  it("mesure 44 px, respire quatre fois tant que rien n'est vu, et se tait si le téléphone demande moins de mouvement", () => {
    expect(css).toMatch(/\.bulle \{[^}]*width: 44px;[^}]*height: 44px;/);
    expect(css).toMatch(/\.bulle\[data-nouveau\] \.anneau \{\s*animation: bulle-respire 2\.6s ease-in-out 4;/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.bulle,\s*\.bulle\[data-nouveau\] \.anneau \{\s*animation: none;/);
  });
  it("porte l'étiquette « Nouveautés » jusqu'à la première ouverture", () => {
    const t = lire("src/components/statuts/Statuts.tsx");
    expect(t).toMatch(/CLE_OUVERTE/);
    expect(t).toMatch(/nouveaux > 0 && premiere && /);
  });
});

describe("l'iPhone (7)", () => {
  it("un champ tactile écrit en 16 px au moins", () => {
    expect(sansNotes(lire("src/app/globals.css"))).toMatch(/@media \(pointer: coarse\) \{\s*input:not\([^)]*\),\s*select,\s*textarea \{\s*font-size: 16px !important;/);
  });
  it("les feuilles se bornent aussi en « dvh » (la barre d'adresse de l'iPhone coupe « vh »)", () => {
    for (const f of ["src/components/mobile/Sheet.module.css", "src/components/mobile/Presentation.module.css", "src/components/NavTabs.module.css"]) {
      const css = sansNotes(lire(f));
      const vh = [...css.matchAll(/(max-)?height: (calc\(100vh[^;]*\)|100vh);/g)].map((m) => m[0].replace("100vh", "100dvh"));
      expect(vh.length, `${f} n'a plus de hauteur en vh`).toBeGreaterThan(0);
      for (const d of vh) expect(css, `${f} : « ${d} » manque`).toContain(d);
    }
  });
  it("les petits boutons (⋮, chevron, retour en haut) gardent une zone de toucher qui dépasse le dessin", () => {
    for (const [f, cls] of [["src/components/mobile/LineMenu.module.css", "dots"], ["src/components/mobile/CarteDepliee.module.css", "chevron"], ["src/components/BackToTop.module.css", "btn"]] as const) {
      expect(sansNotes(lire(f)), `${f} : .${cls}::after n'étend plus la cible`).toMatch(new RegExp(`\\.${cls}::after \\{\\s*content: "";\\s*position: absolute;\\s*inset: -\\d+px;`));
    }
  });
});
