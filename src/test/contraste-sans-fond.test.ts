import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { bloc, contraste, feuillesCss, globals, jetons, resoudre, rgb } from "./couleurs";

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

/* La mesure vit dans « couleurs.ts » : marcher les feuilles, lire les jetons
   d'un thème, résoudre une valeur, mesurer un rapport. Elle était écrite ici
   ET dans « contrast.test.ts », à la virgule près. */
const cssFiles = feuillesCss;

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
