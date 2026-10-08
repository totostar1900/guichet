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

/** Une phrase du dictionnaire, avec ses trous : les nombres voyagent à part. */
export interface Dit {
  key: string;
  params?: Record<string, string | number>;
}

export interface ServiceVu {
  /** Le numéro du service au périmètre de la maison, « 01 » à « 09 ». */
  n: string;
  cle: string;
  nom: string;
  href: string;
  etat: EtatService;
  /** Ce qu'il fait, ou ferait, avec les chiffres du client. */
  phrase: Dit;
  /**
   * Ce que le bouton dit, et où il mène.
   *
   * « Allons-y » partout ne disait rien de ce qui allait se passer. Et quand
   * le compte-titres n'est pas encore ouvert, aucun des neuf ne commence par
   * lui-même : le geste devient l'ouverture, une fois, pour tous.
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
  dossier?: "convention" | "complements";
  /** Ce qui est échu et pas encore arrivé, et depuis combien de jours. */
  attendu?: { montant: number; retardJours: number };
  /** Le réinvestissement en place, s'il l'est. */
  reinvestissement?: { destination: string; plancher: number };
  /** L'épargne programmée en place, s'il y en a une. */
  epargne?: { montant: number; jour: number; destination: string };
  /** La prochaine séance annoncée, si le calendrier en porte une. */
  prochaineSeance?: { pays: string; quoi: string; le: string };
  /** Les mois d'historique : sous douze, la performance ne dit pas grand-chose. */
  moisDHistorique: number;
  /** L'appariement est-il exécutable, ou seulement détecté ? */
  appariementExecutable: boolean;
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

const enPlace = (s: Omit<ServiceVu, "etat" | "geste"> & { geste?: Dit }): ServiceVu => ({ ...s, etat: "en_place", geste: s.geste ?? { key: "Voir le détail" } });
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
          n: "06",
          cle: "reinvestissement",
          nom: "Réinvestissement",
          href: "/moi/reinvestir",
          phrase: {
            key: "Vos encaissements partent vers {d} dès qu'ils atteignent {m} FCFA.",
            params: { d: c.reinvestissement.destination, m: c.reinvestissement.plancher },
          },
        })
      : aActiver({
          n: "06",
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
          n: "03",
          cle: "epargne",
          nom: "Épargne programmée",
          href: "/trader",
          phrase: { key: "{m} FCFA partent le {j} de chaque mois vers {d}.", params: { m: c.epargne.montant, j: c.epargne.jour, d: c.epargne.destination } },
        })
      : aActiver({
          n: "03",
          cle: "epargne",
          nom: "Épargne programmée",
          href: "/fonds",
          phrase: { key: "Un montant, un jour du mois, une destination fixée à la signature." },
        }),
  );

  /* 07 · Conservation. Elle est en place dès qu'une ligne est tenue. */
  out.push(
    c.lignes > 0
      ? enPlace({
          n: "07",
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
          n: "07",
          cle: "garde",
          nom: "Conservation et tenue de compte",
          href: "/titres",
          phrase: { key: "Dès votre première ligne, elle sera inscrite à votre nom au dépositaire." },
        }),
  );

  /* 01 · Placement primaire. */
  out.push(
    aActiver({
      n: "01",
      cle: "primaire",
      nom: "Placement primaire",
      href: "/calendrier",
      phrase: c.prochaineSeance
        ? { key: "Une séance {p} est annoncée le {d} : {q}.", params: { p: c.prochaineSeance.pays, d: c.prochaineSeance.le, q: c.prochaineSeance.quoi } }
        : { key: "Le calendrier porte toutes les séances annoncées dès leur publication." },
    }),
  );

  /* 09 · Sondage. Il n'a de sens que devant une séance à venir. */
  out.push(
    c.prochaineSeance
      ? aActiver({
          n: "09",
          cle: "sondage",
          nom: "Sondage avant adjudication",
          href: "/calendrier",
          phrase: { key: "Vous pouvez dire à quel taux vous seriez preneur sur la séance du {d}, sans vous engager.", params: { d: c.prochaineSeance.le } },
        })
      : aActiver({
          n: "09",
          cle: "sondage",
          nom: "Sondage avant adjudication",
          href: "/calendrier",
          phrase: { key: "Commencez par une séance annoncée : le calendrier les publie dès qu'un Trésor ouvre la sienne." },
        }),
  );

  /* 08 · Passage d'un fonds à l'autre : il faut une part à racheter. */
  out.push(
    c.partsDeFonds
      ? aActiver({
          n: "08",
          cle: "passage",
          nom: "Passage d'un fonds à l'autre",
          href: "/fonds",
          phrase: { key: "Vous détenez {n} parts de {d}, rachetables.", params: { n: c.partsDeFonds.parts, d: c.partsDeFonds.titre } },
        })
      : aActiver({
          n: "08",
          cle: "passage",
          nom: "Passage d'un fonds à l'autre",
          href: "/fonds",
          phrase: { key: "Commencez par souscrire à un fonds : le passage se déclare ensuite depuis la ligne que vous détenez." },
        }),
  );

  /* 02 · Intermédiation sur les fonds. */
  out.push(
    aActiver({
      n: "02",
      cle: "fonds",
      nom: "Intermédiation sur les fonds",
      href: "/fonds",
      phrase:
        c.fondsOuverts > 0
          ? { key: "Les fonds de la zone sont ouverts à la souscription." }
          : { key: "Aucun fonds n'est ouvert à la souscription en ce moment." },
    }),
  );

  /* 05 · Courtage sur actions cotées. */
  out.push(
    aActiver({
      n: "05",
      cle: "actions",
      nom: "Courtage sur actions cotées",
      href: "/marche",
      phrase: c.actions
        ? { key: "Vous détenez {n} actions {d}, vendables sur la BVMAC.", params: { n: c.actions.n, d: c.actions.titre } }
        : { key: "Achat et vente sur la BVMAC, au dernier cours publié et à sa date." },
    }),
  );

  /* 04 · Appariement. Le seul qui puisse être fermé par décision de maison. */
  out.push(
    c.appariementExecutable
      ? enPlace({
          n: "04",
          cle: "appariement",
          nom: "Appariement des intentions",
          href: "/trader",
          phrase: { key: "Quand une intention inverse existe en interne, elle vous est signalée avant toute sortie sur le marché." },
        })
      : aActiver({
          n: "04",
          cle: "appariement",
          nom: "Appariement des intentions",
          href: "/trader",
          phrase: { key: "La maison détecte une intention inverse et vous la signale." },
        }),
  );

  const rang: Record<EtatService, number> = { en_place: 0, a_activer: 1 };
  /**
   * LA PORTE AVANT LE SERVICE, MAIS PAS DEVANT TOUS.
   *
   * Sans compte-titres, celui qui touche « Conservation », « Réinvestissement »,
   * « Épargne programmée » ou « Appariement » ne peut rien faire d'autre que
   * l'ouvrir : ces quatre-là SONT le compte, ou s'écrivent dessus.
   *
   * Les cinq autres commencent par regarder, et regarder ne demande rien : le
   * calendrier des séances, le catalogue des fonds, la cote, le passage d'un
   * fonds à l'autre, le sondage. Les y envoyer ouvrir un compte serait une fin
   * de non-recevoir déguisée ; c'est l'ordre qui demandera le compte, et il le
   * demandera à son heure.
   */
  const surLeCompte = new Set(["garde", "reinvestissement", "epargne", "appariement"]);
  const ouverts =
    c.compteOuvert === false
      ? out.map((x) => (!surLeCompte.has(x.cle) ? x : {
          ...x,
          href: "/ouvrir-un-compte",
          geste: { key: "Ouvrir un compte-titres" },
          porte: { key: "Ce service s'écrit sur un compte-titres à votre nom. L'ouverture se fait en ligne et le desk vérifie les pièces." },
        }))
      : out;
  return ouverts.sort((a, b) => rang[a.etat] - rang[b.etat]);
}

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
  appariement: [
    "Ouvrir le signal, fermé par défaut : sans lui, rien n'est rapproché.",
    "Une intention de sens inverse peut alors croiser la vôtre.",
    "Le desk vous prévient avant tout rapprochement : il ne se fait jamais dans votre dos.",
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
      quoi: { key: "Votre dossier est approuvé. Votre compte s'ouvre dès que la convention est acceptée, par un code à usage unique." },
      geste: "Accepter ma convention",
      href: "/ouvrir-un-compte",
      ton: "retard",
    });
  if (c.dossier === "complements")
    out.push({
      cle: "complements",
      quand: { key: "Le desk attend vos pièces" },
      chiffre: { key: "Dossier" },
      quoi: { key: "Des compléments ont été demandés : l'examen de votre dossier reprend dès qu'ils sont déposés." },
      geste: "Compléter mon dossier",
      href: "/ouvrir-un-compte",
      ton: "retard",
    });
  if (c.aSigner > 0)
    out.push({
      cle: "signer",
      quand: { key: "Votre signature" },
      chiffre: c.aSigner > 1 ? { key: "{n} ordres", params: { n: c.aSigner } } : { key: "1 ordre" },
      quoi: { key: "Le bulletin est prêt. L'ordre part dès qu'il est signé et le virement fait." },
      geste: "Signer",
      href: c.ouSigner ? `/moi/ordres/${c.ouSigner}` : "/moi#ordres-en-cours",
      ton: "retard",
    });
  if (c.aRepondre > 0)
    out.push({
      cle: "repondre",
      quand: { key: "Votre réponse" },
      chiffre: c.aRepondre > 1 ? { key: "{n} propositions", params: { n: c.aRepondre } } : { key: "1 proposition" },
      quoi: { key: "D'autres conditions vous sont proposées : c'est votre réponse qui change l'ordre." },
      geste: "Répondre",
      href: c.ouRepondre ? `/moi/ordres/${c.ouRepondre}` : "/moi#ordres-en-cours",
      ton: "retard",
    });
  if (c.disponible > 0)
    out.push({
      cle: "disponible",
      quand: { key: "Sur votre compte" },
      chiffre: `${fmt(Math.round(c.disponible))} FCFA`,
      quoi: c.reinvestissement
        ? { key: "Reçus et n'attendant rien. Votre réinvestissement les placera au prochain passage." }
        : { key: "Reçus et n'attendant aucune opération. Tant qu'ils dorment, ils ne rapportent rien." },
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
      quoi: { key: "Le Trésor {p} a publié son avis d'annonce. Vous pouvez déclarer une intention jusqu'à la veille.", params: { p: c.prochaineSeance.pays } },
      geste: "Déclarer une intention",
      href: "/calendrier",
      ton: "annonce",
    });
  if (c.attendu && c.attendu.montant > 0)
    out.push({
      cle: "attendu",
      quand: { key: "Échu depuis {n} jours", params: { n: c.attendu.retardJours } },
      chiffre: `${fmt(Math.round(c.attendu.montant))} FCFA`,
      quoi: { key: "Un flux est échu et n'est pas arrivé. Le desk le réclame à l'émetteur." },
      geste: "Suivre",
      href: "/moi",
      ton: "retard",
    });
  return out;
}
