/**
 * Risques et limites : la page où la maison dit ce que chaque geste engage.
 *
 * ELLE EXISTE PARCE QUE LA VITRINE A CESSÉ DE PLAIDER CONTRE ELLE-MÊME. La
 * page d'accueil portait, sous chacun des neuf services, la limite qui va
 * avec : neuf raisons d'hésiter sur la seule page dont le travail est de
 * donner envie. Les limites n'ont pas disparu, elles sont ici, entières, et
 * l'accroche réglementaire du pied de page y renvoie.
 *
 * DEUX RÈGLES TIENNENT CE FICHIER.
 *
 * On range PAR OPÉRATION, jamais par service. Les neuf services ne se nomment
 * plus avant connexion, et une page publique qui les listerait rouvrirait par
 * la fenêtre ce que la porte a fermé. « Souscrire au primaire » est un geste,
 * pas un produit du catalogue.
 *
 * Une limite SE DIT SANS S'EXCUSER. « Une intention n'est pas une garantie
 * d'allocation » est une phrase entière, à l'indicatif, sans « malheureusement »
 * ni « veuillez noter que ». Un investisseur qui la lit avant d'ouvrir un
 * compte fait plus confiance, pas moins, et c'est le seul argument qu'un
 * concurrent ne peut pas copier.
 *
 * La version se bouge quand le texte bouge, comme LEGAL_VERSION.
 */
export const RISQUES_VERSION = "2026-09-30";

export interface Deux {
  fr: string;
  en: string;
}

export interface RisquesSection {
  id: string;
  titre: Deux;
  /** Les paragraphes de tête, avant la liste s'il y en a une. */
  corps: Deux[];
  /** L'encadré doré : la phrase qu'on retient si on ne lit que ça. */
  retenir?: Deux;
  /** Une limite par opération, ou un risque par nom. */
  lignes?: { quoi: Deux; dit: Deux }[];
  /** Le partage des rôles : deux colonnes face à face. */
  partage?: { vous: Deux[]; nous: Deux[] };
  /** Le paragraphe de clôture, après la liste. */
  fin?: Deux[];
}

export const RISQUES: RisquesSection[] = [
  {
    id: "engage",
    titre: { fr: "Ce qu'une intention engage", en: "What an intention commits" },
    corps: [
      {
        fr: "Sur le marché primaire de la zone, vous déclarez une intention : un montant, une durée, et le taux auquel vous seriez preneur. Elle part au Trésor avec celles des autres investisseurs, et le Trésor décide seul de ce qu'il sert.",
        en: "On the primary market of the zone, you declare an intention: an amount, a maturity, and the rate at which you would be a buyer. It goes to the Treasury along with those of the other investors, and the Treasury alone decides what it serves.",
      },
    ],
    retenir: {
      fr: "Une intention n'est ni un ordre exécuté ni une garantie d'allocation. Vous pouvez être servi en totalité, en partie, ou pas du tout, à un prix que vous ne fixez pas.",
      en: "An intention is neither an executed order nor a guarantee of allocation. You may be served in full, in part, or not at all, at a price you do not set.",
    },
    fin: [
      {
        fr: "Une fois la séance dépouillée, l'allocation qui vous revient est portée à votre nom au dépositaire, avec le prix effectivement servi et le rendement qui en découle. Tant que la séance n'a pas eu lieu, aucun chiffre affiché n'est un engagement.",
        en: "Once the session is counted, the allocation that comes to you is registered in your own name at the depositary, with the price actually awarded and the yield that follows from it. Until the session has taken place, no figure shown is a commitment.",
      },
      {
        fr: "Sur le marché secondaire, un ordre de bourse suit la règle de la BVMAC : il s'exécute si une contrepartie se présente, au cours de la séance, et pas avant.",
        en: "On the secondary market, an exchange order follows the BVMAC's rule: it executes if a counterparty comes forward, during the session, and not before.",
      },
    ],
  },
  {
    id: "operations",
    titre: { fr: "La limite de chaque opération", en: "The limit of each operation" },
    corps: [
      {
        fr: "Chaque opération que vous pouvez engager porte une limite, et elle se dit ici en entier. Un investisseur qui la lit avant d'ouvrir un compte sait ce qu'il achète.",
        en: "Every operation you can engage in carries a limit, and it is stated here in full. An investor who reads it before opening an account knows what they are buying.",
      },
    ],
    lignes: [
      {
        quoi: { fr: "Souscrire au primaire", en: "Bid in the primary market" },
        dit: {
          fr: "Une intention n'est pas une garantie d'allocation : le Trésor sert qui il veut, au prix qu'il retient. Le montant servi peut être nul, partiel ou total.",
          en: "An intention is not a guarantee of allocation: the Treasury serves whom it chooses, at the price it retains. The amount served may be nil, partial or total.",
        },
      },
      {
        quoi: { fr: "Négocier sur la cote", en: "Trade on the exchange" },
        dit: {
          fr: "Une ligne qui n'a jamais traité n'a pas de prix de marché : le cours affiché est un prix de référence reporté, et sa date est indiquée à côté.",
          en: "A line that has never traded has no market price: the price shown is a carried-over reference price, and its date is indicated beside it.",
        },
      },
      {
        quoi: { fr: "Placer en fonds", en: "Invest through funds" },
        dit: {
          fr: "Nous distribuons, la gestion appartient à la société qui gère le fonds. Le choix du fonds reste le vôtre, et la valeur liquidative est celle de sa dernière date publiée.",
          en: "We distribute; management belongs to the company that runs the fund. The choice of fund stays yours, and the net asset value is the one of its last published date.",
        },
      },
      {
        quoi: { fr: "Passer d'un fonds à l'autre", en: "Switch between funds" },
        dit: {
          fr: "Le rachat et la souscription restent deux ordres distincts : le délai de règlement du rachat commande la date d'entrée sur le fonds d'arrivée.",
          en: "The redemption and the subscription remain two distinct orders: the redemption's settlement delay governs the entry date into the receiving fund.",
        },
      },
      {
        quoi: { fr: "Épargner par versements", en: "Save by instalments" },
        dit: {
          fr: "La destination est une ligne précise, fixée à la signature, et non une catégorie : choisir chaque mois à votre place relèverait de la gestion, qui n'est pas notre métier.",
          en: "The destination is a specific line, fixed at signing, not a category: choosing each month on your behalf would amount to portfolio management, which is not our business.",
        },
      },
      {
        quoi: { fr: "Faire repartir ce qui revient", en: "Put back what comes in" },
        dit: {
          fr: "Le réinvestissement ne part que sur de l'argent constaté reçu sur le compte, jamais sur une échéance simplement passée.",
          en: "Reinvestment only goes out on money confirmed as received on the account, never on a due date that has merely passed.",
        },
      },
      {
        quoi: { fr: "Conserver et tenir le compte", en: "Custody and account keeping" },
        dit: {
          fr: "Les titres sont inscrits à votre nom au dépositaire. Les droits de garde sont calculés et détaillés ligne à ligne, et l'avis vous parvient avant tout prélèvement.",
          en: "The securities are registered in your own name at the depositary. Custody fees are calculated and detailed line by line, and the statement reaches you before anything is charged.",
        },
      },
      {
        quoi: { fr: "Répondre à un sondage", en: "Answer a survey" },
        dit: {
          fr: "Un sondage avant adjudication n'engage personne et ne vous réserve rien. L'émetteur y voit une demande chiffrée, jamais un nom.",
          en: "A survey ahead of an auction commits nobody and reserves you nothing. The issuer sees a demand in figures, never a name.",
        },
      },
      {
        quoi: { fr: "Être averti d'une intention inverse", en: "Be told of an opposite intention" },
        dit: {
          fr: "Lorsqu'une intention de sens contraire existe en interne, elle vous est signalée. Son exécution attend une décision de la maison : à ce jour, le signal seul.",
          en: "When an intention in the opposite direction exists in house, you are told. Executing it awaits a decision by the firm: as of today, the signal only.",
        },
      },
    ],
  },
  {
    id: "partage",
    titre: { fr: "Ce qui relève de vous, ce qui relève de nous", en: "What is yours to decide, what is ours to do" },
    corps: [
      {
        fr: "Purpose Capital est société de bourse : elle exécute ce que vous décidez. La frontière est nette, et elle vaut dans les deux sens.",
        en: "Purpose Capital is a brokerage firm: it carries out what you decide. The line is clear, and it holds in both directions.",
      },
    ],
    partage: {
      vous: [
        { fr: "Le choix de la ligne, le montant, la durée et le moment.", en: "The choice of line, the amount, the maturity and the timing." },
        { fr: "Le taux auquel vous acceptez d'être servi.", en: "The rate at which you accept to be served." },
        { fr: "La décision de conserver jusqu'à l'échéance ou de sortir avant.", en: "The decision to hold to maturity or to exit before." },
        { fr: "La mise à jour de votre profil et de votre situation.", en: "Keeping your profile and your circumstances up to date." },
      ],
      nous: [
        { fr: "Porter votre ordre au marché, dans les délais de la séance.", en: "Carrying your order to the market, within the session's deadlines." },
        { fr: "Tenir le compte et inscrire les titres à votre nom au dépositaire.", en: "Keeping the account and registering the securities in your own name at the depositary." },
        { fr: "Calculer et détailler chaque frais avant de le prélever.", en: "Calculating and detailing every fee before charging it." },
        { fr: "Rapporter ce qui est réellement arrivé sur le compte, à sa date réelle.", en: "Reporting what has actually reached the account, at its actual date." },
        { fr: "Publier nos lectures du marché, et dire d'où vient chaque chiffre.", en: "Publishing our readings of the market, and saying where each figure comes from." },
      ],
    },
    fin: [
      {
        fr: "Un conseil personnalisé, si vous en souhaitez un, passe par un conseiller identifié, après le questionnaire de connaissance et d'expérience. Il est tracé, daté, et vous en gardez la copie.",
        en: "Personalised advice, if you want it, goes through a named adviser, after the knowledge and experience questionnaire. It is recorded, dated, and you keep the copy.",
      },
    ],
  },
  {
    id: "risques",
    titre: { fr: "Les risques ordinaires", en: "The ordinary risks" },
    corps: [
      {
        fr: "Ils tiennent aux instruments eux-mêmes, et non à la plateforme. Ils valent chez nous comme partout ailleurs.",
        en: "They belong to the instruments themselves, not to the platform. They apply here as they do anywhere else.",
      },
    ],
    lignes: [
      {
        quoi: { fr: "Perte en capital", en: "Capital loss" },
        dit: {
          fr: "Une obligation conservée jusqu'à l'échéance rembourse son nominal si l'émetteur paie. Revendue avant, elle vaut le prix du marché ce jour-là, qui peut être inférieur à ce que vous avez payé.",
          en: "A bond held to maturity repays its face value if the issuer pays. Sold before, it is worth the market price on that day, which may be lower than what you paid.",
        },
      },
      {
        quoi: { fr: "Taux", en: "Interest rate" },
        dit: {
          fr: "Quand les taux de la zone montent, le prix d'une ligne déjà émise baisse. Plus la ligne est longue, plus l'effet est marqué.",
          en: "When the rates of the zone rise, the price of a line already issued falls. The longer the line, the stronger the effect.",
        },
      },
      {
        quoi: { fr: "Signature", en: "Credit" },
        dit: {
          fr: "Le remboursement dépend de la capacité de l'émetteur à payer. Un Trésor de la zone porte un risque de signature, et une entreprise cotée en porte un plus grand.",
          en: "Repayment depends on the issuer's ability to pay. A Treasury of the zone carries a credit risk, and a listed company carries a greater one.",
        },
      },
      {
        quoi: { fr: "Liquidité", en: "Liquidity" },
        dit: {
          fr: "Une ligne peut ne trouver aucun acheteur au moment où vous souhaitez sortir, ou n'en trouver qu'à un prix éloigné du dernier cours publié.",
          en: "A line may find no buyer at the moment you wish to exit, or find one only at a price far from the last published price.",
        },
      },
      {
        quoi: { fr: "Règlement et calendrier", en: "Settlement and calendar" },
        dit: {
          fr: "Un coupon peut arriver après sa date d'échéance. Le journal porte la date réelle de réception, et le desk réclame à l'émetteur ce qui tarde.",
          en: "A coupon may arrive after its due date. The ledger carries the actual date of receipt, and the desk claims from the issuer whatever is late.",
        },
      },
      {
        quoi: { fr: "Fiscalité", en: "Taxation" },
        dit: {
          fr: "Le traitement fiscal dépend de votre situation et de votre pays de résidence. Il peut changer, et les rendements affichés sont indiqués avant fiscalité.",
          en: "Tax treatment depends on your circumstances and your country of residence. It can change, and the yields shown are stated before tax.",
        },
      },
    ],
  },
  {
    id: "recours",
    titre: { fr: "Réclamation et recours", en: "Complaints and recourse" },
    corps: [
      {
        fr: "Une réclamation s'ouvre depuis votre espace ou par écrit à l'adresse de la maison. Elle reçoit un accusé de réception et une référence, et vous suivez son avancement au même endroit.",
        en: "A complaint is opened from your own space or in writing to the firm's address. It receives an acknowledgement and a reference, and you follow its progress in the same place.",
      },
      {
        fr: "Si la réponse ne vous satisfait pas, la Commission de Surveillance du Marché Financier de l'Afrique Centrale, régulateur qui délivre notre agrément, reçoit les réclamations des investisseurs concernant les prestataires qu'elle agrée.",
        en: "If the answer does not satisfy you, the Commission de Surveillance du Marché Financier de l'Afrique Centrale, the regulator that grants our licence, receives investors' complaints concerning the providers it licenses.",
      },
    ],
  },
];
