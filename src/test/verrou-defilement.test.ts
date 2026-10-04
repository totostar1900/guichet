import { readFileSync, readdirSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * LA PAGE NE DÉFILE PAS DERRIÈRE UNE FEUILLE OUVERTE.
 *
 * Signalé le 4 octobre 2026 : le doigt sur un menu, l'écran du dessous partait
 * avec lui. Quatre composants posaient `overflow: hidden` sur le corps, chacun
 * sa copie, et cela ne tient pas sur iOS Safari. Le seul verrou qui tienne
 * partout sort le corps du flux et lui rend sa position à la fermeture.
 *
 * LE DÉPÔT N'A PAS DE DOM EN TEST, et en ajouter un pour quatre propriétés de
 * style coûterait une dépendance entière. Le module ne touche que `body.style`
 * et deux champs de `window` : on les lui tend, et on mesure ce qu'il y écrit.
 */
const style: Record<string, string> = {};
const racine: Record<string, string> = {};
const scrollTo = vi.fn();
vi.stubGlobal("document", { body: { style }, documentElement: { style: racine } });
vi.stubGlobal("window", { get scrollY() { return position; }, scrollTo });
let position = 0;

const { deverrouiller, verrouiller } = await import("@/components/mobile/verrou-defilement");

describe("le verrou de défilement", () => {
  beforeEach(() => {
    for (const k of Object.keys(style)) delete style[k];
    for (const k of Object.keys(racine)) delete racine[k];
    scrollTo.mockClear();
    position = 0;
  });

  it("sort le corps du flux, et pas seulement son débordement", () => {
    /* `overflow: hidden` seul laisse la page défiler sur iOS Safari. C'est le
       défaut signalé, et la raison pour laquelle on fixe la position. */
    position = 640;
    verrouiller();
    expect(style.position).toBe("fixed");
    expect(style.top).toBe("-640px");
    expect(style.overflow).toBe("hidden");
    deverrouiller();
  });

  it("rend la position exactement où elle était", () => {
    // Un verrou qui ramène le lecteur en haut de page est pire que pas de verrou.
    position = 640;
    verrouiller();
    deverrouiller();
    expect(style.position).toBe("");
    expect(style.top).toBe("");
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 640 }));
  });

  it("tient quand une feuille en ouvre une autre", () => {
    /* Le « ··· » ouvre une feuille qui peut en ouvrir une seconde. Si chacune
       restaurait en se fermant, la première fermeture déverrouillerait pendant
       que la seconde est encore là. */
    position = 300;
    verrouiller();
    position = 0;
    verrouiller();
    deverrouiller();
    expect(style.position, "la première fermeture a déverrouillé trop tôt").toBe("fixed");
    deverrouiller();
    expect(style.position).toBe("");
    // La position rendue est celle d'avant la PREMIÈRE feuille, pas zéro.
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ top: 300 }));
  });

  it("interdit le tirer-pour-rafraîchir pendant qu'une feuille est ouverte", () => {
    /* Le corps hors du flux empeche le DEFILEMENT, pas le GESTE : le
       navigateur reconnait le tire au bord haut et recharge, ce qui ferme la
       feuille et perd ce que le lecteur y avait coche. Signale sur la feuille
       des filtres le 4 octobre 2026. */
    verrouiller();
    expect(style.overscrollBehavior).toBe("none");
    deverrouiller();
    expect(style.overscrollBehavior).toBe("");
  });

  it("l'interdit vaut sur la racine, car c'est elle qui porte le défilement", () => {
    /* LE PREMIER CORRECTIF NE POSAIT LA PROPRIÉTÉ QUE SUR LE CORPS, et le
       corps venait d'être sorti du flux par la ligne du dessus : il ne porte
       plus le défilement de la fenêtre, donc la propriété n'y valait rien.
       Mesuré le 4 octobre 2026 sur « mon compte » et « Bonjour … », où le tiré
       depuis la bande du haut rafraîchissait encore la page. */
    verrouiller();
    expect(racine.overscrollBehavior, "la racine ne retient pas le tiré").toBe("none");
    deverrouiller();
    expect(racine.overscrollBehavior).toBe("");
  });

  it("ne déverrouille pas ce qui n'est pas verrouillé", () => {
    deverrouiller();
    expect(Object.keys(racine)).toEqual([]);
    expect(Object.keys(style)).toEqual([]);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

describe("plus personne ne pose son propre verrou", () => {
  it("aucun composant ne touche body.style.overflow à la main", () => {
    /* Quatre copies de la même ligne, c'est quatre endroits où corriger le jour
       où elle est fausse. Elle l'était. */
    const fautifs: string[] = [];
    const voir = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = `${d}/${e.name}`;
        if (e.isDirectory()) voir(p);
        else if (/\.tsx?$/.test(e.name) && !p.endsWith("verrou-defilement.ts")) {
          if (/document\.body\.style\.overflow/.test(readFileSync(p, "utf8"))) fautifs.push(p.replace("C:/dev/guichet/", ""));
        }
      }
    };
    voir("C:/dev/guichet/src");
    expect(fautifs, `ces fichiers verrouillent le corps à leur façon :\n  ${fautifs.join("\n  ")}`).toEqual([]);
  });

  it("le panneau qui défile retient le geste en bout de course", () => {
    // Le verrou empêche la page de bouger, pas le geste de se propager au parent.
    expect(readFileSync("C:/dev/guichet/src/components/mobile/Sheet.module.css", "utf8")).toMatch(/\.body \{[^}]*overscroll-behavior: contain/);
  });

  it("la tête de la feuille prend le geste à son compte", () => {
    /* LE DERNIER RECOURS, ET LE SEUL QUI TIENNE SUR LA BANDE DU HAUT : React
       écoute « touchmove » en mode passif, le code ne peut donc pas refuser le
       geste au navigateur, et celui-ci reconnaît son tiré-pour-rafraîchir
       avant que la feuille n'ait bougé. « touch-action » se lit avant tout
       gestionnaire. Le corps garde « pan-y », sinon une feuille longue ne se
       lirait plus. */
    const css = readFileSync("C:/dev/guichet/src/components/mobile/Sheet.module.css", "utf8");
    expect(css, "la tête laisse le navigateur prendre le geste").toMatch(/\.head \{[^}]*touch-action: none/);
    expect(css, "le corps doit garder son défilement").toMatch(/\.body \{[^}]*touch-action: pan-y/);
  });
});

describe("le tiré ferme la feuille, pas la page", () => {
  const src = readFileSync("C:/dev/guichet/src/components/mobile/Sheet.tsx", "utf8");

  it("ferme aussi depuis le corps, quand le corps est déjà en haut", () => {
    /* La règle d'avant avait raison sur le fond et tort au bord : arrivé en
       haut de son contenu, le lecteur continue de tirer, et c'est exactement
       là qu'il veut fermer. */
    expect(src).toContain("corps.scrollTop > 0");
  });

  it("laisse une feuille longue se lire", () => {
    // Le corps garde son défilement tant qu'il n'est pas en haut : sinon une
    // feuille de filtres se refermerait au premier geste de lecture.
    expect(src).toContain("if (!surLaTete && corps && corps.scrollTop > 0) return;");
  });
});

describe("tout calque modal verrouille la page, ou dit pourquoi non", () => {
  /**
   * LE DÉFAUT N'ÉTAIT PAS DANS LA FEUILLE DES FILTRES, il était dans chaque
   * calque écrit à la main. Les filtres de toutes les pages passent par un seul
   * `Sheet`, donc un seul correctif les a tous servis ; mais trois autres
   * calques couvrent l'écran sans rien verrouiller, dont une vraie feuille du
   * bas, celle des cartes de taux sur la fiche. Relevé le 4 octobre 2026.
   *
   * DEUX CALQUES DOIVENT AU CONTRAIRE LAISSER LA PAGE DÉFILER : une visite
   * guidée appelle `scrollIntoView` à chaque étape et remesure sa bague à
   * chaque défilement. L'y verrouiller la casserait net. L'exception est donc
   * nommée ici, avec sa raison, et non laissée au hasard.
   */
  const SANS_VERROU: Record<string, string> = {
    "src/components/mobile/CoachMarks.tsx": "la visite amène sa cible à l'écran et suit le défilement",
    "src/components/DeskTour.tsx": "même mécanique que CoachMarks, au desk",
  };

  const calques = () => {
    const out: string[] = [];
    const voir = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = `${d}/${e.name}`;
        if (e.isDirectory()) voir(p);
        else if (/\.tsx$/.test(e.name) && /aria-modal="true"/.test(readFileSync(p, "utf8"))) out.push(p.replace("C:/dev/guichet/", ""));
      }
    };
    voir("C:/dev/guichet/src");
    return out;
  };

  it("chaque calque modal tient la page, sauf ceux nommés", () => {
    const muets = calques().filter((p) => !SANS_VERROU[p] && !/verrou-defilement/.test(readFileSync(`C:/dev/guichet/${p}`, "utf8")));
    expect(muets, `ces calques couvrent l'écran et la page défile derrière :\n  ${muets.join("\n  ")}`).toEqual([]);
  });

  it("l'exception est une liste close, pas un oubli", () => {
    // Un nom resté dans la liste après que le composant a disparu ou s'est mis
    // à verrouiller fait croire à une exception qui n'existe plus.
    const vus = calques();
    const perimes = Object.keys(SANS_VERROU).filter((p) => !vus.includes(p) || /verrou-defilement/.test(readFileSync(`C:/dev/guichet/${p}`, "utf8")));
    expect(perimes, `ces exceptions ne décrivent plus rien :\n  ${perimes.join("\n  ")}`).toEqual([]);
  });

  it("tout panneau fixe qui défile retient le geste en bout de course", () => {
    /* La feuille partagée le fait depuis son module ; une feuille écrite à la
       main l'oublie, et le geste repart dans la page une fois le panneau au
       bout. C'est le même défaut, à un autre endroit. */
    const fautifs: string[] = [];
    const voir = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = `${d}/${e.name}`;
        if (e.isDirectory()) voir(p);
        else if (/\.css$/.test(e.name)) {
          for (const bloc of readFileSync(p, "utf8").split("}")) {
            if (/position:\s*fixed/.test(bloc) && /overflow(-y)?:\s*(auto|scroll)/.test(bloc) && !/overscroll-behavior/.test(bloc)) {
              fautifs.push(`${p.replace("C:/dev/guichet/", "")} ${(bloc.match(/\.[\w-]+\s*\{/) ?? ["?"])[0]}`);
            }
          }
        }
      }
    };
    voir("C:/dev/guichet/src");
    expect(fautifs, `ces panneaux fixes défilent sans retenir le geste :\n  ${fautifs.join("\n  ")}`).toEqual([]);
  });
});
