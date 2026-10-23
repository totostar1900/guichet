import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

/**
 * L'ÉTALON D'UNE PAGE, TENU PAR DEUX MESURES.
 *
 * Relevé du 24 octobre 2026 sur treize pages du guichet, à 390, 900 et
 * 1440 px (ETALON.md porte le tableau complet). Les deux divergences gravées
 * ici ne cassent aucun rendu en revenant : elles déplacent, et c'est
 * exactement ce que personne ne remarque.
 *
 *   UNE SEULE GOUTTIÈRE. Le gabarit pose la marge latérale ; six coquilles de
 *   page en ajoutaient une seconde par-dessus. Les pages à boîte commençaient
 *   donc à 30 px du bord et les autres à 14, aux trois largeurs (30/14,
 *   36/20, 410/394).
 *
 *   UNE SEULE TAILLE DE TITRE. Sept cohabitaient, de 16 à 30 px. Celle de
 *   « /titres » valait 16, plus petit que le corps de lecture, parce que son
 *   titre était une phrase de cinquante-quatre signes. Et les cinq pages qui
 *   titraient à 30 ne l'avaient pas décidé : c'est le « 2em » du navigateur
 *   sur une racine à 15 px.
 *
 * DEUX MONDES SONT HORS PÉRIMÈTRE, et c'est écrit plutôt que supposé. La
 * console du desk est dense par métier et titre à 1,3 rem. La vitrine
 * publique a son propre pas, « le seul au-dessus de l'échelle », déclaré tel
 * quel dans globals.css : une page qui vend respire plus large qu'une page
 * qui travaille.
 */
const COQUILLES = [
  "src/components/Feuillet.module.css",
  "src/app/ouvrir-un-compte/convention/page.module.css",
  "src/app/moi/textes/page.module.css",
  "src/app/moi/tarifs/page.module.css",
  "src/app/moi/documents/page.module.css",
  "src/app/moi/performance/page.module.css",
];

/** La classe qui porte la coquille, et elle seule : une bande a le droit d'avoir une marge intérieure. */
const blocDeLaCoquille = (css: string): string => {
  const m = css.match(/\.(page|feuille|head|tete)\s*\{([^}]*)\}/);
  return m ? m[2] : "";
};

const feuillesDuGuichet = (): string[] => {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === "desk") continue;
        walk(p);
      } else if (e.name.endsWith(".module.css")) out.push(p);
    }
  };
  walk(path.join(ROOT, "src/app"));
  walk(path.join(ROOT, "src/components"));
  /* LA VITRINE A SON PAS, déclaré dans globals.css : « le pas du site public,
     et le seul au-dessus de l'échelle ». Une page qui vend respire plus large
     qu'une page qui travaille, et ces trois-là ne sont pas des pages de
     travail. Les autres pages signées — sociétés, actualités, offres, dossier
     — ne sont PAS exclues : elles sont simplement en attente de conversion, et
     c'est ce que le cliquet compte. */
  const vitrine = ["Accueil.module.css", `a-propos${path.sep}page.module.css`, `placements${path.sep}page.module.css`];
  return out.filter((p) => !p.includes(`${path.sep}desk${path.sep}`) && !vitrine.some((v) => p.endsWith(v)));
};

/** Les titres de page qui ne suivent pas encore le jeton. */
const titresHorsJeton = (): string[] => {
  const hors: string[] = [];
  for (const p of feuillesDuGuichet()) {
    const css = fs.readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of css.matchAll(/([^{}]*\bh1)\s*\{([^}]*)\}/g)) {
      const taille = m[2].match(/font-size:\s*([^;]+);/);
      if (taille && taille[1].trim() !== "var(--t-8)") hors.push(`${path.relative(ROOT, p)} : « ${m[1].trim()} » pose ${taille[1].trim()}`);
    }
  }
  return hors.sort();
};

describe("l'étalon d'une page", () => {
  it("ne laisse aucune coquille poser une seconde marge latérale", () => {
    const fautives: string[] = [];
    for (const rel of COQUILLES) {
      const css = fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      const bloc = blocDeLaCoquille(css);
      expect(bloc, `${rel} : la coquille est introuvable`).not.toBe("");
      for (const m of bloc.matchAll(/padding(-inline|-left|-right)?:\s*([^;]+);/g)) {
        if (m[1] !== undefined || m[2].trim().split(/\s+/).length > 1) fautives.push(`${rel} : « ${m[0].trim()} »`);
      }
    }
    expect(fautives, `la marge latérale appartient au gabarit :\n  ${fautives.join("\n  ")}`).toEqual([]);
  });

  /**
   * UN CLIQUET, comme pour la typographie, et pour la même raison : la
   * conversion se fait page par page, et un plafond est la seule façon de ne
   * pas la voir reculer entre deux lots. Treize pages sont passées le
   * 24 octobre 2026 ; il en reste, et chacune fera descendre ce nombre.
   * Il descend, il ne monte pas.
   */
  it("ne laisse pas les titres hors jeton se multiplier", () => {
    const PLAFOND = 20;
    const hors = titresHorsJeton();
    expect(hors.length, `${hors.length} titres hors du jeton (plafond ${PLAFOND}) :\n  ${hors.join("\n  ")}`).toBeLessThanOrEqual(PLAFOND);
    expect(PLAFOND - hors.length, "le plafond a pris du jeu : le rabaisser au compte du jour").toBeLessThanOrEqual(2);
  });

  it("tient le jeton, et regarde bien quelque chose", () => {
    expect(feuillesDuGuichet().length).toBeGreaterThan(30);
    expect(fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8")).toMatch(/--t-8:\s*2rem/);
    /* La règle commune : une page qui ne dit rien titre au jeton. */
    expect(fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8")).toMatch(/h1\s*\{\s*font-size:\s*var\(--t-8\)/);
  });
});
