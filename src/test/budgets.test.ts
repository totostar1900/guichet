import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RACINE } from "./racine";
import { SEED_BUDGETS, SEED_NOTES_BUDGET } from "@/data/budgets-seed";
import { memoryRepository } from "@/lib/data/memory";
import { amortissementImplicite, ecartsEntre, estComplet, financementBoucle, foisLeDeficit, partDesTitres, paysDuSlug, porteDesTitres, slugDuPays, sommeDes, PAYS_CEMAC } from "@/lib/market/budget";
import { LIBELLES_DU_RELEVE, MIN, REFUS, numeroSuivant, releveDuBudget, verifierNote, type BrouillonNote } from "@/lib/market/note-budget";

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

  /**
   * LE SEMIS EST JUSTICIABLE DE LA RÈGLE VIVANTE, et non d'une copie.
   *
   * Les trois épreuves qui suivaient lisaient le semis et réécrivaient la
   * règle à la main. C'était tenable tant qu'aucune note ne pouvait entrer
   * autrement que par un fichier du dépôt. Depuis que le desk en écrit une
   * depuis un formulaire, une garde qui ne juge que l'archive garde une
   * vitrine pendant que la porte est ouverte à côté : elle resterait verte
   * quoi qu'on écrive. Elle passe donc par `verifierNote`, celui-là même que
   * l'action serveur appelle.
   */
  it("passent la règle que le formulaire applique", () => {
    for (const n of SEED_NOTES_BUDGET) {
      const refus = verifierNote(n as BrouillonNote);
      expect(refus.map((r) => `${r.champ} · ${r.message}`), `la note semée n° ${n.numero} ne passerait pas le formulaire`).toEqual([]);
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
 * ÉCRIRE UNE NOTE DEPUIS L'ÉCRAN, ET CE QUE LA PORTE LAISSE PASSER.
 *
 * Tant que les notes étaient semées, leur discipline pouvait vivre dans un
 * essai : rien n'entrait sans passer par le dépôt. Elle vit maintenant dans
 * `verifierNote`, et c'est ELLE qu'on éprouve ici — le semis n'en est plus
 * qu'un justiciable parmi d'autres.
 *
 * CHAQUE RÈGLE EST VÉRIFIÉE À L'ENVERS : on part d'un brouillon qui passe, on
 * casse un point, et on exige le refus. Une épreuve qui ne regarde que le cas
 * conforme ne prouve pas que la règle mord ; celle-là a déjà menti deux fois
 * dans ce dépôt.
 */
const bonBrouillon = (): BrouillonNote => ({
  titre: "Le collectif budgétaire a été déposé",
  enUnePhrase: "Le texte déposé ramène le budget de 8 816 à 8 200 milliards, et la ligne des titres publics n'y bouge pas.",
  motif: "Dépôt du collectif en session de novembre",
  demandeePar: "Desk Purpose Capital",
  corps: [
    { genre: "constat", texte: "Le collectif déposé le 12 novembre ramène le budget total de 8 816,4 à 8 200,0 milliards, les postes d'investissement portant l'essentiel de la coupe." },
    { genre: "lecture", texte: "Si le texte est voté en l'état, alors la ligne des titres publics reste à 400 milliards : c'est l'investissement qui absorbe, et non le financement de marché." },
  ],
  surveiller: ["Le vote du collectif, attendu avant la fin de la session."],
  malLu: "La note n° 1 tenait la révision pour incertaine dans son ampleur ; le dépôt la chiffre, et sa fourchette était trop large.",
});

describe("écrire une note du desk", () => {
  /* NON-VACUITÉ : sans celle-ci, toutes les épreuves qui suivent passeraient
     avec un `verifierNote` qui refuserait tout. */
  it("laisse passer une note bien faite, sans un seul refus", () => {
    expect(verifierNote(bonBrouillon()).map((r) => `${r.champ} · ${r.message}`), "une note conforme est refusée : la porte est murée").toEqual([]);
  });

  it("refuse une note sans constat, et une note sans lecture", () => {
    const sansConstat = { ...bonBrouillon(), corps: bonBrouillon().corps.filter((p) => p.genre === "lecture") };
    expect(verifierNote(sansConstat).map((r) => r.message), "une note sans constat passe").toContain(REFUS.sansConstat);
    const sansLecture = { ...bonBrouillon(), corps: bonBrouillon().corps.filter((p) => p.genre === "constat") };
    expect(verifierNote(sansLecture).map((r) => r.message), "une note sans lecture passe : elle n'engagerait personne").toContain(REFUS.sansLecture);
  });

  /**
   * LE CŒUR DE LA RÈGLE. Entre collègues aussi une phrase affirmative se
   * retient comme un fait, et c'est là que le langage clair est le plus
   * dangereux : une lecture doit nommer ce qui la déclenche.
   */
  it("refuse une lecture écrite comme un fait, et accepte la même au conditionnel", () => {
    const affirmative = {
      ...bonBrouillon(),
      corps: [bonBrouillon().corps[0], { genre: "lecture" as const, texte: "La ligne des titres publics restera à 400 milliards : c'est l'investissement qui absorbe la coupe." }],
    };
    const refus = verifierNote(affirmative);
    expect(refus.map((r) => r.message), "une lecture affirmative passe").toContain(REFUS.lectureAffirmative);
    /* ET LE REFUS NOMME LA PHRASE : « un paragraphe est fautif » sur six
       paragraphes fait relire les six. */
    expect(refus.find((r) => r.message === REFUS.lectureAffirmative)?.extrait, "le refus ne dit pas laquelle des phrases").toMatch(/ligne des titres/);
    expect(verifierNote(bonBrouillon()).map((r) => r.message), "la même au conditionnel est refusée").not.toContain(REFUS.lectureAffirmative);
  });

  it("exige l'auto-correction, même pour dire qu'il n'y a rien à corriger", () => {
    expect(verifierNote({ ...bonBrouillon(), malLu: "" }).map((r) => r.message), "une note sans auto-correction passe").toContain(REFUS.malLu);
    expect(verifierNote({ ...bonBrouillon(), malLu: "Rien." }).map((r) => r.message), "trois lettres tiennent lieu d'auto-correction").toContain(REFUS.malLu);
  });

  /* UNE NOTE SE DEMANDE, elle ne tombe pas à date fixe : sans motif ni
     demandeur obligatoires, la série deviendrait un calendrier. */
  it("exige le motif et le demandeur", () => {
    expect(verifierNote({ ...bonBrouillon(), motif: "" }).map((r) => r.message), "une note sans motif passe").toContain(REFUS.motif);
    expect(verifierNote({ ...bonBrouillon(), demandeePar: "" }).map((r) => r.message), "une note sans demandeur passe").toContain(REFUS.demandeePar);
  });

  it("ne conseille rien", () => {
    const d = bonBrouillon();
    const conseille = { ...d, surveiller: [...d.surveiller, "C'est le meilleur placement de la zone à ce jour."] };
    expect(verifierNote(conseille).map((r) => r.message), "un conseil passe").toContain(REFUS.conseil);
  });

  /* ET TOUS LES REFUS D'UN COUP : un formulaire qui en rend un à la fois fait
     recommencer cinq fois, et au cinquième on écrit n'importe quoi. */
  it("rend tous les manquements ensemble", () => {
    const vide: BrouillonNote = { titre: "", enUnePhrase: "", motif: "", demandeePar: "", corps: [], surveiller: [], malLu: "" };
    expect(new Set(verifierNote(vide).map((r) => r.champ)), "le refus ne nomme pas tous les champs fautifs").toEqual(
      new Set(["titre", "enUnePhrase", "motif", "demandeePar", "malLu", "corps"]),
    );
  });

  /**
   * LE RELEVÉ SE PREND SUR LA FICHE. S'il se saisissait, deux notes
   * compareraient de l'orthographe : « 62,38 $ » contre « 62.38 USD » se
   * lirait comme un mouvement du baril.
   */
  it("prend son relevé sur le budget, valeurs comprises", () => {
    const r = releveDuBudget(cameroun());
    expect(r.map((x) => x.cle), "le relevé a changé de postes").toEqual(["millesime", "baril_loi", "baril_constate", "solde", "besoin", "programme_titres"]);
    const par = Object.fromEntries(r.map((x) => [x.cle, x.valeur]));
    expect(par.millesime, "le millésime n'est plus relevé tel qu'il est en vigueur").toBe("LFI 2026, révision annoncée");
    expect(par.baril_loi, "l'hypothèse de baril de la loi n'est plus relevée").toBe("62,38 $");
    expect(par.besoin, "le besoin de financement n'est plus relevé").toBe("3 104,2 Md");
    expect(par.programme_titres, "le programme de titres n'est plus relevé").toBe("400,0 Md");
  });

  /**
   * ET LE SEMIS LE PREND AU MÊME ENDROIT. Sans cela, la première note écrite
   * depuis l'écran afficherait six lignes « changées » qui n'ont pas bougé —
   * exactement le bruit que le tableau des écarts sert à éviter.
   */
  it("aligne le relevé des notes semées sur celui du budget", () => {
    for (const n of SEED_NOTES_BUDGET) {
      const b = SEED_BUDGETS.find((x) => x.pays === n.pays && x.exercice === n.exercice)!;
      expect(n.releve.map((x) => x.cle), `la note n° ${n.numero} relève d'autres postes que sa fiche`).toEqual(releveDuBudget(b).map((x) => x.cle));
    }
  });

  it("donne à la note suivante le rang qui suit", () => {
    expect(numeroSuivant([]), "la première note d'un État ne part pas de 1").toBe(1);
    expect(numeroSuivant(SEED_NOTES_BUDGET), "le rang suivant ne suit pas la série").toBe(2);
  });

  /**
   * LE SERVEUR NE CROIT PAS LE FORMULAIRE. Le formulaire tient la règle pour
   * que le bouton reste fermé — un bouton qui mène à un refus prévisible est
   * une petite trahison —, mais un formulaire se contourne.
   */
  it("rejoue la règle dans l'action serveur, et signe l'écriture", () => {
    const a = code("src/app/desk/budgets/[pays]/actions.ts");
    expect(a, "l'action n'exige plus un poste du desk").toMatch(/await requireDesk\(/);
    expect(a, "l'action ne rejoue plus la règle : le formulaire serait seul juge").toMatch(/verifierNote\(/);
    expect(a, "l'écriture d'une note ne passe plus par le journal d'audit").toMatch(/await audit\(/);
    /* LE RELEVÉ NE VIENT PAS DU FORMULAIRE : il est pris sur la fiche. */
    expect(a, "le relevé n'est plus calculé sur le budget").toMatch(/releveDuBudget\(budget\)/);
    expect(a.includes('form.get("releve")'), "le relevé est accepté depuis le formulaire : deux notes compareraient de la prose").toBe(false);
    /* ET LE RANG NON PLUS : laissé au rédacteur, il se chevaucherait. */
    expect(a.includes('form.get("numero")'), "le rang de la note est accepté depuis le formulaire").toBe(false);
  });

  /**
   * DEUX NOTES NE PARTAGENT PAS UN RANG. « Depuis la n° 2 » ne désignerait
   * plus rien, et le fil de la fiche se lirait dans le désordre. La base le
   * refuse par une contrainte d'unicité ; en mémoire, c'est le dépôt ou rien.
   */
  it("refuse deux notes au même rang", async () => {
    const n1 = SEED_NOTES_BUDGET[0];
    const jumelle = { ...n1, id: "nb-doublon" };
    await expect(memoryRepository.createNoteBudget(jumelle), "un rang déjà pris est accepté une seconde fois").rejects.toThrow();
    /* NON-VACUITÉ : le rang suivant, lui, passe. */
    const suivante = { ...n1, id: "nb-suivante", numero: numeroSuivant(SEED_NOTES_BUDGET) };
    await expect(memoryRepository.createNoteBudget(suivante), "le rang suivant est refusé : le dépôt est muré").resolves.toBeTruthy();
  });

  /**
   * L'ADRESSE ET LE NOM NE S'ÉCHANGENT PAS. Confondus, le desk se voit
   * proposer d'écrire une note sur « guinee-equatoriale ». Trouvé à l'écran,
   * et pas autrement : rien dans les types ne distingue deux chaînes.
   */
  it("passe au formulaire l'adresse ET le nom de l'État", () => {
    const p = code("src/app/desk/budgets/[pays]/page.tsx");
    expect(p, "le formulaire ne reçoit plus les deux : l'écran affichera l'adresse").toMatch(/<RedigerNote[^>]*slug=\{slug\}[^>]*pays=\{b\.pays\}/);
    const f = code("src/app/desk/budgets/[pays]/RedigerNote.tsx");
    expect(f, "le champ caché n'envoie plus l'adresse : l'action ne retrouvera pas l'État").toMatch(/name="pays" value=\{slug\}/);
  });

  /**
   * NE TRADUIRE QUE CE QUI EST DE NOUS.
   *
   * Faute d'entrée au dictionnaire, `t()` traduit mot à mot : l'intitulé de la
   * loi « Prix du baril retenu » revenait en « Price du baril retenu », un
   * hybride pire que le français laissé tel quel. Le tri se fait donc sur la
   * CLEF du poste, jamais sur la phrase — une phrase ne dit pas d'où elle
   * vient. Trouvé en lisant la page en anglais, pas autrement.
   */
  it("ne passe au dictionnaire que les libellés qui sont de nous", () => {
    const p = code("src/app/desk/budgets/[pays]/page.tsx");
    expect(p, "tous les libellés passent par t() : les intitulés de la loi reviendront à moitié traduits").toMatch(
      /e\.cle in LIBELLES_DU_RELEVE \? t\(e\.libelle\) : e\.libelle/,
    );
    /* Et les quatre clefs du relevé sont bien celles que le budget produit. */
    const b = cameroun();
    const nôtres = releveDuBudget(b).filter((x) => x.cle in LIBELLES_DU_RELEVE);
    expect(nôtres.map((x) => x.cle).sort(), "les libellés traduits ne sont plus ceux que la fiche produit").toEqual(
      ["besoin", "millesime", "programme_titres", "solde"],
    );
    /* NON-VACUITÉ : il reste des libellés venus du document, sinon le tri ne
       trierait rien. */
    expect(releveDuBudget(b).some((x) => !(x.cle in LIBELLES_DU_RELEVE)), "plus aucun libellé ne vient du document : le tri est inutile").toBe(true);
  });

  it("lit la même règle au formulaire et au serveur", () => {
    const f = code("src/app/desk/budgets/[pays]/RedigerNote.tsx");
    expect(f, "le formulaire a sa propre copie de la règle : les deux vont diverger").toMatch(/from "@\/lib\/market\/note-budget"/);
    expect(f, "le bouton reste ouvert sur un refus prévisible").toMatch(/disabled=\{[^}]*refus\.length/);
  });

  /**
   * LA BASE PORTE LES MÊMES PLANCHERS, parce qu'une règle qui n'existe qu'en
   * TypeScript se contourne par un script. Deux copies dérivent : celle-ci les
   * compare chiffre à chiffre.
   */
  it("garde les mêmes planchers en base qu'en TypeScript", () => {
    const sql = lire("supabase/migrations/0113_note_budget_discipline.sql");
    for (const [champ, colonne] of [
      ["malLu", "mal_lu"],
      ["motif", "motif"],
      ["titre", "titre"],
    ] as const) {
      const m = sql.match(new RegExp(`length\\(btrim\\(${colonne}\\)\\) >= (\\d+)`));
      expect(m, `la base ne garde plus « ${colonne} »`).not.toBeNull();
      const attendu = champ === "malLu" ? MIN.malLu : champ === "motif" ? MIN.motif : MIN.titre;
      expect(Number(m![1]), `le plancher de « ${colonne} » a dérivé entre la base et le domaine`).toBe(attendu);
    }
    expect(sql, "la base n'exige plus les deux genres").toMatch(/@\.genre == "constat"/);
    expect(sql, "la base n'exige plus les deux genres").toMatch(/@\.genre == "lecture"/);
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
