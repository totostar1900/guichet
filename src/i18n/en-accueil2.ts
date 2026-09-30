/**
 * English for the public home page and its instrument tape.
 *
 * Register, and it is the whole point of this file: the French is a shop
 * window, not an information document. Every line here sells what the house
 * does, in the client's own second person, with no hedging, no limit stated
 * and no figure promised. The limits live on the Risks and limits page, and
 * the regulatory band stays in the footer.
 *
 * The five verbs keep their full stops in both languages: they are statements,
 * not headings.
 */
export const EN_ACCUEIL2: Record<string, string> = {
  /* ---------- l'aperçu d'une ligne partagée ---------- */
  "Quelqu'un vous a partagé cette ligne. Voici ce qu'elle est.": "Someone shared this line with you. Here is what it is.",
  "Ce qui se lit avec un compte": "What is readable with an account",
  "Échéancier des flux": "Schedule of payments",
  /* Le script des clefs manquantes la comptait « déjà connue » : le résolveur
     trouve un gabarit qui la renvoie en français. Elle s'écrit donc en clair. */
  "Dernier prix servi": "Last price awarded",
  "Le prix, le rendement et l'échéancier sont réservés aux titulaires d'un compte. L'ouverture prend dix minutes, depuis ce téléphone.":
    "The price, the yield and the schedule are reserved for account holders. Opening one takes ten minutes, from this phone.",
  "J'ai déjà un compte": "I already have an account",
  "Adjudication, puis cote BVMAC": "Auction, then the BVMAC exchange",

  /* ---------- la page « Risques et limites » ----------
     Son texte vit dans src/data/risques.ts, bilingue : il n'y a ici que la
     charpente de la page. */
  "Information réglementaire": "Regulatory information",
  "Cette page dit ce que chaque opération engage, ce qu'elle laisse ouvert, et quels risques elle porte. Elle se lit avant d'ouvrir un compte, et elle reste accessible à tout moment.":
    "This page states what each operation commits, what it leaves open, and which risks it carries. It is there to be read before opening an account, and it stays available at any time.",
  "Les sections de cette page": "The sections of this page",
  "Ce qu'il faut retenir": "What to take away",
  "Ce qui relève de vous": "What is yours to decide",
  "Ce qui relève de nous": "What is ours to do",
  "Pour nous écrire": "To write to us",
  "Le Guide · risques et limites": "The Guide · risks and limits",

  /* ---------- les mots dessinés dans la présentation ---------- */
  "actuariel · si servi à 94 %": "actuarial · if awarded at 94 %",
  "ce que rapporte la ligne, par an": "what the line returns, per year",
  "On vous rappelle": "We call you back",

  /* ---------- l'ouverture ---------- */
  "Le marché primaire et la cote, dans un seul compte.": "The primary market and the exchange, in a single account.",
  "Ouvert en quelques minutes. Les occasions du marché de la zone vous arrivent le jour même, et se traitent depuis votre téléphone.":
    "Open in minutes. What comes up on the market of the zone reaches you the same day, and is dealt with from your phone.",
  "Visite guidée · 30 secondes": "Guided tour · 30 seconds",
  "Les Trésors de la zone": "The Treasuries of the zone",
  "Cameroun, Congo, Gabon, Tchad, Guinée équatoriale, Centrafrique": "Cameroon, Congo, Gabon, Chad, Equatorial Guinea, Central African Republic",
  "La cote BVMAC": "The BVMAC exchange",
  "Les obligations et les actions des émetteurs cotés": "The bonds and the shares of the listed issuers",
  "Les fonds de la zone": "The funds of the zone",
  "Souscription et rachat, à la valeur liquidative et à sa date": "Subscription and redemption, at the net asset value and its date",

  /* ---------- la bande d'instruments ---------- */
  "Sur le marché en ce moment": "On the market right now",
  "Les prix, les rendements et le calendrier se lisent une fois connecté.": "Prices, yields and the calendar are readable once you are signed in.",
  ÉMETTEUR: "ISSUER",
  LIGNE: "LINE",
  MARCHÉ: "MARKET",
  "APRÈS CONNEXION": "AFTER SIGNING IN",
  "Chiffre réservé aux titulaires d'un compte": "Figure reserved for account holders",
  "Bon du Trésor": "Treasury bill",
  "{n} semaines": "{n} weeks",
  "Obligation du Trésor": "Treasury bond",
  "Cote BVMAC": "BVMAC exchange",

  /* ---------- les cinq verbes ---------- */
  "Un compte. Tous les marchés de la zone.": "One account. Every market of the zone.",
  "Le primaire, la cote, les fonds. Ce qui se présente vous arrive, et se traite sans quitter l'écran.":
    "The primary market, the exchange, the funds. What comes up reaches you, and is dealt with without leaving the screen.",
  "Souscrire au primaire.": "Bid in the primary market.",
  "Votre demande part au Trésor sur la séance de votre choix, et l'allocation vous revient à votre nom, avec le prix servi.":
    "Your order goes to the Treasury in the session of your choice, and the allocation comes back in your own name, with the price awarded.",
  "Négocier sur la cote.": "Trade on the exchange.",
  "Les obligations et les actions de la BVMAC, au dernier cours publié et à sa date, avec les états financiers de l'émetteur à côté.":
    "The bonds and the shares of the BVMAC, at the last published price and its date, with the issuer's financial statements beside them.",
  "Placer en fonds.": "Invest through funds.",
  "Les fonds de la zone, leur valeur liquidative, leurs frais et leur date, comparés sur une même page.":
    "The funds of the zone, their net asset value, their fees and their date, compared on a single page.",
  "Épargner sans y penser.": "Save without thinking about it.",
  "Un montant, un jour du mois, une destination fixée à la signature. Ce qui revient repart sur la ligne choisie d'avance.":
    "An amount, a day of the month, a destination fixed at signing. What comes back goes out again into the line chosen in advance.",
  "Suivre le marché.": "Follow the market.",
  "La courbe de la zone, l'indice de la BVMAC, les séances à venir et les publications du desk.":
    "The curve of the zone, the BVMAC index, the coming sessions and the desk's publications.",

  /* ---------- analyses et publications ---------- */
  "Analyses et publications": "Analysis and publications",
  "Le marché, lu et commenté.": "The market, read and commented on.",
  "Le desk suit le marché de la zone et publie ce qu'il en tire : la courbe des taux, des analyses, des points réguliers. L'ensemble se consulte depuis votre espace.":
    "The desk follows the market of the zone and publishes what it draws from it: the yield curve, analysis, regular updates. All of it is read from your own space.",
  "La forme de la courbe des taux de la zone, sans son échelle": "The shape of the yield curve of the zone, without its scale",
  TAUX: "RATE",
  "échelle après connexion": "scale after signing in",

  /* ---------- le coup d'oeil dedans ---------- */
  "Un coup d'oeil dedans": "A look inside",
  "Votre écran s'ouvre sur ce qui vous attend.": "Your screen opens on what is waiting for you.",
  "Votre console": "Your console",
  "Ce qui attend une décision aujourd'hui, en trois lignes au plus, avec le geste à côté.": "What is waiting for a decision today, in three lines at most, with the action beside it.",
  "Chaque ligne, son échéancier, et ce qui est réellement arrivé sur le compte.": "Every line, its schedule, and what has actually reached the account.",
  "La courbe, l'indice de la BVMAC, et les séances à venir, dès leur annonce.": "The curve, the BVMAC index, and the coming sessions, from the moment they are announced.",
  "Reçus et disponibles. Votre réinvestissement les placera au prochain passage.": "Received and available. Your reinvestment will place them on the next run.",
  "Une séance annoncée": "A session announced",
  "Le Trésor a publié son avis d'annonce. Vous pouvez déclarer une intention jusqu'à la veille.":
    "The Treasury has published its announcement notice. You can declare an intention until the day before.",

  /* ---------- le moment typographique ---------- */
  "Une séance s'annonce. Vous décidez le jour même.": "A session is announced. You decide the same day.",
  "L'avis d'annonce vous parvient dès sa publication, et votre intention part de la même page.":
    "The announcement notice reaches you the moment it is published, and your intention goes out from the same page.",

  /* ---------- ouvrir un compte ---------- */
  "En ligne, et le desk vous rappelle si un document manque.": "Online, and the desk calls you back if a document is missing.",
  "Vous ouvrez": "You open the account",
  "Une pièce d'identité, un justificatif de domicile, et le questionnaire de connaissance. Dix minutes, depuis votre téléphone.":
    "Proof of identity, proof of address, and the knowledge questionnaire. Ten minutes, from your phone.",
  "Vous approvisionnez": "You fund it",
  "Par virement, vers le compte espèces ouvert à votre nom. Le journal porte chaque mouvement, avec sa date de valeur.":
    "By transfer, into the cash account opened in your own name. The ledger carries every movement, with its value date.",
  "Vous déclarez votre première intention": "You declare your first intention",
  "Sur la séance annoncée de votre choix, ou sur une ligne de la cote. Le desk confirme, et vous suivez l'allocation.":
    "In the announced session of your choice, or on a line of the exchange. The desk confirms, and you follow the allocation.",
  "Entrez par où vous voulez.": "Come in whichever way you like.",
  "Par e-mail, par WhatsApp ou avec Google : c'est le même compte, et personne n'a de mot de passe à retenir.":
    "By e-mail, by WhatsApp or with Google: it is the same account, and nobody has a password to remember.",
};
