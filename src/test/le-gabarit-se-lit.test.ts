import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const TSX = "src/app/sondage/Formulaires.tsx";
const CSS = "src/app/sondage/page.module.css";

/**
 * LE GABARIT SE LIT — SIGNALÉ LE 29 OCTOBRE 2026.
 *
 * Deux reproches, et les deux portaient sur la même chose : on ne voyait pas
 * les questions.
 *
 *   « LA PAGE NE S'OUVRE PAS COMPLÈTEMENT. » La feuille montait à mi-écran,
 *   avec la page dessous qui tire l'œil. Un gabarit de huit questions ne se
 *   remplit pas dans une fenêtre : on y perd le haut en atteignant le bas. La
 *   demande avait déjà été posée pour les « en bref » le même jour — « une
 *   page complète avec sa croix pour refermer » — et la variante existait ;
 *   ce formulaire-ci l'avait manquée.
 *
 *   « LES EXPLICATIONS DES ENTRÉES SONT TOUJOURS VISIBLES AU LIEU D'ÊTRE
 *   REPORTÉES DANS DES BULLES. » Huit phrases grises sous huit champs
 *   faisaient du gabarit un mode d'emploi : on cherchait les questions entre
 *   les phrases. Elles ne sont pas supprimées — chacune dit quelque chose
 *   qu'on peut avoir besoin de lire une fois — mais elles attendent qu'on les
 *   demande.
 */
describe("le gabarit se lit", () => {
  it("ouvre le formulaire sur la page entière", () => {
    const src = code(TSX);
    expect(src, "le gabarit est redevenu une feuille à mi-écran").toMatch(/title=\{t\(existante \? "Modifier votre ligne" : "Proposer votre propre ligne"\)\} plein>/);
    expect(src, "« wide » est revenu sur le gabarit").not.toMatch(/"Proposer votre propre ligne"\)\} wide>/);
    // Et la variante fait bien ce qu'elle promet, sinon le mot ne vaudrait rien.
    const feuille = lire("src/components/mobile/Sheet.module.css");
    expect(feuille, "la pleine page n'occupe plus la hauteur de l'écran").toMatch(/\.plein,[\s\S]{0,200}height: 100dvh/);
  });

  it("ne laisse aucune explication permanente sous les champs", () => {
    const src = code(TSX);
    expect(src.match(/small className="muted"/g), "une explication est redevenue permanente sous un champ").toBeNull();
    // Non-vacuité : elles n'ont pas disparu, elles ont changé de place.
    /* LE COMPTE EXACT, ET NON UN PLANCHER LARGE. Écrit « au moins sept »
       alors qu'il y en a neuf, il laissait en retirer deux sans broncher :
       un seuil qu'on ne peut pas franchir ne garde rien. Vérification
       inverse faite. Si une bulle s'ajoute à bon escient, ce chiffre monte
       avec elle — et c'est le but : on relit la liste en le changeant. */
    const bulles = src.match(/<Info /g) ?? [];
    expect(bulles.length, "une explication a été supprimée au lieu d'être mise en bulle").toBe(9);
  });

  /* LA BULLE D'UNE LISTE DÉROULANTE SE POSE AU COIN DU CHAMP, et le sélecteur
     qui l'y pose ne doit viser QU'ELLE. Écrit « .avecBulle > button », il en
     attrapait deux : une liste de la maison est elle-même un bouton, et elle
     se retrouvait collée au coin, sa valeur hors du cadre — exactement le
     défaut réparé le 26 octobre. Vu à l'écran avant d'être corrigé. */
  it("ne pose au coin que la bulle, et pas la liste qu'elle commente", () => {
    const css = lire(CSS);
    expect(css, "le sélecteur du coin vise de nouveau tous les boutons du champ").not.toMatch(/\.avecBulle > button \{/);
    expect(css, "la bulle de coin a perdu sa règle").toMatch(/\.coin \{[^}]*position: absolute/);
    /* UNE SEULE BULLE DE COIN DEPUIS LE 30 OCTOBRE 2026, et ce n'est pas un
       relâchement : il n'y a plus qu'UNE liste déroulante dans ce formulaire.
       La durée avait la sienne tant que modifier une ligne rendait deux listes
       là où en proposer une rendait des jetons ; les deux gestes partagent
       maintenant le même gabarit, les jetons, et la durée commente sa légende.
       Le compte reste exact, et il tomberait si celle du compartiment sortait
       de son enveloppe. Vérification inverse faite. */
    expect((code(TSX).match(/<span className=\{styles\.coin\}>/g) ?? []).length, "la bulle de coin du compartiment est sortie de son enveloppe").toBe(1);
  });
});
