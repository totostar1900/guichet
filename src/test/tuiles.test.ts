import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { translatable } from "@/i18n/core";
import { AIDE_PAGES, COMPTE_PAGES, INSTRUMENTS_PAGES, MARCHE_PAGES, PORTEFEUILLE_PAGES, type NavPage } from "@/lib/nav-groups";

/**
 * LES MOTS DES TABLES NE PASSENT PAS PAR UN LITTÉRAL.
 *
 * Le nom, le nom court, les trois mots de la tuile et la phrase vivent dans
 * une table et traversent t() sous forme de variable : le scanner de clefs ne
 * les voit pas, et une entrée manquante laisse du français dans une interface
 * anglaise sans que rien n'échoue. C'est le premier des trois angles morts, et
 * il a déjà coûté.
 *
 * La question posée est une couverture et non une ressemblance : « le
 * dictionnaire connaît-il cette clef » est un fait.
 */
const TOUTES: NavPage[] = [...PORTEFEUILLE_PAGES, ...INSTRUMENTS_PAGES, ...MARCHE_PAGES];
/**
 * LES CINQ RUBRIQUES DU COMPTE ET LES QUATRE DE L'AIDE SONT DES TABLES AUSSI,
 * et l'angle mort y est le même : les mots traversent t() en variable.
 *
 * Elles n'étaient pas couvertes, parce qu'elles sont nées après cette épreuve
 * — et le jour où elles sont entrées, quatre phrases du siège « Aide »
 * sortaient en français dans l'interface anglaise. Elles ne vont pas dans
 * `TOUTES` : cette liste-là sert aussi à exiger une icône de tuile, et ces
 * neuf pages ne sont pas dans la grille du dock.
 */
const TOUS_LES_MOTS: NavPage[] = [...TOUTES, ...COMPTE_PAGES, ...AIDE_PAGES];

describe("les mots de la navigation, en anglais", () => {
  it("couvre le nom, le nom court, la tuile et la phrase de chaque page", () => {
    const manquants: string[] = [];
    for (const p of TOUS_LES_MOTS) {
      for (const [champ, texte] of [
        ["label", p.label],
        ["short", p.short],
        ["tuile", p.tuile],
        ["hint", p.hint],
      ] as const) {
        if (texte && !translatable(texte)) manquants.push(`${p.key}.${champ} : « ${texte} »`);
      }
    }
    expect(manquants, `à traduire dans src/i18n :\n${manquants.join("\n")}`).toEqual([]);
  });

  /**
   * LES TROIS MOTS NE S'AFFICHENT PLUS DANS LES FEUILLES DU DOCK, décision du
   * 5 octobre 2026 : à 80 px de cadre et 1,05 rem de nom, la silhouette et le
   * nom portent la tuile, et neuf phrases à lire pour choisir une destination
   * étaient neuf de trop. Les mots restent dans la table, où la feuille du
   * compte et d'autres surfaces peuvent les reprendre ; ils ne sont donc plus
   * exigés, mais s'ils existent ils tiennent en trois ou quatre mots.
   */
  it("garde des mots courts, là où une table en porte", () => {
    for (const p of TOUS_LES_MOTS) {
      if (!p.tuile) continue;
      expect(p.tuile.length, `${p.key} : « ${p.tuile} » est une phrase`).toBeLessThanOrEqual(36);
    }
  });

  /**
   * NI SOUS-TITRE NI CHIFFRE SOUS LE NOM. Les trois mots sont partis le matin
   * du 5 octobre 2026, le chiffre des listes d'achat l'après-midi : la tuile
   * est une silhouette et un nom, et chaque étage de texte rendu sous l'icône
   * ramène la rangée pleine largeur que la grille a remplacée. Le chiffre vit
   * toujours dans le menu large, à côté du nom de sa page.
   */
  it("ne pose ni sous-titre ni chiffre dans la feuille du dock", () => {
    const shell = readFileSync(join(process.cwd(), "src/components/mobile/MobileShell.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(shell, "la feuille du dock ne passe plus de sous-titre à ses tuiles").not.toMatch(/mots:/);
    expect(shell, "la feuille du dock ne passe plus de chiffre à ses tuiles").not.toMatch(/compte:/);
  });

  /* Et la grille elle-meme n a plus de quoi en afficher un : la prop retiree
     d un seul appelant se rebranche trop facilement. */
  it("n'a plus de chiffre à afficher dans la grille", () => {
    const grille = readFileSync(join(process.cwd(), "src/components/nav/Tuiles.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(grille, "la tuile ne porte plus de compte").not.toMatch(/compte/);
  });
});

/**
 * LA TUILE SANS DESSIN EST UNE PANNE MUETTE.
 *
 * Une clef absente de la table des icônes ne casse rien : le cadre reste, vide,
 * et la grille continue de se rendre. C'est la forme la plus coûteuse de
 * défaut dans ce dépôt, celle qui ne se signale pas, et une page ajoutée à un
 * siège est exactement le moment où elle arrive.
 */
describe("les tuiles du dock", () => {
  it("donne une icône à chaque page des trois sièges", async () => {
    const { ICONE_PAGE } = await import("@/components/nav/IconesPages");
    const sans = TOUTES.filter((p) => !ICONE_PAGE[p.key]).map((p) => p.key);
    expect(sans, "ces pages afficheraient un cadre vide").toEqual([]);
  });
});

/**
 * LA FEUILLE EST DEVENUE CINQ PAGES, LE 24 OCTOBRE 2026.
 *
 * Elle portait onze blocs derrière l'initiale : une recherche, le statut, le
 * nom et la ville, les deux canaux, huit tuiles de destination, les
 * rejouables, le contact, les couleurs, quatre réglages, deux sorties et un
 * pied légal. Six de ces onze étaient de la navigation qui avait trouvé sa
 * porte ailleurs dans la semaine ; le pied légal était la troisième copie de
 * celui de la page.
 *
 * CE QUE CE DÉMÉNAGEMENT PEUT PERDRE, ET QUE RIEN NE SIGNALERAIT. Déplacer
 * onze blocs vers cinq pages est exactement le geste qui en laisse tomber un :
 * le composant reste importé quelque part, personne ne le rend, et le réglage
 * n'existe plus sans qu'aucune épreuve ne tombe. Ces épreuves tiennent donc
 * l'INVENTAIRE : chaque chose que la feuille portait est nommée avec l'adresse
 * où elle vit maintenant.
 *
 * L'ANCIENNE ÉPREUVE EXIGEAIT L'INVERSE — que tout soit DANS la feuille — et
 * c'est pour cela qu'elle est réécrite et non supprimée : la question qu'elle
 * posait reste la bonne, c'est la réponse qui a changé d'adresse.
 */
describe("le compte en pages", () => {
  const lire = (p: string) => readFileSync(join(process.cwd(), p), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  /* Le CORPS, pas les imports : un composant importé puis jamais rendu est
     exactement la façon dont un réglage disparaît sans bruit. */
  const corps = (p: string, apres: string) => {
    const s = lire(p);
    const i = s.indexOf(apres);
    expect(i, `${p} : « ${apres} » a changé de nom`).toBeGreaterThan(-1);
    return s.slice(i);
  };

  it("mène au sommaire du compte depuis la barre, et plus à un tiroir", () => {
    const barre = lire("src/components/mobile/BarreDuCompte.tsx");
    expect(barre, "l'initiale n'est plus un lien vers le sommaire").toMatch(/href="\/moi\/compte"/);
    /* La loupe est la seule chose que la feuille garde : une recherche se fait
       là où l'on est, et sur un téléphone la barre du haut n'a pas la largeur
       d'un champ. */
    expect(barre, "la recherche n'a plus de porte sur téléphone").toContain("MenuRecherche");
  });

  /**
   * LES CINQ ADRESSES ONT QUITTÉ LA PAGE POUR UNE TABLE, et c'est la bonne
   * direction : écrites dans le sommaire et nulle part ailleurs, aucune table
   * ne les citait, et la recherche ne trouvait donc pas « Sécurité ».
   *
   * L'épreuve suit le déménagement plutôt que de l'interdire. Elle demande
   * deux choses : que les cinq adresses soient dans `COMPTE_PAGES`, et que le
   * sommaire LISE cette table au lieu de recopier sa liste. Vérifier la seule
   * table laisserait une page libre d'en afficher quatre.
   */
  it("donne une adresse à chacune des cinq rubriques", () => {
    const sommaire = lire("src/app/moi/compte/page.tsx");
    expect(sommaire, "le sommaire du compte a réécrit sa propre liste").toContain("COMPTE_PAGES.map");
    const portes = COMPTE_PAGES.map((p) => p.href);
    expect(portes, "une rubrique a quitté la table du compte").toEqual(["/moi/identite", "/ouvrir-un-compte", "/moi/profil", "/moi/securite", "/moi/appareil"]);
  });

  /**
   * L'INVENTAIRE DU DÉMÉNAGEMENT : ce que la feuille portait, et où c'est.
   *
   * Trois choses n'ont pas d'adresse dans cette table, et c'est écrit plutôt
   * que passé sous silence : le pied légal (`MenuPied`) vit au pied de chaque
   * page, les deux canaux sont en lecture sur « Qui vous êtes » et se prouvent
   * sur « Sécurité », et les huit tuiles sont devenues cinq rubriques et le
   * siège « Aide ».
   */
  it("garde tout ce que la feuille portait, chacun à son adresse", () => {
    const inventaire: [string, string, string][] = [
      ["identityAction", "src/app/moi/identite/Identite.tsx", "export function Identite"],
      ["securite#canaux", "src/app/moi/identite/Identite.tsx", "export function Identite"],
      ["PushToggle", "src/app/moi/appareil/Appareil.tsx", "export function Appareil"],
      ["PaletteSwitch", "src/app/moi/appareil/Appareil.tsx", "export function Appareil"],
      ["LangSwitch", "src/app/moi/appareil/Appareil.tsx", "export function Appareil"],
      ["statementsByEmail", "src/app/moi/appareil/Appareil.tsx", "export function Appareil"],
      ["reach", "src/app/moi/appareil/Appareil.tsx", "export function Appareil"],
      ["logoutEverywhere", "src/app/moi/compte/Deconnexion.tsx", "export function Deconnexion"],
      ["MenuRejouables", "src/app/aide/page.tsx", "export default"],
      ["MenuRecherche", "src/components/mobile/BarreDuCompte.tsx", "export function BarreDuCompte"],
    ];
    for (const [quoi, fichier, depuis] of inventaire) {
      expect(corps(fichier, depuis), `${quoi} a disparu du déménagement`).toContain(quoi);
    }
  });

  /**
   * UNE SEULE PORTE PAR AUDIENCE. Le « ⋮ » et l'initiale ouvraient deux
   * feuilles qui disaient la même chose : 2 433 px pour neuf pages, cinq
   * destinations écrites deux fois. Le bouton a donc disparu pour le client
   * connecté le 5 octobre 2026, puis POUR LE VISITEUR le 12 octobre : il y
   * cachait la langue et le contact, c est-à-dire exactement ce qu un
   * visiteur cherche, et ces deux-là sont ressortis nommés au pied de page.
   * Il ne reste qu au desk, qui a ses deux onglets. Le jour où il revient
   * pour quelqu un d autre, le doublon revient avec lui.
   */
  it("ne laisse qu'une porte par audience", () => {
    const menu = readFileSync(join(process.cwd(), "src/components/AppMenu.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(menu, "le « ⋮ » reparaît ailleurs que chez le desk").toMatch(/if \(!desk\) return null;/);
  });

  /**
   * LE SIÈGE « AIDE » ET LE RAIL LISENT LA MÊME TABLE.
   *
   * La page écrivait ses quatre rubriques à la main pendant que le rail de
   * l'écran large lisait `AIDE_PAGES` : deux listes de la même chose, qui ont
   * divergé le jour même — la page portait « Questions courantes » et
   * « Risques », le rail non. C'est mot pour mot la leçon que la table de la
   * colonne porte en tête, et cette épreuve-ci la tient pour le siège.
   */
  it("fait lire la même table au siège et au rail", () => {
    const page = lire("src/app/aide/page.tsx");
    expect(page, "le siège « Aide » a réécrit sa propre liste").toContain("AIDE_PAGES.map");
    /* Les mentions sont la seule ligne en dur, et pour une raison écrite dans
       la page : elles se lisent une fois et vivent au pied. */
    expect(page, "les mentions ont quitté le siège").toContain('/info/mentions"');
  });

  /* L'état du dossier traverse t() en variable : le scanner de clefs ne le
     voit pas, et une entrée manquante laisserait du français dans une
     interface anglaise sans que rien n'échoue. Il vit maintenant au sommaire
     du compte, sous « Mes pièces ». */
  it("traduit l'état du dossier d'ouverture", () => {
    const sommaire = lire("src/app/moi/compte/page.tsx");
    const etats = [...sommaire.matchAll(/t\("(approuvé|dossier [^"]+)"\)/g)].map((m) => m[1]);
    expect(etats.length, "le sommaire ne dit plus où en est le dossier").toBeGreaterThan(0);
    expect(
      etats.filter((e) => !translatable(e)),
      "à traduire dans src/i18n",
    ).toEqual([]);
  });
});
