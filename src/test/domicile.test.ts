import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HEALTH_HOW } from "@/lib/health-how";

/**
 * UN SUJET A UN DOMICILE, ET SANTÉ N'EST LE DOMICILE DE RIEN.
 *
 * L'audit du 6 octobre 2026 a compté : le bulletin de la cote vivait sur
 * quatre pages sous six noms, les envois aux clients sur quatre pages sous
 * quatre noms, les documents émis sur cinq. Aucune n'était la bonne, parce
 * qu'aucune ne l'était.
 *
 * La cause n'est pas le manque de soin : c'est une règle jamais écrite. Un
 * sujet vivait là où se trouvait la personne qui l'ajoutait. Deux règles en
 * sortent, et ce fichier est ce qui les rend opposables.
 *
 *   1. UN SUJET A UN DOMICILE. Une page qui n'est pas ce domicile n'en montre
 *      qu'un extrait, et cet extrait y mène.
 *   2. SANTÉ DÉTECTE, LE DOMICILE RÉPARE. Une page de santé est un index
 *      d'alertes, pas un atelier : elle dit qu'il y a trois écarts et où on
 *      les répare, elle ne porte pas le bouton.
 *
 * La deuxième n'est pas une invention : `health-how.ts` la suivait déjà douze
 * fois sur quatorze. Les deux exceptions renvoyaient vers Santé elle-même, et
 * c'étaient exactement les deux sujets sans domicile.
 */
const DESK = path.resolve(__dirname, "../app/desk");

const pagesDuDesk = (): { route: string; src: string }[] => {
  const out: { route: string; src: string }[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d)) {
      const p = path.join(d, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (e === "page.tsx") out.push({ route: "/desk" + path.relative(DESK, p).replace(/\\/g, "/").replace(/\/?page\.tsx$/, "").replace(/^(?=.)/, "/"), src: readFileSync(p, "utf8") });
    }
  };
  walk(DESK);
  return out;
};

describe("Santé détecte, le domicile répare", () => {
  it("aucun contrôle ne renvoie vers Santé elle-même", () => {
    /* « Le tableau plus bas sur cette page » : c'est ce que disaient les deux
       modes d'emploi qui pointaient sur /desk/sante, et c'est le symptôme. Un
       contrôle qui se répare sur la page qui le signale fait de la page de
       santé un atelier, et un atelier ne se lit pas d'un coup d'œil. */
    const replis = Object.entries(HEALTH_HOW)
      .filter(([, h]) => h.href.startsWith("/desk/sante"))
      .map(([k, h]) => `${k} -> ${h.href}`);
    expect(replis, "un contrôle de Santé doit mener là où le travail se fait").toEqual([]);
  });

  it("et chacun mène quelque part", () => {
    // Non vacuité : une table vidée passerait le test précédent.
    const n = Object.keys(HEALTH_HOW).length;
    expect(n).toBeGreaterThan(8);
    // « /desk#aujourdhui » est le carnet avec son ancre : une adresse valable.
    for (const [k, h] of Object.entries(HEALTH_HOW)) expect(h.href, k).toMatch(/^\/desk([/#?]|$)/);
  });

  it("et aucun contrôle ne paraît sans mode d'emploi", () => {
    /* LE TROU QUE CE CLIQUET FERME. La table disait où réparer les contrôles
       qu'elle connaissait, et rien ne vérifiait qu'elle les connaissait
       TOUS : deux contrôles neufs sur les fonds sont nés le 6 octobre 2026
       sans entrée, donc affichés sur Santé sans dire où aller. Un signal
       sans geste à faire n'est pas un signal, c'est une inquiétude.
       Les clefs se lisent dans la source, parce que les produire demanderait
       une base, et qu'un cliquet de structure doit rester sans dépendance. */
    const src = readFileSync(path.resolve(__dirname, "../lib/health.ts"), "utf8");
    const clefs = [...src.matchAll(/^\s*key: "([a-z0-9-]+)",$/gm)].map((m) => m[1]);
    expect(clefs.length, "aucune clef lue : le motif ne reconnaît plus les contrôles").toBeGreaterThan(8);
    const sansMode = [...new Set(clefs)].filter((k) => !HEALTH_HOW[k]);
    expect(sansMode, "ces contrôles paraissent sur Santé sans dire où aller").toEqual([]);
  });

  it("Santé ne porte plus de bouton d'atelier", () => {
    /* Trois panneaux à boutons y vivaient faute de domicile : la relecture des
       bulletins, la clôture d'une ligne sortie de cote, le rattrapage des
       derniers échanges. Ils sont partis chez eux. */
    const sante = pagesDuDesk().find((p) => p.route === "/desk/sante")!.src;
    const ateliers = ["rereadAction", "lancerArriereAction", "withdrawLineAction", "backfillLastTradedAction"].filter((a) => sante.includes(a));
    expect(ateliers, "une action de réparation appartient au domicile de son sujet").toEqual([]);
  });
});

describe("chaque panneau déplacé n'existe qu'à un endroit", () => {
  /* Le doublon se reconnaît à son titre : le même panneau, rendu deux fois,
     porte deux fois le même en-tête. Ceux-ci ont bougé le 6 octobre 2026 et ne
     doivent pas repousser derrière eux. */
  const unique = [
    ["Bulletins de la BVMAC à relire", "/desk/bulletins"],
    ["Lignes et bulletin", "/desk/marche"],
    ["Dernier échange à retrouver", "/desk/marche"],
    ["Envois en échec", "/desk/sante"],
  ] as const;

  for (const [titre, chez] of unique) {
    it(`« ${titre} » vit sur ${chez}, et nulle part ailleurs`, () => {
      /* Le motif se compose, il ne s écrit pas : écrit en toutes lettres,
         le scanner des traductions y lirait une clef à traduire nommée
         « ${titre} », et il l a fait. */
      const motif = `<h2>{t(${JSON.stringify(titre)})}</h2>`;
      const ou = pagesDuDesk().filter((p) => p.src.includes(motif)).map((p) => p.route);
      expect(ou).toEqual([chez]);
    });
  }
});

/**
 * LE PLAFOND DES LECTURES PARTAGÉES.
 *
 * Une table lue par cinq pages n'est pas une faute en soi : une page de
 * totaux compte forcément ce que d'autres listent. La faute est que ce nombre
 * MONTE sans que personne ne le voie, et c'est ainsi que les envois aux
 * clients ont fini sur quatre pages sous quatre noms.
 *
 * Le compte du jour est gravé ici. Il peut descendre ; il ne peut pas monter
 * sans qu'on le décide en changeant ce chiffre, ce qui est le moment exact où
 * se pose la question « cette page est-elle le domicile du sujet ? ».
 */
describe("les lectures partagées ne se multiplient pas", () => {
  const PLAFOND: Record<string, number> = {
    // messages (domicile), le carnet du jour, les totaux, la fiche d'une intention, les échecs sur Santé
    listNotifications: 5,
    // le carnet du jour, les totaux, la fiche d'une intention
    listEvents: 3,
    // le domicile (À valider) et le dépôt, qui en compte le poids
    listIntake: 2,
    /* Le domicile (Bulletins), son rapport de séance, le dépôt qui compte,
       Marché qui montre le dernier, Analyses qui date la courbe.

       MONTÉ DE 4 À 5 LE 6 OCTOBRE 2026, délibérément : le rapport d une séance
       lit la liste pour trouver la séance PRÉCÉDENTE, dont validate() a besoin
       pour juger « section plus courte que la veille ». Sans elle, le contrôle
       retombe sur ses planchers absolus et l essai à blanc ne dirait plus ce
       qu une vraie relecture ferait, ce qui lui ôte sa raison d être. Les deux
       pages sont le même domicile, sous la même route. */
    listBulletins: 5,
  };

  for (const [table, plafond] of Object.entries(PLAFOND)) {
    it(`${table} : ${plafond} pages au plus`, () => {
      const lecteurs = pagesDuDesk().filter((p) => p.src.includes(table)).map((p) => p.route);
      expect(lecteurs.length, `pages qui lisent ${table} : ${lecteurs.join(", ")}`).toBeLessThanOrEqual(plafond);
    });
  }

  it("et le plafond regarde bien quelque chose", () => {
    // Un chemin faux rendrait zéro lecteur partout, et tous les plafonds verts.
    expect(pagesDuDesk().length).toBeGreaterThan(30);
    expect(pagesDuDesk().filter((p) => p.src.includes("listNotifications")).length).toBeGreaterThan(2);
  });
});
