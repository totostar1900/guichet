import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * LE GARDE-FOU DE L'ÉCHELLE TYPOGRAPHIQUE.
 *
 * Mesuré le 6 octobre 2026 : 1 740 déclarations de taille dans `src`, pour
 * SOIXANTE-DEUX valeurs distinctes, dont vingt-huit tiennent entre 9 et 14 px.
 * Personne ne distingue 0,78rem de 0,80rem — 11,7 px contre 12 — et pourtant
 * chacune est posée plus de soixante fois. Ce ne sont pas des choix : ce sont
 * des approximations recopiées d'un fichier à l'autre, et c'est pour cela que
 * la même colonne n'a pas la même taille d'une page du desk à l'autre.
 *
 * C'est mot pour mot ce que l'échelle d'espacement a résolu : les valeurs
 * n'avaient pas de nom, donc personne ne voyait qu'il en inventait une. Même
 * remède, et même garde-fou que `spacing.test.ts`, dont ce fichier est le
 * jumeau : le compte du jour est gravé, il peut descendre, il ne peut pas
 * monter.
 *
 * CE CLIQUET NE DEMANDE PAS DE RÉÉCRIRE LE PASSÉ, et c'est ce qui le rend
 * tenable. Il demande que la prochaine taille écrite porte un nom.
 */
const ROOT = path.resolve(__dirname, "../..");

/* Seules les tailles en « rem » sont comptées, et c est voulu : « 0.72em »
   ne choisit pas une taille, elle suit celle du parent. Un exposant ou une
   petite capitale se mesurent sur leur voisin, jamais sur la racine. */

/** L'échelle, telle que globals.css la déclare, en rem. */
/* HUIT DEPUIS LE 24 OCTOBRE 2026 : « --t-8 », le titre d'une page. Le degré
   manquait, et son absence se payait en sept tailles de h1 sur treize pages —
   dont une a 16 px, plus petite que le corps de lecture. Voir ETALON.md. */
const ECHELLE = [0.68, 0.74, 0.8, 0.88, 1, 1.15, 1.35, 2];

const feuilles = (): string[] => {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".css")) out.push(p);
    }
  };
  walk(path.join(ROOT, "src"));
  return out;
};

/**
 * L'ANGLE MORT DU CLIQUET : UNE TAILLE POSÉE DANS LE JSX.
 *
 * Il ne lisait que les feuilles de style. Une taille écrite en ligne —
 * `style={{ fontSize: ".82rem" }}` — lui était donc invisible, et c'était la
 * seule façon d'en inventer une hors échelle sans que rien ne le dise.
 *
 * Trouvé le 24 octobre 2026 en réparant une classe morte : la ligne de source
 * des notes du desk portait « styles.hint », qui n'existe dans aucune feuille,
 * et son allure tenait dans un style en ligne. En comptant les autres :
 * QUATRE-VINGT-DOUZE tailles en ligne, onze valeurs distinctes, dont
 * quarante-deux hors des sept degrés — 0,76, 0,78, 0,82, 0,84, 0,85, 0,86,
 * 1,05. Personne ne distingue 0,82 rem de 0,80 ; ce ne sont pas des choix,
 * ce sont des approximations recopiées, exactement ce que le cliquet des
 * feuilles a déjà fait reculer de cent écarts.
 *
 * LES SVG SONT HORS DU COMPTE, et c'est voulu : le texte d'un dessin se mesure
 * dans le repère du dessin, souvent calculé (`metrics.font`), jamais sur la
 * racine du document. On ne compte que les valeurs littérales en rem.
 */
const enLigne = (): string[] => {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".tsx")) {
        const court = path.relative(ROOT, p).replace(/\\/g, "/");
        fs.readFileSync(p, "utf8")
          .split(/\r?\n/)
          .forEach((ligne, i) => {
            for (const m of ligne.matchAll(/fontSize:\s*"(\.?[0-9.]+)rem"/g)) {
              const v = Number(m[1].startsWith(".") ? `0${m[1]}` : m[1]);
              if (ECHELLE.includes(v)) continue;
              out.push(`${court}:${i + 1} · ${v}rem`);
            }
          });
      }
    }
  };
  walk(path.join(ROOT, "src"));
  return out;
};

const horsEchelle = (): string[] => {
  const out: string[] = [];
  for (const f of feuilles()) {
    const court = path.relative(ROOT, f).replace(/\\/g, "/");
    /* globals.css déclare l'échelle : ses propres valeurs ne sont pas des
       écarts, elles SONT la référence. */
    if (court.endsWith("src/app/globals.css")) continue;
    fs.readFileSync(f, "utf8")
      .split(/\r?\n/)
      .forEach((ligne, i) => {
        const m = /font-size:\s*([0-9.]+)rem/.exec(ligne);
        if (!m) return;
        const v = Number(m[1]);
        if (ECHELLE.includes(v)) return;
        out.push(`${court}:${i + 1} · ${v}rem`);
      });
  }
  return out;
};

/**
 * LE COMPTE DU JOUR, gravé le 6 octobre 2026 et mesuré, non estimé.
 *
 * Parti de 1 244, il est descendu à 1 215 le jour même : les trois feuilles du
 * dépôt des bulletins sont passées à l'échelle, trente-quatre déclarations.
 * Le 7 octobre, 1 183 : la page Analyse et la courbe fusionnée, trente-deux
 * déclarations, rangées en répondant à « on ne les veut pas trop grosses ».
 *
 * Le 24 octobre, 1 032 : cinquante-neuf déclarations sont parties AVEC leurs
 * règles, en élaguant 120 classes que plus aucun fichier ne nommait. Une taille
 * hors échelle dans une règle morte n'était pas une dette de typographie.
 *
 * Le 26 octobre, 1 030 : les deux feuilles de brief — celle des fonds et celle
 * des adjudications, qui lisait la même — sont devenues une, et ses tailles
 * inventées sont tombées sur l'échelle : 0,86 sur --t-4, 0,82 sur --t-3. Deux
 * seulement au compte, parce que 0,74 ÉTAIT déjà --t-2 — écrit en clair, donc
 * invisible au relevé comme à la lecture. C'est le gain d'une réunion : la
 * question « laquelle des huit ? » ne se pose qu'une fois pour huit pages.
 *
 * Il descend quand une page passe à l'échelle. S'il remonte, c'est qu'une
 * taille neuve a été inventée, et c'est précisément le moment où la question
 * « laquelle des sept ? » doit se poser.
 */
const PLAFOND = 1030;

describe("l'échelle typographique", () => {
  it("ne laisse pas les tailles hors échelle se multiplier", () => {
    const écarts = horsEchelle();
    expect(
      écarts.length,
      `${écarts.length} tailles hors échelle (plafond ${PLAFOND}). Les dernières :\n  ${écarts.slice(-12).join("\n  ")}`,
    ).toBeLessThanOrEqual(PLAFOND);
  });

  it("et le plafond descend quand une page passe à l'échelle", () => {
    /* Non vacuité à l'envers : un plafond laissé très au-dessus du réel ne
       freine plus rien. On exige qu'il colle d'assez près au compte du jour
       pour qu'une seule page convertie oblige à le baisser. */
    const écarts = horsEchelle();
    expect(PLAFOND - écarts.length, "le plafond a pris du jeu : le rabaisser au compte du jour").toBeLessThanOrEqual(30);
  });

  it("les huit degrés sont bien ceux que globals.css déclare", () => {
    /* Sans cela, l'échelle du test et celle du CSS dériveraient, et le
       garde-fou mesurerait par rapport à une référence qui n'existe plus. */
    const css = fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");
    const declarés = [...css.matchAll(/--t-\d:\s*([0-9.]+)rem/g)].map((m) => Number(m[1]));
    expect(declarés).toEqual(ECHELLE);
  });

  it("regarde bien quelque chose", () => {
    // Un chemin faux rendrait zéro écart, et le plafond serait vert pour rien.
    expect(feuilles().length).toBeGreaterThan(40);
  });

  /**
   * LE SECOND PLAFOND, gravé le 24 octobre 2026 et mesuré : quarante-deux
   * tailles en ligne hors échelle, sur quatre-vingt-douze. Même règle que le
   * premier — il descend quand une page passe à l'échelle, il ne monte pas —
   * et même raison de vivre : une taille qu'on invente doit avoir à répondre
   * « laquelle des sept ? ».
   */
  it("ne laisse pas les tailles posées dans le JSX échapper à l'échelle", () => {
    const PLAFOND_EN_LIGNE = 42;
    const écarts = enLigne();
    expect(
      écarts.length,
      `${écarts.length} tailles en ligne hors échelle (plafond ${PLAFOND_EN_LIGNE}). Les dernières :\n  ${écarts.slice(-10).join("\n  ")}`,
    ).toBeLessThanOrEqual(PLAFOND_EN_LIGNE);
    /* Le même garde-fou à l'envers que pour les feuilles : un plafond qui
       prend du jeu ne freine plus rien. */
    expect(PLAFOND_EN_LIGNE - écarts.length, "le plafond a pris du jeu : le rabaisser au compte du jour").toBeLessThanOrEqual(8);
  });
});
