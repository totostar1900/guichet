import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SEED_OFFERS } from "@/data/seed";
import { echeancesProches, presse, JOURS_URGENT, JOURS_FENETRE } from "@/lib/domain/echeances";

const ROOT = path.join(__dirname, "../..");

/**
 * LE SEMIS PORTE TOUJOURS UNE SÉANCE DEVANT.
 *
 * LE TROU QUE CELA BOUCHE, relevé le 24 octobre 2026. Toutes les séances du
 * dépôt portent les dates VRAIES de communiqués de septembre : c'est ce qui en
 * fait un relevé et non une fixture, et c'est pourquoi on n'y touche pas. Mais
 * elles étaient donc toutes passées, et « Ce qui ferme bientôt » ne paraissait
 * JAMAIS en développement — ni sur la page d'arrivée, ni sur la racine de
 * Trade. Le seuil des sept jours, qui fait remonter la bande au-dessus du
 * portefeuille, n'avait jamais pu être vu travailler.
 *
 * ON NE S'EN APERÇOIT PAS, et c'est le pire de l'affaire : une bande vide est
 * exactement ce que la règle de niveau 3 prescrit. Rien ne distingue « il n'y
 * a rien à montrer aujourd'hui » de « ce dépôt ne montrera plus jamais rien ».
 * Trois passes au navigateur ont conclu que tout allait bien.
 *
 * D'OÙ CETTE ÉPREUVE, qui garde les trois tons ET le basculement du seuil.
 * Elle tombera le jour où les séances illustratives repasseront à des dates
 * fixes — la régression qui a produit le trou.
 */
describe("le semis", () => {
  it("porte une séance dans chacun des trois tons", () => {
    const e = echeancesProches(SEED_OFFERS);
    const tons = new Set(e.map((x) => x.urgence));
    expect([...tons].sort(), `le dépôt ne porte plus les trois tons : la bande des échéances ne se lit plus qu'en partie en développement\n  ${e.map((x) => `${x.jours} j · ${x.urgence} · ${x.titre}`).join("\n  ")}`).toEqual(["bientot", "calme", "urgent"]);
  });

  /* LE SEUIL DOIT POUVOIR SE VOIR TRAVAILLER. Sans séance sous sept jours, la
     bande existe mais ne remonte jamais : on ne verrait que la moitié de la
     règle, et la moitié qui ne bouge pas. */
  it("en porte une sous le seuil qui déplace la bande", () => {
    const e = echeancesProches(SEED_OFFERS);
    expect(presse(e), `aucune séance sous ${JOURS_URGENT} jours : « presse() » ne bascule jamais, et la remontée de la bande sur la page d'arrivée ne se voit pas`).toBe(true);
  });

  /* ET LES DATES SE CALCULENT, ELLES NE S'ÉCRIVENT PAS. C'est la seule chose
     qui empêche le trou de revenir : une date fixe est devant aujourd'hui et
     derrière la semaine prochaine. Les séances VRAIES, elles, gardent leurs
     dates de communiqué — on vérifie donc que le fichier sait faire les deux. */
  it("calcule la clôture de ses séances illustratives, au lieu de l'écrire", () => {
    const src = fs.readFileSync(path.join(ROOT, "src/data/seed.ts"), "utf8");
    expect(src, "le semis n'a plus de calculateur de clôture : ses séances illustratives porteront des dates fixes, et seront passées la semaine prochaine").toMatch(/const cloture = \(dansNJours: number/);
    expect((src.match(/deadlineAt: cloture\(/g) ?? []).length, "les séances illustratives n'emploient plus le calculateur").toBeGreaterThanOrEqual(3);
    /* Les vraies gardent leur date : ce fichier est un relevé de communiqués
       datés, et les falsifier lui ôterait ce qui en fait un relevé. */
    expect((src.match(/deadlineAt: "20\d\d-/g) ?? []).length, "les séances de septembre ont perdu leurs dates : ce fichier est un relevé de communiqués, pas une fixture").toBeGreaterThan(5);
  });

  /* NON VACUITÉ, et elle compte ici plus qu'ailleurs : les trois épreuves
     ci-dessus liraient un dépôt vide sans rien dire si la fenêtre elle-même
     avait changé de sens. */
  it("garde une fenêtre qui a du sens", () => {
    expect(JOURS_URGENT).toBeLessThan(JOURS_FENETRE);
    expect(echeancesProches(SEED_OFFERS).every((x) => x.jours >= 0 && x.jours <= JOURS_FENETRE), "une échéance hors fenêtre est remontée").toBe(true);
  });
});
