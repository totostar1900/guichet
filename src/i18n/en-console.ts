/**
 * English for the console, the services pages and the nine service states.
 *
 * One rule holds this file together: a service is never described, it is
 * reported. The French says what it does for THIS client right now, and the
 * English must not drift back into brochure register. "Reinvestment — grow
 * your money automatically" is exactly what these lines are not.
 *
 * The three states: « en place » is running, « à activer » is open and never
 * taken, « indisponible » is closed with its reason stated. "Unavailable"
 * never apologises.
 */
export const EN_CONSOLE: Record<string, string> = {
  /* ---------- la porte Google ---------- */
  "Continuer avec Google": "Continue with Google",
  "La connexion par Google n'a pas abouti. Le code par e-mail ci-dessous fonctionne toujours.":
    "Signing in with Google did not go through. The e-mail code below still works.",

  /* ---------- la bande et la console ----------
     « Mon espace », « Dossier complet », « aucune échéance connue »,
     « Analyses », « En savoir plus », « Suivre » et « Déclarer une intention »
     sont déjà traduits ailleurs : une clef répétée écraserait l'autre au
     spread, et celle-ci est la dernière étalée. */
  Services: "Services",
  "Risques et limites": "Risks and limits",
  "Bonjour {p}": "Hello {p}",
  "Dossier à compléter": "File to complete",
  "Ce qui vous attend": "What is waiting for you",
  "une décision possible aujourd'hui": "one decision open today",
  "{n} décisions possibles aujourd'hui": "{n} decisions open today",
  "Vos services": "Your services",
  "{a} en place · {b} à activer": "{a} running · {b} to switch on",
  "Votre portefeuille": "Your portfolio",
  "Le relevé": "The statement",
  Valorisé: "Valued at",
  "{n} lignes à votre nom": "{n} lines in your name",
  "Reçu à ce jour": "Received to date",
  "coupons et remboursements portés au journal": "coupons and redemptions recorded in the ledger",
  "Prochaine échéance": "Next payment due",
  "{m} FCFA attendus": "{m} FCFA expected",
  "Vous ne tenez encore aucune ligne. Les titres et les fonds ouverts se parcourent sans engagement.":
    "You hold no line yet. Securities and open funds can be browsed with no commitment.",
  "Le marché aujourd'hui": "The market today",
  "Aucune séance relue sur l'année écoulée : le marché se remplira à la première.":
    "No session reviewed over the past year: the market will fill in from the first one.",
  "la zone": "the zone",
  "une séance": "a session",

  /* ---------- les trois états et leurs gestes ---------- */
  "en place": "running",
  "à activer": "to switch on",
  indisponible: "unavailable",
  Régler: "Adjust",
  Activer: "Switch on",
  "ils tournent sans vous": "they run without you",
  "ouverts, jamais pris": "open, never taken",
  "et la raison est dite": "and the reason is stated",

  /* ---------- où chaque service se trouve ----------
     « › » n'est pas un séparateur connu du traducteur : chaque chemin porte
     donc sa propre entrée, entière. */
  "Mon espace › Espèces": "My space › Cash",
  "Mon espace › Services": "My space › Services",
  "Mon espace › Portefeuille": "My space › Portfolio",
  "Fonds › une part": "Funds › a unit",
  "Fonds › votre part": "Funds › your unit",
  "Titres › une séance annoncée": "Securities › an announced session",
  "Titres › la séance annoncée": "Securities › the announced session",
  Automatique: "Automatic",

  /* ---------- ce que chaque service dit, avec vos chiffres ---------- */
  "Vos encaissements partent vers {d} dès qu'ils atteignent {m} FCFA.": "Your receipts go to {d} as soon as they reach {m} FCFA.",
  "Dernier versement : {m} FCFA le {d}.": "Last instalment: {m} FCFA on {d}.",
  "{m} FCFA sont disponibles et n'attendent rien : ils repartiraient sur la ligne que vous choisiriez.":
    "{m} FCFA are available and awaiting nothing: they would go back into the line you chose.",
  "Dès qu'un coupon arrivera, il repartirait sur la ligne que vous auriez choisie d'avance.":
    "As soon as a coupon arrives, it would go back into the line you had chosen in advance.",
  "{m} FCFA partent le {j} de chaque mois vers {d}.": "{m} FCFA go on the {j} of each month to {d}.",
  "Un montant, un jour du mois, une destination fixée à la signature.": "An amount, a day of the month, a destination fixed at signing.",
  "{n} lignes inscrites à votre nom au dépositaire.": "{n} lines registered in your name at the depositary.",
  "Dès votre première ligne, elle sera inscrite à votre nom au dépositaire.": "From your first line, it will be registered in your name at the depositary.",
  "Une séance {p} est annoncée le {d} : {q}.": "A {p} session is announced for {d}: {q}.",
  "Le calendrier porte toutes les séances annoncées dès leur publication.": "The calendar carries all the announced sessions as soon as they are published.",
  "Vous pouvez dire à quel taux vous seriez preneur sur la séance du {d}, sans vous engager.":
    "You can say at what rate you would be a buyer in the session of {d}, without committing.",
  "Aucune séance n'est annoncée : un sondage se tient devant une date.": "No session is announced: a survey stands in front of a date.",
  "Il rouvrira dès qu'un Trésor publiera son avis d'annonce.": "It will reopen as soon as a Treasury publishes its announcement notice.",
  "Vous détenez {n} parts de {d}, rachetables.": "You hold {n} units of {d}, redeemable.",
  "Vous ne détenez aucune part de fonds : un passage part d'un rachat.": "You hold no fund units: a switch starts from a redemption.",
  "Il s'ouvrira dès votre première souscription.": "It will open from your first subscription.",
  "Les fonds de la zone sont ouverts à la souscription.": "The funds of the zone are open for subscription.",
  "Aucun fonds n'est ouvert à la souscription en ce moment.": "No fund is open for subscription at the moment.",
  "Vous détenez {n} actions {d}, vendables sur la BVMAC.": "You hold {n} {d} shares, sellable on the BVMAC.",
  "Achat et vente sur la BVMAC, au dernier cours publié et à sa date.": "Buying and selling on the BVMAC, at the last published price and its date.",
  "Quand une intention inverse existe en interne, elle vous est signalée avant toute sortie sur le marché.":
    "When an opposite intention exists in house, you are told before anything goes out to the market.",
  "La maison détecte une intention inverse et vous la signale.": "The firm detects an opposite intention and tells you.",

  /* ---------- ce qui attend une décision ---------- */
  "Sur votre compte": "On your account",
  "Reçus et n'attendant rien. Votre réinvestissement les placera au prochain passage.":
    "Received and awaiting nothing. Your reinvestment will place them on the next run.",
  "Reçus et n'attendant aucune opération. Tant qu'ils dorment, ils ne rapportent rien.":
    "Received and awaiting no operation. While they sit idle, they earn nothing.",
  Replacer: "Reinvest them",
  "Le Trésor {p} a publié son avis d'annonce. Vous pouvez déclarer une intention jusqu'à la veille.":
    "The {p} Treasury has published its announcement notice. You can declare an intention until the day before.",
  "Échu depuis {n} jours": "Due for {n} days",
  "Un flux est échu et n'est pas arrivé. Le desk le réclame à l'émetteur.": "A payment is due and has not arrived. The desk is claiming it from the issuer.",

  /* ---------- la page publique des services ---------- */
  "Les services": "The services",
  "les neuf, avec leur état": "the nine, with their state",
  "les neuf, et leur limite": "the nine, and their limit",
  "Neuf services, et ce que chacun fait exactement": "Nine services, and exactly what each one does",
  "Purpose Capital est société de bourse : elle exécute ce que vous décidez, elle ne décide pas à votre place. Chaque service dit donc ce qu'il fait, et la limite qu'il porte.":
    "Purpose Capital is a brokerage firm: it carries out what you decide, it does not decide for you. So each service states what it does, and the limit it carries.",
  Placer: "Invest",
  "entrer sur le marché, par le primaire ou par la cote": "getting into the market, through the primary market or the exchange",
  "Faire vivre": "Keep it working",
  "ce qui revient ne doit pas dormir": "what comes back must not sit idle",
  Tenir: "Hold",
  "savoir ce que vous avez, et ce qu'il a rapporté": "knowing what you hold, and what it has returned",
  "Placement primaire": "Primary placement",
  "Votre demande part au Trésor avec celles des autres, puis l'allocation vous revient à votre nom. Vous voyez le prix servi et ce qu'il rapporte.":
    "Your order goes to the Treasury with everyone else's, then the allocation comes back in your own name. You see the price awarded and what it yields.",
  "Une intention n'est pas une garantie d'allocation : le Trésor sert qui il veut, au prix qu'il retient.":
    "An intention is not a guarantee of allocation: the Treasury serves whom it chooses, at the price it retains.",
  "Souscription et rachat des fonds de la zone, avec la valeur liquidative, ses frais et sa date, comparés honnêtement entre eux.":
    "Subscription and redemption of the funds of the zone, with the net asset value, its fees and its date, compared honestly against each other.",
  "Nous distribuons, nous ne gérons pas : le choix du fonds reste le vôtre.": "We distribute, we do not manage: the choice of fund stays yours.",
  "Courtage sur actions cotées": "Brokerage on listed shares",
  "Achat et vente sur la BVMAC, avec le dernier cours publié, sa date, et le fait qu'une ligne ait traité ou non.":
    "Buying and selling on the BVMAC, with the last published price, its date, and whether a line has traded at all.",
  Réinvestissement: "Reinvestment",
  "Dès qu'un coupon ou un remboursement arrive réellement sur le compte, il repart sur la ligne que vous avez choisie d'avance.":
    "As soon as a coupon or a redemption actually reaches the account, it goes back into the line you chose in advance.",
  "Épargne programmée": "Savings plan",
  "Un montant, un jour du mois, une destination fixée à la signature. La maison exécute sans jamais rien choisir.":
    "An amount, a day of the month, a destination fixed at signing. The firm carries it out without ever choosing anything.",
  "La destination est une ligne précise, pas une catégorie : choisir chaque mois serait de la gestion.":
    "The destination is a specific line, not a category: choosing each month would be portfolio management.",
  "Le rachat et la souscription tenus ensemble, pour que le produit de l'un finance l'autre sans passer par votre banque.":
    "The redemption and the subscription held together, so the proceeds of one fund the other without going through your bank.",
  "Les deux restent deux ordres : le délai de règlement du rachat commande la date d'entrée.":
    "They remain two orders: the redemption's settlement delay governs the entry date.",
  "Vos titres sont inscrits à votre nom au dépositaire. Le relevé porte chaque ligne, son échéancier et ce qui reste à venir.":
    "Your securities are registered in your own name at the depositary. The statement carries every line, its schedule and what is still to come.",
  "Les droits de garde sont calculés et détaillés ligne à ligne avant tout prélèvement.":
    "Custody fees are calculated and detailed line by line before anything is charged.",
  "Sondage avant adjudication": "Survey ahead of an auction",
  "Vous dites ce que vous seriez prêt à payer sur une séance à venir. L'émetteur voit une demande chiffrée, jamais un nom.":
    "You say what you would be prepared to pay in a coming session. The issuer sees a demand in figures, never a name.",
  "Un sondage n'engage personne, et ne vous réserve rien.": "A survey commits nobody, and reserves you nothing.",
  "Quand une intention inverse existe en interne, la maison le détecte et vous le signale plutôt que de sortir sur le marché.":
    "When an opposite intention exists in house, the firm detects it and tells you rather than going out to the market.",
  "L'exécution d'un appariement attend une décision de la maison : aujourd'hui, le signal seul.":
    "Executing a match awaits a decision by the firm: for now, the signal only.",
  "La limite.": "The limit.",
  "Ce qui demande un compte": "What requires an account",
  "La frontière n'est pas entre nos produits et nos services. Elle est entre savoir et faire.":
    "The line is not between our products and our services. It is between knowing and doing.",
  "Ouvert à tous": "Open to all",
  "Après connexion": "After signing in",
  "Les titres et les fonds, avec leur fiche complète": "Securities and funds, with their full factsheet",
  "La courbe des taux et l'indice de la BVMAC": "The yield curve and the BVMAC index",
  "Le calendrier des adjudications à venir": "The calendar of coming auctions",
  "Le guide, le glossaire et les parcours": "The guide, the glossary and the walkthroughs",
  "Les actualités et les notes de marché publiques": "The news and the public market notes",
  "Passer une intention ou un ordre": "Placing an intention or an order",
  "Le portefeuille, ses positions et ses échéances": "The portfolio, its holdings and its payment dates",
  "Le rapport de performance et les documents": "The performance report and the documents",
  "Le réinvestissement et l'épargne programmée": "Reinvestment and the savings plan",
  "Le journal des espèces et les avis de garde": "The cash ledger and the custody statements",
  "Vos services, avec leur état": "Your services, with their state",
  "Chacun des neuf dit ce qu'il fait pour vous en ce moment, et ce qui se passerait si vous l'activiez.":
    "Each of the nine says what it does for you right now, and what would happen if you switched it on.",
  "Voir mes services": "See my services",

  /* ---------- mes services ---------- */
  "Mes services": "My services",
  "Vos services, et ce qu'ils font en ce moment": "Your services, and what they are doing right now",
  "Chaque ligne dit ce que le service fait pour vous, ou ce qui se passerait si vous l'activiez. Aucune ne décrit un service en général.":
    "Each line says what the service does for you, or what would happen if you switched it on. None describes a service in general.",
  "Et là où le besoin naît": "And where the need arises",
  "Le geste se présente au moment où il sert, sur la ligne concernée. Cette page dit où le retrouver, elle ne le remplace pas.":
    "The action appears at the moment it is useful, on the line concerned. This page says where to find it, it does not replace it.",
  "Un coupon est encaissé": "A coupon is received",
  "La ligne propose de le replacer, ou d'activer le réinvestissement une fois pour toutes":
    "The line offers to reinvest it, or to switch reinvestment on once and for all",
  "sur l'espèce": "on the cash entry",
  "Une séance est annoncée": "A session is announced",
  "Le titre concerné propose de déclarer une intention, ou de répondre au sondage":
    "The security concerned offers to declare an intention, or to answer the survey",
  "sur le titre": "on the security",
  "Une part de fonds est détenue": "A fund unit is held",
  "La ligne propose le passage vers un autre fonds, ou un versement programmé dessus":
    "The line offers a switch to another fund, or a savings plan into it",
  "sur la ligne": "on the line",
  "Une ligne arrive à échéance": "A line reaches maturity",
  "Le portefeuille propose ce qui la remplacerait, à durée et à signature comparables":
    "The portfolio offers what would replace it, at comparable maturity and comparable credit",
  "Votre signature": "Your signature",
  "Le bulletin est prêt. L'ordre part dès qu'il est signé et le virement fait.": "The form is ready. The order goes out as soon as it is signed and the transfer made.",
  "Votre réponse": "Your answer",
  "D'autres conditions vous sont proposées : c'est votre réponse qui change l'ordre.": "Other terms are proposed to you: it is your answer that changes the order.",
  "Signer": "Sign",
  "Aucun flux attendu sur les douze prochains mois.": "No flow expected over the next twelve months.",
  "Flux attendus mois par mois, {n} FCFA au total sur douze mois": "Flows expected month by month, {n} FCFA in all over twelve months",
  "Coupons et remboursements attendus · {n} FCFA sur douze mois": "Coupons and redemptions expected · {n} FCFA over twelve months",
  "Analyse de votre portefeuille": "Analysis of your portfolio",
  "Ce que vous détenez": "What you hold",
  "Le portefeuille": "The portfolio",
  "Ce que ça a rapporté": "What it has returned",
  "L'échéancier": "The schedule",
  "Ce qui vient": "What is coming",
  "Vos opérations": "Your operations",
  "{n} ligne(s) sont hors du dessin, faute de cours publié. Elles ne valent pas zéro : les compter à zéro ferait baisser votre répartition sans raison.": "{n} line(s) are outside the drawing, for want of a published price. They are not worth zero: counting them at zero would lower your breakdown for no reason.",
  "Ce que vos lignes doivent vous verser, mois par mois.": "What your lines are due to pay you, month by month.",
  "Aucun mouvement encore porté au journal.": "No movement carried to the journal yet.",
  "L'analyse de votre portefeuille": "The analysis of your portfolio",
  "Vos relevés, et tout ce qui est tombé de vos opérations : avis d'opéré, bulletins, appels de fonds.": "Your statements, and everything that came out of your operations: confirmations, subscription forms, funding calls.",
  "Éditer un relevé": "Issue a statement",
  "Il se fabrique à la demande, à la date que vous choisissez.": "It is produced on request, at the date you choose.",
  "Vos intentions en cours": "Your orders under way",
  "Vos ordres passés": "Your past orders",
  "Le reste de votre dossier": "The rest of your file",
  "Vos positions": "Your holdings",
  "{n} ligne(s) · {v}": "{n} line(s) · {v}",
  "{n} relevé(s), avis et bulletins": "{n} statement(s), confirmations and forms",
  "{n} ordre(s) servis, réglés ou clos": "{n} order(s) filled, settled or closed",
  "prochain flux le {date}": "next flow on {date}",
  "ce que vous détenez, par famille, à la dernière valeur connue": "what you hold, by family, at the latest known value",
  "Ce rapport mesure ce qui s'est passé, ligne par ligne. Les performances passées ne préjugent pas des performances futures.": "This report measures what happened, line by line. Past performance is no guide to future performance.",
  "Trois choses sont déjà écrites quand l'ordre part : la ligne, que vous avez choisie ; le moment, celui où l'argent arrive ; et le montant, celui que l'émetteur a versé.": "Three things are already written when the order goes out: the line, which you chose; the moment, which is when the money arrives; and the amount, which is what the issuer paid.",
  "Une ligne précise, fixée maintenant : le desk la suivra, telle quelle, le mois venu.": "One precise line, set now: the desk will follow it, as it stands, when the month comes.",
  "Décidé maintenant, par vous : le jour venu, l'ordre part tel que vous l'avez écrit.": "Decided now, by you: on the day, the order goes out exactly as you wrote it.",
  "Versement demandé le {d} pour {m} FCFA. Le desk vire sur le compte déclaré à l'ouverture, et vous recevez un avis.": "Payment requested on {d} for {m} FCFA. The desk transfers to the account declared at opening, and you receive a notice.",
  "Votre demande du {d} n'a pas été suivie : {motif}": "Your request of {d} was not carried out: {motif}",
  "Demander de nouveau": "Request again",
  "Dernier versement : {m} FCFA le {d}. ": "Last payment: {m} FCFA on {d}. ",
  "Ce solde reste ici aussi longtemps que vous le souhaitez.": "This balance stays here as long as you wish.",
  "Me le faire virer": "Have it transferred to me",
  "{m} FCFA seront virés sur le compte déclaré à l'ouverture de votre compte-titres. Le desk recalcule au moment du virement : un coupon qui tombe d'ici là s'y ajoute.": "{m} FCFA will be transferred to the account declared when your securities account was opened. The desk recalculates at the time of transfer: a coupon falling in between is added.",
  "Un mot pour le desk (facultatif)": "A word for the desk (optional)",
  "Demander le versement": "Request the payment",
  "Ces sommes ont pu arriver sur votre compte sans que la maison le voie : si votre compte-titres est tenu ailleurs, vous êtes le seul à le savoir.": "These amounts may have reached your account without the firm seeing it: if your securities account is held elsewhere, you are the only one who knows.",
  "Vous avez dit l'avoir reçue le {j}.": "You said you received it on {j}.",
  "Vous avez dit l'avoir reçue.": "You said you received it.",
  "Vous avez dit n'avoir rien reçu. Le desk relance l'émetteur.": "You said you received nothing. The desk is chasing the issuer.",
  "Vous avez dit avoir reçu {m} FCFA.": "You said you received {m} FCFA.",
  "échue le {j}": "due on {j}",
  "Me reprendre": "Correct myself",
  "Je l'ai reçue": "I received it",
  "Rien reçu": "Received nothing",
  "Un autre montant…": "A different amount…",
  "Somme réellement reçue": "Amount actually received",
  "Vue sur votre compte le": "Seen in your account on",
  "{m} FCFA partent le {j}": "{m} FCFA leave on {j}",
  "votre instruction": "your instruction",
  "Selon votre instruction permanente. Sans réponse de votre part, l'ordre part comme prévu.": "Under your standing instruction. Without a reply from you, the order goes out as planned.",
  "Un mot, si vous voulez (facultatif)": "A word, if you like (optional)",
  "Laisser partir": "Let it go out",
  "Confirmer l'arrêt": "Confirm the stop",
  "Ne faites pas ça": "Don't do this",
  "Modifier crée une nouvelle version. L'ancienne reste dans votre historique avec les ordres qu'elle a produits : c'est ce qui permet de savoir sous quels termes chacun est parti.": "Changing it creates a new version. The old one stays in your history with the orders it produced: that is what makes it possible to know the terms each one went out under.",
  "Replacer à partir de": "Reinvest from",
  "Le jour du mois": "Day of the month",
  "Vers quoi, et dans quelle proportion": "Towards what, and in what proportion",
  "Choisir une destination…": "Choose a destination…",
  "minimum {m}": "minimum {m}",
  "Part en pourcentage": "Share as a percentage",
  "Ajouter une destination": "Add a destination",
  "La clé tient : le total fait 100 %.": "The key holds: the total is 100%.",
  "Enregistrer la nouvelle version": "Save the new version",
  "Masquer les instructions arrêtées": "Hide the stopped instructions",
  "Voir les {n} instructions arrêtées": "Show the {n} stopped instructions",
  "Remplacée": "Replaced",
};
