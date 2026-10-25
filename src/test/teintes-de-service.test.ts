import { describe, expect, it } from "vitest";
import { bloc, contraste, ecrans, globals, jetons, resoudre, SEUIL } from "./couleurs";
import { CATALOGUE } from "@/lib/domain/services";

/**
 * UNE TEINTE PAR SERVICE, ET ELLE TIENT SUR LES SEIZE ÉCRANS.
 *
 * POURQUOI ELLE EXISTE. Les tuiles de Trade étaient douze cadres de la même
 * couleur sur le même fond : rien ne disait par où commencer, et la page était
 * du bleu et du blanc du haut en bas. Décision du dirigeant, 25 octobre 2026 :
 * une couleur par service, « quitte à revoir les pages d'atterrissage », avec
 * une contrainte nommée — « être cohérent sous les autres fonds et palettes ».
 *
 * CE QUE CETTE CONTRAINTE VEUT DIRE EXACTEMENT, et c'est ce que cette garde
 * mesure. L'application rend SEIZE écrans : deux thèmes automatiques, deux
 * thèmes choisis, et trois palettes dans chacun de ces quatre états. La paire
 * d'un service — l'encre de son titre sur le fond de sa tuile — doit tenir
 * 4,5:1 sur tous, et sa ligne du dessous aussi, qui est en « --ink-2 » et
 * bascule donc avec la palette.
 *
 * CE QUE LA PAIRE DOIT À SA FORME. Le titre se lit sur « -soft » et non sur
 * « --surface » : la tuile porte son propre sol, donc le rapport ne dépend
 * pas de la palette. C'est la seule construction qui rende la promesse
 * tenable sans accorder douze teintes quatre fois.
 *
 * ET LA GARDE DE CONTRASTE DE LA MAISON NE PEUT PAS FAIRE CE TRAVAIL : elle
 * lit les règles CSS, et ces deux variables sont posées EN LIGNE par
 * `teinteDuService`, comme celles des familles. Elle y verrait les replis, qui
 * sont gris, et conclurait que tout va bien.
 */
const SERVICES = CATALOGUE.map((c) => c.cle);

/** Les trois sols que la maison pose sous un dessin de service. */
const SOLS = ["var(--surface)", "var(--surface-2)", "var(--paper)"];

/** Les écrans qui rendent le thème sombre, où la seconde moitié des jetons vaut. */
const estSombre = (nom: string): boolean => nom === "sombre" || nom.includes("dark") || nom.endsWith(":auto");

/** Les jetons de teinte, tels que `globals.css` les déclare pour chaque thème. */
const teintes = () => {
  const g = globals();
  const clair = jetons(bloc(g, ":root {"));
  const sombre = jetons(bloc(g, "@media (prefers-color-scheme: dark)"));
  const choisi = jetons(bloc(g, ':root[data-theme="dark"] {'));
  return { clair, sombre, choisi };
};

describe("les teintes de service", () => {
  it("existent pour chaque service du catalogue, et dans les deux thèmes", () => {
    const { clair, sombre, choisi } = teintes();
    const manquantes: string[] = [];
    for (const cle of SERVICES) {
      for (const [nom, t] of [["clair", clair], ["sombre (média)", sombre], ["sombre (choisi)", choisi]] as const) {
        if (!t[`--serv-${cle}`]) manquantes.push(`--serv-${cle} au ${nom}`);
      }
    }
    expect(manquantes, `ces services sortiront en gris, et rien ne le dira :\n  ${manquantes.join("\n  ")}`).toEqual([]);
    /* Non vacuité : le catalogue répond, et les trois blocs ont été trouvés. */
    expect(SERVICES.length).toBeGreaterThan(5);
    expect(Object.keys(clair).length).toBeGreaterThan(20);
    expect(Object.keys(sombre).length).toBeGreaterThan(20);
  });

  /**
   * LE SOMBRE EST ÉCRIT DEUX FOIS — requête média et thème choisi — parce que
   * le navigateur a besoin des deux, et deux copies divergent. Celle-ci est la
   * seule chose qui les tienne ensemble.
   */
  it("disent la même chose dans les deux écritures du sombre", () => {
    const { sombre, choisi } = teintes();
    const ecarts = SERVICES.flatMap((cle) =>
      [`--serv-${cle}`]
        .filter((j) => sombre[j] !== choisi[j])
        .map((j) => `${j} : ${sombre[j]} en média, ${choisi[j]} en thème choisi`),
    );
    expect(ecarts, `le sombre automatique et le sombre choisi ne s'accordent plus :\n  ${ecarts.join("\n  ")}`).toEqual([]);
  });

  /**
   * LA TEINTE SE LIT SUR LES SOLS DE LA MAISON, et non sur un sol à elle.
   *
   * ELLE A PORTÉ SON PROPRE FOND PENDANT QUELQUES HEURES, le 25 octobre 2026,
   * et cette épreuve mesurait alors le titre sur ce fond-là. Le dirigeant a
   * tranché à l'écran — « trop de couleur, et ça ne ressemble plus au reste
   * de l'application » — et c'est le bon verdict : sept aplats colorés dans
   * une application sobre ne rendent pas la page plus lisible, ils la rendent
   * étrangère. La teinte s'est retirée sur le dessin.
   *
   * CE QUE ÇA CHANGE POUR LA MESURE, et c'est tout le sujet. Tant que la
   * tuile portait son propre fond, le rapport ne dépendait pas de la palette.
   * Posée sur les sols de la maison, la teinte dépend des SEIZE écrans — et
   * huit des douze tombaient alors sous le seuil, jusqu'à 3,57:1 sur
   * « --surface-2 » du « dim » d'ivoire. Les neuf valeurs claires ont été
   * descendues du strict nécessaire, l'angle inchangé.
   *
   * ET LES TROIS SOLS, PAS UN SEUL : l'écusson se pose sur « --surface-2 »,
   * la tuile sur « --surface », et le téléphone laisse parfois voir le
   * papier. Mesurer le sol choisi aujourd'hui, c'est reposer le piège pour le
   * jour où l'écusson déménage d'un cran.
   */
  it("se lisent sur les trois sols de la maison, sur chacun des seize écrans", () => {
    const tous = ecrans();
    expect(Object.keys(tous).length, "les palettes ne sont plus lues : la contrainte du dirigeant n'est plus mesurée").toBe(16);
    const { clair, sombre } = teintes();
    const faibles: string[] = [];
    for (const cle of SERVICES) {
      for (const [nom, vars] of Object.entries(tous)) {
        const t = estSombre(nom) ? { ...clair, ...sombre } : clair;
        const encre = resoudre(`var(--serv-${cle})`, t);
        if (!encre) {
          faibles.push(`${cle} : teinte irrésoluble en ${nom}`);
          continue;
        }
        for (const sol of SOLS) {
          const fond = resoudre(sol, vars);
          if (!fond) continue;
          const r = contraste(encre, fond);
          if (r < SEUIL) faibles.push(`${cle} · ${sol} ${r.toFixed(2)}:1 en ${nom}`);
        }
      }
    }
    expect(faibles, `sous ${SEUIL}:1 — le dessin d'un service ne se voit plus sur le fond de la page :\n  ${faibles.join("\n  ")}`).toEqual([]);
  });

  /**
   * ET L'OR DES TITRES SE LIT AUSSI, sur les mêmes trois sols.
   *
   * C'est lui qui a remplacé les douze couleurs : douze titres de douze
   * teintes faisaient douze familles, douze titres dorés n'en font qu'une,
   * qui est celle de l'application entière. Un seul jeton porte donc douze
   * titres sur deux écrans, et s'il cédait quelque part, il céderait partout
   * à la fois — c'est exactement ce qu'une mesure doit couvrir.
   */
  it("laissent l'or des titres lisible partout", () => {
    const faibles: string[] = [];
    for (const [nom, vars] of Object.entries(ecrans())) {
      const or = resoudre("var(--gold-ink)", vars);
      expect(or, `l'or des titres ne se résout plus en ${nom}`).toBeTruthy();
      for (const sol of SOLS) {
        const fond = resoudre(sol, vars);
        if (!fond || !or) continue;
        const r = contraste(or, fond);
        if (r < SEUIL) faibles.push(`${sol} ${r.toFixed(2)}:1 en ${nom}`);
      }
    }
    expect(faibles, `l'or des titres passe sous ${SEUIL}:1 :\n  ${faibles.join("\n  ")}`).toEqual([]);
  });

  /**
   * DEUX SERVICES NE PARTAGENT PAS UNE TEINTE, sans quoi la couleur cesse de
   * distinguer — et c'est la seule chose qu'on lui demande. Le cas qui se
   * produit vraiment : on ajoute un service, on recopie la ligne du voisin, et
   * deux tuiles deviennent jumelles sans que rien ne tombe.
   */
  it("ne se répètent pas d'un service à l'autre", () => {
    const { clair } = teintes();
    const vues = new Map<string, string>();
    const doublons: string[] = [];
    for (const cle of SERVICES) {
      const v = clair[`--serv-${cle}`];
      if (!v) continue;
      const deja = vues.get(v);
      if (deja) doublons.push(`${deja} et ${cle} portent ${v}`);
      else vues.set(v, cle);
    }
    expect(doublons, `deux services de la même couleur ne se distinguent plus :\n  ${doublons.join("\n  ")}`).toEqual([]);
  });

  /**
   * DEUX SERVICES D'UN MÊME RAYON SE DISTINGUENT PAR LA TEINTE, et c'est la
   * bonne mesure — pas la distance de leurs fonds.
   *
   * CE QUI A ÉTÉ ESSAYÉ D'ABORD, ET POURQUOI C'ÉTAIT FAUX. J'ai mesuré l'écart
   * ΔE entre les douze fonds, trouvé des paires à 3,5, et tenté de les
   * écarter. Deux choses s'en sont suivies : en poussant un fond, il tombait
   * sur un troisième — cinq pastels d'un même rayon ne peuvent pas s'écarter
   * beaucoup — et en les saturant pour gagner de la distance, le contraste du
   * titre passait sous 4,5:1. La contrainte est arithmétique : ΔE mélange la
   * CLARTÉ et la TEINTE, et des fonds presque blancs ont forcément des
   * clartés voisines. Les forcer, c'était échanger de la lisibilité contre un
   * chiffre.
   *
   * CE QUI DÉCIDE VRAIMENT. Deux aplats de même clarté et de teintes
   * différentes se distinguent très bien — le teal et le vert des deux tuiles
   * voisines se voyaient, c'est l'écart d'ANGLE qui était trop court (33°).
   * Le cliquet porte donc sur l'angle, dans le rayon où les tuiles paraissent
   * ensemble. Trente degrés : l'écart qu'il a fallu donner au rachat, qui
   * était à 25° de l'or des fonds, deux chaudes côte à côte.
   */
  it("se distinguent par l'angle de teinte, dans un même rayon", () => {
    const { clair, sombre } = teintes();
    const ECART_MINIMAL = 30;
    const angle = (hex: string): number => {
      const [r, g, b] = (resoudre(hex, {}) ?? [0, 0, 0]).map((v) => v / 255);
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const d = mx - mn;
      if (!d) return 0;
      const t = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (((t * 60) % 360) + 360) % 360;
    };
    const ecart = (a: number, b: number) => (Math.abs(a - b) % 360 > 180 ? 360 - (Math.abs(a - b) % 360) : Math.abs(a - b) % 360);
    const serres: string[] = [];
    for (const [nomDuTheme, t] of [["clair", clair], ["sombre", { ...clair, ...sombre }]] as const) {
      for (let i = 0; i < CATALOGUE.length; i++) {
        for (let j = i + 1; j < CATALOGUE.length; j++) {
          if (CATALOGUE[i].rayon !== CATALOGUE[j].rayon) continue;
          const [a, b] = [CATALOGUE[i].cle, CATALOGUE[j].cle];
          const e = ecart(angle(t[`--serv-${a}`] ?? ""), angle(t[`--serv-${b}`] ?? ""));
          if (e < ECART_MINIMAL) serres.push(`${a} / ${b} : ${e.toFixed(0)}° au ${nomDuTheme}`);
        }
      }
    }
    expect(serres, `ces deux services paraissent côte à côte et portent presque la même teinte :\n  ${serres.join("\n  ")}`).toEqual([]);
    /* Non vacuité : il y a bien des paires à comparer dans un même rayon. */
    const memeRayon = CATALOGUE.flatMap((a, i) => CATALOGUE.slice(i + 1).filter((b) => b.rayon === a.rayon));
    expect(memeRayon.length, "plus aucun rayon ne porte deux services : la comparaison ne garde rien").toBeGreaterThan(8);
  });

  /**
   * ET AUCUNE N'EST LE NAVY DE LA MAISON, qui est le fond de tout le reste.
   * C'est le point de départ de la demande : « tuer le bleu/blanc ultra
   * dominant ». Une tuile qui reprendrait « --fam-OTA » — le navy des
   * obligations du Trésor — serait bleue sur bleu, c'est-à-dire invisible au
   * moment précis où on lui demande de se faire voir.
   */
  it("n'empruntent pas le navy, qui est le fond de l'écran", () => {
    const { clair } = teintes();
    const navy = [clair["--navy"], clair["--fam-OTA"]].filter(Boolean).map((x) => x.toLowerCase());
    expect(navy.length, "le navy n'est plus déclaré : la comparaison ne garde plus rien").toBeGreaterThan(0);
    const fautifs = SERVICES.filter((cle) => navy.includes((clair[`--serv-${cle}`] ?? "").toLowerCase()));
    expect(fautifs, `ces services reprennent le navy, et leur tuile sera bleue sur bleu : ${fautifs.join(", ")}`).toEqual([]);
  });
});
