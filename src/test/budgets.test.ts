import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RACINE } from "./racine";
import { REFERENCES_ZONE, SEED_BUDGETS, SEED_NOTES_BUDGET } from "@/data/budgets-seed";
import { memoryRepository } from "@/lib/data/memory";
import { ISSUER_REGISTRY } from "@/data/issuer-registry";
import { ISSUERS } from "@/data/issuers";
/* LE RELEVÉ BRUT, ET NON `SEANCES` : celui-ci est vide sous vitest, le
   semis dense étant réservé à la branche d'essai et à `dev:memory` — six
   épreuves prennent le dépôt mémoire pour fixture et comptent sur ses huit
   lignes. Lire le JSON directement éprouve les VRAIES séances sans déplacer
   le socle de personne. */
import brut from "@/data/reference.json";
import type { AuctionResult } from "@/lib/market/auction-results";

const SEANCES = ((brut as { seances?: unknown[] }).seances ?? []) as AuctionResult[];
import { amortissement, amortissementImplicite, ecartsEntre, piecesSuivies, estComplet, financementBoucle, foisLeDeficit, partDesTitres, paysDuSlug, porteDesTitres, slugDuPays, sommeDes, PAYS_CEMAC , trousDe} from "@/lib/market/budget";
import { LIBELLES_DU_RELEVE, MIN, REFUS, numeroSuivant, releveDuBudget, verifierNote, type BrouillonNote } from "@/lib/market/note-budget";
import { DIT, MOIS_AVANT_DE_S_INQUIETER, carnet, moisEntre, signauxDe } from "@/lib/market/carnet";
import { SEANCES_MINIMUM, SERVICE_FAIBLE, joursEntre, leveDe, placeSurDeclare, pourquoiPasDeTaux } from "@/lib/market/leve";

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
  /**
   * LES AGRÉGATS SONT CEUX DE LA LOI PROMULGUÉE, ET ILS SONT ÉPINGLÉS.
   *
   * Ils venaient d'une reprise de presse, puis de l'exposé des motifs du
   * PROJET, puis — le 24 octobre — de la présentation de lancement publiée
   * par la DGB après promulgation, qui imprime les deux colonnes du budget
   * général. Les épingler ici fait tomber l'épreuve le jour où quelqu'un les
   * reprendra sans ouvrir la pièce : c'est déjà arrivé deux fois, dont une
   * pour deux cents milliards, un 8 lu pour un 6.
   */
  it("portent les postes de la loi promulguée, au dixième", () => {
    const b = cameroun();
    expect(sommeDes(b.recettes) / 1000, "les recettes propres ne sont plus les cinq lignes de la loi").toBe(5686.9);
    expect(sommeDes(b.depenses) / 1000, "les dépenses hors principal ne sont plus celles de la loi").toBe(6210.5);
    expect(b.soldeDeclare! / 1000, "le solde déclaré a bougé").toBe(-631);
    expect(b.besoinDeFinancement! / 1000, "le besoin de financement a bougé").toBe(3104.2);
    /* LES EMPRUNTS NE SONT PAS UNE RECETTE. La loi les range dans sa colonne
       des recettes — 2 996,8 —, et les y reprendre rendrait le solde muet. */
    expect(b.recettes.some((r) => /emprunt/i.test(r.libelle)), "une ressource d'emprunt est rangée en recette : le solde ne veut plus rien dire").toBe(false);
  });

  /**
   * UN CHIFFRE PUBLIÉ PASSE DEVANT SA DÉDUCTION, toujours. La loi imprime
   * « dépenses de la dette 2 473,4 » ; la soustraction besoin − déficit donne
   * 2 473,2. Les deux tombent à 0,2 près, et c'est justement pourquoi il faut
   * dire lequel est montré : un écart qu'on ne s'explique pas vaut mieux
   * qu'un chiffre dont on ne sait plus s'il a été lu ou calculé.
   */
  it("montre l'amortissement publié plutôt que déduit, et le dit", () => {
    const b = cameroun();
    const a = amortissement(b)!;
    expect(a.publie, "l'amortissement affiché est redevenu une déduction").toBe(true);
    expect(a.montant / 1000, "l'amortissement publié a bougé").toBe(2473.4);
    /* La déduction reste bonne, et proche : c'est ce qui donne confiance aux
       fiches où seul le calcul est possible. */
    expect(Math.abs(amortissementImplicite(b)! - a.montant) / 1000, "la déduction s'écarte du publié de plus de deux dixièmes").toBeLessThanOrEqual(0.2);
    /* NON-VACUITÉ : sans chiffre publié, c'est la déduction qui sort. */
    const sans = amortissement({ ...b, amortissementPublie: undefined })!;
    expect(sans.publie, "une fiche sans chiffre publié prétend en avoir un").toBe(false);
    expect(sans.montant / 1000, "la déduction a changé").toBe(2473.2);
  });

  it("bouclent exactement sur le besoin déclaré, là où le relevé est complet", () => {
    const b = cameroun();
    const boucle = financementBoucle(b)!;
    expect(boucle, "le Cameroun n'a plus de plan de financement mesurable").toBeDefined();
    expect(boucle.ecart, `les six portes donnent ${boucle.somme} pour un besoin déclaré de ${b.besoinDeFinancement}`).toBe(0);
  });

  /**
   * LE SOLDE NE SE RECALCULE JAMAIS, et l'écart se montre plutôt que de se
   * résorber. Les deux agrégats du Cameroun donnent −523,5 quand la loi écrit
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
  /**
   * LES CHIFFRES CITÉS DANS UNE NOTE SE VÉRIFIENT.
   *
   * La note n° 2 avance deux parts du programme de titres, selon qu'on les
   * rapporte aux emprunts votés ou au besoin de l'exposé. Écrites à la main,
   * elles sont sorties à 13,4 % quand la division donne 13,3 — un dixième,
   * mais c'est exactement la précision rassurante que cette page refuse
   * ailleurs. Recalculées ici, et la prose doit les porter telles quelles.
   */
  it("avancent des parts que la division confirme", () => {
    const b = cameroun();
    const titres = porteDesTitres(b)!.montant;
    const part = (d: number) => `${((titres / d) * 100).toFixed(1).replace(".", ",")} %`;
    const n2 = SEED_NOTES_BUDGET.find((n) => n.numero === 2);
    expect(n2, "la note n° 2 a disparu : l'épreuve ne juge plus rien").toBeDefined();
    const texte = n2!.corps.map((p) => p.texte).join(" ");
    expect(texte.includes(part(2_996_800)), `la part sur les emprunts votés devrait s'écrire ${part(2_996_800)}`).toBe(true);
    expect(texte.includes(part(b.besoinDeFinancement!)), `la part sur le besoin devrait s'écrire ${part(b.besoinDeFinancement!)}`).toBe(true);
  });

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
  references: [{ titre: "Projet de loi de finances rectificative pour 2026", editeur: "Assemblée nationale", date: "2026-11-12" }],
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
    const vide: BrouillonNote = { titre: "", enUnePhrase: "", motif: "", demandeePar: "", corps: [], surveiller: [], malLu: "", references: [] };
    expect(new Set(verifierNote(vide).map((r) => r.champ)), "le refus ne nomme pas tous les champs fautifs").toEqual(
      new Set(["titre", "enUnePhrase", "motif", "demandeePar", "malLu", "corps", "references"]),
    );
  });

  /**
   * LE RELEVÉ SE PREND SUR LA FICHE. S'il se saisissait, deux notes
   * compareraient de l'orthographe : « 62,38 $ » contre « 62.38 USD » se
   * lirait comme un mouvement du baril.
   */
  it("prend son relevé sur le budget, valeurs comprises", () => {
    const r = releveDuBudget(cameroun());
    expect(r.map((x) => x.cle), "le relevé a changé de postes").toEqual(["millesime", "budget_total", "baril_loi", "baril_constate", "solde", "amortissement", "besoin", "programme_titres", "programme_beac"]);
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
  it("fige le relevé d'une note, et ne le recalcule jamais", () => {
    /* Écrit « releveDuBudget(CAMEROUN) », il se RECALCULAIT à chaque
       chargement : la note suivait en silence tout changement du budget, et
       le carnet ne pouvait plus voir un seul poste bouger. */
    expect(code("src/data/budgets-seed.ts").includes("releve: releveDuBudget("), "le relevé d'une note semée se recalcule : elle se réécrit sous elle-même").toBe(false);
  });

  /**
   * UNE NOTE NE RELÈVE AUCUN POSTE QUE LA FICHE NE PRODUIT PAS.
   *
   * L'épreuve exigeait d'abord l'ÉGALITÉ des clefs. C'était juste tant que le
   * relevé d'une note se recalculait ; depuis qu'il est figé, c'est faux : une
   * note ignore légitimement un poste que la fiche a gagné depuis — le
   * principal publié, par exemple, entré le 24 octobre avec la loi. Ce qui
   * reste interdit, c'est l'inverse : un poste inventé, que rien ne produit,
   * et dont la note suivante ne pourrait jamais montrer qu'il a bougé.
   */
  it("ne relève aucun poste que la fiche ne produit pas", () => {
    for (const n of SEED_NOTES_BUDGET) {
      const b = SEED_BUDGETS.find((x) => x.pays === n.pays && x.exercice === n.exercice)!;
      const connus = new Set(releveDuBudget(b).map((x) => x.cle));
      expect(n.releve.filter((x) => !connus.has(x.cle)).map((x) => x.cle), `la note n° ${n.numero} relève un poste que sa fiche ne produit pas`).toEqual([]);
      expect(n.releve.length, `la note n° ${n.numero} ne relève rien`).toBeGreaterThan(3);
    }
  });

  it("donne à la note suivante le rang qui suit", () => {
    expect(numeroSuivant([]), "la première note d'un État ne part pas de 1").toBe(1);
    expect(numeroSuivant(SEED_NOTES_BUDGET), "le rang suivant ne suit pas la série").toBe(3);
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
      ["amortissement", "besoin", "budget_total", "millesime", "programme_beac", "programme_titres", "solde"],
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

  /**
   * AUCUNE PAGE CLIENT NE RENVOIE ICI, ET AUCUN LIEN MORT NE SORT D'ICI.
   *
   * CE QUE CETTE ÉPREUVE A CORRIGÉ EN NAISSANT : on a cru que le Trésor avait
   * déjà sa fiche sous « Émetteurs », et on a posé le renvoi. Il rendait un
   * 404. `/emetteurs/[slug]` ne sert que TROIS émetteurs obligataires —
   * `snpc`, `acep`, `alios` — et les six États n'ont qu'une entrée de
   * REGISTRE, qui est une identité servant à rattacher les offres, pas un
   * écran. La fiche d'un budget est à ce jour la SEULE page par pays de
   * l'application.
   *
   * CE QUI RESTE GARDÉ, et qui vaut quoi qu'il arrive : la page de l'émetteur
   * n'a AUCUNE garde d'accès — c'est un écran client. Un lien d'une page
   * client vers les budgets ouvrirait au public une porte sur l'analyse
   * interne, et c'est précisément le genre de symétrie qu'on ajoute un jour
   * avec de bonnes intentions.
   */
  it("n'est atteinte depuis aucune page hors du desk", () => {
    const fautifs: string[] = [];
    const parcourir = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) {
          if (e.name === "desk") continue; // le desk a le droit de se renvoyer à lui-même
          parcourir(p);
        } else if (/\.(ts|tsx)$/.test(e.name) && fs.readFileSync(p, "utf8").includes("/desk/budgets")) {
          fautifs.push(path.relative(RACINE, p));
        }
      }
    };
    parcourir(path.join(RACINE, "src/app"));
    expect(fautifs, "une page hors du desk renvoie vers les budgets : l'analyse interne s'ouvre au public").toEqual([]);
    /* NON-VACUITÉ : la promenade a bien vu la page de l'émetteur. */
    expect(fs.existsSync(path.join(RACINE, "src/app/emetteurs/[slug]/page.tsx")), "la page d'émetteur a disparu : l'épreuve ne garde plus rien").toBe(true);

    /* ET AUCUN LIEN MORT NE SORT DE LA FICHE : `/emetteurs/<slug>` ne répond
       que pour les émetteurs obligataires, et aucun État n'en est un. */
    const f = code("src/app/desk/budgets/[pays]/page.tsx");
    expect(f.includes("/emetteurs/"), "la fiche renvoie vers une page d'émetteur : aucun État n'en a une, le lien rendra 404").toBe(false);
  });

  /**
   * UN SOUVERAIN N'A PAS DE FICHE D'ÉMETTEUR, ET C'EST UNE DÉCISION.
   *
   * Les six Trésors, la BDEAC et la BEAC ont une entrée au registre — une
   * identité qui rattache une ligne à une entité — et aucune page. Une fiche
   * d'émetteur dit ce qu'une société fait, ce qu'elle gagne et qui la
   * détient : trois questions sans objet pour un Trésor, dont la page serait
   * un cadre vide portant un nom d'État. La page « Sociétés » l'écrit déjà à
   * l'écran — « les États et la BDEAC ont leurs échéanciers directement sur
   * chaque ligne ».
   *
   * LA TENTATION EST RÉELLE : le slug ressemble à une adresse. Un `href` posé
   * sur une entrée souveraine ferait paraître un lien vers
   * « /emetteurs/etat-cameroun », qui rend 404 — et c'est la carte d'émetteur
   * d'une offre du Trésor qui l'afficherait, sur un écran client.
   */
  it("ne donne d'adresse à aucun Trésor ni aucun État", () => {
    const souverains = ISSUER_REGISTRY.filter((e) => e.family === "etat" || e.family === "supranational");
    /* NON-VACUITÉ : six États, la BDEAC et la BEAC. */
    expect(souverains.length, "le registre ne porte plus d'entrée souveraine : l'épreuve ne garde rien").toBeGreaterThanOrEqual(8);
    expect(
      souverains.filter((e) => e.href).map((e) => `${e.slug} → ${e.href}`),
      "une entrée souveraine porte une adresse : la carte d'émetteur d'une offre du Trésor affichera un lien mort",
    ).toEqual([]);
    /* ET LES SEULES ADRESSES « /emetteurs/ » DU REGISTRE SONT CELLES DES
       ÉMETTEURS OBLIGATAIRES, qui, eux, ont bien une page. */
    for (const e of ISSUER_REGISTRY) {
      if (!e.href?.startsWith("/emetteurs/")) continue;
      expect(
        ISSUERS.some((i) => i.slug === e.slug),
        `« ${e.slug} » porte une adresse d'émetteur sans figurer parmi les émetteurs obligataires : la page rendra 404`,
      ).toBe(true);
    }
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

/**
 * CE QUI ATTEND D'ÊTRE ÉCRIT, ET LES TROIS INTERDITS DU CARNET.
 *
 * Le carnet corrige un défaut précis : une note qui ne s'écrit que sur demande
 * s'écrit quand quelqu'un est déjà inquiet, donc la série penche vers les
 * crises et se tait dans le calme. Le remède n'est PAS de produire la note —
 * ce serait le calendrier qu'on a écarté. C'est de signaler, et de se taire
 * une fois que le desk a écrit : un signal qui reste allumé après qu'on y a
 * répondu devient du papier peint, et la maison a déjà payé ce défaut.
 */
describe("le carnet du desk", () => {
  const JOUR = "2026-10-25";

  it("signale les États sur lesquels rien n'a jamais été écrit", () => {
    const s = carnet(SEED_BUDGETS, SEED_NOTES_BUDGET, SEANCES, JOUR);
    const muets = s.filter((x) => x.genre === "jamais_ecrite").map((x) => x.pays);
    expect(muets, "le Cameroun porte une note : il ne devrait pas être signalé comme muet").not.toContain("Cameroun");
    expect(muets.length, "aucun État muet n'est signalé alors que cinq n'ont pas de note").toBe(5);
  });

  /**
   * LE SIGNAL SE TAIT QUAND LA NOTE A ÉTÉ ÉCRITE, et c'est ce qui le distingue
   * d'un panneau décoratif. La note semée porte déjà le baril constaté.
   */
  it("se tait sur une divergence dont la dernière note porte déjà le constat", () => {
    const s = signauxDe(cameroun(), SEED_NOTES_BUDGET, SEANCES, JOUR);
    expect(s.map((x) => x.genre), "le baril est signalé alors que la note n° 1 l'a déjà relevé").not.toContain("hypothese_diverge");
    /* NON-VACUITÉ : sans cette note, il parle. */
    const sansNote = signauxDe(cameroun(), [], SEANCES, JOUR);
    expect(sansNote.map((x) => x.genre), "le carnet ne voit plus la divergence du baril quand rien n'a été écrit").toContain("hypothese_diverge");
  });

  /**
   * ET IL PARLE DÈS QUE LE RELEVÉ BOUGE — mesuré avec la machine même qui
   * produit le tableau des écarts d'une note : la question est la même.
   */
  /**
   * IL SE TAIT QUAND LE DESK A ÉCRIT, ET REPARLE QUAND LA FICHE AVANCE.
   *
   * Deux fois dans la même journée. Le 24, la loi promulguée a apporté un
   * principal publié que la note n° 1 ignorait : le carnet a réclamé, la
   * note n° 2 a répondu, le signal s'est éteint. Le 25, le calendrier déclaré
   * à la BEAC est entré au relevé — un chiffre que la note n° 2 n'avait PAS
   * sous les yeux, puisqu'il a fallu lire six scans pour l'obtenir. Le carnet
   * reparle, et c'est juste : il y a de nouveau de quoi écrire.
   *
   * La distinction tient : on rattrape une note quand le chiffre était devant
   * elle, jamais quand il ne l'était pas.
   */
  it("reparle quand la fiche gagne un chiffre que la dernière note n'avait pas", () => {
    const b = cameroun();
    const s = signauxDe(b, SEED_NOTES_BUDGET, SEANCES, JOUR).filter((x) => x.genre === "releve_a_bouge");
    expect(s.length, "le carnet ne voit pas le calendrier déclaré entrer au relevé").toBe(1);
    expect(s[0].params.postes, "le carnet ne compte pas le poste entré").toBe("1");
    /* ET IL SE TAIT DÈS QU'UNE NOTE LE PORTE. */
    const ajour = [{ ...SEED_NOTES_BUDGET[0], numero: 9, releve: releveDuBudget(b) }];
    expect(signauxDe(b, ajour, SEANCES, JOUR).filter((x) => x.genre === "releve_a_bouge"), "le carnet crie sur un relevé qui n'a pas bougé").toEqual([]);
  });

  /**
   * ET IL COMPTE JUSTE QUAND ÇA BOUGE. Sans le compte, « le relevé a changé »
   * ne dit pas de combien, et le desk doit rouvrir la fiche pour le savoir.
   */
  it("compte les postes qui ont bougé depuis la dernière note", () => {
    const b = cameroun();
    /* Un poste est déjà en avance sur la note n° 2 : le calendrier déclaré. */
    const base = signauxDe(b, SEED_NOTES_BUDGET, SEANCES, JOUR).filter((x) => x.genre === "releve_a_bouge");
    expect(base[0].params.numero, "le carnet ne dit pas depuis quelle note").toBe("2");
    const un = signauxDe({ ...b, millesime: "revise" as const }, SEED_NOTES_BUDGET, SEANCES, JOUR).filter((x) => x.genre === "releve_a_bouge");
    expect(un[0].params.postes, "le millésime déplacé n'ajoute pas au compte").toBe("2");
    /* Un troisième poste déplacé, trois comptés. */
    const trois = signauxDe({ ...b, millesime: "revise" as const, amortissementPublie: 2_500_000 }, SEED_NOTES_BUDGET, SEANCES, JOUR).filter((x) => x.genre === "releve_a_bouge");
    expect(trois[0].params.postes, "le carnet ne compte pas tous les postes qui ont bougé").toBe("3");
  });

  it("remarque une note qui vieillit, et pas avant le délai", () => {
    const b = cameroun();
    expect(signauxDe(b, SEED_NOTES_BUDGET, SEANCES, "2026-12-25").map((x) => x.genre), "deux mois suffisent à déclarer une note vieille").not.toContain("note_vieillit");
    const vieux = signauxDe(b, SEED_NOTES_BUDGET, SEANCES, "2027-05-25").filter((x) => x.genre === "note_vieillit");
    expect(vieux.length, `sept mois passés, le carnet ne remarque rien (seuil ${MOIS_AVANT_DE_S_INQUIETER} mois)`).toBe(1);
    expect(vieux[0].params.mois, "le carnet ne dit pas depuis combien de temps").toBe("7");
  });

  it("compte les mois sans se tromper sur un jour qui n'est pas atteint", () => {
    expect(moisEntre("2026-10-25", "2027-04-24"), "un jour avant six mois, le carnet en compte six").toBe(5);
    expect(moisEntre("2026-10-25", "2027-04-25"), "six mois jour pour jour ne sont pas comptés").toBe(6);
    expect(moisEntre("2027-04-25", "2026-10-25"), "un carnet qui remonte le temps compte des mois").toBe(0);
  });

  /**
   * ET IL NE DIT PAS DEUX FOIS LA MÊME CHOSE. La fiche porte déjà son état
   * vide — « Aucune note écrite sur cet État. Une note se demande… » —, qui
   * le dit plus longuement et mieux. Les deux côte à côte se répétaient.
   */
  it("ne répète pas sur la fiche ce que l'état vide dit déjà", () => {
    const p = code("src/app/desk/budgets/[pays]/page.tsx");
    expect(p, "la fiche affiche « aucune note » deux fois de suite").toMatch(/filter\(\(s\) => s\.genre !== "jamais_ecrite"\)/);
    /* NON-VACUITÉ : la liste, elle, le garde — c'est tout son propos. */
    expect(code("src/app/desk/budgets/page.tsx").includes('jamais_ecrite'), "la liste filtre le signal qui fait son intérêt").toBe(false);
  });

  /**
   * LES TROIS INTERDITS. Le carnet signale, il n'agit pas : c'est ce qui le
   * sépare du calendrier écarté. Lus dans le code plutôt que promis en prose.
   */
  it("n'écrit rien, ne date rien, ne s'adresse à aucun client", () => {
    const c = code("src/lib/market/carnet.ts");
    expect(c.includes("createNoteBudget"), "le carnet écrit une note : il devient le calendrier qu'on a écarté").toBe(false);
    expect(c.includes("audit("), "le carnet écrit au journal : il agit au lieu de signaler").toBe(false);
    /* ET IL NE LIT PAS L'HEURE : un signal qui dépend de l'horloge du serveur
       ne se teste pas, et celui-ci dit « il y a sept mois » à qui va le citer. */
    expect(c.includes("Date.now()"), "le carnet lit l'horloge : ses signaux cessent d'être vérifiables").toBe(false);
    expect(c, "le jour n'est plus passé au carnet").toMatch(/aujourdHui: string/);
    /* AUCUN REFLET CLIENT : le carnet vit sur deux pages, toutes deux au desk. */
    const groupes = code("src/lib/desk-groupes.ts");
    expect(groupes.slice(groupes.indexOf("Vue client")).includes("/desk/budgets"), "le carnet se montre en vue client").toBe(false);
  });

  /**
   * LA DATE SORT AU FORMAT DE LA MAISON. Le domaine range « 2026-10-25 »,
   * parce qu'une date formatée n'est plus comparable ; l'écran la met en
   * « 25 oct. 2026 », et le formateur lui est passé — le domaine ne connaît
   * ni la langue ni le fuseau de qui lit. Vu à l'écran, pas autrement.
   */
  it("rend ses dates au format de la maison, pas en brut", () => {
    const muet = carnet(SEED_BUDGETS, [], SEANCES, JOUR).find((x) => x.genre === "jamais_ecrite")!;
    expect(muet.params.releve, "le domaine range une date déjà formatée : elle cesse d'être comparable").toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(trousDe(muet.params, () => "25 oct. 2026").releve, "l'écran ne met plus la date au format").toBe("25 oct. 2026");
    for (const f of ["src/app/desk/budgets/page.tsx", "src/app/desk/budgets/[pays]/page.tsx"]) {
      expect(code(f), `${f} affiche la date brute du carnet`).toMatch(/trousDe\(s\.params, fmtDate\)/);
    }
    /* ET LA RÈGLE PORTE SUR LA FORME, PAS SUR LE NOM DU TROU. La première
       version ne formatait que « releve » ; les motifs du refus ont ajouté
       deux autres dates, et elles sont sorties en brut à l'écran. */
    const refus = pourquoiPasDeTaux(cameroun(), leveDe(SEANCES, "Cameroun", 2026)!).find((x) => x.cle === "couverture")!;
    expect(trousDe(refus.params, () => "3 août 2026").premiere, "un trou de date qui ne s'appelle pas « releve » sort en brut").toBe("3 août 2026");
    expect(trousDe(refus.params, () => "X").jours, "un trou qui n'est pas une date est pris pour une date").toBe(refus.params.jours);
    expect(code("src/app/desk/budgets/[pays]/page.tsx"), "les motifs du refus affichent des dates brutes").toMatch(/trousDe\(m\.params, fmtDate\)/);
  });

  /* LES PHRASES SONT DES GABARITS, et le domaine ne compose pas : une phrase
     fabriquée ici traverserait t() sous forme de variable. */
  it("rend des gabarits dont tous les trous sont remplis", () => {
    for (const s of carnet(SEED_BUDGETS, SEED_NOTES_BUDGET, SEANCES, "2027-05-25")) {
      const trous = [...DIT[s.genre].matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      expect(trous.length, `le gabarit « ${s.genre} » n'a aucun trou : la phrase est figée`).toBeGreaterThan(0);
      for (const trou of trous) expect(s.params[trou], `le signal « ${s.genre} » ne remplit pas le trou « ${trou} »`).toBeTruthy();
    }
  });
});

/**
 * LES PIÈCES : CE SUR QUOI LA LECTURE S'APPUIE.
 *
 * Une note interne n'a plus de lecteur extérieur ; ce qui lui reste, c'est que
 * ses pièces soient nommées et retrouvables. Un lien mort vaut moins que pas
 * de lien : le lecteur clique, n'obtient rien, et peut en conclure que la
 * pièce n'existe pas.
 */
describe("les pièces d'une note", () => {
  it("sont exigées : une lecture que rien n'étaye n'apprend rien", () => {
    expect(verifierNote({ ...bonBrouillon(), references: [] }).map((r) => r.message), "une note sans pièce passe").toContain(REFUS.sansPiece);
    expect(verifierNote(bonBrouillon()).map((r) => r.message), "une note qui nomme sa pièce est refusée").not.toContain(REFUS.sansPiece);
  });

  /**
   * ET AUCUNE NE S'Y RANGE DEUX FOIS.
   *
   * Trouvé par React, pas par une épreuve : la note n° 2 reprenait les pièces
   * de la fiche ET ajoutait l'une d'elles à la main, d'où deux enfants de même
   * clef. Deux fois la même ligne n'ajoute rien et la liste cesse d'être celle
   * de ce sur quoi la note s'appuie. Le dédoublonnage vit à l'écriture — au
   * serveur, qui décide, et au formulaire, pour que le compte soit le même.
   */
  it("ne range jamais deux fois la même pièce sous une note", () => {
    for (const n of SEED_NOTES_BUDGET) {
      const clefs = n.references.map((p) => `${p.editeur.trim().toLowerCase()}|${p.titre.trim().toLowerCase()}`);
      expect(clefs.length - new Set(clefs).size, `la note n° ${n.numero} porte deux fois la même pièce`).toBe(0);
      expect(n.references.length, `la note n° ${n.numero} ne porte aucune pièce`).toBeGreaterThan(0);
    }
    expect(code("src/app/desk/budgets/[pays]/actions.ts"), "le serveur accepte deux fois la même pièce").toMatch(/sansDoublon\(\[/);
    expect(code("src/app/desk/budgets/[pays]/RedigerNote.tsx"), "l'écran compte les pièces autrement que le serveur").toMatch(/findIndex/);
  });

  it("se figent avec la note, reprises de la fiche", () => {
    const a = code("src/app/desk/budgets/[pays]/actions.ts");
    expect(a, "la note ne reprend plus les pièces de la fiche").toMatch(/budget\.references/);
    expect(a, "les pièces écrites ne sont pas celles qui ont été vérifiées").toMatch(/references: brouillon\.references/);
  });

  /**
   * UNE ADRESSE SE CONSIGNE QUAND ON L'A OUVERTE, ET LE JOUR SE RANGE AVEC.
   *
   * Sans la date, « il y a un lien » ne dit pas si quelqu'un l'a suivi cette
   * année ou il y a trois ans : un lien pourrit en silence. Les six pièces
   * camerounaises ont été demandées le 24 octobre 2026 et ont répondu ; celle
   * qui n'a pas d'adresse n'en a pas parce qu'on ne l'a pas trouvée, et elle
   * le dit à l'écran.
   */
  /**
   * AUCUNE FICHE NE LAISSE LE DESK SANS PIÈCE.
   *
   * Le formulaire exige au moins un document — une lecture que rien n'étaye
   * n'apprend rien. Tant que cinq fiches sur six n'en nommaient aucun, écrire
   * une note sur ces États demandait d'aller chercher soi-même où se trouve la
   * pièce, et l'écran le disait : « cette fiche ne nomme aucune pièce ».
   *
   * La BEAC en publie deux par État, aux mêmes adresses à un nom près. Elles
   * sont des SCANS, donc elles ne servent pas à nous : elles servent à ce que
   * le desk les ouvre. C'est la différence entre pouvoir écrire une note et
   * pouvoir l'écrire sans chercher d'abord.
   */
  it("donne à chaque État de quoi étayer une note", () => {
    for (const b of SEED_BUDGETS) {
      expect(b.references?.length ?? 0, `${b.pays} ne nomme aucune pièce : une note sur cet État part de rien`).toBeGreaterThan(0);
      /* Et chacune mène quelque part : une pièce sans adresse ni éditeur ne
         se retrouve pas. */
      for (const p of b.references ?? []) expect(p.url || p.editeur, `une pièce de ${b.pays} n'a ni adresse ni éditeur`).toBeTruthy();
    }
    /* NON-VACUITÉ : les six États sont bien passés en revue. */
    expect(SEED_BUDGETS.length, "le semis ne porte plus six États").toBe(6);
  });

  /**
   * TOUTES LES PIÈCES SE SUIVENT DEPUIS UN SEUL ENDROIT.
   *
   * Consigne permanente : conserver et mettre à disposition du desk les liens
   * de TOUS les documents référencés. Elles vivaient chacune dans sa fiche ou
   * sous sa note — donc gardées, mais introuvables ensemble. Un lien pourrit
   * en silence, et on ne s'en aperçoit qu'en le suivant ; encore faut-il
   * savoir lesquels on détient.
   */
  it("rassemble toutes les pièces en un seul endroit, celles sans adresse d'abord", () => {
    const vues = piecesSuivies(SEED_BUDGETS, SEED_NOTES_BUDGET, REFERENCES_ZONE);

    /* AUCUNE PIÈCE NE SE PERD : tout ce que portent les fiches, les notes et
       la zone se retrouve dans la liste. */
    const attendues = new Set(
      [...REFERENCES_ZONE, ...SEED_BUDGETS.flatMap((b) => b.references ?? []), ...SEED_NOTES_BUDGET.flatMap((n) => n.references ?? [])].map(
        (r) => `${r.editeur.trim().toLowerCase()}|${r.titre.trim().toLowerCase()}`,
      ),
    );
    const rassemblees = new Set(vues.map((x) => `${x.piece.editeur.trim().toLowerCase()}|${x.piece.titre.trim().toLowerCase()}`));
    expect([...attendues].filter((k) => !rassemblees.has(k)), "une pièce référencée ne paraît pas au dossier : elle cesse d'être suivie").toEqual([]);
    expect(vues.length, "le dossier est vide : l'épreuve ne garde rien").toBeGreaterThan(8);

    /* CELLES QU'IL RESTE À TROUVER VIENNENT EN PREMIER : les enterrer en bas
       reviendrait à les oublier. */
    const sansLien = vues.findIndex((x) => x.piece.url);
    expect(vues.slice(0, sansLien).every((x) => !x.piece.url), "les pièces sans adresse ne sont plus groupées en tête").toBe(true);

    /* ET CHACUNE DIT OÙ ELLE SERT : une pièce de zone ne nomme aucun État,
       une pièce de fiche les nomme. */
    const zone = vues.find((x) => x.piece.titre.startsWith("Bulletins du marché"));
    expect(zone?.zone, "une pièce de la zone n'est plus marquée comme telle").toBe(true);
    expect(zone?.pays, "une pièce de zone est rattachée à un État").toEqual([]);
    /* ET UNE PIÈCE CITÉE PAR UNE SEULE NOTE APPARTIENT À SON ÉTAT, pas à la
       zone : l'écran affichait « toute la zone » dès que la liste était vide. */
    const dUneNote = vues.find((x) => x.piece.titre.startsWith("Annonce d'une révision"));
    expect(dUneNote?.zone, "une pièce citée par une note passe pour une pièce de zone").toBe(false);
    expect(dUneNote?.pays, "une pièce citée par une note n'est rattachée à aucun État").toEqual(["Cameroun"]);
    /* CHAQUE ÉTAT A SON PROPRE PROGRAMME : six documents, six adresses. Les
       titrer pareil les aurait écrasés en un seul au dédoublonnage — cinq
       documents perdus en silence, ce qui est précisément ce que ce dossier
       doit empêcher. */
    const programmes = vues.filter((x) => x.piece.titre.startsWith("Programme annuel"));
    expect(programmes.length, "les six programmes annuels ne font plus six pièces distinctes").toBe(6);
    expect(new Set(programmes.map((x) => x.piece.url)).size, "deux programmes partagent une adresse").toBe(6);

    /* ET L'ÉCRAN LA REND : une liste que personne ne voit ne suit rien. */
    expect(code("src/app/desk/budgets/page.tsx"), "le dossier n'est plus affiché au desk").toMatch(/piecesSuivies\(budgets, notes, REFERENCES_ZONE\)/);
  });

  /**
   * DEUX DOCUMENTS DIFFÉRENTS NE PORTENT JAMAIS LE MÊME NOM.
   *
   * Le dossier dédoublonne sur l'éditeur et le titre. Deux pièces d'adresses
   * différentes titrées pareil s'écrasent donc l'une l'autre, et la seconde
   * disparaît sans bruit. C'est arrivé : les six programmes annuels de la
   * BEAC s'appelaient tous « Programme annuel des émissions 2026 ».
   */
  it("ne donne jamais le même nom à deux documents différents", () => {
    const toutes = [...REFERENCES_ZONE, ...SEED_BUDGETS.flatMap((b) => b.references ?? []), ...SEED_NOTES_BUDGET.flatMap((n) => n.references ?? [])];
    const par = new Map<string, Set<string>>();
    for (const r of toutes) {
      if (!r.url) continue;
      const k = `${r.editeur.trim().toLowerCase()}|${r.titre.trim().toLowerCase()}`;
      par.set(k, (par.get(k) ?? new Set()).add(r.url));
    }
    const collisions = [...par].filter(([, u]) => u.size > 1).map(([k, u]) => `${k} → ${u.size} adresses`);
    expect(collisions, "deux documents différents portent le même nom : l'un disparaîtra du dossier").toEqual([]);
    expect(par.size, "plus aucune pièce ne porte d'adresse : l'épreuve ne garde rien").toBeGreaterThan(10);
  });

  /* UNE PIÈCE OUVERTE QUELQUE PART VAUT OUVERTE PARTOUT : deux fiches citent
     le même document, l'une avec son adresse, l'autre sans. */
  it("relève l'adresse d'une pièce citée sans elle ailleurs", () => {
    const sans = { titre: "Pièce d'essai", editeur: "Essai" };
    const avec = { ...sans, url: "https://exemple.test/piece.pdf", verifieLe: "2026-10-25" };
    const a = piecesSuivies([{ ...cameroun(), references: [sans] }, { ...cameroun(), pays: "Gabon" as const, references: [avec] }], []);
    expect(a.find((x) => x.piece.titre === "Pièce d'essai")?.piece.url, "une pièce reste sans adresse alors qu'une autre fiche l'a ouverte").toBe(avec.url);
  });

  it("date chaque adresse qu'elle consigne", () => {
    const avecUrl = SEED_BUDGETS.flatMap((b) => b.references ?? []).filter((p) => p.url);
    expect(avecUrl.length, "plus aucune pièce ne porte d'adresse : l'épreuve ne garde rien").toBeGreaterThanOrEqual(5);
    expect(
      avecUrl.filter((p) => !p.verifieLe).map((p) => p.titre),
      "une adresse est consignée sans le jour où elle a été ouverte",
    ).toEqual([]);
    for (const p of avecUrl) expect(p.verifieLe, `la date de « ${p.titre} » est mal formée`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  /* ET AUCUNE ADRESSE INVENTÉE : seules les vraies passent. */
  it("ne gardent qu'une adresse qui en est une", () => {
    const a = code("src/app/desk/budgets/[pays]/actions.ts");
    expect(a, "n'importe quel texte est accepté comme adresse").toMatch(/\^https\?:\\\/\\\/\\S\+\$/);
    for (const b of SEED_BUDGETS) {
      for (const p of b.references ?? []) {
        expect(p.titre.trim().length, `une pièce de ${b.pays} n'a pas de titre`).toBeGreaterThan(5);
        expect(p.editeur.trim().length, `une pièce de ${b.pays} n'a pas d'éditeur : elle ne se retrouve pas`).toBeGreaterThan(1);
        if (p.url) expect(p.url, `l'adresse d'une pièce de ${b.pays} n'en est pas une`).toMatch(/^https?:\/\/\S+$/);
      }
    }
    /* NON-VACUITÉ : au moins un État nomme ses pièces. */
    expect(SEED_BUDGETS.some((b) => (b.references?.length ?? 0) > 0), "plus aucun État ne nomme ses pièces").toBe(true);
  });
});

/**
 * L'ÉCART DÉCLARÉ / LEVÉ, ET LE POURCENTAGE QU'ON REFUSE.
 *
 * La planche demandait « Cameroun : 78 % du programme levé à mi-parcours ».
 * Ce rapport ne se calcule pas sur ces données, et ces épreuves fixent
 * POURQUOI, pour qu'on ne le rétablisse pas un jour sans s'en apercevoir :
 * le relevé couvre des semaines et non un exercice, le périmètre de la ligne
 * déclarée est inconnu, et les bons se renouvellent sans que leur échéance
 * soit relevée.
 */
describe("ce qui a été levé", () => {
  const cmr = () => leveDe(SEANCES, "Cameroun", 2026)!;

  it("mesure le brut servi, par instrument, sur les séances relevées", () => {
    /* NON-VACUITÉ : sans cette ligne, un relevé vide ferait passer tout ce
       qui suit — c'est exactement ce qui est arrivé au premier jet. */
    expect(SEANCES.length, "le relevé des séances est vide : les épreuves qui suivent ne jugent rien").toBeGreaterThan(200);
    const l = cmr();
    expect(l, "le Cameroun 2026 n'a plus de séance relevée").toBeDefined();
    expect(l.seances, "le compte des séances camerounaises de 2026 a changé").toBe(8);
    /* Cinq tranches d'obligations le 14 septembre, à 27,55 milliards chacune,
       plus trois bons le 3 août : 137,8 et 24,2. */
    expect(Math.round(l.parInstrument.OTA / 1e8) / 10, "le brut obligataire a changé").toBe(137.8);
    expect(Math.round(l.parInstrument.BTA / 1e8) / 10, "le brut en bons a changé").toBe(24.2);
    expect(l.sansMontant, "des séances sans montant sont comptées dans le brut").toBe(0);
  });

  /**
   * LE SEUL RAPPORT RENDU. Il répond à la question que la note posait
   * vraiment — « les 400 milliards tiennent-ils » — et il se mesure sans rien
   * supposer : le Cameroun obtient 91 % de ce qu'il demande, le Gabon 49 %.
   */
  it("rend ce que l'État obtient de ce qu'il demande, et rien d'autre", () => {
    expect(Math.round(cmr().tauxDeService! * 100), "le taux de service camerounais a changé").toBe(91);
    expect(Math.round(leveDe(SEANCES, "Gabon", 2026)!.tauxDeService! * 100), "le taux de service gabonais a changé").toBe(49);
    /* ET LE DÉNOMINATEUR EST HONNÊTE : seules les séances où les DEUX chiffres
       existent. Les séances de 2026 les portent toutes, donc la règle ne se
       vérifiait sur rien — trouvé en la désarmant : la suite restait verte.
       On fabrique donc le cas que le relevé n'a pas. */
    const l = cmr();
    expect(l.serviApparie <= l.servi, "le servi apparié dépasse le servi total").toBe(true);
    const muette = { ...SEANCES.find((x) => x.country === "Cameroun" && x.sessionOn.startsWith("2026"))!, id: "muette", codeEmission: "CM-MUETTE", served: undefined, announced: 100_000_000_000 };
    const avec = leveDe([...SEANCES, muette], "Cameroun", 2026)!;
    expect(avec.annonce, "une séance sans montant servi entre au dénominateur : le taux s'effondre en silence").toBe(l.annonce);
    expect(avec.sansMontant, "une séance sans montant servi n'est plus comptée").toBe(1);
    expect(Math.round(avec.tauxDeService! * 100), "le taux de service bouge alors que rien de servi n'a été relevé").toBe(91);
  });

  /* LE CODE D'ÉMISSION DISTINGUE UNE TRANCHE D'UN DOUBLE COMPTE. Le Cameroun
     aligne cinq codes différents le 14 septembre : cinq tranches, pas cinq
     lectures de la même. Deux séances de 2020 portent, elles, un code déjà vu. */
  it("compte les codes d'émission vus deux fois, sans les retirer", () => {
    expect(cmr().codesEnDouble, "les cinq tranches camerounaises sont prises pour des doublons").toBe(0);
    const gq = leveDe(SEANCES, "Guinée éq.", 2020);
    expect(gq?.codesEnDouble, "un code d'émission vu deux fois le même jour n'est plus signalé").toBe(1);
    /* Sans les retirer : laquelle des deux est la bonne ne se devine pas. */
    expect(code("src/lib/market/leve.ts").includes("codesEnDouble++"), "les doublons ne sont plus comptés").toBe(true);
  });

  /**
   * LE REFUS DU POURCENTAGE, ET SES MOTIFS NOMMÉS. Un refus sans motif se lit
   * comme une lacune de l'outil, et quelqu'un finit par faire la division à la
   * main dans un coin.
   */
  it("refuse le « % du programme levé » en nommant ce qui manque", () => {
    const motifs = pourquoiPasDeTaux(cameroun(), cmr()).map((m) => m.cle);
    expect(motifs, "la couverture partielle du relevé n'est plus dite").toContain("couverture");
    /* Le périmètre et le roulement ne valent plus que là où le calendrier
       déclaré manque : il porte du brut par instrument, comme les séances. */
    const sansCalendrier = pourquoiPasDeTaux({ ...cameroun(), programmeBeac: undefined }, cmr()).map((m) => m.cle);
    expect(sansCalendrier, "sans calendrier, le périmètre n'est plus opposé").toContain("perimetre");
    expect(sansCalendrier, "sans calendrier, le roulement des bons n'est plus opposé").toContain("rollBta");
    /* Quarante-trois jours : du 3 août au 14 septembre, bornes comprises. */
    const m = pourquoiPasDeTaux(cameroun(), cmr()).find((x) => x.cle === "couverture")!;
    expect(m.params.jours, "la couverture du relevé n'est plus chiffrée en jours").toBe("43");
    /* ET AUCUNE PAGE NE DIVISE LE LEVÉ PAR LE PROGRAMME. */
    for (const f of ["src/app/desk/budgets/page.tsx", "src/app/desk/budgets/[pays]/page.tsx", "src/lib/market/leve.ts"]) {
      expect(code(f), `${f} divise le levé par le programme déclaré`).not.toMatch(/servi\s*\/\s*(t\.montant|titres\.montant|programme)/);
    }
  });

  /**
   * LE PROGRAMME DÉCLARÉ, LU SUR LES CALENDRIERS SIGNÉS.
   *
   * Six documents, lus un par un le 25 octobre — l'OCR ayant rendu de la
   * bouillie sur ces grilles scannées. Ils sont ce qui rend les six États
   * comparables : chaque loi présente ses portes autrement, le calendrier
   * BEAC a la même forme pour tous.
   *
   * TROIS CONTRÔLES, parce qu'un chiffre lu sur un scan se vérifie : les
   * sous-totaux doivent faire le total, l'ordre de grandeur doit être celui
   * de millions de francs, et les deux États dont le relevé portait déjà un
   * programme doivent y retomber.
   */
  it("porte le programme déclaré des six États, et il boucle", () => {
    const avec = SEED_BUDGETS.filter((b) => b.programmeBeac);
    expect(avec.length, "les six calendriers ne sont plus relevés").toBe(6);
    for (const b of avec) {
      const p = b.programmeBeac!;
      expect((p.bta ?? 0) + (p.ota ?? 0), `${b.pays} : bons et obligations ne font pas le total déclaré`).toBe(p.total);
      /* EN MILLIONS comme tout le semis : un programme en francs serait mille
         fois trop grand et sortirait un pourcentage plausible. */
      expect(p.total, `${b.pays} : le programme n'est pas de l'ordre du million de francs`).toBeGreaterThan(10_000);
      expect(p.total, `${b.pays} : le programme n'est pas de l'ordre du million de francs`).toBeLessThan(10_000_000);
    }
    /* Les deux chiffres que le relevé portait déjà, de source différente. */
    expect(SEED_BUDGETS.find((b) => b.pays === "Congo")!.programmeBeac!.total, "le total congolais ne retombe plus sur le relevé antérieur").toBe(690_000);
    expect(SEED_BUDGETS.find((b) => b.pays === "Tchad")!.programmeBeac!.total, "le total tchadien ne retombe plus sur le relevé antérieur").toBe(520_000);
    /* ET LE CAMEROUN TRANCHE LE PÉRIMÈTRE : la ligne de titres de sa loi vaut
       exactement ses OBLIGATIONS déclarées, pas son programme entier. */
    const cmr = cameroun();
    expect(cmr.programmeBeac!.ota, "la ligne de titres de la loi ne correspond plus aux obligations déclarées").toBe(porteDesTitres(cmr)!.montant);
    expect(cmr.programmeBeac!.total > porteDesTitres(cmr)!.montant, "le programme entier ne dépasse plus la ligne de la loi : le périmètre cesse d'être tranché").toBe(true);
  });

  /**
   * LA PART PLACÉE, ET L'UNITÉ QUI LA REND FAUSSE SI ON L'OUBLIE.
   *
   * Le servi est en FRANCS, le déclaré en MILLIONS. Divisés tels quels, le
   * rapport sort un million de fois trop grand — et il aurait l'air d'un
   * pourcentage plausible.
   */
  it("rapporte le placé au déclaré sans se tromper d'unité", () => {
    const l = leveDe(SEANCES, "Cameroun", 2026)!;
    const p = placeSurDeclare(l, cameroun().programmeBeac)!;
    expect(Math.round(p.ota! * 100), "la part d'obligations placée a changé").toBe(34);
    expect(p.ota! < 1, "la part placée dépasse 100 % : les unités ne sont pas ramenées").toBe(true);
    /* NON-VACUITÉ : sans programme déclaré, aucun rapport. */
    expect(placeSurDeclare(l, undefined), "un État sans calendrier rend quand même un rapport").toBeUndefined();
  });

  /* ET LE REFUS SE RÉDUIT À CE QUI RESTE VRAI : le périmètre était la raison
     principale, elle tombe là où le calendrier existe. */
  it("ne refuse plus le rapport pour un périmètre désormais connu", () => {
    const motifs = pourquoiPasDeTaux(cameroun(), leveDe(SEANCES, "Cameroun", 2026)!).map((m) => m.cle);
    expect(motifs, "le périmètre est encore donné pour inconnu alors que le calendrier le tranche").not.toContain("perimetre");
    expect(motifs, "le roulement des bons est encore opposé alors que le calendrier porte du brut par instrument").not.toContain("rollBta");
    expect(motifs, "la couverture partielle du relevé n'est plus dite").toContain("couverture");
    expect(motifs, "le plancher n'est pas annoncé comme tel").toContain("planAnnuel");
  });

  /* UN TITRE QUI SURVIT À CE QU'IL DÉCRIT EST PIRE QU'UN TITRE ABSENT. Le
     bandeau s'intitulait « pourquoi aucun pourcentage n'est affiché » ; il
     s'est mis à mentir le jour où le calendrier déclaré a rendu la division
     possible. Vu à l'écran, pas autrement. */
  it("n'annonce plus un refus là où elle affiche une part", () => {
    const p = code("src/app/desk/budgets/[pays]/page.tsx");
    expect(p, "le bandeau annonce un refus alors que la part placée est affichée").toMatch(/b\.programmeBeac \? t\("Ce que la part placée ne dit pas"\)/);
  });

  it("compte les jours bornes comprises : une séance couvre un jour, pas zéro", () => {
    expect(joursEntre("2026-07-22", "2026-07-22"), "une séance unique couvre zéro jour").toBe(1);
    expect(joursEntre("2026-08-03", "2026-09-14"), "les jours couverts ont changé").toBe(43);
  });

  /**
   * LE CARNET LE DIT, ET SEULEMENT QUAND C'EST UNE TENDANCE. Une adjudication
   * ratée est un incident ; trois séances sous les trois quarts servis, non.
   */
  it("met au carnet l'État qui ne place pas ce qu'il annonce", () => {
    const s = carnet(SEED_BUDGETS, SEED_NOTES_BUDGET, SEANCES, "2026-10-25").filter((x) => x.genre === "service_faible");
    expect(s.map((x) => x.pays), "le Gabon place la moitié de ce qu'il annonce et le carnet se tait").toContain("Gabon");
    expect(s.map((x) => x.pays), "le Cameroun sert 91 % et se retrouve au carnet").not.toContain("Cameroun");
    /* ET PAS SUR UN INCIDENT : la RCA n'a qu'une séance relevée. */
    expect(s.map((x) => x.pays), "une seule séance suffit à déclarer une tendance").not.toContain("RCA");
    const rca = leveDe(SEANCES, "RCA", 2026)!;
    expect(rca.seances < SEANCES_MINIMUM && rca.tauxDeService! < SERVICE_FAIBLE, "la RCA ne sert plus d'exemple d'incident").toBe(true);
  });
});
