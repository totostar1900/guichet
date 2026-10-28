import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { buildGuideIndex } from "@/lib/guide-index";
import { getRegistry } from "@/lib/registry";
import { loadRegistry } from "@/lib/reference";
import { AGIR_PAGES, AIDE_PAGES, COMPTE_PAGES, INSTRUMENTS_PAGES, PORTEFEUILLE_PAGES } from "@/lib/nav-groups";
import { CATALOGUE } from "@/lib/domain/services";

/**
 * LA RECHERCHE CONNAÎT L'APPLICATION, ET NE LA MONTRE QU'À QUI EST ENTRÉ.
 *
 * Elle ne connaissait que le Guide : le glossaire, les éclairages, l'aide,
 * deux outils et huit pages écrites à la main. « prélèvement », « rachats du
 * Trésor », « provision », « sécurité » ne ramenaient rien, ou une définition
 * au lieu de l'endroit. Elle lit maintenant les tables que l'application tient
 * déjà — les pages des sièges, les cinq rubriques du compte, le catalogue des
 * services, les sections du marché, les types du référentiel.
 *
 * CE QUI PEUT SE PERDRE ICI, ET QUE RIEN NE SIGNALERAIT :
 *
 * 1. UNE TABLE QUI SORT DE L'INDEX. Ajouter une page à un siège est gratuit ;
 *    la retirer de la recherche l'est aussi, et personne ne s'en aperçoit —
 *    une recherche qui ne trouve pas ne lève aucune erreur. L'épreuve compte
 *    les tables, pas les entrées.
 *
 * 2. L'INDEX DU GUIDE PUBLIC QUI S'OUVRE SUR L'APPLICATION. `/info` se lit
 *    sans compte. Une entrée « Sécurité » ou « Prélèvement automatique » y
 *    mène à `/connexion`, c'est-à-dire à un mur : pire qu'une absence, puisque
 *    ça promet. C'est arrivé le 24 octobre 2026, le jour même où l'index a
 *    appris à lire les tables, et c'est pour cela que `app` existe.
 */
describe("ce que la recherche connaît", () => {
  const t = (s: string) => s;
  beforeAll(async () => {
    await loadRegistry();
  });

  it("donne au client une entrée par page, par service et par instrument", async () => {
    const { entries } = await buildGuideIndex(t, "fr", { app: true });
    const portes = new Set(entries.map((e) => e.href));
    const manquants = [...PORTEFEUILLE_PAGES, ...INSTRUMENTS_PAGES, ...AGIR_PAGES, ...AIDE_PAGES, ...COMPTE_PAGES]
      .filter((p) => !portes.has(p.href))
      .map((p) => `${p.key} (${p.href})`);
    /* Le prélèvement et la provision sont des pages ET des services : le
       service gagne, et garde la même adresse. L'absence se mesure donc sur
       l'adresse, pas sur le genre. */
    expect(manquants, "ces pages sont introuvables à la recherche").toEqual([]);

    const services = entries.filter((e) => e.kind === "service");
    expect(services.length, "le catalogue des services a quitté l'index").toBe(CATALOGUE.length);

    const types = getRegistry().types.filter((x) => x.enabled);
    const instruments = entries.filter((e) => e.kind === "instrument");
    expect(instruments.length, "les types du référentiel ont quitté l'index").toBe(types.length);
    /* Chacun mène à SA famille : sans le paramètre, huit instruments
       partageraient trois adresses, et le dédoublonnage en effacerait sept. */
    expect(new Set(instruments.map((e) => e.href)).size, "deux instruments mènent à la même liste non filtrée").toBe(types.length);

    /* Les sections d'une liste : c'est ce qu'on tape quand on cherche « rachats
       du Trésor » sans savoir que ça vit sous « Adjudications ». */
    expect(entries.some((e) => e.href.includes("#sec-")), "les sections du marché ont quitté l'index").toBe(true);
  });

  /**
   * UNE EXCEPTION, ET C'EST LE CONTRAIRE D'UN TROU : « Ouvrir un compte » est
   * la rubrique « Mes pièces » du compte ET une entrée que le guide public
   * écrit à la main depuis toujours. Elle demande aussi de se connecter, mais
   * elle mène à `/connexion?next=/ouvrir-un-compte`, c'est-à-dire au parcours
   * d'entrée lui-même : c'est l'entonnoir, pas le mur. Un visiteur qui tape
   * « ouvrir un compte » doit la trouver, et c'est tout l'objet du guide.
   */
  it("ne montre au visiteur aucune porte fermée", async () => {
    const { entries } = await buildGuideIndex(t, "fr");
    const fermees = [...AGIR_PAGES, ...COMPTE_PAGES].map((p) => p.href).filter((h) => h !== "/ouvrir-un-compte");
    const fuites = entries
      .filter((e) => fermees.includes(e.href) || e.kind === "service" || e.kind === "instrument" || /#sec-|\?r=|\?instrument=/.test(e.href))
      .map((e) => `${e.kind} · ${e.title} → ${e.href}`);
    expect(fuites, `le guide public mène un visiteur sans compte vers :\n  ${fuites.join("\n  ")}`).toEqual([]);
  });

  /**
   * LE DESK N'EST PAS UN CLIENT, ET « IL Y A UNE SESSION » NE LE DIT PAS.
   *
   * La route qui sert l'index aux feuilles a lu `Boolean(s)` pendant une
   * journée : un opérateur du desk recevait les 204 entrées du client — dix
   * services, huit instruments, « Qui vous êtes », « Sécurité » — sur un hôte
   * où aucune de ces adresses n'existe. L'épreuve lit la route, parce que la
   * décision est là et nulle part ailleurs.
   */
  it("mène à un réglage par ce qu'il contient, et non par le nom de sa page", async () => {
    /* RELEVÉ À L'ÉCRAN LE 28 OCTOBRE 2026 : « j'ai cherché la langue et je n'ai
       pas trouvé le réglage ». La page existait, elle était indexée, et elle
       répondait à « appareil » — un mot que personne ne tape pour changer de
       langue. Son nom disait la PORTÉE de deux de ses réglages ; son index
       répétait son nom.
       UNE RECHERCHE QUI NE TROUVE PAS NE LÈVE RIEN, et c'est pourquoi le trou
       a tenu : rien ne distingue « cette page n'existe pas » de « elle existe
       et ne porte pas vos mots ». */
    const { entries } = await buildGuideIndex(t, "fr", { app: true });
    const { rankEntries } = await import("@/app/info/InfoSearch");
    /* CHAQUE MOT DE CETTE LISTE EST PORTÉ PAR UNE PIÈCE DIFFÉRENTE, et c'est
       une mesure, pas une intention : « langue » vient de la phrase de la page,
       « settings » et « language » des synonymes, « anglais » et « relevés » des
       mots-clefs — eux seuls, puisque la page ne dit ni l'un ni l'autre d'elle
       même. Avant le 28 octobre, sur les neuf, DEUX répondaient. */
    for (const mot of ["langue", "language", "réglages", "settings", "thème", "notifications", "paramètres", "anglais", "relevés"]) {
      const rang = rankEntries(entries, mot).results.findIndex((r) => r.e.href === "/moi/appareil");
      expect(rang, `« ${mot} » ne mène pas aux paramétrages`).toBeGreaterThanOrEqual(0);
      expect(rang, `« ${mot} » les relègue derrière trois autres réponses`).toBeLessThan(3);
    }
    /* Non vacuité : un mot qui n'a rien à y faire n'y mène pas. Sans cette
       ligne, une page qui répondrait à TOUT passerait l'épreuve. */
    expect(rankEntries(entries, "coupon").results.some((r) => r.e.href === "/moi/appareil"), "les paramétrages répondent à n'importe quoi").toBe(false);
  });

  it("ne sert pas la navigation du client au desk", async () => {
    const route = readFileSync(join(process.cwd(), "src/app/api/guide-index/route.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(route, "la route sert l'application à toute session, desk compris").toMatch(/app:\s*Boolean\(s\)\s*&&\s*!isDesk\(s\)/);
  });

  /* Le défaut sûr : une page qui oublie l'option montre moins, jamais plus. */
  it("tient le guide public pour le défaut", async () => {
    const sans = await buildGuideIndex(t, "fr");
    const avec = await buildGuideIndex(t, "fr", { app: true });
    expect(sans.entries.length, "le défaut s'est mis à tout montrer").toBeLessThan(avec.entries.length);
  });

  /**
   * UN SEUL CHAMP, ET DONC UN SEUL CLASSEMENT AFFICHÉ.
   *
   * Il y avait trois rendus pour un classement : la page, la feuille du compte
   * et la barre du Guide. Les deux feuilles portaient la MÊME ligne, copiée :
   * un ternaire à quatre branches pour six genres, dont la dernière, « Aide »,
   * ramassait tout le reste. « Prélèvement automatique » s'étiquetait donc
   * « Aide » dans une feuille et « Service » sur la page.
   *
   * L'épreuve tient les deux bouts : personne ne rappelle `rankEntries` pour
   * s'en faire un rendu, et aucun fichier ne refabrique l'étiquette d'un genre
   * à coups de ternaire. La table des genres vit dans `InfoSearch`, une fois.
   */
  it("n'a qu'un rendu pour son classement", async () => {
    const { globSync } = await import("node:fs");
    const fichiers = globSync("src/**/*.{ts,tsx}", { cwd: process.cwd() }).filter((f) => !f.startsWith("src/test/"));
    const appelants = fichiers.filter((f) => /rankEntries\s*\(/.test(readFileSync(join(process.cwd(), f), "utf8")));
    expect(appelants, "un second rendu s'est remis à classer pour son compte").toEqual(["src/app/info/InfoSearch.tsx"]);

    /* `InfoSearch` lui-même tient le droit de regarder un genre : il pose la
       table des étiquettes, et traite la définition à part — une question
       appelle « Qu'est-ce que … ? » et montre le début de la phrase. Ce qu'on
       interdit, c'est de REFABRIQUER l'étiquette ailleurs. */
    const ternaires = fichiers
      .filter((f) => f !== "src/app/info/InfoSearch.tsx")
      .filter((f) => /kind === "(terme|lecon|outil)"\s*\?/.test(readFileSync(join(process.cwd(), f), "utf8")));
    expect(ternaires, "une étiquette de genre se refabrique à la main ; un genre de plus y retomberait sur « Aide »").toEqual([]);
  });

  /**
   * UN GENRE SANS ÉTIQUETTE EST UNE PASTILLE VIDE — la forme muette, celle qui
   * ne casse rien. « service » et « instrument » sont nés le 24 octobre 2026 ;
   * le troisième naîtra un autre jour.
   */
  it("nomme chaque genre qu'elle produit", async () => {
    const { entries } = await buildGuideIndex(t, "fr", { app: true });
    const src = readFileSync(join(process.cwd(), "src/app/info/InfoSearch.tsx"), "utf8");
    const map = src.slice(src.indexOf("const KIND"), src.indexOf("\n", src.indexOf("const KIND")));
    const sans = [...new Set(entries.map((e) => e.kind))].filter((k) => !new RegExp(`\\b${k}:`).test(map));
    expect(sans, "ces genres sortiraient avec une pastille vide").toEqual([]);
  });
});

/**
 * LE QUATRIÈME CHAMP : CELUI DE LA COLONNE, QUI NE CHERCHE PAS LA MÊME CHOSE.
 *
 * Les trois autres rendent le même composant sur le même index. Celui-ci est
 * d'une autre nature, et il le reste : il cherche des NOMS DE PAGE dans le
 * rail qu'on a sous les yeux, sans aller au serveur, en disant le groupe de
 * chaque résultat et en portant ses pastilles. Le fondre dans la recherche
 * entière lui ferait perdre les quatre.
 *
 * MAIS IL ÉTAIT UN CUL-DE-SAC, et c'est ce que ces épreuves tiennent. Au-delà
 * de 1040 px, la colonne l'emporte sur la loupe, qui disparaît : mesuré le
 * 24 octobre 2026, il n'existait alors AUCUN chemin vers la recherche entière
 * — zéro lien, zéro loupe visible — et « sécurité » répondait « aucune page de
 * ce nom » alors que la maison a une page « Sécurité » et cinq réponses d'aide
 * sur le sujet.
 */
describe("le champ de la colonne", () => {
  const source = () => readFileSync(join(process.cwd(), "src/components/Colonne.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  it("mène à la recherche entière, avec la question déjà tapée", () => {
    expect(source(), "le bureau n'a plus aucun chemin vers la recherche entière").toMatch(/href=\{`\/recherche\?q=\$\{encodeURIComponent\(/);
  });

  /**
   * LES DEUX FORMES RECONNUES MÈNENT AU DESK — un code d'émission vers le
   * tableau des adjudications, une date vers les bulletins. La colonne du
   * CLIENT les offrait aussi : une adresse qui n'existe pas sur son hôte, et
   * qu'il n'aurait pas le droit d'ouvrir. Dans l'autre sens, le pont vers
   * « /recherche » est une page du guichet, que le desk ne doit pas proposer.
   */
  it("ne propose à personne la maison d'en face", () => {
    const src = source();
    const formes = [...src.matchAll(/if \((.*?)(CODE_CEMAC|DATE_ISO)\.test/g)].map((m) => m[1]);
    expect(formes.length, "les deux formes reconnues ont changé de nom").toBe(2);
    expect(
      formes.filter((garde) => !garde.includes("auDesk")),
      "une forme du desk est proposée hors du desk",
    ).toEqual([]);
    expect(src, "le pont vers le guichet est proposé au desk").toMatch(/connecte && !auDesk/);
  });
});

/**
 * LA BARRE DE RECHERCHE NE BOUGE PAS PENDANT QU'ON TAPE DEDANS.
 *
 * RELEVÉ À L'ÉCRAN LE 28 OCTOBRE 2026 : « la barre de recherche monte et
 * descend avec la liste des résultats, et moins il y a de résultats plus elle
 * se cache derrière le clavier ».
 *
 * LE MÉCANISME. Sur téléphone, une feuille est collée EN BAS et sa hauteur
 * suit son contenu. Le champ étant en tête de feuille, deux résultats le
 * posaient à quelques centimètres du bord inférieur — c'est-à-dire sous le
 * clavier qu'on venait d'ouvrir pour taper dedans. Et comme chaque lettre
 * change le nombre de réponses, chaque lettre déplaçait le champ.
 *
 * LE REMÈDE EST UNE HAUTEUR QUI NE DÉPEND PAS DU CONTENU : « tall » prend
 * l'écran entier, le haut est fixe, le champ s'y pose une fois pour toutes et
 * seules les réponses défilent. La maison avait déjà écrit ce réglage pour la
 * feuille du compte, et pour une raison voisine.
 */
describe("la feuille de recherche, sur téléphone", () => {
  const source = () => readFileSync(join(process.cwd(), "src/components/mobile/BarreDuCompte.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

  it("a une hauteur que la liste des résultats ne commande pas", () => {
    /* On s'arrête à la feuille de recherche elle-même : « [^>]* » n'irait pas,
       puisqu'un « => » de rappel porte un chevron, et « (?!<Sheet) » empêche
       d'avaler la feuille voisine en chemin. */
    const feuille = /<Sheet(?:(?!<Sheet)[\s\S])*?title=\{t\("Rechercher"\)\}/.exec(source())?.[0] ?? "";
    expect(feuille.length, "la feuille de recherche est introuvable : le relevé ne mesure rien").toBeGreaterThan(40);
    expect(feuille, "la feuille de recherche respire avec ses résultats : le champ redescendra sous le clavier").toMatch(/\btall\b/);
  });

  it("et « tall » est bien ce qui fixe le haut", () => {
    /* Non vacuité : l'attribut ne vaut que par la règle qu'il appelle. Si la
       feuille de style cessait de donner une hauteur pleine, « tall » ne serait
       plus qu'un mot dans une balise. */
    const css = readFileSync(join(process.cwd(), "src/components/mobile/Sheet.module.css"), "utf8");
    expect(css).toMatch(/\.tall,\s*\n\s*\.tall\.sheetOpen \{[^}]*top: 0;[^}]*height: 100dvh;/);
  });
});
