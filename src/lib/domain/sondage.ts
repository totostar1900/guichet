import type { Country, LigneSondee } from "./types";
import { ladderOf, type SurveyLadder, type SurveyUnit } from "./survey";
import { bondCalc } from "@/lib/finance";

/**
 * LE SONDAGE : CE QUE LA PLACE PRENDRAIT, AVANT QU'IL Y AIT QUOI QUE CE SOIT À
 * PRENDRE.
 *
 * CE QUE LE DIRIGEANT A DEMANDÉ : « Le sondage demande une page à lui. Pour
 * l'instant il mène aux adjudications, où il n'a pas sa place. Construire une
 * page où le client accède aux lignes sondées par le desk — montant et
 * délai / date — et y répond, et où il peut aussi POUSSER SA PROPRE LIGNE. Le
 * desk recevra les lignes avec toutes leurs caractéristiques (OTA, BTA, pays,
 * maturité, coupon, prix, date…) et un robot consolidera et proposera un
 * consensus. La page porte l'information nécessaire, un gabarit (OTA, BTA) que
 * le client remplit. L'attente du client est gardée sur sa page. »
 *
 * ─── POURQUOI CE N'EST NI UNE OFFRE NI UN ORDRE ────────────────────────────
 *
 * LE SONDAGE EXISTANT NE SONDE QUE CE QUI EXISTE DÉJÀ. « survey.ts » dresse
 * l'échelle de la demande sur une ligne ANNONCÉE : le client pose un montant et
 * une condition sur une séance qui a une date, un ISIN et un communiqué. C'est
 * utile, et ce n'est pas la question posée ici. Ici on sonde AVANT : « prendriez-
 * vous une OTA camerounaise à cinq ans, autour de 6,5 %, dans trois semaines ? »
 * Rien de cela n'existe encore.
 *
 * ELLE N'EST DONC PAS UNE OFFRE. Une offre porte un ISIN, une version, des
 * documents, un cours, et elle entre dans quinze listes — le navigateur, le
 * bulletin, les compteurs de la barre, les positions. Une ligne sondée n'a rien
 * de tout cela et n'a pas à polluer ce qui s'achète : « 45 titres » doit rester
 * le compte de ce qu'on peut acheter aujourd'hui.
 *
 * ET UNE RÉPONSE N'EST PAS UN ORDRE. Un ordre engage, se signe, porte un
 * plafond, fabrique un bulletin et un avis d'opéré. Une réponse de sondage
 * n'engage à RIEN — c'est sa définition — et la faire passer par la machinerie
 * de la signature lui donnerait le poids qu'elle n'a pas, en plus de demander
 * au client un geste qu'on lui promet de ne pas demander.
 *
 * ─── UNE SEULE TABLE, ET UN DISCRIMINANT ───────────────────────────────────
 *
 * Le desk sonde une ligne ; le client répond à cette ligne ; le client pousse la
 * sienne. Ce sont TROIS RÔLES D'UNE MÊME CHOSE : « voici une ligne, et voici sa
 * taille telle que son auteur la voit ». Deux tables auraient demandé deux API
 * de dépôt, deux jeux d'essai, deux consolidations — et la consolidation est
 * justement ce qui doit les voir ensemble.
 *
 *   origine « desk », sans `repondA`   → la question que la maison pose
 *   origine « client », avec `repondA` → la réponse d'un client à cette question
 *   origine « client », sans `repondA` → la ligne qu'un client pousse de lui-même
 *
 * `montant` veut dire LA TAILLE DE CETTE LIGNE TELLE QUE SON AUTEUR LA VOIT :
 * ce que la maison cherche à placer, ou ce que le client prendrait. C'est le
 * même sens dans les trois rôles, et c'est pour cela que la table tient.
 */

/** Les deux compartiments sondés : le reste du primaire ne se sonde pas d'avance. */
export const INSTRUMENTS_SONDES = ["OTA", "BTA"] as const;
export type InstrumentSonde = (typeof INSTRUMENTS_SONDES)[number];

/**
 * LE NIVEAU D'UN SONDAGE EST TOUJOURS UN TAUX, et c'est la différence avec
 * « survey.ts ».
 *
 * CE QUE LA CAPTURE D'ÉCRAN A MONTRÉ, le 26 octobre 2026. La première écriture
 * reprenait `surveyUnit` mot pour mot : prix sur une OTA, taux sur un BTA. Dans
 * le sondage d'une séance ANNONCÉE c'est juste — le Trésor a fixé son coupon,
 * et ce qui se discute est le prix qu'on paiera. Ici rien n'est annoncé : il
 * n'y a pas encore de coupon, donc pas de prix, et ce que le client dit est
 * « je prendrais à un coupon d'au moins 6,25 ». Lu comme un prix, 6,25 passait
 * dans une échelle qui range les gros nombres en premier : l'écran affichait
 * « à 6,75 ou mieux, cinquante millions » alors que 6,75 satisfait TOUT LE
 * MONDE — c'est le niveau le plus généreux. L'échelle était exactement à
 * l'envers, et elle avait l'air juste.
 *
 * LES DEUX COMPARTIMENTS SE LISENT DONC PAREIL : plus le taux descend, mieux le
 * Trésor est servi, et moins le client reçoit. Un coupon et un taux précompté
 * ne sont pas la même chose en droit, mais ils ont le même SENS, et c'est le
 * sens qui fait une échelle.
 *
 * LE PRIX RESTE AU GABARIT d'une OTA, et il reste hors de l'échelle : un client
 * qui connaît déjà la ligne peut l'écrire, le desk le lit dans le détail. Le
 * mêler à la moyenne mélangerait des 99 et des 6,5 dans le même quotient, ce
 * qui ne veut rien dire.
 */
export const UNITE_SONDEE: SurveyUnit = "taux";

/** Le mot du niveau, qui change — pas son sens, qui ne change pas. */
export const motDuNiveau = (i: InstrumentSonde): "coupon" | "taux" => (i === "BTA" ? "taux" : "coupon");

/**
 * LES DURÉES QU'ON PEUT DEMANDER, ET ELLES SE CHOISISSENT DANS UNE LISTE.
 *
 * CE QUE LE DIRIGEANT A DEMANDÉ, le 26 octobre 2026 : « plusieurs maturités à
 * choisir (1, 2, 3, 4, 5…) ». C'était un champ de texte libre.
 *
 * ET CELA FERME LE DÉFAUT À SA SOURCE. « 5ans », « 5 ANS », « cinq ans », « 5 a »
 * étaient quatre lignes différentes pour la consolidation : on a appris à les
 * rapprocher après coup — voir `dureeCanonique` — mais un rapprochement reste
 * une réparation, et il ne rattrapera jamais « cinq ans ». Une liste ne produit
 * pas la faute.
 *
 * UN BON NE VA PAS AU-DELÀ DE L'ANNÉE : treize, vingt-six ou cinquante-deux
 * semaines, ce sont les trois que les Trésors de la zone servent. UNE OBLIGATION
 * COMMENCE À DEUX ANS, et non à un : à un an, l'instrument de la zone est le
 * bon, précompté, et proposer « OTA 1 an » ferait demander au Trésor une ligne
 * qu'il n'émet pas sur ce compartiment.
 */
export const dureesDe = (i: InstrumentSonde): string[] =>
  i === "BTA" ? ["13 semaines", "26 semaines", "52 semaines"] : ["2 ans", "3 ans", "4 ans", "5 ans", "6 ans", "7 ans", "8 ans", "9 ans", "10 ans"];

/* ------------------------------------------------------------------ *
 * LE GABARIT : CE QUE LE CLIENT REMPLIT
 * ------------------------------------------------------------------ */

/**
 * LE GABARIT D'UNE LIGNE, PAR COMPARTIMENT.
 *
 * Le dirigeant a demandé « un gabarit (OTA, BTA) que le client remplit ». Il
 * est ici et non dans le formulaire parce que le serveur refuse les mêmes
 * manques : un formulaire est une commodité, et cette action s'appelle sans
 * lui. Les libellés sont ceux de la place, pas ceux de la base.
 *
 * CE QUI DIFFÈRE ENTRE LES DEUX, ET C'EST TOUT CE QUI DIFFÈRE : une OTA porte
 * un coupon et se traite en POURCENTAGE DU NOMINAL ; un BTA n'a pas de coupon,
 * il se vend précompté, et son niveau EST son taux. Demander un prix sur un BTA
 * ou un coupon sur un bon serait demander un chiffre qui n'existe pas.
 */
export interface ChampDuGabarit {
  cle: "country" | "tenor" | "rate" | "pricePct" | "montant" | "quand" | "jusqua";
  nom: string;
  aide: string;
  requis: boolean;
}

export function gabarit(i: InstrumentSonde): ChampDuGabarit[] {
  const commun: ChampDuGabarit[] = [
    { cle: "country", nom: "Le Trésor", aide: "Lequel des six États de la zone emprunte.", requis: true },
    { cle: "tenor", nom: "La durée", aide: i === "BTA" ? "13, 26 ou 52 semaines : un bon ne va pas au-delà de l'année." : "En années, de 2 à 10 : c'est ce que vous prêtez.", requis: true },
  ];
  const niveau: ChampDuGabarit[] =
    i === "BTA"
      ? [{ cle: "rate", nom: "Le taux que vous accepteriez, au moins", aide: "En pourcentage précompté. Plus il descend, mieux le Trésor est servi — et moins vous recevez.", requis: false }]
      : [
          { cle: "rate", nom: "Le coupon que vous attendez, au moins", aide: "En pourcentage par an. C'est ce que la ligne versera chaque année.", requis: false },
          { cle: "pricePct", nom: "Le prix que vous accepteriez, au plus", aide: "En pourcentage du nominal. Au-dessus de 100, vous payez plus que ce qui sera remboursé.", requis: false },
        ];
  return [
    ...commun,
    ...niveau,
    { cle: "montant", nom: "Ce que vous prendriez", aide: "En francs. C'est ce chiffre qui est porté au Trésor, et rien ne vous engage.", requis: true },
    { cle: "quand", nom: "Prêt à partir du", aide: "Le jour où vous seriez prêt. Une séance tenue avant lui vous trouverait sans fonds.", requis: true },
    { cle: "jusqua", nom: "Valable jusqu'au", aide: "Le jour où votre attente s'arrête d'elle-même. Le desk ne porte au Trésor que des appétits vivants.", requis: false },
  ];
}

/**
 * CE QUI MANQUE À UNE LIGNE, UNE PHRASE PAR MANQUE.
 *
 * LES BORNES NE SONT PAS DES CONVICTIONS DE MARCHÉ, elles écartent la faute de
 * frappe — un taux de 65 au lieu de 6,5, une durée de 50 ans. C'est la règle
 * déjà écrite au-dessus de `surveyLimitBlock`, et elle vaut ici pour la même
 * raison : ce qui passe reste discutable, et c'est au desk d'en discuter.
 */
export function manquesDeLaLigne(l: Partial<LigneSondee>, aujourdHui: string): string[] {
  const dits: string[] = [];
  if (!l.instrument) dits.push("Dites si c'est une obligation (OTA) ou un bon (BTA).");
  if (!l.country) dits.push("Dites quel Trésor emprunte.");
  if (!l.tenor?.trim()) dits.push("Dites la durée.");
  if (!(l.montant != null && l.montant > 0)) dits.push("Dites ce que vous prendriez, en francs.");
  if (!l.seanceLe && l.dansJours == null) dits.push("Dites à partir de quand vous seriez prêt : une date, ou un nombre de jours.");
  if (l.seanceLe && l.seanceLe < aujourdHui) dits.push("Cette date est passée : une séance ne se tient pas hier.");
  if (l.dansJours != null && (l.dansJours < 0 || l.dansJours > 365)) dits.push("Le délai se dit entre 0 et 365 jours.");
  /* LA FENÊTRE SE TIENT DANS LE BON SENS, et elle ne se ferme pas hier : une
     attente déjà expirée au dépôt ne compterait nulle part, et le client
     croirait l'avoir dite. */
  if (l.jusquA && l.jusquA < aujourdHui) dits.push("Cette fin est passée : une attente qui s'arrête hier ne dit rien au desk.");
  if (l.jusquA && l.seanceLe && l.jusquA < l.seanceLe) dits.push("La fin vient avant le début : votre attente se fermerait avant de s'ouvrir.");
  if (l.rate != null && !(l.rate > 0 && l.rate <= 30)) dits.push("Un taux au-dessus de 30 % est probablement une faute de frappe.");
  if (l.pricePct != null && (l.pricePct < 50 || l.pricePct > 150)) dits.push("Un prix se dit en pourcentage du nominal, entre 50 et 150.");
  /* UN BON N'A NI COUPON NI PRIX : il se vend précompté, et son taux EST son
     niveau. Accepter un prix ici le ferait porter au desk sur un chiffre qui
     n'existe pas sur ce compartiment. */
  if (l.instrument === "BTA" && l.pricePct != null) dits.push("Un bon du Trésor n'a pas de prix en pourcentage : il se vend précompté, et c'est son taux qui dit le niveau.");
  return dits;
}

/* ------------------------------------------------------------------ *
 * LE CONSENSUS
 * ------------------------------------------------------------------ */

export interface Consensus {
  /** La clef du groupe : compartiment, Trésor, durée. */
  cle: string;
  instrument: InstrumentSonde;
  country: Country;
  tenor: string;
  /** La ligne du desk qui a suscité ces réponses, quand c'en est une. */
  surLigne?: string;
  /**
   * COMBIEN DE CLIENTS, ET COMBIEN DE FRANCS EN TOUT — SI CETTE LIGNE SORTAIT.
   *
   * C'est la taille POSSIBLE du groupe : ce que la maison prendrait si le
   * Trésor émettait celle-ci plutôt qu'une autre. Elle compte les alternatives
   * avec le reste, et c'est voulu — on veut savoir ce que cette durée-là peut
   * porter. Ce n'est pas ce qu'on promet.
   */
  clients: number;
  montant: number;
  /**
   * CE QU'ON PEUT PROMETTRE : la part qui n'est partagée avec aucune sœur.
   *
   * Un client qui propose six alternatives pour cinquante millions apporte
   * cinquante millions à CHACUN des six groupes possibles, et zéro franc ferme
   * à tous. Le porter six fois à deux Trésors reviendrait à promettre deux
   * fois le même argent — exactement le crédit que la maison a mis des mois à
   * prendre. Voir « DOCTRINE_UNE_SEULE_FOIS ».
   */
  ferme: number;
  /** Les clients de la part ferme : trois alternatives ne font pas trois clients. */
  clientsFermes: number;
  /**
   * LE NIVEAU PONDÉRÉ PAR LES MONTANTS, et non la moyenne des niveaux.
   *
   * Dix clients à un million et un à cent millions ne pèsent pas pareil devant
   * un Trésor : une moyenne simple donnerait la voix du petit au même volume
   * que celle du gros, et la maison porterait un chiffre que personne ne
   * tiendrait. C'est le centre de gravité de l'argent, pas celui des avis.
   */
  niveau: number | null;
  unite: SurveyUnit;
  /**
   * LA DATE AU PLUS TÔT, et c'est un MAXIMUM — le mot surprend, la raison non.
   *
   * Chaque client dit à partir de quand il serait prêt. Une séance tenue avant
   * le plus tardif d'entre eux le trouverait sans fonds : il serait compté dans
   * la demande portée au Trésor, et absent le jour venu. La date du consensus
   * est donc le PLUS TARD des « à partir de », et c'est la première date où la
   * demande annoncée est la demande réelle.
   */
  auPlusTot?: string;
  /** L'échelle : à quel niveau la demande s'arrête. */
  echelle: SurveyLadder;
}

/**
 * LA DURÉE RÉDUITE À SA FORME CANONIQUE, POUR QUE DEUX CLIENTS SE RETROUVENT.
 *
 * LE DÉFAUT QUE CECI FERME, et il était au cœur du service. Le dirigeant l'a
 * redit le 26 octobre 2026 : « le client construit sa propre ligne, la propose
 * au desk, QUI LA COMPILE AVEC CELLES DES AUTRES CLIENTS et en déduit un
 * consensus ». La durée est un texte libre — c'est voulu, un Trésor de la zone
 * n'émet pas sur une grille fermée — et la clef la prenait telle quelle, à la
 * casse et aux espaces près. « 5ans » et « 5 ans » faisaient donc DEUX groupes.
 *
 * ET C'EST LE PIRE GENRE DE SILENCE : deux groupes d'un client chacun, chacun
 * sous le seuil, et rien à l'écran pour dire qu'ils sont la même ligne. Le desk
 * voit « ce qui s'accumule » s'allonger sans jamais mûrir, et personne ne peut
 * deviner que la demande existait — elle était coupée en deux par une espace.
 *
 * ON NE RAPPROCHE TOUJOURS PAS LES DURÉES VOISINES : « 5 ans » et « 6 ans »
 * restent deux lignes, parce que ce sont deux lignes pour un Trésor. Ici on ne
 * rapproche que ce qui est DÉJÀ la même durée, écrite autrement.
 */
const dureeCanonique = (tenor: string): string => {
  const a = anneesDuTenor(tenor);
  if (a) return `${a}a`;
  const s = /^\s*(\d{1,3})\s*sem/i.exec(tenor);
  if (s) return `${Number(s[1])}s`;
  /* Ce qu'on ne sait pas lire garde sa forme, nettoyée : mieux vaut un groupe
     de trop qu'un rapprochement inventé. */
  return tenor.trim().toLowerCase().replace(/\s+/g, " ");
};

/** La clef de regroupement : même compartiment, même Trésor, même durée. */
export const cleDeGroupe = (l: Pick<LigneSondee, "instrument" | "country" | "tenor">) => `${l.instrument}|${l.country}|${dureeCanonique(l.tenor)}`;

/**
 * LE JOUR OÙ CETTE LIGNE DEVIENT PRÊTE, et il se compte DEPUIS SA CRÉATION.
 *
 * LE DÉFAUT QUE CETTE SIGNATURE FERME, trouvé le 26 octobre 2026 en écrivant
 * l'épreuve du consensus : la fonction prenait « aujourd'hui » en argument, et
 * deux appelants lui donnaient deux choses. Le robot du matin passait le jour
 * de création — « dans 21 jours » dit le 20 octobre veut dire le 10 novembre,
 * pour toujours. La page du desk passait le jour courant, donc la date du
 * consensus FUYAIT d'un jour chaque matin : elle restait éternellement à
 * « aujourd'hui + 21 », le desk ne voyait jamais une date sur laquelle agir, et
 * le robot fermait une ligne que l'écran annonçait encore prête pour dans trois
 * semaines. Les deux étaient justes séparément, et faux ensemble.
 *
 * LA BASE N'EST DONC PLUS UN ARGUMENT. Elle vient de la ligne, qui la porte :
 * un appelant ne peut plus se tromper, parce qu'il n'a plus rien à choisir.
 * C'est la seule forme de correction qui tienne — rendre la faute impossible
 * plutôt que de la corriger aux deux endroits.
 */
export function prete(l: Pick<LigneSondee, "seanceLe" | "dansJours" | "createdAt">): string | undefined {
  if (l.seanceLe) return l.seanceLe.slice(0, 10);
  if (l.dansJours == null) return undefined;
  return new Date(Date.parse(`${l.createdAt.slice(0, 10)}T00:00:00Z`) + l.dansJours * 86_400_000).toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ *
 * MODIFIER UNE INTENTION SANS DÉPLACER SA DATE
 * ------------------------------------------------------------------ */

const JOUR = 86_400_000;
const minuit = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);

/**
 * CE QUI RESTE À COURIR, pour revenir dans le champ du client qui modifie.
 *
 * Il a écrit « dans 21 jours » le 19 octobre ; il rouvre son intention le 26.
 * Lui remontrer 21 lui dirait que sa ligne est prête le 16 novembre, alors
 * qu'elle l'est le 9. Ce qu'il doit lire est ce qui reste : quatorze.
 */
/**
 * LA FENÊTRE EST-ELLE REFERMÉE ?
 *
 * « jusquA » vide veut dire « jusqu'à ce que je la retire », et c'est le cas de
 * toutes les lignes d'avant le 30 octobre 2026 : elles ne s'éteignent pas, et
 * elles ne doivent pas s'éteindre rétroactivement.
 */
export function expiree(l: Pick<LigneSondee, "jusquA">, aujourdHui: string): boolean {
  return Boolean(l.jusquA && l.jusquA < aujourdHui);
}

export function joursRestants(l: Pick<LigneSondee, "seanceLe" | "dansJours" | "createdAt">, aujourdHui: string): number | undefined {
  const j = prete(l);
  return j ? Math.max(0, Math.round((minuit(j) - minuit(aujourdHui)) / JOUR)) : undefined;
}

/**
 * LE DÉLAI RÉÉCRIT, POUR QUE LA DATE SOIT CELLE QUE LE CLIENT A VOULUE.
 *
 * LE PIÈGE QUE CECI FERME, et il n'aurait eu aucun symptôme. Le délai est
 * stocké DEPUIS LA CRÉATION — c'est ce qui le rend stable, voir `prete`. Le
 * client, lui, pense toujours depuis aujourd'hui : il rouvre son intention le
 * 26 octobre, tape « 21 jours », et attend le 16 novembre. Écrit tel quel sur
 * une ligne née le 19, 21 devient le 9 novembre — une semaine TROP TÔT, et sur
 * une ligne plus vieille, une date DÉJÀ PASSÉE que le robot clôt le soir même
 * avec un motif que personne ne comprendra.
 *
 * On convertit donc : ce que le client dit en jours depuis aujourd'hui, la base
 * le garde en jours depuis la création. C'est la même date, dans l'unité de
 * chacun.
 */
export function delaiDepuisLaCreation(createdAt: string, joursDepuisAujourdHui: number, aujourdHui: string): number {
  return Math.max(0, Math.round((minuit(aujourdHui) + joursDepuisAujourdHui * JOUR - minuit(createdAt)) / JOUR));
}

/* ------------------------------------------------------------------ *
 * LE RENDEMENT ACTUARIEL D'UNE OTA SONDÉE
 * ------------------------------------------------------------------ */

/**
 * LA DURÉE EN ANNÉES, LUE DU TEXTE QUE SON AUTEUR A TAPÉ.
 *
 * La durée est libre — « 5 ans », « 52 semaines » — parce qu'un Trésor de la
 * zone n'émet pas sur une grille fermée. Le rendement, lui, a besoin d'une
 * échéance : sans année lisible, il n'y en a pas, et on n'en invente pas.
 */
export function anneesDuTenor(tenor: string): number | undefined {
  const m = /^\s*(\d{1,2})\s*an/i.exec(tenor);
  const n = m ? Number(m[1]) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 30 ? n : undefined;
}

/**
 * LE RENDEMENT ACTUARIEL BRUT D'UNE LIGNE SONDÉE, OU RIEN.
 *
 * CE QUE LE DIRIGEANT A DEMANDÉ, le 26 octobre 2026 : « ajouter le rendement
 * actuariel à l'OTA ». C'est le chiffre qui compare : un coupon de 6,25 % acheté
 * à 97 ne rend pas 6,25 %, et deux lignes de coupons différents ne se comparent
 * que par là.
 *
 * IL PASSE PAR « finance.bondCalc », et pas par une seconde formule : c'est la
 * règle de la maison, et elle a une raison vécue — une maquette à coupon annuel
 * donnait 98,36 là où la fiche affichait 96,50 pour le même rendement. Le
 * chiffre rendu ici est, par construction, celui de la fiche.
 *
 * IL N'EXISTE QUE SI TOUT EXISTE, et c'est la moitié de la fonction :
 *
 *   UN BON N'EN A PAS. Il se vend précompté : son taux EST son rendement, et en
 *   afficher un second ferait lire deux chiffres pour une seule vérité.
 *   SANS PRIX, IL N'Y A RIEN À AJOUTER. Au pair, le rendement d'une ligne neuve
 *   est exactement son coupon — « 6,25 % · rendement 6,25 % » est du bruit.
 *   SANS DURÉE LISIBLE NI DATE, IL N'Y A PAS D'ÉCHÉANCIER, donc pas de
 *   rendement. On rend `undefined` plutôt qu'un chiffre approché : un rendement
 *   faux est pire qu'un rendement absent, parce qu'il se compare.
 *
 * LE NOMINAL EST SANS EFFET sur le résultat — le rendement est invariant
 * d'échelle, seuls comptent le coupon, le prix et les dates — et c'est pour cela
 * qu'on peut en poser un sans rien savoir de la ligne.
 */
const NOMINAL_INDIFFERENT = 10_000;

export function rendementDeLaLigne(l: Pick<LigneSondee, "instrument" | "tenor" | "rate" | "pricePct" | "seanceLe" | "dansJours" | "createdAt">): number | undefined {
  if (l.instrument !== "OTA" || l.rate == null || l.pricePct == null) return undefined;
  const annees = anneesDuTenor(l.tenor);
  const depart = prete(l);
  if (!annees || !depart) return undefined;
  const fin = new Date(Date.parse(`${depart}T00:00:00Z`));
  fin.setUTCFullYear(fin.getUTCFullYear() + annees);
  const { irr } = bondCalc({ nominal: NOMINAL_INDIFFERENT, couponRate: l.rate, settleOn: depart, maturityOn: fin.toISOString().slice(0, 10) }, NOMINAL_INDIFFERENT, l.pricePct);
  return Number.isFinite(irr) ? irr : undefined;
}

/**
 * CE QUE LE ROBOT PROPOSE AU DESK : UNE LIGNE PAR GROUPE, ET SON ÉCHELLE.
 *
 * Le dirigeant a demandé qu'« un robot consolide et propose un consensus ». Ce
 * que le desk reçoit sans lui, c'est une liste : vingt lignes poussées par
 * dix-sept clients, chacune avec son pays, sa durée, son taux et sa date. Une
 * liste ne se porte pas à un Trésor. Une phrase se porte : « OTA Cameroun
 * 5 ans — quatre cent vingt millions de onze clients, autour de 6,42 %, tous
 * prêts à partir du 18 novembre ».
 *
 * LES LIGNES DU DESK NE SONT PAS COMPTÉES DANS LEUR PROPRE DEMANDE. Une ligne
 * sondée est une QUESTION ; la compter avec les réponses ajouterait à la
 * demande de la place le montant que la maison cherchait à placer, c'est-à-dire
 * qu'elle se répondrait à elle-même. Elle donne son nom au groupe, et rien de
 * plus.
 *
 * ON NE GROUPE PAS LES DURÉES VOISINES, et c'est délibéré. « 5 ans » et « 6 ans »
 * sont deux lignes différentes pour un Trésor, et les réunir dans un consensus
 * à 5,5 ans proposerait une ligne que personne n'a demandée. Le desk rapproche
 * s'il le juge bon : c'est son métier, pas celui d'un robot.
 */
/* L'ARGUMENT « aujourd'hui » A DISPARU D'ICI, et c'est la fin du défaut que
   `prete` portait : plus rien dans un consensus ne dépend du jour où on le
   lit. Un appelant ne peut plus lui passer la mauvaise base, parce qu'il n'a
   plus de base à passer. */
export function consensus(lignes: LigneSondee[]): Consensus[] {
  const vivantes = lignes.filter((l) => l.state !== "close");
  const parId = new Map(vivantes.map((l) => [l.id, l]));
  /**
   * LES SŒURS, COMPTÉES AVANT LES GROUPES.
   *
   * Une ligne est FERME quand son montant n'est engagé nulle part ailleurs :
   * soit elle est née seule, soit toutes ses sœurs ont été closes et elle
   * reste la dernière vivante de sa famille. Dans les deux cas le client
   * n'honorera qu'elle, et le desk peut la porter.
   *
   * Une ligne qui a des sœurs vivantes n'apporte RIEN de ferme à son groupe —
   * pas une fraction, pas une moyenne. Le client n'en prendra qu'une, et
   * personne ne sait laquelle : répartir cinquante millions en six fois huit
   * serait promettre six lignes dont aucune n'existera à cette taille.
   */
  const vivantesParFamille = new Map<string, number>();
  for (const l of vivantes) if (l.familleId) vivantesParFamille.set(l.familleId, (vivantesParFamille.get(l.familleId) ?? 0) + 1);
  const estFerme = (l: LigneSondee) => !l.familleId || (vivantesParFamille.get(l.familleId) ?? 0) <= 1;
  const groupes = new Map<string, { entete: LigneSondee; surLigne?: string; demandes: LigneSondee[] }>();

  for (const l of vivantes) {
    if (l.origine === "desk") continue;
    /* UNE RÉPONSE SE RANGE SOUS LA LIGNE QU'ELLE VISE, et prend ses
       caractéristiques : le client y a répondu « combien » et « quand », pas
       « quel pays, quelle durée » — c'est la question qui les porte. */
    const sur = l.repondA ? parId.get(l.repondA) : undefined;
    const entete = sur ?? l;
    const cle = sur ? `desk:${sur.id}` : cleDeGroupe(l);
    const g = groupes.get(cle) ?? { entete, surLigne: sur?.id, demandes: [] };
    g.demandes.push(l);
    groupes.set(cle, g);
  }

  return [...groupes.entries()]
    .map(([cle, g]) => {
      /* LE NIVEAU EST LE TAUX, ET RIEN D'AUTRE : voir UNITE_SONDEE. Le prix
         d'une OTA reste au détail, hors de la moyenne et hors de l'échelle. */
      const niveauDe = (l: LigneSondee) => l.rate ?? null;
      const montant = g.demandes.reduce((t, l) => t + l.montant, 0);
      const avecNiveau = g.demandes.filter((l) => niveauDe(l) != null);
      const poids = avecNiveau.reduce((t, l) => t + l.montant, 0);
      const niveau = poids > 0 ? avecNiveau.reduce((t, l) => t + niveauDe(l)! * l.montant, 0) / poids : null;
      const jours = g.demandes.map((l) => prete(l)).filter((d): d is string => Boolean(d));
      return {
        cle,
        instrument: g.entete.instrument,
        country: g.entete.country,
        tenor: g.entete.tenor,
        surLigne: g.surLigne,
        clients: new Set(g.demandes.map((l) => l.userId ?? l.id)).size,
        montant,
        ferme: g.demandes.filter(estFerme).reduce((t, l) => t + l.montant, 0),
        clientsFermes: new Set(g.demandes.filter(estFerme).map((l) => l.userId ?? l.id)).size,
        niveau,
        unite: UNITE_SONDEE,
        auPlusTot: jours.length ? jours.reduce((a, b) => (a > b ? a : b)) : undefined,
        echelle: ladderOf(
          g.demandes.map((l) => ({ amount: l.montant, limit: niveauDe(l), ferme: false })),
          UNITE_SONDEE,
        ),
      };
    })
    .sort((a, b) => b.montant - a.montant);
}

/**
 * CE QUI EST MÛR, ET CE QUI NE L'EST PAS ENCORE.
 *
 * Un consensus de trois millions sur deux clients n'intéresse aucun Trésor : le
 * porter ferait perdre à la maison le crédit qu'elle a mis des mois à prendre.
 * Le seuil vit ici, en un seul endroit, parce que l'écran du desk et le robot
 * du soir posent la même question — et parce qu'un seuil écrit deux fois finit
 * par valoir deux nombres.
 *
 * CENT MILLIONS ET TROIS CLIENTS, et les deux comptent ensemble : cent millions
 * d'un seul client ne sont pas une demande de la place, c'est un ordre, et il a
 * sa propre porte. Trois clients à un million ne sont pas une ligne.
 */
export const SEUIL_MONTANT = 100_000_000;
export const SEUIL_CLIENTS = 3;
/**
 * LE MUR SE JUGE SUR LA PART FERME, ET NON SUR LE MONTANT POSSIBLE.
 *
 * Un consensus bâti sur des alternatives n'est pas une demande de la place :
 * c'est la même demande comptée plusieurs fois. Le juger sur « montant »
 * reviendrait à porter au Trésor des francs que le client a déjà promis
 * ailleurs, et les clients avec : trois clients dont deux n'apportent que des
 * alternatives ne sont pas trois clients.
 */
export const mur = (c: Consensus): boolean => c.ferme >= SEUIL_MONTANT && c.clientsFermes >= SEUIL_CLIENTS;

/**
 * LE MONTANT D'UN CLIENT SE COMPTE UNE SEULE FOIS, QUEL QUE SOIT LE NOMBRE
 * DE LIGNES QU'IL PROPOSE.
 *
 * ARBITRÉ PAR LE DIRIGEANT LE 29 OCTOBRE 2026, en réponse à une question que
 * la maquette « proposer votre propre ligne » a posée : si l'on permet de
 * choisir plusieurs Trésors et plusieurs durées d'un coup, que devient le
 * montant ?
 *
 * CE QUI SE PASSERAIT SANS CETTE RÈGLE, MESURÉ ET NON SUPPOSÉ. Un client qui
 * dit « cinquante millions, sur du camerounais ou du gabonais, à deux, cinq
 * ou sept ans » produit SIX lignes, donc six groupes — « cleDeGroupe » les
 * sépare par pays et par durée. Chacun porte 50 000 000 F et un client :
 * la somme des groupes vaut 300 000 000 F pour 50 000 000 F réellement
 * engagés.
 *
 * LE MUR N'EST PAS LE DANGER, et il faut le dire parce que c'est ce que j'ai
 * cru d'abord : il exige cent millions ET trois clients, donc aucun des six
 * groupes ne le franchit. Le danger est ailleurs, et il est pire parce qu'il
 * ne déclenche rien — le desk peut porter cinquante millions au Cameroun ET
 * cinquante millions au Gabon, et le client n'en honorera qu'un. La maison
 * aurait promis deux fois le même argent à deux Trésors, ce qui est
 * exactement le crédit qu'elle a mis des mois à prendre.
 *
 * CE QUE LA RÈGLE EXIGE DU MODÈLE — ET QUI EST ÉCRIT DEPUIS LE 29 OCTOBRE 2026,
 * le jour où le geste a été rendu au client :
 *
 *   · QUE LA LIGNE CONNAISSE SES SŒURS. Une proposition faite d'un geste est
 *     une famille, et sans lien entre ses membres aucun calcul ne peut savoir
 *     que les six sont des ALTERNATIVES et non des additions.
 *     → « LigneSondee.familleId ».
 *
 *   · QUE LE CONSENSUS DISE DEUX CHIFFRES ET NON UN. Le montant du groupe
 *     reste ce qu'on prendrait SI CETTE LIGNE SORTAIT — c'est lui qui dit la
 *     taille possible, et il vaut 50 000 000 F. À côté, la part FERME : ce
 *     qui n'est partagé avec aucune sœur, et que le desk peut porter sans
 *     risquer de le voir honoré ailleurs. Ici elle vaut zéro.
 *     → « Consensus.ferme » et « Consensus.clientsFermes ».
 *
 *   · QUE LE MUR SE JUGE SUR LA PART FERME, et non sur le montant possible.
 *     Un consensus bâti sur des alternatives n'est pas une demande de la
 *     place : c'est la même demande comptée plusieurs fois.
 *     → « mur ».
 *
 * UNE SŒUR CLOSE LIBÈRE SES SŒURS. Quand il ne reste qu'une vivante dans une
 * famille, le client n'honorera qu'elle : son montant redevient ferme sans que
 * personne ait à le déclarer. C'est la même règle lue à l'envers, et c'est
 * pourquoi la fermeté se mesure sur les lignes VIVANTES et non à la création.
 *
 * ON NE RÉPARTIT PAS. Couper cinquante millions en six fois huit serait
 * promettre six lignes dont aucune n'existera à cette taille : le client n'en
 * prendra qu'une, et personne ne sait laquelle.
 */
export const DOCTRINE_UNE_SEULE_FOIS =
  "Le montant d'un client se compte une seule fois, quel que soit le nombre de lignes qu'il propose : des lignes sœurs sont des alternatives, pas des additions.";

/* ------------------------------------------------------------------ *
 * CE QUE LE CLIENT LIT SUR SA PAGE
 * ------------------------------------------------------------------ */

export interface AttenteVue {
  etat: LigneSondee["state"];
  mot: string;
  phrase: string;
}

/**
 * L'ÉTAT D'UNE ATTENTE, EN FRANÇAIS, ET SANS PROMETTRE DE SÉANCE.
 *
 * C'est le piège de cet écran : le client qui a dit « je prendrais cent
 * millions d'OTA camerounaise à cinq ans » attend ensuite une séance, et la
 * maison ne peut lui en promettre aucune — ce n'est pas elle qui adjuge. Chaque
 * phrase dit donc ce qui s'est passé, et pas ce qui va se passer.
 */
export function etatDeLAttente(l: Pick<LigneSondee, "state" | "origine" | "repondA">): AttenteVue {
  if (l.state === "close") return { etat: "close", mot: "Close", phrase: "Cette attente est close. Elle a été portée, ou la date est passée : rien n'en reste engagé, puisque rien ne l'était." };
  if (l.state === "consolidee") return { etat: "consolidee", mot: "Portée", phrase: "Votre ligne est entrée dans la demande que la maison porte au Trésor. Si une séance s'ouvre dessus, le desk vous rappellera avant la clôture." };
  return {
    etat: "ouverte",
    mot: "Reçue",
    phrase: l.repondA
      ? "Votre réponse est au desk. Elle ne vous engage à rien : c'est un renseignement, et il sert à dire au Trésor à quel niveau la demande tient encore."
      : "Votre ligne est au desk. Elle ne vous engage à rien, et elle attend d'autres clients : une ligne se porte à un Trésor quand plusieurs la demandent.",
  };
}
