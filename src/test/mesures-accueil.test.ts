import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * LE CLIQUET DES DEUX MESURES DE LA PAGE D'ACCUEIL.
 *
 * La page publique déclarait SIX largeurs de contenu le 12 octobre 2026 :
 * 22em, 36em, 38em, 38em, 42em, 60em, plus deux sections sans borne du tout.
 * Aucune ne débordait, et c'est bien ce qui rendait le défaut invisible :
 * mesuré sur la page servie, le débordement horizontal valait zéro à 375, à
 * 812 et à 1497 pixels. Ce qui se lisait comme « trop étiré sur grand écran »
 * n'était pas un débordement, c'était l'absence de rythme : sur un écran de
 * 1497 pixels, le titre tenait dans 330 pendant que deux sections couraient
 * sur 1340, et l'œil devait retrouver le bord droit à chaque section.
 *
 * LA RÈGLE TENUE ICI : deux mesures nommées, et pas de troisième.
 *   Texte (34rem) borne ce qui se LIT.
 *   Large (72rem) borne ce qui se PARCOURT.
 *   La pleine laisse est réservée au FOND, par une absence de borne.
 *
 * POURQUOI UN CLIQUET ET PAS UNE CONSIGNE. Une règle de mise en page tenue à
 * la main se défait en trois semaines : la prochaine section arrive avec sa
 * propre largeur, elle ne casse rien, personne ne la voit, et on recompte six
 * mesures. C'est exactement l'histoire des six, dont aucune n'a jamais produit
 * d'erreur.
 *
 * CE QU'IL NE PEUT PAS VOIR, ET C'EST ÉCRIT POUR QU'ON NE LUI PRÊTE PAS PLUS
 * QU'IL NE GARDE :
 *
 *   une mesure posée dans un attribut `style` du composant, qu'aucune feuille
 *   ne porte ;
 *
 *   une mesure ANNULÉE PAR UN PARENT. C'était le cas de `.chapeau`, borné à
 *   36em à l'intérieur d'une colonne bornée à 22em : une valeur écrite, lue
 *   par personne. Le cliquet compte les déclarations, pas leur effet, et il
 *   aurait laissé passer celle-là.
 */
const ROOT = path.resolve(__dirname, "../..");
const FEUILLE = "src/app/Accueil.module.css";

/** Les deux seules bornes admises, et les noms qui les portent. */
const ADMISES = ["var(--mesure-texte)", "var(--mesure-large)"];

/** Leur déclaration, qui doit rester en rem : voir le test qui suit. */
const DECLARATIONS = /--mesure-(texte|large):\s*([0-9.]+)(rem|em|px|ch)/g;

const lignes = (): string[] => fs.readFileSync(path.join(ROOT, FEUILLE), "utf8").split(/\r?\n/);

describe("les mesures de la page d'accueil", () => {
  it("ne connaît que Texte et Large, jamais une troisième", () => {
    const horsRegle: string[] = [];
    lignes().forEach((ligne, i) => {
      /* « @media (max-width: 900px) » n'est pas une mesure de contenu : c'est
         un point de bascule, et il a le droit de porter sa valeur. */
      if (/^\s*@media/.test(ligne)) return;
      const m = /(?:^|[^-])max-width:\s*([^;]+);/.exec(ligne);
      if (!m) return;
      const valeur = m[1].trim();
      if (ADMISES.includes(valeur)) return;
      /* Les pourcentages et les pixels ne mesurent pas une colonne de
         lecture : ils bornent une vignette, une image, un bouton. Libres. */
      if (/^[0-9.]+(%|px)$/.test(valeur)) return;
      horsRegle.push(`${FEUILLE}:${i + 1} · max-width: ${valeur}`);
    });
    expect(horsRegle, `Une septième mesure est apparue. Deux suffisent : var(--mesure-texte) pour ce qui se lit, var(--mesure-large) pour ce qui se parcourt.\n${horsRegle.join("\n")}`).toEqual([]);
  });

  it("les déclare en rem, parce que em ne peut pas donner un bord commun", () => {
    /* LE PIÈGE QUI A FAILLI PASSER, ET QUI MÉRITE SON PROPRE TEST.
     *
     * La maquette les écrivait en « em ». Or em se résout sur la taille de
     * police de l'ÉLÉMENT : 34em valent 544 pixels sur un paragraphe à 1rem
     * et 435 sur l'avertissement à 0,8rem. Une mesure en em ne peut donc pas
     * donner le bord commun qui est tout ce qu'on lui demande, et le défaut
     * serait invisible : chaque section aurait l'air bornée, et les bords ne
     * s'aligneraient pas. Le rem est ancré à la racine. */
    const texte = fs.readFileSync(path.join(ROOT, FEUILLE), "utf8");
    const unites = [...texte.matchAll(DECLARATIONS)].map((m) => `${m[1]}=${m[2]}${m[3]}`);
    expect(unites).toEqual(["texte=34rem", "large=72rem"]);
  });

  it("borne chaque section, et laisse la pleine laisse aux deux fonds", () => {
    /* Le compte du jour, gravé. Il dit que la règle est APPLIQUÉE et pas
       seulement déclarée : treize bornes posées, sept en Texte et six en
       Large.
         Texte · .dire, .tete, .entrerTete, le groupe des h2, .publieDire p,
                 .accDire p, .avertissement
         Large · .gestesListe, .publications, .etapes, .portes, .garanties,
                 .dedans
       Il peut bouger quand une section naît ou disparaît, et alors ce chiffre
       se met à jour en même temps que la feuille, à la main, ce qui est le
       but : on ne change pas le rythme de la page sans le dire. */
    const texte = fs.readFileSync(path.join(ROOT, FEUILLE), "utf8");
    const nbTexte = (texte.match(/max-width:\s*var\(--mesure-texte\)/g) ?? []).length;
    const nbLarge = (texte.match(/max-width:\s*var\(--mesure-large\)/g) ?? []).length;
    expect({ nbTexte, nbLarge }).toEqual({ nbTexte: 7, nbLarge: 6 });
  });

  it("garde le fond des deux bandes hors de toute borne", () => {
    /* Une bande qui s'arrête avant le bord n'est plus une bande. Le fond
       traverse, l'enveloppe « .dedans » rentre dans le rang : si quelqu'un
       borne « .accompagnement » ou « .final » eux-mêmes, la couleur cesse de
       traverser et le test le dit avant le lecteur. */
    const texte = fs.readFileSync(path.join(ROOT, FEUILLE), "utf8");
    for (const bande of [".accompagnement", ".final"]) {
      const bloc = new RegExp(`\\n\\${bande} \\{([^}]*)\\}`).exec(texte);
      expect(bloc, `le bloc ${bande} est introuvable`).not.toBeNull();
      expect(bloc?.[1].includes("max-width"), `${bande} porte une borne : son fond ne traverse plus`).toBe(false);
    }
    expect(texte.includes(".dedans {")).toBe(true);
  });
});
