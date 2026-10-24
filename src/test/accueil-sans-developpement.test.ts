import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { INSTRUMENTS_PAGES } from "@/lib/nav-groups";
import path from "node:path";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
/* LE CODE, PAS CE QU'ON EN DIT. Ces épreuves cherchent des noms que les
   fichiers citent justement dans leurs commentaires, pour expliquer pourquoi
   ils sont partis : sans ce filtre, c'est l'explication qui ferait tomber
   l'épreuve. Commentaires de bloc, de ligne, et d'accolade JSX. */
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * LA PAGE D'ACCUEIL RÉPOND, ELLE NE DÉVELOPPE PAS.
 *
 * Relevé du 24 octobre 2026, au téléphone à 390 px : 2 954 px, trois écrans et
 * demi, vingt liens. Elle disait quatre choses deux fois — le lien de
 * l'analyse à 969 px de lui-même, les fiches des deux lignes tenues à 815 et
 * 870 px des leurs, « Vos opérations » à 662 px de sa tuile — et la date du
 * 14 février trois fois, sous trois noms.
 *
 * Elle portait aussi le relevé entier : les intentions en cartes, les
 * versements programmés avec leur formulaire de modification, les droits de
 * garde, les lignes suivies. Chacun a maintenant sa page, et l'accueil n'en
 * garde que la bande.
 */
describe("la page d'accueil", () => {
  /* LES TROIS COMPTEURS. Ils redisaient trois chiffres déjà posés sur la
     page, et « Positions valorisées » était le SEUL d'entre eux à compter la
     ligne sans cours publié — 1 980 276 + 4 890 548 — quand la page écrit
     quatre cents pixels plus haut « elle reste hors de ce total ».
     L'étiquette disait l'inverse de ce que le chiffre faisait. */
  it("ne repose pas de compteur qui redise, ou contredise, ses propres chiffres", () => {
    expect(code("src/app/moi/page.module.css"), "la grille des trois compteurs est revenue").not.toMatch(/\.kpis\b/);
    for (const f of ["src/app/Console.tsx"]) {
      expect(code(f), "« Positions valorisées » est revenu sur l'accueil").not.toContain("Positions valorisées");
    }
  });

  /* CE QUI SE DÉVELOPPAIT A UNE ADRESSE. Trois pages ont été créées pour
     cela, et la quatrième destination existait déjà : « Vos versements
     programmés » est une section de /moi/epargne, avec le même composant. */
  it("mène à une page au lieu de déplier la section", () => {
    const console_ = code("src/app/Console.tsx");
    for (const [quoi, ou] of [
      ["les intentions", "/moi/ordres"],
      ["les versements programmés", "/moi/epargne"],
      ["les droits de garde", "/moi/garde"],
      ["les lignes suivies", "/moi/suivies"],
    ] as const) {
      expect(console_, `${quoi} : la bande qui y mène a disparu de l'accueil`).toContain(`href: "${ou}"`);
    }
    for (const page of ["src/app/moi/ordres/page.tsx", "src/app/moi/garde/page.tsx", "src/app/moi/suivies/page.tsx"]) {
      expect(fs.existsSync(path.join(ROOT, page)), `${page} n'existe plus : une bande de l'accueil ne mène donc nulle part`).toBe(true);
      expect(code(page), `${page} s'est écrit un en-tête à lui`).toContain("<EnTete");
    }
    /* Les composants qui se dépliaient ne sont plus montés sur l'accueil. */
    for (const mort of ["AvisGardeList", "StandingList", "WatchButton", "CounterAnswer", "OrdreMenu"]) {
      expect(console_, `« ${mort} » est remonté sur la page d'accueil`).not.toContain(mort);
    }
  });

  /* LE SOMMAIRE EST CELUI DE LA MAISON. Une grille de tuiles et une liste de
     bandes pour la même chose — un nom, une phrase, une destination —
     faisaient deux grammaires sur une seule page. */
  it("pose ses destinations dans le sommaire de la maison", () => {
    expect(code("src/app/Console.tsx"), "l'accueil s'est réécrit une liste de destinations").toContain("<Rubriques");
    expect(code("src/app/moi/page.module.css"), "la grille de tuiles est revenue").not.toMatch(/\.tuiles?\s*\{/);
    expect(code("src/app/Console.module.css"), "la bande des services s'est réécrite à part").not.toMatch(/\.bandeServices\b/);
  });

  /* DEUX ADRESSES MORTES, réparées en chemin. « /moi » redirige vers la
     racine, qui perd le fragment ; « #ordres-en-cours » vivait de toute façon
     sur la racine, pas sous /moi. Sans intention désignée, « Répondre »
     déposait le client en haut de son portefeuille. */
  it("ne renvoie plus « Répondre » sur une adresse qui n'existe pas", () => {
    const src = code("src/lib/domain/services.ts");
    expect(src, "le repli de « Répondre » est redevenu une adresse morte").not.toContain("/moi#ordres-en-cours");
    expect(src, "le repli de « Répondre » ne mène plus à la liste").toContain('"/moi/ordres"');
  });

  /* UNE CONTRE-PROPOSITION NE TOMBAIT ENTRE AUCUNE LISTE. Le relevé filtrait
     « reçue, confirmée, transmise » : l'état qui attend justement une réponse
     n'était nulle part, et la carte capable de l'afficher ne pouvait jamais
     paraître. */
  it("compte la contre-proposition parmi les ordres en cours", () => {
    const src = code("src/app/moi/ordres/page.tsx");
    const liste = src.match(/const EN_COURS[^;]*;/)?.[0] ?? "";
    expect(liste, "« contre_proposee » est retombé hors des deux listes").toContain("contre_proposee");
    /* Sans les termes, « CounterAnswer » rend null : la carte n'affichait
       alors rien entre son titre et sa piste. */
    expect(src, "la carte peut de nouveau rester muette faute de termes").toContain("i.counter ?");
  });
  /* LA SECTION QUI SE DÉPLACE, ET LES DEUX FAÇONS DE CASSER UN DÉPLACEMENT.
     « Ce qui ferme bientôt » paraît en haut quand une séance ferme sous sept
     jours, plus bas sinon. Le seuil lui-même est éprouvé dans
     « echeances.test » ; ce qui ne peut l'être que d'ici est le branchement :
     oublier une des deux branches fait disparaître la bande dans l'un des
     deux cas, et oublier la négation la fait paraître deux fois sur le même
     écran. Les deux se voient à l'œil une fois en production, et jamais
     avant. */
  it("pose « Ce qui ferme bientôt » à une place et une seule", () => {
    const src = code("src/app/Console.tsx");
    const poses = [...src.matchAll(/<CeQuiFermeBientot\b/g)];
    expect(poses.length, "la bande n'est plus posée exactement deux fois : une branche a disparu, ou une troisième est née").toBe(2);
    expect(src, "la branche du haut ne dépend plus du seuil").toMatch(/\{presse\(echeances\) && <CeQuiFermeBientot/);
    expect(src, "la branche du bas ne dépend plus du seuil, ou sa négation a sauté : la bande paraîtrait deux fois").toMatch(/\{!presse\(echeances\) && <CeQuiFermeBientot/);
  });

  /* Deux lectures du même objet dans la même requête sont deux occasions de
     diverger : la page tient déjà les offres pour ses positions. */
  it("ne fait pas relire les offres à la bande des échéances", () => {
    expect(code("src/app/Console.tsx"), "la bande relit les offres que la page tient déjà").toMatch(/<CeQuiFermeBientot offres=\{offers\}/);
  });
  /* LES TROIS FAMILLES ONT RETROUVÉ LEUR COMPTE, ET IL VIENT D'UN SEUL
     ENDROIT. « /instruments » le portait et le défendait — « Adjudications »
     ne dit pas s'il y a une séance ouverte cette semaine, « Adjudications ·
     3 séances » le dit — puis la page a fermé le 24 octobre et le compte est
     mort avec elle.

     La page d'accueil écrit par ailleurs, pour les rubriques du dossier :
     « aucune ne porte de compte, un nombre posé sur la page d'avant se
     calcule toujours ailleurs que là où il sera vérifié. » Les deux règles
     tiennent, et ce qui les sépare est l'origine du nombre : ces trois-ci
     passent par « comptesParLieu », c'est-à-dire par les fonctions mêmes que
     leurs pages d'arrivée emploient pour dresser leur liste. Recompter à la
     main ici ferait exactement ce que la seconde règle redoute. */
  it("compte les trois familles avec la fonction de leurs pages d'arrivée", () => {
    const src = code("src/app/Console.tsx");
    expect(src, "l'accueil ne passe plus par « comptesParLieu » : le compte peut diverger de la page qu'il annonce").toContain("comptesParLieu(offers)");
    expect(src, "les familles ne viennent plus de la table de navigation : l'accueil peut en nommer une qui n'existe pas").toContain("INSTRUMENTS_PAGES.map");
  });

  /* ZÉRO NE S'ÉCRIT PAS : une famille vide se visite quand même, et annoncer
     son vide l'éteindrait. C'est la règle de l'ancienne page, et elle tient à
     une comparaison qu'un « ?? » suffirait à perdre. */
  it("n'annonce pas qu'une famille est vide", () => {
    expect(code("src/app/Console.tsx"), "l'étiquette ne teste plus que le compte est non nul").toMatch(/n > 0 && mots/);
  });

  /* UNE FAMILLE SANS MOTS PERD SON CHIFFRE EN SILENCE. La table du singulier
     et du pluriel est écrite à la main, à côté d'une liste de navigation qui
     peut grandir : si les deux cessent de se correspondre, la nouvelle
     famille paraît sans compte et personne ne s'en aperçoit. */
  it("donne à chaque famille de la navigation son singulier et son pluriel", () => {
    const src = lire("src/app/Console.tsx");
    const table = src.match(/const UNITE[^=]*=\s*\{([\s\S]*?)\n\};/)?.[1] ?? "";
    expect(table, "la table des unités est introuvable : l'épreuve ne garde plus rien").not.toBe("");
    const connues = new Set([...table.matchAll(/^\s*([A-Za-z_][\w]*)\s*:/gm)].map((m) => m[1]));
    const manquantes = INSTRUMENTS_PAGES.map((p) => p.key).filter((k) => !connues.has(k));
    expect(manquantes, "ces familles paraîtraient sans compte, sans que rien ne tombe").toEqual([]);
  });
  /* LA MARGE D'UNE PIÈCE POSÉE DANS UNE COLONNE À ÉCART DÉCLARÉ.
     « IndexPulse » porte « margin: 0 0 12px » pour ses deux pages du marché.
     Posé tel quel dans la colonne de l'accueil, ces douze pixels s'ajoutent à
     l'écart des sections — le défaut exact que la bande des attentes s'est
     fait retirer, et qu'elle documente : « une pièce qui pose sa propre marge
     dans une mise en page à écart ne sait pas où elle vit ».
     LES DEUX MOITIÉS VOYAGENT ENSEMBLE : la page demande la variante
     compacte, et la variante compacte n'a pas de marge. Retirer l'une ou
     l'autre suffit à rouvrir le trou, et un trou de douze pixels ne se voit
     pas en lisant un diff. */
  it("pose l'indice sans la marge qu'il garde pour ses deux autres pages", () => {
    expect(code("src/app/Console.tsx"), "l'accueil pose l'indice en variante pleine : sa marge s'ajoute à l'écart de la colonne").toMatch(/<IndexPulse compact/);
    const compact = lire("src/components/IndexPulse.module.css").match(/\.compact\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(compact, "la variante compacte est introuvable").not.toBe("");
    expect(compact, "elle a repris une marge, qui s'ajoutera à l'écart déclaré de la page qui l'accueille").toMatch(/margin:\s*0/);
  });

  /* UNE SEULE PORTE VERS LA FAMILLE DU MARCHÉ. « /marche » est cette porte,
     son propre fichier le dit, et le bandeau du téléphone donne la famille
     entière dès qu'on y est. Une rangée de pastilles sur l'accueil serait une
     seconde porte à soixante pixels de la première — la duplication que cette
     page a passé octobre à retirer. */
  it("n'ouvre qu'une porte vers la famille du marché", () => {
    expect(code("src/app/Console.tsx"), "l'accueil redresse une liste des pages du marché à côté du lien qui y mène").not.toContain("MARKET_PAGES");
  });
});
