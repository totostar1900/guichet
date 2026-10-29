import { MARKET_PAGES, type MarketPage } from "./market/pages";

/**
 * LES PAGES DE CHAQUE SIÈGE, DÉCLARÉES UNE FOIS.
 *
 * La bande de l'écran large et le dock du téléphone tenaient chacun leur
 * liste. Deux listes de la même chose divergent toujours, et c'est ainsi que
 * « Mes documents » a existé pendant une journée sans qu'aucun menu n'y mène.
 *
 * Un siège ne mène plus à une page : il ouvre sa liste, et l'ancienne racine
 * en est le premier élément. Un siège qui est à la fois un lien et un bouton
 * demande au lecteur de viser, et il vise mal : le nom ouvrait une page, le
 * chevron ouvrait la liste, et deux cibles de huit pixels se touchent.
 */
/* « guide » entre dans la part partagee : la rangee d onglets s en sert pour
   ecarter la lecon, qui vit sous « /info » et dont la pastille ne
   s allumerait jamais. */
export type NavPage = Pick<MarketPage, "key" | "href" | "label" | "hint" | "short" | "tuile" | "guide" | "mots">;

/**
 * Ce que je possède, et ce qui en découle. Le tableau de bord ouvre la liste
 * parce qu'il EST l'ancienne racine : la déplacer sans la nommer l'aurait
 * rendue introuvable.
 */
export const PORTEFEUILLE_PAGES: NavPage[] = [
  { key: "bord", href: "/", label: "Tableau de bord", tuile: "ce qui vous attend", hint: "ce que vous avez, ce qui vous attend, et ce qui est entré" },
  { key: "performance", href: "/moi/performance", label: "Analyse", tuile: "répartition et rendement", hint: "la répartition, le rendement, l'échéancier et vos opérations" },
  { key: "reinvestir", href: "/moi/reinvestir", label: "Réinvestir", tuile: "un coupon qui tombe", hint: "où remettre un coupon ou un remboursement qui vient de tomber" },
  { key: "documents", href: "/moi/documents", label: "Mes documents", tuile: "relevés, avis, bulletins", hint: "vos relevés, vos avis d'opéré, vos bulletins et vos appels de fonds" },
  /* LA PROVISION EST DE L'ARGENT QU'ON POSSÈDE, pas un geste qu'on pose : sa
     place est ici, avec le reste de ce qu'on a. Elle avait été rangée dans
     « Agir » la veille, par la même main qui écrit ceci, et c'était la
     confondre avec les services qui la dépensent. */
  { key: "provision", href: "/moi/provision", label: "Votre provision", tuile: "votre argent chez nous", hint: "ce que vous laissez chez nous règle vos ordres sans attendre un virement" },
];

/**
 * Ce qui s'achète. Les trois façons d'entrer sur une ligne, et rien d'autre :
 * un éclairage sur l'indice n'est pas un instrument, et une séance annoncée en
 * est un.
 */
export const INSTRUMENTS_PAGES: NavPage[] = [
  { key: "titres", href: "/titres", label: "Titres", tuile: "obligations, bons, actions", hint: "obligations, bons du Trésor et actions de la zone CEMAC" },
  { key: "fonds", href: "/fonds", label: "Fonds", tuile: "les OPCVM de la zone", hint: "les OPCVM de la zone, leur valeur liquidative et leurs frais" },
  { key: "calendrier", href: "/calendrier", label: "Adjudications", tuile: "les séances des Trésors", hint: "les séances des six Trésors, annoncées environ une semaine avant" },
];

/**
 * CE QU'ON MET EN PLACE. « Agir » n'avait qu'un seul item, « Passer un
 * ordre », écrit à la main dans la colonne — et le groupe entier se lisait
 * donc comme une page déguisée en rayon.
 *
 * Les trois gestes que la maison nomme (domain/services : placer, programmer,
 * tenir) existaient pourtant chacun avec sa page, et deux d'entre eux
 * n'étaient listés NULLE PART : on n'arrivait sur le prélèvement automatique
 * et sur la provision qu'en tapant leur adresse, ou par un lien croisé. Un
 * service qu'on ne trouve pas n'est pas un service.
 *
 * « Réinvestir » n'y est pas, et ce n'est pas un oubli : il est déjà dans
 * « Portefeuille », parce qu'un coupon qui tombe appartient d'abord à ce
 * qu'on possède. Deux portes vers la même page dans la même vue, c'est
 * exactement ce que la fusion des sièges a retiré.
 */
export const AGIR_PAGES: NavPage[] = [
  { key: "trader", href: "/trader", label: "Passer un ordre", tuile: "acheter ou vendre", hint: "acheter, souscrire, vendre ou demander un rachat" },
  { key: "prelevements", href: "/moi/prelevements", label: "Prélèvement automatique", tuile: "placer chaque mois", hint: "une somme prélevée à date fixe, sous un plafond que vous fixez" },
  /* DEUX DÉCISIONS, ET NON UNE. « Épargne programmée » dit combien part,
     quand, et vers quoi : c'est un placement qui se répète. Le mandat de
     prélèvement dit seulement que la maison peut débiter un compte nommé,
     sous un plafond : c'est une autorisation de paiement, qui sert aussi à
     provisionner. On peut avoir l'une sans l'autre, et le mandat sert à plus
     d'une chose. Deux lignes, donc, et deux pages. */
  { key: "epargne", href: "/moi/epargne", label: "Épargne programmée", tuile: "placer chaque mois", hint: "une somme fixe, un jour du mois, vers le fonds que vous choisissez" },
];

/**
 * LE SIÈGE TRADE, APRÈS LA FUSION DU 24 OCTOBRE 2026.
 *
 * « Instruments » nommait une seconde fois ce que « Placer » menait déjà :
 * relevé dans `domain/services`, ses cinq services conduisaient tous aux trois
 * familles — adjudications, cote, fonds. Le siège les rangeait par instrument,
 * c'est-à-dire par l'axe que ce même fichier avait écarté : personne ne se
 * réveille en voulant un OPCVM. Deux sièges pour un seul sujet, et le lecteur
 * payait le tri.
 *
 * Les deux listes restent écrites chacune de son côté — les gestes d'un
 * côté, les familles de l'autre — parce qu'elles ne répondent pas à la même
 * question. Elles se rejoignent ici, et ici seulement : un seul siège, une
 * seule liste à l'écran.
 *
 * LES GESTES D'ABORD. « Passer un ordre » est la racine du siège, comme le
 * tableau de bord est celle du portefeuille ; les familles viennent ensuite,
 * parce qu'on les ouvre en sachant déjà ce qu'on veut en faire.
 */
export const TRADE_PAGES: NavPage[] = [...AGIR_PAGES, ...INSTRUMENTS_PAGES];

/** Ce qui se lit : l'indice, les sociétés, les notes, les actualités. */
export const MARCHE_PAGES: NavPage[] = MARKET_PAGES;

/**
 * CE QUI SE LIT ET QUI SE DEMANDE, ET QUI N'AVAIT PAS DE PORTE.
 *
 * Les deux vivaient au bas de « Trade » : la carte du conseiller sous les
 * neuf services, et un rayon « Avant de placer, comprendre » sous elle. On y
 * tombait en descendant une page qu'on était venu lire pour AGIR, et personne
 * ne descend une page de services pour chercher un numéro ou une leçon.
 *
 * Deux pages, donc, et le rail y mène. Le guide existait déjà sans qu'aucun
 * menu du client n'y conduise ; « Nous contacter » est né de ce
 * déménagement.
 *
 * ELLES SONT QUATRE DEPUIS LE 24 OCTOBRE 2026, et les deux qui entrent ne
 * sont pas nouvelles : « Questions courantes » et « Risques et limites »
 * étaient des tuiles de la feuille du compte, derrière l'initiale, avec le
 * guide. La feuille est devenue le sommaire du compte, qui ne garde que ce qui
 * parle de VOUS ; ces deux-là parlent de la maison, et le siège « Aide » est
 * précisément fait pour elles.
 *
 * « NOUS CONTACTER » PASSE DEVANT, et c'est l'ordre du siège : on demande
 * d'abord à quelqu'un, on cherche ensuite soi-même. Le rail et la page lisent
 * la même table, donc le même ordre, et c'est la seule façon qu'ils ne
 * divergent pas.
 */
/**
 * L'AIDE, SANS SA PORTE DE TROP.
 *
 * « Le guide » était une entrée qui n'ouvrait rien : une page portant six
 * sections repliées, qu'il fallait descendre et déplier pour atteindre le
 * glossaire — destination de soixante-six entrées de la recherche — ou le
 * simulateur. Les sections sont remontées ici, chacune à son adresse : on
 * arrive où l'on voulait aller, d'un clic, et une adresse se partage.
 *
 * « Outils et repères » N'EST PAS REMONTÉ, et c'est voulu. Ses trois liens —
 * le comparateur, le profil financier, les sociétés — ont déjà leur entrée
 * ailleurs dans la colonne. La page des éclairages les CITE en bas ; deux
 * listes de la même chose divergent toujours.
 *
 * L'ordre est celui de la lecture : ce qu'on demande, ce qu'on apprend, ce
 * avec quoi on calcule, les mots, ce que ça engage, et qui répond.
 */
export const AIDE_PAGES: NavPage[] = [
  { key: "questions", href: "/info/aide", label: "Questions courantes", tuile: "ce qu'on nous demande", hint: "ce qu'on nous demande le plus souvent, répondu une fois pour toutes" },
  { key: "eclairages", href: "/info/eclairages", label: "Éclairages", tuile: "comprendre avant de placer", hint: "huit éclairages de deux minutes : rendement, coupon, adjudication, risques" },
  { key: "parcours", href: "/info/parcours", label: "Le parcours CEMAC", tuile: "le marché, de bout en bout", hint: "le marché et ses acteurs, les instruments, les risques, passer un ordre, fiscalité et frais, taux et monnaie" },
  { key: "simulateur", href: "/info/simulateur", label: "Simulateur", tuile: "voir le rendement bouger", hint: "comment le prix, le coupon et la durée fabriquent le rendement" },
  { key: "glossaire", href: "/info/glossaire", label: "Glossaire", tuile: "les mots du marché", hint: "le vocabulaire du marché, défini une fois, tel qu'il est employé dans les fiches" },
  { key: "risques", href: "/info/risques", label: "Risques et limites", tuile: "ce que ça engage", hint: "ce que la maison ne promet pas, et ce qu'elle ne fait pas" },
  { key: "contact", href: "/moi/contact", label: "Nous contacter", tuile: "la personne qui répond", hint: "votre conseiller, le message déjà écrit, et le dépôt d'une réclamation" },
];

/**
 * LE COMPTE, EN CINQ RUBRIQUES.
 *
 * Elles étaient écrites dans la page du sommaire et nulle part ailleurs : la
 * recherche ne les trouvait donc pas, et « sécurité » ne ramenait que des
 * questions de l'aide. Une page qui n'est citée par aucune table n'existe que
 * pour qui connaît déjà son adresse.
 *
 * LE SOMMAIRE Y AJOUTE L'ÉTAT, et c'est lui qui le calcule : « 1 canal
 * prouvé », « approuvé », « 2 appareils » dépendent du client, et une table
 * n'a pas de client sous les yeux.
 */
export const COMPTE_PAGES: NavPage[] = [
  { key: "identite", href: "/moi/identite", label: "Profil", tuile: "nom, ville, canaux", hint: "nom, ville, e-mail, WhatsApp" },
  { key: "pieces", href: "/ouvrir-un-compte", label: "Mes pièces", tuile: "votre dossier", hint: "votre dossier d'ouverture et les pièces qui le composent" },
  { key: "profil", href: "/moi/profil", label: "Profil d'investisseur", tuile: "horizon et tolérance", hint: "votre horizon, votre tolérance au risque, et ce que la maison en déduit" },
  { key: "securite", href: "/moi/securite", label: "Sécurité", tuile: "clés et appareils", hint: "vos clés d'accès, les appareils reconnus, et comment les retirer" },
  /* « PARAMÉTRAGES » ET NON « CET APPAREIL ». Le nom disait la PORTÉE de deux
     de ses réglages, pas ce qu'on vient y faire ; on y cherche la langue, les
     alertes ou les couleurs, et personne ne tape « cet appareil ». La page dit
     elle-même, sous son titre, lesquels valent ici et lesquels valent partout.
     Les mots-clefs portent la langue, que ni le nom ni la phrase ne nommaient. */
  { key: "appareil", href: "/moi/appareil", label: "Paramétrages", tuile: "langue, alertes et couleurs", hint: "la langue, les alertes, les couleurs, et par quel canal on vous joint d'abord", mots: "réglages paramètres préférences langue français anglais thème notifications relevés" },
];
