import { l, type DocPage } from "./types";

/**
 * La courbe des taux, expliquée à qui n'en a jamais construit.
 *
 * Cette page est le brouillon de la lettre de méthodologie. Elle est écrite
 * pour un lecteur qui n'est ni statisticien ni obligataire : un conseiller, un
 * auditeur, un client curieux. Chaque réglage de l'écran y a son paragraphe,
 * parce qu'un réglage qu'on ne comprend pas est un réglage qu'on ne touche pas,
 * et une figure qu'on ne règle pas ment par défaut.
 *
 * Elle reste derrière le desk tant que la maison n'a pas décidé de publier sa
 * méthode. Le jour où elle le décide, il n'y a qu'un mot à changer ici.
 */
export const COURBE: DocPage = {
  slug: "courbe-des-taux",
  title: l("La courbe des taux, expliquée", "The yield curve, explained"),
  summary: l(
    "Ce que la courbe répond, comment elle se construit, ce que chaque réglage de l'écran change, et ce qu'elle ne dit pas.",
    "What the curve answers, how it is built, what each control on the screen changes, and what it does not say.",
  ),
  visibility: "desk",
  audience: ["desk", "client", "admin"],
  order: 5,
  checkedOn: "2026-09-29",
  owner: "Georges",
  chapters: [
    {
      id: "question",
      title: l("La question à laquelle elle répond", "The question it answers"),
      blocks: [
        {
          type: "lead",
          text: l(
            "Une courbe des taux répond à une seule question : combien coûte l'argent, pour chaque durée, aujourd'hui. Prêter six mois et prêter sept ans ne se paient pas pareil, et la courbe est la ligne qui relie tous ces prix.",
            "A yield curve answers one question: what money costs, for each maturity, today. Lending for six months and lending for seven years are not paid alike, and the curve is the line that joins all those prices.",
          ),
        },
        {
          type: "p",
          text: l(
            "Une image simple : c'est un tarif. À gauche les courtes durées, à droite les longues, et pour chacune le prix du jour. Un Trésor qui veut emprunter à cinq ans y lit ce qu'il devra payer ; un investisseur y lit ce qu'il peut espérer ; un gestionnaire s'en sert pour dire ce que vaut aujourd'hui un titre acheté l'an dernier.",
            "A simple image: it is a price list. Short maturities on the left, long ones on the right, and for each the price of the day. A Treasury wanting to borrow at five years reads what it will have to pay; an investor reads what may be expected; a manager uses it to say what a security bought last year is worth today.",
          ),
        },
        {
          type: "note",
          kind: "info",
          text: l(
            "Six États de la CEMAC empruntent au même guichet et aucun ne publie sa courbe. La BEAC en publie une pour trois d'entre eux, une fois par mois, sous forme d'image. La matière existe, elle est publique, et personne ne la met en forme : c'est ce que cet écran fait.",
            "Six CEMAC states borrow at the same window and none publishes its curve. The BEAC publishes one for three of them, once a month, as a picture. The material exists, it is public, and nobody puts it in order: that is what this screen does.",
          ),
        },
      ],
    },
    {
      id: "fabrication",
      title: l("Comment elle se fabrique, en six gestes", "How it is made, in six steps"),
      blocks: [
        {
          type: "flow",
          steps: [
            l("ramasser les séances publiées par la BEAC", "collect the sessions the BEAC publishes"),
            l("relever les chiffres, et les faire signer par une personne", "read the figures, and have a person sign them"),
            l("transformer chaque séance en un point : une durée, un taux", "turn each session into a point: a maturity, a rate"),
            l("n'en garder qu'un par durée, le plus récent", "keep only one per maturity, the most recent"),
            l("faire passer une courbe à travers les points", "pass a curve through the points"),
            l("dire ce qu'elle vaut, ou refuser de la tracer", "say what it is worth, or refuse to draw it"),
          ],
        },
        {
          type: "p",
          text: l(
            "Le deuxième geste est le plus important et c'est le moins technique. Les communiqués de la BEAC sont des images scannées. Une machine les lit et propose les chiffres ; une personne ouvre la pièce, vérifie, et signe. Tant que personne n'a signé, la séance n'entre dans aucun calcul. C'est la seule barrière entre un scan mal lu et un taux cité à un client.",
            "The second step matters most and is the least technical. The BEAC's communiqués are scanned images. A machine reads them and proposes the figures; a person opens the document, checks, and signs. Until someone has signed, the session enters no calculation. It is the only barrier between a misread scan and a rate quoted to a client.",
          ),
        },
        {
          type: "p",
          text: l(
            "Le troisième mérite une explication, parce qu'il surprend. La durée d'un point est ce qu'il RESTE à courir jusqu'au remboursement, et non ce que l'étiquette annonce. Une obligation émise à sept ans qui arrive à terme dans dix-huit mois est un point à dix-huit mois.",
            "The third deserves an explanation, because it surprises. A point's maturity is what is LEFT to run until redemption, not what the label announces. A bond issued at seven years falling due in eighteen months is a point at eighteen months.",
          ),
        },
        {
          type: "note",
          kind: "rule",
          text: l(
            "Pourquoi : un investisseur qui place à dix-huit mois choisit entre un bon neuf à dix-huit mois et cette obligation. Les deux lui rendent son capital le même jour, chez le même État, dans la même monnaie. Ils doivent donc se payer au même taux, sans quoi il achète l'un, vend l'autre et empoche la différence. Deux titres qui doivent se payer au même taux appartiennent au même point de la courbe.",
            "Why: an investor placing money for eighteen months chooses between a fresh eighteen-month bill and this bond. Both return the capital on the same day, from the same state, in the same currency. They must therefore pay the same rate, or one is bought, the other sold, and the difference pocketed. Two securities that must pay the same rate belong to the same point on the curve.",
          ),
        },
        {
          type: "p",
          text: l(
            "Ce n'est pas un cas d'école ici : les Trésors de la zone abondent des lignes anciennes plutôt que d'en ouvrir de nouvelles. Quarante-sept de nos deux cent quarante-neuf séances changent de place quand on les range par leur échéance, jusqu'à sept cent cinquante-neuf points de base.",
            "This is no textbook case here: the zone's Treasuries tap old lines rather than open new ones. Forty-seven of our two hundred and forty-nine sessions move when ordered by their redemption date, by as much as seven hundred and fifty-nine basis points.",
          ),
        },
      ],
    },
    {
      id: "nelson-siegel",
      title: l("Nelson-Siegel : trois formes qu'on superpose", "Nelson-Siegel: three shapes laid over one another"),
      blocks: [
        {
          type: "lead",
          text: l(
            "On a huit points observés et des trous entre eux. Relier les points par des segments ne suffit pas : un segment entre un an et trois ans affirme une droite là où le prix du temps fait une courbe, et à dix ans, où personne n'a adjugé, un segment ne dit rien du tout.",
            "We have eight observed points and gaps between them. Joining them with segments is not enough: a segment between one year and three years asserts a straight line where the price of time makes a curve, and at ten years, where nobody auctioned, a segment says nothing at all.",
          ),
        },
        {
          type: "p",
          text: l(
            "Nelson et Siegel ont remarqué qu'une courbe des taux, n'importe laquelle, se fabrique en superposant trois formes élémentaires. On les additionne, chacune avec son poids, et on obtient à peu près toutes les courbes que les marchés produisent. C'est le principe d'un mélange de peintures : trois couleurs de base, et les proportions font la teinte.",
            "Nelson and Siegel noticed that any yield curve is made by laying three elementary shapes over one another. They are added, each with its weight, and one obtains nearly every curve markets produce. It is the principle of mixing paint: three base colours, and the proportions make the shade.",
          ),
        },
        {
          type: "table",
          head: [l("La forme", "The shape"), l("Ce qu'elle fait", "What it does"), l("Son poids", "Its weight")],
          rows: [
            [l("une ligne plate", "a flat line"), l("la même partout, du jour le jour jusqu'à quinze ans", "the same everywhere, from overnight to fifteen years"), l("β₀, le niveau long", "β₀, the long level")],
            [l("une forme qui part de 1 et s'éteint", "a shape starting at 1 and dying away"), l("forte au court terme, nulle au long", "strong at the short end, nil at the long"), l("β₁, la pente", "β₁, the slope")],
            [l("une bosse", "a hump"), l("nulle aux deux bouts, maximale au milieu", "nil at both ends, largest in the middle"), l("β₂, la courbure", "β₂, the curvature")],
          ],
        },
        {
          type: "list",
          items: [
            l("β₀ tout seul est le taux au long terme, puisque les deux autres formes y sont éteintes.", "β₀ alone is the long-term rate, since the other two shapes have died away there."),
            l("β₀ + β₁ est le taux instantané, puisque la deuxième forme y vaut 1 et la bosse 0.", "β₀ + β₁ is the instantaneous rate, since the second shape equals 1 there and the hump 0."),
            l("β₂ dit si la courbe a un ventre ou un creux au milieu. Nul, elle monte ou descend régulièrement.", "β₂ says whether the curve has a belly or a dip in the middle. Nil, it rises or falls steadily."),
          ],
        },
        {
          type: "p",
          text: l(
            "Il faut un quatrième nombre, λ, qui règle l'échelle de temps : à quelle vitesse la pente s'éteint et où la bosse se place. λ petit, tout se joue dans les premiers mois et la courbe est déjà plate à deux ans. λ grand, la pente s'étire et la bosse se déplace vers le long terme. La bosse culmine vers 1,79 fois λ.",
            "A fourth number is needed, λ, which sets the time scale: how fast the slope dies away and where the hump sits. Small λ, everything happens in the first months and the curve is already flat at two years. Large λ, the slope stretches and the hump moves towards the long end. The hump peaks around 1.79 times λ.",
          ),
        },
        {
          type: "note",
          kind: "info",
          text: l(
            "Lu sur le Cameroun au 29 septembre 2026 : niveau 8,53, pente −1,51, courbure 0,00, λ 2,29. Ce qui se dit ainsi : le Cameroun tend vers 8,53 % au long terme, part de 8,53 − 1,51 = 7,02 % au jour le jour, n'a ni ventre ni creux, et sa montée se joue sur les deux à trois premières années.",
            "Read on Cameroon at 29 September 2026: level 8.53, slope −1.51, curvature 0.00, λ 2.29. Which reads: Cameroon tends towards 8.53 % in the long run, starts at 8.53 − 1.51 = 7.02 % overnight, has neither belly nor dip, and its rise plays out over the first two to three years.",
          ),
        },
        {
          type: "p",
          text: l(
            "Comment on trouve les quatre nombres. Si l'on fixe λ, la courbe devient une simple somme de trois formes connues, et trouver les trois poids revient à résoudre un système de trois équations : un calcul exact, en une fois, sans tâtonnement. On ne tâtonne donc que sur λ, un seul nombre : on en essaie quatre-vingts, on garde celui dont la courbe passe le plus près des points, puis on affine autour. C'est pour cela que l'ajustement ne peut pas partir de travers.",
            "How the four numbers are found. If λ is fixed, the curve becomes a plain sum of three known shapes, and finding the three weights amounts to solving three equations: an exact calculation, in one pass, with no trial and error. Only λ is searched, a single number: eighty are tried, the one whose curve passes closest to the points is kept, then refined around it. That is why the fit cannot go astray.",
          ),
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "Ce qui peut mal tourner. Quand λ devient grand, la forme « pente » et la forme « bosse » se ressemblent de plus en plus : le calcul peut donner à l'une un poids énorme et à l'autre l'inverse, sans que la courbe bouge. Au premier essai sur nos données, le niveau gabonais valait −628 pour cent. La parade vient de la théorie : la bosse doit se placer À L'INTÉRIEUR des durées observées, sinon rien ne la contraint. λ est donc borné par ce que les données peuvent voir.",
            "What can go wrong. As λ grows, the “slope” shape and the “hump” shape look more and more alike: the calculation can give one an enormous weight and the other its opposite, without the curve moving. On the first run over our data, Gabon's level came out at −628 per cent. The remedy comes from the theory: the hump must sit INSIDE the observed maturities, or nothing constrains it. λ is therefore bounded by what the data can see.",
          ),
        },
        {
          type: "p",
          text: l(
            "Une extension existe, dite de Svensson, qui ajoute une deuxième bosse : six nombres au lieu de quatre. Elle décrit mieux les courbes riches, et ne s'identifie pas chez nous : six nombres sur treize durées dont la moitié sous un an, il n'y a pas de quoi les contraindre.",
            "An extension exists, Svensson's, adding a second hump: six numbers instead of four. It describes rich curves better, and does not identify here: six numbers over thirteen maturities, half of them under a year, leaves nothing to constrain them.",
          ),
        },
      ],
    },
    {
      id: "reglages",
      title: l("Les réglages de l'écran, un par un", "The screen's controls, one by one"),
      blocks: [
        {
          type: "lead",
          text: l(
            "Chaque réglage change le sens du chiffre affiché, pas seulement son apparence. Un réglage qu'on ne comprend pas est un réglage qu'on ne touche pas, et une figure qu'on ne règle pas ment par défaut.",
            "Each control changes the meaning of the figure shown, not merely its appearance. A control one does not understand is a control one does not touch, and a figure left unadjusted lies by default.",
          ),
        },
        {
          type: "p",
          text: l(
            "LA PROFONDEUR. Jusqu'où l'on remonte pour ramasser des séances : trois mois, un an, deux ans, cinq ans. Une fenêtre courte ne garde que le frais mais laisse des trous ; une fenêtre longue peuple la courbe mais y mêle des époques. Image : c'est le rayon dans lequel on interroge des témoins. Trois passants qui sortent du magasin, ou trente personnes dont certaines n'y sont pas entrées depuis deux ans.",
            "DEPTH. How far back sessions are collected: three months, one year, two years, five years. A short window keeps only what is fresh but leaves gaps; a long one fills the curve but mixes eras. An image: it is the radius within which witnesses are questioned. Three passers-by leaving the shop, or thirty people some of whom have not been in for two years.",
          ),
        },
        {
          type: "note",
          kind: "info",
          text: l(
            "La figure ouvre sur la fenêtre la plus courte qui montre quelque chose. Mesuré à la date du jour : quatre-vingt-dix jours et un an donnent les mêmes points, la zone ayant peu émis récemment. À une date passée, la fenêtre courte est souvent vide quand la suivante est garnie.",
            "The figure opens on the shortest window that shows something. Measured at today's date: ninety days and one year give the same points, the zone having issued little recently. At a past date, the short window is often empty when the next one is full.",
          ),
        },
        {
          type: "p",
          text: l(
            "OBSERVÉE LE. La date à laquelle on se place. « Aujourd'hui » donne la courbe du jour ; « il y a deux ans » donne celle que le desk aurait tracée à cette date-là, avec les séances connues alors. C'est un acte d'analyse, pas un survol : on regarde si le niveau d'aujourd'hui est haut ou bas par rapport à ce qu'il était. La courbe du jour se pose alors en filigrane derrière, parce qu'un niveau passé ne se juge pas seul.",
            "OBSERVED ON. The date one stands at. “Today” gives the day's curve; “two years ago” gives the one the desk would have drawn then, with the sessions known at the time. It is an act of analysis, not a glance: one looks at whether today's level is high or low against what it was. Today's curve then sits faintly behind, because a past level cannot be judged alone.",
          ),
        },
        {
          type: "p",
          text: l(
            "UNE SÉANCE COMPTE POUR MOITIÉ APRÈS. La pondération par l'âge. Une séance de la semaine dernière et une séance d'il y a dix-huit mois ne disent pas la même chose du prix d'aujourd'hui, mais la seconde n'est pas inutile pour autant. Plutôt que de choisir entre garder et jeter, on fait décroître le poids : à la demi-vie choisie, une séance pèse moitié moins qu'une séance du jour ; au double, quatre fois moins.",
            "A SESSION COUNTS FOR HALF AFTER. Weighting by age. Last week's session and one from eighteen months ago do not say the same thing about today's price, yet the second is not useless. Rather than choosing between keeping and discarding, the weight is made to decay: at the chosen half-life a session weighs half as much as today's; at twice that, four times less.",
          ),
        },
        {
          type: "note",
          kind: "info",
          text: l(
            "Image : c'est le volume qu'on donne à un souvenir. On n'efface pas ce qui est ancien, on l'écoute moins fort. « Jamais » met tout le monde au même volume, ce qui convient pour lire une époque passée ; quatre-vingt-dix jours convient pour dire le prix d'aujourd'hui.",
            "An image: it is the volume given to a memory. What is old is not erased, it is listened to less loudly. “Never” puts everyone at the same volume, which suits reading a past era; ninety days suits saying today's price.",
          ),
        },
        {
          type: "p",
          text: l(
            "LES SÉANCES MINCES. Une séance servie à un ou deux soumissionnaires seulement, ou qui n'a pas trouvé preneur pour tout le montant annoncé. Son chiffre est vrai : c'est bien ce qui s'est payé ce jour-là. Il n'est pas représentatif, parce qu'il dit ce qu'une ou deux contreparties voulaient ce matin-là, et non ce que le marché demandait. Elles se reconnaissent à leur point creux sur la figure.",
            "THIN SESSIONS. A session served to only one or two bidders, or which found no taker for the full amount announced. Its figure is true: it really is what was paid that day. It is not representative, because it says what one or two counterparties wanted that morning, not what the market was asking. They are recognised by their hollow point on the figure.",
          ),
        },
        {
          type: "table",
          head: [l("Réglage", "Setting"), l("Ce que ça veut dire", "What it means"), l("Quand s'en servir", "When to use it")],
          rows: [
            [l("à part entière", "in full"), l("elle pèse comme les autres", "it weighs like the others"), l("pour décrire ce qui s'est passé, sans jugement", "to describe what happened, without judgement")],
            [l("sous-pondérées", "down-weighted"), l("elle pèse un tiers", "it weighs a third"), l("par défaut : elle a eu lieu, elle compte moins", "the default: it happened, it counts for less")],
            [l("écartées", "set aside"), l("elle ne compte pas", "it does not count"), l("pour une indication de prix, où l'exception nuit", "for a price indication, where the exception harms")],
          ],
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "Écarter n'est pas anodin : cela revient à dire que la séance n'a pas eu lieu. La sous-pondération dit la vérité plus juste, à savoir qu'elle a eu lieu et qu'elle pèse moins. C'est pourquoi c'est le réglage par défaut.",
            "Setting aside is not neutral: it amounts to saying the session did not happen. Down-weighting tells the truer story, namely that it happened and weighs less. That is why it is the default.",
          ),
        },
        {
          type: "p",
          text: l(
            "LA COURBURE λ. Où se place la bosse du milieu, et à quelle vitesse la pente s'éteint. Deux choix : « propre à chacun », où chaque Trésor trouve la sienne, et « celle de la zone », où l'on impose à tous celle qui ressort de leurs données réunies. Le second sert aux Trésors qui n'ont pas assez de durées pour trouver la leur : ils empruntent la forme commune et ne cherchent plus que leur niveau et leur pente.",
            "CURVATURE λ. Where the middle hump sits, and how fast the slope dies away. Two choices: “each its own”, where every Treasury finds its own, and “the zone's”, where the one emerging from their pooled data is imposed on all. The second serves Treasuries lacking enough maturities to find their own: they borrow the common shape and look only for their level and slope.",
          ),
        },
        {
          type: "note",
          kind: "info",
          text: l(
            "L'hypothèse assumée : le coût du temps aurait la même forme pour six signatures d'une même monnaie, et seuls le niveau et la pente les sépareraient. L'observation le soutient au court terme, où deux Trésors se tiennent à moins de vingt points de base, et non au delà de deux ans, où ils s'écartent de plusieurs centaines.",
            "The assumption owned up to: the cost of time would have the same shape for six signatures in one currency, and only level and slope would separate them. Observation supports this at the short end, where two Treasuries stay within twenty basis points, and not beyond two years, where they part by several hundred.",
          ),
        },
        {
          type: "p",
          text: l(
            "CE QU'ON AJUSTE : rendement actuariel ou taux zéro-coupon. Le rendement à l'échéance d'une obligation dépend de son coupon : deux titres de même échéance et de coupons différents n'ont pas le même. Le taux zéro-coupon, lui, ne dépend que de la durée. C'est lui qui s'appelle proprement une courbe des taux, lui qui sert à valoriser un portefeuille et à fixer le prix d'une émission nouvelle.",
            "WHAT IS FITTED: redemption yield or zero-coupon rate. A bond's yield to maturity depends on its coupon: two securities with the same maturity and different coupons do not share one. The zero-coupon rate depends on maturity alone. It is what a yield curve properly is, what serves to value a portfolio and to price a new issue.",
          ),
        },
        {
          type: "note",
          kind: "info",
          text: l(
            "Image : le rendement actuariel est le prix moyen d'un panier, qui dépend de ce qu'on y a mis. Le zéro-coupon est le prix de chaque article. Nos bons sont zéro-coupon par construction ; les obligations se ramènent au zéro-coupon en actualisant leurs coupons intermédiaires sur la courbe déjà connue. Sur nos pièces l'effet va de moins vingt-quatre à plus cinquante points de base.",
            "An image: the redemption yield is the average price of a basket, which depends on what was put in it. The zero-coupon rate is the price of each item. Our bills are zero-coupon by construction; bonds are reduced to it by discounting their intermediate coupons on the curve already known. On our documents the effect runs from minus twenty-four to plus fifty basis points.",
          ),
        },
      ],
    },
    {
      id: "lire",
      title: l("Lire la figure sans se tromper", "Reading the figure without going wrong"),
      blocks: [
        {
          type: "table",
          head: [l("Ce qu'on voit", "What is seen"), l("Ce que c'est", "What it is")],
          rows: [
            [l("un trait plein", "a solid line"), l("notre courbe, sur les durées réellement observées", "our curve, over the maturities actually observed")],
            [l("une bande pâle autour", "a pale band around it"), l("l'intervalle à 95 % : étroit là où les points sont serrés, large là où ils manquent", "the 95 % interval: narrow where points are close, wide where they are missing")],
            [l("un cercle plein", "a filled circle"), l("une séance relue", "a reviewed session")],
            [l("un cercle creux", "a hollow circle"), l("une séance mince : vraie, mais pas représentative", "a thin session: true, but not representative")],
            [l("un pointillé gris nommé BEAC", "a grey dotted line named BEAC"), l("la courbe de la BEAC, rangée par durée d'ÉMISSION et non par vie restante", "the BEAC's curve, ordered by maturity AT ISSUE and not by life remaining")],
            [l("une valeur grisée dans la table", "a greyed value in the table"), l("un taux extrapolé : aucune séance à cette durée", "an extrapolated rate: no session at that maturity")],
          ],
        },
        {
          type: "p",
          text: l(
            "Les quatre chiffres au-dessus de la figure décident si l'on peut s'en servir : le taux court, l'âge du point le plus frais, le nombre de durées distinctes et l'écart aux points. Ce dernier est le plus important. Il dit de combien la courbe s'éloigne en moyenne des séances observées. Huit points de base, c'est huit centièmes de pour cent : la courbe passe au ras de ses points. Cent cinquante, c'est un point et demi d'écart, et la courbe raconte alors sa propre histoire.",
            "The four figures above the chart decide whether it can be used: the short rate, the age of the freshest point, the number of distinct maturities and the deviation from the points. The last matters most. It says how far the curve sits, on average, from the observed sessions. Eight basis points is eight hundredths of a per cent: the curve skims its points. A hundred and fifty is one and a half points of gap, and the curve is then telling its own story.",
          ),
        },
        {
          type: "note",
          kind: "rule",
          text: l(
            "Quand la figure refuse de tracer, elle dit pourquoi. Trois poids demandent au moins quatre durées différentes, huit pour être stables. En dessous, on n'affiche pas une courbe fragile. Ce n'est pas une page manquante : les observations sont là, elles valent ce qu'elles valent, et c'est le modèle qui refuse.",
            "When the figure refuses to draw, it says why. Three weights need at least four distinct maturities, eight to be stable. Below that, no fragile curve is shown. It is not a missing page: the observations are there, they are worth what they are worth, and it is the model that refuses.",
          ),
        },
      ],
    },
    {
      id: "limites",
      title: l("Ce qu'elle ne dit pas", "What it does not say"),
      blocks: [
        {
          type: "list",
          items: [
            l(
              "C'est le marché primaire. Ces taux sont ceux payés à l'émission, pas ceux auxquels le papier s'échange ensuite. Un taux d'adjudication contient une concession d'émission.",
              "This is the primary market. These rates are those paid at issue, not those at which the paper trades afterwards. An auction rate carries a new-issue concession.",
            ),
            l(
              "Elle interpole, elle ne crée pas d'observation. Une durée que personne n'a adjugée reste une durée que personne n'a adjugée : la courbe y répond, mais la valeur est grisée et l'intervalle s'élargit.",
              "It interpolates, it does not create observations. A maturity nobody auctioned stays a maturity nobody auctioned: the curve answers there, but the value is greyed and the interval widens.",
            ),
            l(
              "Ce n'est pas la courbe de la BEAC. La sienne porte l'encours rangé par durée d'émission, la nôtre les adjudications rangées par vie restante. Elle dit ce que la dette coûte en moyenne, nous ce que le marché a facturé à la dernière séance.",
              "It is not the BEAC's curve. Hers carries the outstanding stock ordered by maturity at issue, ours the auctions ordered by life remaining. She says what the debt costs on average, we what the market charged at the last session.",
            ),
            l(
              "La vue de zone est une moyenne des Trésors présents à chaque durée. C'est un niveau de zone, jamais un taux auquel quiconque emprunte.",
              "The zone view is an average of the Treasuries present at each maturity. It is a zone level, never a rate at which anyone borrows.",
            ),
          ],
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "Un chiffre produit par un modèle n'est pas un chiffre lu sur une pièce, et la différence doit être écrite avant qu'il ne quitte la maison. C'est pourquoi la section porte la mention « interne » tant que cette page n'est pas arrêtée comme lettre de méthodologie.",
            "A figure produced by a model is not a figure read off a document, and the difference must be written down before it leaves the house. That is why the section is marked “internal” until this page is settled as the methodology letter.",
          ),
        },
      ],
    },
  ],
};
