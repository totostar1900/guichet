import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

/**
 * L'ÉTALON D'UNE PAGE, TENU PAR DEUX MESURES.
 *
 * Relevé du 24 octobre 2026 sur treize pages du guichet, à 390, 900 et
 * 1440 px (ETALON.md porte le tableau complet). Les deux divergences gravées
 * ici ne cassent aucun rendu en revenant : elles déplacent, et c'est
 * exactement ce que personne ne remarque.
 *
 *   UNE SEULE GOUTTIÈRE. Le gabarit pose la marge latérale ; six coquilles de
 *   page en ajoutaient une seconde par-dessus. Les pages à boîte commençaient
 *   donc à 30 px du bord et les autres à 14, aux trois largeurs (30/14,
 *   36/20, 410/394).
 *
 *   UNE SEULE TAILLE DE TITRE. Sept cohabitaient, de 16 à 30 px. Celle de
 *   « /titres » valait 16, plus petit que le corps de lecture, parce que son
 *   titre était une phrase de cinquante-quatre signes. Et les cinq pages qui
 *   titraient à 30 ne l'avaient pas décidé : c'est le « 2em » du navigateur
 *   sur une racine à 15 px.
 *
 * DEUX MONDES SONT HORS PÉRIMÈTRE, et c'est écrit plutôt que supposé. La
 * console du desk est dense par métier et titre à 1,3 rem. La vitrine
 * publique a son propre pas, « le seul au-dessus de l'échelle », déclaré tel
 * quel dans globals.css : une page qui vend respire plus large qu'une page
 * qui travaille.
 */
const COQUILLES = [
  "src/components/Feuillet.module.css",
  "src/app/ouvrir-un-compte/convention/page.module.css",
  "src/app/moi/textes/page.module.css",
  "src/app/moi/tarifs/page.module.css",
  "src/app/moi/documents/page.module.css",
  "src/app/moi/performance/page.module.css",
];

/** La classe qui porte la coquille, et elle seule : une bande a le droit d'avoir une marge intérieure. */
const blocDeLaCoquille = (css: string): string => {
  const m = css.match(/\.(page|feuille|head|tete)\s*\{([^}]*)\}/);
  return m ? m[2] : "";
};

const feuillesDuGuichet = (): string[] => {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === "desk") continue;
        walk(p);
      } else if (e.name.endsWith(".module.css")) out.push(p);
    }
  };
  walk(path.join(ROOT, "src/app"));
  walk(path.join(ROOT, "src/components"));
  /* LA VITRINE A SON PAS, déclaré dans globals.css : « le pas du site public,
     et le seul au-dessus de l'échelle ». Une page qui vend respire plus large
     qu'une page qui travaille, et ces trois-là ne sont pas des pages de
     travail. Les autres pages signées — sociétés, actualités, offres, dossier
     — ne sont PAS exclues : elles sont simplement en attente de conversion, et
     c'est ce que le cliquet compte. */
  const vitrine = [
    "Accueil.module.css",
    `a-propos${path.sep}page.module.css`,
    `placements${path.sep}page.module.css`,
    /* L'aperçu d'une ligne partagée ne se rend QUE pour un visiteur sans
       session (« if (!session) return <ApercuPartage …> ») : c'est la page
       qu'on reçoit par WhatsApp, elle vend, elle respire plus large. */
    "ApercuPartage.module.css",
  ];
  return out.filter((p) => !p.includes(`${path.sep}desk${path.sep}`) && !vitrine.some((v) => p.endsWith(v)));
};

/**
 * Les titres de page qui ne suivent pas le jeton.
 *
 * CE QUE CETTE MESURE VOIT, ET CE QU'ELLE NE VOIT PAS. Elle lit des
 * DÉCLARATIONS — « un bloc dont le sélecteur finit par h1 pose telle
 * taille » —, pas des valeurs calculées : un vitest n'a pas de navigateur.
 * Une taille posée par une CLASSE que le titre porte lui échappe donc.
 *
 * Un cas connu, relevé au navigateur le 24 octobre 2026 : la fiche d'une
 * offre délègue son titre au composant `LineIdentity`, dont « .xl .title »
 * vaut 1,3 rem et l'emporte par spécificité (0,2,0 contre 0,0,1). Ce n'est
 * pas une page qui invente sa taille, c'est un composant d'identité réemployé
 * à plusieurs échelles — le forcer au jeton le changerait partout où une ligne
 * se présente. Il est donc laissé tel quel, et la limite de la mesure est
 * écrite ici plutôt que découverte un jour comme un trou.
 */
const titresHorsJeton = (): string[] => {
  const hors: string[] = [];
  for (const p of feuillesDuGuichet()) {
    const css = fs.readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    /* LA PEAU D'UN DOCUMENT N'EST PAS UNE COQUILLE DE PAGE. « .doc h1 » coiffe
       le titre d'un document RENDU — une page d'aide, une note du desk — et
       suit la grammaire d'un article, pas celle d'une page de l'application.
       Elle est d'ailleurs partagée avec la documentation du desk. */
    if (p.endsWith(`docs${path.sep}Document.module.css`)) continue;
    for (const m of css.matchAll(/([^{}]*\bh1)\s*\{([^}]*)\}/g)) {
      const taille = m[2].match(/font-size:\s*([^;]+);/);
      if (taille && taille[1].trim() !== "var(--t-8)") hors.push(`${path.relative(ROOT, p)} : « ${m[1].trim()} » pose ${taille[1].trim()}`);
    }
  }
  return hors.sort();
};

describe("l'étalon d'une page", () => {
  it("ne laisse aucune coquille poser une seconde marge latérale", () => {
    const fautives: string[] = [];
    for (const rel of COQUILLES) {
      const css = fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      const bloc = blocDeLaCoquille(css);
      expect(bloc, `${rel} : la coquille est introuvable`).not.toBe("");
      for (const m of bloc.matchAll(/padding(-inline|-left|-right)?:\s*([^;]+);/g)) {
        if (m[1] !== undefined || m[2].trim().split(/\s+/).length > 1) fautives.push(`${rel} : « ${m[0].trim()} »`);
      }
    }
    expect(fautives, `la marge latérale appartient au gabarit :\n  ${fautives.join("\n  ")}`).toEqual([]);
  });

  /**
   * LE CLIQUET A TOUCHÉ LE FOND, ET DEVIENT UNE RÈGLE.
   *
   * Il a été gravé à vingt le 24 octobre 2026, le temps d'une conversion page
   * par page, puis à zéro le même jour : plus un seul titre de page du
   * guichet n'invente sa taille. Ce qui était un plafond à faire descendre est
   * maintenant une interdiction, et c'est ce qu'un cliquet sert à atteindre.
   *
   * Une page qui a vraiment besoin d'autre chose ne contourne pas la règle :
   * elle s'écrit dans les exclusions, avec sa raison, comme la vitrine et la
   * peau d'un document.
   */
  it("ne laisse aucun titre de page inventer sa taille", () => {
    const hors = titresHorsJeton();
    expect(hors, `un titre de page hors du jeton :\n  ${hors.join("\n  ")}`).toEqual([]);
  });

  it("tient le jeton, et regarde bien quelque chose", () => {
    expect(feuillesDuGuichet().length).toBeGreaterThan(30);
    expect(fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8")).toMatch(/--t-8:\s*2rem/);
    /* La règle commune : une page qui ne dit rien titre au jeton. */
    expect(fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8")).toMatch(/h1\s*\{\s*font-size:\s*var\(--t-8\)/);
  });
});

/**
 * LES DEUX ARBITRAGES D'ETALON.MD, TRANCHÉS LE 24 OCTOBRE 2026.
 *
 * A — LE NOM N'EST ÉCRIT QU'UNE FOIS À L'ÉCRAN. La barre du téléphone portait
 * le nom de la page et la page le répétait trois cents pixels plus bas. La
 * barre cède tant que le `h1` est visible et le reprend dès qu'il passe SOUS
 * elle : le repère réapparaît au moment exact où l'autre disparaît.
 *
 * B — UN ÉCART, ÉCRIT UNE FOIS. Les quarante pixels entre deux bandes étaient
 * composés en deux endroits — vingt de `gap` au conteneur, vingt de
 * `margin-top` au rayon. Deux pages l'avaient relevé et s'en accommodaient
 * (« les deux font les quarante qu'on veut »), ce qui dit le défaut : changer
 * un écart demandait de lire deux fichiers et de faire une addition. Le rayon
 * ne porte plus de marge ; le nombre vit dans le `gap`, seul.
 */
describe("les deux arbitrages", () => {
  const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

  it("fait céder la barre tant que la page porte son nom", () => {
    const shell = lire("src/components/mobile/MobileShell.tsx").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(shell, "la barre ne regarde plus le titre de la page").toMatch(/IntersectionObserver/);
    expect(shell, "elle ne regarde pas le titre, mais autre chose").toMatch(/querySelector\("main h1"\)/);
    expect(shell, "la barre ne cède plus la place").toMatch(/styles\.titleCede/);
    /* Sans la marge négative, le titre serait réputé visible alors qu'il est
       déjà caché derrière la barre, qui recouvre le contenu. */
    expect(shell, "la hauteur de la barre n'entre plus dans le calcul").toMatch(/--bar-h/);
  });

  it("n'écrit l'écart entre bandes qu'à un seul endroit", () => {
    const pli = lire("src/components/Pli.module.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const rayon = pli.match(/\.rayon\s*\{([^}]*)\}/);
    expect(rayon, "le rayon a changé de nom").not.toBeNull();
    expect(rayon?.[1].replace(/\s/g, ""), "le rayon reprend une marge haute : l'écart se compose de nouveau en deux endroits").toContain("margin-top:0");

    const porteurs = [
      "src/app/trader/page.module.css",
      "src/app/moi/reinvestir/page.module.css",
      "src/app/moi/epargne/page.module.css",
      "src/app/moi/documents/page.module.css",
    ];
    const hors = porteurs.filter((p) => !lire(p).includes("gap: var(--s-10)"));
    expect(hors, "ces pages n'écartent plus leurs bandes de l'écart de l'étalon").toEqual([]);
  });
});

/**
 * L'EN-TÊTE D'UNE PAGE VIENT D'UN SEUL ENDROIT.
 *
 * Relevé du 24 octobre 2026 : le créneau qui précède le titre portait TROIS
 * choses différentes — un sur-titre de catégorie, un fil d'Ariane, un lien de
 * retour — et il était vide sur six pages sur treize. Trois grammaires pour un
 * seul emplacement : le lecteur ne peut rien y apprendre, puisque ce qu'il y
 * trouve change de nature d'une page à l'autre.
 *
 * « EnTete » pose les quatre créneaux dans l'ordre, et un seul genre par
 * créneau. La conversion se fait page par page ; le cliquet est là pour
 * qu'elle ne recule pas entre deux lots, comme celui des titres l'a été
 * jusqu'à toucher le fond.
 *
 * ─── LE CLIQUET NE POUVAIT PAS TOUCHER LE FOND ────────────────────────────
 *
 * Relevé du 24 octobre 2026 au soir : il comptait 38, puis 27, et parmi ces
 * 27 il y avait `EnTete.tsx` LUI-MÊME — le composant qui écrit le `h1` était
 * compté comme une page qui ne l'avait pas converti. Il y avait aussi les
 * quatre pages de la vitrine, qui ne convertiront jamais par décision (voir
 * ETALON.md § C), le « Bonjour » de la console, qui n'est pas un nom de page,
 * et trois écrans de seuil qui n'ont ni section au-dessus ni parent derrière.
 *
 * UN CLIQUET QUI MÉLANGE « pas encore fait » ET « ne sera jamais fait »
 * N'ATTEINT JAMAIS ZÉRO, et un compte qui ne peut pas tomber à zéro n'apprend
 * plus rien à celui qui le regarde : il ne dit pas s'il reste du travail.
 *
 * D'OÙ DEUX MESURES, ET NON UNE. Les dispenses sont NOMMÉES, chacune avec sa
 * raison — c'est la forme qu'a prise la règle de la fonte, pour le motif que
 * l'ETALON écrit en toutes lettres : *« un compte dirait combien de fichiers
 * posent la fonte, pas lesquels ont le droit »*. Le cliquet, lui, ne porte
 * plus que ce qui attend d'être converti, et celui-là peut finir.
 *
 * ET UNE DISPENSE SE VÉRIFIE AUSSI. Une page convertie, renommée ou
 * supprimée laisserait derrière elle une dispense qui ne vise plus rien :
 * elle passerait tous les jours sans que personne la relise.
 */
const SANS_ENTETE: Record<string, string> = {
  "src/components/EnTete.tsx": "l'en-tête lui-même : c'est lui qui écrit ce « h1 », et se compter revenait à ne jamais pouvoir finir",
  /* La vitrine, nommée une par une dans ETALON.md § C : « la vitrine respire,
     l'application travaille ». Elle garde son serif et son échelle, et ses
     titres sont des phrases — « La porte d'entrée des marchés financiers
     d'Afrique centrale » n'est pas le nom d'une page. */
  "src/app/Accueil.tsx": "la vitrine (ETALON § C) : serif, échelle fluide, et un titre qui est une phrase",
  "src/app/a-propos/page.tsx": "la vitrine (ETALON § C)",
  "src/app/placements/page.tsx": "la vitrine (ETALON § C)",
  "src/app/offres/[id]/ApercuPartage.tsx": "la vitrine (ETALON § C) : la page que voit celui à qui on partage une ligne",
  /* Un nom de page, ou autre chose qui s'écrit gros. */
  "src/app/Console.tsx": "« Bonjour {p} » est une salutation, pas le nom de la page : la racine est nommée par son siège au dock",
  /* LES ÉCRANS DE SEUIL. Ni section au-dessus — on n'est pas encore dans
     l'application —, ni parent derrière, et leur titre nomme l'ÉTAPE en
     cours, pas la page : les trois sont une carte centrée, pas un en-tête de
     page. */
  "src/app/connexion/page.tsx": "un écran de seuil : carte centrée, pas de section ni de parent, et le titre nomme l'étape",
  "src/app/connexion/mfa/page.tsx": "un écran de seuil : carte centrée, pas de section ni de parent",
  "src/app/ne-plus-recevoir/page.tsx": "une carte de confirmation atteinte par un lien de courriel : « C'est fait. » est une réponse, pas un nom de page",
  /* UN DOCUMENT PUBLIÉ, ET NON UNE PAGE DE L'APPLICATION. La note
     trimestrielle est un « article » avec son propre bandeau — filet navy de
     trois pixels, maison et numéro de parution —, un titre sur une échelle
     FLUIDE hors de « --t-8 », un chapô et une signature. C'est la grammaire
     d'une publication qu'on lit et qu'on partage, celle que le § C de
     l'ETALON range du côté qui respire. Lui imposer l'en-tête de
     l'application l'aplatirait en écran. */
  "src/app/indice/note/[trimestre]/page.tsx": "une note de marché publiée : bandeau, titre sur une échelle fluide, chapô et signature — un document, pas une page",
};
const entetesALaMain = (): string[] => {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === "desk") continue;
        walk(p);
      } else if (e.name.endsWith(".tsx")) {
        const s = fs.readFileSync(p, "utf8");
        /* Une page qui monte « EnTete » a converti son en-tête ; celle qui
           écrit encore « <h1 » elle-même ne l'a pas fait. */
        if (/<h1\b/.test(s) && !s.includes("<EnTete")) out.push(path.relative(ROOT, p));
      }
    }
  };
  walk(path.join(ROOT, "src/app"));
  walk(path.join(ROOT, "src/components"));
  return out.sort();
};

describe("l'en-tête d'une page", () => {
  /* LA LISTE BLANCHE D'ABORD, parce qu'elle décide de ce que le cliquet
     compte. Une dispense qui ne vise plus de fichier — page convertie,
     renommée, supprimée — abaisserait le reste sans que personne le sache. */
  it("ne garde que des dispenses qui visent encore une page, et chacune avec sa raison", () => {
    const tous = entetesALaMain();
    const fantomes = Object.keys(SANS_ENTETE).filter((f) => !tous.includes(f));
    expect(fantomes, `ces dispenses ne visent plus rien : la page a été convertie, renommée ou supprimée, et la dispense doit partir avec elle\n  ${fantomes.join("\n  ")}`).toEqual([]);
    const muettes = Object.entries(SANS_ENTETE).filter(([, r]) => r.trim().length < 20);
    expect(muettes.map(([f]) => f), "une dispense sans raison lisible n'est pas une décision, c'est un oubli").toEqual([]);
  });

  it("ne laisse pas les en-têtes qui restent à convertir se multiplier", () => {
    /* ZÉRO, ATTEINT LE 24 OCTOBRE 2026 AU SOIR. Quarante-neuf au matin, 38,
       27, 18, puis plus rien : toute page de l'application monte « EnTete »,
       et les dix fichiers qui écrivent encore un « h1 » sont nommés plus haut,
       chacun avec sa raison. Le cliquet reste — il interdit désormais la
       RÉGRESSION, ce qui est son autre moitié : une page neuve qui écrirait
       son en-tête à la main le ferait tomber le jour même. */
    const PLAFOND = 0;
    const restants = entetesALaMain().filter((f) => !SANS_ENTETE[f]);
    expect(restants.length, `${restants.length} en-têtes encore écrits à la main (plafond ${PLAFOND}) :\n  ${restants.join("\n  ")}`).toBeLessThanOrEqual(PLAFOND);
    expect(PLAFOND - restants.length, "le plafond a pris du jeu : le rabaisser au compte du jour").toBeLessThanOrEqual(2);
  });

  it("pose les quatre créneaux dans l'ordre, et un seul genre par créneau", () => {
    const s = fs.readFileSync(path.join(ROOT, "src/components/EnTete.tsx"), "utf8");
    const ordre = ["retour", "surTitre", "titre", "phrase"];
    const places = ordre.map((c) => s.indexOf(`${c}?`) >= 0 || s.indexOf(`${c}:`) >= 0 ? s.search(new RegExp(`\\n  ${c}[?:]`)) : -1);
    expect(places.every((i) => i > 0), "un créneau a disparu de la coquille").toBe(true);
    expect([...places].sort((a, b) => a - b), "les créneaux ont changé d'ordre").toEqual(places);
    /* Le retour est un lien, le sur-titre n'en est pas un : c'est toute la
       distinction que le fil d'Ariane de « Sécurité » effaçait. */
    expect(s, "le sur-titre est redevenu un lien").not.toMatch(/surTitre[^}]*href/);
  });

  /* ET LA RÈGLE SE VÉRIFIE SUR LES APPELS, depuis que « surTitre » accepte un
     nœud — une page du guide y pose la pastille de sa section. Le type ne peut
     plus la tenir ; elle compte pourtant là plus qu'ailleurs, car le fil
     d'Ariane de « Sécurité » était un APPEL, pas une signature.
     QUATRE SE SONT FAIT PRENDRE CE SOIR-LÀ, tous déguisés : trois « nav » d'un
     seul lien vers le parent, et un mot cliquable au milieu d'un sur-titre —
     « BVMAC » menait à « /marche » depuis l'avant-titre de l'indice. Un chemin
     vers le parent a un créneau, et c'est le premier. */
  it("ne laisse personne poser un lien ni un chevron dans le créneau du sur-titre", () => {
    const fautifs: string[] = [];
    const marche = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) marche(p);
        else if (e.name.endsWith(".tsx")) {
          const s = fs.readFileSync(p, "utf8");
          for (const m of s.matchAll(/surTitre=\{/g)) {
            /* La valeur du créneau : du « { » jusqu'à l'accolade qui le ferme. */
            let i = (m.index ?? 0) + m[0].length - 1;
            let n = 0;
            const debut = i;
            for (; i < s.length; i++) {
              if (s[i] === "{") n++;
              else if (s[i] === "}" && --n === 0) break;
            }
            const valeur = s.slice(debut, i);
            if (/href=|href:/.test(valeur)) fautifs.push(`${path.relative(ROOT, p)} · un lien`);
            if (/\u203a/.test(valeur)) fautifs.push(`${path.relative(ROOT, p)} · un chevron de fil d'Ariane`);
          }
        }
      }
    };
    marche(path.join(ROOT, "src"));
    expect(fautifs, `le créneau du sur-titre dit OÙ l'on est ; un lien ou un chevron y refait le fil d'Ariane que « EnTete » a été écrit pour retirer\n  ${fautifs.join("\n  ")}`).toEqual([]);
  });

  /* Non vacuité : la règle ne garde rien si plus personne n'emploie le
     créneau. */
  it("garde un créneau de sur-titre qui sert encore", () => {
    let n = 0;
    const marche = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) marche(p);
        else if (e.name.endsWith(".tsx")) n += (fs.readFileSync(p, "utf8").match(/surTitre=\{/g) ?? []).length;
      }
    };
    marche(path.join(ROOT, "src"));
    expect(n, "plus aucune page ne pose de sur-titre : la règle au-dessus ne garde plus rien").toBeGreaterThan(8);
  });

  /* CE QUI SE POSE À CÔTÉ reste à côté. Les trois listes d'instruments
     portent un « en bref » ; sous le titre, il repousse d'un cran le début de
     la liste, qui est ce pour quoi on vient. La coquille le sort donc du bloc
     des mots — si on l'y remettait, il redeviendrait un cinquième créneau
     empilé, et la raison écrite par la page des fonds serait perdue. */
  it("pose à côté du titre ce qui n'est pas un mot du titre", () => {
    const s = fs.readFileSync(path.join(ROOT, "src/components/EnTete.tsx"), "utf8");
    /* Posé en frère de « .mots », pas en enfant : entre lui et la fermeture
       de l'en-tête il ne reste donc aucune balise à fermer. */
    const pose = s.indexOf("{aCote}");
    expect(pose, "le créneau « à côté » a disparu de la coquille").toBeGreaterThan(0);
    expect(s.slice(pose, s.indexOf("</header>")), "le « à côté » est repassé sous le titre, dans le bloc des mots").not.toContain("</div>");
    const css = fs.readFileSync(path.join(ROOT, "src/components/EnTete.module.css"), "utf8");
    expect(css, "le « à côté » ne sait plus passer à la ligne quand la place manque").toMatch(/\.avecCote\s*{[^}]*flex-wrap:\s*wrap/);
  });
});

/**
 * C — LA FONTE D'UN TITRE, TRANCHÉE LE 24 OCTOBRE 2026.
 *
 * Relevé à l'écran sur trente-six pages de l'application : huit titraient en
 * Instrument Serif et vingt-huit en Manrope, toutes à 30 px. La taille de
 * l'étalon tenait donc partout, et la fonte nulle part — et ce qui décidait
 * n'était pas ce qu'EST la page, mais quelle coquille elle avait importée :
 * « /portefeuille » et « /aide » en serif, « /marche » et « /trader » en
 * sans, tous les quatre sommaires de siège.
 *
 * LA LIGNE ÉTAIT DÉJÀ ÉCRITE DANS CE DÉPÔT, en tête de la feuille de la
 * console : « Le site public respire, la console travaille. » La vitrine
 * garde son serif et son échelle fluide ; l'application titre en sans.
 *
 * L'ÉPREUVE EST UNE LISTE BLANCHE, et non un compte : un cliquet dirait
 * combien de fichiers posent la fonte, pas lesquels ont le droit. Les
 * dispensés sont la vitrine publique et les deux voiles montés sur les deux
 * domaines.
 *
 * LE GUIDE A ÉTÉ TRANCHÉ LE 24 OCTOBRE 2026, et il l'était déjà. « Risques et
 * limites » figurait ici « à décider », au motif qu'un guide se lit des deux
 * côtés — mais les quatre autres feuilles du guide, la racine, chaque leçon,
 * les mentions et le parcours, titraient toutes en sans depuis le début.
 * Elle n'était pas une exception de principe, elle était le reste.
 */
const DISPENSES = [
  /* La vitrine publique : elle a sa voix, et son échelle fluide avec. */
  "src/app/Accueil.module.css",
  "src/app/a-propos/page.module.css",
  "src/app/placements/page.module.css",
  "src/app/offres/[id]/ApercuPartage.module.css",
  /* Montés par le gabarit sur les deux domaines : ils ne sont ni l'un ni
     l'autre, et les trancher demanderait de trancher pour les deux. */
  "src/components/AppMenu.module.css",
  "src/components/mobile/Onboarding.module.css",
  "src/components/mobile/Presentation.module.css",
];

describe("la fonte d'un titre", () => {
  it("reste à la vitrine, et n'entre pas dans l'application", () => {
    const fautifs: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith(".module.css")) {
          const rel = path.relative(ROOT, p).split(path.sep).join("/");
          if (DISPENSES.includes(rel)) continue;
          if (/font-family:\s*var\(--font-titre\)/.test(fs.readFileSync(p, "utf8"))) fautifs.push(rel);
        }
      }
    };
    walk(path.join(ROOT, "src"));
    expect(fautifs, `ces feuilles de l'application posent la fonte de la vitrine :\n  ${fautifs.join("\n  ")}`).toEqual([]);
  });

  /* Non vacuité : la vitrine la porte toujours, et le jeton existe. */
  it("est bien encore posée quelque part", () => {
    expect(fs.readFileSync(path.join(ROOT, "src/app/Accueil.module.css"), "utf8")).toMatch(/font-family:\s*var\(--font-titre\)/);
    expect(fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8")).toMatch(/--font-titre:/);
  });
});

/**
 * LES DEUX CRÉNEAUX D'AVANT-TITRE NE DISENT PAS LA MÊME CHOSE.
 *
 * L'étalon les sépare : LE RETOUR nomme la page d'au-dessus, LE SUR-TITRE
 * nomme la famille. Relevé le 24 octobre 2026, après la conversion des sept
 * pages de « Feuillet » : quatre pages écrivaient le même mot dans les deux —
 * « ← Votre compte » puis « VOTRE COMPTE », à deux lignes d'écart. Deux
 * créneaux distincts qui répètent un mot ne valent pas mieux qu'un seul.
 *
 * ET LE MOT D'UN RETOUR EST LE NOM DE SA DESTINATION, celui que la maison lui
 * donne dans « nav-groups.ts ». Sept retours menaient à « / » en l'appelant
 * « Portefeuille » ou « Votre portefeuille » : or la table l'appelle « Tableau
 * de bord », et « Portefeuille » est le nom d'une AUTRE page, qui existe. Un
 * lien dont le mot nomme une page et dont la flèche en ouvre une autre est
 * pire qu'un lien muet.
 */
const retoursEcrits = (): { ou: string; href: string; mot: string; surTitre?: string }[] => {
  const out: { ou: string; href: string; mot: string; surTitre?: string }[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".tsx")) {
        const s = fs.readFileSync(p, "utf8");
        for (const m of s.matchAll(/retour=\{\{ href: "([^"]+)", mot: t\("([^"]+)"\) \}\}/g)) {
          /* Le sur-titre du même en-tête : il suit le retour, avant le titre. */
          const apres = s.slice(m.index ?? 0, (m.index ?? 0) + 600);
          const st = apres.match(/surTitre=\{t\("([^"]+)"\)\}/);
          out.push({ ou: path.relative(ROOT, p), href: m[1], mot: m[2], surTitre: st?.[1] });
        }
      }
    }
  };
  walk(path.join(ROOT, "src"));
  return out;
};

describe("le créneau d'avant-titre", () => {
  it("ne dit pas le même mot dans le retour et dans le sur-titre", () => {
    const fautifs = retoursEcrits().filter((r) => r.surTitre && r.surTitre === r.mot);
    expect(fautifs.map((r) => `${r.ou} · « ${r.mot} » deux fois`), "le retour et le sur-titre redisent le même mot").toEqual([]);
  });

  it("nomme la destination d'un retour du nom que la maison lui donne", () => {
    const table = new Map<string, string>();
    for (const m of fs.readFileSync(path.join(ROOT, "src/lib/nav-groups.ts"), "utf8").matchAll(/href: "([^"]+)", label: "([^"]+)"/g)) table.set(m[1], m[2]);
    expect(table.size, "la table des pages ne se lit plus").toBeGreaterThan(15);
    /* Une destination hors de la table — un siège, nommé par le dock — n'est
       pas jugée ici : on ne compare qu'à ce que la maison a écrit. */
    const fautifs = retoursEcrits()
      .filter((r) => table.has(r.href) && table.get(r.href) !== r.mot)
      .map((r) => `${r.ou} · « ${r.mot} » mène à ${r.href}, que la maison appelle « ${table.get(r.href)} »`);
    expect(fautifs, `ces retours nomment autre chose que leur destination :\n  ${fautifs.join("\n  ")}`).toEqual([]);
  });

  /* Non vacuité : il y a bien des retours à juger. */
  it("regarde bien quelque chose", () => {
    expect(retoursEcrits().length).toBeGreaterThan(10);
  });
});
