import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Le garde-fou de l'échelle d'espacement.
 *
 * L'audit des marges du desk a trouvé un panneau sans retrait intérieur, une
 * table décalée de deux pixels de son propre titre, et vingt et une feuilles
 * qui avaient rattrapé la même chose à la main. Rien de tout cela n'était un
 * accident : les valeurs n'avaient pas de nom, donc personne ne voyait qu'il en
 * inventait une.
 *
 * Écrire la convention ne suffit pas, on l'a vérifié ailleurs : le lecteur de
 * bulletins a signalé soixante lectures partielles pendant un an sans que
 * personne n'agisse, parce que rien n'échouait. Ici quelque chose échoue.
 *
 * Deux gardes, et ni l'un ni l'autre ne demande de réécrire le passé :
 *
 *   1. Le retrait horizontal d'un corps de panneau appartient au panneau. Une
 *      feuille de page ne le redit pas.
 *   2. Ce qui sort de l'échelle ne doit pas se multiplier. Le compte du jour
 *      est gravé ci-dessous ; il peut descendre, il ne peut pas monter.
 */

const ROOT = path.resolve(__dirname, "../..");

/** L'échelle, telle que globals.css la déclare. */
const SCALE = [0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40];

/**
 * Les deux pas hérités, encore largement posés : ils marchent, ils ne
 * s'écrivent plus. Ils comptent comme hors échelle, et c'est voulu : c'est ce
 * compte-là qui doit décroître.
 */
const LEGACY = [14, 18];

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

/** Toute valeur en pixels posée par une propriété d'espacement. */
const SPACING = /(?<![-\w])(?:margin|padding|gap|row-gap|column-gap)(?:-(?:top|right|bottom|left|inline|block|inline-start|inline-end|block-start|block-end))?\s*:([^;}]+)/g;

interface Off {
  file: string;
  value: number;
}

const offScale = (): Off[] => {
  const out: Off[] = [];
  for (const f of cssFiles()) {
    const css = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of css.matchAll(SPACING)) {
      for (const px of m[1].matchAll(/(-?\d+(?:\.\d+)?)px/g)) {
        const v = Math.abs(Number(px[1]));
        if (!SCALE.includes(v)) out.push({ file: path.relative(ROOT, f).replace(/\\/g, "/"), value: v });
      }
    }
  }
  return out;
};

describe("l'échelle d'espacement", () => {
  it("garde l'échelle et les deux pas hérités dans globals.css", () => {
    const css = fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");
    for (const v of SCALE.filter((x) => x > 0)) expect(css, `le pas ${v}px n'est plus déclaré`).toMatch(new RegExp(`--s-\\d+:\\s*${v}px`));
    expect(css, "le retrait du panneau n'est plus nommé").toMatch(/--panel-inset:/);
  });

  it("laisse le retrait horizontal d'un corps de panneau au panneau", () => {
    // Le panneau le pose une fois, à zéro spécificité : une page qui a vraiment
    // besoin d'autre chose gagne, mais elle doit le dire avec padding-inline,
    // pas le réécrire par mégarde dans un raccourci.
    const css = fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");
    expect(css).toMatch(/:where\(\.panel\) > :where\(:not\([^)]*\)\) \{\s*padding-inline: var\(--panel-inset\)/);
  });

  it("ne laisse pas grandir ce qui sort de l'échelle", () => {
    const off = offScale();
    // Le compte du 23 septembre 2026, jour où l'échelle a été nommée.
    // Il descend quand une feuille se range ; il ne remonte pas.
    const LE_JOUR_OU = 573;
    const byValue = new Map<number, number>();
    for (const o of off) byValue.set(o.value, (byValue.get(o.value) ?? 0) + 1);
    const resume = [...byValue.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([v, n]) => `${v}px×${n}`)
      .join(" · ");
    expect(off.length, `valeurs hors échelle : ${resume}\nPoser un pas de l'échelle, ou baisser le plafond de ce test.`).toBeLessThanOrEqual(LE_JOUR_OU);
  });

  it("compte les deux pas hérités séparément, pour les voir descendre", () => {
    const legacy = offScale().filter((o) => LEGACY.includes(o.value));
    const LE_JOUR_OU = 309;
    expect(legacy.length, "14px et 18px sont les deux pas à retirer en passant, jamais en bloc").toBeLessThanOrEqual(LE_JOUR_OU);
  });
});
