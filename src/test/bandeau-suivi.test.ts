import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * LE BANDEAU DE SUIVI, ET CE QUI LE REND VRAI.
 *
 * Mesuré au téléphone le 5 octobre 2026 : la bulle faisait 240 × 90 px dans un
 * tracé de 313 × 235, soit 30 % du dessin, et le doigt (44 px) se posait
 * dessus. Elle a été remplacée partout par un bandeau de hauteur fixe au-dessus
 * du tracé, qui dit le dernier point AU REPOS et suit le doigt pendant la
 * lecture.
 *
 * Trois choses peuvent revenir en silence, et chacune a son cliquet :
 *
 *   1. UN GRAPHIQUE QUI SUIT SANS RIEN AFFICHER. Un nouveau graphique qui
 *      appelle useTracker et oublie le bandeau ne casse rien : il lit un point
 *      et ne le dit nulle part. C'est la panne muette de cette famille.
 *   2. LA BULLE QUI REVIENT. Elle se replacerait sur la courbe, et la mesure
 *      ci-dessus redeviendrait vraie.
 *   3. LA HAUTEUR QUI RESPIRE. Un « min-height » laisserait le bandeau grandir
 *      d'une ligne en cours de glissement : le tracé descendrait sous le doigt
 *      et le point lu changerait sans que la main bouge.
 */
const DOSSIER = join(process.cwd(), "src/components");

const sources = (): { nom: string; src: string }[] => {
  const out: { nom: string; src: string }[] = [];
  const marche = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) marche(p);
      else if (e.name.endsWith(".tsx")) out.push({ nom: e.name, src: readFileSync(p, "utf8") });
    }
  };
  marche(DOSSIER);
  return out;
};

/** Hors commentaires : un exemple cité dans une explication n'est pas un appel. */
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("le bandeau de suivi", () => {
  const fichiers = sources().map((f) => ({ ...f, src: code(f.src) }));

  it("accompagne chaque suivi : autant de bandeaux que de trackers", () => {
    const manques: string[] = [];
    for (const f of fichiers) {
      if (f.nom === "tracker.tsx") continue; // la pièce elle-même
      const suivis = [...f.src.matchAll(/useTracker\(/g)].length;
      if (suivis === 0) continue;
      const bandeaux = [...f.src.matchAll(/<TrackBand\b/g)].length;
      if (bandeaux < suivis) manques.push(`${f.nom} : ${suivis} suivi(s), ${bandeaux} bandeau(x)`);
    }
    expect(manques, "un graphique qui suit sans rien afficher lit un point et le garde pour lui").toEqual([]);
  });

  it("a remplacé la bulle, il ne s'y ajoute pas", () => {
    const restes = fichiers.filter((f) => /TrackTip|track\.pos\b/.test(f.src)).map((f) => f.nom);
    expect(restes, "la bulle se replace sur la courbe, sous le doigt").toEqual([]);
  });

  it("garde une hauteur qui ne bouge pas", () => {
    const css = readFileSync(join(DOSSIER, "charts/tracker.module.css"), "utf8");
    const bloc = css.slice(css.indexOf(".band {"), css.indexOf("\n}", css.indexOf(".band {")));
    expect(bloc, "le bandeau n'a plus de hauteur fixe").toMatch(/\bheight:\s*\d+px/);
    expect(bloc, "« min-height » laisse le bandeau grandir pendant la lecture").not.toMatch(/min-height/);
    expect(bloc, "sans « overflow: hidden », une ligne de trop déborde sur le tracé").toMatch(/overflow:\s*hidden/);
  });
});
