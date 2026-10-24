import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
/* Le code, sans ce qu'on en dit : ces deux fichiers citent justement dans
   leurs commentaires les classes et les niveaux dont ils expliquent le
   placement, et une épreuve qui compte des occurrences compterait les
   explications avec elles. */
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

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

  /* 441 PX SUR 844 QUI NE BOUGEAIENT JAMAIS.
     Relevé le 24 octobre 2026 : au-dessus du ruban, le titre, la phrase et
     « Ce qui vous attend » se repeignaient à l'identique aux trois niveaux —
     52 % de l'écran. Le solde et les échéances s'y sont ajoutés depuis, ce
     qui a aggravé la chose plutôt que de la réparer.

     Ces trois états répondent à « qu'est-ce que je peux faire, et avec
     quoi » : une fois le service choisi, ils sont du contexte déjà lu. Posés
     DANS le premier panneau du ruban, ils glissent avec lui, et au deuxième
     niveau il ne reste que le chemin et la fiche.

     L'écran large, lui, n'a pas de niveaux : il les garde en tête de page.
     D'où un seul assemblage rendu à deux endroits — « contexteDuClient » est
     en cache par requête, et les offres sont lues une fois puis passées. */
  it("ne laisse plus la tête de la racine se repeindre aux trois niveaux", () => {
    const page = code("src/app/trader/page.tsx");
    expect((page.match(/styles\.solde/g) ?? []).length, "la bande du disponible est écrite plus d'une fois : les deux copies divergeront").toBe(1);
    expect(page, "la tête n'est plus passée au parcours : elle se repeindra aux trois niveaux").toMatch(/<Parcours[^>]*racine=\{tete\}/);

    const parcours = code("src/app/trader/Parcours.tsx");
    const i = parcours.indexOf("{racine}");
    expect(i, "le parcours ne rend plus la tête qu'on lui confie").toBeGreaterThan(0);
    /* Et dans le panneau de la RACINE, pas dans un autre : les trois
       panneaux ne se distinguent que par le niveau qu'ils masquent. */
    const ouvre = parcours.lastIndexOf("<section", i);
    expect(parcours.slice(ouvre, i), "la tête est posée dans un autre panneau que celui de la racine").toContain("niveau !== 0");
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

  /* LES DEUX ÉCRANS RENDENT LE MÊME TEXTE, et ce fichier le déclare en tête :
     « les deux écrans lisent la MÊME donnée et rendent le même texte dans le
     même ordre ; ce qui change est la façon de s'y déplacer ».

     L'écran large rend la fiche ENTIÈRE de chaque service dans sa bande : sa
     phrase s'y lit sans rien ouvrir. Les tuiles du téléphone, elles, n'ont
     porté que le nom pendant une journée — l'invariant était rompu par la
     pièce qui l'annonce.

     LA PHRASE, ET PAS LE RESTE. « porte » est exclu de la liste depuis le
     début, et sa propre note dit pourquoi : « répété dans la liste, il
     effaçait neuf sous-titres pour dire neuf fois la même chose ». Une
     précondition est la même pour presque tous les services ; une phrase
     porte les chiffres du client et diffère de l'un à l'autre. */
  it("montre la phrase du service sur les deux écrans, et la précondition sur aucun des deux", () => {
    const parcours = lire("src/app/trader/Parcours.tsx");
    expect(lire("src/app/trader/Fiche.tsx"), "la fiche ne rend plus la phrase du service").toContain("sv.phrase.key");
    expect(parcours, "les tuiles du téléphone ne rendent plus la phrase : l'écran large en dit plus que lui dans la même liste").toContain("sv.phrase.key");
    expect(parcours, "la précondition est remontée dans la liste du téléphone : neuf sous-titres pour dire neuf fois la même chose").not.toContain("sv.porte");
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
