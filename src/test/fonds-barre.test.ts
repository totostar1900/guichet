import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EN_ALL } from "@/i18n/core";
import { FUND_CATEGORY_LABEL, FUND_FREQUENCY_LABEL, fundKey } from "@/lib/domain/market";

/**
 * LES COMMANDES DE LA PAGE DES FONDS SONT SOUS LES YEUX.
 *
 * Le défaut d'origine est une commande enfermée. La page écrivait sa rangée
 * d'outils UNE FOIS POUR DEUX ENDROITS : dans la page, où elle disparaissait
 * sous 760 px, et dans une feuille, seule voie restante sur téléphone. Tout y
 * était donc derrière un geste : le champ de recherche, qui est le geste le
 * plus direct de cette page ; la catégorie ; la périodicité ; le tri.
 *
 * Ce qui est tenu ici, et qu'une relecture du fichier ne montre pas :
 *
 *  1. plus de feuille, plus de bouton flottant, plus de rangée écrite deux
 *     fois : c'est le motif qui enfermait les commandes ;
 *  2. chaque filtre que l'adresse peut porter a sa commande NOMMÉE dans la
 *     page, et un filtre ajouté demain sans la sienne fait tomber ce test ;
 *  3. ce qui s'ouvre tombe du bord de son déclencheur, jamais du bas de
 *     l'écran ;
 *  4. les valeurs offertes viennent des lignes reçues, donc un filtre ne mène
 *     jamais à une liste vide ;
 *  5. le sommaire des groupes ne paraît que groupé, et il sait retrouver
 *     chacun de ses blocs ;
 *  6. le champ reconnaît les TROIS choses qu'il promet, chacune avec sa part
 *     réservée ;
 *  7. le tri et le resserrement sont là où les titres les mettent ;
 *  8. toutes les étiquettes existent en anglais, alors qu'elles passent par
 *     « t(variable) », le premier angle mort du balayeur de clefs.
 */
const SRC = readFileSync("src/app/fonds/FundsBrowser.tsx", "utf8");
const CARTE = readFileSync("src/app/fonds/FundCard.tsx", "utf8");
const CARTE_CSS = readFileSync("src/app/fonds/FundCard.module.css", "utf8");
const MENU_CSS = readFileSync("src/components/market/Dropdown.module.css", "utf8");
const PAGE_CSS = readFileSync("src/app/fonds/page.module.css", "utf8");
/* Le titre-sommaire est partagé avec la page des adjudications : il vit dans
   « market/TeteGroupe », et c'est là qu'on l'éprouve. */
const TETE = readFileSync("src/components/market/TeteGroupe.tsx", "utf8");
const TETE_CSS = readFileSync("src/components/market/TeteGroupe.module.css", "utf8");
const ONGLETS = readFileSync("src/components/market/OngletsMarche.module.css", "utf8");
const BANDE_CSS = readFileSync("src/components/GrilleDInstruments.module.css", "utf8");

/** La fermeture d'un bloc d'instructions, par opposition à celle du JSX. */
const BLOC = "\n  };\n";
/**
 * Le corps d'une déclaration faite à deux espaces d'indentation, lu jusqu'à sa
 * fermeture. « ferme » dit laquelle : une fonction qui rend du JSX se termine
 * par « ); », un bloc d'instructions par « }; ». Le premier jet lisait tout le
 * monde avec « ); », et le corps de « clearAll » débordait alors jusqu'à la
 * fonction suivante, où il attrapait le « sens: undefined » du tri et le
 * prenait pour un filtre sans commande. Le test a nommé la clef : c'est ainsi
 * qu'on a vu que la mesure, et non le code mesuré, était fausse.
 */
const corpsDe = (nom: string, ferme = "\n  );\n"): string => {
  const debut = SRC.indexOf(nom);
  expect(debut, `« ${nom} » : introuvable, le test ne mesure plus rien`).toBeGreaterThan(-1);
  const fin = SRC.indexOf(ferme, debut);
  expect(fin, `« ${nom} » : pas de fermeture « ${ferme.trim()} » à deux espaces`).toBeGreaterThan(debut);
  return SRC.slice(debut, fin);
};

/** Le rendu de la page, où toute commande doit se trouver. */
const PAGE = SRC.slice(SRC.indexOf("  return ("));

describe("les commandes de la page des fonds", () => {
  it("ne cache plus rien derrière une feuille", () => {
    /* « Sheet » est revenu le 5 novembre 2026, et c'est voulu : la fenêtre « Filtrer » des fonds est la même, centrée, que celle de Titres. Elle ne porte que la société de gestion et le dépositaire. */
    expect(SRC, "la fenêtre « Filtrer » des fonds n'est plus centrée").toMatch(/<Sheet\s+open=\{filtres\}[\s\S]*?centre/);
    for (const enferme of ["FilterLine"]) {
      expect(SRC, `« ${enferme} » est revenu : la page remet des commandes derrière un geste`).not.toMatch(new RegExp(`import \\{[^}]*\\b${enferme}\\b`));
    }
    /* « FilterFab » EST REVENU, MAIS IL N'OUVRE RIEN : il ramène aux
       commandes, qui sont en haut et à plat. « ouvre={false} » est ce qui le
       dit, à l'écran comme au lecteur d'écran — sans lui, le bouton
       annoncerait une boîte de dialogue qui ne viendra pas. */
    /* « FilterFab » EST PARTI À SON TOUR, le 7 octobre 2026. Il avait perdu
       son objet quand les commandes sont passées à plat en haut de page : il
       ne faisait plus que ramener en haut, ce que le retour en haut fait à
       deux centimètres de là, et il couvrait une rangée de la liste en bas
       d'écran, là où le pouce lit. */
    expect(SRC, "le bouton flottant est revenu").not.toMatch(/<FilterFab/);
    /* La rangée écrite une fois pour la page et une fois pour la feuille était
       le vrai motif : c'est elle qui obligeait à masquer l'une des deux. */
    expect(SRC, "une rangée d'outils est revenue, avec les deux copies qu'elle entraîne").not.toMatch(/styles\.(toolbar|deskTools|sheetTools)\b/);
    const champs = [...SRC.matchAll(/type="search"/g)].length;
    expect(champs, "le champ doit être écrit une seule fois : deux champs, deux états de frappe").toBe(1);
    expect(PAGE, "le champ n'est pas dans la page").toMatch(/\{recherche\}/);
  });

  it("donne à chaque filtre de l'adresse une commande nommée dans la page", () => {
    /* La table dit, pour chaque clef d'URL, ce qui la commande à l'écran et
       comment on le reconnaît dans le source. « clearAll » écrit la liste des
       clefs : les deux doivent coïncider. Ajouter un filtre à « clearAll »
       sans l'inscrire ici fait tomber le test, et c'est le but. */
    const COMMANDES: Record<string, { quoi: string; preuve: RegExp }> = {
      /* « tri » et « sens » sont dans « clearAll » depuis que « Tout
         effacer » efface AUSSI l'ordre : ils ont donc leur commande nommée,
         comme les filtres. */
      tri: { quoi: "la liste des ordres, dans la fenêtre « Affichage »", preuve: /tri=\{\{ quoi: t\("Trier par"\)/ },
      sens: { quoi: "le sens qui retourne l'ordre, dans la fenêtre « Affichage »", preuve: /onSens: sort !== "categorie"/ },
      q: { quoi: "le champ de recherche", preuve: /type="search"/ },
      cat: { quoi: "la grille des catégories, en carrés", preuve: /<GrilleDInstruments\s+etiquette="Catégorie"/ },
      gestion: { quoi: "la pastille de la société de gestion", preuve: /clef: "gestion"/ },
      depositaire: { quoi: "la pastille du dépositaire", preuve: /clef: "depositaire"/ },
      /* La fenêtre d'observation n'est pas un filtre — elle ne retire aucun
         fonds, elle change ce que la colonne mesure — mais elle est dans
         « clearAll » pour la même raison que le tri : « tout effacer » rend
         la liste telle qu'elle s'ouvre. Sa commande doit donc être nommée
         comme les autres. */
      periode: { quoi: "la rangée des fenêtres d'observation", preuve: /<ChoixFenetre\s/ },
      perf: { quoi: "la barre à deux poignées de la bande à points", preuve: /<BandeFonds\s/ },
    };
    const effacees = [...corpsDe("const clearAll = () => {", BLOC).matchAll(/(\w+): undefined/g)].map((m) => m[1]);
    expect(effacees.length, "clearAll n'efface plus rien : le test ne mesure plus rien").toBeGreaterThan(5);
    expect([...effacees].sort(), "un filtre de l'adresse n'a pas de commande nommée dans ce test").toEqual(Object.keys(COMMANDES).sort());
    for (const [clef, { quoi, preuve }] of Object.entries(COMMANDES)) {
      expect(SRC.match(preuve), `« ${clef} » : ${quoi} a disparu de la page`).toBeTruthy();
    }
    /* LA RANGÉE À PLAT PORTE SA SORTIE : « Toutes » remet le filtre à zéro là
       où on l'a pris. Sans elle, on ne peut plus que tout effacer. */
    expect(SRC, "la tuile « Toutes » ne remet rien à zéro").toMatch(/cle: "toutes"[^}]*onClick: \(\) => setCat\(""\)/);
    // Les pastilles rendent la main : une pastille sans « retirer » est un cul-de-sac.
    const pastilles = [...SRC.matchAll(/actifs\.push\([\s\S]*?\);/g)];
    expect(pastilles.length, "plus aucune pastille : le test ne mesure plus rien").toBeGreaterThan(1);
    for (const [pousse] of pastilles) expect(pousse, `pastille sans sortie : ${pousse}`).toMatch(/retirer: \(\) =>/);
  });

  it("ouvre ses listes du bord de leur déclencheur, pas du bas de l'écran", () => {
    /* Règle de la maison. Une liste posée en « fixed » ou collée au bas de la
       fenêtre perd le lien avec le bouton qu'on vient de toucher. */
    expect(MENU_CSS, "le menu ne tombe plus de son bouton").toMatch(/\.ddMenu \{[^}]*position: absolute;[^}]*top: calc\(100% \+/);
    expect(MENU_CSS, "le menu sortirait de l'écran près du bord droit, sans recours").toMatch(/\.ddMenu\[data-bord="droite"\]/);
  });

  it("n'offre que des valeurs présentes dans les lignes reçues", () => {
    /* Une pastille qui mène à « Aucun fonds ne correspond » est une fausse
       promesse : les catégories sont filtrées sur les lignes reçues.
       La liste des périodicités a été retirée le 7 octobre 2026 : on ne
       choisit pas un fonds sur le rythme auquel sa VL est frappée, et elle
       reste écrite sous le nom de chaque fonds, où elle se lit. */
    const debutGrille = SRC.indexOf('etiquette="Catégorie"');
    expect(debutGrille, "la grille des catégories est introuvable").toBeGreaterThan(-1);
    const rang = SRC.slice(debutGrille, debutGrille + 900);
    expect(rang, "les catégories ne sont plus filtrées sur les lignes reçues").toMatch(/rows\.some\(/);
    expect(SRC, "la liste des périodicités est revenue : elle a été retirée exprès").not.toMatch(/<Dropdown\s+label="VL"/);
  });

  it("fait du titre le sommaire, sans bande au-dessus", () => {
    /* LA BANDE ÉTAIT DIMENSIONNÉE POUR QUATRE, ON LUI EN AVAIT DONNÉ TREIZE.
       Mesuré à 412 px : par catégorie 4 pastilles et 412 px, ça tient tout
       juste ; par dépositaire 1 806 px, soit 4,4 écrans ; par société de
       gestion 2 718 px, soit 6,6 écrans, dont une pastille de 351 px. Elle
       répétait en plus le titre figé qui la suivait, et coûtait 42 px sur
       chaque écran. */
    expect(SRC, "la bande des groupes est revenue au-dessus du titre").not.toMatch(/BandeGroupes/);
    expect(TETE_CSS, "le titre ne se range plus directement sous l'en-tête : une bande s'est réintercalée").toMatch(/\.teteBoite \{[^}]*top: var\(--barre-app, 0px\);/);
    // Le titre porte le sommaire : il s'ouvre, et il conduit.
    expect(PAGE, "le titre-sommaire a quitté la page des fonds").toMatch(/<TeteGroupe /);
    const tete = TETE;
    expect(tete, "le titre ne s'ouvre plus").toMatch(/aria-expanded/);
    expect(tete, "le titre ne conduit plus nulle part").toMatch(/conduireVers\(g\.clef/);
    expect(tete, "le saut doit se mesurer depuis le titre épinglé, pas depuis une constante").toMatch(/tete\.current\?\.getBoundingClientRect\(\)\.top/);
    /* UN SEUL GROUPE N'EST PAS UN SOMMAIRE : le chevron annoncerait un geste
       qui ne mène qu'à soi-même. */
    expect(tete, "le titre s'ouvre même quand il n'y a qu'un groupe").toMatch(/const seul = groupes\.length < 2;/);
    expect(tete).toMatch(/disabled=\{seul\}/);
    /* LE NOM ENTIER N'EST JAMAIS PERDU : il reste en infobulle et dans le
       nom accessible, puisque le titre, lui, est raccourci. */
    expect(tete, "le nom entier a disparu de l'infobulle").toMatch(/title=\{entier !== nom \? entier : undefined\}/);
    expect(tete, "le nom accessible doit dire le nom entier").toMatch(/aria-label=\{`\$\{entier\}/);
    /* LA CLEF D'UN GROUPE EST UNE ANCRE : le sommaire va chercher le bloc par
       un sélecteur d'attribut. Les noms réels portent apostrophes, points et
       espaces — « L'ARCHER ASSET MANAGEMENT », « ELITE CAPITAL ASSET
       MANAGEMENT S.A. », « CCA -Bank » — et « fundKey » doit en faire quelque
       chose qu'un sélecteur accepte. */
    expect(SRC, "la clef d'un groupe n'est plus un slug").toMatch(/const clef = fundKey\(entier\)/);
    for (const nom of ["L'ARCHER ASSET MANAGEMENT", "ELITE CAPITAL ASSET MANAGEMENT S.A.", "CCA -Bank", "UBA CAMEROUN"]) {
      const clef = fundKey(nom);
      expect(clef, `« ${nom} » : clef vide`).toBeTruthy();
      expect(clef, `« ${nom} » → « ${clef} » : un sélecteur d'attribut ne l'avalera pas tel quel`).toMatch(/^[a-z0-9-]+$/);
    }
    // Le bloc porte l'ancre que le sommaire cherche : « aria-labelledby="sec-<clef>" ».
    expect(PAGE, "les blocs ne portent plus l'ancre du sommaire").toMatch(/aria-labelledby=\{b\.clef \? `sec-\$\{b\.clef\}` : undefined\}/);
    expect([...PAGE.matchAll(/aria-labelledby=\{b\.clef/g)].length, "les trois vues doivent porter l'ancre : cartes, liste, tableau").toBe(3);
  });

  it("reconnaît les trois choses que le champ promet, chacune avec sa part", () => {
    /* Le champ promet « un fonds, une société de gestion, un dépositaire ».
       Le filtre tenait les trois, les suggestions n'en offraient que deux :
       taper « UBA » retirait trente-cinq fonds sans que rien ne dise
       pourquoi. Et les gestions passant d'abord, « asset » reconnaissait
       treize sociétés et ne laissait plus une place à un fonds. */
    const sug = corpsDe("const suggestions = useMemo(", "\n  }, [draft");
    for (const sorte of ["gestion", "depositaire", "fonds"]) {
      expect(sug, `la suggestion « ${sorte} » a disparu du champ`).toMatch(new RegExp(`kind: "${sorte}" as const`));
    }
    expect(sug, "une sorte peut de nouveau prendre toutes les places").toMatch(/\.slice\(0, 3\)[\s\S]*\.slice\(0, 3\)/);
    expect(SRC, "le filtre ne cherche plus dans les trois").toMatch(/fold\(`\$\{r\.title\} \$\{r\.manager\} \$\{r\.depositary\}`\)/);
    // Toucher une gestion ou un dépositaire FILTRE ; toucher un fonds CHERCHE.
    expect(SRC).toMatch(/if \(sug\.kind === "gestion"\) update\(\{ gestion: sug\.text/);
    expect(SRC).toMatch(/else if \(sug\.kind === "depositaire"\) update\(\{ depositaire: sug\.text/);
  });

  it("range le tri, le regroupement, les vues et la densité derrière « Affichage », et retire le sens là où il ne veut rien dire", () => {
    /* DEPUIS LE 4 NOVEMBRE 2026 (choix C de la planche), la barre est « Rechercher · Affichage » : les commandes qui se règlent une fois
       tiennent dans une fenêtre au milieu de l'écran, la même que sur Titres et Adjudications. Les listes « Grouper » et « Tri », leur
       flèche, le choix des vues et le resserrement n'occupent plus de rangée. */
    const debut = SRC.indexOf("<Affichage");
    expect(debut, "le bouton « Affichage » a quitté la barre des fonds").toBeGreaterThan(-1);
    const fenetre = SRC.slice(debut, SRC.indexOf("/>", SRC.indexOf("onReset={clearAll}", debut)) + 2);
    expect(fenetre, "le tri a quitté la fenêtre d'affichage").toMatch(/tri=\{\{ quoi: t\("Trier par"\)[^}]*options: SORT\.map/);
    expect(fenetre, "le regroupement a quitté la fenêtre d'affichage").toMatch(/groupe=\{\{ quoi: t\("Grouper par"\)[^}]*options: GROUPES\.map/);
    expect(fenetre, "les vues ont quitté la fenêtre d'affichage").toMatch(/vue=\{!phone \? \{ quoi: t\("Vue"\)/);
    expect(fenetre, "le resserrement ne paraît plus que sur la vue cartes").toMatch(/densite=\{vue === "cards" && !desk\}/);
    /* « par catégorie » est un rangement, pas une mesure : il n'a pas de sens à inverser, et le sens ne doit pas s'y proposer. */
    expect(fenetre, "le sens s'offre sur « par catégorie »").toMatch(/onSens: sort !== "categorie" \? \(\) => setAsc\(!asc\) : undefined/);
    expect(SRC, "une liste « Grouper » est revenue en pleine barre").not.toMatch(/<Dropdown\s+label="Grouper"/);
    expect(SRC, "une liste « Tri » est revenue en pleine barre").not.toMatch(/<Dropdown\s+label="Tri"/);
  });

  it("ne compte plus les fonds, et garde « Tout effacer » dans la fenêtre d'affichage", () => {
    /* « 25 obligataires correspondant aux filtres » répétait ce que la liste montre, sur une ligne payée à chaque écran, et dont personne ne tire
       une décision : on ne compte pas des fonds, on en cherche un. */
    expect(SRC, "le compte est revenu").not.toMatch(/styles\.count/);
    expect(SRC, "la phrase du compte est revenue").not.toMatch(/correspondant aux filtres/);
    /* TOUT EFFACER EFFACE AUSSI L'ORDRE, et il est en pied de la fenêtre d'affichage, éteint quand il n'y a rien à défaire (« poseSurLaListe »). */
    expect(SRC, "« Tout effacer » a quitté la fenêtre d'affichage").toMatch(/onReset=\{clearAll\}\s+aEffacer=\{poseSurLaListe\}/);
    expect(SRC, "le bouton ne paraît plus quand seul l'ordre a changé").toMatch(/const poseSurLaListe = [^;]*sort !== "categorie"/);
  });

  it("traduit toutes les étiquettes, qui passent par t(variable)", () => {
    const clefs = [
      ...[...SRC.matchAll(/rangee\(\s*"([^"]+)",\s*\w+,\s*"([^"]+)"/g)].flatMap((m) => [m[1], m[2]]),
      ...[...SRC.matchAll(/actifs\.push\(\{[^»]*?quoi: "([^"]+)"/g)].map((m) => m[1]),
      ...[...SRC.matchAll(/<Dropdown\s+label="([^"]+)"/g)].map((m) => m[1]),
      ...[...SRC.matchAll(/^\s*\["(?:gestion|depositaire|categorie)", "([^"]+)"\],$/gm)].map((m) => m[1]),
      /* Le tiret de la valeur manquante ne se traduit pas : c'est la règle de
         la maison, et « ? » est la catégorie d'un fonds dont le bulletin n'a
         rien dit. Aucune pastille ne le propose, mais la carte l'affiche. */
      ...Object.values(FUND_CATEGORY_LABEL).filter((l) => l && l !== "—"),
      ...Object.values(FUND_FREQUENCY_LABEL).filter((l) => l && l !== "—"),
    ];
    expect(clefs.length, "plus aucune étiquette : le test ne mesure plus rien").toBeGreaterThan(12);
    for (const k of clefs) expect(EN_ALL[k], `« ${k} » : étiquette sans anglais, et le balayeur ne la voit pas puisqu'elle passe par t(variable)`).toBeTruthy();
  });
});

describe("la pile collante", () => {
  it("laisse partir la rangée des pages quand on descend", () => {
    /* Collante, elle prenait quarante pixels sur chaque écran pendant toute
       la lecture, pour des liens vers d'AUTRES pages. Le repère pendant la
       lecture, c'est le sommaire, qui dit où l'on est dans celle-ci. */
    expect(ONGLETS, "la rangée des pages colle de nouveau en haut de l'écran").not.toMatch(/\.onglets \{[^}]*position: sticky/);
    /* Et ce qui colle ne doit plus réserver sa hauteur : sinon les bandes
       flottent quarante pixels sous l'en-tête, devant du vide. */
    expect(BANDE_CSS, "la bande des sections garde la hauteur d'une rangée qui ne colle plus").not.toMatch(/--lieux-h/);
    expect(PAGE_CSS, "le titre de groupe garde la hauteur d'une rangée qui ne colle plus").not.toMatch(/\.teteGroupe \{[^}]*--lieux-h/);
  });

  it("ne laisse pas un pixel entre la bande des sections et le titre qui s'y range", () => {
    /* LE DÉFAUT, VU À L'ÉCRAN le 4 octobre 2026 : sept pixels d'air entre la
       bande du sommaire et le titre, par lesquels les cartes défilaient. La
       bande mesurait 41 px, posée par son contenu ; le titre se décalait de
       48, un nombre deviné parce que la hauteur de la bande vivait dans le
       module des titres, invisible depuis la page des fonds.
       Une hauteur que deux fichiers doivent dire pareil appartient à
       « globals.css », et celui qui la dessine la VAUT au lieu de la tenir de
       son contenu. La page des fonds n'a plus de bande du tout — son titre
       est le sommaire — mais celle des titres en garde une, et l'éclairage
       vaut pour elle. */
    expect(readFileSync("src/app/globals.css", "utf8"), "la hauteur du sommaire doit être nommée une fois, pour tous").toMatch(/--sections-h:/);
    /* LA BANDE NE COLLE PLUS (4 novembre 2026) : elle est une grille de tuiles dans la page. Le titre de section se cale donc sur l'en-tête de
       l'application seul, et plus sur la hauteur d'une bande qui n'existe plus. */
    expect(BANDE_CSS, "la grille des instruments recolle sous l'en-tête").not.toMatch(/position: sticky/);
    expect(readFileSync("src/components/OfferBrowser.module.css", "utf8"), "le titre de section des titres doit se caler sur l'en-tête de l'application").toMatch(/\.secHead \{[^}]*top: var\(--barre-app, 0px\);/);
  });

  it("couvre toute la largeur, sinon la liste défile visiblement à côté", () => {
    /* Deuxième fois que cet éclairage se paie : arrêté à la gouttière, un
       bandeau collant laisse passer les chiffres dans ses marges. */
    expect(TETE_CSS, "le titre de groupe s'arrête à la gouttière").toMatch(/\.teteGroupe \{[^}]*margin: var\(--s-8\) -20px var\(--s-4\);/);
    expect(TETE_CSS, "sans rembourrage, le texte du titre collerait au bord").toMatch(/\.teteBouton \{[^}]*padding: var\(--s-3\) 20px;/);
    expect(TETE_CSS, "le titre de groupe doit être opaque").toMatch(/\.teteGroupe \{[^}]*background: var\(--paper\);/);
    /* ET LA LISTE AUSSI : ouverte, elle couvre ce qui défile dessous. */
    expect(TETE_CSS, "la liste du sommaire s'arrête à la gouttière").toMatch(/\.teteListe \{[^}]*left: -20px;/);
  });

  it("donne au groupe qu'on lit une marque qui gagne vraiment", () => {
    /* TROISIÈME FOIS DANS LA JOURNÉE que la spécificité mange un état :
       « .teteIci » vaut (0,1,0) et perdait contre « .teteListe button »
       (0,1,1). Les deux couleurs sortaient identiques, rgb(181, 192, 208),
       et le repère ne repérait rien. L'état doit être écrit AUSSI composé
       que la règle de base. */
    expect(TETE_CSS, "la marque « vous êtes ici » est redevenue moins spécifique que la règle de base").toMatch(/\.teteListe button\.teteIci \{/);
    expect(TETE_CSS, "une marque posée sans son parent reperdra contre « .teteListe button »").not.toMatch(/\n\.teteIci \{/);
  });
});

describe("la carte compacte d'un fonds", () => {
  it("remplit la carte et cale sa performance en colonne, comme celle d'un titre", () => {
    /* Mesuré à 412 px avant correction : le contenu s'arrêtait à 211 sur une
       carte large de 384, et la performance tombait à une abscisse différente
       par carte, selon la longueur du nom. Après : nom à 47, performance
       finissant à 309, outils à 333, identiques sur les six premières. */
    expect(CARTE_CSS, "le lien ne grandit plus : le contenu se tasse à gauche et la colonne des chiffres se dérègle").toMatch(/\.cLien \{[^}]*flex: 1 1 auto;/);
    expect(readFileSync("src/components/mobile/CarteDepliee.module.css", "utf8"), "les outils retournent coller au chiffre : on touche le « ··· » en voulant lire la performance").toMatch(/\.outils \{[^}]*margin-left: 16px;/);
    expect(CARTE_CSS, "les outils ne doivent plus être tirés vers le contenu par une marge négative").not.toMatch(/\.cOutils \{[^}]*margin-right: calc\(-1/);
    /* VINGT-QUATRE DE CHAQUE CÔTÉ, pour que les chevrons du glissement aient
       leur voie : un chevron tient de 2 à 16 px du bord. Même marge que la carte d'un titre (9 novembre 2026) : les « ··· » tombent au même endroit sur les trois pages. */
    expect(CARTE_CSS, "la voie du chevron est reprise par le texte").toMatch(/\.compacte \{[^}]*padding: 8px 24px;/);
    expect(CARTE_CSS, "la performance n'est plus calée à droite : les chiffres ne font plus une colonne").toMatch(/\.cPerf \{[^}]*text-align: right;/);
  });

  it("donne sa ligne au gestionnaire, et la suivante à la catégorie et au rythme", () => {
    /* Les trois faits tenaient sur une ligne, séparés par des points médians :
       « Actions · Harvest Asset Management · VL hebdomadaire », cinquante-six
       caractères qui passaient à la ligne n'importe où selon la longueur du nom
       de la société. Qui gère est l'engagement, les deux autres décrivent le
       produit : deux natures, deux lignes. */
    const sous = CARTE.slice(CARTE.indexOf("propres.sous"), CARTE.indexOf("propres.sous") + 600);
    const gestion = sous.indexOf("propres.gestion");
    const traits = sous.indexOf("propres.traits");
    expect(gestion, "la société de gestion n'a plus sa propre ligne").toBeGreaterThan(-1);
    expect(traits, "la catégorie et le rythme n'ont plus leur ligne").toBeGreaterThan(-1);
    expect(gestion, "le gestionnaire doit venir en premier").toBeLessThan(traits);
    expect(sous.slice(gestion, traits), "la ligne du gestionnaire ne porte que son nom").toMatch(/\{r\.manager\}/);
    expect(sous.slice(traits), "la seconde ligne doit porter la catégorie et le rythme").toMatch(/FUND_CATEGORY_LABEL\[r\.category\][\s\S]*FUND_FREQUENCY_LABEL\[r\.frequency\]/);
    /* L'ancienne classe ne doit plus exister nulle part : tant qu'elle reste,
       la version d'une seule ligne peut revenir sans qu'on le remarque. */
    expect(CARTE, "« fundSub » est revenu : les trois faits sont de nouveau sur une ligne").not.toMatch(/fundSub/);
  });
});
