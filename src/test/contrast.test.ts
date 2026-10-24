import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { bloc, contraste, ecrans, feuillesCss, globals, jetons, resoudre } from "./couleurs";

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

const cssFiles = feuillesCss;

/** Les jetons dont globals.css redéfinit la valeur pour le thème sombre. */
const flipping = (): Set<string> => {
  const g = globals();
  const light = jetons(bloc(g, ":root {"));
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

/**
 * Et la mesure, plutôt que la règle de pouce.
 *
 * La règle ci-dessus attrape un cas de figure. Celui-ci mesure : pour chaque
 * règle CSS qui pose à la fois un fond et une encre résolubles en couleurs, le
 * rapport de contraste doit tenir 4,5:1 sur **chacun** des écrans que
 * l'application peut rendre, et non sur le seul écran clair où on dessine.
 *
 * Ce qu'il a trouvé le 25 septembre 2026, quand il a été écrit : cinquante-sept
 * règles en dessous, dont « Comparer » de la barre du téléphone à 1,02:1, ce
 * qui est le contraste d'un texte invisible. Quarante-huit tenaient à trois
 * encres de statut trop pâles d'un cheveu, corrigées dans les jetons plutôt
 * qu'une par une ; le thème « dim », seul écran clair à redéfinir ses gris, en
 * portait trente-huit à lui seul.
 *
 * Ce qu'il ne mesure pas, faute de pouvoir le savoir en lisant un fichier :
 * l'encre posée sans fond, dont le sol vient d'un parent. La règle du dessus
 * couvre une part de ce cas.
 */
/* La mesure elle-même vit dans « couleurs.ts » : elle était écrite deux fois,
   et une troisième garde allait en faire une troisième copie. */
const themes = ecrans;
const resolve = resoudre;
const contrast = contraste;

describe("un fond et une encre dans la même règle", () => {
  it("mesure le contraste sur chaque écran, pas seulement le clair", () => {
    const screens = themes();
    expect(Object.keys(screens).length, "un seul écran connu : la mesure ne vaut rien").toBeGreaterThan(2);
    const bad: string[] = [];
    for (const f of cssFiles()) {
      const css = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const bgRaw = /(?:^|[\s;])background(?:-color)?\s*:\s*([^;]+);/.exec(m[2])?.[1];
        const inkRaw = /(?:^|[\s;])color\s*:\s*([^;]+);/.exec(m[2])?.[1];
        if (!bgRaw || !inkRaw) continue;
        let worst: { r: number; screen: string } | null = null;
        let unknown = false;
        for (const [screen, vars] of Object.entries(screens)) {
          const bg = resolve(bgRaw.split(" ")[0], vars);
          const ink = resolve(inkRaw, vars);
          if (!bg || !ink) {
            unknown = true;
            break;
          }
          const r = contrast(bg, ink);
          if (!worst || r < worst.r) worst = { r, screen };
        }
        if (unknown || !worst || worst.r >= 4.5) continue;
        const sel = m[1].trim().split("\n").pop()?.trim().slice(0, 44);
        bad.push(`${path.relative(ROOT, f).replace(/\\/g, "/")} · ${sel} · ${worst.r.toFixed(2)}:1 en ${worst.screen}`);
      }
    }
    expect(bad, "sous 4,5:1 : l'encre et son fond ne se distinguent plus sur cet écran").toEqual([]);
  });
});
