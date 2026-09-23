import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Un fond littéral veut une encre littérale.
 *
 * La pastille des initiales du compte portait `background: #e0b65a` et
 * `color: var(--navy-text)`. Ce jeton vaut #0b2545 au clair et #9fc0f7 au
 * sombre : du bleu pâle sur de l'or, illisible, et invisible à qui ne teste
 * qu'un seul thème. Le fond ne changeait pas avec le thème, l'encre si.
 *
 * La règle : dans une même règle, un fond écrit en dur et une couleur de texte
 * tirée d'un jeton qui bascule ne vont pas ensemble. Ou les deux suivent le
 * thème, ou aucun des deux.
 */

const ROOT = path.resolve(__dirname, "../..");

const cssFiles = (): string[] => {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".css")) out.push(p);
    }
  };
  walk(path.join(ROOT, "src"));
  return out.sort();
};

/** Les jetons dont globals.css redéfinit la valeur pour le thème sombre. */
const flipping = (): Set<string> => {
  const g = fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");
  const start = g.indexOf(":root {");
  const light: Record<string, string> = {};
  for (const m of g.slice(start, g.indexOf("}", start)).matchAll(/(--[\w-]+):\s*([^;]+);/g)) light[m[1]] = m[2].trim();
  const out = new Set<string>();
  for (const m of g.matchAll(/(--[\w-]+):\s*([^;]+);/g)) if (light[m[1]] && m[2].trim() !== light[m[1]]) out.add(m[1]);
  return out;
};

const LITERAL_BG = /background(?:-color)?:\s*(#[0-9a-fA-F]{3,8}|rgb|white|black)/;

describe("les fonds littéraux", () => {
  it("ne portent pas une encre qui bascule avec le thème", () => {
    const flips = flipping();
    expect(flips.size, "aucun jeton ne change entre les deux thèmes : la mesure est cassée").toBeGreaterThan(10);
    const bad: string[] = [];
    for (const f of cssFiles()) {
      const css = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
        if (!LITERAL_BG.test(m[2])) continue;
        const col = /(?:^|;)\s*color:\s*var\((--[\w-]+)\)/.exec(m[2]);
        if (!col || !flips.has(col[1])) continue;
        bad.push(`${path.relative(ROOT, f).replace(/\\/g, "/")} · ${m[1].trim().split("\n").pop()?.trim().slice(0, 40)} · color: var(${col[1]})`);
      }
    }
    expect(bad, "fond écrit en dur et encre à jeton : l'un des deux doit changer d'avis").toEqual([]);
  });
});
