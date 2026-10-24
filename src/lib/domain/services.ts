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
export type Rayon = "placer" | "programmer" | "tenir";

export const RAYONS: { cle: Rayon; nom: string; quoi: string }[] = [
  { cle: "placer", nom: "Placer", quoi: "Où va mon argent, cette fois-ci." },
  { cle: "programmer", nom: "Programmer", quoi: "Le faire sans y penser, chaque mois." },
  { cle: "tenir", nom: "Tenir", quoi: "Garder, suivre, et pouvoir le prouver." },
];

export interface ServiceVu {
  rayon: Rayon;
  cle: string;
  nom: string;
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

const enPlace = (s: Omit<ServiceVu, "etat" | "geste"> & { geste?: Dit }): ServiceVu => ({ ...s, etat: "en_place", geste: s.geste ?? { key: "Allons-y" } });
const aActiver = (s: Omit<ServiceVu, "etat" | "geste"> & { geste?: Dit }): ServiceVu => ({ ...s, etat: "a_activer", geste: s.geste ?? { key: "Allons-y" } });

/**
 * Les neuf, dans l'ordre des états : ce qui tourne, ce qui dort, ce qui est
 * fermé.
 *
 * L'ordre n'est pas un classement par importance, et c'est délibéré : trier par
 * ce qui rapporterait le plus à la maison serait une recommandation, et la
 * maison n'a pas l'agrément pour en faire.
 */
export function servicesDuClient(c: ContexteClient): ServiceVu[] {
  const out: ServiceVu[] = [];

  /* 06 · Réinvestissement. Le premier, parce que c'est celui qui travaille
     entre deux décisions du client. */
  out.push(
    c.reinvestissement
      ? enPlace({
          rayon: "programmer",
          cle: "reinvestissement",
          nom: "Réinvestissement",
          href: "/moi/reinvestir",
          phrase: {
            key: "Vos encaissements partent vers {d} dès qu'ils atteignent {m} FCFA.",
            params: { d: c.reinvestissement.destination, m: c.reinvestissement.plancher },
          },
        })
      : aActiver({
          rayon: "programmer",
          cle: "reinvestissement",
          nom: "Réinvestissement",
          href: "/moi/reinvestir",
          phrase:
            c.disponible > 0
              ? { key: "{m} FCFA sont disponibles et n'attendent rien : ils repartiraient sur la ligne que vous choisiriez.", params: { m: c.disponible } }
              : { key: "Dès qu'un coupon arrivera, il repartirait sur la ligne que vous auriez choisie d'avance." },
        }),
  );

  /* 03 · Épargne programmée. */
  out.push(
    c.epargne
      ? enPlace({
          rayon: "programmer",
          cle: "epargne",
          nom: "Épargne programmée",
          /* Elle a sa page depuis le 23 octobre 2026. Elle renvoyait à une
             ancre du tableau de bord quand il y en avait une, et à la LISTE
             des fonds quand il n'y en avait pas : deux destinations, aucune
             qui soit la sienne. */
          href: "/moi/epargne",
          phrase: { key: "{m} FCFA partent le {j} de chaque mois vers {d}.", params: { m: c.epargne.montant, j: c.epargne.jour, d: c.epargne.destination } },
        })
      : aActiver({
          rayon: "programmer",
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
          rayon: "tenir",
          cle: "garde",
          nom: "Conservation et tenue de compte",
          href: "/moi",
          // « 1 lignes inscrites » se lisait sur la première page qu'un client
          // ouvre. Deux clefs plutôt qu'une règle de pluriel : le dictionnaire
          // est indexé par le français, et une règle de pluriel française ne
          // vaut pas pour l'anglais.
          phrase: c.lignes === 1 ? { key: "1 ligne inscrite à votre nom au dépositaire." } : { key: "{n} lignes inscrites à votre nom au dépositaire.", params: { n: c.lignes } },
        })
      : aActiver({
          rayon: "tenir",
          cle: "garde",
          nom: "Conservation et tenue de compte",
          href: "/titres",
          phrase: { key: "Dès votre première ligne, elle sera inscrite à votre nom au dépositaire." },
        }),
  );

  /* ADJUDICATIONS ET ÉMISSIONS, et non « placement primaire ».
     « Primaire » oppose au secondaire, et cette opposition n'existe que pour
     qui connaît déjà les deux. Le client, lui, voit une séance du Trésor ou
     une émission ouverte : ce sont ces deux mots-là qu'il faut dire, et ce
     sont ceux que la barre de navigation emploie déjà. */
  out.push(
    aActiver({
      rayon: "placer",
      cle: "primaire",
      nom: "Adjudications et émissions",
      href: "/calendrier",
      phrase: c.prochaineSeance
        ? { key: "Une séance {p} est annoncée le {d} : {q}.", params: { p: c.prochaineSeance.pays, d: c.prochaineSeance.le, q: c.prochaineSeance.quoi } }
        : { key: "Le calendrier porte toutes les séances annoncées dès leur publication." },
    }),
  );

  /* SE DIRE PRENEUR, et non « sondage ». « Sondage » dit ce que la maison
     en fait ; le client, lui, se dit preneur à un taux, sans engagement, et
     c'est le mot que la phrase du service emploie déjà. */
  out.push(
    c.prochaineSeance
      ? aActiver({
          rayon: "placer",
          cle: "sondage",
          nom: "Se dire preneur avant une adjudication",
          href: "/calendrier",
          phrase: { key: "Vous pouvez dire à quel taux vous seriez preneur sur la séance du {d}, sans vous engager.", params: { d: c.prochaineSeance.le } },
        })
      : aActiver({
          rayon: "placer",
          cle: "sondage",
          nom: "Se dire preneur avant une adjudication",
          href: "/calendrier",
          phrase: { key: "Commencez par une séance annoncée : le calendrier les publie dès qu'un Trésor ouvre la sienne." },
        }),
  );

  /* 08 · Passage d'un fonds à l'autre : il faut une part à racheter. */
  out.push(
    c.partsDeFonds
      ? aActiver({
          rayon: "placer",
          cle: "passage",
          nom: "Passage d'un fonds à l'autre",
          href: "/fonds",
          phrase: { key: "Vous détenez {n} parts de {d}, rachetables.", params: { n: c.partsDeFonds.parts, d: c.partsDeFonds.titre } },
        })
      : aActiver({
          rayon: "placer",
          cle: "passage",
          nom: "Passage d'un fonds à l'autre",
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
      nom: "Investir dans un fonds",
      href: "/fonds",
      phrase:
        c.fondsOuverts > 0
          ? { key: "Les fonds de la zone sont ouverts à la souscription." }
          : { key: "Aucun fonds n'est ouvert à la souscription en ce moment." },
    }),
  );

  /* ACHETER ET VENDRE EN BOURSE, et non « courtage ». Le courtage est notre
     métier ; le client, lui, achète et vend. Nommer la fonction de la maison
     à la place du geste est le défaut qui a touché trois noms sur dix. */
  out.push(
    aActiver({
      rayon: "placer",
      cle: "actions",
      nom: "Acheter et vendre en bourse",
      /* UN GESTE NE MÈNE PAS À LA PAGE QUI SE LIT. « /marche » est la porte de
         l'environnement BVMAC : l'indice, les sociétés, les notes. Un service
         dont le verbe est « acheter » y déposait le client sur une page de
         lecture, à deux crans de la liste où l'on achète. « /titres » EST
         cette liste — obligations, bons et actions — et elle n'était la
         destination d'aucun service. */
      href: "/titres",
      phrase: c.actions
        ? { key: "Vous détenez {n} actions {d}, vendables sur la BVMAC.", params: { n: c.actions.n, d: c.actions.titre } }
        : { key: "Achat et vente sur la BVMAC, au dernier cours publié et à sa date." },
    }),
  );

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
      ? enPlace({ rayon: "tenir", cle: "provision", nom: "Votre provision", href: "/moi/provision", phrase: { key: "{m} FCFA vous attendent et règlent votre prochain ordre sans virement.", params: { m: c.disponible } } })
      : aActiver({ rayon: "tenir", cle: "provision", nom: "Votre provision", href: "/moi/provision", phrase: { key: "Ce que vous laissez chez nous règle vos ordres sans attendre un virement, et repart sur demande." } }),
  );
  out.push(
    aActiver({ rayon: "programmer", cle: "prelevement", nom: "Prélèvement automatique", href: "/moi/prelevements", phrase: { key: "Vous nous autorisez à prélever une somme sur votre compte, à une date fixe, sous un plafond que vous fixez." } }),
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
  const surLeCompte = new Set(["garde", "reinvestissement", "epargne", "prelevement", "provision"]);
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
  { cle: "primaire", nom: "Adjudications et émissions", rayon: "placer", href: "/calendrier" },
  { cle: "sondage", nom: "Se dire preneur avant une adjudication", rayon: "placer", href: "/calendrier" },
  { cle: "actions", nom: "Acheter et vendre en bourse", rayon: "placer", href: "/titres" },
  { cle: "fonds", nom: "Investir dans un fonds", rayon: "placer", href: "/fonds" },
  { cle: "passage", nom: "Passage d'un fonds à l'autre", rayon: "placer", href: "/fonds" },
  { cle: "epargne", nom: "Épargne programmée", rayon: "programmer", href: "/moi/epargne" },
  { cle: "reinvestissement", nom: "Réinvestissement", rayon: "programmer", href: "/moi/reinvestir" },
  { cle: "prelevement", nom: "Prélèvement automatique", rayon: "programmer", href: "/moi/prelevements" },
  { cle: "provision", nom: "Votre provision", rayon: "tenir", href: "/moi/provision" },
  { cle: "garde", nom: "Conservation et tenue de compte", rayon: "tenir", href: "/moi" },
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
export const RAISON: Record<string, string> = {
  primaire: "Prêter à un État de la zone en achetant ses titres à l'émission, au prix de l'adjudication plutôt qu'à celui du marché.",
  sondage: "Dire au desk ce que vous prendriez avant qu'une séance ouvre, sans vous engager, pour qu'il vous rappelle au bon moment.",
  actions: "Devenir actionnaire d'une société cotée à la BVMAC, ou revendre ce que vous détenez, au cours du marché.",
  fonds: "Confier une somme à un gérant agréé qui la répartit sur des dizaines de lignes : la diversification sans avoir à la faire soi-même.",
  passage: "Changer de fonds sans sortir de votre argent, quand votre horizon ou votre besoin de liquidité a changé.",
  epargne: "Placer une somme fixe chaque mois sans y penser : c'est la régularité qui fait le résultat, pas le moment choisi.",
  reinvestissement: "Remettre au travail un coupon ou un remboursement dès son arrivée, au lieu de le laisser dormir sur un compte.",
  prelevement: "Autoriser la maison à débiter votre compte bancaire à date fixe, sous un plafond que vous fixez, pour n'avoir plus de virement à faire.",
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
  actions: [
    "Choisir la ligne à la cote de la BVMAC.",
    "Dire la quantité, et un prix limite si vous ne voulez pas acheter à n'importe quel cours.",
    "Le desk porte l'ordre au carnet.",
    "L'exécution revient avec son prix, et le règlement suit à la date du marché.",
  ],
  fonds: [
    "Choisir le fonds, sa catégorie et la périodicité de sa valeur liquidative.",
    "Dire le montant à souscrire.",
    "La VL retenue à la centralisation fixe le nombre exact de parts : il n'est donc connu qu'après.",
  ],
  garde: [
    "Rien à activer : la conservation commence avec votre première ligne.",
    "Les titres sont inscrits à votre nom au dépositaire, jamais dans un compte collectif.",
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
    "Dire ce qu'il alimente, le montant, le jour du mois et le plafond que vous ne voulez pas dépasser.",
    "Signer le mandat une fois, par un code reçu.",
    "Chaque prélèvement est annoncé cinq jours avant, et le mandat se révoque à tout moment, sans motif.",
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
      geste: "Accepter ma convention",
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
