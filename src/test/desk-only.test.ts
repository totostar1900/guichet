import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Ce que le desk sait et que le client ne lit pas.
 *
 * Le taux de service en est l'exemple : sur trente-cinq lignes obligataires il
 * dit « jamais échangée », ce qui est vrai, utile à l'opérateur qui accepte un
 * ordre, et que la maison ne met pas sous les yeux d'un client. La règle a été
 * posée le 24 septembre 2026 ; elle tient tant qu'un import ne la défait pas
 * par inadvertance, six mois plus tard, dans une page publique qui voulait
 * « réutiliser un composant qui existait déjà ».
 *
 * La garde lit les imports plutôt que les intentions : un fichier hors de
 * `/desk` qui cite un module réservé au desk fait échouer la suite, en nommant
 * les deux.
 */
const ROOT = join(process.cwd(), "src");

/** Tous les fichiers de code sous `dir`, en descendant. */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const rel = (p: string) => p.slice(ROOT.length + 1).replace(/\\/g, "/");

/** Les modules que seul le desk a le droit de citer. */
const DESK_ONLY = [
  { module: "@/lib/market/fill", why: "le taux de service : « jamais échangée » ne se montre pas au client" },
  { module: "@/components/desk/", why: "les composants du desk ne paraissent pas sur le Guichet" },
];

/** Les fichiers qui appartiennent au desk : ses pages, ses composants, ses tests. */
const isDesk = (f: string) => f.startsWith("app/desk/") || f.startsWith("components/desk/") || f.startsWith("lib/market/fill") || f.startsWith("test/");

describe("ce qui reste au desk", () => {
  const files = walk(ROOT).map((p) => ({ path: rel(p), text: readFileSync(p, "utf8") }));

  it("trouve bien les fichiers à surveiller", () => {
    // Une garde qui ne lit rien passe toujours : on vérifie qu'elle lit.
    expect(files.length).toBeGreaterThan(100);
    expect(files.some((f) => f.path === "app/desk/marche/page.tsx")).toBe(true);
  });

  for (const { module, why } of DESK_ONLY) {
    it(`« ${module} » n'est cité que par le desk · ${why}`, () => {
      const leaks = files.filter((f) => !isDesk(f.path) && f.text.includes(module)).map((f) => f.path);
      expect(leaks, `ces fichiers ne sont pas au desk et citent ${module}`).toEqual([]);
    });
  }

  it("le taux de service reste server-only", () => {
    // Un module server-only ne peut pas partir dans le paquet du navigateur,
    // même si quelqu'un l'importait depuis un composant client par erreur.
    const fill = files.find((f) => f.path === "lib/market/fill.ts");
    expect(fill?.text.startsWith('import "server-only";')).toBe(true);
  });
});
