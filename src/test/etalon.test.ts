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
 */
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
  it("ne laisse pas les en-têtes écrits à la main se multiplier", () => {
    const PLAFOND = 49;
    const mains = entetesALaMain();
    expect(mains.length, `${mains.length} en-têtes encore écrits à la main (plafond ${PLAFOND}) :\n  ${mains.join("\n  ")}`).toBeLessThanOrEqual(PLAFOND);
    expect(PLAFOND - mains.length, "le plafond a pris du jeu : le rabaisser au compte du jour").toBeLessThanOrEqual(2);
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
});
