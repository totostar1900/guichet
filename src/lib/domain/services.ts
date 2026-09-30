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
 * Trois états, et « indisponible » ne s'excuse pas : il dit pourquoi, en une
 * phrase. Un service grisé sans raison se lit comme une panne.
 *
 * Module sans dépendance d'exécution : il reçoit un état de compte déjà lu et
 * rend des phrases à traduire. Un test l'atteint sans monter ni base ni écran.
 */

export type EtatService = "en_place" | "a_activer" | "indisponible";

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
  /** Où il vit dans l'application, pour qui veut y retourner sans passer par ici. */
  ou: string;
  href: string;
  etat: EtatService;
  /** Ce qu'il fait, ou ferait, avec les chiffres du client. */
  phrase: Dit;
  /** La précision dessous : le dernier passage, la limite, la raison. */
  sinon?: Dit;
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
  /** Ce qui est échu et pas encore arrivé, et depuis combien de jours. */
  attendu?: { montant: number; retardJours: number };
  /** Le réinvestissement en place, s'il l'est. */
  reinvestissement?: { destination: string; plancher: number; dernier?: { montant: number; le: string } };
  /** L'épargne programmée en place, s'il y en a une. */
  epargne?: { montant: number; jour: number; destination: string; prochain?: string };
  /** Le dernier avis de droits de garde émis. */
  garde?: { periode: string; du: number };
  /** La prochaine séance annoncée, si le calendrier en porte une. */
  prochaineSeance?: { pays: string; quoi: string; le: string };
  /** Les mois d'historique : sous douze, la performance ne dit pas grand-chose. */
  moisDHistorique: number;
  /** L'appariement est-il exécutable, ou seulement détecté ? */
  appariementExecutable: boolean;
}

const enPlace = (s: Omit<ServiceVu, "etat">): ServiceVu => ({ ...s, etat: "en_place" });
const aActiver = (s: Omit<ServiceVu, "etat">): ServiceVu => ({ ...s, etat: "a_activer" });
const ferme = (s: Omit<ServiceVu, "etat">): ServiceVu => ({ ...s, etat: "indisponible" });

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
          ou: "Portefeuille › Espèces",
          href: "/moi/reinvestir",
          phrase: {
            key: "Vos encaissements partent vers {d} dès qu'ils atteignent {m} FCFA.",
            params: { d: c.reinvestissement.destination, m: c.reinvestissement.plancher },
          },
          sinon: c.reinvestissement.dernier
            ? { key: "Dernier versement : {m} FCFA le {d}.", params: { m: c.reinvestissement.dernier.montant, d: c.reinvestissement.dernier.le } }
            : { key: "Aucun versement encore produit : il partira au premier encaissement." },
        })
      : aActiver({
          n: "06",
          cle: "reinvestissement",
          nom: "Réinvestissement",
          ou: "Portefeuille › Espèces",
          href: "/moi/reinvestir",
          phrase:
            c.disponible > 0
              ? { key: "{m} FCFA sont disponibles et n'attendent rien : ils repartiraient sur la ligne que vous choisiriez.", params: { m: c.disponible } }
              : { key: "Dès qu'un coupon arrivera, il repartirait sur la ligne que vous auriez choisie d'avance." },
          sinon: { key: "Il ne part que sur de l'argent constaté reçu, jamais sur une échéance simplement passée." },
        }),
  );

  /* 03 · Épargne programmée. */
  out.push(
    c.epargne
      ? enPlace({
          n: "03",
          cle: "epargne",
          nom: "Épargne programmée",
          ou: "Trader",
          href: "/trader",
          phrase: { key: "{m} FCFA partent le {j} de chaque mois vers {d}.", params: { m: c.epargne.montant, j: c.epargne.jour, d: c.epargne.destination } },
          sinon: c.epargne.prochain
            ? { key: "Prochain versement le {d}. Arrêtable d'un bouton, sans motif à donner.", params: { d: c.epargne.prochain } }
            : { key: "Arrêtable d'un bouton, sans motif à donner." },
        })
      : aActiver({
          n: "03",
          cle: "epargne",
          nom: "Épargne programmée",
          ou: "Fonds › une part",
          href: "/fonds",
          phrase: { key: "Un montant, un jour du mois, une destination fixée à la signature." },
          sinon: { key: "La destination est une ligne précise, jamais une catégorie : choisir chaque mois serait de la gestion." },
        }),
  );

  /* 07 · Conservation. Elle est en place dès qu'une ligne est tenue. */
  out.push(
    c.lignes > 0
      ? enPlace({
          n: "07",
          cle: "garde",
          nom: "Conservation et tenue de compte",
          ou: "Portefeuille",
          href: "/moi",
          // « 1 lignes inscrites » se lisait sur la première page qu'un client
          // ouvre. Deux clefs plutôt qu'une règle de pluriel : le dictionnaire
          // est indexé par le français, et une règle de pluriel française ne
          // vaut pas pour l'anglais.
          phrase: c.lignes === 1 ? { key: "1 ligne inscrite à votre nom au dépositaire." } : { key: "{n} lignes inscrites à votre nom au dépositaire.", params: { n: c.lignes } },
          sinon: c.garde
            ? c.garde.du > 0
              ? { key: "Avis du {p} : {m} FCFA de droits de garde.", params: { p: c.garde.periode, m: c.garde.du } }
              : { key: "Avis du {p} émis : la conservation ne vous a rien coûté.", params: { p: c.garde.periode } }
            : { key: "Aucun avis encore émis sur cette période." },
        })
      : aActiver({
          n: "07",
          cle: "garde",
          nom: "Conservation et tenue de compte",
          ou: "Titres",
          href: "/titres",
          phrase: { key: "Dès votre première ligne, elle sera inscrite à votre nom au dépositaire." },
          sinon: { key: "Le relevé porte chaque ligne, son échéancier et ce qui reste à venir." },
        }),
  );

  /* 01 · Placement primaire. */
  out.push(
    aActiver({
      n: "01",
      cle: "primaire",
      nom: "Placement primaire",
      ou: "Titres › une séance annoncée",
      href: "/calendrier",
      phrase: c.prochaineSeance
        ? { key: "Une séance {p} est annoncée le {d} : {q}.", params: { p: c.prochaineSeance.pays, d: c.prochaineSeance.le, q: c.prochaineSeance.quoi } }
        : { key: "Aucune séance n'est annoncée pour l'instant : le calendrier les porte dès leur publication." },
      sinon: { key: "Une intention n'est pas une garantie d'allocation : le Trésor sert qui il veut, au prix qu'il retient." },
    }),
  );

  /* 09 · Sondage. Il n'a de sens que devant une séance à venir. */
  out.push(
    c.prochaineSeance
      ? aActiver({
          n: "09",
          cle: "sondage",
          nom: "Sondage avant adjudication",
          ou: "Titres › la séance annoncée",
          href: "/calendrier",
          phrase: { key: "Vous pouvez dire à quel taux vous seriez preneur sur la séance du {d}, sans vous engager.", params: { d: c.prochaineSeance.le } },
          sinon: { key: "L'émetteur voit une demande chiffrée, jamais un nom." },
        })
      : ferme({
          n: "09",
          cle: "sondage",
          nom: "Sondage avant adjudication",
          ou: "Titres › une séance annoncée",
          href: "/calendrier",
          phrase: { key: "Aucune séance n'est annoncée : un sondage se tient devant une date." },
          sinon: { key: "Il rouvrira dès qu'un Trésor publiera son avis d'annonce." },
        }),
  );

  /* 08 · Passage d'un fonds à l'autre : il faut une part à racheter. */
  out.push(
    c.partsDeFonds
      ? aActiver({
          n: "08",
          cle: "passage",
          nom: "Passage d'un fonds à l'autre",
          ou: "Fonds › votre part",
          href: "/fonds",
          phrase: { key: "Vous détenez {n} parts de {d}, rachetables.", params: { n: c.partsDeFonds.parts, d: c.partsDeFonds.titre } },
          sinon: { key: "Le rachat et la souscription seraient tenus ensemble, sans passer par votre banque." },
        })
      : ferme({
          n: "08",
          cle: "passage",
          nom: "Passage d'un fonds à l'autre",
          ou: "Fonds",
          href: "/fonds",
          phrase: { key: "Vous ne détenez aucune part de fonds : un passage part d'un rachat." },
          sinon: { key: "Il s'ouvrira dès votre première souscription." },
        }),
  );

  /* 02 · Intermédiation sur les fonds. */
  out.push(
    aActiver({
      n: "02",
      cle: "fonds",
      nom: "Intermédiation sur les fonds",
      ou: "Fonds",
      href: "/fonds",
      phrase:
        c.fondsOuverts > 0
          ? { key: "{n} fonds de la zone sont ouverts à la souscription.", params: { n: c.fondsOuverts } }
          : { key: "Aucun fonds n'est ouvert à la souscription en ce moment." },
      sinon: { key: "Leurs frais et leurs valeurs liquidatives se comparent sur une même page." },
    }),
  );

  /* 05 · Courtage sur actions cotées. */
  out.push(
    aActiver({
      n: "05",
      cle: "actions",
      nom: "Courtage sur actions cotées",
      ou: "Marché",
      href: "/marche",
      phrase: c.actions
        ? { key: "Vous détenez {n} actions {d}, vendables sur la BVMAC.", params: { n: c.actions.n, d: c.actions.titre } }
        : { key: "Achat et vente sur la BVMAC, au dernier cours publié et à sa date." },
      sinon: { key: "Une ligne qui n'a jamais traité n'a pas de prix de marché : son cours affiché est un prix de référence reporté." },
    }),
  );

  /* 04 · Appariement. Le seul qui puisse être fermé par décision de maison. */
  out.push(
    c.appariementExecutable
      ? enPlace({
          n: "04",
          cle: "appariement",
          nom: "Appariement des intentions",
          ou: "Automatique",
          href: "/trader",
          phrase: { key: "Quand une intention inverse existe en interne, elle vous est signalée avant toute sortie sur le marché." },
        })
      : ferme({
          n: "04",
          cle: "appariement",
          nom: "Appariement des intentions",
          ou: "Automatique",
          href: "/trader",
          phrase: { key: "La maison détecte une intention inverse et vous la signale." },
          sinon: { key: "L'exécution d'un appariement attend une décision de la maison : aujourd'hui, le signal seul." },
        }),
  );

  const rang: Record<EtatService, number> = { en_place: 0, a_activer: 1, indisponible: 2 };
  return out.sort((a, b) => rang[a.etat] - rang[b.etat]);
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
    indisponible: services.filter((s) => s.etat === "indisponible").length,
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
  chiffre: string;
  quoi: Dit;
  geste: string;
  href: string;
  /** L'attente qui porte de l'argent arrivé : elle se distingue des autres. */
  ton: "arrive" | "annonce" | "retard";
}

export function attentesDuClient(c: ContexteClient, fmt: (n: number) => string): Attente[] {
  const out: Attente[] = [];
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
  return out.slice(0, 3);
}
