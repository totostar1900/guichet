import { RACINE } from "./racine";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inventaire } from "./couverture";
import { COMPANIES } from "@/data/companies";
import { ISSUERS } from "@/data/issuers";
import { HEALTH_HOW } from "@/lib/health-how";
import { DESK_GROUPS } from "@/components/DeskNav";
import { FAMILLES, VUES } from "@/lib/market/remarques";
import { MOTIFS, MOTIFS_DE_JUGEMENT } from "@/lib/domain/jugement-bulletin";
import { LIBELLES_DU_RELEVE, REFUS } from "@/lib/market/note-budget";
import { DIT } from "@/lib/market/carnet";
import { POURQUOI } from "@/lib/market/leve";

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
    const source = readFileSync(`${RACINE}/src/app/desk/today/today.ts`, "utf8");
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

/**
 * LES MOTS DU BULLETIN : familles de remarques et vues du dépôt.
 *
 * Vingt libellés de famille, vingt conseils, cinq noms de vue et cinq
 * phrases : tous traversent t() sous forme de VARIABLE, donc le scanner de
 * clefs ne les voit pas. C'est le même angle mort que la barre du desk, qui a
 * laissé passer quatre étiquettes le matin même du 6 octobre 2026.
 *
 * La règle qui en sort : toute table de mots affichés a besoin de son propre
 * cliquet de couverture. Celle-ci est la troisième, après la barre du desk et
 * les contrôles de Santé.
 */
describe("les mots du dépôt des bulletins passent en anglais", () => {
  it("chaque famille de remarque : son libellé et son conseil", () => {
    vide("familles", inventaire(FAMILLES.flatMap((f) => [f.libelle, f.quoiFaire])));
  });

  it("chaque vue : son nom et sa phrase", () => {
    vide("vues", inventaire(VUES.flatMap((v) => [v.nom, v.dit])));
  });

  it("et les deux tables regardent bien quelque chose", () => {
    // Une table vidée passerait les deux tests précédents sans rien couvrir.
    expect(FAMILLES.length).toBeGreaterThanOrEqual(18);
    expect(VUES.length).toBeGreaterThanOrEqual(4);
  });
});

/**
 * LES MOTIFS D'UN JUGEMENT PASSENT EN ANGLAIS.
 *
 * Quatrième table de mots affichés, quatrième cliquet : `libelle` et `dit`
 * traversent tous deux `t()` sous forme de variable, donc le scanner de clefs
 * ne les voit pas. Un motif choisi dans une liste déroulante en français au
 * milieu d'une interface anglaise est précisément le défaut que ces cliquets
 * existent pour fermer.
 */
describe("les motifs d'un jugement de bulletin passent en anglais", () => {
  it("chaque motif : son libellé et ce qu'il affirme", () => {
    vide("motifs de jugement", inventaire(MOTIFS.flatMap((m) => [MOTIFS_DE_JUGEMENT[m].libelle, MOTIFS_DE_JUGEMENT[m].dit])));
  });

  it("et la table regarde bien quelque chose", () => {
    expect(MOTIFS.length).toBe(6);
  });
});

/**
 * LES REFUS D'UNE NOTE DE BUDGET PASSENT EN ANGLAIS.
 *
 * Cinquième table, même angle mort : le formulaire rend `t(r.message)`, donc
 * le scanner de clefs ne voit rien. Un desk anglais se verrait refuser sa note
 * en français, sans comprendre laquelle des règles il vient de heurter — et
 * c'est au moment du refus qu'un message incompréhensible coûte le plus cher.
 *
 * C'EST POUR CELA QUE LES MESSAGES SONT DES CONSTANTES et que l'extrait fautif
 * vit à côté : interpolés ensemble, ils feraient une phrase différente à chaque
 * faute, qu'aucun dictionnaire ne pourrait couvrir.
 */
describe("les refus d'une note de budget passent en anglais", () => {
  it("chaque règle : sa phrase", () => {
    vide("refus d'une note", inventaire(Object.values(REFUS)));
  });

  it("et la table regarde bien quelque chose", () => {
    expect(Object.keys(REFUS).length).toBeGreaterThanOrEqual(10);
  });

  /* ET LES LIBELLÉS QUE LA NOTE FIGE DANS LA BASE. Écrits une fois pour
     toutes au moment de l'écriture, la seule langue qui leur reste est celle
     du rendu : `t(e.libelle)` sur la fiche, donc une clef ici. Ceux qui
     viennent du document — « Transferts et subventions » — n'en sont pas :
     c'est le mot de la loi, et le traduire serait le réécrire. */
  it("et nos libellés du relevé, figés dans la base", () => {
    vide("libellés du relevé", inventaire(Object.values(LIBELLES_DU_RELEVE)));
  });

  /* ET LES GABARITS DU CARNET. La page rend t(DIT[genre], params) : le
     scanner de clefs ne voit rien, et un desk anglais lirait ses signaux en
     français. La clef est le GABARIT, trous compris — une phrase déjà
     composée n'aurait jamais d'entrée. */
  it("et les gabarits du carnet, trous compris", () => {
    vide("gabarits du carnet", inventaire(Object.values(DIT)));
  });

  it("et le carnet regarde bien quelque chose", () => {
    expect(Object.keys(DIT).length).toBe(5);
  });

  /* ET LES MOTIFS DU REFUS DU POURCENTAGE. Un refus que le desk anglais lit en
     français se prend pour une panne, et quelqu'un fait la division à la main. */
  it("et les motifs du refus, trous compris", () => {
    vide("motifs du refus", inventaire(Object.values(POURQUOI)));
  });
});
