import { RACINE } from "./racine";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * LE DÉPÔT NE CONNAÎT PAS LE NOM DE LA MACHINE.
 *
 * Mesuré le 22 octobre 2026, en préparant le passage sur un autre
 * ordinateur : « C:/dev/guichet » était écrit en dur dans 19 essais et
 * 317 scripts sur 363. Zéro dans `src/app`, `src/components` ou la
 * configuration, donc l'application, le build et la production n'en
 * dépendaient pas. Mais les gardes et les outils, eux, se seraient tus
 * ou auraient échoué sur la première ligne, et c'est exactement la
 * panne muette qu'on refuse : un contrôle qui ne trouve plus ses
 * fichiers ne dit pas « je suis cassé », il dit « rien à signaler ».
 *
 * La racine se déduit de l'emplacement du fichier, jamais d'un chemin
 * tapé : `src/test/racine.ts` la calcule une fois et tout le monde la
 * lit. Un script la tient de `import.meta.url`.
 */
const CHEMIN_EN_DUR = /[Cc]:[/\\]dev[/\\]guichet/;
const DOSSIERS = ["src", "scripts", "supabase"] as const;
const EXEMPTS = new Set(["src/test/racine.ts", "src/test/racine-portable.test.ts"]);

const fichiers = (depuis: string): string[] => {
  const out: string[] = [];
  const voir = (d: string): void => {
    for (const e of readdirSync(d)) {
      if (e === "node_modules" || e === ".next" || e.startsWith(".")) continue;
      const p = `${d}/${e}`;
      if (statSync(p).isDirectory()) voir(p);
      else if (/\.(ts|tsx|mjs|js|json|sql|css)$/.test(e)) out.push(p.slice(RACINE.length + 1));
    }
  };
  voir(`${RACINE}/${depuis}`);
  return out;
};

describe("rien dans le dépôt ne nomme la machine", () => {
  it("aucun chemin absolu vers ce poste", () => {
    const coupables: string[] = [];
    for (const dossier of DOSSIERS)
      for (const f of fichiers(dossier)) {
        if (EXEMPTS.has(f)) continue;
        const src = readFileSync(`${RACINE}/${f}`, "utf8");
        for (const [i, l] of src.split(/\r?\n/).entries()) if (CHEMIN_EN_DUR.test(l)) coupables.push(`${f}:${i + 1}`);
      }
    expect(
      coupables,
      `ces fichiers ne s'ouvriront pas sur un autre ordinateur. Lire la racine : « import { RACINE } from "./racine" » dans un essai, « new URL("../x", import.meta.url) » dans un script :\n  ${coupables.join("\n  ")}`,
    ).toEqual([]);
  });

  it("la racine calculée est bien celle du dépôt", () => {
    expect(readFileSync(`${RACINE}/package.json`, "utf8")).toContain('"name"');
    /* Posée en barres obliques, donc le même chemin s'écrit pareil des deux côtés. */
    expect(RACINE).not.toContain("\\");
  });
});
