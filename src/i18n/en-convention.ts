/**
 * LA PAGE DE LA CONVENTION (9 octobre 2026).
 *
 * Son fichier, comme l'annexe tarifaire ou les prélèvements : ce sont les
 * phrases d'un contrat, et elles se relisent ensemble. Les mots d'ici valent
 * engagement, une traduction approximative n'y est pas une approximation.
 *
 * TROIS BLOCS QUE LE SCANNER DE CLEFS NE VOIT PAS, et qui doivent donc être
 * tenus à la main (cliquet : src/test/page-convention.test.ts) :
 *   · les intitulés des dix articles, qui viennent du catalogue des passages
 *     et passent par t(variable) ;
 *   · la phrase de CONVENTION_CHANGE, qui vient de src/data/legal.ts ;
 *   · les quatre états de la carte et les quatre libellés de son bouton,
 *     écrits dans un ternaire que le scanner ne lit pas.
 */
export const EN_CONVENTION: Record<string, string> = {
  /* ---- la page ---- */
  "Convention de compte-titres": "Securities account agreement",
  "C'est le contrat entre vous et Purpose Capital. Il dit ce que vous nous confiez, et ce que nous vous devons en retour. Rien d'autre ne se passe sur cette page.":
    "This is the contract between you and Purpose Capital. It says what you entrust to us, and what we owe you in return. Nothing else happens on this page.",

  /* ---- les deux temps ---- */
  "Votre dossier est approuvé": "Your file is approved",
  "Votre dossier est à l'examen": "Your file is under review",
  "le desk a statué": "the desk has decided",
  "la convention s'ouvre à la décision": "the agreement opens at the decision",
  Lire: "Read",
  "L'essentiel, puis le texte complet": "The essentials, then the full text",
  "Par un code reçu, une fois": "By a code you receive, once",
  "c'est fait": "done",

  /* ---- la balance ---- */
  "L'essentiel, en deux colonnes": "The essentials, in two columns",
  "Une convention est un échange. Ces deux colonnes le disent dans l'ordre où il vous concerne.": "An agreement is an exchange. These two columns say it in the order that concerns you.",
  "Ce que vous nous donnez": "What you give us",
  "Trois choses, et rien de plus": "Three things, and nothing more",
  "Ce que nous vous devons": "What we owe you",
  "Cinq engagements": "Five commitments",
  "une ligne a changé": "one line has changed",

  "Mandat d'ouvrir vos comptes": "A mandate to open your accounts",
  "Vous nous autorisez à ouvrir en votre nom les comptes nécessaires à vos ordres. Vous ne signerez rien d'autre pour cela, et l'ouverture est sans frais.":
    "You authorise us to open in your name the accounts needed for your orders. You will sign nothing else for that, and opening is free.",
  "L'origine de vos fonds": "Where your money comes from",
  "L'argent doit venir d'un compte à votre nom. Un versement d'un tiers est refusé et restitué.": "The money must come from an account in your name. A payment from a third party is refused and returned.",
  "Vos données": "Your data",
  "Conservées dix ans après la fin de la relation, comme la lutte contre le blanchiment l'exige. Ni vendues ni cédées.":
    "Kept for ten years after the relationship ends, as anti-money-laundering rules require. Neither sold nor transferred.",

  "Vos titres à votre nom": "Your securities in your name",
  "Dématérialisés, inscrits à votre nom chez le dépositaire. Purpose Capital n'est qu'intermédiaire.": "Dematerialised, registered in your name with the custodian. Purpose Capital is only an intermediary.",
  "L'argent ne précède jamais l'ordre": "Money never precedes the order",
  "Un ordre naît de votre signature. S'il est réglé aussitôt par un moyen authentifié, le reçu vaut signature.":
    "An order arises from your signature. If it is settled at once by an authenticated means, the receipt stands as the signature.",
  "Votre solde, sous 72 heures": "Your balance, within 72 hours",
  "Vous le réclamez quand vous voulez : il part sous 72 heures ouvrables, vers votre compte bancaire et vers lui seul.":
    "You ask for it whenever you want: it leaves within 72 working hours, to your bank account and to that account only.",
  "Un prix connu d'avance": "A price known in advance",
  "Aucun frais d'ouverture.": "No opening fee.",
  "Lire l'annexe tarifaire →": "Read the fee schedule →",
  "Une trace de chaque opération": "A record of every operation",
  "Un avis d'opéré par opération, un relevé de position, et la médiation COSUMAF si rien ne va.": "An execution notice per operation, a position statement, and COSUMAF mediation if nothing works.",

  /* ---- le texte complet ---- */
  "Le texte complet, tel que vous le signez": "The full text, as you sign it",
  "{n} articles": "{n} articles",
  professionnel: "professional",
  "non professionnel": "non-professional",

  /* Les intitulés des dix articles : ils viennent du catalogue des passages,
     donc par t(variable), invisible au scanner. */
  "Article 1 · Objet": "Article 1 · Purpose",
  "Article 2 · Conservation et mandat d'ouverture": "Article 2 · Custody and opening mandate",
  "Article 3 · Espèces": "Article 3 · Cash",
  "Article 4 · Ordres, signature et règlement": "Article 4 · Orders, signature and settlement",
  "Article 5 · Information et catégorisation": "Article 5 · Information and categorisation",
  "Article 6 · Tarifs": "Article 6 · Fees",
  "Article 7 · Communications": "Article 7 · Communications",
  "Article 8 · Données personnelles et LBC/FT": "Article 8 · Personal data and AML/CFT",
  "Article 9 · Procurations et succession": "Article 9 · Powers of attorney and succession",
  "Article 10 · Réclamations, durée, résiliation": "Article 10 · Complaints, term, termination",

  /* ---- la reprise ---- */
  "Ce qui a changé depuis votre signature": "What has changed since you signed",
  "Vos positions et votre compte ne changent pas. Le reste du texte est celui que vous avez déjà lu.": "Your positions and your account do not change. The rest of the text is the one you have already read.",
  /* La phrase de CONVENTION_CHANGE (src/data/legal.ts) : elle se lève à la
     main avec la version, et sa traduction avec elle. */
  "Vous nous donnez désormais mandat d'ouvrir en votre nom les comptes nécessaires à vos ordres : vous ne signerez plus rien pour cela, et l'ouverture reste sans frais.":
    "You now give us a mandate to open in your name the accounts needed for your orders: you will sign nothing more for that, and opening remains free.",

  /* ---- la signature ---- */
  "Reprendre ma convention": "Sign my agreement again",
  "Un code à six chiffres, une fois. Votre exemplaire daté part aussitôt dans vos documents : c'est lui qui fait foi.":
    "A six-digit code, once. Your dated copy goes straight into your documents: that copy is the record.",
  "Je signe ma convention": "I sign my agreement",
  "Je reprends ma convention": "I sign my agreement again",
  "Votre exemplaire daté est dans vos documents : c'est lui qui fait foi.": "Your dated copy is in your documents: that copy is the record.",
  "Voir mon exemplaire": "See my copy",
  "Rien ne se signe avant l'approbation de votre dossier. Vous pouvez lire la convention autant de fois que vous le voulez : le bouton de signature apparaîtra ici dès que le desk aura statué.":
    "Nothing is signed before your file is approved. You may read the agreement as many times as you want: the signing button will appear here as soon as the desk has decided.",
  "Une fois signée, vos ordres sur parts de fonds partent sans autre formalité, et le sous-compte titres s'ouvre de lui-même : c'est le mandat ci-dessus qui nous y autorise.":
    "Once signed, your orders on fund units go out with no further formality, and the securities sub-account opens by itself: the mandate above is what authorises us.",

  /* ---- la carte du dossier d'ouverture (ternaire : invisible au scanner) ---- */
  "Elle est acceptée : votre exemplaire daté est dans vos documents, et vous pouvez la relire quand vous voulez.":
    "It is accepted: your dated copy is in your documents, and you may read it again whenever you want.",
  "Le texte a changé sur un point qui vous engage. Sa page dit lequel, puis vous la reprenez par un code à usage unique.":
    "The text has changed on a point that binds you. Its page says which, then you sign it again with a one-time code.",
  "Dernière étape : elle se lit et se signe sur sa page, par un code à usage unique.": "Last step: it is read and signed on its own page, with a one-time code.",
  "Rien ne se signe avant l'approbation de votre dossier. Vous pouvez la lire dès maintenant, sur sa page.": "Nothing is signed before your file is approved. You may read it right now, on its page.",
  "Relire ma convention": "Read my agreement again",
  "Relire et reprendre ma convention": "Read and sign my agreement again",
  "Lire et signer ma convention": "Read and sign my agreement",
  "Lire la convention": "Read the agreement",

  /* ---- ce que les deux écrans disent d'elle ---- */
  "dès que la décision est prise. La convention vient ensuite, sur sa page.": "as soon as the decision is made. The agreement comes next, on its page.",
  "Le premier est nécessaire pour que nous puissions instruire votre dossier. Le second est libre, et se retire à tout moment. L'acceptation de la convention, elle, vient après l'approbation, et elle a sa propre page.":
    "The first is needed for us to review your file. The second is free, and may be withdrawn at any time. Accepting the agreement comes after approval, and it has a page of its own.",
};
