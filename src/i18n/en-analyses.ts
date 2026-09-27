/**
 * English for the yield curve and the analysis file.
 *
 * Two words carry weight here and are translated with care rather than with a
 * dictionary. « Relue » is a session a person has checked against the
 * document, not merely one that has been read: "reviewed". And « origine »,
 * beside a yield, says whether the Treasury printed the figure or we computed
 * it, which is the one thing a reader cannot recover unaided.
 */
export const EN_ANALYSES: Record<string, string> = {
  /* ---------- navigation ---------- */
  Courbe: "Curve",
  Analyses: "Analyses",

  /* ---------- la courbe ---------- */
  "Courbe des taux de la CEMAC": "CEMAC yield curve",
  "Courbe des taux": "Yield curve",
  "Courbe des rendements souverains de la CEMAC par durée": "CEMAC sovereign yields by tenor",
  "Le coût de l'argent souverain à chaque horizon, construit sur les séances relues. Aucune moyenne entre deux Trésors : l'écart entre deux signatures est ce que la courbe sert à lire.":
    "The cost of sovereign money at each horizon, built on reviewed sessions. Nothing is averaged across Treasuries: the gap between two signatures is what the curve exists to show.",
  "Le dossier d'analyses": "The analysis file",
  Fenêtre: "Window",
  Tracer: "Draw",
  "Trésors tracés": "Treasuries drawn",
  Points: "Points",
  "Séances relues dans la fenêtre": "Reviewed sessions in the window",
  "Sans rendement": "Without a yield",
  "Point le plus ancien": "Oldest point",
  "Le marché au {d}": "The market at {d}",
  "{n} Trésors · fenêtre de {f} jours": "{n} Treasuries · {f}-day window",
  "Pas assez de séances relues dans cette fenêtre pour tracer une courbe : il en faut au moins deux durées pour un même Trésor. Élargissez la fenêtre, ou relisez des séances.":
    "Not enough reviewed sessions in this window to draw a curve: one Treasury needs at least two tenors. Widen the window, or review more sessions.",
  "Un seul point pour {p} : c'est une observation, pas une courbe, et elle n'est pas tracée. Le tableau ci-dessous la porte quand même.":
    "A single point for {p}: that is an observation, not a curve, and it is not drawn. The table below carries it all the same.",
  "Chaque point, et d'où il vient": "Every point, and where it comes from",
  "Un rendement imprimé et un rendement calculé ont la même allure une fois tracés.": "A printed yield and a computed one look the same once drawn.",
  Représentativité: "Representativeness",
  Âge: "Age",
  "Ce qui a été supposé": "What was assumed",
  "L'écart entre Trésors, contre {p}": "The gap between Treasuries, against {p}",
  "Le classement que le marché fait lui-même, à durée égale.": "The ranking the market makes for itself, at equal tenor.",
  "Contre {p}": "Against {p}",
  "Séances distantes de": "Sessions apart by",
  "{n} jours, écart daté": "{n} days, dated gap",
  "Au-delà d'un mois, l'écart est daté et non mesuré.": "Beyond a month the gap is dated, not measured.",
  "Ce qui manque à la courbe": "What the curve is missing",
  "{n} séances relues qui ne donnent pas de point": "{n} reviewed sessions that give no point",
  "Ce qui manque": "What is missing",
  Compléter: "Complete",
  "Un prix d'obligation sans coupon ne donne aucun rendement : le même 95,00 % peut valoir 7 % ou 12 % selon ce que la ligne paie. Le coupon se relève sur le communiqué, et le point apparaît.":
    "A bond price without a coupon gives no yield: the same 95.00 % can be 7 % or 12 % depending on what the line pays. The coupon is on the communiqué, and the point appears.",
  "Méthodologie et procédure": "Method and procedure",
  Méthodologie: "Method",

  /* ---------- l'origine d'un rendement ---------- */
  "imprimé sur le communiqué": "printed on the communiqué",
  "calculé, prix et coupon": "computed, price and coupon",
  "converti, taux précompté": "converted, discount rate",
  "durée absente ou illisible": "tenor missing or unreadable",
  "ni taux moyen pondéré ni taux limite": "neither weighted average nor limit rate",
  "ni prix moyen pondéré ni prix limite": "neither weighted average nor limit price",
  "coupon absent : le prix seul ne donne pas de rendement": "coupon missing: the price alone gives no yield",
  "calcul impossible sur ces valeurs": "computation impossible on these values",
  "séance mince": "thin session",
  "{n} soumissionnaires": "{n} bidders",
  "{n} jours": "{n} days",

  /* ---------- le dossier ---------- */
  "Analyses de marché": "Market analyses",
  "Ce que la maison sait mesurer sur les deux marchés qu'elle suit, et ce que chaque mesure vaut. Rien n'est calculé sur une séance non relue ; ce qui manque est compté plutôt que comblé.":
    "What the house can measure on the two markets it follows, and what each measurement is worth. Nothing is computed on an unreviewed session; what is missing is counted rather than filled in.",
  "Séances d'adjudication": "Auction sessions",
  "Dont relues": "Of which reviewed",
  "Bulletins lus": "Bulletins read",
  "Lignes-séances": "Line-sessions",
  "Trésors sur la courbe": "Treasuries on the curve",
  publiable: "publishable",
  interne: "internal",
  "La courbe souveraine": "The sovereign curve",
  "{n} points · le plus ancien à {j} jours": "{n} points · oldest at {j} days",
  "Ouvrir la courbe": "Open the curve",
  "{n} séances relues ne donnent pas de point, faute de coupon ou de durée": "{n} reviewed sessions give no point, for want of a coupon or a tenor",
  "Pas encore deux durées relues pour un même Trésor sur l'année écoulée.": "Not yet two reviewed tenors for one Treasury over the past year.",

  "La pression de la demande": "Demand pressure",
  "Couverture moyenne": "Average cover",
  "Part servie du soumis": "Share served of bids",
  "le Trésor choisit": "the Treasury chooses",
  équilibre: "balance",
  "le Trésor subit": "the Treasury takes what comes",
  "Les deux colonnes du milieu se lisent ensemble : une couverture qui tombe pendant que la part servie monte vers cent pour cent dit que le Trésor ne trie plus, il prend ce qui se présente.":
    "The two middle columns read together: cover falling while the share served climbs towards a hundred per cent says the Treasury no longer sorts, it takes what comes.",

  "L'exécution du programme d'émission": "Execution of the issuance programme",
  Annoncé: "Announced",

  "La liquidité du marché secondaire": "Secondary market liquidity",
  "Dont une transaction": "Of which a trade",
  "Part traitée": "Traded share",
  "Valeur échangée": "Value traded",
  "Séances muettes": "Mute sessions",
  "Séances cotées": "Sessions quoted",
  Fréquence: "Frequency",
  Valeur: "Value",
  jamais: "never",
  "il y a {n} j": "{n} d ago",
  action: "share",
  obligation: "bond",
  "{n} obligations sur {m} n'ont jamais connu une transaction sur la période : leur cours affiché est un prix de référence reporté, pas un prix de marché.":
    "{n} bonds out of {m} never saw a single trade over the period: their quoted price is a reference price carried forward, not a market price.",

  "La fraîcheur de l'indice": "Index freshness",
  "Niveau au {d}": "Level at {d}",
  "Depuis le {d}": "Since {d}",
  "Composantes traitées ce jour-là": "Components traded that day",
  "Par séance, sur {n}": "Per session, over {n}",
  "Plus longue dormance": "Longest dormancy",
  "Sur {m} composantes du panier, {liste} n'avaient pas traité depuis plus de {s} jours. L'indice n'est pas faux, il est calculé sur des cours qui datent, et c'est cette phrase qui doit accompagner le niveau publié.":
    "Of the {m} components in the basket, {liste} had not traded for more than {s} days. The index is not wrong, it is computed on stale prices, and this is the sentence that must accompany the published level.",
  "Toutes les composantes ont traité dans la semaine : le niveau publié repose sur des cours frais.": "Every component traded within the week: the published level rests on fresh prices.",
  "Le compte se fait en nombre de composantes et non en capitalisation, faute d'une pondération publiée par la bourse. L'approximation va dans le sens de la prudence : une grosse ligne dormante pèse plus que ce compte ne le montre.":
    "The count is in components and not in capitalisation, for want of a weighting published by the exchange. The approximation errs on the safe side: a large dormant line weighs more than this count shows.",

  "Le pont primaire / secondaire": "The primary / secondary bridge",
  Primaire: "Primary",
  "Prix adjugé": "Price auctioned",
  "Ligne cotée": "Listed line",
  "Cours affiché": "Quoted price",
  "L'écart est en points de prix et jamais en rendement : un écart de rendement demanderait le coupon des deux côtés. Une ligne qui n'a jamais traité n'a pas de prix de marché, et l'écart mesure alors la distance entre un prix payé et un prix reporté.":
    "The gap is in price points and never in yield: a yield gap would require the coupon on both sides. A line that never traded has no market price, and the gap then measures the distance between a price paid and a price carried forward.",

  "Avant de publier": "Before publishing",
  "la règle, et non un usage": "the rule, not a habit",
  "Une mesure marquée « interne » ne quitte pas le desk telle quelle : la colonne du panneau dit pourquoi, et la raison se lève par du travail, pas par une décision.":
    "A measurement marked “internal” does not leave the desk as it stands: the panel's column says why, and the reason is lifted by work, not by a decision.",
  "Tout chiffre publié porte sa date d'observation, son nombre de séances et l'origine de ses rendements. Un rendement calculé se présente comme calculé.":
    "Every published figure carries its observation date, its number of sessions and the origin of its yields. A computed yield presents itself as computed.",
  "Un niveau d'indice ne se publie jamais sans sa fraîcheur : la phrase est déjà écrite au panneau correspondant, elle se copie telle quelle.":
    "An index level is never published without its freshness: the sentence is already written on the matching panel and copies as it stands.",
  "Une note qui sort passe par Publications, où elle prend un numéro, une version et une trace au journal.":
    "A note that goes out passes through Publications, where it takes a number, a version and a trace in the journal.",
  "Notes de marché": "Market notes",
  "À vérifier": "To check",
  "Un champ est entré après la confirmation : le plus souvent le coupon, relevé par le robot. Rouvrez la séance et vérifiez-le sur la pièce.": "A field arrived after the confirmation: most often the coupon, picked up by the robot. Reopen the session and check it against the document.",
  "{n} points portent un champ entré après la confirmation de leur séance, le plus souvent le coupon relevé par le robot une fois la colonne créée. Le rendement compte, et la personne qui a signé la séance ne l'a pas vu : rouvrez-la et vérifiez ce chiffre sur la pièce.": "{n} points carry a field entered after their session was confirmed, most often the coupon picked up by the robot once the column existed. The yield counts, and the person who signed the session did not see it: reopen it and check that figure against the document.",
  "Écart de rendement": "Yield spread",
  "Rendement actuariel annuel, en pourcentage, par durée. Un point creux signale une séance mince, servie à un ou deux soumissionnaires ou non couverte : le chiffre est vrai, il n'est pas représentatif.": "Annual yield to maturity, in per cent, by tenor. A hollow point marks a thin session, served to one or two bidders or not covered: the figure is true, it is not representative.",
  "escompte exact/360 sur {j} jours, capitalisation exact/365": "discount on actual/360 over {j} days, compounding on actual/365",
  "coupon annuel de {c} %, capital remboursé in fine": "annual coupon of {c} %, principal repaid at maturity",
  "prix converti depuis {f} F par titre, sur une valeur nominale de {vn} F": "price converted from {f} F per security, on a nominal value of {vn} F",
  "rendement au prix limite, faute du moyen pondéré": "yield at the limit price, for want of the weighted average",
  "Aucune séance ne répond à cette recherche.": "No session matches this search.",
  "Chercher une séance": "Search for a session",
  "Trésor, durée, code…": "Treasury, term, code…",
  "Régler la largeur de la liste": "Set the width of the list",
  "Régler la largeur des champs": "Set the width of the fields",
  "mince": "thin",
  "pays": "Treasury",
  "instrument": "instrument",
  "duree": "term",
  "etat": "state",
  "Le reprix du marché": "How the market repriced",
  "Rendement de chaque durée suivie, dans le temps": "Yield of each followed tenor, over time",
  "Un point creux signale une séance mince. L'abscisse est la date réelle et non le rang : des séances réparties sur sept ans ne sont pas des pas réguliers, et les espacer également ferait croire à une cadence que le marché n'a pas eue.": "A hollow point marks a thin session. The x axis is the real date, not the rank: sessions spread over seven years are not even steps, and spacing them evenly would suggest a cadence the market never had.",
  "Couverture de chaque séance relue": "Cover of each reviewed session",
  "Une barre par séance relue, dans l'ordre chronologique : l'axe compte les séances, il ne mesure pas le temps. Le trait doré est la couverture de un, seuil du service intégral.": "One bar per reviewed session, in date order: the axis counts sessions, it does not measure time. The gold line is a cover of one, the threshold of full allotment.",
  "Niveau de l'indice, séance par séance": "Index level, session by session",
  "Lignes traitées à chaque séance": "Lines traded at each session",
  "En haut le niveau publié, en bas le nombre de lignes qui ont traité ce jour-là. Les barres rouges sont les séances où rien ne s'est échangé sur toute la cote.": "Above, the published level; below, how many lines traded that day. The red bars are the sessions where nothing at all changed hands on the board.",
  "Ce que la table a attrapé": "What the table caught",
  "{n} séances qui se contredisent": "{n} sessions that contradict themselves",
  "Ce qui se contredit": "What contradicts",
  "Ce qu'il faut vérifier sur la pièce": "What to check on the document",
  "déjà confirmée": "already confirmed",
  "Aucun de ces motifs ne dit qu'un chiffre est faux : ils disent qu'il se contredit, lui-même ou son voisin. Ce qui est déjà confirmé passe devant, étant entré dans les références du desk. Une séance à la fois, aucune de ces anomalies ne se voit ; rangées en colonne, les six sautent aux yeux.": "None of these patterns says a figure is wrong: they say it contradicts itself or its neighbour. What is already confirmed comes first, having entered the desk's references. One session at a time, none of these anomalies shows; ranged in a column, all six leap out.",
  "un bon servi à un prix, sans taux": "a bill served at a price, with no rate",
  "une obligation servie à un taux, sans prix": "a bond served at a rate, with no price",
  "séance datée du 1er janvier": "session dated 1 January",
  "l'instrument de la séance, ou la colonne lue": "the session's instrument, or the column read",
  "la colonne d'où vient le chiffre retenu, et celles des deux bornes": "the column the retained figure came from, and those of the two bounds",
  "la date imprimée en tête du communiqué": "the date printed at the head of the communiqué",
  "les deux montants sur la pièce, et leur unité": "both amounts on the document, and their unit",
  "les deux nombres, souvent voisins sur la pièce": "the two numbers, often adjacent on the document",
  "un total de séance recopié sur chaque ligne, plutôt que des lignes réellement identiques": "a session total copied onto every line, rather than lines that are genuinely identical",
};
