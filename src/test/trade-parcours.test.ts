import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

/**
 * LE PARCOURS DE « TRADE », RELEVÉ LE 24 OCTOBRE 2026.
 *
 * Trois défauts, et le même sous les trois : la page s'était écrit à elle
 * seule ce que la maison écrivait déjà ailleurs.
 */
describe("le parcours de Trade", () => {
  /* LES TROIS POINTS. Ils comptaient la profondeur — « deuxième de trois » —
     pendant que le chemin, à dix pixels de là, la NOMMAIT : « Trade ›
     Placer ». Deux dispositifs pour un fait, et le plus pauvre était le plus
     voyant : une rangée de points à droite d'une barre se lit partout
     ailleurs comme un nombre de pages à suivre. */
  it("ne compte plus la profondeur à côté du chemin qui la nomme", () => {
    expect(lire("src/app/trader/Parcours.module.css"), "les points de profondeur sont revenus").not.toMatch(/\.points\b/);
    const tsx = lire("src/app/trader/Parcours.tsx");
    expect(tsx, "une rangée de pastilles est revenue dans le fil").not.toMatch(/\[0,\s*1,\s*2\]/);
  });

  /* LE PREMIER ÉCRAN n'a qu'un cran de chemin, et ce cran est le titre de la
     page. L'écrire là, c'est l'écrire deux fois sur le même écran — cinq
     cents pixels plus bas, et en plus petit. */
  it("n'écrit pas le chemin quand il ne dirait que le titre de la page", () => {
    expect(lire("src/app/trader/Parcours.tsx"), "le fil reparaît au premier niveau").toMatch(/\{niveau > 0 && \(\s*<nav/);
  });

  /* LES DEUX LISTES SONT DES SOMMAIRES, et « Rubriques » est né de celle-ci
     même : son fichier le dit. Les six autres sièges sont passés en bandes le
     24 octobre ; celui-là gardait sa copie, restée en filets — la divergence
     que le composant devait empêcher, arrivée chez son propre ancêtre. */
  it("rend ses deux listes avec le sommaire de la maison", () => {
    const tsx = lire("src/app/trader/Parcours.tsx");
    expect(tsx, "le parcours a repris une liste à lui").toContain("<Rubriques");
    expect((tsx.match(/<Rubriques/g) ?? []).length, "les deux niveaux de liste ne passent pas tous les deux par le sommaire").toBe(2);
    const css = lire("src/app/trader/Parcours.module.css");
    for (const mort of [".liste", ".ligne", ".chev", ".quoi", ".enPlace"]) {
      expect(css, `« ${mort} » est réapparu dans la feuille du parcours : c'est la copie du sommaire qui revient`).not.toContain(mort);
    }
  });

  /* L'EN-TÊTE. La phrase partait en colonne 8 d'une grille de douze, soit huit
     cent vingt pixels à droite du titre qu'elle explique, sur une page dont
     tout le reste tient en une colonne. */
  it("prend son en-tête de l'étalon", () => {
    expect(lire("src/app/trader/page.tsx"), "la page a repris un en-tête à elle").toContain("<EnTete");
    expect(lire("src/app/trader/page.module.css"), "la grille de douze colonnes est revenue pour le seul en-tête").not.toMatch(/repeat\(12/);
  });

  /* LE MÊME FRANC, UNE SEULE FOIS. Trade porte en tête le disponible de la
     provision : c'est la condition de tout geste qu'on y pose. L'attente
     « disponible » nomme le même nombre à cent pixels de là, avec un autre
     verbe — « Replacer » contre « Alimenter » — et le lecteur cherche alors
     lequel des deux est le vrai.

     LES DEUX MOITIÉS VOYAGENT ENSEMBLE, et c'est tout l'objet de cette
     épreuve. Retirer la bande en laissant le « sauf » prive le client du
     chiffre ; retirer le « sauf » en laissant la bande le lui donne deux
     fois. Ni l'un ni l'autre ne se voit en lisant le diff. */
  it("ne dit le disponible qu'une fois sur la page qui sert à agir", () => {
    const tsx = lire("src/app/trader/page.tsx");
    expect(tsx, "la bande du disponible a disparu, mais l'attente reste écartée : le chiffre n'est plus nulle part").toContain("styles.solde");
    expect(tsx, "l'attente « disponible » est revenue à côté de la bande : le même franc deux fois").toMatch(/<CeQuiVousAttend[^>]*sauf=\{\["disponible"\]\}/);
  });

  /* UNE CLEF ÉCARTÉE QUI N'EXISTE PAS N'ÉCARTE RIEN, et ne le dit pas. Le
     filtre passerait, la liste serait entière, et la page afficherait de
     nouveau le doublon qu'elle croit avoir retiré. Même défaut que viserait
     un rayon renommé dans « trader/niveaux ». */
  it("écarte une attente que le domaine sait produire", () => {
    const corps = lire("src/lib/domain/services.ts");
    const debut = corps.indexOf("export function attentesDuClient");
    const clefs = new Set([...corps.slice(debut).matchAll(/cle:\s*"([^"]+)"/g)].map((m) => m[1]));
    const ecartees = [...lire("src/app/trader/page.tsx").matchAll(/sauf=\{\[([^\]]*)\]\}/g)].flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
    expect(ecartees.length, "la page n'écarte plus rien : l'épreuve au-dessus devrait déjà l'avoir dit").toBeGreaterThan(0);
    expect(ecartees.filter((c) => !clefs.has(c)), "ces clefs n'existent dans aucune attente : le filtre ne retire rien et le doublon revient").toEqual([]);
  });

  /* L'ÉCART DE L'ÉTALON, qu'une écriture en double effaçait : « .rayons »
     était défini deux fois à quatre cents lignes d'écart, 32 en haut avec sa
     justification, 20 en bas, et c'est le bas qui l'emportait. Les deux autres
     piles de plis de la maison sont à 32. */
  it("laisse l'écart de l'étalon entre ses rayons", () => {
    const css = lire("src/app/trader/page.module.css");
    const rayons = [...css.matchAll(/\.rayons\s*\{([^}]*)\}/g)];
    expect(rayons.length, "« .rayons » est de nouveau écrit deux fois : la seconde écriture gagne en silence").toBe(1);
    expect(rayons[0][1], "l'écart des rayons n'est plus celui de l'étalon").toMatch(/gap:\s*var\(--s-10\)/);
  });
});

/**
 * UNE FEUILLE NE GARDE PAS LES MESURES DE CE QUE LA PAGE A PERDU.
 *
 * Celle de Trade portait 617 lignes et 37 classes, dont 22 que plus aucun
 * fichier ne nommait : les neuf cartes de services, la carte du conseiller, le
 * rayon « Comprendre », le tableau « quand ». Une classe morte n'est pas
 * seulement du poids : elle se lit comme une description de la page, et celle
 * qu'elle décrivait n'existe plus.
 *
 * LE COMPTE EST UN CLIQUET : il descend, il ne monte pas. Les feuilles dont un
 * fichier compose le nom de classe (« styles[`st_${etat}`] ») sont hors du
 * relevé — on ne peut pas savoir, de l'extérieur, lesquelles de leurs classes
 * servent.
 */
const classesMortes = () => {
  const tsx: string[] = [];
  const marche = (d: string, dans: string[], suffixe: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) marche(p, dans, suffixe);
      else if (e.name.endsWith(suffixe)) dans.push(p);
    }
  };
  marche(path.join(ROOT, "src"), tsx, ".tsx");
  const sources = tsx.map((p) => ({ nom: path.basename(p), texte: fs.readFileSync(p, "utf8") }));

  const feuilles: string[] = [];
  marche(path.join(ROOT, "src"), feuilles, ".module.css");

  const out: string[] = [];
  for (const f of feuilles) {
    const css = fs.readFileSync(f, "utf8");
    const nom = path.basename(f);
    const definies = new Set([...css.matchAll(/(?<![\w-])\.([A-Za-z][\w-]*)/g)].map((m) => m[1]));
    definies.delete("md"); // « ETALON.md » dans un commentaire
    const nommees = new Set<string>();
    let compose = false;
    for (const s of sources) {
      if (!s.texte.includes(nom)) continue;
      for (const m of s.texte.matchAll(/styles\.([A-Za-z][\w]*)/g)) nommees.add(m[1]);
      for (const m of s.texte.matchAll(/styles\["([^"]+)"\]/g)) nommees.add(m[1]);
      if (/styles\[(?!")/.test(s.texte)) compose = true;
    }
    if (compose) continue;
    for (const c of definies) if (!nommees.has(c)) out.push(`${path.relative(ROOT, f)} › .${c}`);
  }
  return out.sort();
};

describe("les feuilles de style", () => {
  it("ne gardent pas les mesures de ce qui n'est plus à l'écran", () => {
    const PLAFOND = 95;
    const mortes = classesMortes();
    expect(mortes.length, `${mortes.length} classes qu'aucun fichier ne nomme (plafond ${PLAFOND}) :\n  ${mortes.join("\n  ")}`).toBeLessThanOrEqual(PLAFOND);
    expect(PLAFOND - mortes.length, "le plafond a pris du jeu : le rabaisser au compte du jour").toBeLessThanOrEqual(4);
  });

  it("n'en gardent aucune dans Trade, qui vient d'être vidée", () => {
    expect(classesMortes().filter((m) => m.includes("app/trader/"))).toEqual([]);
  });
});
