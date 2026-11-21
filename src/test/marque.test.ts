import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MARQUE, MARQUE_CSS } from "@/lib/marque";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * LES OR DE LA MAISON, ÉCRITS UNE FOIS (21 novembre 2026, « ramener les 23 littéraux sans changer leur couleur »).
 *
 * Le but est celui des campagnes : une couleur de marque qui se change en un endroit et suit partout (barre du haut, PDF, e-mails, palettes). « globals.css » et « palettes.css » gardent les or des THÈMES (« --gold… ») ; tout le reste lit « MARQUE » (TypeScript) ou « --marque-or… » (CSS).
 */
describe("les or de la marque", () => {
  it("valent exactement ce qui était écrit avant le regroupement", () => {
    expect(MARQUE).toEqual({ or: "#b8860b", orSombre: "#e0b65a", orVif: "#e2b94c" });
  });
  it("sont posés sur « :root » par la mise en page, une seule fois", () => {
    expect(MARQUE_CSS).toBe(":root{--marque-or:#b8860b;--marque-or-sombre:#e0b65a;--marque-or-vif:#e2b94c}");
    expect(lire("src/app/layout.tsx")).toMatch(/__html: MARQUE_CSS/);
  });
  it("n'ont plus aucun littéral ailleurs que dans leur source et dans les deux feuilles de thème", () => {
    const motifs = [/#e0b65a/i, /#b8860b/i, /#e2b94c/i, /rgba\(\s*224\s*,\s*182\s*,\s*90/i];
    const fautifs: string[] = [];
    const marche = (d: string) => {
      for (const e of readdirSync(d)) {
        const p = join(d, e);
        if (statSync(p).isDirectory()) {
          if (e === "i18n" || e === "test" || e === "node_modules") continue;
          marche(p);
        } else if (/\.(css|tsx?)$/.test(e) && !/(^|\/)(globals\.css|palettes\.css)$/.test(p) && !p.endsWith("lib/marque.ts")) {
          const s = lire(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
          for (const m of motifs) if (m.test(s)) fautifs.push(`${p} · ${m}`);
        }
      }
    };
    marche("src");
    expect(fautifs, "un or de la marque est de nouveau écrit en dur : lire MARQUE ou var(--marque-or…)").toEqual([]);
  });
  it("sont lus par la barre du haut, les PDF, l'e-mail, les palettes, la zone CEMAC, les statuts et la présentation", () => {
    for (const [f, motif] of [
      ["src/components/UserMenu.module.css", /var\(--marque-or-sombre\)/],
      ["src/app/layout.module.css", /var\(--marque-or-sombre\)/],
      ["src/components/NavTabs.module.css", /var\(--marque-or-sombre\)/],
      ["src/components/mobile/BarreDuHaut.module.css", /var\(--marque-or-vif\)/],
      ["src/lib/documents/pdf/primitives.tsx", /GOLD = MARQUE\.or/],
      ["src/lib/documents/pdf/offer-templates.tsx", /GOLD = MARQUE\.or/],
      ["src/lib/documents/pdf/company-templates.tsx", /GOLD = MARQUE\.or/],
      ["src/lib/notify/compose.ts", /\$\{MARQUE\.orSombre\}/],
      ["src/lib/palette.ts", /b: MARQUE\.or/],
      ["src/lib/market/couleurs.ts", /CEMAC_COLOR = MARQUE\.or/],
      ["src/components/statuts/Statuts.tsx", /stopColor=\{MARQUE\.orVif\}/],
      ["src/components/mobile/Presentation.tsx", /stroke=\{MARQUE\.or\}/],
    ] as const) expect(lire(f), f).toMatch(motif);
  });
});
