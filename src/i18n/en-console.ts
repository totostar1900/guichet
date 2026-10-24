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
     « Dossier complet », « aucune échéance connue », « Analyses »,
     « En savoir plus », « Suivre » et « Déclarer une intention »
     sont déjà traduits ailleurs : une clef répétée écraserait l'autre au
     spread, et celle-ci est la dernière étalée. */
  Services: "Services",
  "Risques et limites": "Risks and limits",
  "Bonjour {p}": "Hello {p}",
  "Dossier à compléter": "File to complete",
  "Ce qui vous attend": "What is waiting for you",
  /* La bande des sièges s'arrête à deux et nomme le reste. Le singulier passe
     par un ternaire, que le scanner de clefs ne voit pas : il s'écrit donc
     ici à la main, comme « Changer » et « Ajouter » avant lui. */
  "et une autre": "and one more",
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

  /* CE QUE LE PROCHAIN FLUX EST (24 octobre 2026). La case des faits donne
     la date ; cette phrase dit ce qui tombe, de combien, et sur quelle ligne
     — trois choses que la page calculait et jetait. « {q} » est le libellé du
     flux, traduit de son côté : Coupon, Coupon + capital, Remboursement. */
  "{q} de {m} FCFA sur {l}.": "{q} of {m} FCFA on {l}.",

  /* ---------- ce qui attend une décision ---------- */
  "Sur votre compte": "On your account",
  "Votre réinvestissement les placera.": "Your reinvestment will place them.",
  "Ils ne rapportent rien tant qu'ils dorment.": "They earn nothing while they sit idle.",
  Replacer: "Reinvest them",
  "Trésor {p} : intention jusqu'à la veille.": "{p} Treasury: intention until the day before.",
  "Échu depuis {n} jours": "Due for {n} days",
  "Le desk le réclame à l'émetteur.": "The desk is claiming it from the issuer.",

  /* LE MARCHÉ SUR LA PAGE D'ARRIVÉE (24 octobre 2026). « La place » plutôt
     que « Le marché » pour le lien : le titre de la section le dit déjà, et
     deux fois le même mot à trente pixels se lit comme un bégaiement. */
  "La place": "The exchange",

  /* CE QUI PERFORME, SUR LA PAGE D'ARRIVÉE (24 octobre 2026). La fenêtre est
     dans la phrase et non en note : un pourcentage sans sa période se lit
     comme celui du jour, et c'est le chiffre qui n'existe pas sur cette cote.
     Les deux côtés vides se nomment : sur cette place, un mois entier sans
     une seule baisse arrive, et un onglet qui s'ouvre sur rien se lit comme
     une panne. */
  "Ce qui performe": "What has moved",
  "Du {a} au {b}, d'une séance à l'autre.": "From {a} to {b}, session to session.",
  "Sens du classement": "Ranking direction",
  "Aucune ligne n'a reculé sur la période.": "No line fell over the period.",
  "Aucune ligne n'a monté sur la période.": "No line rose over the period.",

  /* ---------- la page publique des services ---------- */
  "Les services": "The services",
  "les neuf, avec leur état": "the nine, with their state",
  "Purpose Capital est société de bourse : elle exécute ce que vous décidez, elle ne décide pas à votre place. Chaque service dit donc ce qu'il fait, et la limite qu'il porte.":
    "Purpose Capital is a brokerage firm: it carries out what you decide, it does not decide for you. So each service states what it does, and the limit it carries.",
  "Adjudications et émissions": "Auctions and new issues",
  "Votre demande part au Trésor avec celles des autres, puis l'allocation vous revient à votre nom. Vous voyez le prix servi et ce qu'il rapporte.":
    "Your order goes to the Treasury with everyone else's, then the allocation comes back in your own name. You see the price awarded and what it yields.",
  "Une intention n'est pas une garantie d'allocation : le Trésor sert qui il veut, au prix qu'il retient.":
    "An intention is not a guarantee of allocation: the Treasury serves whom it chooses, at the price it retains.",
  "Souscription et rachat des fonds de la zone, avec la valeur liquidative, ses frais et sa date, comparés honnêtement entre eux.":
    "Subscription and redemption of the funds of the zone, with the net asset value, its fees and its date, compared honestly against each other.",
  "Nous distribuons, nous ne gérons pas : le choix du fonds reste le vôtre.": "We distribute, we do not manage: the choice of fund stays yours.",
  "Acheter et vendre en bourse": "Buy and sell on the exchange",
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
  "Se dire preneur avant une adjudication": "Say you would be a taker, ahead of an auction",
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
  /* Le dossier d'ouverture, en tête de ce qui attend le lecteur. Ces clefs
     arrivent par `a.quoi.key`, donc le scanner des clefs ne les voit pas : il
     cherche des littéraux dans t(), et celles-ci passent par une variable. */
  "Dernière étape de l'ouverture": "Last step of the account opening",
  "Dossier approuvé. Le compte s'ouvre ensuite.": "File approved. The account opens next.",
  "Accepter ma convention": "Accept my agreement",
  "Le desk attend vos pièces": "The desk is waiting for your documents",
  "L'examen reprend dès vos pièces déposées.": "The review resumes once your documents are filed.",
  "La sélection du desk": "The desk's selection",
  /* Le gros caractère de chaque ligne de la bande. Il passait tel quel : trois
     rangées ont suffi à montrer « 1 ordre » en français au milieu d'une page
     anglaise. Un montant et le libellé d'une séance restent des données et ne
     sont pas ici. */
  /* La reprise de la convention (version du 9 octobre 2026 : le mandat
     d'ouverture). Clefs invisibles au scanner : les unes passent par un
     ternaire dans t(), les autres par `a.quoi.key`. */
  "Approuvé : convention à reprendre": "Approved: agreement to confirm again",
  "Votre convention a changé": "Your agreement has changed",
  "La convention a changé sur un point qui vous engage : vous nous donnez désormais mandat d'ouvrir en votre nom les comptes nécessaires à vos ordres, et vous ne signerez plus rien pour cela. Relisez-la, puis reprenez-la par un code à usage unique, ci-dessous. Vos positions et votre compte ne changent pas.":
    "The agreement has changed on a point that binds you: you now give us a mandate to open, in your name, the accounts your orders need, and you will sign nothing else for that. Read it again, then confirm it with a one-time code below. Your positions and your account do not change.",
  "La convention a changé": "The agreement has changed",
  "Le mandat d'ouverture a changé, pas vos lignes.": "The opening mandate has changed, your holdings have not.",
  "Reprendre ma convention": "Confirm my agreement again",
  /* Le récapitulatif d'un ordre sur titre : la quantité est ferme, c'est la
     dépense qui flotte, d'où la borne « au plus ». */
  /* La provision qui règle l'ordre : plus de second geste. */
  "Réglé sur votre provision": "Settled from your provision",
  "{m} FCFA réservés, rien à virer": "{m} FCFA set aside, nothing to transfer",
  "puis la centralisation": "then the centralisation",
  "Cette somme est mise de côté sur votre solde : elle n'en sort qu'au règlement de l'opération. Ce qui n'est pas consommé y revient.":
    "This sum is set aside on your balance: it leaves only when the operation settles. Whatever is not used comes back to it.",
  "Votre solde disponible couvre cet ordre : à la signature, la somme sera mise de côté et vous n'aurez rien à virer.":
    "Your available balance covers this order: on signature the sum will be set aside and you will have nothing to transfer.",
  /* La page de la provision : son domicile, le 9 octobre 2026. */
  /* « Your provision » se lit comme une clause de contrat en anglais ; ce
     dont il s'agit est une réserve de liquidités chez le courtier. */
  "Votre provision": "Your cash reserve",
  "Total": "Total",
  "Bénéficiaire": "Beneficiary",
  "Banque du bénéficiaire": "Beneficiary's bank",
  "Votre argent chez nous": "Your money with us",
  "Ce que vous laissez ici règle vos ordres sans attendre un virement. Elle n'est jamais obligatoire : vous pouvez payer chaque ordre au coup par coup. Elle reste votre argent, sur un compte séparé de celui de la maison.":
    "What you leave here settles your orders without waiting for a transfer. It is never compulsory: you may pay for each order one at a time. It remains your money, on an account separate from the firm's.",
  "FCFA, pour votre prochain ordre": "FCFA, for your next order",
  "Mis de côté": "Set aside",
  "par vos ordres signés": "by your signed orders",
  "ce que la maison vous doit": "what the firm owes you",
  "Ce qui est mis de côté, et pour quoi": "What is set aside, and for what",
  "Cette somme reste sur votre solde : elle n'en sort qu'au règlement de l'opération, et ce qui n'est pas consommé y revient.":
    "This sum stays on your balance: it leaves only when the operation settles, and whatever is not used comes back to it.",
  "L'alimenter": "Funding it",
  "Virez depuis un compte à votre nom, en portant ce motif. C'est lui qui rattache votre virement à votre compte : sans lui, il arrive sans nom.":
    "Transfer from an account in your name, quoting this reference. It is what attaches your transfer to your account: without it, the money arrives with no name.",
  "Motif du virement": "Transfer reference",
  "RIB / IBAN": "Bank details / IBAN",
  "Le reprendre": "Taking it back",
  "Votre solde disponible vous est versé sur demande, sur le compte bancaire déclaré à l'ouverture et sur lui seul. Il part dans les soixante-douze heures ouvrables qui suivent votre demande.":
    "Your available balance is paid out on request, to the bank account declared at opening and to that account only. It leaves within seventy-two working hours of your request.",
  "Le faire travailler": "Putting it to work",
  "Votre provision vous appartient et attend vos ordres. Pour qu'elle ne dorme pas, vous pouvez en placer tout ou partie en parts d'un fonds monétaire, inscrites à votre nom. Le rendement est celui du fonds ; nous n'en promettons aucun.":
    "Your provision is yours and it waits for your orders. So that it does not lie idle, you may place all or part of it in money market fund units registered in your name. The return is the fund's; we promise none.",
  "Placer {m} FCFA": "Place {m} FCFA",
  "Rien de disponible à placer pour l'instant.": "Nothing available to place for now.",
  "Une fois placée, la somme n'est plus disponible pour régler un ordre : il faut d'abord racheter les parts, ce qui prend le délai de centralisation du fonds.":
    "Once placed, the sum is no longer available to settle an order: the units must first be redeemed, which takes the fund's centralisation period.",
  "Vous réglez": "You settle",
  "au plus le plafond, avec la référence de l'ordre": "at most the ceiling, quoting the order's reference",
  "Le desk transmet": "The desk transmits",
  "au marché, puis le résultat": "to the market, then the result",
  "Vous ne payez jamais plus que le plafond. Servi en partie, vous ne payez que votre part ; non servi, tout vous revient, et le solde part sous 72 heures ouvrables si vous le demandez.":
    "You never pay more than the ceiling. Served in part, you pay only your share; not served, it all comes back to you, and the balance leaves within 72 working hours if you ask for it.",
  "Quantité demandée": "Quantity asked for",
  "Au prix maximum de": "At a maximum price of",
  "dont commission {p} %": "of which commission {p} %",
  "Vous engagez au plus": "You commit at most",
  "C'est ce plafond que vous signez, et rien au-delà. Si le prix servi est meilleur, vous payez moins ; s'il dépasse, l'ordre n'est pas exécuté pour vous. Vous pouvez aussi n'être servi qu'en partie : vous ne payez alors que ce qui vous revient.":
    "This ceiling is what you sign, and nothing beyond it. If the price served is better, you pay less; if it goes above, the order is not executed for you. You may also be served only in part: you then pay only for what you get.",
  "1 ordre": "1 order",
  "{n} ordres": "{n} orders",
  "1 proposition": "1 proposal",
  "{n} propositions": "{n} proposals",
  "Votre signature": "Your signature",
  "Il part une fois signé et le virement fait.": "It goes out once signed and the transfer made.",
  "Votre réponse": "Your answer",
  "D'autres conditions : votre réponse décide.": "Other terms: your answer decides.",
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
  /* Les tuiles du relevé n'annoncent plus de nombre : elles disent ce qu'on
     trouve de l'autre côté. Voir Releve.tsx, 24 octobre 2026. */
  "la répartition, et ce que chaque ligne vaut": "the breakdown, and what each line is worth",
  "relevés, avis d'opéré et bulletins": "statements, contract notes and order forms",
  "ce que votre argent a fait, mouvement par mouvement": "what your money did, movement by movement",
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
  "Arrêter cet ordre": "Stop this order",
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
  "Annulé, ou l'appareil n'a pas reconnu le doigt. Réessayez, ou signez avec un code reçu.":
    "Cancelled, or the device did not recognise the finger. Try again, or sign with a code you receive.",
  "Clé indisponible : {m}":
    "Key unavailable: {m}",
  "Signer avec ma clé d'accès":
    "Sign with my passkey",
  "Signer, et c'est tout":
    "Sign, and that is all",
  "Signer sans attendre un code":
    "Sign without waiting for a code",
  "Cet ordre est couvert par votre provision : une fois signé, il n'y a rien à virer.":
    "This order is covered by your provision: once signed, there is nothing to transfer.",
  "Signer avec Face ID, empreinte ou code du téléphone":
    "Sign with Face ID, fingerprint or the phone code",
  "Ou signez avec un code reçu, ci-dessous.":
    "Or sign with a code you receive, below.",
  "clé d'accès": "passkey",
  "code de l'appareil": "the device's code",
  "Avant de placer, comprendre":
    "Before placing, understanding",
  "Ceux-là ne se prennent pas, ils se lisent : la courbe des taux de la zone, l'indice de la BVMAC et ses notes, les fiches des émetteurs, les leçons.":
    "These are not taken up, they are read: the zone's yield curve, the BVMAC index and its notes, the issuer sheets, the lessons.",
  "Les émetteurs":
    "The issuers",
  "Les leçons":
    "The lessons",
  "Placer":
    "Placing",
  "Programmer":
    "Scheduling",
  "Tenir":
    "Holding",
  "Où va mon argent, cette fois-ci.":
    "Where my money goes, this time.",
  "Le faire sans y penser, chaque mois.":
    "Doing it without thinking, every month.",
  "Garder, suivre, et pouvoir le prouver.":
    "Keeping, following, and being able to prove it.",
  "{m} FCFA vous attendent et règlent votre prochain ordre sans virement.":
    "{m} FCFA are waiting for you and settle your next order without a transfer.",
  "Ce que vous laissez chez nous règle vos ordres sans attendre un virement, et repart sur demande.":
    "What you leave with us settles your orders without waiting for a transfer, and goes back on request.",
  "Prélèvement automatique":
    "Direct debit",
  "Vous nous autorisez à prélever une somme sur votre compte, à une date fixe, sous un plafond que vous fixez.":
    "You authorise us to debit a sum from your account, on a fixed date, under a ceiling you set.",
  "Virer la somme en citant la référence qui figure sur votre page : c'est elle qui l'attache à votre compte.":
    "Transfer the sum quoting the reference shown on your page: it is what attaches it to your account.",
  "Elle attend, et elle reste la vôtre : rien ne vous oblige à l'employer.":
    "It waits, and it stays yours: nothing obliges you to use it.",
  "Au prochain ordre couvert, rien n'est à virer ; le reste repart sur demande, sous 72 heures ouvrables.":
    "On the next covered order, there is nothing to transfer; the rest goes back on request, within 72 working hours.",
  "Dire ce qu'il alimente, le montant, le jour du mois et le plafond que vous ne voulez pas dépasser.":
    "Say what it funds, the amount, the day of the month and the ceiling you do not want to exceed.",
  "Signer le mandat une fois, par un code reçu.":
    "Sign the mandate once, with a code you receive.",
  "Chaque prélèvement est annoncé cinq jours avant, et le mandat se révoque à tout moment, sans motif.":
    "Every debit is announced five days ahead, and the mandate can be revoked at any time, without a reason.",

  /* Le sommaire du dossier, et les trois pages qui en sortent — le 24 octobre
     2026, quand les sections dépliées de l'accueil sont devenues des pages. */
  "Votre dossier": "Your file",
  "Vos intentions": "Your orders",
  "Où en est chaque ordre, et ce qu'il attend de vous": "Where each order stands, and what it needs from you",
  "Ce qui part chaque mois, et comment le changer": "What leaves each month, and how to change it",
  "Ce que la conservation a coûté, avis par avis": "What custody has cost, notice by notice",
  "Ce que vous surveillez sans le détenir": "What you watch without holding it",
  "Vos opérations et l'échéancier": "Your operations and the schedule",
  "Ce que votre argent a fait, et ce qui vient": "What your money has done, and what is coming",
  "Relevés, avis d'opéré et bulletins": "Statements, contract notes and subscription forms",
  "Ce que Guichet peut faire pour vous": "What Guichet can do for you",

  "Chaque ordre que vous avez dit, et où il en est. Un ordre en cours dit ce qu'il attend ; un ordre clos garde sa date et sa référence.":
    "Every order you have placed, and where it stands. An order under way says what it is waiting for; a closed order keeps its date and its reference.",
  "Passées": "Closed",
  "Rien de clos pour l'instant.": "Nothing closed yet.",

  "Ce que la conservation de vos titres a coûté. Chaque avis s'ouvre ligne à ligne : c'est ce qui permet de le vérifier plutôt que de le subir.":
    "What the custody of your securities has cost. Each notice opens line by line: that is what lets you check it rather than simply bear it.",
  "Aucun avis de droits de garde pour l'instant.": "No custody fee notice yet.",
  "Ce que la garde coûtera : l'annexe tarifaire": "What custody will cost: the fee schedule",

  "Ce que vous surveillez sans le détenir. Un message vous prévient à chaque changement de cours, de prix ou de statut.":
    "What you watch without holding it. A message warns you of every change of price, quote or status.",
  "Vous ne suivez aucune ligne pour l'instant.": "You are not following any line yet.",
  "Parcourir les titres": "Browse the securities",

  /* La provision, le 24 octobre 2026 : un geste, une page. */
  "Alimenter votre provision": "Add to your settlement balance",
  "Placer votre provision": "Put your settlement balance to work",
  "Reprendre votre provision": "Withdraw your settlement balance",
  "Alimenter": "Add",
  "Faire entrer ou sortir de l'argent": "Move money in or out",
  "Deux chemins. Un virement quand vous voulez, ou une somme fixe chaque mois, sans y penser.":
    "Two ways in. A transfer whenever you like, or a fixed sum every month, without thinking about it.",
  "Par vos ordres signés. Vous n'avez rien à virer : le montant est retenu ici à la signature, et ce qui n'est pas consommé revient le jour où le résultat est connu.":
    "By the orders you have signed. You have nothing to transfer: the amount is held here on signature, and whatever is not used comes back the day the outcome is known.",
  "En parts d'un fonds monétaire, inscrites à votre nom": "In units of a money-market fund, registered in your name",
  "En parts d'un fonds monétaire, inscrites à votre nom. Le rendement est celui du fonds ; nous n'en promettons aucun.":
    "In units of a money-market fund, registered in your name. The return is the fund's; we promise none.",
  "Chaque mouvement au journal, à sa date de valeur": "Every movement in the journal, at its value date",
  "Rien : ni la tenue, ni le virement de retour": "Nothing: neither holding it, nor the transfer back",
  "Versée sur le compte déclaré à l'ouverture, et sur lui seul, sous 72 heures ouvrables.":
    "Paid to the account declared when you opened, and to it alone, within 72 working hours.",
  "vers {c}, le compte déclaré à l'ouverture": "to {c}, the account declared when you opened",
  "vers le compte bancaire déclaré à l'ouverture": "to the bank account declared when you opened",
  "Aucun fonds monétaire n'est ouvert à la souscription pour l'instant.": "No money-market fund is open for subscription at the moment.",
  "Rien à reprendre pour l'instant : votre disponible est à zéro.": "Nothing to withdraw for now: your available balance is zero.",
};
