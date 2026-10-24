import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RACINE } from "./racine";
import { SEED_BUDGETS, SEED_NOTES_BUDGET } from "@/data/budgets-seed";
import { amortissementImplicite, ecartsEntre, estComplet, financementBoucle, foisLeDeficit, partDesTitres, paysDuSlug, porteDesTitres, slugDuPays, sommeDes, PAYS_CEMAC } from "@/lib/market/budget";

const lire = (p: string) => fs.readFileSync(path.join(RACINE, p), "utf8");
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const cameroun = () => SEED_BUDGETS.find((b) => b.pays === "Cameroun")!;

/**
 * LE BUDGET DES SIX ÉTATS, ET CE QUE LA PAGE N'A PAS LE DROIT DE FAIRE.
 *
 * Trois interdits portent cette page, et chacun vient d'un chiffre faux qu'on
 * aurait pu écrire d'une précision rassurante.
 */
describe("les budgets des États", () => {
  /**
   * LE PLAN DE FINANCEMENT BOUCLE, ET C'EST CE QUI DIT QU'IL EST LE VRAI.
   *
   * Les six portes du Cameroun donnent 3 104,2 milliards au centime. Si cette
   * épreuve tombe, c'est que le relevé a été recopié de travers ou qu'une
   * porte a été inventée — dans les deux cas le tableau cesse d'être le
   * tableau de la loi pour devenir une reconstitution.
   */
  it("bouclent exactement sur le besoin déclaré, là où le relevé est complet", () => {
    const b = cameroun();
    const boucle = financementBoucle(b)!;
    expect(boucle, "le Cameroun n'a plus de plan de financement mesurable").toBeDefined();
    expect(boucle.ecart, `les six portes donnent ${boucle.somme} pour un besoin déclaré de ${b.besoinDeFinancement}`).toBe(0);
  });

  /**
   * LE SOLDE NE SE RECALCULE JAMAIS, et l'écart se montre plutôt que de se
   * résorber. Les deux agrégats du Cameroun donnent −323,5 quand la loi écrit
   * −631,0 : les périmètres diffèrent. Une page qui afficherait la
   * soustraction aurait l'air juste et serait fausse.
   */
  it("gardent le solde ÉCRIT par le document, et non la soustraction", () => {
    const b = cameroun();
    const parSoustraction = sommeDes(b.recettes) - sommeDes(b.depenses);
    expect(b.soldeDeclare, "le solde déclaré a disparu du relevé").toBeDefined();
    expect(
      parSoustraction,
      "la soustraction des deux agrégats est tombée d'accord avec le solde déclaré : vérifier que les périmètres ont bien été tranchés avant de retirer cette épreuve",
    ).not.toBe(b.soldeDeclare);
    /* Et la page ne doit nulle part faire cette soustraction pour l'afficher
       comme un solde : elle montre les deux sommes, séparément. */
    const fiche = code("src/app/desk/budgets/[pays]/page.tsx");
    expect(fiche, "la fiche recalcule un solde").not.toMatch(/sommeRecettes\s*-\s*sommeDepenses/);
  });

  /**
   * LE BESOIN VAUT PLUSIEURS FOIS LE DÉFICIT, et c'est la leçon centrale de
   * la page : qui raisonne « déficit donc émissions » se trompe largement.
   * Si ce rapport tombait sous deux, l'argument de la page s'effondrerait et
   * il faudrait la réécrire, pas la laisser dire le contraire des chiffres.
   */
  it("montrent un besoin très supérieur au déficit", () => {
    const b = cameroun();
    const fois = foisLeDeficit(b)!;
    expect(fois, `le besoin ne vaut plus que ${fois?.toFixed(2)} fois le déficit : l'argument de la page est à revoir`).toBeGreaterThan(3);
    expect(amortissementImplicite(b), "l'amortissement implicite n'est plus mesurable").toBeGreaterThan(0);
  });

  /* LA PORTE DES TITRES EST UNE MINORITÉ DU BESOIN, et c'est pourquoi les six
     se montrent ensemble : la montrer seule ferait croire qu'elle décide. */
  it("situent la porte des titres parmi les autres, et non seule", () => {
    const b = cameroun();
    const part = partDesTitres(b)!;
    expect(porteDesTitres(b)?.cle, "la porte des titres n'est plus marquée").toBe("titres");
    expect(part, "la part des titres est devenue majoritaire : la page le dirait autrement").toBeLessThan(0.5);
    expect(b.financement.length, "les autres portes ont disparu : la ligne des titres paraîtrait seule").toBeGreaterThan(3);
  });

  /**
   * AUCUN TOTAL DE ZONE. Six millésimes différents, dont plusieurs révisés et
   * plusieurs inconnus. C'est le même refus que « Dette des États », qui
   * montre deux colonnes et pas un total.
   */
  it("n'additionnent jamais les six", () => {
    const domaine = code("src/lib/market/budget.ts");
    const liste = code("src/app/desk/budgets/page.tsx");
    for (const [nom, src] of [
      ["le domaine", domaine],
      ["la liste", liste],
    ] as const) {
      expect(src, `${nom} additionne les budgets des six États`).not.toMatch(/budgets\.reduce|liste\.reduce|\.reduce\([^)]*budgetTotal/);
      expect(src, `${nom} totalise les besoins de financement de la zone`).not.toMatch(/reduce[\s\S]{0,60}besoinDeFinancement/);
    }
    expect(liste, "la page ne dit plus pourquoi elle refuse le total de zone").toMatch(/CEMAC/);
  });

  /**
   * CE QUI N'A PAS ÉTÉ RELEVÉ EST NOMMÉ. Quatre États sur six sont incomplets
   * au 25 octobre 2026, et c'est l'état réel du dossier. Un budget incomplet
   * sans « à relever » laisserait croire à une couverture qui n'existe pas —
   * exactement le défaut que le semis des séances avait déjà coûté.
   */
  it("nomment ce qui manque, au lieu de laisser le vide parler", () => {
    const muets = SEED_BUDGETS.filter((b) => !estComplet(b) && !(b.aRelever?.length ?? 0));
    expect(
      muets.map((b) => b.pays),
      "un budget incomplet ne dit pas ce qui lui manque : son silence se lirait comme une couverture",
    ).toEqual([]);
    /* Non vacuité : si tout devenait complet, l'épreuve ci-dessus passerait
       au vert sans rien avoir regardé. */
    expect(SEED_BUDGETS.length, "le relevé ne porte plus les six États").toBe(6);
    expect(SEED_BUDGETS.filter(estComplet).length, "aucun budget complet : la page n'a plus rien à montrer en entier").toBeGreaterThan(0);
  });

  /* CHAQUE CHIFFRE PORTE SA SOURCE ET SA DATE. Un montant sans millésime ne
     veut rien dire six mois plus tard — le Gabon est passé de 7 233 à 5 495
     en cours d'année. */
  it("portent tous leur loi, leur source et sa date", () => {
    for (const b of SEED_BUDGETS) {
      expect(b.loi.length, `${b.pays} n'a plus de texte en vigueur`).toBeGreaterThan(5);
      expect(b.source.texte.length, `${b.pays} n'a plus de source`).toBeGreaterThan(5);
      expect(b.source.releveLe, `${b.pays} n'a plus de date de relevé`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  /* LES SLUGS FONT L'ALLER-RETOUR : sans accent ni espace, et stables. */
  it("se retrouvent par leur adresse", () => {
    for (const p of PAYS_CEMAC) {
      const s = slugDuPays(p);
      expect(s, `${p} a une adresse mal formée`).toMatch(/^[a-z-]+$/);
      expect(paysDuSlug(s), `l'adresse « ${s} » ne revient pas sur ${p}`).toBe(p);
    }
    expect(paysDuSlug("belgique"), "une adresse inconnue rend un pays").toBeUndefined();
  });
});

/**
 * LA NOTE DU DESK, ET LA SEULE DISCIPLINE QUI LUI RESTE.
 *
 * Une note publiée est tenue par ses lecteurs ; une note interne est lue par
 * cinq personnes qui pensent déjà pareil. En retirant le lecteur extérieur, on
 * retire la seule contradiction gratuite — d'où « ce que la note précédente a
 * mal lu », OBLIGATOIRE, et qui vide doit quand même l'écrire.
 */
describe("les notes du desk", () => {
  it("portent toutes leur auto-correction, même la première", () => {
    for (const n of SEED_NOTES_BUDGET) {
      expect(n.malLu.trim().length, `la note n° ${n.numero} sur ${n.pays} ne dit pas ce que la précédente a mal lu`).toBeGreaterThan(20);
    }
    expect(SEED_NOTES_BUDGET.length, "plus aucune note semée : le fil de la fiche ne se juge plus").toBeGreaterThan(0);
  });

  /* CONSTAT ET LECTURE NE SE MÉLANGENT JAMAIS, et une note qui ne porterait
     que des constats ne serait pas une note : elle n'engagerait personne. */
  it("séparent le constat de la lecture, et portent les deux", () => {
    for (const n of SEED_NOTES_BUDGET) {
      const genres = new Set(n.corps.map((p) => p.genre));
      expect([...genres].sort(), `la note n° ${n.numero} ne porte pas les deux genres`).toEqual(["constat", "lecture"]);
    }
  });

  /**
   * UN JUGEMENT S'ÉCRIT AU CONDITIONNEL, avec son déclencheur nommé. Entre
   * collègues aussi, une phrase affirmative se retient comme un fait : c'est
   * là que le langage clair est le plus dangereux.
   */
  it("écrivent leurs lectures au conditionnel", () => {
    for (const n of SEED_NOTES_BUDGET) {
      const lectures = n.corps.filter((p) => p.genre === "lecture");
      expect(lectures.length, `la note n° ${n.numero} ne porte aucune lecture`).toBeGreaterThan(0);
      const sansSi = lectures.filter((p) => !/\bsi\b/i.test(p.texte) && !/pourrait|peut|semble|nous ne savons pas/i.test(p.texte));
      expect(sansSi.map((p) => p.texte.slice(0, 60)), `une lecture est écrite comme un fait dans la note n° ${n.numero}`).toEqual([]);
    }
  });

  /* ET AUCUN CONSEIL, la règle de la maison valant ici comme ailleurs. */
  it("ne conseillent rien", () => {
    const interdits = /recommand|conseill|il faut acheter|opportunité à saisir|meilleur placement/i;
    for (const n of SEED_NOTES_BUDGET) {
      const texte = [n.titre, n.enUnePhrase, ...n.corps.map((p) => p.texte), ...n.surveiller].join(" ");
      expect(interdits.test(texte), `la note n° ${n.numero} conseille`).toBe(false);
    }
  });

  /**
   * L'ÉCART SE CALCULE, IL NE SE RÉDIGE PAS. Et un chiffre que la note
   * précédente portait et que celle-ci ne porte plus est un changement, lui
   * aussi : la page ne doit pas le perdre en silence.
   */
  it("produisent leur tableau d'écarts, pertes comprises", () => {
    const n1 = SEED_NOTES_BUDGET[0];
    const precedente = { ...n1, releve: [{ cle: "baril_loi", libelle: "Baril retenu par la loi", valeur: "55,00 $" }, { cle: "disparu", libelle: "Un poste retiré", valeur: "12" }] };
    const e = ecartsEntre(precedente, n1);
    expect(e.find((x) => x.cle === "baril_loi")?.change, "un chiffre qui bouge n'est plus signalé").toBe(true);
    expect(e.find((x) => x.cle === "millesime")?.avant, "un chiffre neuf ne devrait avoir aucun avant").toBeUndefined();
    const perdu = e.find((x) => x.cle === "disparu");
    expect(perdu?.change, "un chiffre que la note ne reprend plus disparaît en silence").toBe(true);
    expect(perdu?.apres, "un chiffre perdu ne devrait avoir aucun après").toBeUndefined();
    /* Sans note précédente, tout est neuf et rien ne « change ». */
    expect(ecartsEntre(undefined, n1).every((x) => x.change), "la première note signale des changements qu'elle ne peut pas connaître").toBe(true);
  });
});

/**
 * LA PAGE EST INTERNE, ET CELA SE VÉRIFIE PLUTÔT QUE DE SE PROMETTRE.
 *
 * « Pas publiée » décrit une intention ; ce qui la tient, c'est qu'aucune
 * route ne s'ouvre sans un poste du desk, et que « Vue client » — le groupe
 * qui sert à voir ce que le client voit — n'en porte rien.
 */
describe("la page des budgets", () => {
  it("ne s'ouvre à personne sans un poste du desk", () => {
    for (const f of ["src/app/desk/budgets/page.tsx", "src/app/desk/budgets/[pays]/page.tsx"]) {
      expect(code(f), `${f} ne demande plus de poste du desk`).toMatch(/await requireDesk\(\)/);
    }
  });

  it("n'a aucun reflet côté client", () => {
    const groupes = code("src/lib/desk-groupes.ts");
    const vueClient = groupes.slice(groupes.indexOf("Vue client"));
    expect(vueClient.includes("/desk/budgets"), "« Vue client » porte la page des budgets : elle cesserait d'être interne").toBe(false);
    /* Et aucune route publique ne la double. */
    const routes = fs.readdirSync(path.join(RACINE, "src/app"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    expect(routes.includes("budgets"), "une route publique « /budgets » double la page du desk").toBe(false);
  });

  /* ELLE EST AU RAIL, SINON PERSONNE NE LA TROUVE. Une page sans entrée est
     une page qui n'existe que pour celui qui connaît son adresse. */
  it("est rangée au rail du desk, dans « Le marché »", () => {
    const groupes = lire("src/lib/desk-groupes.ts");
    expect(groupes, "la page n'est plus au rail du desk").toMatch(/\["\/desk\/budgets", "Budgets des États"\]/);
    const marche = groupes.slice(groupes.indexOf('label: "Le marché"'), groupes.indexOf('label: "Publier"'));
    expect(marche.includes("/desk/budgets"), "la page a quitté le groupe « Le marché »").toBe(true);
    expect(marche.indexOf("/desk/budgets") > marche.indexOf("/desk/dette"), "la page ne suit plus « Dette des États » : le stock se lit avant le flux").toBe(true);
  });
});
