/**
 * Les neuf services, et ce que chacun fait pour CE client, maintenant.
 *
 * Le défaut que ce module répare : neuf services étaient construits et aucune
 * surface ne les portait. Ils vivaient en effets de bord des pages produit, ou
 * enfouis dans Mon espace. Un client ne les trouvait pas, donc ils n'existaient
 * pas.
 *
 * LA RÈGLE, et elle décide de tout : on n'écrit jamais ce qu'un service fait
 * en général, on écrit ce qu'il fait pour ce client-là. « Épargne programmée »
 * ne se lit pas ; « en place · 50 000 le 5 · prochain le 5 octobre » se lit. Et
 * pour un service jamais pris, la phrase dit ce qui SE PASSERAIT : « vous
 * détenez 84,312 parts rachetables » vaut mille fois « passez d'un fonds à
 * l'autre ».
 *
 * DEUX ÉTATS, ET AUCUN SERVICE FERMÉ. Il y en avait trois, et le troisième
 * disait la vérité à l'envers : un service qui demande d'avoir commencé par
 * autre chose n'est pas fermé, il attend une première ligne, une part de
 * fonds ou une séance annoncée, et c'est un geste, pas un mur. Un écran qui
 * grise apprend à ne plus toucher ; celui-ci propose l'étape qui ouvre.
 *
 * L'ancien commentaire disait « indisponible ne s'excuse pas : il dit
 * phrase. Un service grisé sans raison se lit comme une panne.
 *
 * Module sans dépendance d'exécution : il reçoit un état de compte déjà lu et
 * rend des phrases à traduire. Un test l'atteint sans monter ni base ni écran.
 */

export type EtatService = "en_place" | "a_activer";

import type { Relance } from "./relance";

/** Une phrase du dictionnaire, avec ses trous : les nombres voyagent à part. */
export interface Dit {
  key: string;
  params?: Record<string, string | number>;
}

/**
 * LES TROIS RAYONS, ET LA QUESTION QUE CHACUN RÉSOUT.
 *
 * La liste rangeait neuf services à plat, et deux axes s'y mêlaient sans que
 * rien ne le dise : l'intention du client et l'instrument. Un même geste,
 * passer d'un fonds à l'autre, tombait alors dans deux familles, et c'est la
 * marque d'une découpe qui pose deux questions à la fois. Le desk avait eu la
 * même en septembre, « ce que je fais » contre « de quoi ça parle ».
 *
 * UN SEUL AXE RESTE, celui du client : où va mon argent, comment le faire sans
 * y penser, comment le garder. L'INSTRUMENT N'EST PAS UN RAYON : personne ne
 * se réveille en voulant un OPCVM. On veut placer, et l'instrument est la
 * réponse, pas la question. Il reste donc un filtre à l'intérieur de
 * « Placer », là où il a toujours été.
 */
/**
 * DEUX RAYONS DEPUIS LE 25 OCTOBRE 2026, et non trois.
 *
 * « Programmer » et « Tenir » étaient la même famille coupée en deux, et le
 * code le savait déjà sans le dire : la liste « surLeCompte », plus bas, nomme
 * exactement l'union des deux — provision, conservation, épargne programmée,
 * réinvestissement, prélèvement. Ce sont les services qui S'ÉCRIVENT SUR LE
 * COMPTE, par opposition à « Placer », qui est une décision de marché prise
 * une fois.
 *
 * Deux tuiles pour une seule question faisaient donc choisir entre « le faire
 * sans y penser » et « le garder », là où un client qui met en place un
 * prélèvement pour alimenter sa provision fait les deux du même geste. La
 * clef est « compte » et non l'un des deux anciens mots : une clef qui porte
 * le nom de la moitié qu'elle a absorbée se relit de travers six mois plus
 * tard.
 */
export type Rayon = "placer" | "compte";

export const RAYONS: { cle: Rayon; nom: string; quoi: string }[] = [
  { cle: "placer", nom: "Placer", quoi: "Où va mon argent, cette fois-ci." },
  { cle: "compte", nom: "Programmer et tenir", quoi: "Le faire sans y penser, le garder, et pouvoir le prouver." },
];

export interface ServiceVu {
  rayon: Rayon;
  cle: string;
  nom: string;
  /**
   * LA LIGNE SOUS LE NOM, FIXE ET COURTE.
   *
   * Elle est la jumelle de la raison d'être, en six mots : la raison explique,
   * celle-ci situe. Un en-tête de service doublé de taille a besoin d'un nom
   * COURT — « Se dire preneur avant une adjudication » en gros caractères tient
   * quatre lignes sur une tuile de téléphone — et ce que le nom perd en
   * précision, cette ligne le rend.
   *
   * Elle ne porte aucun chiffre du client, contrairement à « phrase » : c'est
   * ce qui lui permet de vivre sur une tuile, où l'on compare des services
   * plutôt qu'on ne lit le sien.
   */
  sous: string;
  href: string;
  etat: EtatService;
  /** Ce qu'il fait, ou ferait, avec les chiffres du client. */
  phrase: Dit;
  /**
   * Ce que le bouton dit, et où il mène.
   *
   * « Voir le détail » promettait une lecture là où la ligne invite à agir,
   * et un service déjà en place n'a pas de détail à faire lire : il a une
   * page où continuer. Les deux états disent donc « Allons-y » depuis le
   * 9 octobre 2026, sur décision du dirigeant.
   *
   * Ce qui ne change pas : un geste PARTICULIER l'emporte toujours sur le
   * défaut, et c'est ce que la règle d'avant défendait. Quand le compte-titres
   * n'est pas ouvert, aucun service ne commence par lui-même : le geste
   * devient l'ouverture, une fois, pour tous.
   */
  geste: Dit;
  /**
   * Ce qu'il faut avoir avant de prendre ce service, dit à l'ouverture de sa
   * fiche et nulle part ailleurs. Répété dans la liste, il effaçait neuf
   * sous-titres pour dire neuf fois la même chose.
   */
  porte?: Dit;
}

/**
 * Ce qu'il faut savoir du compte pour décider des neuf états.
 *
 * Tout est déjà lu et compté par l'appelant : ce module ne touche ni au dépôt
 * ni à l'horloge, et c'est ce qui le rend éprouvable.
 */
export interface ContexteClient {
  /** Le nombre de lignes tenues, tous instruments confondus. */
  lignes: number;
  /** Les parts de fonds détenues, rachetables : elles ouvrent le passage. */
  partsDeFonds?: { titre: string; parts: number };
  /** Les fonds ouverts à la souscription, au catalogue. */
  fondsOuverts: number;
  /**
   * CE QUI N'EXISTE QUE PAR INTERMITTENCE, COMPTÉ POUR QUE LA TUILE PARAISSE.
   *
   * Une émission à prix fixé et un rachat du Trésor arrivent quelques fois par
   * an. Une tuile permanente qui dirait « aucune en ce moment » onze mois sur
   * douze apprend à ne plus regarder ; une tuile qui n'existe que le mois où
   * il y en a une se remarque. Les deux comptes viennent de `listes.ts`, qui
   * décide déjà ce que chaque page de catalogue montre.
   *
   * ILS SONT OBLIGATOIRES, et c'est voulu. En optionnels, un appelant qui les
   * oublie fait disparaître deux services sans que rien ne tombe : le silence
   * serait indiscernable d'un marché vide. Le compilateur désigne l'appelant.
   */
  souscriptionsOuvertes: number;
  rachatsOuverts: number;
  /** Les actions cotées détenues. */
  actions?: { titre: string; n: number };
  /** L'argent reçu et n'attendant aucune opération. */
  disponible: number;
  /**
   * Les ordres confirmés qui attendent une signature et un virement.
   *
   * C'est le seul endroit où le client bloque son propre ordre, et il ne
   * figurait nulle part : ni dans la bande, ni dans le compteur.
   */
  aSigner: number;
  /** Les contre-propositions en attente de son oui ou de son non. */
  aRepondre: number;
  /**
   * Où mènent « Signer » et « Répondre » : l'ordre lui-même, quand il est
   * seul.
   *
   * Ils menaient à « / », écrit quand la bande vivait sur Agir : depuis
   * qu'elle est sur la page d'arrivée, ce bouton renvoyait à la page qu'on
   * avait sous les yeux. Mesuré le 8 octobre 2026 en production : le client
   * appuyait sur « Signer » et rien ne se passait, ce qui est exactement ce
   * qu'on lui avait programmé.
   */
  ouSigner?: string;
  ouRepondre?: string;
  /**
   * Ce que le dossier d'ouverture attend de son côté, s'il attend quelque chose.
   *
   * « convention » : le desk a approuvé, et rien ne s'ouvre avant l'acceptation.
   * « complements » : le desk a demandé des pièces, l'examen est suspendu.
   *
   * Le brouillon n'y figure pas, et c'est voulu : personne ne l'attend. Une
   * liste de devoirs qui contient une invitation cesse d'être une liste de
   * devoirs, et le compteur qui la compte cesse de vouloir dire quelque chose.
   */
  dossier?: "convention" | "convention_reprise" | "complements";
  /** Ce qui est échu et pas encore arrivé, et depuis combien de jours. */
  attendu?: { montant: number; retardJours: number };
  /** Le réinvestissement en place, s'il l'est. */
  reinvestissement?: { destination: string; plancher: number };
  /** L'épargne programmée en place, s'il y en a une. */
  epargne?: { montant: number; jour: number; destination: string };
  /**
   * LE MANDAT CRÉÉ ET JAMAIS SIGNÉ, qui n'était compté nulle part.
   *
   * « mandatVivant » demande l'état actif ET une signature : un mandat créé
   * dont le code n'a pas été saisi ne prélève rien, ne bloque rien, et ne se
   * voyait sur aucun écran hors sa propre page. C'est le cas le plus pur de
   * la procédure laissée en route — on a rempli son RIB, on est allé
   * chercher son téléphone, et on n'est pas revenu.
   *
   * Il tient le bas de la liste des devoirs, et c'est voulu : il ne bloque
   * rien. Le versement programmé vit sans lui, et le dire autrement serait
   * refaire la confusion que la page « Épargne programmée » a défaite.
   */
  mandatASigner?: { id: string; destination: string };
  /** La prochaine séance annoncée, si le calendrier en porte une. */
  prochaineSeance?: { pays: string; quoi: string; le: string };
  /**
   * Les rappels vivants de ce client : ce que la maison lui a déjà dit, et
   * qu'il peut interrompre. Vide ou absent, le panneau n'offre pas le geste.
   */
  rappels?: Relance[];
  /** Les mois d'historique : sous douze, la performance ne dit pas grand-chose. */
  moisDHistorique: number;
  /**
   * Le compte-titres est-il ouvert ?
   *
   * Tant qu'il ne l'est pas, aucun service ne peut rien faire, et ce n'est pas
   * une raison d'en griser neuf : c'est une raison de proposer l'ouverture,
   * qui est l'étape commune à tous. Absent, on suppose qu'il l'est : un doute
   * sur le dossier ne doit pas envoyer un client vers une ouverture qu'il a
   * déjà faite.
   */
  compteOuvert?: boolean;
}

/* « sous » se prend au catalogue plutôt qu'en argument : il est fixe par
   service, et le réécrire aux deux branches d'un même service (en place / à
   activer) ouvrait la porte à deux lignes divergentes pour un seul nom. */
const enPlace = (s: Omit<ServiceVu, "etat" | "geste" | "sous"> & { geste?: Dit }): ServiceVu => ({ ...s, sous: SOUS[s.cle] ?? "", etat: "en_place", geste: s.geste ?? { key: "Allons-y" } });
const aActiver = (s: Omit<ServiceVu, "etat" | "geste" | "sous"> & { geste?: Dit }): ServiceVu => ({ ...s, sous: SOUS[s.cle] ?? "", etat: "a_activer", geste: s.geste ?? { key: "Allons-y" } });

/**
 * Les neuf, dans l'ordre des états : ce qui tourne, ce qui dort, ce qui est
 * fermé.
 *
 * L'ordre n'est pas un classement par importance, et c'est délibéré : trier par
 * ce qui rapporterait le plus à la maison serait une recommandation, et la
 * maison n'a pas l'agrément pour en faire.
 */
/**
 * LE FORMATEUR VIENT DE L'APPELANT, comme pour « attentesDuClient ».
 *
 * LE DÉFAUT QUE CELA FERME, vu à l'écran le 26 octobre 2026 : « Vous détenez
 * 183.02 parts ». `translate` interpole par `String(v)`, sans rien formater —
 * un nombre brut sort donc avec un POINT décimal au milieu d'une interface
 * française, et un montant sort sans ses séparateurs de milliers :
 * « 250000 FCFA vous attendent ». Les deux étaient là depuis que ces phrases
 * existent, et aucune épreuve ne les regardait : les coquilles comparent des
 * clefs et des paramètres, jamais la chaîne rendue.
 *
 * « attentesDuClient » recevait déjà son formateur pour cette raison exacte,
 * juste en dessous dans ce fichier. Celui-ci ne l'avait pas. Le repli
 * `String` garde les épreuves qui ne s'intéressent pas au format ; la page,
 * elle, passe `fmt`, et un cliquet le vérifie.
 */
export function servicesDuClient(c: ContexteClient, fmt: (n: number) => string = String): ServiceVu[] {
  const out: ServiceVu[] = [];

  /* 06 · Réinvestissement. Le premier, parce que c'est celui qui travaille
     entre deux décisions du client. */
  out.push(
    c.reinvestissement
      ? enPlace({
          rayon: "compte",
          cle: "reinvestissement",
          nom: "Réinvestir",
          href: "/moi/reinvestir",
          phrase: {
            key: "Vos encaissements partent vers {d} dès qu'ils atteignent {m} FCFA.",
            params: { d: c.reinvestissement.destination, m: fmt(c.reinvestissement.plancher) },
          },
        })
      : aActiver({
          rayon: "compte",
          cle: "reinvestissement",
          nom: "Réinvestir",
          href: "/moi/reinvestir",
          phrase:
            c.disponible > 0
              ? { key: "{m} FCFA sont disponibles et n'attendent rien : ils repartiraient sur la ligne que vous choisiriez.", params: { m: fmt(c.disponible) } }
              : { key: "Dès qu'un coupon arrivera, il repartirait sur la ligne que vous auriez choisie d'avance." },
        }),
  );

  /* 03 · Épargne programmée. */
  out.push(
    c.epargne
      ? enPlace({
          rayon: "compte",
          cle: "epargne",
          nom: "Épargne programmée",
          /* Elle a sa page depuis le 23 octobre 2026. Elle renvoyait à une
             ancre du tableau de bord quand il y en avait une, et à la LISTE
             des fonds quand il n'y en avait pas : deux destinations, aucune
             qui soit la sienne. */
          href: "/moi/epargne",
          phrase: { key: "{m} FCFA partent le {j} de chaque mois vers {d}.", params: { m: fmt(c.epargne.montant), j: c.epargne.jour, d: c.epargne.destination } },
        })
      : aActiver({
          rayon: "compte",
          cle: "epargne",
          nom: "Épargne programmée",
          href: "/moi/epargne",
          phrase: { key: "Un montant, un jour du mois, une destination fixée à la signature." },
        }),
  );

  /* 07 · Conservation. Elle est en place dès qu'une ligne est tenue. */
  out.push(
    c.lignes > 0
      ? enPlace({
          rayon: "compte",
          cle: "garde",
          nom: "Conservation",
          href: "/moi",
          // « 1 lignes inscrites » se lisait sur la première page qu'un client
          // ouvre. Deux clefs plutôt qu'une règle de pluriel : le dictionnaire
          // est indexé par le français, et une règle de pluriel française ne
          // vaut pas pour l'anglais.
          phrase: c.lignes === 1 ? { key: "1 ligne inscrite à votre nom au dépositaire." } : { key: "{n} lignes inscrites à votre nom au dépositaire.", params: { n: c.lignes } },
        })
      : aActiver({
          rayon: "compte",
          cle: "garde",
          nom: "Conservation",
          href: "/titres",
          phrase: { key: "Dès votre première ligne, elle sera inscrite à votre nom au dépositaire." },
        }),
  );

  /* ADJUDICATIONS ET ÉMISSIONS, et non « placement primaire ».
     « Primaire » oppose au secondaire, et cette opposition n'existe que pour
     qui connaît déjà les deux. Le client, lui, voit une séance du Trésor ou
     une émission ouverte : ce sont ces deux mots-là qu'il faut dire, et ce
     sont ceux que la barre de navigation emploie déjà.

     « Adjudications » TOUT COURT depuis le 25 octobre 2026, et le Trésor
     descend dans la ligne du dessous avec les deux sigles. Ce que le nom
     perdait à porter « du Trésor » : rien, puisque les six Trésors sont les
     seuls à adjuger dans la zone. Ce qu'il gagne : un mot, et la place
     d'écrire OTA ET BTA, que l'ancien en-tête taisait. */
  out.push(
    aActiver({
      rayon: "placer",
      cle: "primaire",
      nom: "Adjudications",
      href: "/calendrier",
      phrase: c.prochaineSeance
        ? { key: "Une séance {p} est annoncée le {d} : {q}.", params: { p: c.prochaineSeance.pays, d: c.prochaineSeance.le, q: c.prochaineSeance.quoi } }
        : { key: "Le calendrier porte toutes les séances annoncées dès leur publication." },
    }),
  );

  /* SE DIRE PRENEUR, et non « sondage ». « Sondage » dit ce que la maison
     en fait ; le client, lui, se dit preneur à un taux, sans engagement, et
     c'est le mot que la phrase du service emploie déjà.

     L'EN-TÊTE GARDE POURTANT « Sondage », seul, et la ligne du dessous porte
     le geste. « Sondage d'adjudication » nommait et expliquait du même souffle
     — le défaut que les noms courts sont venus défaire — et « Se dire preneur
     avant une séance » est une phrase, pas un titre : elle vit sous le nom,
     où elle a toute la place. */
  out.push(
    c.prochaineSeance
      ? aActiver({
          rayon: "placer",
          cle: "sondage",
          nom: "Sondage",
          href: "/calendrier",
          phrase: { key: "Vous pouvez dire à quel taux vous seriez preneur sur la séance du {d}, sans vous engager.", params: { d: c.prochaineSeance.le } },
        })
      : aActiver({
          rayon: "placer",
          cle: "sondage",
          nom: "Sondage",
          href: "/calendrier",
          phrase: { key: "Commencez par une séance annoncée : le calendrier les publie dès qu'un Trésor ouvre la sienne." },
        }),
  );

  /* 08 · Passage d'un fonds à l'autre : il faut une part à racheter.

     « ARBITRAGE » SEUL, ET LA LIGNE DU DESSOUS DIT « d'un fonds à l'autre ».
     Le nom est celui qui restera : le service est destiné à couvrir d'autres
     départs que les parts de fonds — vendre une ligne de la cote pour entrer
     sur une autre — et un en-tête qui dirait « entre fonds » devrait alors
     changer, ce qui déplace une tuile sous la main du client.
     CE QU'IL NE FAUT PAS FAIRE EN ATTENDANT : écrire dans la ligne du dessous
     une généralité que le code ne tient pas. Elle nomme donc les fonds, et
     elle nomme la seule chose qui distingue vraiment ce service d'un rachat
     suivi d'une souscription : LES DEUX JAMBES SE SIGNENT ENSEMBLE. Le jour
     où un départ de la cote est possible, c'est la ligne qui s'élargit, pas
     l'en-tête. */
  out.push(
    c.partsDeFonds
      ? aActiver({
          rayon: "placer",
          cle: "passage",
          nom: "Arbitrage",
          href: "/fonds",
          /**
           * CE QUE L'ARBITRAGE ÉPARGNE, et non ce que le client détient.
           *
           * La phrase disait « Vous détenez 183.02 parts de FCP Trésorerie
           * Corridor, rachetables ». Deux reproches, et le second est le vrai.
           * Le petit : le nombre sortait brut, point décimal compris. Le
           * grand : le nombre de parts NE DÉCIDE DE RIEN ici. Un client qui
           * détient une ligne sait qu'il la détient ; la phrase lui rendait
           * son propre relevé au moment précis où il cherche à comprendre un
           * service qu'il n'a jamais pris.
           *
           * CE QU'IL IGNORE, et que seule cette phrase peut lui dire : ce
           * que le service lui ÉPARGNE. Sans arbitrage, il faut vendre,
           * attendre le règlement, puis racheter à une valeur liquidative
           * qu'on ne connaît pas encore — trois gestes et un trou.
           *
           * ET ELLE NE RÉPÈTE NI L'UNE NI L'AUTRE DE SES VOISINES. Sur la
           * fiche, la raison d'être dit POURQUOI (« quand votre horizon a
           * changé »), les deux lignes de la tuile disent COMMENT (« signés
           * ensemble »), et les étapes disent DANS QUEL ORDRE. Un premier
           * jet reprenait le « se signent ensemble » des trois autres : le
           * lecteur lisait quatre fois la même phrase sous quatre titres.
           *
           * La règle du fichier — « on écrit ce que le service fait pour CE
           * client-là » — reste la bonne partout ailleurs. Elle suppose que
           * le chiffre du client décide de quelque chose ; ici il ne décide
           * de rien, et c'est l'exception qui le dit.
           */
          phrase: { key: "Depuis {d}, le passage se fait en un seul geste. Sans lui, il faudrait vendre, attendre le règlement, puis racheter à une valeur qu'on ne connaît pas encore.", params: { d: c.partsDeFonds.titre } },
        })
      : aActiver({
          rayon: "placer",
          cle: "passage",
          nom: "Arbitrage",
          href: "/fonds",
          phrase: { key: "Commencez par souscrire à un fonds : le passage se déclare ensuite depuis la ligne que vous détenez." },
        }),
  );

  /* INVESTIR DANS UN FONDS, et non « intermédiation sur les fonds ».
     Le client investit ; l'intermédiation est ce que la maison fait pour que
     ce soit possible, et elle va de soi puisque la plateforme ne détient
     aucun de ces fonds. Nommer la fonction de la maison à la place du geste
     du client est le même défaut que « services de compte » : on décrit le
     dos de l'écran. */
  out.push(
    aActiver({
      rayon: "placer",
      cle: "fonds",
      nom: "Fonds",
      href: "/fonds",
      phrase:
        c.fondsOuverts > 0
          ? { key: "Les fonds de la zone sont ouverts à la souscription." }
          : { key: "Aucun fonds n'est ouvert à la souscription en ce moment." },
    }),
  );

  /* ACHETER ET VENDRE EN BOURSE, et non « courtage ». Le courtage est notre
     métier ; le client, lui, achète et vend. Nommer la fonction de la maison
     à la place du geste est le défaut qui a touché trois noms sur dix.

     « LA COTE », ET NON « ACTIONS » : LE NOM MENTAIT SUR SA PROPRE PAGE.
     Mesuré le 25 octobre 2026 : `/titres` rend `lignesDeLaCote`, c'est-à-dire
     TOUT ce dont `lieuDe` dit « cote » — une action, une obligation cotée
     d'État, deux émissions en souscription dans le dépôt de développement. Un
     en-tête « Actions » envoyait donc l'acheteur d'obligation cotée chercher
     ailleurs, et le seul ailleurs qui porte le mot obligation est la page des
     adjudications, où il n'aurait trouvé que du primaire.
     C'EST AUSSI CE QUI A FAIT ÉCARTER UNE DÉCOUPE PAR INSTRUMENT (BTA, OTA,
     Stock, obligations cotées) le même jour : une obligation du Trésor vit
     dans les DEUX canaux, en OTA à une séance et en ligne cotée au bulletin.
     Deux tuiles la nommeraient toutes les deux sans qu'aucune ait tort, ce qui
     est la signature d'une mauvaise découpe. Ce qui sépare les pages n'est pas
     l'instrument mais la façon de l'acheter — soumettre à une séance, ou payer
     un cours — et c'est la découpe que `sections.ts` tient depuis le 4 octobre
     sous le titre « Trois lieux, pas trois rayons ». L'instrument reste ce
     qu'il a toujours été ici : un filtre à l'intérieur de la page, et les
     sections du Bulletin Officiel le portent déjà. */
  out.push(
    aActiver({
      rayon: "placer",
      cle: "cote",
      nom: "La cote",
      /* UN GESTE NE MÈNE PAS À LA PAGE QUI SE LIT. « /marche » est la porte de
         l'environnement BVMAC : l'indice, les sociétés, les notes. Un service
         dont le verbe est « acheter » y déposait le client sur une page de
         lecture, à deux crans de la liste où l'on achète. « /titres » EST
         cette liste — obligations, bons et actions — et elle n'était la
         destination d'aucun service. */
      href: "/titres",
      phrase: c.actions
        ? { key: "Vous détenez {n} actions {d}, vendables sur la BVMAC.", params: { n: fmt(c.actions.n), d: c.actions.titre } }
        : { key: "Achat et vente sur la BVMAC, au dernier cours publié et à sa date." },
    }),
  );

  /**
   * DEUX SERVICES QUI NE PARAISSENT QUE LORSQU'IL Y A DE QUOI, et c'est la
   * seule façon honnête de les offrir.
   *
   * CE QU'ILS ÉTAIENT. Une émission à prix fixé et un rachat du Trésor
   * existaient déjà de bout en bout — `sectionDe` les range, `/titres` et
   * `/calendrier` les affichent, le desk les publie depuis le Référentiel —
   * mais AUCUNE TUILE NE LES NOMMAIT. Ils vivaient donc dans une section
   * d'une page de catalogue qu'on n'ouvre pas pour vérifier si par hasard il y
   * en a un. Décision du 25 octobre 2026, sur demande du dirigeant : ils
   * deviennent des services, et ils apparaissent quand il y en a.
   *
   * POURQUOI PAS UNE TUILE PERMANENTE. Il y en a quelques-uns par an. Une
   * tuile qui dirait « aucune émission en ce moment » onze mois sur douze
   * apprend à ne plus regarder, et le douzième mois elle n'est plus lue. La
   * rareté est l'information : une tuile qui n'est là que ce mois-là se
   * remarque, et c'est l'inverse exact de la logique d'un écran grisé.
   *
   * LE RACHAT RESTE DANS « PLACER » MALGRÉ CE QU'IL EST. `SECTION_NOTE` le
   * dit depuis le 4 octobre : « une sortie, pas un placement. » Il n'a
   * pourtant pas sa place dans « Programmer et tenir », qui tient les
   * instructions permanentes et la garde : un rachat est une décision de
   * marché prise une fois, avec une date limite, annoncée sur le même canal
   * que les séances. C'EST LA LIGNE DU DESSOUS QUI CORRIGE LE RAYON, en
   * nommant la reprise avant terme ; sa raison d'être le redit. Sa vraie
   * place sera la jambe de DÉPART de l'arbitrage, le jour où l'arbitrage
   * accepte autre chose qu'une part de fonds.
   */
  if (c.souscriptionsOuvertes > 0) {
    out.push(
      aActiver({
        rayon: "placer",
        cle: "souscription",
        nom: "En souscription",
        href: "/titres",
        phrase:
          c.souscriptionsOuvertes === 1
            ? { key: "Une émission est ouverte à prix fixé, avant sa cotation." }
            : { key: "{n} émissions sont ouvertes à prix fixé, avant leur cotation.", params: { n: c.souscriptionsOuvertes } },
      }),
    );
  }

  if (c.rachatsOuverts > 0) {
    out.push(
      aActiver({
        rayon: "placer",
        cle: "rachat",
        nom: "Rachats du Trésor",
        href: "/calendrier",
        phrase:
          c.rachatsOuverts === 1
            ? { key: "Le Trésor reprend une ligne avant son terme : à comparer avec les coupons qui restent." }
            : { key: "Le Trésor reprend {n} lignes avant leur terme : à comparer avec les coupons qui restent.", params: { n: c.rachatsOuverts } },
      }),
    );
  }

  /* L'APPARIEMENT N'EST PAS UN SERVICE, ET IL A QUITTÉ CETTE LISTE.
     La plateforme recueille les ordres et les transmet à la BVMAC, qui seule
     décide de l'exécution : aucun rapprochement fait ici ne produit une
     transaction. Le nommer « appariement » en vitrine promettait donc une
     exécution que la maison ne peut pas donner, et laissait entendre une
     internalisation, qui est une activité à part.
     Ce qu'il est vraiment reste au desk, comme le taux de service : une
     lecture de notre propre carnet qui dit à un vendeur qu'un acheteur existe
     et permet de faire arriver les deux ordres à la même séance. Voir
     domain/crossing.ts, dont la doctrine disait déjà « il n'exécute rien ». */

  /* LA PROVISION ET LE PRÉLÈVEMENT ENTRENT, et ils ne sont pas des ajouts
     de confort. Le premier est l'argent du client chez nous, qui règle un
     ordre sans virement ; le second est ce qui rend l'épargne programmée
     autonome. Les taire laissait « Tenir » avec une seule ligne, ce qui est
     la preuve qu'un rayon est mal nommé. */
  out.push(
    c.disponible > 0
      ? enPlace({ rayon: "compte", cle: "provision", nom: "Votre provision", href: "/moi/provision", phrase: { key: "{m} FCFA vous attendent et règlent votre prochain ordre sans virement.", params: { m: fmt(c.disponible) } } })
      : aActiver({ rayon: "compte", cle: "provision", nom: "Votre provision", href: "/moi/provision", phrase: { key: "Ce que vous laissez chez nous règle vos ordres sans attendre un virement, et repart sur demande." } }),
  );
  out.push(
    aActiver({ rayon: "compte", cle: "prelevement", nom: "Prélèvement", href: "/moi/prelevements", phrase: { key: "Vous nous autorisez à prélever une somme sur votre compte, à une date fixe. C'est le montant que vous écrivez qui est présenté, ni plus ni moins." } }),
  );

  const rang: Record<EtatService, number> = { en_place: 0, a_activer: 1 };
  /**
   * LA PORTE AVANT LE SERVICE, MAIS PAS DEVANT TOUS.
   *
   * Sans compte-titres, celui qui touche « Conservation », « Réinvestissement »,
   * « Épargne programmée », « Prélèvement » ou « Votre provision » ne peut rien
   * faire d'autre que l'ouvrir : ceux-là SONT le compte, ou s'écrivent dessus.
   *
   * Les cinq autres commencent par regarder, et regarder ne demande rien : le
   * calendrier des séances, le catalogue des fonds, la cote, le passage d'un
   * fonds à l'autre, le sondage. Les y envoyer ouvrir un compte serait une fin
   * de non-recevoir déguisée ; c'est l'ordre qui demandera le compte, et il le
   * demandera à son heure.
   */
  /* C'est exactement le rayon « compte » : la porte et le rayon disent la même
     chose, et c'est ce qui a fait fondre « Programmer » et « Tenir » en un. On
     le dérive donc plutôt que de le recopier — une seconde liste des mêmes
     cinq clefs finirait par en perdre une. */
  const surLeCompte = new Set(out.filter((x) => x.rayon === "compte").map((x) => x.cle));
  const ouverts =
    c.compteOuvert === false
      ? out.map((x) => (!surLeCompte.has(x.cle) ? x : {
          ...x,
          href: "/ouvrir-un-compte",
          geste: { key: "Ouvrir un compte-titres" },
          porte: { key: "Ce service s'écrit sur un compte-titres à votre nom. L'ouverture se fait en ligne et le desk vérifie les pièces." },
        }))
      : out;
  /* Par rayon d'abord, l'état ensuite : à l'intérieur d'un rayon, ce qui
     tourne déjà passe devant ce qui reste à prendre. */
  const ordre = (r: Rayon) => RAYONS.findIndex((x) => x.cle === r);
  return ouverts.sort((a, b) => ordre(a.rayon) - ordre(b.rayon) || rang[a.etat] - rang[b.etat]);
}

/**
 * LE CATALOGUE : UN SERVICE, SON NOM, SON RAYON, SA PORTE.
 *
 * `servicesDuClient` construit la liste VUE PAR UN CLIENT : elle dépend de ce
 * qu'il a déjà, de son dossier, de ses lignes. Pour la chercher, il faut la
 * liste de ce qui EXISTE, sans client sous les yeux — ce que la recherche
 * indexe, et ce qu'un lecteur tape.
 *
 * C'est une seconde liste, donc elle divergera : une épreuve l'en empêche
 * (`services-catalogue.test.ts`), en montant un client qui a tout et en
 * comparant clef pour clef, nom pour nom, porte pour porte.
 */
export const CATALOGUE: { cle: string; nom: string; rayon: Rayon; href: string }[] = [
  { cle: "primaire", nom: "Adjudications", rayon: "placer", href: "/calendrier" },
  { cle: "sondage", nom: "Sondage", rayon: "placer", href: "/calendrier" },
  { cle: "cote", nom: "La cote", rayon: "placer", href: "/titres" },
  { cle: "fonds", nom: "Fonds", rayon: "placer", href: "/fonds" },
  { cle: "passage", nom: "Arbitrage", rayon: "placer", href: "/fonds" },
  /* LES DEUX INTERMITTENTS SONT AU CATALOGUE, ET C'EST LA DIFFÉRENCE ENTRE LES
     DEUX LISTES. Le catalogue dit ce qui EXISTE — c'est ce que la recherche
     indexe, et ce qu'un lecteur tape sans savoir si le marché en porte un
     aujourd'hui ; `servicesDuClient` dit ce qu'on VOIT. Les taire ici rendrait
     « rachat » introuvable au clavier onze mois sur douze. */
  { cle: "souscription", nom: "En souscription", rayon: "placer", href: "/titres" },
  { cle: "rachat", nom: "Rachats du Trésor", rayon: "placer", href: "/calendrier" },
  { cle: "epargne", nom: "Épargne programmée", rayon: "compte", href: "/moi/epargne" },
  { cle: "reinvestissement", nom: "Réinvestir", rayon: "compte", href: "/moi/reinvestir" },
  { cle: "prelevement", nom: "Prélèvement", rayon: "compte", href: "/moi/prelevements" },
  { cle: "provision", nom: "Votre provision", rayon: "compte", href: "/moi/provision" },
  { cle: "garde", nom: "Conservation", rayon: "compte", href: "/moi" },
];

/**
 * Ce qu'il faut faire, dans l'ordre, pour prendre un service.
 *
 * L'état dit où l'on en est, la phrase dit ce que ça donne : ni l'un ni l'autre
 * ne dit ce qu'il va falloir FAIRE. C'est ce qui manquait pour qu'un client
 * décide, et c'est la seule chose ici qui ne dépende pas de son compte : une
 * procédure est la même pour tout le monde.
 *
 * Les numéros sont légitimes ici, et seulement ici : il y a une vraie séquence,
 * chaque étape attend la précédente. Ailleurs, une liste numérotée promet un
 * ordre qui n'existe pas, et la maison pose une figure au trait à la place.
 *
 * Les étapes disent le marché et non « le Trésor » : la même procédure sert une
 * adjudication, une ligne de la cote et un fonds, et nommer le Trésor la
 * rendrait fausse deux fois sur trois.
 */
/**
 * À QUOI CHAQUE SERVICE SERT, EN UNE PHRASE QUI NE DÉPEND DE PERSONNE.
 *
 * Un service se présentait par trois choses : son ÉTAT, une PHRASE avec les
 * chiffres du client, et ses ÉTAPES. Il manquait la première de toutes —
 * à quoi ça sert — et son absence ne se voyait pas sur l'écran large, où dix
 * lignes se comparent d'un coup d'œil et où le nom suffit souvent.
 *
 * ELLE SE VOIT SUR LE TÉLÉPHONE. Quand un service occupe un écran entier,
 * commencer par « 50 000 FCFA partent le 5 de chaque mois » parle à celui qui
 * l'a déjà, et ne dit rien à celui qui ouvre la page pour savoir si ça le
 * concerne. La raison vient donc en tête, la phrase du client ensuite, les
 * étapes après, le geste en bas : du général au particulier.
 *
 * ELLE EST LA MÊME POUR TOUT LE MONDE, comme les étapes, et c'est ce qui la
 * distingue de la phrase : aucun chiffre, aucun trou, rien à calculer. Un
 * service dont la raison d'être changerait d'un client à l'autre serait un
 * service mal découpé.
 */
/**
 * LA LIGNE SOUS CHAQUE NOM, EN SIX MOTS.
 *
 * Décidée le 25 octobre 2026, avec les noms courts qui l'accompagnent. Les
 * anciens noms faisaient deux métiers à la fois : « Se dire preneur avant une
 * adjudication » NOMMAIT le service et l'EXPLIQUAIT dans le même souffle, ce
 * qui donne un titre qu'on ne peut pas grossir. Le nom désigne maintenant, la
 * ligne situe, et l'en-tête peut doubler de taille sans déborder.
 *
 * Elle est plus courte que la raison d'être, et ce n'est pas la même chose :
 * la raison répond à « pourquoi le prendrais-je », cette ligne à « de quoi
 * s'agit-il ». La première vit sur la fiche, la seconde sur la tuile.
 */
/**
 * LA LIGNE NOMME LA MARCHANDISE, ET PLUS LE MÉCANISME — 25 octobre 2026.
 *
 * Les cinq premières redisaient ce que l'en-tête disait déjà : « Toutes les
 * séances annoncées » sous « Adjudications » n'apprend rien. Le client de la
 * maison est un particulier ou une PME, pas une trésorerie de banque : il ne
 * sait pas qu'une séance du Trésor sert des OTA et des BTA, et c'est
 * précisément ce qu'il voulait savoir. Les sigles vont donc ICI, en
 * reconnaissance — jamais dans l'en-tête, où ils deviendraient un examen que
 * le lecteur peut rater avant même d'avoir cliqué.
 */
export const SOUS: Record<string, string> = {
  primaire: "OTA et BTA : prêter aux six Trésors",
  sondage: "Se dire preneur avant une séance",
  passage: "D'un fonds à l'autre, les deux jambes ensemble",
  fonds: "Les OPCVM de la zone, et ce qu'ils rendent",
  cote: "Actions et obligations cotées, à un cours",
  souscription: "Un prix fixé, une fenêtre, puis la cotation",
  rachat: "Le Trésor reprend une ligne avant terme",
  epargne: "Une somme fixe, chaque mois",
  reinvestissement: "Les coupons repartent tout seuls",
  prelevement: "Nous prélevons, vous ne virez plus",
  provision: "Votre argent chez nous, prêt à régler",
  garde: "Vos titres inscrits à votre nom",
};

export const RAISON: Record<string, string> = {
  primaire: "Prêter à un État de la zone en achetant ses titres à l'émission, au prix de l'adjudication plutôt qu'à celui du marché.",
  sondage: "Dire au desk ce que vous prendriez avant qu'une séance ouvre, sans vous engager, pour qu'il vous rappelle au bon moment.",
  cote: "Acheter ou revendre au cours du marché ce qui est inscrit au bulletin de la BVMAC : les actions des sociétés, et les obligations des États, des institutions régionales et des entreprises.",
  souscription: "Souscrire à une émission avant qu'elle soit cotée : le prix est fixé par l'émetteur et ne bouge pas pendant la fenêtre, contrairement à un cours.",
  rachat: "Céder une ligne avant son terme quand le Trésor en offre le rachat. C'est une sortie, pas un placement : renoncer aux coupons restants se compare au rendement d'un réemploi.",
  fonds: "Confier une somme à un gérant agréé qui la répartit sur des dizaines de lignes : la diversification sans avoir à la faire soi-même.",
  passage: "Changer de fonds sans sortir de votre argent, quand votre horizon ou votre besoin de liquidité a changé.",
  epargne: "Placer une somme fixe chaque mois sans y penser : c'est la régularité qui fait le résultat, pas le moment choisi.",
  reinvestissement: "Remettre au travail un coupon ou un remboursement dès son arrivée, au lieu de le laisser dormir sur un compte.",
  prelevement: "Autoriser la maison à débiter votre compte bancaire à date fixe, du montant exact que vous écrivez, pour n'avoir plus de virement à faire.",
  provision: "Laisser de l'argent chez nous pour que vos ordres se règlent sans attendre un virement, et le reprendre quand vous voulez.",
  garde: "Vos titres sont inscrits à votre nom au dépositaire, jamais dans un compte collectif, et tout mouvement vous est prouvé.",
};

export const ETAPES: Record<string, string[]> = {
  primaire: [
    "Choisir la séance annoncée, sur le calendrier des adjudications.",
    "Dire le montant, et le taux auquel vous seriez preneur si vous en voulez un.",
    "Le desk confirme, édite le bordereau et transmet la demande avec celles des autres investisseurs.",
    "Le dépouillement dit le montant servi et le prix ; les titres sont ensuite inscrits à votre nom au dépositaire.",
  ],
  cote: [
    "Choisir la ligne au bulletin de la BVMAC : une action, ou une obligation d'État, d'institution régionale ou d'entreprise.",
    "Dire la quantité, et un prix limite si vous ne voulez pas acheter à n'importe quel cours.",
    "Le desk porte l'ordre au carnet.",
    "L'exécution revient avec son prix, et le règlement suit à la date du marché.",
  ],
  souscription: [
    "Lire la note d'information ou le prospectus visé : c'est lui qui porte le prix, la fenêtre et ce que l'émetteur promet.",
    "Dire le montant avant la clôture de la fenêtre.",
    "L'allocation peut être réduite si la demande dépasse l'émission ; les titres sont inscrits à votre nom, puis la ligne est admise à la cote.",
  ],
  rachat: [
    "Vous détenez la ligne que le Trésor propose de reprendre ; sans elle, il n'y a rien à présenter.",
    "Comparer ce que le rachat rend aujourd'hui avec les coupons qui restent jusqu'au terme.",
    "Présenter la quantité avant la date limite. Le Trésor peut n'en retenir qu'une partie, et vous gardez le reste.",
  ],
  fonds: [
    "Choisir le fonds, sa catégorie et la périodicité de sa valeur liquidative.",
    "Dire le montant à souscrire.",
    "La VL retenue à la centralisation fixe le nombre exact de parts : il n'est donc connu qu'après.",
  ],
  garde: [
    "Rien à activer : la conservation commence avec votre première ligne.",
    /* LA DEUXIÈME ÉTAPE REDISAIT LA RAISON, mot pour mot — « inscrits à votre
       nom au dépositaire, jamais dans un compte collectif ». Personne ne l'a
       vu tant que les deux vivaient sur deux écrans : la fiche de Trade ne
       montre que les étapes, et la raison se lisait ailleurs. Le brief les a
       mises l'une sous l'autre le 26 octobre 2026, et la répétition a sauté
       aux yeux. L'étape dit maintenant QUAND et SOUS QUOI l'inscription se
       fait, ce que la raison ne porte pas. */
    "Chaque ligne servie est inscrite au dépositaire central, sous votre identifiant, à la date de règlement.",
    "Le relevé et les avis d'opéré suivent chaque mouvement ; les droits de garde sont appelés par période.",
  ],
  reinvestissement: [
    "Un coupon ou un remboursement arrive sur votre poche.",
    "Fixer une destination et un plancher, une fois : en dessous du plancher, rien ne part.",
    "À chaque encaissement, l'ordre se prépare tout seul et vous est présenté avant de partir.",
  ],
  epargne: [
    "Fixer le montant, le jour du mois et la destination.",
    "Signer une fois : c'est cette signature qui vaut pour les prélèvements suivants.",
    "Le versement part chaque mois sans qu'on y revienne, et s'arrête au premier mot de votre part.",
  ],
  sondage: [
    "Une séance est annoncée, environ une semaine avant sa tenue.",
    "Dire le taux auquel vous seriez preneur, sans engagement : ce n'est pas un ordre.",
    "Le desk en tient compte quand l'ordre se forme, et revient vers vous avant la clôture.",
  ],
  passage: [
    "Partir d'une part que vous détenez et qui est rachetable.",
    "Choisir le fonds d'arrivée.",
    "Le rachat et la souscription se signent ensemble, et les deux VL retenues sont dites avant la signature.",
  ],
  provision: [
    "Virer la somme en citant la référence qui figure sur votre page : c'est elle qui l'attache à votre compte.",
    "Elle attend, et elle reste la vôtre : rien ne vous oblige à l'employer.",
    "Au prochain ordre couvert, rien n'est à virer ; le reste repart sur demande, sous 72 heures ouvrables.",
  ],
  prelevement: [
    "Dire ce qu'il alimente, le montant et le jour du mois : c'est ce montant-là qui sera présenté à votre banque, ni plus ni moins.",
    "Signer le mandat une fois, par un code reçu.",
    "Chaque prélèvement est annoncé cinq jours avant, une seule fois par mois, et le mandat se révoque à tout moment, sans motif.",
  ],
};

/** Le compte des trois états : un service qu'on ne sait pas offert n'existe pas. */
export function compteDesEtats(services: ServiceVu[]): Record<EtatService, number> {
  return {
    en_place: services.filter((s) => s.etat === "en_place").length,
    a_activer: services.filter((s) => s.etat === "a_activer").length,

  };
}

/**
 * Ce qui attend une décision aujourd'hui, et rien d'autre.
 *
 * Trois au plus : une console qui en propose huit ne propose rien. Ce qui est
 * arrivé passe devant ce qui est annoncé, qui passe devant ce qui se fait
 * attendre, parce que c'est l'ordre dans lequel une décision est possible.
 */
export interface Attente {
  cle: string;
  quand: Dit;
  /**
   * Le gros caractère de la ligne. Un mot se traduit, une donnée non : un
   * montant en FCFA et le libellé d une séance de la BEAC sortent tels quels,
   * « 1 ordre » doit passer par le dictionnaire. Les deux formes cohabitent
   * donc ici, parce que ce sont deux natures et non deux styles ; il a fallu
   * trois rangées dans la bande pour voir « 1 ordre » en français au milieu
   * d une page anglaise (2026-10-08).
   */
  chiffre: Dit | string;
  quoi: Dit;
  geste: string;
  href: string;
  /** L'attente qui porte de l'argent arrivé : elle se distingue des autres. */
  ton: "arrive" | "annonce" | "retard";
  /**
   * LA SECONDE ISSUE : VIDER LE PANIER.
   *
   * Une attente n'offrait qu'un chemin, celui qui finit. Celui qui ne veut
   * plus n'avait donc rien à faire, donc il ne faisait rien, et son ordre
   * restait au carnet du desk jusqu'à devenir un manquement à sa tenue. Un
   * panier qu'on ne peut pas vider se garde plein.
   *
   * ELLE MÈNE À LA MÊME PAGE, et c'est voulu : on ne retire pas un ordre
   * depuis une pastille de trois cents pixels, à un doigt de « Signer ».
   * Les deux liens renvoient à l'endroit où la décision se prend, l'un en
   * haut de la page, l'autre à son ancre.
   *
   * Absente là où il n'y a rien à vider : une convention approuvée n'est pas
   * un panier mais une offre que la maison a faite, et un dossier
   * s'abandonne autrement que d'un lien.
   */
  sortie?: { geste: string; href: string };
}

/**
 * Ce qui attend le client, dans l'ordre où c'est possible d'y répondre.
 *
 * LES DEVOIRS D'ABORD, LES OCCASIONS ENSUITE. Un bulletin à signer et une
 * contre-proposition à trancher bloquent un ordre déjà engagé : aucune séance
 * annoncée ne vaut qu'on laisse cet ordre en plan. L'argent qui dort tient le
 * milieu, parce qu'il est déjà arrivé.
 *
 * LA FONCTION REND TOUT, et c'est l'écran qui coupe. Elle coupait à trois, et
 * le compteur comptait la liste coupée : cinq attentes s'affichaient « 3 ».
 */
/**
 * CE QUE LA MAISON RAPPELLE DERRIÈRE CETTE ATTENTE.
 *
 * La table est courte et c'est volontaire : les cinq DEVOIRS en sont, les
 * occasions n'en sont pas. Un coupon disponible, une séance annoncée, une
 * échéance en retard chez l'émetteur ne produisent aucun message — rien à
 * éteindre, donc pas de bouton pour l'éteindre.
 */
/**
 * CE QUE CHAQUE ATTENTE PERMET DE VIDER.
 *
 * Trois paniers sur cinq se vident, et les deux autres ne sont pas des
 * paniers. Un ordre se retire, un mandat non signé se supprime : le client
 * les a remplis, il peut les défaire. Une convention approuvée est une offre
 * que la maison a faite, et un dossier à compléter est un examen en cours :
 * y renoncer est une décision d'un autre ordre, qui ne tient pas dans un
 * lien et qui viendra à son tour.
 *
 * Un ordre déjà signé n'y est pas non plus, mais pour l'autre raison : il
 * engage son auteur, et ces attentes-là n'attendent plus rien de lui.
 */

export function attentesDuClient(c: ContexteClient, fmt: (n: number) => string): Attente[] {
  const out: Attente[] = [];
  /* LE DOSSIER PASSE DEVANT TOUT, PARCE QU'IL TIENT TOUT LE RESTE.
     Tant que la convention n'est pas acceptée, peutOPCVM est faux : pas de
     souscription, pas de rachat, donc pas d'ordre à signer. C'était la seule
     action qui bloquait la maison entière, et la seule que cette liste ne
     comptait pas : ni la pastille du menu ni la bande ne la nommaient, et la
     page du portefeuille l'écrivait en gris sous « Bonjour ». Un état affiché
     n'est pas une action proposée. */
  if (c.dossier === "convention")
    out.push({
      cle: "convention",
      quand: { key: "Dernière étape de l'ouverture" },
      chiffre: { key: "Convention" },
      quoi: { key: "Dossier approuvé. Le compte s'ouvre ensuite." },
      /* « RELIRE », ET NON « ACCEPTER ». Le bouton d'une attente dit ce qu'on
         va FAIRE EN ARRIVANT, et l'on arrive sur un texte à lire : accepter
         vient après, sur la page, et seulement si l'on veut. Un bouton qui
         dit « accepter » demande un engagement avant d'avoir montré à quoi,
         ce qui est exactement ce qu'une convention ne doit pas faire. */
      geste: "Relire ma convention",
      href: "/ouvrir-un-compte/convention",
      ton: "retard",
    });
  /* UNE REPRISE SE DIT AUTREMENT, parce que le compte, lui, n'attend rien.
     « Votre compte s'ouvre dès que la convention est acceptée » serait faux
     pour quelqu'un dont le compte est ouvert depuis des mois. */
  if (c.dossier === "convention_reprise")
    out.push({
      cle: "convention",
      quand: { key: "La convention a changé" },
      chiffre: { key: "Convention" },
      quoi: { key: "Le mandat d'ouverture a changé, pas vos lignes." },
      geste: "Reprendre ma convention",
      href: "/ouvrir-un-compte/convention",
      ton: "retard",
    });
  if (c.dossier === "complements")
    out.push({
      cle: "complements",
      quand: { key: "Le desk attend vos pièces" },
      chiffre: { key: "Dossier" },
      quoi: { key: "L'examen reprend dès vos pièces déposées." },
      geste: "Compléter mon dossier",
      href: "/ouvrir-un-compte",
      ton: "retard",
    });
  if (c.aSigner > 0)
    out.push({
      cle: "signer",
      quand: { key: "Votre signature" },
      chiffre: c.aSigner > 1 ? { key: "{n} ordres", params: { n: c.aSigner } } : { key: "1 ordre" },
      quoi: { key: "Il part une fois signé et le virement fait." },
      geste: "Signer",
      href: c.ouSigner ? `/moi/ordres/${c.ouSigner}` : "/moi/ordres",
      ton: "retard",
      sortie: c.ouSigner ? { geste: "Je ne veux plus de cet ordre", href: `/moi/ordres/${c.ouSigner}?retirer` } : undefined,
    });
  if (c.aRepondre > 0)
    out.push({
      cle: "repondre",
      quand: { key: "Votre réponse" },
      chiffre: c.aRepondre > 1 ? { key: "{n} propositions", params: { n: c.aRepondre } } : { key: "1 proposition" },
      quoi: { key: "D'autres conditions : votre réponse décide." },
      geste: "Répondre",
      /* LE REPLI MENAIT NULLE PART : « /moi » redirige vers la racine, qui
         perd le fragment, et « #ordres-en-cours » vivait de toute façon sur
         la racine, pas sous /moi. Sans intention désignée, « Répondre »
         déposait donc le client en haut de son portefeuille. La liste
         existe depuis le 24 octobre 2026. */
      href: c.ouRepondre ? `/moi/ordres/${c.ouRepondre}` : "/moi/ordres",
      ton: "retard",
      sortie: c.ouRepondre ? { geste: "Je ne veux plus de cet ordre", href: `/moi/ordres/${c.ouRepondre}?retirer` } : undefined,
    });
  /* LE MANDAT FERME LA MARCHE DES DEVOIRS, et le ton le dit : « quand vous
     voudrez », pas « il manque ». Rien n'est bloqué — le versement part, le
     client vire lui-même — et un rappel qui dramatiserait une commodité
     userait la crédibilité des quatre autres, qui, eux, bloquent. */
  if (c.mandatASigner)
    out.push({
      cle: "mandat",
      quand: { key: "Quand vous voudrez" },
      chiffre: { key: "Mandat" },
      quoi: { key: "Pour {d}. Sans lui, vous virez vous-même.", params: { d: c.mandatASigner.destination } },
      geste: "Signer mon mandat",
      href: "/moi/prelevements",
      ton: "annonce",
      sortie: { geste: "Supprimer ce mandat", href: "/moi/prelevements#mandat" },
    });
  if (c.disponible > 0)
    out.push({
      cle: "disponible",
      quand: { key: "Sur votre compte" },
      chiffre: `${fmt(Math.round(c.disponible))} FCFA`,
      quoi: c.reinvestissement
        ? { key: "Votre réinvestissement les placera." }
        : { key: "Ils ne rapportent rien tant qu'ils dorment." },
      geste: "Replacer",
      href: "/moi/reinvestir",
      ton: "arrive",
    });
  if (c.prochaineSeance)
    out.push({
      cle: "seance",
      // « Le {d} » serait une clef à trous de trois lettres fixes : au
      // passage en anglais elle happerait « Le marché aujourd'hui ». Le mot
      // l'ancre, et dit en plus de quoi cette date est la date.
      quand: { key: "Séance du {d}", params: { d: c.prochaineSeance.le } },
      chiffre: c.prochaineSeance.quoi,
      quoi: { key: "Trésor {p} : intention jusqu'à la veille.", params: { p: c.prochaineSeance.pays } },
      geste: "Déclarer une intention",
      href: "/calendrier",
      ton: "annonce",
    });
  if (c.attendu && c.attendu.montant > 0)
    out.push({
      cle: "attendu",
      quand: { key: "Échu depuis {n} jours", params: { n: c.attendu.retardJours } },
      chiffre: `${fmt(Math.round(c.attendu.montant))} FCFA`,
      quoi: { key: "Le desk le réclame à l'émetteur." },
      geste: "Suivre",
      href: "/moi",
      ton: "retard",
    });
  return out;
}
