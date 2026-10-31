import { describe, expect, it } from "vitest";
import fs from "node:fs";
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
    /* LES DEUX SOMMAIRES, ET NON « au moins un ». L'accueil en pose deux, et
       exiger « <Rubriques » laissait la clause verte le jour où l'un des deux
       redeviendrait une grille écrite à la main — c'est précisément la
       seconde grammaire que cette épreuve existe pour refuser. */
    expect((code("src/app/Console.tsx").match(/<Rubriques\b/g) ?? []).length, "l'accueil s'est réécrit une liste de destinations à la place d'un de ses deux sommaires").toBe(2);
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
  it("nomme les familles d'« Investir » par la table de navigation", () => {
    expect(code("src/app/Console.tsx"), "les familles ne viennent plus de la table de navigation : l'accueil peut en nommer une qui n'existe pas").toContain("INSTRUMENTS_PAGES.map");
  });

  /**
   * AUCUN INTITULÉ N'ANNONCE SON INVENTAIRE.
   *
   * DEMANDÉ LE 29 OCTOBRE 2026 : « ne plus annoncer le nombre de lignes ou de
   * services dans les intitulés ». Trois épreuves vivaient ici qui tenaient
   * l'INVERSE — elles exigeaient le compte, sa table de pluriels et son
   * garde-fou du zéro. Elles sont remplacées par celle-ci, et c'est le cœur
   * de l'affaire : une règle renversée doit l'être DANS L'ÉPREUVE, sans quoi
   * la suivante remet le chiffre en croyant réparer une régression.
   *
   * J'AVAIS GARDÉ UNE EXCEPTION, ET ELLE A ÉTÉ ÉCARTÉE LE JOUR MÊME.
   * L'épreuve distinguait un compte de CATALOGUE (« 45 lignes ») d'un compte
   * de GESTES (« 2 au desk », « 1 en place »), et n'interdisait que le
   * premier, au motif que le second parle au lecteur de lui-même. La
   * distinction est juste pour qui écrit le code et sans effet pour qui lit
   * l'écran : le lecteur ne sait pas d'où vient le nombre, il voit un chiffre
   * dans un intitulé. Une règle qui exige du lecteur qu'il connaisse
   * l'origine du nombre pour l'accepter n'est pas une règle, c'est une
   * préférence d'auteur.
   *
   * AUCUN COMPTE, DONC, DANS AUCUN INTITULÉ. Ce qui reste est ce qui n'est
   * pas un nombre : « à signer » sur un mandat — un devoir, pas une
   * quantité — et la PRÉSENCE MÊME de la rubrique, qui ne paraît que s'il y
   * a quelque chose. Zéro ne s'écrit pas ; un ne se compte plus.
   */
  it("n'annonce le nombre ni des lignes, ni des fonds, ni des séances", () => {
    const surfaces = ["src/app/Console.tsx", "src/components/NavTabs.tsx", "src/app/layout.tsx"];
    /* LES LIBELLÉS ENTIERS, ET NON LES MOTS QU'ILS CONTIENNENT. Un intitulé
       est une chaîne qui ne dit QUE le compte : « {n} lignes ». La page écrit
       par ailleurs « {n} lignes sont tenues sans cours publié… », qui est une
       phrase, qui explique pourquoi un total en exclut, et qui parle des
       titres du lecteur — la viser aurait rendu l'épreuve bruyante et, le
       jour où elle gêne, on l'aurait assouplie au lieu de la lire.
       « comptesParLieu » est dans la liste parce que c'est la fonction qui
       nourrissait ces libellés : rebrancher la lecture est le premier geste
       de qui veut remettre le chiffre. */
    const INTERDITS = [/"\{n\} lignes"/, /"\{n\} fonds"/, /"\{n\} séances"/, /"1 ligne"/, /"1 fonds"/, /"1 séance"/, /comptesParLieu/];
    const fautes: string[] = [];
    for (const f of surfaces) {
      const src = code(f);
      for (const motif of INTERDITS) if (motif.test(src)) fautes.push(`${f} : ${motif.source}`);
    }
    expect(fautes, "un intitulé annonce de nouveau combien il contient :\n  " + fautes.join("\n  ")).toEqual([]);
  });

  it("ne garde pas la lecture qui ne servait qu'à compter", () => {
    /* LE CHIFFRE PART, LA REQUÊTE AUSSI. « countOffers » lisait toutes les
       offres à chaque rendu de chaque page pour trois nombres dans un menu,
       et « listWatches » était lu par l'accueil pour le seul compte des
       lignes suivies. Une épreuve qui ne garderait que le texte laisserait
       le coût en place, prêt à reservir au prochain qui veut un chiffre. */
    expect(code("src/app/layout.tsx"), "le gabarit relit toutes les offres à chaque page : cette lecture ne servait qu'au compte du menu").not.toMatch(/countOffers/);
    expect(code("src/app/Console.tsx"), "l'accueil relit les veilles : elles ne servaient qu'au compte des lignes suivies").not.toMatch(/listWatches/);
  });

  it("n'annonce plus le nombre des gestes du client non plus", () => {
    /* LES DEUX ÉTIQUETTES QUE J'AVAIS PLAIDÉ DE GARDER, nommées pour qu'on
       sache ce qui a été tranché et ne pas le rejouer : « 2 au desk » sur les
       intentions du sondage, « 2 en place » sur les rayons des services. Les
       rayons étaient rendus par DEUX surfaces — l'écran large et la tuile
       du téléphone — et un texte retiré d'une seule revenait par l'autre.
       Depuis le 31 octobre 2026 il n'y a plus qu'une surface, « Tuiles », et
       c'est elle qu'on relève : le motif reste, parce qu'un compte dans un
       intitulé est ce qui revient, pas le fichier qui le porte. */
    const fautes: string[] = [];
    for (const [f, motifs] of [
      ["src/app/Console.tsx", [/"\{n\} au desk"/, /"1 au desk"/]],
      ["src/app/trader/Tuiles.tsx", [/"\{n\} en place"/, /"1 en place"/]],
    ] as const) {
      const src = code(f);
      for (const m of motifs) if (m.test(src)) fautes.push(`${f} : ${m.source}`);
    }
    expect(fautes, "un intitulé recompte les gestes du client :\n  " + fautes.join("\n  ")).toEqual([]);
  });

  it("garde ce qui n'est pas un nombre, et la condition qui fait paraître la rubrique", () => {
    /* SANS CETTE LIGNE L'ÉPREUVE AU-DESSUS SE SATISFERAIT D'UN ÉCRAN MUET.
       « à signer » est un DEVOIR, pas une quantité, et c'est la seule chose
       que cette rubrique avait à dire. Et la rubrique du sondage ne paraît
       que s'il y a quelque chose : c'est la condition, et non le chiffre, qui
       porte l'information maintenant. */
    const src = code("src/app/Console.tsx");
    expect(src, "« à signer » a disparu du mandat : le seul devoir que la rubrique portait").toContain('t("à signer")');
    expect(src, "la rubrique du sondage paraît même sans intention : son compte parti, c'est sa condition qui informe").toMatch(/ctx\.attentesSondees > 0/);
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
