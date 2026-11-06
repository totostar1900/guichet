import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { famVars } from "@/lib/registry";

const lire = (p: string) => readFileSync(p, "utf8");
const css = (dir: string): string[] => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? css(p) : p.endsWith(".css") ? [p] : []; });

/**
 * PAS DE RECTANGLE BLANC EN THÈME SOMBRE (6 novembre 2026).
 *
 * Trois causes, trouvées au navigateur : des champs sans fond propre (le blanc du navigateur sous une encre claire : rien à lire), des couleurs claires
 * posées en ligne sur les pastilles de famille, et des états « choisi » en plein encre, donc clairs en sombre.
 */
describe("pas de rectangle blanc", () => {
  const g = lire("src/app/globals.css");

  it("donne aux champs un fond et une encre de thème, à spécificité nulle", () => {
    expect(g).toMatch(/:where\(input:not\([^)]*\), select, textarea\) \{[^}]*background-color: var\(--surface\)[^}]*color: var\(--ink\)/);
  });

  it("dit au navigateur le thème de chaque écran (listes, calendriers, champs natifs)", () => {
    expect(g).toMatch(/:root \{\s*color-scheme: light;/);
    expect(g).toMatch(/:root:not\(\[data-theme="light"\]\):not\(\[data-theme="dim"\]\) \{\s*color-scheme: dark;/);
    expect(g).toMatch(/:root\[data-theme="dark"\] \{\s*color-scheme: dark;/);
    expect(g).toMatch(/:root\[data-theme="dim"\] \{\s*color-scheme: light;/);
  });

  it("ne pose aucune couleur en ligne sur les huit familles de la maison", () => {
    for (const k of ["OTA", "BTA", "APE", "IPO", "RACHAT", "ACTION_COTEE", "OBLIGATION_COTEE", "OPCVM"]) expect(famVars(k), k).toEqual({});
  });

  it("n'écrit aucun fond blanc en dur hors des pages qui montrent un document", () => {
    const permis = new Set(["src/app/desk/a-valider/page.module.css"]);
    const fautes: string[] = [];
    for (const f of css("src")) {
      if (/globals\.css$|palettes\.css$/.test(f) || permis.has(f)) continue;
      lire(f).split("\n").forEach((l, i) => { if (/background(-color)?:\s*(#fff(fff)?|white)\s*;/i.test(l)) fautes.push(`${f}:${i + 1} · ${l.trim()}`); });
    }
    expect(fautes, "un fond blanc en dur reste blanc en thème sombre : prendre --surface ou --surface-2").toEqual([]);
  });

  it("ne remplit pas un état « choisi » de l'encre pleine : il passe par --choisi-*", () => {
    const fautes: string[] = [];
    for (const f of css("src")) {
      if (/globals\.css$/.test(f)) continue;
      const s = lire(f);
      for (const m of s.matchAll(/([^{}]*(?:aria-pressed="true"|aria-current="true"|\.ddOn|\.btnOn)[^{}]*)\{([^}]*)\}/g)) if (/background:\s*var\(--ink\)/.test(m[2])) fautes.push(`${f} · ${m[1].trim()}`);
    }
    expect(fautes).toEqual([]);
  });
});
