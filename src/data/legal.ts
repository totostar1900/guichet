/**
 * What a client accepts before using the Guichet: who we are, what the Guichet
 * is and is not, the risks, the channels and the data. Accepted once per
 * version; a new version (a changed text, a new date below) asks again at the
 * next sign-in. The same text is public at /info/mentions.
 */
export const LEGAL_VERSION = "2026-09-19";

export interface LegalSection {
  id: string;
  title: { fr: string; en: string };
  body: { fr: string[]; en: string[] };
}

export const LEGAL: LegalSection[] = [
  {
    id: "qui",
    title: { fr: "Qui vous parle", en: "Who is speaking to you" },
    body: {
      fr: [
        "Purpose Capital S.A. est une société de bourse agréée par la COSUMAF (agrément n° COSUMAF-SDB-01/2026), dont le siège est rue Joseph Essono Balla, Elig-Essono, Yaoundé, Cameroun. Le Guichet est son service en ligne : il présente les titres publics, les opérations de marché, les lignes cotées à la BVMAC et les fonds (OPCVM) accessibles par son intermédiaire.",
        "Un conseiller de Purpose Capital reste joignable sur WhatsApp, par téléphone et par e-mail pour chaque intention que vous déclarez.",
      ],
      en: [
        "Purpose Capital S.A. is a brokerage firm licensed by COSUMAF (licence no. COSUMAF-SDB-01/2026), with its registered office at rue Joseph Essono Balla, Elig-Essono, Yaoundé, Cameroon. The Guichet is its online service: it presents public securities, market operations, lines listed on the BVMAC and funds (UCITS) accessible through it.",
        "A Purpose Capital adviser remains reachable on WhatsApp, by phone and by e-mail for every intention you declare.",
      ],
    },
  },
  {
    id: "conseil",
    title: { fr: "Ni conseil, ni promesse", en: "Neither advice nor promise" },
    body: {
      fr: [
        "Le Guichet est une communication à caractère promotionnel. Il décrit des instruments et calcule des chiffres ; il ne vous recommande rien. Une ligne « à la une » ou une sélection du desk est un choix éditorial, pas un conseil adapté à votre situation.",
        "Les rendements affichés sont actuariels, annuels, bruts, en convention Exact/Exact, hors commission et hors fiscalité, sous réserve du prix effectivement servi. Ils décrivent une promesse de l'émetteur ou un passé ; aucun ne prédit l'avenir.",
        "Une intention d'investissement n'est ni un ordre ni une garantie d'allocation. Rien n'est engagé tant qu'un conseiller n'a pas confirmé avec vous et que vous n'avez pas signé le bulletin correspondant.",
      ],
      en: [
        "The Guichet is a promotional communication. It describes instruments and computes figures; it recommends nothing to you. A featured line or a desk selection is an editorial choice, not advice suited to your situation.",
        "Yields shown are actuarial, annual, gross, on the Actual/Actual convention, before commission and tax, subject to the price actually served. They describe an issuer's promise or a past; none predicts the future.",
        "An investment intention is neither an order nor a guarantee of allocation. Nothing is committed until an adviser has confirmed with you and you have signed the corresponding order form.",
      ],
    },
  },
  {
    id: "risques",
    title: { fr: "Les risques que vous portez", en: "The risks you bear" },
    body: {
      fr: [
        "Risque de perte en capital : un émetteur peut ne pas payer, un cours peut baisser, une valeur liquidative peut reculer. Risque de liquidité : revendre avant l'échéance peut être lent ou coûteux. Risque de taux : le prix d'une obligation baisse quand les taux montent. Risque d'allocation : à une adjudication, votre ordre peut n'être servi qu'en partie, ou pas du tout.",
        "Les fonds ne garantissent ni leur capital ni leur performance ; leurs frais réduisent le rendement. La fiscalité applicable dépend de votre situation et de votre pays de résidence.",
      ],
      en: [
        "Capital loss risk: an issuer may fail to pay, a price may fall, a net asset value may drop. Liquidity risk: selling before maturity may be slow or costly. Rate risk: a bond's price falls when rates rise. Allocation risk: at an auction, your order may be served in part, or not at all.",
        "Funds guarantee neither their capital nor their performance; their fees reduce the return. The applicable tax depends on your situation and your country of residence.",
      ],
    },
  },
  {
    id: "canaux",
    title: { fr: "Vos canaux et vos données", en: "Your channels and your data" },
    body: {
      fr: [
        "Votre e-mail et votre numéro WhatsApp servent à vous joindre pour vos intentions : accusés de réception, rappels d'un conseiller, bulletins et appels de fonds, avis d'opéré. En prouvant un numéro par son code, vous acceptez d'être contacté sur WhatsApp pour ces opérations ; STOP y met fin à tout moment.",
        "Vos données d'identification et vos ordres sont conservés le temps qu'exigent la réglementation des marchés et la lutte contre le blanchiment. Elles ne sont ni vendues ni cédées. Vous pouvez demander leur consultation ou leur rectification à info@purposecapital.africa.",
        "Les appareils que vous ajoutez (clé d'accès ou code à quatre chiffres) ne servent qu'à vous reconnaître sur cet appareil ; chaque ajout et chaque retrait vous sont annoncés sur vos deux canaux.",
      ],
      en: [
        "Your e-mail and your WhatsApp number are used to reach you about your intentions: acknowledgements, an adviser's call-backs, order forms and calls for funds, execution notices. By proving a number with its code you agree to be contacted on WhatsApp for these operations; STOP ends it at any time.",
        "Your identification data and your orders are kept for as long as market regulation and anti-money-laundering rules require. They are neither sold nor transferred. You may ask to consult or correct them at info@purposecapital.africa.",
        "The devices you add (a passkey or a four-digit code) serve only to recognise you on that device; every addition and removal is announced to you on both channels.",
      ],
    },
  },
  {
    id: "reclamation",
    title: { fr: "En cas de désaccord", en: "In case of disagreement" },
    body: {
      fr: [
        "Une réclamation s'adresse d'abord à Purpose Capital (WhatsApp, téléphone, e-mail) ; elle reçoit une réponse écrite. À défaut d'accord, la COSUMAF, autorité de surveillance du marché financier de l'Afrique centrale, peut être saisie.",
        "Le présent texte peut évoluer ; sa date figure en tête. Une nouvelle version vous est présentée à votre connexion suivante.",
      ],
      en: [
        "A complaint goes first to Purpose Capital (WhatsApp, phone, e-mail); it receives a written answer. Failing agreement, COSUMAF, the supervisory authority of the Central African financial market, may be seised.",
        "This text may change; its date appears at the top. A new version is shown to you at your next sign-in.",
      ],
    },
  },
];
