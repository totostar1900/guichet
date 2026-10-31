import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
/* LE CODE, SANS CE QU'ON EN DIT. Ces fichiers citent dans leurs commentaires
   les pièces qu'ils expliquent avoir retirées — « Rubriques », « IndexPulse »,
   « #donnees » — et un relevé qui compte des occurrences compterait les
   explications avec elles. La maison s'est déjà prise à ce piège quatre fois. */
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const MARCHE = "src/app/marche/page.tsx";
const INDICE = "src/app/indice/IndiceBody.tsx";
const ACTUS = "src/app/actualites/page.tsx";
const CARTE = "src/app/moi/ordres/Carte.tsx";
const ORDRES = "src/app/moi/ordres/page.tsx";

/**
 * LA REVUE DES QUATRE ÉCRANS DU 1er NOVEMBRE 2026.
 *
 * Le dirigeant a lu « Le marché », « L'indice », « Actualités » et « Vos
 * intentions » à l'écran, et relevé six choses. Elles ont une racine commune :
 * UNE SURFACE QUI RÉPÈTE UNE AUTRE SURFACE, EN MOINS BIEN. Six tuiles muettes
 * au-dessus de six sections qui portent un chiffre ; un panneau « Données »
 * au-dessus d'un repli « Données et méthode » ; un graphique de l'indice sur
 * une page de dépêches ; un bandeau de pastilles au-dessus d'un sommaire.
 *
 * Et une septième, d'une autre nature : une carte d'ordre qui DONNAIT UN
 * DEVOIR SANS LE MOYEN DE S'EN ACQUITTER.
 */
describe("la porte du marché", () => {
  /* LES SIX TUILES MUETTES. Relevé au navigateur à 390 px : 712 px de liste
     statique sur une page de 1 482, soit la moitié de la page avant qu'elle
     se nomme. Quatre des six redisaient une section en dessous ; les deux
     autres — l'éclairage et la comparaison — n'en avaient pas, et c'est pour
     cela qu'elles en ont une maintenant. */
  it("ne pose plus la famille en tuiles avant son propre titre", () => {
    const page = code(MARCHE);
    expect(page, "le sommaire des six entrées est revenu avant le titre").not.toContain("<Rubriques");
    expect(page, "la page récrit la table de la famille").not.toContain("MARKET_PAGES");
    /* ET LES DEUX SANS SECTION EN ONT UNE : sans elles, retirer les tuiles
       fermerait deux portes. */
    expect(page, "l'éclairage n'a plus de section : sa tuile est partie et rien ne l'a remplacée").toContain('id="eclairage"');
    expect(page, "la comparaison n'a plus de section").toContain('id="comparer"');
  });

  /* LES FLÈCHES AU MÊME ENDROIT. « .panel-h » empile ses enfants à gauche :
     sans « right », le lien se posait juste après le titre, donc à une
     abscisse différente par section. Mesuré après correction, à 1280 px : les
     quatre sections rendues finissent toutes à x = 1243. */
  it("aligne la flèche de chaque section au bord droit", () => {
    const page = code(MARCHE);
    const liens = [...page.matchAll(/<Link className="([^"]*btn sm ghost[^"]*)"/g)].map((m) => m[1]);
    expect(liens.length, "le relevé ne voit plus les liens des sections : son verdict ne prouve rien").toBeGreaterThanOrEqual(5);
    expect(
      liens.filter((c) => !c.includes("right")),
      "ces liens de section ne sont pas poussés au bord droit : leur flèche se posera après le titre, à une abscisse différente par carte",
    ).toEqual([]);
    /* ET LA CARTE DE L'INDICE PREND L'EN-TÊTE DE LA MAISON plutôt que de
       garder ses deux liens au bas de ses chiffres. */
    expect(page, "l'indice a repris ses liens du bas : ils retombent sous la courbe").toMatch(/<IndexPulse[^>]*liens=\{false\}/);
    expect(page, "l'indice n'a plus d'en-tête : son lien repart au milieu des chiffres").toMatch(/<IndexPulse[^>]*entete=\{/);
  });

  /* L'ACTUALITÉ NE PARAÎT QUE S'IL Y EN A, et ce n'est pas neuf : la section
     l'a toujours été. Ce qui ne l'était pas, c'est la TUILE, qui s'affichait
     vide ou non. Elle est partie ; la condition reste, et doit rester. */
  it("ne montre l'actualité, l'éclairage et la comparaison que s'il y a quelque chose", () => {
    const page = code(MARCHE);
    expect(page, "la section des actualités paraît même sans dépêche publiée").toMatch(/\{une && \(/);
    expect(page, "l'éclairage paraît même sans leçon au référentiel").toMatch(/\{lecon && \(/);
    expect(page, "la comparaison paraît avec moins de deux lignes : les deux listes seraient vides").toMatch(/comparables\.length >= 2/);
  });

  /* LA LISTE DE LA MAISON. Une liste native s'ouvre en roue au bas du
     téléphone, sans la phrase qui dit ce qu'est chaque ligne et sans
     recherche : le cliquet « listes-natives » l'interdit, et il m'a repris à
     la première écriture de cette tuile. Celui-ci garde ce qui compte en
     plus — que les deux listes ne proposent pas la même ligne des deux côtés. */
  it("choisit deux lignes avec la liste de la maison, et jamais la même des deux côtés", () => {
    const src = code("src/app/marche/ChoisirDeuxLignes.tsx");
    expect(src, "la liste native est revenue").not.toMatch(/<select[\s>]/);
    /* LES DEUX LISTES, ET NON « au moins une ». La tuile en pose deux ; une
       seule remplacée par une balise native laisserait la clause verte, et
       c'est exactement la moitié du défaut qu'elle refuse. */
    expect((src.match(/<Select\b/g) ?? []).length, "une des deux listes a quitté celle de la maison").toBe(2);
    expect(src, "la même ligne peut être choisie des deux côtés : deux colonnes identiques se lisent comme une panne").toMatch(/options\(b\)[\s\S]*options\(a\)/);
    /* ET AUCUNE PAIRE N'EST PROPOSÉE : décision du dirigeant, et c'est la
       règle de la maison — une paire choisie par nous est une mise en avant,
       et la maison n'a pas l'agrément pour en faire. */
    expect(src, "la tuile propose une paire : c'est une recommandation déguisée").not.toMatch(/useState\("[^"]+"\)/);
  });
});

describe("la page de l'indice", () => {
  /* LE PANNEAU « DONNÉES » redisait la capitalisation et les douze mois
     échangés, que le niveau porte en tête, et sa ligne « Méthode » répétait
     le premier paragraphe de « Données et méthode ». */
  it("n'a plus de panneau « Données », ni dans le corps ni au sommaire", () => {
    const src = code(INDICE);
    expect(src, "le panneau « Données » est revenu sous les notes").not.toContain('id="donnees"');
    expect(src, "le sommaire annonce une section qui n'existe plus : le lien ne mène nulle part").not.toMatch(/id: "donnees"/);
  });

  /* ET CE QU'IL AVAIT EN PROPRE N'EST PAS PERDU. Trois choses ne se lisaient
     que là : qui a lu le dernier bulletin et quand, le TROU de la série, et
     la seule sortie de données de tout Guichet. Les supprimer avec le panneau
     aurait été la perte que « supprimer » ne voulait pas dire. */
  it("garde la provenance, le trou de la série et le CSV dans « Données et méthode »", () => {
    const src = code(INDICE);
    const bloc = src.slice(src.indexOf('id="lecture"'));
    expect(bloc, "la provenance du dernier bulletin a disparu : une page qui montre une courbe sans dire qui l'a lue").toContain("ingestedBy");
    /* LES DEUX BRANCHES, ET NON LE SEUL MOT « missing.length ». Vérifié à
       l'envers : remplacer la CONDITION par « false » laissait le compte
       écrit dans la branche vraie, et la clause passait au vert sur une page
       qui ne dit plus jamais ce qui manque. Ce sont les deux phrases que le
       lecteur voit qui se gardent, pas le nom d'une variable. */
    expect(bloc, "le trou de la série ne se dit plus quand il y en a un").toContain("jours ouvrés n'ont pas de bulletin lu");
    expect(bloc, "la série complète ne se dit plus : le silence s'y lirait comme une donnée manquante").toContain("Aucun jour ouvré ne manque à la série.");
    /* ET C'EST LE COMPTE QUI DÉCIDE, pas une constante. Les deux phrases
       peuvent rester écrites pendant qu'une condition figée en choisit
       toujours une : la page dirait alors « aucun jour ne manque » un jour
       où six manquent, ce qui est pire que de se taire. */
    expect(bloc, "ce n'est plus le compte des jours manquants qui décide de la phrase").toMatch(/missing\.length[\s\S]{0,40}\?/);
    expect(bloc, "la série en CSV a disparu : c'était la seule sortie de données de l'application").toContain("/indice/serie.csv");
  });

  /* ET AUCUN LIEN NE VISE L'ANCRE PARTIE. Un lien vers une ancre disparue ne
     tombe pas : il ouvre la page en haut, et le lecteur cherche ce qu'on lui
     a promis. C'est la panne la plus silencieuse d'un déplacement de section. */
  it("ne laisse aucun lien viser « #donnees »", () => {
    const fautifs: string[] = [];
    const marche = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        /* Les épreuves sont hors du relevé : celle-ci écrit l'ancre pour la
           chercher, et se trouvait elle-même. Un relevé qui s'attrape lui-même
           est rouge pour toujours, donc il finit par être désarmé. */
        if (e.isDirectory()) { if (e.name !== "test") marche(p); }
        else if (/\.tsx?$/.test(e.name) && lire(path.relative(ROOT, p)).includes("/indice#donnees")) fautifs.push(path.relative(ROOT, p));
      }
    };
    marche(path.join(ROOT, "src"));
    expect(fautifs, `ces fichiers mènent à une ancre qui n'existe plus :\n  ${fautifs.join("\n  ")}`).toEqual([]);
    /* Non vacuité : le lien existe bien, à sa nouvelle ancre. */
    expect(code(MARCHE), "la porte ne renvoie plus à la provenance des chiffres").toContain("/indice#lecture");
  });
});

describe("la page des actualités", () => {
  /* LE GRAPHIQUE DE L'INDICE tenait entre l'en-tête et les filtres, sur une
     page qui parle de dépêches : son sparkline de soixante séances était la
     première chose qu'on voyait en venant lire ce que le desk a relu. */
  it("ne montre plus la courbe de l'indice", () => {
    const page = code(ACTUS);
    expect(page, "la courbe de l'indice est revenue sur la page des dépêches").not.toContain("<IndexPulse");
    expect(page, "l'import est resté : la pièce reviendra au premier copier-coller").not.toContain("IndexPulse");
  });
});

describe("la famille du marché, sous un bouton", () => {
  /* LE BANDEAU DE PASTILLES occupait la première bande de l'écran et n'en
     montrait que deux à la fois sur sept, dont la plus inutile — celle qui
     marque la page où l'on se tient. */
  it("n'a plus de bandeau de pastilles, et son bouton porte la phrase de chaque page", () => {
    expect(fs.existsSync(path.join(ROOT, "src/components/mobile/MarketChips.tsx")), "le bandeau est revenu").toBe(false);
    const fab = code("src/components/mobile/MarketFab.tsx");
    expect(fab, "le bouton n'ouvre plus la feuille de la maison").toContain("<Sheet");
    /* LA PHRASE, ET NON LE SEUL NOM ABRÉGÉ : c'est tout ce que la feuille
       gagne sur le bandeau, qui n'avait la place que de « L'éclairage ». */
    expect(fab, "la feuille ne dit plus ce qu'on trouve derrière chaque nom").toContain("t(p.hint)");
    expect(code("src/components/mobile/MobileShell.tsx"), "le bouton n'est monté nulle part").toContain("<MarketFab />");
  });
});

describe("une intention en cours", () => {
  /* LE DEVOIR SANS LE MOYEN. La carte disait « signez le bulletin » et ne
     menait nulle part, alors que l'écran où l'on signe existe et que les
     ordres CLOS y menaient. Le seul ordre qui avait quelque chose à faire
     était le seul sans porte. */
  it("donne un bouton là où un geste est attendu, et rien là où il n'y en a pas", () => {
    const page = code(ORDRES);
    expect(page, "le geste n'est plus calculé : la carte redonne un devoir sans moyen").toContain("ordreSignable(i)");
    expect(page, "« signer » ne mène plus à l'écran de signature").toMatch(/mot: t\("Signer et payer"\), href: `\/moi\/ordres\/\$\{i\.id\}`/);
    const carte = code(CARTE);
    expect(carte, "le geste n'est plus rendu en bouton").toMatch(/geste && \(/);
    /* ET LA FLÈCHE DÉCORATIVE NE REVIENT PAS. Elle précédait la phrase de
       suite, dorée et grasse, et n'était pas un lien : une flèche est une
       promesse de destination. */
    expect(lire("src/app/moi/ordres/Carte.module.css"), "la flèche décorative est revenue devant une phrase qui ne mène nulle part").not.toMatch(/content:\s*"→"/);
  });

  /* LE MENU S'OUVRAIT DANS LA RANGÉE DU TITRE, comme troisième enfant d'un
     « flex » : le titre se repliait sur trois lignes, et le bouton « ··· »
     disparaissait derrière son propre panneau. */
  it("ouvre son menu sous la rangée du titre, et le referme de trois façons", () => {
    const carte = code(CARTE);
    /* LE MENU VIENT APRÈS LA RANGÉE, ET C'EST UN ORDRE DANS LE SOURCE.
       Première écriture : on découpait de « styles.tete » au premier
       « </div> ». Mais ce premier-là ferme « .quoi », pas la rangée — la
       tranche s'arrêtait avant le bouton, et un menu réinjecté DANS la
       rangée passait au vert. Vérifié à l'envers, et corrigé : le « ··· »
       est le dernier enfant de la rangée, donc le « </div> » qui le suit la
       ferme, et le menu doit venir après lui. */
    const apresLaRangee = carte.indexOf("</div>", carte.indexOf("styles.points"));
    expect(apresLaRangee, "la rangée du titre ne se referme plus : le relevé ne sait plus où elle finit").toBeGreaterThan(0);
    expect(carte.indexOf("{menu && ("), "le menu est revenu dans la rangée du titre : il la repliera sur trois lignes").toBeGreaterThan(apresLaRangee);
    expect(carte, "le bouton « ··· » ne dit plus s'il est ouvert").toMatch(/aria-expanded=\{menu\}/);
    expect(carte, "le bouton ne bascule plus : il disparaissait derrière son panneau").toMatch(/setMenu\(\(x\) => !x\)/);
    expect(carte, "Échap ne referme plus le menu").toMatch(/e\.key === "Escape"/);
    expect(carte, "le clic dehors ne referme plus le menu").toMatch(/mousedown/);
    /* ET IL NE PORTE QUE DES ACTIONS : la raison d'un retrait impossible est
       une information, et elle se lisait comme une commande en panne. */
    const menu = carte.slice(carte.indexOf('role="menu"'), carte.indexOf("{confirme &&"));
    expect(menu, "la raison du retrait impossible est remontée dans le menu").not.toContain("raisonNonRetrait");
    expect(carte, "la raison du retrait impossible ne se lit plus nulle part").toContain("{raisonNonRetrait && ");
  });

  /* « NOUS ÉCRIRE » MENAIT À UNE ANCRE QUI N'EXISTE PAS — « /info/aide#entretien »,
     quand le chapitre est à « /info/aide/entretien » — donc en haut de l'index
     de l'aide. Et même à la bonne adresse, « Comment Guichet est entretenu »
     n'est pas un moyen d'écrire. */
  it("mène à qui répond quand on veut nous écrire", () => {
    const carte = code(CARTE);
    expect(carte, "« nous écrire » est reparti vers une page de documentation").not.toContain("/info/aide");
    expect(carte, "« nous écrire » ne mène plus au conseiller").toContain('href="/moi/contact"');
  });

  /* LA PISTE montrait cinq segments anonymes, et sa légende était écrite une
     fois en tête de section, à quatre cents pixels de la carte la plus basse. */
  it("nomme les cinq arrêts sous leurs segments", () => {
    expect(code(ORDRES), "les arrêts n'ont plus de nom : la piste redevient cinq barres muettes").toContain("ARRET_NOM");
    const carte = code(CARTE);
    expect(carte, "la piste ne rend plus le nom de ses arrêts").toMatch(/arrets\.map\(\(nom, n\)/);
    expect(carte, "l'arrêt où l'on est ne se distingue plus des autres").toContain("styles.ici");
  });

  /* ET CE QUE LA DONNÉE PORTAIT SANS QUE RIEN NE LE MONTRE : la date, la
     limite, le prix exécuté, la part servie. La carte disait l'intention, pas
     l'opération. */
  it("montre au dépli ce que la donnée portait et que rien n'affichait", () => {
    const page = code(ORDRES);
    for (const champ of ["limitPrice", "executedPrice", "allocationPct", "servedUnits", "createdAt"]) {
      expect(page, `« ${champ} » ne se lit nulle part : la carte dit l'intention et jamais l'opération`).toContain(champ);
    }
    expect(code(CARTE), "le dépli a disparu : les douze lignes sont remontées sur la carte").toMatch(/aria-expanded=\{ouvert\}/);
  });
});
