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
    for (const enferme of ["Sheet", "FilterFab", "FilterLine"]) {
      expect(SRC, `« ${enferme} » est revenu : la page remet des commandes derrière un geste`).not.toMatch(new RegExp(`import \\{[^}]*\\b${enferme}\\b`));
    }
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
      q: { quoi: "le champ de recherche", preuve: /type="search"/ },
      cat: { quoi: "la rangée des catégories, à plat", preuve: /rangee\(\s*"Catégorie"/ },
      vl: { quoi: "la liste des périodicités", preuve: /<Dropdown\s+label="VL"/ },
      gestion: { quoi: "la pastille de la société de gestion", preuve: /clef: "gestion"/ },
      depositaire: { quoi: "la pastille du dépositaire", preuve: /clef: "depositaire"/ },
    };
    const effacees = [...corpsDe("const clearAll = () => {", BLOC).matchAll(/(\w+): undefined/g)].map((m) => m[1]);
    expect(effacees.length, "clearAll n'efface plus rien : le test ne mesure plus rien").toBeGreaterThan(4);
    expect([...effacees].sort(), "un filtre de l'adresse n'a pas de commande nommée dans ce test").toEqual(Object.keys(COMMANDES).sort());
    for (const [clef, { quoi, preuve }] of Object.entries(COMMANDES)) {
      expect(SRC.match(preuve), `« ${clef} » : ${quoi} a disparu de la page`).toBeTruthy();
    }
    /* LA RANGÉE À PLAT PORTE SA SORTIE : « Toutes » remet le filtre à zéro là
       où on l'a pris. Sans elle, on ne peut plus que tout effacer. */
    expect(corpsDe("const rangee = ("), "la sortie de la rangée ne remet rien à zéro").toMatch(/onClick=\{\(\) => choisir\(""\)\}/);
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
       promesse. Les catégories sont filtrées sur les lignes, les périodicités
       viennent de « freqs », qui est lui-même construit sur les lignes. */
    const rang = SRC.slice(SRC.indexOf('rangee(\n            "Catégorie"'), SRC.indexOf('rangee(\n            "Catégorie"') + 400);
    expect(rang, "les catégories ne sont plus filtrées sur les lignes reçues").toMatch(/rows\.some\(/);
    expect(SRC, "les périodicités ne viennent plus des lignes reçues").toMatch(/items=\{freqs\.map/);
    expect(SRC, "« freqs » ne se construit plus sur les lignes").toMatch(/const freqs = useMemo\(\(\) => \[\.\.\.new Set\(rows\.map/);
  });

  it("ne montre le sommaire que groupé, et lui donne des ancres qu'il sait relire", () => {
    expect(PAGE, "le sommaire paraît sans groupes : une bande collante qui ne conduit nulle part").toMatch(/\{groupe && groupes\.length > 1 && <BandeGroupes/);
    /* LA CLEF D'UN GROUPE EST UNE ANCRE : la bande va chercher le bloc par un
       sélecteur d'attribut. Les noms réels portent apostrophes, points et
       espaces — « L'ARCHER ASSET MANAGEMENT », « ELITE CAPITAL ASSET
       MANAGEMENT S.A. », « CCA -Bank » — et « fundKey » doit en faire quelque
       chose qu'un sélecteur accepte. */
    expect(SRC, "la clef d'un groupe n'est plus un slug").toMatch(/const clef = fundKey\(nom\)/);
    for (const nom of ["L'ARCHER ASSET MANAGEMENT", "ELITE CAPITAL ASSET MANAGEMENT S.A.", "CCA -Bank", "UBA CAMEROUN"]) {
      const clef = fundKey(nom);
      expect(clef, `« ${nom} » : clef vide`).toBeTruthy();
      expect(clef, `« ${nom} » → « ${clef} » : un sélecteur d'attribut ne l'avalera pas tel quel`).toMatch(/^[a-z0-9-]+$/);
    }
    // Le bloc porte l'ancre que la bande cherche : « aria-labelledby="sec-<clef>" ».
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

  it("range les trois listes sur une seule rangée, et retire la flèche là où elle ne veut rien dire", () => {
    /* VL, Grouper et Tri sont trois choix de même nature : ils tiennent sur
       une rangée, et ils y tiennent VRAIMENT — mesuré à 412 px, « Grouper ·
       Société de gestion » faisait 177 px et les renvoyait à la ligne, d'où
       les étiquettes d'un mot. */
    const rang = SRC.slice(SRC.indexOf("<div className={styles.rangee}>"), SRC.indexOf("{actifs.map("));
    for (const liste of ['label="VL"', 'label="Grouper"', 'label="Tri"']) {
      expect(rang, `${liste} a quitté la rangée des listes`).toContain(liste);
    }
    expect(rang, "la liste des ordres ne vient plus de SORT").toMatch(/items=\{SORT\}/);
    /* « par catégorie » est un rangement, pas une mesure : il n'a pas de sens
       à inverser, et la flèche ne doit pas s'y proposer. */
    expect(rang).toMatch(/\{sort !== "categorie" && \([\s\S]*?styles\.dirBtn/);
  });

  it("ne compte plus les fonds, et met le resserrement après le choix des vues", () => {
    /* « 25 obligataires correspondant aux filtres » répétait ce que la liste
       montre, sur une ligne payée à chaque écran, et dont personne ne tire
       une décision : on ne compte pas des fonds, on en cherche un. */
    const compte = PAGE.slice(PAGE.indexOf("styles.count"), PAGE.indexOf("styles.count") + 900);
    expect(compte, "le compte est revenu sur la ligne des vues").not.toMatch(/filtered\.length/);
    expect(compte, "la phrase du compte est revenue").not.toMatch(/correspondant aux filtres/);
    /* Le resserrement ne règle que la vue cartes : avant elles, il se lisait
       comme s'il commandait les trois. */
    const vues = compte.indexOf("styles.seg");
    const densite = compte.indexOf("<DensitySwitch");
    expect(vues, "le choix des vues a disparu").toBeGreaterThan(-1);
    expect(densite, "le resserrement a disparu").toBeGreaterThan(-1);
    expect(vues, "le resserrement doit suivre le choix des vues, pas le précéder").toBeLessThan(densite);
    expect(PAGE, "le resserrement paraît sur une vue qui n'en a pas").toMatch(/\{vue === "cards" && !desk && <DensitySwitch \/>\}/);
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
  const PAGE_CSS = readFileSync("src/app/fonds/page.module.css", "utf8");
  const ONGLETS = readFileSync("src/components/market/OngletsMarche.module.css", "utf8");
  const BANDE_CSS = readFileSync("src/components/SectionChips.module.css", "utf8");

  it("laisse partir la rangée des pages quand on descend", () => {
    /* Collante, elle prenait quarante pixels sur chaque écran pendant toute
       la lecture, pour des liens vers d'AUTRES pages. Le repère pendant la
       lecture, c'est le sommaire, qui dit où l'on est dans celle-ci. */
    expect(ONGLETS, "la rangée des pages colle de nouveau en haut de l'écran").not.toMatch(/\.onglets \{[^}]*position: sticky/);
    /* Et ce qui colle ne doit plus réserver sa hauteur : sinon les bandes
       flottent quarante pixels sous l'en-tête, devant du vide. */
    expect(BANDE_CSS, "la bande des sections garde la hauteur d'une rangée qui ne colle plus").not.toMatch(/\.bar \{[^}]*--lieux-h/);
    expect(PAGE_CSS, "le titre de groupe garde la hauteur d'une rangée qui ne colle plus").not.toMatch(/\.teteGroupe \{[^}]*--lieux-h/);
  });

  it("couvre toute la largeur, sinon la liste défile visiblement à côté", () => {
    /* Deuxième fois que cette leçon se paie : arrêté à la gouttière, un
       bandeau collant laisse passer les chiffres dans ses marges. */
    expect(PAGE_CSS, "le titre de groupe s'arrête à la gouttière").toMatch(/\.teteGroupe \{[^}]*margin: var\(--s-8\) -20px var\(--s-4\);/);
    expect(PAGE_CSS, "sans rembourrage, le texte du titre collerait au bord").toMatch(/\.teteGroupe \{[^}]*padding: var\(--s-3\) 20px;/);
    expect(PAGE_CSS, "le titre de groupe doit être opaque").toMatch(/\.teteGroupe \{[^}]*background: var\(--paper\);/);
  });
});

describe("la carte compacte d'un fonds", () => {
  it("remplit la carte et cale sa performance en colonne, comme celle d'un titre", () => {
    /* Mesuré à 412 px avant correction : le contenu s'arrêtait à 211 sur une
       carte large de 384, et la performance tombait à une abscisse différente
       par carte, selon la longueur du nom. Après : nom à 47, performance
       finissant à 309, outils à 333, identiques sur les six premières. */
    expect(CARTE_CSS, "le lien ne grandit plus : le contenu se tasse à gauche et la colonne des chiffres se dérègle").toMatch(/\.cLien \{[^}]*flex: 1 1 auto;/);
    expect(CARTE_CSS, "les outils retournent coller au chiffre : on touche le « ··· » en voulant lire la performance").toMatch(/\.cOutils \{[^}]*margin-left: var\(--s-9\);/);
    expect(CARTE_CSS, "les outils ne doivent plus être tirés vers le contenu par une marge négative").not.toMatch(/\.cOutils \{[^}]*margin-right: calc\(-1/);
    /* VINGT-QUATRE DE CHAQUE CÔTÉ, pour que les chevrons du glissement aient
       leur voie : un chevron tient de 2 à 16 px du bord. */
    expect(CARTE_CSS, "la voie du chevron est reprise par le texte").toMatch(/\.compacte \{[^}]*padding: var\(--s-4\) calc\(var\(--s-9\) \+ var\(--s-4\)\);/);
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
