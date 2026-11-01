import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { A_CONVERTIR, CONVERTIES, PAR_LA_PILE, VITRINE } from "./espace-registre";

const lire = (f: string) => readFileSync(f, "utf8");
const sansNotes = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
/** La règle d'un conteneur, sans ses commentaires. */
const regle = (f: string, cls: string) => (sansNotes(lire(f)).match(new RegExp(`(?:^|\\n)\\.${cls}\\s*\\{[^}]*\\}`)) ?? [""])[0];
const gapDe = (r: string) => /(?<![-\w])gap:\s*([^;]+);/.exec(r)?.[1].trim();

/**
 * L'ESPACE D'UNE PAGE, TENU PAR CINQ JETONS ET UNE PILE (ETALON.md § 8).
 *
 * Décidé le 31 octobre 2026, après une revue mesurée au navigateur de 57
 * pages : huit valeurs d'écart entre sections, un en-tête qui ajoutait ses
 * marges à l'écart de la page, un panneau qui portait la sienne, et un cliquet
 * qui cherchait une chaîne dans un fichier au lieu de lire un conteneur.
 *
 * CE QUE CE FICHIER TIENT : que les mesures sont déclarées une fois et valent
 * ce que la doctrine dit ; que la pile retire la marge du panneau ; que l'en-
 * tête range la flèche et le titre en un bloc ; et que chaque feuille de page
 * est soit convertie, soit nommée « à convertir » — jamais silencieusement
 * hors du jeton.
 */
describe("les mesures de l'espace d'une page", () => {
  /* Les préréglages d'aspect (« html[data-tuiles=…] ») REDISENT des jetons à dessein : ils ne comptent pas comme une seconde déclaration. */
  const globals = sansNotes(lire("src/app/globals.css")).replace(/html\[data-tuiles="\w+"\]\s*\{[^}]*\}/g, "");

  it("sont déclarées une fois, dans globals.css, et valent ce que la doctrine dit", () => {
    expect(globals, "--sections-gap n'est plus 28 px").toMatch(/--sections-gap:\s*28px;/);
    expect(globals, "--tuiles-gap n'est plus 12 px (--s-6)").toMatch(/--tuiles-gap:\s*var\(--s-6\);/);
    expect(globals, "--titre-gap n'est plus 12 px (--s-6)").toMatch(/--titre-gap:\s*var\(--s-6\);/);
    expect(globals, "--retour-gap n'est plus 12 px (--s-6)").toMatch(/--retour-gap:\s*var\(--s-6\);/);
    // Chaque jeton n'est déclaré qu'une fois : une seconde valeur gagnerait en silence.
    for (const j of ["--sections-gap", "--tuiles-gap", "--titre-gap", "--retour-gap"]) {
      expect((globals.match(new RegExp(`${j}:`, "g")) ?? []).length, `${j} est déclaré plusieurs fois`).toBe(1);
    }
  });

  it("sont nommées dans la doctrine, avec leur valeur", () => {
    const doc = lire("ETALON.md");
    expect(doc, "ETALON.md n'a plus sa section « L'espace d'une page »").toMatch(/## 8\. L'espace d'une page/);
    /* UNE LIGNE DE LA TABLE, pas une simple mention : le nom d'un jeton revient dans
       les règles et les exemples, et « le texte le cite » ne prouve pas qu'il est mesuré. */
    for (const j of ["--sections-gap", "--tuiles-gap", "--titre-gap", "--retour-gap", "--entete-marge"]) {
      expect(doc, `la table de la doctrine n'a plus la ligne de ${j}`).toMatch(new RegExp(`\\n\\| \`${j}\` \\|`));
    }
    expect(doc, "la doctrine ne dit plus que le conteneur d'une page est la classe pile").toMatch(/Son conteneur est la classe globale `pile`/);
    expect(doc, "la doctrine ne dit plus 28 px").toMatch(/`--sections-gap` \| \*\*28 px\*\*/);
  });
});

describe("la pile", () => {
  it("empile, lit le jeton, remet l'en-tête à zéro et retire la marge du panneau", () => {
    const css = sansNotes(lire("src/app/globals.css"));
    const pile = /(?:^|\n)\.pile\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(pile.length, "la classe « pile » est introuvable : la clause ne garde plus rien").toBeGreaterThan(30);
    expect(pile, "la pile n'empile plus").toMatch(/display:\s*flex;[\s\S]*flex-direction:\s*column;/);
    expect(pile, "la pile ne lit plus --sections-gap").toMatch(/gap:\s*var\(--sections-gap\);/);
    expect(pile, "la pile n'enlève plus la marge de l'en-tête").toMatch(/--entete-marge:\s*0px;/);
    expect(pile, "la pile n'enlève plus la marge du bouton de rappel des repères").toMatch(/--replay-marge:\s*0px;/);
    expect(css, "le panneau garde sa marge dans la pile : elle s'ajoute au gap").toMatch(/\.pile > \.panel\s*\{\s*margin-bottom:\s*0;/);
  });

  it("est portée par les pages qui s'en servent", () => {
    for (const f of PAR_LA_PILE) expect(lire(f), `${f} ne porte plus la classe « pile »`).toMatch(/className=(?:"pile"|\{`pile )/);
  });
});

describe("ce qui s'ajoutait à l'écart d'une pile", () => {
  it("le bouton de rappel des repères lit sa marge, et la pile la remet à zéro", () => {
    const css = sansNotes(lire("src/components/mobile/CoachMarks.module.css"));
    expect(css, "le bouton de rappel n'a plus de marge réglable : une pile ne peut plus la retirer").toMatch(/\.replay\s*\{[^}]*margin-top:\s*var\(--replay-marge, var\(--s-10\)\);/);
  });
});

describe("l'en-tête d'une page", () => {
  it("range la flèche et le titre dans un seul bloc, séparés par --retour-gap", () => {
    const tsx = sansNotes(lire("src/components/EnTete.tsx").replace(/\{\/\*[\s\S]*?\*\/\}/g, ""));
    expect(tsx, "la flèche et le titre ne sont plus rangés dans un seul bloc").toMatch(/<div className=\{styles\.entete\}>[\s\S]*<LienRetour[\s\S]*<header[\s\S]*<\/header>\s*<\/div>/);
    const css = sansNotes(lire("src/components/EnTete.module.css"));
    expect(css, "la flèche n'est plus à --retour-gap du titre").toMatch(/\.retour\s*\{[^}]*margin-bottom:\s*var\(--retour-gap\);/);
    expect(css, "l'en-tête a repris une marge propre sous lui-même").toMatch(/\.tete\s*\{\s*margin:\s*0;/);
  });
});

describe("chaque feuille de page est convertie, ou le dit", () => {
  it("les pages converties lisent le jeton, sans valeur en dur ni --s-*", () => {
    for (const [f, cls] of CONVERTIES) {
      const g = gapDe(regle(f, cls));
      expect(g, `${f} : « .${cls} » n'écrit plus son gap au jeton (il écrit « ${g} »)`).toBe("var(--sections-gap)");
    }
  });

  it("les pages à convertir écrivent encore leur propre écart — et le disent ici", () => {
    for (const [f, cls] of A_CONVERTIR) {
      const g = gapDe(regle(f, cls));
      expect(g, `${f} : « .${cls} » n'a plus de gap en dur : elle est convertie, il faut la sortir de « A_CONVERTIR »`).toBeTruthy();
      expect(g, `${f} : « .${cls} » lit déjà le jeton : sortez-la de « A_CONVERTIR » et mettez-la dans « CONVERTIES »`).not.toBe("var(--sections-gap)");
    }
  });

  it("aucune feuille de page ne pose un écart en dur sans être nommée", () => {
    const connues = new Set([...CONVERTIES, ...A_CONVERTIR, ...VITRINE].map(([f, c]) => `${f}#${c}`));
    const trouvees: string[] = [];
    const marche = (d: string) => {
      for (const e of readdirSync(d)) {
        const p = join(d, e);
        if (statSync(p).isDirectory()) {
          if (e === "desk" || e === "api") continue;
          marche(p);
        } else if (e === "page.module.css") {
          const css = sansNotes(lire(p));
          for (const m of css.matchAll(/(?:^|\n)\.(page|wrap|main)\s*\{([^}]*)\}/g)) {
            const g = gapDe(m[0]);
            const dispo = /display:\s*(flex|grid)/.test(m[2]);
            if (dispo && g && g !== "var(--sections-gap)" && !connues.has(`${p}#${m[1]}`)) trouvees.push(`${p} · .${m[1]} · gap ${g}`);
          }
        }
      }
    };
    marche("src/app");
    expect(trouvees, `ces pages écrivent leur propre écart sans être nommées dans espace-registre.ts :\n  ${trouvees.join("\n  ")}`).toEqual([]);
  });

  it("et le relevé voit bien des feuilles (non-vacuité)", () => {
    expect(CONVERTIES.length, "le registre des pages converties est presque vide").toBeGreaterThan(15);
    let n = 0;
    const marche = (d: string) => {
      for (const e of readdirSync(d)) {
        const p = join(d, e);
        if (statSync(p).isDirectory()) { if (e !== "desk") marche(p); } else if (e === "page.module.css") n++;
      }
    };
    marche("src/app");
    expect(n, "le relevé ne voit presque plus de feuilles de page").toBeGreaterThan(30);
  });
});

/**
 * L'ASPECT DES TUILES : UN MOT, TROIS PRÉRÉGLAGES (ETALON.md § 8.7).
 *
 * « Des tuiles moins prononcées », « des lignes fines à la place des tuiles,
 * partout » : deux demandes qui doivent tenir en une ligne. Elles tiennent à
 * CONDITION qu'aucune liste de tuiles n'écrive son fond, son bord ou son rayon
 * en dur — c'est ce que ces clauses lisent, famille par famille.
 */
const FAMILLES_DE_TUILES: [string, string][] = [
  ["src/components/mobile/Rubriques.module.css", ".ligne"],
  ["src/components/CeQuiFermeBientot.module.css", ".ligne"],
  ["src/app/trader/page.module.css", ".tuile"],
  ["src/app/info/aide/aide.module.css", ".tile"],
  ["src/app/info/page.module.css", ".tile"],
  ["src/app/info/page.module.css", ".lesson"],
];

describe("l'aspect des tuiles", () => {
  const globals = sansNotes(lire("src/app/globals.css"));

  it("a un jeu de jetons, et trois préréglages dont deux ne redisent que ce qui change", () => {
    for (const j of ["--tuile-fond", "--tuile-bord", "--tuile-trait", "--tuile-rayon", "--tuile-pad-x", "--tuile-pad-y"]) {
      expect(globals, `le jeton ${j} n'est plus déclaré dans « :root »`).toMatch(new RegExp(`(?:^|\\n)\\s*${j}:`));
    }
    for (const mot of ["douces", "lignes"]) expect(globals, `le préréglage « ${mot} » a disparu`).toMatch(new RegExp(`html\\[data-tuiles="${mot}"\\]\\s*\\{`));
    const lignes = /html\[data-tuiles="lignes"\]\s*\{([^}]*)\}/.exec(globals)?.[1] ?? "";
    expect(lignes, "« lignes » n'enlève plus le bord").toMatch(/--tuile-bord:\s*0;/);
    expect(lignes, "« lignes » n'a plus son trait de séparation").toMatch(/--tuile-trait:\s*1px solid/);
    expect(lignes, "« lignes » laisse un écart entre les lignes").toMatch(/--tuiles-gap:\s*0px;/);
  });

  it("se choisit en un mot, dans config.ts, posé sur <html>", () => {
    expect(lire("src/lib/config.ts"), "le mot des tuiles n'est plus dans config.ts").toMatch(/export const TUILES: AspectDesTuiles = "(tuiles|douces|lignes)";/);
    expect(lire("src/lib/config.ts"), "le type ne nomme plus les trois aspects").toMatch(/AspectDesTuiles = "tuiles" \| "douces" \| "lignes"/);
    expect(sansNotes(lire("src/app/layout.tsx")), "la mise en page ne pose plus le mot sur <html>").toMatch(/<html lang=\{lang\} data-tuiles=\{TUILES\}/);
  });

  it("est lu par chaque famille de tuiles, sans fond, bord ni rayon en dur", () => {
    for (const [f, sel] of FAMILLES_DE_TUILES) {
      const m = new RegExp(`(?:^|\\n)\\${sel}\\s*\\{([^}]*)\\}`).exec(sansNotes(lire(f)));
      expect(m, `${f} : « ${sel} » est introuvable`).not.toBeNull();
      const r = m![1];
      expect(r, `${f} ${sel} : le fond n'est plus celui des tuiles`).toMatch(/background:\s*var\(--tuile-fond\);/);
      expect(r, `${f} ${sel} : le bord n'est plus celui des tuiles`).toMatch(/(?<![-\w])border:\s*var\(--tuile-bord\);/);
      expect(r, `${f} ${sel} : le trait du bas n'est plus celui des tuiles`).toMatch(/border-bottom:\s*var\(--tuile-trait\);/);
      expect(r, `${f} ${sel} : le rayon n'est plus celui des tuiles`).toMatch(/border-radius:\s*var\(--tuile-rayon\);/);
      expect(r, `${f} ${sel} : la marge intérieure n'est plus celle des tuiles`).toMatch(/padding:[^;]*var\(--tuile-pad-x\)/);
    }
  });

  it("est dit en une phrase par réglage dans le mode d'emploi de la doctrine", () => {
    const doc = lire("ETALON.md");
    const debut = doc.indexOf("### 8.0 Mode d'emploi");
    const mode = doc.slice(debut, doc.indexOf("### 8.1 ", debut));
    expect(mode.length, "le mode d'emploi est introuvable : la clause ne garde plus rien").toBeGreaterThan(1500);
    // Chaque réglage d'espace et d'aspect a SA ligne de table, avec son fichier.
    for (const j of ["--sections-gap", "--tuiles-gap", "--titre-gap", "--retour-gap", "--tuile-rayon", "--tuile-fond", "--tuile-pad-x"]) {
      expect(mode, `le mode d'emploi n'a plus de ligne pour ${j}`).toMatch(new RegExp(`\\| [^\\n]*\`${j}\`[^\\n]*\\|`));
    }
    for (const mot of ["tuiles", "douces", "lignes"]) expect(mode, `le mode d'emploi ne dit plus comment obtenir « ${mot} »`).toContain(`TUILES = "${mot}"`);
    expect(mode, "le mode d'emploi ne dit plus où se règle le mot des tuiles").toContain("src/lib/config.ts");
    expect(doc, "la doctrine n'a plus sa section sur l'aspect des tuiles").toMatch(/### 8\.7 L'aspect des tuiles/);
  });

  it("et l'écart des tuiles de Trade lit le jeton comme les autres", () => {
    expect(sansNotes(lire("src/app/trader/page.module.css")), "les tuiles de Trade écrivent leur écart en dur").toMatch(/\.tuiles\s*\{[^}]*gap:\s*var\(--tuiles-gap\);/);
  });
});
