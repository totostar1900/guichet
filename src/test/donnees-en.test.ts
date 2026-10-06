import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inventaire } from "./couverture";
import { COMPANIES } from "@/data/companies";
import { ISSUERS } from "@/data/issuers";
import { HEALTH_HOW } from "@/lib/health-how";
import { DESK_GROUPS } from "@/components/DeskNav";

/**
 * LES DONNÉES LIVRÉES PASSENT EN ANGLAIS, ELLES AUSSI.
 *
 * La phrase qui dit ce que fait une société, la lecture de ses comptes, la
 * source d'un chiffre, le titre d'un document : rien de tout cela n'est écrit
 * dans un composant. Ces textes traversent `t()` sous forme de VARIABLE, donc
 * le scanner de clefs ne peut pas les voir, et ils restent en français dans
 * une interface anglaise sans que rien ne le signale. C'est le premier angle
 * mort, le même que pour les estimations, appliqué à `en-data.ts`.
 *
 * LA QUESTION EST UNE COUVERTURE, PAS UNE RESSEMBLANCE. « Cette phrase a-t-elle
 * l'air française » est un détecteur, et ce détecteur a échoué deux fois dans
 * ce dépôt. « Le dictionnaire connaît-il cette clef » est un fait.
 *
 * CE CLIQUET NE REGARDE QUE LES CHAMPS QUI PASSENT VRAIMENT PAR t() OU tr(),
 * relevés un par un dans les pages. Une première version demandait aussi les
 * noms des actionnaires et des dirigeants : ils s'affichent bruts, parce qu'un
 * nom de personne ne se traduit pas, et exiger leur inscription aurait fait
 * grossir le dictionnaire de trente lignes sans qu'aucune ne change un écran.
 * Un cliquet plus large n'est pas un cliquet plus sûr : c'est du bruit que la
 * maison finit par contourner.
 */
const vide = (nom: string, trous: string[]) => expect(trous, `${nom} : ces textes sortiraient en français dans l'interface anglaise :\n  ${trous.join("\n  ")}`).toEqual([]);

describe("les données livrées sont couvertes par le dictionnaire", () => {
  it("les sociétés cotées : activité, lecture des comptes, intitulé du chiffre d'affaires", () => {
    /* `/societes/[mnemo]` : t(c.activity), t(l) sur chaque ligne de lecture,
       t(a.latest.revenueLabel) au-dessus du graphique. */
    const phrases = COMPANIES.flatMap((c) => [c.activity, ...c.reading, ...c.figures.map((f) => f.revenueLabel)]);
    vide("sociétés", inventaire(phrases));
  });

  it("les sociétés cotées : la source de chaque chiffre", () => {
    /* `t(f.source)` sous le tableau des comptes. C'est la ligne qui permet de
       vérifier un chiffre : elle doit se lire dans la langue du lecteur. */
    vide("sources", inventaire(COMPANIES.flatMap((c) => c.figures.map((f) => f.source))));
  });

  it("les émetteurs d'obligations : activité, lecture, unité, documents", () => {
    /* `/emetteurs/[slug]` : tr(i.activity), tr(r0), tr(i.unitNote), tr(d.title),
       tr(i.chair). */
    const phrases = ISSUERS.flatMap((i) => [i.activity, i.unitNote, i.chair, ...i.reading, ...i.documents.map((d) => d.title)]);
    vide("émetteurs", inventaire(phrases));
  });
});

describe("la page Santé passe en anglais", () => {
  it("chaque point dit où aller et quoi y faire", () => {
    /* `FromSante` et la page Santé passent `how.label` et `how.how` à t() sous
       forme de variable : un point neuf arrive en français sans bruit. Mesuré
       le 3 octobre 2026 en regardant la production. */
    vide("Santé", inventaire(Object.values(HEALTH_HOW).flatMap((h) => [h.label, h.how])));
  });
});

describe("l'accueil du desk traduit ce qu'il reprend de Santé", () => {
  it("passe chaque étiquette de contrôle par t()", () => {
    /* LE TROISIÈME ANGLE MORT : le dictionnaire connaissait ces étiquettes,
       c'est l'appel qui manquait. Pendant deux semaines la tuile Santé affichait
       « Bulletins à relire · Lignes publiées contre le bulletin » sous un titre
       « Health », et aucun test ne pouvait le voir, puisque rien ne manquait au
       dictionnaire. Seul l'écran l'a montré, le 3 octobre 2026.

       Un cliquet sur le texte source, donc, et sur ce site-là seulement : il
       nomme la ligne qui a fauté plutôt que de deviner la famille. */
    const source = readFileSync("C:/dev/guichet/src/app/desk/today/today.ts", "utf8");
    const ligne = source.split("\n").find((l) => l.includes("bad.map("));
    expect(ligne, "la tuile Santé ne reprend plus les étiquettes des contrôles").toBeDefined();
    expect(ligne).toContain("t(c.label)");
  });
});

/**
 * LA BARRE DU DESK, ÉTIQUETTE PAR ÉTIQUETTE.
 *
 * Elle rend `t(g.label)` et `t(label)` : des variables, donc invisibles au
 * scanner de clefs. Le 6 octobre 2026, la barre est passée de quatre groupes à
 * six, et quatre des six étiquettes neuves manquaient au dictionnaire. Le
 * scanner a répondu « 0 clef à traduire » pendant que la navigation entière
 * s'apprêtait à sortir en français dans l'interface anglaise.
 *
 * C'est le quatrième angle mort du même genre rencontré dans la même journée.
 * Celui-ci est fermé.
 */
describe("la barre du desk passe en anglais", () => {
  it("chaque groupe et chaque onglet ont leur traduction", () => {
    const mots = DESK_GROUPS.flatMap((g) => [g.label, ...g.tabs.map(([, label]) => label)]);
    vide("barre du desk", inventaire(mots));
  });

  it("et la barre regarde bien quelque chose", () => {
    // Une barre vidée passerait le test précédent sans rien couvrir.
    expect(DESK_GROUPS.length).toBeGreaterThanOrEqual(4);
    expect(DESK_GROUPS.flatMap((g) => g.tabs).length).toBeGreaterThan(25);
  });
});
