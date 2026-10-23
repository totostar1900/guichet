/**
 * LA PROCÉDURE LAISSÉE EN ROUTE, ET LE RAPPEL QUI LA REPREND.
 *
 * Un client ouvre son bulletin, lit le montant, va chercher son téléphone pour
 * le code, et ne revient pas. L'ordre existe, le desk l'a préparé, l'argent
 * n'est pas engagé, et plus personne n'en parle. Le Guichet le savait déjà —
 * la pastille le porte — mais la pastille ne se voit que si l'on revient, et
 * le propre de celui qui a abandonné est qu'il ne revient pas.
 *
 * CE QUI DÉCLENCHE UN RAPPEL EST UN DEVOIR ÉCRIT, JAMAIS UNE HÉSITATION.
 *
 * C'est la limite de tout ce module, et elle est volontaire. Un bulletin
 * émis, un mandat créé, une convention approuvée, des compléments demandés :
 * ces quatre-là existent en base parce que quelqu'un a cliqué. Un formulaire
 * rempli et non envoyé n'existe pas, et il ne doit pas exister : écrire
 * « vous étiez sur le point de placer 250 000 FCFA » à quelqu'un qui a
 * justement renoncé n'est pas un service, c'est une surveillance. La maison
 * relance ce qu'elle a commencé avec le client, pas ce qu'il a pensé seul.
 *
 * TROIS RÈGLES TIENNENT LA FILE.
 *
 *   UN SEUL MESSAGE PAR JOUR ET PAR CLIENT. Un dossier peut porter une
 *   convention, deux bulletins et un mandat le même matin ; quatre messages le
 *   même jour ne font pas quatre rappels, ils font un client qui bloque le
 *   numéro. Le sujet le plus bloquant parle, les autres attendent leur tour.
 *
 *   CINQ FOIS, PUIS PLUS JAMAIS. Au sixième jour la maison se tait et laisse
 *   la pastille faire son travail. Un rappel qui ne s'arrête pas devient du
 *   bruit, et le bruit décrédibilise les quatre premiers.
 *
 *   LE CLIENT PEUT ÉCARTER, ET CELA SUFFIT. Pas de motif à donner, pas de
 *   confirmation à obtenir du desk : un bouton, et les rappels cessent pour
 *   CE devoir-là. Le devoir, lui, reste visible dans le Guichet : écarter un
 *   rappel n'annule pas un ordre, et laisser croire le contraire serait la
 *   faute grave de ce module.
 *
 * LA CLEF EST PRÉCISE, ET C'EST CE QUI REND L'ÉCART SÛR. Si « signature »
 * était une clef unique par client, écarter le rappel d'un bulletin
 * éteindrait aussi celui du bulletin suivant, émis trois semaines plus tard
 * sur un autre ordre. La clef porte donc l'identifiant de l'objet qui attend ;
 * seuls la convention et les compléments, qui sont uniques par dossier, en
 * portent le nom.
 *
 * Module sans dépendance d'exécution : il se lit du serveur comme du
 * navigateur, et un essai l'atteint sans monter de base.
 */

/** Ce qu'une décision laissée en route peut être. */
export type SujetDeRelance = "convention" | "complements" | "signature" | "contre_proposition" | "mandat";

/** L'état d'un rappel, du côté de la maison. */
export type EtatDeRelance = "en_cours" | "ecartee" | "faite";

export interface Relance {
  id: string;
  userId: string;
  sujet: SujetDeRelance;
  /** L'objet qui attend : un identifiant d'ordre ou de mandat, sinon le nom du sujet. */
  cle: string;
  state: EtatDeRelance;
  /** Combien de rappels sont réellement partis. Zéro tant qu'aucun canal n'a abouti. */
  envois: number;
  /** Le jour du dernier rappel parti, pour n'en envoyer qu'un par jour. */
  dernierOn?: string;
  /** Le jour où la maison a constaté le devoir : le décompte part de là. */
  ouvertLe: string;
  closLe?: string;
  /** Le mot du client quand il écarte : il a le droit de ne rien dire. */
  motif?: string;
}

/** Ce qu'il faut pour écrire une ligne neuve : le reste a ses valeurs. */
export type NouvelleRelance = Pick<Relance, "userId" | "sujet" | "cle" | "ouvertLe">;

/**
 * L'ORDRE DES SUJETS EST UN ORDRE DE BLOCAGE, pas un ordre d'importance.
 *
 * La convention passe devant tout parce qu'elle tient tout le reste : tant
 * qu'elle n'est pas acceptée, aucune souscription n'est possible, donc aucun
 * bulletin n'existera. Relancer sur un bulletin un client dont la convention
 * dort serait lui proposer la deuxième marche d'un escalier dont la première
 * manque.
 *
 * Le mandat ferme la marche, et c'est voulu : il ne bloque rien. Un versement
 * programmé vit sans lui — le client vire lui-même — et c'est précisément la
 * distinction que la page « Épargne programmée » défend. Le rappel le dit
 * ainsi : une commodité à prendre, pas une dette à régler.
 */
export const SUJETS: SujetDeRelance[] = ["convention", "complements", "signature", "contre_proposition", "mandat"];

/** Le nom du sujet au desk : il paraît dans le réglage et dans le journal. */
export const NOM_DU_SUJET: Record<SujetDeRelance, string> = {
  convention: "Convention à accepter",
  complements: "Pièces demandées",
  signature: "Bulletin à signer",
  contre_proposition: "Contre-proposition à trancher",
  mandat: "Mandat de prélèvement à signer",
};

/** Ce que le desk doit savoir avant de décocher un sujet. */
export const ENJEU_DU_SUJET: Record<SujetDeRelance, string> = {
  convention: "Le compte ne s'ouvre pas : aucune souscription, aucun rachat, aucun ordre.",
  complements: "L'examen du dossier est suspendu tant que les pièces manquent.",
  signature: "L'ordre est prêt et ne part pas. La ligne peut se clôturer entre-temps.",
  contre_proposition: "L'ordre attend une réponse ; sans elle il s'éteint à la clôture.",
  mandat: "Rien n'est bloqué : le versement vit sans le mandat, qui n'est qu'un confort de paiement.",
};

/**
 * Le texte d'un rappel, par sujet.
 *
 * TON POSITIF, ET LA RAISON N'EST PAS COMMERCIALE. Un rappel écrit comme une
 * mise en demeure obtient le silence : celui qui n'a pas fini a souvent une
 * bonne raison, et lui écrire qu'il est en retard l'enfonce. Chaque texte dit
 * donc d'abord ce qui est déjà fait et ce qui est prêt, puis le geste qui
 * reste, puis la sortie — parce qu'un rappel dont on ne peut pas sortir n'est
 * plus un rappel.
 *
 * Trois trous, et pas un de plus : « {prenom} », « {quoi} » qui nomme l'objet
 * précis, « {lien} » qui mène droit au geste. Le desk réécrit ces textes dans
 * sa page ; ces valeurs-ci sont ce que la maison dit tant que personne n'y a
 * touché.
 */
export interface TexteDeRelance {
  objet: string;
  texte: string;
}

export const TEXTE_PAR_DEFAUT: Record<SujetDeRelance, TexteDeRelance> = {
  convention: {
    objet: "Votre compte Purpose Capital vous attend",
    texte:
      "Bonjour {prenom}, bonne nouvelle : votre dossier est approuvé. Il ne reste qu'une signature — la convention de compte, par un code à usage unique, deux minutes — et vous pourrez souscrire aux fonds, aux emprunts d'État et aux adjudications de la zone. {lien}",
  },
  complements: {
    objet: "Il manque peu de chose à votre dossier",
    texte:
      "Bonjour {prenom}, votre dossier avance bien. Le desk attend encore quelques pièces pour terminer l'examen : {quoi}. Déposez-les quand vous voulez, l'examen reprend aussitôt. {lien}",
  },
  signature: {
    objet: "Votre bulletin est prêt à signer",
    texte:
      "Bonjour {prenom}, votre bulletin pour {quoi} est prêt. Il part dès que vous le signez, par un code à usage unique. Vous gardez la main jusqu'à la dernière seconde, et rien n'est débité avant. {lien}",
  },
  contre_proposition: {
    objet: "De nouvelles conditions vous attendent",
    texte:
      "Bonjour {prenom}, le desk vous propose d'autres conditions sur {quoi}. C'est votre réponse qui décide : vous acceptez, vous refusez, ou vous nous dites ce que vous voulez. {lien}",
  },
  mandat: {
    objet: "Votre épargne, sans y penser chaque mois",
    texte:
      "Bonjour {prenom}, votre versement programmé sur {quoi} est en place. Si vous signez le mandat de prélèvement, la somme part toute seule le jour dit — plus de virement à faire, plus d'échéance oubliée. Vous le révoquez quand vous voulez. {lien}",
  },
};

/**
 * LE RÉGLAGE, TENU AU DESK ET NON DANS LE CODE.
 *
 * Tout ce qui se discute est ici : combien de fois, à partir de quand, sur
 * quel canal, pour quel sujet, avec quels mots. Ce qui n'est pas ici ne se
 * discute pas — un seul message par jour et par client, et l'arrêt immédiat
 * sur un écart du client — parce que ces deux règles ne sont pas des
 * préférences, ce sont les promesses qui rendent le reste acceptable.
 */
export interface PolitiqueDeRelance {
  /** Le robot tourne-t-il ? Décoché, rien ne part et la file reste visible. */
  active: boolean;
  /** Combien de rappels au plus, sur un devoir donné. */
  rappels: number;
  /** Le premier part ce nombre de jours après le constat. Zéro : le jour même. */
  delaiPremier: number;
  /** Le nombre de jours entre deux rappels. Un : tous les jours. */
  cadence: number;
  /** Les canaux empruntés. Vide : rien ne part, ce qui équivaut à décocher. */
  canaux: ("whatsapp" | "email")[];
  /** Les sujets relancés, chacun décochable. */
  sujets: Record<SujetDeRelance, boolean>;
  /** Les textes, réécrits par le desk ou laissés à leur valeur de maison. */
  textes: Partial<Record<SujetDeRelance, Partial<TexteDeRelance>>>;
  /**
   * Sauter samedi et dimanche. Décoché par défaut : cinq jours de suite sont
   * cinq jours, et un bulletin qui attend n'attend pas moins le samedi.
   */
  joursOuvres: boolean;
  /**
   * Ne rien envoyer le jour où un préavis de prélèvement part déjà.
   * Deux messages de la même maison le même jour sur deux sujets différents,
   * c'est un message qu'on n'ouvre plus — et le préavis, lui, est dû.
   */
  pasLeJourDUnPreavis: boolean;
}

export const RELANCE_KEY = "relance";

/**
 * CINQ RAPPELS, UN PAR JOUR, À PARTIR DU LENDEMAIN.
 *
 * Le lendemain et non le jour même : quelqu'un qui a fermé l'onglet il y a une
 * heure est peut-être en train de chercher son téléphone. Cinq et non trois,
 * parce que le desk l'a demandé ainsi, et la limite est de toute façon dans la
 * main du client, qui écarte d'un bouton.
 */
export const RELANCE_DEFAUT: PolitiqueDeRelance = {
  active: true,
  rappels: 5,
  delaiPremier: 1,
  cadence: 1,
  canaux: ["whatsapp", "email"],
  sujets: { convention: true, complements: true, signature: true, contre_proposition: true, mandat: true },
  textes: {},
  joursOuvres: false,
  pasLeJourDUnPreavis: true,
};

/** Le texte en vigueur pour ce sujet : celui du desk, sinon celui de la maison. */
export function texteDuSujet(p: PolitiqueDeRelance, s: SujetDeRelance): TexteDeRelance {
  const defaut = TEXTE_PAR_DEFAUT[s];
  const ecrit = p.textes?.[s];
  return { objet: ecrit?.objet?.trim() || defaut.objet, texte: ecrit?.texte?.trim() || defaut.texte };
}

/** Les trous bouchés. Un trou sans valeur disparaît plutôt que de s'écrire tel quel. */
export function remplir(modele: string, vals: { prenom?: string; quoi?: string; lien?: string }): string {
  return modele
    .replace(/\{prenom\}/g, vals.prenom?.trim() || "")
    .replace(/\{quoi\}/g, vals.quoi?.trim() || "")
    .replace(/\{lien\}/g, vals.lien?.trim() || "")
    /* « Bonjour , » quand le prénom manque : la virgule orpheline se voit plus
       que le prénom absent. */
    .replace(/\s+,/g, ",")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/* Midi UTC comme ancre : à minuit, un décalage d'heure ferait sauter ou
   répéter un jour, et un jour sauté est un rappel perdu. Même choix que le
   préavis, pour la même raison. */
const jourPlus = (iso: string, n: number): string => new Date(new Date(`${iso}T12:00:00.000Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const ecartEnJours = (a: string, b: string): number => Math.round((new Date(`${b}T12:00:00.000Z`).getTime() - new Date(`${a}T12:00:00.000Z`).getTime()) / 86_400_000);
const estWeekEnd = (iso: string): boolean => [0, 6].includes(new Date(`${iso}T12:00:00.000Z`).getUTCDay());

/** Pourquoi ce rappel ne part pas aujourd'hui, ou rien s'il part. */
export type RefusDeRelance = "inactive" | "sujet_decoche" | "sans_canal" | "ecartee" | "faite" | "epuisee" | "trop_tot" | "deja_aujourdhui" | "week_end";

/**
 * Ce rappel part-il aujourd'hui ?
 *
 * La fonction REND LA RAISON plutôt qu'un booléen, et c'est ce qui rend la
 * page du desk lisible : « 3 en attente, 1 épuisée, 2 écartées » se lit, « 6
 * dont 3 » ne se lit pas. Le robot inscrit la même raison à son journal, de
 * sorte qu'une file qui n'avance pas se diagnostique sans rejouer le tour.
 */
export function pourquoiPasRelancer(r: Relance, p: PolitiqueDeRelance, aujourdHui: string): RefusDeRelance | null {
  if (!p.active) return "inactive";
  if (!p.sujets[r.sujet]) return "sujet_decoche";
  if (!p.canaux.length) return "sans_canal";
  if (r.state === "ecartee") return "ecartee";
  if (r.state === "faite") return "faite";
  if (r.envois >= p.rappels) return "epuisee";
  if (p.joursOuvres && estWeekEnd(aujourdHui)) return "week_end";
  /* Le décompte part du constat pour le premier, du dernier envoi pour les
     suivants : sinon une file bloquée trois jours rattraperait ses trois
     rappels d'un coup le jour où elle repart. */
  const du = r.dernierOn ?? jourPlus(r.ouvertLe, p.delaiPremier - (p.cadence || 1));
  if (ecartEnJours(du, aujourdHui) < (p.cadence || 1)) return r.dernierOn === aujourdHui ? "deja_aujourdhui" : "trop_tot";
  return null;
}

/** Le jour du prochain rappel, ou rien quand il n'y en aura plus. */
export function prochainRappel(r: Relance, p: PolitiqueDeRelance): string | null {
  if (r.state !== "en_cours" || r.envois >= p.rappels || !p.active || !p.sujets[r.sujet]) return null;
  let j = r.dernierOn ? jourPlus(r.dernierOn, p.cadence || 1) : jourPlus(r.ouvertLe, p.delaiPremier);
  if (p.joursOuvres) for (let i = 0; i < 7 && estWeekEnd(j); i++) j = jourPlus(j, 1);
  return j;
}

/**
 * LE SEUL QUI PARLE AUJOURD'HUI, parmi les devoirs d'un même client.
 *
 * Quatre devoirs ouverts ne font pas quatre messages : ils font une file, et
 * le premier de la file est le plus bloquant au sens de « SUJETS ». Les autres
 * ne sont pas consommés — leur compteur ne bouge pas, leur jour ne bouge pas —
 * donc celui qui attend aujourd'hui parlera demain, une fois le premier réglé
 * ou épuisé. La file se vide par le haut, et jamais plus d'une voix à la fois.
 */
export function laQuiParle(relances: Relance[], p: PolitiqueDeRelance, aujourdHui: string): Relance | undefined {
  const prets = relances.filter((r) => pourquoiPasRelancer(r, p, aujourdHui) === null);
  return prets.sort((a, b) => SUJETS.indexOf(a.sujet) - SUJETS.indexOf(b.sujet) || a.ouvertLe.localeCompare(b.ouvertLe))[0];
}

/**
 * Pourquoi un écart n'est plus possible, ou rien.
 *
 * Un devoir déjà fait n'a plus de rappel à éteindre, et le bouton qui
 * prétendrait l'éteindre mentirait. Un devoir déjà écarté non plus : le dire
 * vaut mieux que de compter deux fois le même geste au journal.
 */
export function pourquoiPasEcarter(r: Relance | undefined): string | null {
  if (!r) return "Ce rappel n'existe pas, ou il ne vous appartient pas.";
  if (r.state === "ecartee") return "Les rappels sont déjà interrompus pour cette démarche.";
  if (r.state === "faite") return "Cette démarche est terminée : plus rien ne vous est rappelé.";
  return null;
}
