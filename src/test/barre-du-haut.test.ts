import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { COMPANY } from "@/lib/config";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
/* Le code, pas ce qu'on en dit : ces fichiers citent justement la marque dans
   leurs commentaires, pour expliquer pourquoi elle n'y est plus. */
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const BARRE = "src/components/mobile/MobileShell.tsx";
const FEUILLE = "src/components/mobile/MobileShell.module.css";

/**
 * LA BARRE DU HAUT DU TÉLÉPHONE, APRÈS LE 24 OCTOBRE 2026.
 *
 * Elle portait « PURPOSE CAPITAL · Guichet » sur le tiers gauche de tous les
 * sièges du dock, c'est-à-dire sur l'écran le plus étroit de la maison, pour
 * dire au client ce qu'il sait déjà : chez qui il est. Elle porte maintenant
 * le nom de la PAGE, et le cédait au `h1` tant qu'il était à l'écran ; depuis
 * le 31 octobre 2026 elle dit le LIEU (siège et rubrique), à toute hauteur.
 */
describe("la barre du haut", () => {
  it("ne nomme plus la maison là où la place manque", () => {
    const src = code(BARRE);
    expect(src, "la marque est revenue en littéral dans la barre du téléphone").not.toMatch(/PURPOSE\s+CAPITAL/i);
    expect(src, `« ${COMPANY.name} » est revenu dans la barre du téléphone`).not.toContain(COMPANY.name);
    expect(code(FEUILLE), "les mesures de la marque sont restées dans la feuille").not.toContain(".brand");
  });

  /* ET ELLE SE NOMME TOUJOURS, SINON C'EST UNE AUTRE FAUTE. Retirer un nom
     d'un endroit trop étroit est une chose ; le retirer de partout en est une
     autre.
     CETTE ÉPREUVE DISAIT « au pied de chaque page », ET C'ÉTAIT INEXACT :
     le pied réglementaire ne paraît qu'à qui n'est PAS entré. Pour un
     visiteur, c'est lui qui porte la raison sociale, l'agrément et
     l'adresse ; pour un client, c'est l'enseigne de l'écran large, qui nomme
     la maison sans plus y mener — la navigation a son siège « Accueil ».
     Les deux publics sont donc vérifiés séparément. */
  it("laisse la maison se nommer au visiteur, dans le pied réglementaire", () => {
    const layout = lire("src/app/layout.tsx");
    expect(layout, "le pied de page ne nomme plus la société").toContain("COMPANY.legalName");
    expect(layout, "l'agrément a quitté le pied de page").toContain("COMPANY.licence");
  });

  it("laisse la maison se nommer au client, dans l'enseigne de l'écran large", () => {
    const layout = code("src/app/layout.tsx");
    expect((layout.match(/COMPANY\.name\.toUpperCase\(\)/g) ?? []).length, "l'enseigne ne nomme plus la maison sur l'écran large : un client ne la lirait plus nulle part").toBeGreaterThanOrEqual(2);
  });

  /* ET ELLE N'Y MÈNE PLUS, POUR UN CLIENT. L'onglet « Accueil » de la barre
     large et le groupe « Accueil » de la colonne portent déjà la racine :
     une enseigne qui y mène aussi donne deux cibles pour une destination,
     à quelques dizaines de pixels l'une de l'autre. C'est le défaut que la
     barre du téléphone s'est fait retirer, où l'enseigne menait à « / »
     depuis « / ». */
  it("ne fait plus de l'enseigne une seconde porte vers la racine", () => {
    const layout = code("src/app/layout.tsx");
    for (const classe of ["styles.brand", "styles.marque"]) {
      const i = layout.indexOf(`<span className={${classe}}>`);
      expect(i, `l'enseigne « ${classe} » n'a plus de variante muette pour le client`).toBeGreaterThan(0);
      /* La variante muette est bien choisie quand une session existe. */
      expect(layout.slice(Math.max(0, i - 220), i), `l'enseigne « ${classe} » ne dépend plus de la session`).toMatch(/session \?/);
    }
  });

  /* LE DÉCALAGE D'UNE COLONNE, qu'on ne voit que sur un siège du dock.
     La barre est une grille de trois colonnes — retour, lieu, icônes — et
     la flèche ne paraît pas sur une racine, qui n'a pas de parent. Sans
     place écrite, le placement automatique rangerait alors le lieu en
     première colonne et les icônes en deuxième. */
  it("écrit la place de chaque pièce, pour le jour où la flèche manque", () => {
    const css = lire(FEUILLE);
    const bloc = (nom: string) => css.match(new RegExp(`\\.${nom}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
    expect(bloc("lieu"), "le lieu n'a plus de colonne : sans flèche il glisse à gauche").toMatch(/grid-column:\s*2/);
    expect(bloc("right"), "les icônes n'ont plus de colonne : sans flèche elles glissent d'un cran").toMatch(/grid-column:\s*3/);
  });

  /* DEPUIS LE 10 NOVEMBRE 2026 (option A) : la flèche paraît dans toute page, jamais sur une racine ; elle reste montée et se replie en glissant. */
  it("ne pose la flèche de retour que là où l'on peut remonter : dans une page, jamais sur une racine", () => {
    const m = lire("src/components/mobile/MobileShell.tsx");
    expect(m, "la liste des pages sans flèche a changé").toMatch(/const SANS_FLECHE = \["\/connexion"\];/);
    expect(m, "la flèche ne dépend plus des racines").toMatch(/const isRoot = racine \|\| SANS_FLECHE\.includes\(path\);/);
    expect(m, "la flèche n'est plus repliée en glissant sur une racine").toMatch(/\$\{isRoot \? styles\.backCache : ""\}/);
  });
});

/**
 * LES RACINES ET LES PAGES (10 novembre 2026, option A).
 * Sur téléphone, la barre du bas ne paraît qu'aux sept racines ; dans une page elle glisse hors de l'écran, la barre du haut porte le retour, le menu et les boutons de la page, et tout ce qui se posait au-dessus de la barre descend avec elle.
 */
describe("les racines et les pages", () => {
  it("n'a que sept racines, et les connaît avant la première image", () => {
    const n = lire("src/lib/nav-profondeur.ts");
    expect(n).toMatch(/RACINES = \["\/", "\/trader", "\/titres", "\/fonds", "\/calendrier", "\/marche", "\/aide"\] as const/);
    expect(sansNotes(lire("src/app/layout.tsx")), "le script de profondeur n'est plus dans le <head>").toMatch(/__html: PROFONDEUR_BOOT/);
  });
  it("le dock glisse hors de l'écran dans une page et revient sur une racine, à la même courbe que la variable de hauteur", () => {
    const css = sansNotes(lire("src/components/mobile/MobileShell.module.css"));
    expect(css).toMatch(/:global\(html\[data-profondeur="page"\]\) \.tabs \{\s*transform: translateY\(100%\);\s*opacity: 0;/);
    expect(css, "le dock n'a plus de transition").toMatch(/transition: transform 0\.34s cubic-bezier\(0\.32, 0\.72, 0, 1\), opacity 0\.22s linear;/);
    const g = sansNotes(lire("src/app/globals.css"));
    expect(g, "la hauteur du dock n'est plus une propriété enregistrée, donc plus animable").toMatch(/@property --dock-h \{\s*syntax: "<length>";/);
    expect(g).toMatch(/html\[data-profondeur="page"\] \{\s*--dock-h: 0px;/);
    expect(g).toMatch(/html \{\s*transition: --dock-h 0\.34s cubic-bezier\(0\.32, 0\.72, 0, 1\);/);
    expect(g, "la transition de vue masque le dock vivant (un gel) : plus de glissement visible").not.toMatch(/active-view-transition/);
    expect(sansNotes(lire("src/components/mobile/MobileShell.tsx")), "la profondeur n'est plus posée sur <html> avant l'image").toMatch(/document\.documentElement\.dataset\.profondeur = racine \? "racine" : "page";/);
  });
  it("ce qui se posait à 56 px au-dessus du dock suit sa hauteur", () => {
    for (const f of ["src/components/BackToTop.module.css", "src/components/FilterFab.module.css", "src/components/mobile/BarreDEtape.module.css", "src/components/mobile/FichePanes.module.css", "src/components/mobile/MarketFab.module.css", "src/app/layout.module.css"]) {
      expect(sansNotes(lire(f)), `${f} fige encore la hauteur du dock à 56 px`).not.toMatch(/calc\(56px/);
      expect(sansNotes(lire(f)), `${f} ne lit plus la hauteur animée du dock`).toMatch(/var\(--dock-h, 56px\)/);
    }
  });
  it("la barre du haut a deux groupes qui glissent, dont celui de la page : son favori et ce que la page y pose", () => {
    const b = sansNotes(lire("src/components/mobile/BarreDuHaut.tsx"));
    expect(b).toMatch(/<div className=\{styles\.groupe\} data-racine=\{racine \? "oui" : "non"\} inert=\{!racine\}>/);
    expect(b).toMatch(/<div className=\{styles\.groupe\} data-contexte data-racine=\{racine \? "oui" : "non"\} inert=\{racine\}>/);
    expect(b, "l'emplacement des boutons de la page a disparu").toMatch(/data-barre-contextuelle/);
    const c = sansNotes(lire("src/components/mobile/BarreDuHaut.module.css"));
    expect(c, "les groupes n'ont plus leur glissement").toMatch(/\.groupe \{[^}]*transition: max-width 0\.34s cubic-bezier\(0\.32, 0\.72, 0, 1\), opacity 0\.22s linear, transform 0\.34s/);
    expect(sansNotes(lire("src/app/offres/[id]/FicheHead.tsx")), "le suivi de la fiche n'est plus posé dans la barre").toMatch(/<DansLaBarre>\s*<WatchButton/);
    expect(sansNotes(lire("src/app/offres/[id]/neighbour.tsx")), "la fiche voisine pose aussi son suivi dans la barre").toMatch(/<FicheHead [^>]*voisine \/>/);
  });
});

/** Le source sans ses notes : un commentaire qui explique ne compte pas comme du code. */
const sansNotes = (s: string) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/**
 * LE COIN DROIT DU TÉLÉPHONE : L'HORLOGE, L'ÉTOILE, LE MENU (31 octobre 2026).
 *
 * Décidé sur maquette. Ces clauses tiennent ce qui ne se voit pas d'un coup
 * d'œil : qui porte quelle barre, que les deux pages ont leur croix, qu'un
 * favori ne peut pas mener hors de la maison, et que la table n'est lisible
 * que par son propriétaire.
 */
describe("la barre du client", () => {
  it("un client a l'horloge, l'étoile et le menu ; le desk garde la barre du compte", () => {
    const shell = sansNotes(lire("src/components/mobile/MobileShell.tsx"));
    expect(shell, "le client n'a plus la nouvelle barre").toMatch(/\{signedIn && !desk && <BarreDuHaut /);
    expect(shell, "le desk n'a plus sa barre du compte").toMatch(/\{signedIn && desk && <BarreDuCompte /);
  });

  it("trois cibles : l'horloge et l'étoile sont des liens, le menu ouvre un tiroir", () => {
    const b = sansNotes(lire("src/components/mobile/BarreDuHaut.tsx"));
    expect(b, "l'horloge ne mène plus à la page des échéances").toMatch(/<Link href="\/echeances" className=\{`\$\{styles\.ic\} \$\{styles\.ambre\}`\}/);
    expect(b, "l'étoile ne mène plus aux favoris").toMatch(/<Link href="\/favoris" className=\{`\$\{styles\.ic\} \$\{styles\.or\}`\}/);
    expect(b, "les trois barres n'ouvrent plus le tiroir").toMatch(/onClick=\{\(\) => setOuvert\(true\)\}[\s\S]{0,120}aria-haspopup="dialog"/);
  });

  it("la pastille du menu compte ce qui attend, l'horloge ce que sa page liste, et n'existe pas sans", () => {
    const b = sansNotes(lire("src/components/mobile/BarreDuHaut.tsx"));
    expect(b, "le menu ne compte plus les attentes ET le brouillon").toMatch(/const combien = attentes\.length \+ \(brouillon \? 1 : 0\)/);
    expect(b, "la pastille du menu n'est plus rouge par défaut").toMatch(/\{combien > 0 && <em className=\{styles\.pas\}>/);
    expect(b, "l'horloge a perdu son nombre ambre").toMatch(/<em className=\{`\$\{styles\.pas\} \$\{styles\.pasAmbre\}`\}>\{echeances > 9 \? "9\+" : echeances\}<\/em>/);
    expect(b, "l'horloge reparaît alors que sa page est vide").toMatch(/\{echeances > 0 && \(\s*<Link href="\/echeances" className=\{`\$\{styles\.ic\} \$\{styles\.ambre\}`\}/);
  });

  it("le tiroir se ferme au voile, à la croix et à Échap, et verrouille la page", () => {
    const b = sansNotes(lire("src/components/mobile/BarreDuHaut.tsx"));
    expect(b, "le voile ne ferme plus le tiroir").toMatch(/className=\{`\$\{styles\.voile\}[^`]*`\} onClick=\{fermer\}/);
    expect(b, "la croix ne ferme plus le tiroir").toMatch(/className=\{styles\.fermer\} onClick=\{fermer\}/);
    expect(b, "Échap ne ferme plus le tiroir").toMatch(/e\.key === "Escape"[^)]*\)[^;]*setOuvert\(false\)/);
    expect(b, "la page défile de nouveau derrière le tiroir").toMatch(/verrouiller\(\);[\s\S]{0,700}deverrouiller\(\)/);
  });

  it("le nombre de l'horloge se lit dans la mise en page, une fois par requête", () => {
    const l = sansNotes(lire("src/app/layout.tsx"));
    expect(l, "la mise en page ne compte plus les lignes de la page des échéances").toMatch(/echeancesProches\(o\)\.length/);
    expect(l, "le nombre n'arrive plus à la barre").toMatch(/echeances=\{echeances \?\? 0\}/);
  });
});

describe("les pages pleines", () => {
  it("l'horloge et l'étoile sont des pages pleines, fermées par leur croix", () => {
    for (const f of ["src/app/echeances/page.tsx", "src/app/favoris/page.tsx"]) {
      expect(sansNotes(lire(f)), `${f} n'est plus une page pleine`).toMatch(/<PagePleine\s/);
    }
    const p = sansNotes(lire("src/components/PagePleine.tsx"));
    expect(p, "la page pleine n'a plus sa croix").toMatch(/<FermerLaPage label=\{fermer\} \/>/);
    expect(sansNotes(lire("src/components/FermerLaPage.tsx")), "la croix ne recule plus comme la flèche de la barre").toMatch(/onClick=\{\(\) => reculer\(router, "\/"\)\}/);
    expect(sansNotes(lire("src/components/mobile/MobileShell.tsx")), "la flèche de la barre ne passe plus par la règle commune").toMatch(/reculer\(router, repli === path \? "\/" : repli\)/);
  });
});

describe("un favori ne mène jamais hors de la maison", () => {
  it("l'action nettoie le chemin AVANT d'écrire, et refuse ce qu'elle ne reconnaît pas", () => {
    const a = sansNotes(lire("src/app/favoris/actions.ts"));
    const nettoie = a.indexOf("cheminDeFavori(href)");
    const ecrit = a.indexOf("addFavori(");
    expect(nettoie, "l'action ne nettoie plus le chemin").toBeGreaterThan(-1);
    expect(ecrit, "l'action n'écrit plus").toBeGreaterThan(-1);
    expect(nettoie < ecrit, "l'action écrit un chemin qu'elle n'a pas encore nettoyé").toBe(true);
    expect(a, "un chemin refusé doit sortir sans rien écrire").toMatch(/if \(!chemin\) return \{ ok: false/);
  });

  it("la table ne se lit, ne s'écrit et ne se vide que par son propriétaire", () => {
    const m = lire("supabase/migrations/0123_favoris.sql");
    expect(m, "la table n'est plus sous RLS").toMatch(/alter table favoris enable row level security/);
    for (const verbe of ["select", "insert", "delete"]) expect(m, `plus de règle « ${verbe} » sur les favoris`).toMatch(new RegExp(`on favoris for ${verbe}`));
    expect(m, "la table accepte de nouveau une adresse hors de la maison").toMatch(/check \(href like '\/%' and href not like '\/\/%'\)/);
    expect(m, "un favori n'est plus unique par client et par page").toMatch(/unique \(user_id, href\)/);
  });
});

describe("une seule bande collée en haut : la barre", () => {
  it("la ligne « Sur cette page » du téléphone défile avec la page", () => {
    /* Elle collait sous la barre — « A · Le marché et ses acteurs · 0/4 lues » —
       et empilait deux repères là où la barre dit déjà le lieu. Retirée sur
       toutes les pages qui l'emploient, le 31 octobre 2026. */
    const css = lire("src/components/PageOutline.module.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const debut = css.indexOf(".phone {\n    display: block;");
    expect(debut, "la règle du téléphone est introuvable : la clause ne garde plus rien").toBeGreaterThan(-1);
    const bloc = css.slice(debut, css.indexOf("}", debut));
    expect(bloc, "la ligne « Sur cette page » colle de nouveau sous la barre").not.toMatch(/position:\s*sticky/);
    // Non-vacuité : le rail du grand écran, lui, colle encore — on lit bien un fichier qui sait coller.
    expect(css.slice(0, css.indexOf(".phone")), "le rail du grand écran ne colle plus : le relevé lit autre chose").toMatch(/position:\s*sticky/);
  });
});

describe("le menu : un seul niveau de favoris", () => {
  it("le geste sur la page courante, et pas de seconde porte vers la liste", () => {
    const b = sansNotes(lire("src/components/mobile/BarreDuHaut.tsx"));
    const tiroir = b.slice(b.indexOf("<aside"));
    expect(tiroir.length, "le tiroir est introuvable : la clause ne garde plus rien").toBeGreaterThan(500);
    expect(tiroir, "le menu a de nouveau un lien « Mes favoris » : deux niveaux pour le même sujet, l'étoile de la barre ouvre déjà la liste").not.toMatch(/href="\/favoris"/);
    expect(tiroir, "le menu n'a plus le geste de mettre la page courante en favori").toMatch(/Mettre cette page en favori/);
    // La liste, elle, reste à une touche : l'étoile de la barre.
    expect(b.slice(0, b.indexOf("<aside")), "l'étoile de la barre ne mène plus aux favoris").toMatch(/<Link href="\/favoris"/);
  });
});

describe("grand écran : les mêmes raccourcis, là où la barre du téléphone n'existe pas", () => {
  it("de 761 à 1040 px, l'en-tête du client porte les trois boutons ; le pied de colonne et le desk gardent la feuille du compte", () => {
    const u = sansNotes(lire("src/components/UserMenu.tsx"));
    expect(u, "l'en-tête de bureau n'a plus les trois boutons du client").toMatch(/!account\.desk && dock !== "bottom-left" \? <BarreDuHaut /);
    expect(u, "le desk ou le pied de colonne ont perdu la feuille du compte").toMatch(/: <BarreDuCompte \{\.\.\.account\} dock=\{dock\} \/>/);
    expect(sansNotes(lire("src/app/layout.tsx")), "le nombre de l'horloge n'arrive plus à l'en-tête de bureau").toMatch(/attentes: deskUi \? \[\] : attentes, echeances: echeances \?\? 0/);
  });

  it("à partir de 1041 px, la colonne du client porte l'horloge et l'étoile, sous l'enseigne", () => {
    const l = sansNotes(lire("src/app/layout.tsx"));
    expect(l, "la colonne du client n'a plus ses raccourcis").toMatch(/raccourcis=\{session && !deskUi \? <RaccourcisColonne echeances=\{echeances \?\? 0\} favoris=\{Boolean\(favoris\)\} \/> : undefined\}/);
    const c = sansNotes(lire("src/components/Colonne.tsx"));
    expect(c.indexOf("{raccourcis}"), "la colonne ne rend plus ses raccourcis").toBeGreaterThan(-1);
    expect(c.indexOf("{raccourcis}") < c.indexOf("<Chercher groupes"), "les raccourcis ne sont plus au-dessus de la recherche").toBe(true);
    const r = sansNotes(lire("src/components/RaccourcisColonne.tsx"));
    expect(r, "l'horloge de la colonne ne mène plus aux échéances").toMatch(/<Link href="\/echeances"/);
    expect(r, "l'étoile de la colonne ne mène plus aux favoris").toMatch(/<Link href="\/favoris"/);
    expect(r, "l'horloge de la colonne reparaît alors que sa page est vide").toMatch(/\{echeances > 0 && \(\s*<Link href="\/echeances"/);
  });
});

/**
 * LA LOUPE ET L'ÉTOILE (1er novembre 2026, planche « fiche et Accueil », point 12B).
 *
 * La barre de recherche du tiroir ouvrait une feuille de six résultats qui se
 * comportait mal : elle est partie, remplacée par une loupe dans la barre du haut
 * qui MÈNE à la page de recherche. Et l'étoile n'existe que si le client a un
 * favori : une étoile vers une liste vide apprend à ne plus la toucher.
 */
describe("la loupe et l'étoile", () => {
  const barre = () => code("src/components/mobile/BarreDuHaut.tsx");
  it("mène à la page de recherche par un lien, sauf depuis elle-même", () => {
    expect(barre(), "la loupe n'est plus un lien vers la page de recherche").toMatch(/chemin !== "\/recherche" && \(\s*<Link href="\/recherche"/);
  });
  it("n'a plus de barre de recherche dans le tiroir, ni de feuille de résultats", () => {
    expect(barre(), "le tiroir a retrouvé un champ de recherche").not.toMatch(/styles\.champ/);
    expect(barre(), "la feuille de résultats est revenue").not.toMatch(/<Sheet\b|MenuRecherche|useGuideIndex/);
  });
  it("ne montre l'étoile que si le client a un favori, et la montre dès qu'il en pose un", () => {
    expect(barre(), "l'étoile n'est plus conditionnelle").toMatch(/\{aUnFavori && \(\s*<Link href="\/favoris"/);
    expect(barre(), "le premier favori posé depuis le menu ne fait plus paraître l'étoile").toMatch(/if \(r\.favori\) setAUnFavori\(true\)/);
    expect(code("src/components/RaccourcisColonne.tsx"), "la colonne montre « Favoris » même sans favori").toMatch(/\{favoris && \(\s*<Link href="\/favoris"/);
  });
  it("le calcule une fois, au gabarit, pour les trois surfaces", () => {
    const l = code("src/app/layout.tsx");
    expect(l, "le gabarit ne dit plus s'il y a un favori").toMatch(/aDesFavoris\(w, o, p\)/);
    for (const surface of [/favoris: Boolean\(favoris\)/, /favoris=\{Boolean\(favoris\)\} desk=/, /favoris=\{Boolean\(favoris\)\} \/> : undefined/]) expect(l, `une surface ne reçoit plus l'indicateur : ${surface.source}`).toMatch(surface);
  });

  it("le tiroir se ferme d'un glissement vers la droite, sans rebond, et le menu ouvre « Mon activité »", () => {
    const b = sansNotes(lire("src/components/mobile/BarreDuHaut.tsx"));
    expect(b, "le glissement ne ferme plus le tiroir").toMatch(/onTouchStart=\{commencer\} onTouchMove=\{suivre\} onTouchEnd=\{relacher\}/);
    expect(b, "la fermeture ne reprend plus là où est le doigt, à la courbe des feuilles").toMatch(/el\.style\.transition = `transform \$\{ms\}ms \$\{COURBE_DES_FEUILLES\}`;\s*el\.style\.transform = "translateX\(105%\)";/);
    expect(b, "le geste ne distingue plus l'horizontal du défilement vertical").toMatch(/dx > Math\.abs\(dy\) \* 1\.3/);
    expect(sansNotes(lire("src/components/mobile/BarreDuHaut.module.css")), "le tiroir perd touch-action pan-y").toMatch(/touch-action: pan-y;/);
    expect(b, "le menu n'ouvre plus « Mon activité »").toMatch(/href="\/moi\/activite"[\s\S]*Mon activité/);
  });

  it("le menu garde toujours le lien « Ce qui ferme bientôt » : seule l'icône de la barre disparaît quand sa page est vide", () => {
    const b = sansNotes(lire("src/components/mobile/BarreDuHaut.tsx"));
    expect(b, "le lien du menu est de nouveau conditionné au nombre").not.toMatch(/\{echeances > 0 && \(\s*<Link href="\/echeances" className=\{styles\.ligne\}/);
    expect(b).toMatch(/<Link href="\/echeances" className=\{styles\.ligne\} onClick=\{fermer\}>/);
  });
});
