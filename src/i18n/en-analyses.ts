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
  "Au {d}": "At {d}",
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
  "{n} j, écart daté": "{n} d, dated gap",
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
  "{n} j": "{n} d",
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
  "{n} points · le plus ancien à {j} j": "{n} points · oldest at {j} d",
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
  "{n} composantes sur {m} n'avaient pas traité depuis plus de {s} jours : {liste}. L'indice n'est pas faux, il est calculé sur des cours qui datent, et c'est cette phrase qui doit accompagner le niveau publié.":
    "{n} components out of {m} had not traded for more than {s} days: {liste}. The index is not wrong, it is computed on stale prices, and this is the sentence that must accompany the published level.",
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
  "à vérifier": "to check",
  "Un champ est entré après la confirmation : le plus souvent le coupon, relevé par le robot. Rouvrez la séance et vérifiez-le sur la pièce.": "A field arrived after the confirmation: most often the coupon, picked up by the robot. Reopen the session and check it against the document.",
  "{n} points portent un champ entré après la confirmation de leur séance, le plus souvent le coupon relevé par le robot une fois la colonne créée. Le rendement compte, et la personne qui a signé la séance ne l'a pas vu : rouvrez-la et vérifiez ce chiffre sur la pièce.": "{n} points carry a field entered after their session was confirmed, most often the coupon picked up by the robot once the column existed. The yield counts, and the person who signed the session did not see it: reopen it and check that figure against the document.",
};
