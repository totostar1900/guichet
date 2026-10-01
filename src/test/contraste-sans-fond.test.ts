import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Une encre qui ne bascule pas, posée sans fond, sur un papier qui bascule.
 *
 * L'ANGLE MORT QUE CE CLIQUET FERME. `contrast.test.ts` mesure les règles qui
 * posent à la fois un fond et une encre, et il nomme lui-même ce qu'il ne voit
 * pas : « l'encre posée sans fond, dont le sol vient d'un parent ». Or une
 * encre sans fond hérite, au pire, du papier de la page. Si cette encre ne
 * change pas d'avis entre les thèmes alors que le papier change, elle disparaît
 * sur l'un des deux.
 *
 * CE QUE LA MESURE A TROUVÉ, le 2026-10-01 : vingt-deux règles, dont treize en
 * `var(--navy)` à **1,15:1** sur le papier sombre, c'est-à-dire invisibles. Et
 * elles n'étaient pas cantonnées au desk : quatre étaient sur la page d'accueil
 * publique, que tout visiteur dont le système est en sombre voyait ainsi.
 *
 * La règle était déjà écrite dans le système de design de la maison, et c'est
 * ce qui rend l'écart intéressant : « Le navy n'est pas une encre de thème. Il
 * ne s'éclaircit jamais, donc un texte navy disparaît dans la nuit. Le texte
 * prend `encre`, qui suit le thème ; le navy reste au fond plein, aux traits de
 * section et à la marque. » Une règle écrite que rien ne vérifie finit par ne
 * plus être suivie.
 *
 * ELLE A AUSSI TROUVÉ ONZE JETONS FANTÔMES : `var(--crit-ink, #b91c1c)` et
 * `var(--warn-ink, #92400e)`, dont les noms ne sont définis nulle part. Un nom
 * de jeton faux ne lève aucune erreur en CSS, il prend son repli en silence,
 * donc le rouge du thème clair s'appliquait aussi la nuit. Les vrais noms sont
 * `--crit` et `--warn`, et ils basculent.
 *
 * Ce cliquet est volontairement plus strict que le pire des cas réels : il
 * mesure contre le papier, alors qu'un parent peut poser une surface plus
 * favorable. Une règle qu'il signale à tort se corrige en lui donnant son fond,
 * ce qui la rend mesurable par l'autre cliquet : dans les deux cas l'écran y
 * gagne.
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

/** Les sources qui posent des variables en style inline : le JSX en pose beaucoup. */
const sourceFiles = (): string[] => {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".tsx") || e.name.endsWith(".ts")) out.push(p);
    }
  };
  walk(path.join(ROOT, "src"));
  return out.sort();
};

const globals = () => fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");

const bloc = (g: string, depuis: string): string => {
  const i = g.indexOf(depuis);
  if (i < 0) return "";
  const o = g.indexOf("{", i);
  let d = 0;
  for (let j = o; j < g.length; j++) {
    if (g[j] === "{") d++;
    else if (g[j] === "}") {
      d--;
      if (d === 0) return g.slice(o + 1, j);
    }
  }
  return "";
};

const jetons = (t: string): Record<string, string> => Object.fromEntries([...t.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

const rgb = (s: string): [number, number, number] | null => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

const resoudre = (value: string, vars: Record<string, string>, depth = 0): [number, number, number] | null => {
  if (depth > 5) return null;
  const v = value.trim();
  const direct = rgb(v);
  if (direct) return direct;
  if (v === "white") return [255, 255, 255];
  if (v === "black") return [0, 0, 0];
  const m = /^var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)$/.exec(v);
  if (!m) return null;
  if (vars[m[1]]) return resoudre(vars[m[1]], vars, depth + 1);
  return m[2] ? resoudre(m[2], vars, depth + 1) : null;
};

const luminance = ([r, g, b]: [number, number, number]): number => {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

const contraste = (a: [number, number, number], b: [number, number, number]): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};

describe("une encre posée sans fond", () => {
  it("ne reste pas fixe quand le papier bascule", () => {
    const g = globals();
    const clair = jetons(bloc(g, ":root {"));
    const sombre = { ...clair, ...jetons(bloc(g, "@media (prefers-color-scheme: dark)")) };
    const papier = resoudre("var(--paper)", sombre);

    // Si la mesure elle-même est cassée, elle ne doit pas passer en silence.
    expect(papier, "le papier sombre ne se résout pas : la mesure ne vaut rien").not.toBeNull();
    expect(clair["--paper"] === sombre["--paper"], "le papier ne change pas entre les thèmes : la mesure ne vaut rien").toBe(false);

    const mauvaises: string[] = [];
    for (const f of cssFiles()) {
      const css = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const decl = m[2];
        // Une règle qui pose son fond est mesurée par contrast.test.ts.
        if (/(?:^|[\s;])background(?:-color)?\s*:/.test(decl)) continue;
        const encre = /(?:^|[\s;])color\s*:\s*([^;]+);/.exec(decl)?.[1];
        if (!encre) continue;
        const c = resoudre(encre, clair);
        const s = resoudre(encre, sombre);
        if (!c || !s) continue;
        // Une encre qui bascule fait son travail : on ne juge que les fixes.
        if (c.join() !== s.join()) continue;
        const r = contraste(s, papier!);
        if (r >= 4.5) continue;
        const sel = m[1].trim().split("\n").pop()?.trim().slice(0, 44);
        mauvaises.push(`${path.relative(ROOT, f).replace(/\\/g, "/")} · ${sel} · ${encre.trim()} · ${r.toFixed(2)}:1 sur le papier sombre`);
      }
    }
    expect(mauvaises, "encre fixe sans fond : elle disparaît sur le papier sombre, prenez var(--ink) pour un texte ou var(--fill) pour un accent").toEqual([]);
  });

  it("ne retombe pas sur une couleur écrite en dur", () => {
    /* CE QUI ÉTAIT DANGEREUX N'EST PAS L'ABSENCE DU JETON, c'est la nature du
       repli. « var(--col-seance, 104px) » et « var(--line-leger, var(--line)) »
       ne sont définis nulle part, et c'est voulu : un crochet de réglage avec sa
       valeur par défaut, et un jeton optionnel qui retombe sur un jeton qui
       bascule. Les deux sont corrects.

       « var(--crit-ink, #b91c1c) » ne l'était pas : son repli est une couleur
       ÉCRITE EN DUR, et une couleur en dur ne peut pas suivre le thème. Comme
       --crit-ink n'existe pas, le repli s'appliquait toujours, donc le rouge du
       thème clair s'affichait aussi la nuit. Onze occurrences dans neuf
       fichiers, et rien ne les signalait : le vrai jeton, --crit, existait et
       basculait, à deux lettres près. */
    const definis = new Set<string>();
    for (const f of cssFiles()) for (const k of Object.keys(jetons(fs.readFileSync(f, "utf8")))) definis.add(k);

    const mauvais: string[] = [];
    for (const f of cssFiles()) {
      const css = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const m of css.matchAll(/var\((--[\w-]+)\s*,\s*([^)]+)\)/g)) {
        const [, jeton, repli] = m;
        if (definis.has(jeton)) continue;
        // Seules les couleurs comptent : une longueur ou un jeton ne mentent pas.
        if (!rgb(repli) && repli.trim() !== "white" && repli.trim() !== "black") continue;
        mauvais.push(`${path.relative(ROOT, f).replace(/\\/g, "/")} · var(${jeton}, ${repli.trim()})`);
      }
    }
    expect([...new Set(mauvais)], "ce jeton n'existe pas et son repli est une couleur en dur : elle ne suivra jamais le thème").toEqual([]);
  });
});
