import type { BudgetEtat, NoteBudget, ParagrapheNote, Reference } from "@/lib/domain/types";
import { MOT_DU_MILLESIME, enMilliards, porteDesTitres } from "./budget";

/**
 * LA DISCIPLINE D'UNE NOTE, DÉPLACÉE LÀ OÙ ELLE PORTE.
 *
 * Elle vivait dans « budgets.test.ts », qui lisait le semis. Tant que les notes
 * n'existaient qu'en dur, cela suffisait : rien ne pouvait entrer sans passer
 * par un fichier du dépôt, donc par la suite d'essais. À partir du moment où le
 * desk en écrit une depuis un formulaire, cette garde ne couvre plus rien de ce
 * qui sera écrit — elle garde une archive pendant que la porte est ouverte à
 * côté. C'est exactement le silence qu'on a passé la semaine à traquer : une
 * mesure verte qui ne regarde plus l'objet.
 *
 * Donc la règle descend ici, le formulaire l'appelle avant d'écrire, et l'essai
 * la teste ELLE plutôt que le semis — le semis n'étant plus qu'un de ses
 * justiciables. La base porte les mêmes refus en « check », parce qu'une règle
 * qui n'existe qu'en TypeScript se contourne par un script ; la maison a déjà
 * écrit cette phrase pour les jugements de bulletins.
 *
 * TROIS RÈGLES, ET LEUR RAISON :
 *
 *  1. CONSTAT ET LECTURE, LES DEUX. Une note sans constat n'a rien lu ; une
 *     note sans lecture n'engage personne et n'avait pas lieu d'être demandée.
 *  2. UNE LECTURE S'ÉCRIT AU CONDITIONNEL, avec son déclencheur nommé. Entre
 *     collègues aussi une phrase affirmative se retient comme un fait, et c'est
 *     là que le langage clair est le plus dangereux.
 *  3. AUCUN CONSEIL. La règle de la maison vaut ici comme ailleurs, et vaut
 *     même davantage : une note interne finit toujours par être citée dehors.
 *
 * Et le MOTIF est exigé, parce qu'une note se demande — elle ne tombe pas à
 * date fixe. Sans motif obligatoire, la série deviendrait un calendrier.
 */

/** Ce qu'un formulaire propose, avant que la note n'existe. */
export interface BrouillonNote {
  titre: string;
  enUnePhrase: string;
  motif: string;
  demandeePar: string;
  corps: ParagrapheNote[];
  surveiller: string[];
  malLu: string;
  /** Les pièces sur lesquelles elle s'appuie : la fiche, plus ce qu'on ajoute. */
  references: Reference[];
}

/**
 * Un refus nommé : le champ fautif, la règle en clair, et s'il y a lieu le
 * morceau de texte en cause.
 *
 * LE MESSAGE EST UNE CONSTANTE, et l'extrait vit à côté. Interpolés ensemble
 * ils feraient une phrase différente à chaque faute, qu'aucun dictionnaire ne
 * pourrait couvrir : le desk anglais lirait ses refus en français, et aucun
 * cliquet ne le verrait. C'est le même angle mort que les données livrées.
 */
export interface Refus {
  champ: string;
  message: string;
  extrait?: string;
}

/** Tous les refus possibles, énumérables — donc traduisibles, donc vérifiables. */
export const REFUS = {
  titre: "Le titre dit ce que la note a trouvé. En trois mots il ne dit rien.",
  phrase: "« En une phrase » est ce qu'on lit si l'on ne lit qu'une chose : elle doit tenir debout seule.",
  motif: "Une note se demande, elle ne tombe pas à date fixe : dites ce qui l'a déclenchée.",
  demandeePar: "Quelqu'un a demandé cette note. Son nom se range avec elle.",
  malLu: "Ce que la note précédente a mal lu s'écrit toujours, même pour dire « rien à corriger » : c'est une affirmation, pas une absence.",
  sansConstat: "Une note sans constat n'a rien lu : le constat est ce que le document dit.",
  sansLecture: "Une note sans lecture n'engage personne. Si le desk n'en tire rien, il n'avait pas besoin d'une note.",
  paragrapheCourt: "Un paragraphe de deux mots ne dit rien.",
  lectureAffirmative: "Cette lecture est écrite comme un fait. Nommez ce qui la déclenche — « si… alors… » — ou rangez-la en constat.",
  conseil: "La note documente. Décrivez ce qui se passerait, pas ce qu'il faudrait faire.",
  sansPiece: "Une note sans pièce ne se vérifie pas. Nommez au moins le document sur lequel elle s'appuie.",
} as const;

/**
 * Les planchers. Ils sont bas exprès : ils écartent le champ bâclé, pas le
 * style. Une note courte reste possible ; une note vide, non.
 */
export const MIN = { titre: 8, phrase: 40, motif: 8, paragraphe: 30, malLu: 20 } as const;

/**
 * CE QUI FAIT QU'UNE PHRASE EST CONDITIONNELLE. Volontairement large : « si »
 * et ses quatre voisins. Le but n'est pas d'attraper le rédacteur habile — il
 * y arrivera —, c'est que l'affirmation nette demande un geste conscient.
 */
export const CONDITIONNEL = /\bsi\b|pourrait|peut|semble|nous ne savons pas/i;

/** Le vocabulaire du conseil, le même que partout ailleurs dans la maison. */
export const CONSEILLE = /recommand|conseill|il faut acheter|opportunité à saisir|meilleur placement/i;

export const estConditionnelle = (texte: string): boolean => CONDITIONNEL.test(texte);
export const conseille = (texte: string): boolean => CONSEILLE.test(texte);

const extrait = (texte: string): string => (texte.length > 60 ? `${texte.slice(0, 60)}…` : texte);

/**
 * Ce qui empêche cette note d'être écrite. Liste vide : elle peut l'être.
 *
 * Elle rend TOUS les refus et non le premier : un formulaire qui recale un
 * champ à la fois fait recommencer cinq fois, et au cinquième on écrit
 * n'importe quoi pour qu'il se taise.
 */
export function verifierNote(d: BrouillonNote): Refus[] {
  const out: Refus[] = [];

  if (d.titre.trim().length < MIN.titre) out.push({ champ: "titre", message: REFUS.titre });
  if (d.enUnePhrase.trim().length < MIN.phrase) out.push({ champ: "enUnePhrase", message: REFUS.phrase });
  if (d.motif.trim().length < MIN.motif) out.push({ champ: "motif", message: REFUS.motif });
  if (d.demandeePar.trim().length < 2) out.push({ champ: "demandeePar", message: REFUS.demandeePar });
  if (d.malLu.trim().length < MIN.malLu) out.push({ champ: "malLu", message: REFUS.malLu });
  /* UNE LECTURE QUE RIEN N'ÉTAYE N'APPREND RIEN. La fiche fournit ses pièces
     dès qu'un budget y est relevé ; là où elle n'en a aucune — quatre États
     sur six —, c'est au rédacteur de nommer d'où il tient ce qu'il écrit. */
  if (d.references.length === 0) out.push({ champ: "references", message: REFUS.sansPiece });

  if (!d.corps.some((p) => p.genre === "constat")) out.push({ champ: "corps", message: REFUS.sansConstat });
  if (!d.corps.some((p) => p.genre === "lecture")) out.push({ champ: "corps", message: REFUS.sansLecture });

  for (const p of d.corps) {
    if (p.texte.trim().length < MIN.paragraphe) {
      out.push({ champ: "corps", message: REFUS.paragrapheCourt, extrait: extrait(p.texte.trim()) });
      continue;
    }
    /* Le cœur de la règle : une lecture affirmative se retient comme un fait. */
    if (p.genre === "lecture" && !estConditionnelle(p.texte)) out.push({ champ: "corps", message: REFUS.lectureAffirmative, extrait: extrait(p.texte.trim()) });
  }

  const tout = [d.titre, d.enUnePhrase, ...d.corps.map((p) => p.texte), ...d.surveiller].join(" ");
  if (conseille(tout)) out.push({ champ: "corps", message: REFUS.conseil });

  return out;
}

/**
 * LE RELEVÉ SE PREND SUR LA FICHE, IL NE SE SAISIT PAS.
 *
 * « Ce qui a changé depuis la note précédente » n'a de valeur que si les deux
 * relevés viennent du même endroit. Laissés à la frappe, ils compareraient de
 * la prose : « 62,38 $ » contre « 62.38 USD » se lirait comme un mouvement, et
 * un poste oublié d'une note à l'autre disparaîtrait en silence — ce que le
 * tableau des écarts est précisément chargé de montrer.
 *
 * L'ORDRE EST CELUI DE LA PAGE : le millésime d'abord, parce qu'il est la
 * donnée la plus périssable et qu'il commande la lecture de toutes les autres.
 */
/**
 * NOS LIBELLÉS, ÉNUMÉRÉS — ET POURQUOI ILS NE SONT PAS COMME LES AUTRES.
 *
 * Les intitulés des recettes, des dépenses et des portes viennent du document
 * et se montrent tels quels : « Transferts et subventions » est le mot de la
 * loi, pas le nôtre, et le traduire serait le réécrire. Ces quatre-là sont de
 * nous. Ils sont FIGÉS DANS LA BASE au moment où la note s'écrit — c'est ce
 * qui rend l'écart calculable —, donc la seule langue qui leur reste est celle
 * du rendu : la fiche les passe par t(), et « donnees-en » exige qu'ils y
 * soient.
 */
export const LIBELLES_DU_RELEVE = {
  millesime: "Millésime en vigueur",
  solde: "Solde déclaré",
  amortissement: "Remboursement du principal",
  besoin: "Besoin de financement",
  programme_titres: "Programme de titres publics",
} as const;

export function releveDuBudget(b: BudgetEtat): NoteBudget["releve"] {
  const out: NoteBudget["releve"] = [{ cle: "millesime", libelle: LIBELLES_DU_RELEVE.millesime, valeur: `LFI ${b.exercice}, ${MOT_DU_MILLESIME[b.millesime]}` }];

  for (const h of b.hypotheses ?? []) {
    out.push({ cle: `${h.cle}_loi`, libelle: h.libelle, valeur: h.valeur });
    /* L'écart entre l'hypothèse et le constaté est ce qui déclenche les
       révisions dans cette zone : il se range, il ne se raconte pas. */
    if (h.constate) out.push({ cle: `${h.cle}_constate`, libelle: `${h.libelle} · constaté`, valeur: h.constate });
  }

  if (b.soldeDeclare !== undefined) out.push({ cle: "solde", libelle: LIBELLES_DU_RELEVE.solde, valeur: `${enMilliards(b.soldeDeclare)} Md` });
  /* LE PRINCIPAL N'ENTRE QUE S'IL EST PUBLIÉ. Déduit, il ne peut pas bouger
     seul — il suit le solde et le besoin, déjà suivis —, et une ligne qui ne
     bouge jamais seule encombre le tableau des écarts sans rien y dire. */
  if (b.amortissementPublie !== undefined)
    out.push({ cle: "amortissement", libelle: LIBELLES_DU_RELEVE.amortissement, valeur: `${enMilliards(b.amortissementPublie)} Md` });
  if (b.besoinDeFinancement !== undefined) out.push({ cle: "besoin", libelle: LIBELLES_DU_RELEVE.besoin, valeur: `${enMilliards(b.besoinDeFinancement)} Md` });
  const titres = porteDesTitres(b);
  if (titres) out.push({ cle: "programme_titres", libelle: LIBELLES_DU_RELEVE.programme_titres, valeur: `${enMilliards(titres.montant)} Md` });

  return out;
}

/**
 * Le rang de la prochaine note dans la série. C'est lui qui fait le récit :
 * « depuis la n° 2 » ne veut rien dire si les numéros se chevauchent.
 */
export const numeroSuivant = (notes: NoteBudget[]): number => notes.reduce((n, x) => Math.max(n, x.numero), 0) + 1;
