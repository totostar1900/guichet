/**
 * LA PAGE BEAC, EN ANGLAIS.
 *
 * Une phrase se traduit entière. Le dictionnaire tombe sinon dans son dernier
 * recours, qui coupe sur les espaces et traduit ce qu'il reconnaît : la page
 * a rendu « rate de service » et « pas les douze months » avant que ces clefs
 * n'existent, ce qui est pire que du français, parce que ça a l'air traduit.
 *
 * LES LIBELLÉS PASSÉS PAR UNE VARIABLE SONT ICI AUSSI, et c'est le piège que
 * le cliquet des données surveille : « Niveau », « Barres », « Cumulé » ne
 * paraissent nulle part entre guillemets dans un appel à `t()`, donc le
 * scanner de clefs ne les voit pas. Ils n'en sortent pas moins à l'écran.
 */
export const EN_BEAC: Record<string, string> = {
  /* ---- la page et ses vues ---- */
  "Marché des valeurs du Trésor": "Government securities market",
  "Ce que la BEAC publie sur les six Trésors de la zone : son encours officiel, ses courbes de rendement, le coût de ses ressources et les opérations de chaque semaine.":
    "What the BEAC publishes on the zone's six Treasuries: its official outstanding, its yield curves, the cost of its resources and each week's operations.",
  "Cette vue ne contient que des chiffres de la BEAC : elle peut partir chez un client.": "This view holds BEAC figures only: it can go to a client.",
  "Cette vue contient nos propres relevés : elle ne sort pas de la maison.": "This view holds our own readings: it stays in house.",
  Vue: "View",
  "À publier": "For publication",
  "BEAC contre nous": "BEAC against us",

  /* ---- les réglages ---- */
  Trésors: "Treasuries",
  Période: "Period",
  Courbe: "Curve",
  mois: "months",
  "maturité suivie": "maturity tracked",
  "nos séances": "our sessions",
  Appliquer: "Apply",
  Tout: "All",
  "5 ans": "5 years",
  "3 ans": "3 years",
  "12 mois": "12 months",
  "{n} mois retenus sur {tous}": "{n} months of {tous}",
  "{m} · {n} Trésor(s)": "{m} · {n} Treasury(ies)",
  "aucune dans la période": "none in the period",
  "aucune série BEAC en base": "no BEAC series in the database",

  /* ---- la provenance d'un chiffre ---- */
  "publié par la BEAC": "published by the BEAC",
  "somme des rapports hebdomadaires BEAC": "sum of BEAC weekly reports",
  "dérivé des courbes BEAC": "derived from BEAC curves",
  "notre lecture": "our reading",
  "BEAC et notre lecture": "BEAC and our reading",
  "BEAC et nos relevés": "BEAC and our readings",

  /* ---- les chiffres de tête ---- */
  "Ce que la sélection dit": "What the selection says",
  "Encours au dernier mois connu": "Outstanding at the last known month",
  "depuis {m}": "since {m}",
  "pas de relevé au début": "no reading at the start",
  "De {a} à {b} milliards.": "From {a} to {b} billion.",
  "La période ne contient qu'un relevé, ou aucun.": "The period holds one reading, or none.",
  "taux de service": "fill rate",
  "{r} Mds levés pour {p} mis en adjudication.": "{r} bn raised against {p} put to auction.",
  "souscription moyenne": "average subscription",
  "Sur {n} séance(s) des rapports hebdomadaires.": "Over {n} session(s) from the weekly reports.",
  "coût moyen du bon": "average cost of the bill",
  "Moyenne des {n} Trésor(s) retenu(s), au dernier relevé.": "Average of the {n} Treasury(ies) selected, at the last reading.",
  "expliqués par nos communiqués": "explained by our communiqués",
  "{n} Mds adjugés et non échus. Ne pas publier.": "{n} bn auctioned and not yet matured. Do not publish.",

  /* ---- la fiche d'un Trésor ---- */
  "Une fiche par Trésor": "One card per Treasury",
  "au dernier mois connu de chacun": "at each one's last known month",
  "pas d'encours": "no outstanding",
  Encours: "Outstanding",
  "Part de la sélection": "Share of the selection",
  "Sur la période": "Over the period",
  "Coût du bon": "Cost of the bill",
  "Coût de l'obligation": "Cost of the bond",
  "Pente 10 ans − 1 an": "Slope, 10 years − 1 year",
  Souscription: "Subscription",
  "Taux de service": "Fill rate",
  "Part couverte par nos pièces": "Share covered by our documents",
  "rien à {d}": "nothing at {d}",

  /* ---- l'encours ---- */
  "Encours des valeurs du Trésor": "Government securities outstanding",
  Niveau: "Level",
  Barres: "Bars",
  Variation: "Change",
  Part: "Share",
  "Aucun encours officiel dans cette période.": "No official outstanding in this period.",
  "Les points gardent leur place dans le temps. La BEAC rappelle juin et juillet de chaque année, pas les douze mois : les poser à intervalles égaux ferait croire à une croissance régulière.":
    "Points keep their place in time. The BEAC recalls June and July of each year, not all twelve months: spacing them evenly would suggest steady growth.",
  "D'un relevé au suivant, et non par mois : la BEAC ne publie pas tous les mois, deux points peuvent être distants d'un an et l'écart est alors annuel.":
    "From one reading to the next, not monthly: the BEAC does not publish every month, two points can be a year apart and the change is then annual.",
  "La part de chaque Trésor dans la sélection, relevé par relevé. La zone est exclue de ce calcul : elle vaudrait cent.":
    "Each Treasury's share of the selection, reading by reading. The zone is left out of this one: it would be a hundred.",

  /* ---- la courbe ---- */
  "Courbes de rendement": "Yield curves",
  "Écart au mois précédent": "Change on the previous month",
  "Aucune feuille lisible pour ce mois et ces Trésors : la BEAC l'a publiée en image, ou pas publiée.":
    "No readable sheet for this month and these Treasuries: the BEAC published it as an image, or not at all.",
  "Pas de mois précédent comparable pour cette sélection.": "No comparable previous month for this selection.",
  "une séance que nous avons lue": "a session we have read",
  "le mois précédent": "the previous month",
  "{m}. Le cercle marque la maturité choisie dans les réglages.": "{m}. The circle marks the maturity chosen in the settings.",
  "L'écart en points de base contre {m}. Seules les maturités présentes les deux mois sont montrées : comparer un point à rien ne mesure rien.":
    "The change in basis points against {m}. Only maturities present in both months are shown: comparing a point to nothing measures nothing.",

  /* ---- le prix du temps ---- */
  "Le prix du temps": "The price of time",
  "Rendement à {d}": "Yield at {d}",
  "Pente, dix ans moins un an": "Slope, ten years minus one year",
  "Pente de la courbe": "Curve slope",
  "Aucune courbe lisible à {d}.": "No readable curve at {d}.",
  "La pente demande le 1 an ET le 10 ans le même mois.": "The slope needs both the 1-year AND the 10-year in the same month.",
  "La pente n'est calculée que si les deux points existent le même mois. Une courbe dit l'état d'un mois ; la pente dit ce que le marché fait payer au temps.":
    "The slope is computed only when both points exist in the same month. A curve states one month; the slope states what the market charges for time.",

  /* ---- la demande ---- */
  "Demandé et obtenu": "Asked and obtained",
  Montants: "Amounts",
  "mis en adjudication": "put to auction",
  levé: "raised",
  "part du montant annoncé qui a été levée": "share of the announced amount that was raised",
  "Aucune émission dans cette période.": "No issue in this period.",
  "L'écart entre les deux est la tension du marché, et il ne se voit nulle part ailleurs : un communiqué de résultats dit ce qui a été servi, il ne dit pas ce qui manquait.":
    "The gap between the two is the market's tension, and it shows nowhere else: a results communiqué states what was allotted, not what was missing.",
  "Cent pour cent veut dire que le Trésor a obtenu tout ce qu'il demandait. En dessous, la demande a manqué ; au-dessus, il a servi plus qu'annoncé, ce qui arrive sur les abondements.":
    "A hundred per cent means the Treasury obtained all it asked for. Below, demand fell short; above, it allotted more than announced, which happens on taps.",
  "Taux de souscription": "Subscription rate",
  "Taux de souscription des séances du mois": "Subscription rate of the month's sessions",
  "Aucun taux de souscription dans cette période.": "No subscription rate in this period.",

  /* ---- le mur ---- */
  "Mur d'échéances": "Maturity wall",
  "Par trimestre": "By quarter",
  Cumulé: "Cumulative",
  "Aucune échéance connue pour cette sélection.": "No known maturity for this selection.",
  "Les trimestres vides sont gardés : un trou dans un mur est une information, et le supprimer ferait croire à un échéancier régulier.":
    "Empty quarters are kept: a hole in a wall is information, and removing it would suggest an even schedule.",
  "Le cumul dit la charge totale que chaque Trésor devra avoir refinancée à une date donnée, sur les lignes dont nous connaissons l'échéance.":
    "The cumulative figure states the total each Treasury will have had to refinance by a given date, on the lines whose maturity we know.",

  /* ---- le coût ---- */
  "Coût moyen des ressources": "Average cost of resources",
  "Bons du Trésor": "Treasury bills",
  "Obligations du Trésor": "Treasury bonds",
  "Aucun coût publié pour cette sélection.": "No cost published for this selection.",
  "Le coût moyen que chaque Trésor a payé, tel que la BEAC le publie. Le bon se paie presque au même prix partout, l'obligation non.":
    "The average cost each Treasury paid, as the BEAC publishes it. The bill costs much the same everywhere, the bond does not.",

  /* ---- la couverture, au desk ---- */
  "Ce que nos pièces expliquent": "What our documents explain",
  Trésor: "Treasury",
  "Encours BEAC": "BEAC outstanding",
  "Nos communiqués": "Our communiqués",
  part: "share",
  "Flux net lu": "Net flow read",
  pièces: "documents",
  Total: "Total",
  "Cette table ne sort pas de la maison.": "This table stays in house.",
  "Elle mesure NOTRE couverture, pas le marché : un client y lirait un encours qui n'est pas l'encours. Trois choses en sortent par construction : les syndications et placements privés, les communiqués retirés du site, et les séances dont le montant servi n'a pas encore été relu chez nous.":
    "It measures OUR coverage, not the market: a client would read an outstanding that is not the outstanding. Three things fall outside it by construction: syndications and private placements, communiqués withdrawn from the site, and sessions whose allotted amount we have not re-read yet.",

  /* ---- la source ---- */
  "Sources : {feuilles} feuilles de courbes, les statistiques mensuelles du marché des valeurs du Trésor et les rapports hebdomadaires, BEAC. {points} points de courbe, {encours} encours officiels, {couts} coûts de ressources, {ops} opérations du Trésor. Chaque pièce est rangée dans la bibliothèque partagée.":
    "Sources: {feuilles} curve sheets, the monthly statistics of the government securities market and the weekly reports, BEAC. {points} curve points, {encours} official outstandings, {couts} resource costs, {ops} Treasury operations. Every document is filed in the shared library.",
/* ---- la santé de l'indice, au desk ---- */
  "Santé de l'indice": "Index health",
  "ce qu'il faut savoir avant de lire une variation": "what to know before reading a change",
  "{m} dans la capitalisation": "{m} in capitalisation",
  "Les trois premiers en pèsent {p}. Sur le flottant coté, le premier tombe à {f}.": "The top three weigh {p}. On the listed float, the first falls to {f}.",
  "des cotations portent un échange": "of quotations carry a trade",
  "{n} cotation(s) négociée(s) sur {tous} lues, en {j} séance(s).": "{n} quotation(s) traded out of {tous} read, over {j} session(s).",
  "de niveaux distincts dans l'indice": "of distinct index levels",
  "{d} valeurs différentes sur {p} séances : le reste reporte le niveau de la veille.": "{d} different values over {p} sessions: the rest carries the previous day's level forward.",
  "rendement du dividende": "dividend yield",
  "Pondéré par la capitalisation, sur {n} valeur(s) sur {tous}. Sur le flottant : {f}.": "Weighted by capitalisation, on {n} share(s) of {tous}. On the float: {f}.",
  "repli maximum": "maximum drawdown",
  "Du sommet du {a} au creux du {b}.": "From the peak of {a} to the trough of {b}.",
  "L'indice n'a pas reculé sur la période lue.": "The index did not fall over the period read.",
  "volatilité mensuelle": "monthly volatility",
  "Écart type des variations d'un mois à l'autre. Au jour le jour, ce chiffre mesurerait l'absence d'échange et non le risque.":
    "Standard deviation of month-on-month changes. Daily, this figure would measure the absence of trading, not risk.",
  "La pondération n'est pas un détail de calcul.": "The weighting is not a computation detail.",
  "La bande ci-dessus montre la capitalisation totale. Sur le flottant coté, les trois premiers pèsent {f} au lieu de {p} : l'indice officiel décrit la taille des sociétés, pas ce qu'un investisseur peut acheter.":
    "The band above shows total capitalisation. On the listed float the top three weigh {f} instead of {p}: the official index describes company size, not what an investor can buy.",
  "Trois mesures manquent, et deux ne peuvent pas exister ici.": "Three measures are missing, and two cannot exist here.",
  "Le ratio cours sur bénéfice attend la lecture des états financiers des émetteurs : la colonne du bénéfice par action est vide sur toutes les lignes du bulletin. Un indice de volatilité implicite est impossible faute de marché d'options dans la zone, et l'écart de réplication n'a pas d'objet tant qu'aucun fonds ne réplique l'indice.":
    "The price-to-earnings ratio awaits the reading of issuers' financial statements: the earnings-per-share column is empty on every line of the bulletin. An implied volatility index is impossible without an options market in the zone, and tracking error has no object as long as no fund replicates the index.",
  "Une mesure manque, et deux ne peuvent pas exister ici.": "One measure is missing, and two cannot exist here.",
  "rendu dividendes compris": "return with dividends",
  "Contre {p} pour le prix seul, sur {n} détachement(s) lus. L'indice officiel ignore ce que les sociétés versent.":
    "Against {p} for price alone, over {n} detachment(s) read. The official index ignores what companies pay out.",
  "Valeur": "Share",
  "Bêta mensuel": "Monthly beta",
  "Mois comparés": "Months compared",
  "Mois où elle bouge": "Months it moves",
  "Hausses": "Rises",
  "Baisses": "Falls",
  "Un bêta proche de zéro peut être de l'immobilité, pas de la stabilité.": "A beta near zero can be stillness, not stability.",
  "Il est calculé au pas mensuel, parce qu'au jour le jour une valeur qui ne s'échange pas rendrait zéro et dirait l'inverse de la vérité. La colonne des mois où le cours bouge dit si le chiffre veut dire quelque chose.":
    "It is computed monthly, because daily a share that does not trade would return zero and state the opposite of the truth. The column of months where the price moves says whether the figure means anything.",
};
