import { l, type DocPage } from "./types";

/**
 * La courbe des taux : une seule page, de l'image à la formule.
 *
 * ELLE EN ÉTAIT DEUX, et c'était une erreur. « La courbe des taux, expliquée »
 * s'adressait à qui n'en a jamais construit ; « note technique » à qui doit
 * refaire le calcul. Deux pages sur un même objet se répondent mal : la
 * seconde répétait la première en plus sec, et la première renvoyait à la
 * seconde dès qu'une formule manquait. Le lecteur non technique s'arrêtait
 * avant les formules sans rien perdre, le lecteur technique sautait les
 * images : une seule page sert les deux si chaque chapitre va dans cet ordre.
 *
 * Elle cite les formules telles que le code les applique. Quand l'une change
 * dans `nelson-siegel.ts`, `yield.ts`, `curve.ts`, `lecture-b.ts` ou
 * `zero-coupon.ts`, elle change ici le même jour, sans quoi elle devient un
 * document qui a l'air vrai.
 *
 * Elle reste derrière le desk tant que la maison n'a pas décidé de publier sa
 * méthode. Le jour où elle le décide, il n'y a qu'un mot à changer ici.
 */
export const COURBE: DocPage = {
  slug: "courbe-des-taux",
  title: l("La courbe des taux", "The yield curve"),
  summary: l(
    "Ce que la courbe répond, comment elle se construit geste par geste, les formules qui la produisent, ce que chaque réglage de l'écran change, comment lire chaque marque de la figure, et ce qu'elle ne dit pas.",
    "What the curve answers, how it is built step by step, the formulas that produce it, what each control on the screen changes, how to read every mark on the figure, and what it does not say.",
  ),
  visibility: "desk",
  audience: ["desk", "client", "admin", "tech"],
  order: 5,
  checkedOn: "2026-10-08",
  owner: "Georges",
  chapters: [
    {
      id: "question",
      title: l("La question à laquelle elle répond", "The question it answers"),
      blocks: [
        {
          type: "lead",
          text: l(
            "Une courbe des taux répond à une seule question : combien coûte l'argent, pour chaque durée, aujourd'hui. Prêter six mois et prêter sept ans ne se paient pas pareil, et la courbe est la ligne qui relie tous ces prix. Formellement, elle associe à chaque durée τ un taux y(τ).",
            "A yield curve answers one question: what money costs, for each maturity, today. Lending for six months and lending for seven years are not paid alike, and the curve is the line that joins all those prices. Formally, it maps each maturity τ to a rate y(τ).",
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
        {
          type: "note",
          kind: "warn",
          text: l(
            "LA NÔTRE EST UNE COURBE DE MARCHÉ PRIMAIRE. Elle est estimée sur des adjudications des six Trésors, signées une à une par une personne du desk. Elle dit donc ce qu'un Trésor a payé pour PLACER, et non où le papier s'échange ensuite. La distinction n'est pas de forme : une adjudication porte une concession d'émission, le Trésor payant un peu plus que le marché secondaire ne demanderait pour être sûr de placer. Une courbe primaire est donc structurellement au-dessus d'une courbe secondaire.",
            "OURS IS A PRIMARY-MARKET CURVE. It is estimated on auctions of the six Treasuries, each signed off by a person at the desk. It therefore says what a Treasury paid to PLACE its paper, not where that paper trades afterwards. The distinction is not cosmetic: an auction carries an issuance concession, the Treasury paying slightly more than the secondary market would ask to be sure of placing. A primary curve therefore sits structurally above a secondary one.",
          ),
        },
        {
          type: "p",
          text: l(
            "La cote de la BVMAC n'entre pas dans la courbe. Elle alimente les panneaux de liquidité et de fraîcheur, plus bas sur la même page, et sert à juger si un cours coté peut servir de référence. Le choix est documenté sous le nom de « lecture B » : nous n'avons pas de marché secondaire liquide, il n'existe donc pas de rendement vivant à observer un jour donné, et une courbe qui n'admettrait que des titres en vie viderait ses fenêtres profondes.",
            "The BVMAC listing does not enter the curve. It feeds the liquidity and freshness panels further down the same page, and serves to judge whether a listed price can be used as a reference. The choice is documented as “reading B”: we have no liquid secondary market, so there is no live yield to observe on a given day, and a curve admitting only live securities would empty its deep windows.",
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
            "Ce n'est pas un cas d'école ici : les Trésors de la zone abondent des lignes anciennes plutôt que d'en ouvrir de nouvelles. Quarante-sept de nos deux cent quarante-neuf séances changent de place quand on les range par leur échéance, jusqu'à sept cent cinquante-neuf points de base. L'échéance imprimée passe donc devant l'étiquette, et le calcul dit laquelle des deux a servi : un chiffre calculé sur une durée supposée ne se présente pas comme un chiffre calculé sur une date lue.",
            "This is no textbook case here: the zone's Treasuries tap old lines rather than open new ones. Forty-seven of our two hundred and forty-nine sessions move when ordered by their redemption date, by as much as seven hundred and fifty-nine basis points. The printed maturity therefore takes precedence over the label, and the computation states which of the two was used: a figure computed on an assumed term does not present itself as one computed on a date that was read.",
          ),
        },
      ],
    },
    {
      id: "observation",
      title: l("D'un communiqué à une observation", "From a communiqué to an observation"),
      blocks: [
        {
          type: "lead",
          text: l(
            "Une observation est un couple (τ, y) assorti d'un poids. L'abscisse τ est la vie restante au jour de la séance, en années. L'ordonnée y s'obtient de trois façons, dans cet ordre de préférence, et l'écran nomme toujours celle qui a servi.",
            "An observation is a pair (τ, y) together with a weight. The abscissa τ is the remaining life on the day of the session, in years. The ordinate y is obtained in three ways, in this order of preference, and the screen always names the one that was used.",
          ),
        },
        {
          type: "steps",
          items: [
            l(
              "IMPRIMÉ. Le Trésor publie un rendement : on le prend tel quel. À défaut du taux moyen pondéré, le taux au prix limite, et l'hypothèse est inscrite.",
              "PRINTED. The Treasury publishes a yield: it is taken as is. Failing the weighted average rate, the rate at the limit price, and the assumption is recorded.",
            ),
            l(
              "TAUX PRÉCOMPTÉ, pour les bons. Le Trésor annonce un taux d'escompte d sur n jours. Le prix vaut P = 1 − d·n/360, et le rendement actuariel équivalent y = (1/P)^(365/n) − 1. Escompte exact/360, capitalisation exact/365 : la convention est écrite à côté du chiffre. Les jours n sont les jours RESTANTS quand l'échéance est imprimée, pas la durée nominale : le Trésor gabonais a adjugé le même jour quatre lignes de treize semaines dont deux à vingt-trois et trente-sept jours du terme.",
              "DISCOUNT RATE, for bills. The Treasury announces a discount rate d over n days. The price is P = 1 − d·n/360, and the equivalent actuarial yield y = (1/P)^(365/n) − 1. Discount actual/360, compounding actual/365: the convention is written beside the figure. The days n are the REMAINING days when the maturity is printed, not the nominal tenor: the Gabonese Treasury auctioned four thirteen-week lines on the same day, two of them twenty-three and thirty-seven days from term.",
            ),
            l(
              "PRIX ET COUPON, pour les obligations. On résout en y l'équation de prix P = Σ C/(1+y)^tᵢ + N/(1+y)^τ, où C est le coupon annuel facial, N le nominal remboursé in fine et tᵢ les dates de détachement restantes. Sans coupon facial, pas de rendement : la séance devient un trou déclaré plutôt qu'un point inventé.",
              "PRICE AND COUPON, for bonds. One solves for y the pricing equation P = Σ C/(1+y)^tᵢ + N/(1+y)^τ, where C is the annual coupon, N the principal repaid at maturity and tᵢ the remaining coupon dates. Without a face coupon there is no yield: the session becomes a declared gap rather than an invented point.",
            ),
          ],
        },
        {
          type: "note",
          kind: "rule",
          text: l(
            "Deux exclusions nommées produisent un trou et non un point : une ligne dont l'avis d'émission dit qu'elle ne se rembourse pas in fine, parce que l'équation de prix ci-dessus ne la décrit pas ; et une séance servie à zéro, qui est un résultat sans prix. Les deux sont comptées et listées sous « Ce qui manque à la courbe ».",
            "Two named exclusions produce a gap and not a point: a line whose issuance notice says it does not redeem at maturity, because the pricing equation above does not describe it; and a session served at zero, which is a result without a price. Both are counted and listed under “What the curve is missing”.",
          ),
        },
      ],
    },
    {
      id: "fenetre",
      title: l("La fenêtre : profondeur et date d'observation", "The window: depth and observation date"),
      blocks: [
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
            "La figure ouvre sur la fenêtre la plus courte qui montre quelque chose. Mesuré à la date du jour : quatre-vingt-dix jours et un an donnent les mêmes points, une vingtaine, la zone ayant peu émis récemment ; une trentaine à deux ans, une soixantaine à cinq, dont les deux tiers gabonais. À une date passée, la fenêtre courte est souvent vide quand la suivante est garnie. Un Trésor qui n'apporte pas deux durées distinctes n'est pas tracé du tout.",
            "The figure opens on the shortest window that shows something. Measured at today's date: ninety days and one year give the same points, about twenty, the zone having issued little recently; about thirty at two years, about sixty at five, two thirds of them Gabonese. At a past date, the short window is often empty when the next one is full. A Treasury that does not bring two distinct maturities is not drawn at all.",
          ),
        },
        {
          type: "p",
          text: l(
            "OBSERVÉE LE. La date à laquelle on se place. « Aujourd'hui » donne la courbe du jour ; « il y a deux ans » donne celle que le desk aurait tracée à cette date-là. C'est un acte d'analyse, pas un survol : on regarde si le niveau d'aujourd'hui est haut ou bas par rapport à ce qu'il était. La courbe du jour se pose alors en filigrane derrière, parce qu'un niveau passé ne se juge pas seul.",
            "OBSERVED ON. The date one stands at. “Today” gives the day's curve; “two years ago” gives the one the desk would have drawn then. It is an act of analysis, not a glance: one looks at whether today's level is high or low against what it was. Today's curve then sits faintly behind, because a past level cannot be judged alone.",
          ),
        },
        {
          type: "note",
          kind: "rule",
          text: l(
            "RECULER N'EST PAS PONDÉRER, C'EST IGNORER. Soit D la date d'observation et P la profondeur en jours : une séance datée s est retenue si et seulement si 0 ≤ D − s ≤ P. La première inégalité est la plus souvent mal lue. Tout ce qui s'est adjugé APRÈS D est hors champ, non pas déprécié mais absent : reculer la date ne donne aucune priorité aux séances anciennes, cela supprime les récentes. Les deux réglages découpent donc ensemble une tranche fermée des deux côtés.",
            "GOING BACK IS NOT WEIGHTING, IT IS IGNORING. Let D be the observation date and P the depth in days: a session dated s is kept if and only if 0 ≤ D − s ≤ P. The first inequality is the most often misread. Everything auctioned AFTER D is out of scope, not discounted but absent: moving the date back gives no priority to older sessions, it removes the recent ones. The two settings therefore cut, together, a slice closed at both ends.",
          ),
        },
        {
          type: "table",
          head: [l("Réglage", "Setting"), l("Tranche retenue", "Slice kept"), l("Ce qu'on y lit", "What it shows")],
          rows: [
            [l("Aujourd'hui, 1 an", "Today, 1 year"), l("8 oct. 2025 → 8 oct. 2026", "8 Oct 2025 → 8 Oct 2026"), l("Le coût de l'argent tel qu'il se paie en ce moment.", "The cost of money as it is paid right now.")],
            [l("Il y a 5 ans, 1 an", "5 years ago, 1 year"), l("8 oct. 2020 → 8 oct. 2021", "8 Oct 2020 → 8 Oct 2021"), l("La même figure refaite à cette date : rien de 2022-2026 n'y entre.", "The same figure rebuilt at that date: nothing from 2022-2026 enters it.")],
            [l("Il y a 5 ans, 5 ans", "5 years ago, 5 years"), l("8 oct. 2016 → 8 oct. 2021", "8 Oct 2016 → 8 Oct 2021"), l("Cinq années de séances, toutes antérieures à 2021 : la profondeur n'allonge que vers le passé.", "Five years of sessions, all before 2021: depth only lengthens towards the past.")],
          ],
        },
        {
          type: "p",
          text: l(
            "Si aucune séance de la tranche ne porte une durée donnée, il n'y a pas de point à cette durée, et rien ne le remplace. La courbe ajustée peut passer au-dessus de ce vide, mais c'est alors une extrapolation, signalée comme telle : le tracé est écrêté aux durées réellement observées et les cases extrapolées du tableau sont grisées.",
            "If no session in the slice carries a given maturity, there is no point at that maturity, and nothing replaces it. The fitted curve may pass over that void, but it is then an extrapolation, flagged as such: the plot is clipped to the maturities actually observed and the extrapolated table cells are greyed out.",
          ),
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "La reconstruction d'une date passée se fait avec LES DONNÉES D'AUJOURD'HUI. Une séance relue la semaine dernière y figure ; une séance que nous n'avions pas encore ramassée à l'époque y figure aussi. C'est la courbe de ce jour-là vue d'ici, et non ce que nous en savions alors : la distinction compte si l'on veut juger une décision prise à l'époque.",
            "Rebuilding a past date uses TODAY's data. A session re-read last week appears in it; so does a session we had not yet collected at the time. It is that day's curve seen from here, not what we knew then: the distinction matters if one wants to judge a decision made at the time.",
          ),
        },
      ],
    },
    {
      id: "selection",
      title: l("Une ligne, un point", "One line, one point"),
      blocks: [
        {
          type: "p",
          text: l(
            "Les séances retenues sont groupées par couple (pays, date d'échéance). La clef est l'échéance et non l'étiquette, parce que deux tranches peuvent toutes deux s'appeler « 6 ans » sans être la même ligne. Dans chaque groupe on garde LA PLUS RÉCENTE DES SÉANCES NON MINCES ; si toutes sont minces, la plus récente. Une séance représentative bat donc une séance simplement récente.",
            "The sessions kept are grouped by (country, maturity date). The key is the maturity and not the label, because two taps may both be called “6 years” without being the same line. Within each group we keep THE MOST RECENT NON-THIN SESSION; if all are thin, the most recent. A representative session therefore beats a merely recent one.",
          ),
        },
        {
          type: "note",
          kind: "info",
          text: l(
            "Rien ne se moyenne jamais entre deux dates du même pays : la plus récente est le marché, l'autre est de l'histoire. Un exemple : le Cameroun a adjugé du 26 semaines en mars, en juin et en septembre ; à 26 semaines la courbe retient septembre seul, sauf si septembre n'avait qu'un soumissionnaire, auquel cas elle retient juin et dessine septembre en cercle creux.",
            "Nothing is ever averaged between two dates of the same country: the most recent is the market, the other is history. An example: Cameroon auctioned 26-week paper in March, June and September; at 26 weeks the curve keeps September alone, unless September had a single bidder, in which case it keeps June and draws September as a hollow circle.",
          ),
        },
        {
          type: "p",
          text: l(
            "Un second dédoublonnage, par étiquette de durée arrondie, n'a lieu que dans la vision « La courbe ». La vision « Les données » laisse au contraire les séances s'empiler sur une même durée : cet empilement est l'information, et le tableau affiche alors le taux le plus frais suivi de la fourchette de toutes.",
            "A second deduplication, by rounded maturity label, happens only in the “Curve” view. The “Data” view instead lets sessions stack on the same maturity: that stacking is the information, and the table then shows the freshest rate followed by the range of all of them.",
          ),
        },
      ],
    },
    {
      id: "poids",
      title: l("Les poids : l'âge et la représentativité", "The weights: age and representativeness"),
      blocks: [
        {
          type: "p",
          text: l(
            "UNE SÉANCE COMPTE POUR MOITIÉ APRÈS. Une séance de la semaine dernière et une séance d'il y a dix-huit mois ne disent pas la même chose du prix d'aujourd'hui, mais la seconde n'est pas inutile pour autant. Plutôt que de choisir entre garder et jeter, on fait décroître le poids. Image : c'est le volume qu'on donne à un souvenir ; on n'efface pas ce qui est ancien, on l'écoute moins fort.",
            "A SESSION COUNTS FOR HALF AFTER. Last week's session and one from eighteen months ago do not say the same thing about today's price, yet the second is not useless. Rather than choosing between keeping and discarding, the weight is made to decay. An image: it is the volume given to a memory; what is old is not erased, it is listened to less loudly.",
          ),
        },
        {
          type: "p",
          text: l(
            "Le poids d'une observation est w = 0,5^(a/H) × m, où a est l'âge de la séance en jours, H la demi-vie choisie, et m le traitement des séances minces. Avec H = 180 jours : aujourd'hui 1,00 ; trois mois 0,71 ; six mois 0,50 ; un an 0,25 ; deux ans 0,063 ; trois ans 0,016. Une séance de trois ans pèse donc un soixantième d'une séance du jour. « Jamais » met tout le monde au même volume, ce qui convient pour lire une époque passée ; quatre-vingt-dix jours convient pour dire le prix d'aujourd'hui.",
            "An observation's weight is w = 0.5^(a/H) × m, where a is the session's age in days, H the chosen half-life, and m the treatment of thin sessions. With H = 180 days: today 1.00; three months 0.71; six months 0.50; one year 0.25; two years 0.063; three years 0.016. A three-year-old session therefore weighs one sixtieth of today's. “Never” puts everyone at the same volume, which suits reading a past era; ninety days suits saying today's price.",
          ),
        },
        {
          type: "p",
          text: l(
            "LES SÉANCES MINCES. Une séance est mince si elle a au plus un soumissionnaire, ou si la demande n'a pas couvert le montant offert — le taux de couverture étant celui que le Trésor publie, à défaut le rapport des montants soumis sur annoncés. Son chiffre est vrai : c'est bien ce qui s'est payé ce jour-là. Il n'est pas représentatif, parce qu'il dit ce qu'une ou deux contreparties voulaient ce matin-là, et non ce que le marché demandait.",
            "THIN SESSIONS. A session is thin if it has at most one bidder, or if demand did not cover the amount offered — the coverage ratio being the one the Treasury publishes, failing that the ratio of bids to the announced amount. Its figure is true: it really is what was paid that day. It is not representative, because it says what one or two counterparties wanted that morning, not what the market was asking.",
          ),
        },
        {
          type: "table",
          head: [l("Réglage", "Setting"), l("Ce que ça veut dire", "What it means"), l("Quand s'en servir", "When to use it")],
          rows: [
            [l("à part entière", "in full"), l("elle pèse comme les autres, m = 1", "it weighs like the others, m = 1"), l("pour décrire ce qui s'est passé, sans jugement", "to describe what happened, without judgement")],
            [l("sous-pondérées", "down-weighted"), l("elle pèse un tiers, m = 0,35", "it weighs a third, m = 0.35"), l("par défaut : elle a eu lieu, elle compte moins", "the default: it happened, it counts for less")],
            [l("écartées", "set aside"), l("elle ne compte pas, m = 0", "it does not count, m = 0"), l("pour une indication de prix, où l'exception nuit", "for a price indication, where the exception harms")],
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
          type: "note",
          kind: "rule",
          text: l(
            "LA PONDÉRATION NE CHOISIT AUCUN POINT : la sélection a eu lieu avant, côté serveur, et ne dépend d'aucun bouton. Le poids ne change que combien chaque point tire sur la courbe ajustée. Seule l'option « écartée » retire effectivement un point du tracé, et elle est aussi la seule qui puisse, en faisant tomber le nombre de durées distinctes sous quatre, empêcher la courbe d'exister. La minceur intervient en revanche déjà dans la sélection, comme départage entre deux séances d'une même ligne.",
            "WEIGHTING CHOOSES NO POINT: the selection happened earlier, server-side, and depends on no button. The weight only changes how hard each point pulls on the fitted curve. Only “set aside” actually removes a point from the plot, and it is also the only one that can, by dropping the number of distinct maturities below four, prevent the curve from existing. Thinness does however already play a part in the selection, as the tie-break between two sessions of one line.",
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
          type: "p",
          text: l(
            "Écrit en toutes lettres : y(τ) = β₀ + β₁·f₁(τ) + β₂·f₂(τ), avec f₁ = (1 − e^(−τ/λ)) / (τ/λ) et f₂ = f₁ − e^(−τ/λ). La limite en τ → 0 est traitée explicitement, f₁ = 1 et f₂ = 0, pour éviter la forme indéterminée 0/0 du quotient.",
            "Written out: y(τ) = β₀ + β₁·f₁(τ) + β₂·f₂(τ), with f₁ = (1 − e^(−τ/λ)) / (τ/λ) and f₂ = f₁ − e^(−τ/λ). The limit as τ → 0 is handled explicitly, f₁ = 1 and f₂ = 0, to avoid the indeterminate 0/0 form of the quotient.",
          ),
        },
        {
          type: "list",
          items: [
            l("β₀ tout seul est le taux au long terme, puisque les deux autres formes y sont éteintes.", "β₀ alone is the long-term rate, since the other two shapes have died away there."),
            l("β₀ + β₁ est le taux instantané, puisque la deuxième forme y vaut 1 et la bosse 0.", "β₀ + β₁ is the instantaneous rate, since the second shape equals 1 there and the hump 0."),
            l(
              "β₂ est la courbure : l'ampleur du creux ou de la bosse du milieu. f₂ vaut 0 en zéro, atteint son maximum vers τ ≈ 1,79 λ, puis redescend, si bien que β₂ ne touche ni le très court ni le très long terme. Nul, la courbe monte ou descend régulièrement.",
              "β₂ is the curvature: the size of the dip or hump in the middle. f₂ is 0 at zero, peaks around τ ≈ 1.79 λ, then falls back, so that β₂ touches neither the very short nor the very long end. Nil, the curve rises or falls steadily.",
            ),
            l("λ, en années, règle l'échelle de temps : à quelle vitesse la pente s'éteint et où la bosse se place, celle-ci culminant vers 1,79 λ. λ petit, tout se joue dans les premiers mois et la courbe est déjà plate à deux ans ; λ grand, la pente s'étire et la bosse se déplace vers le long terme.", "λ, in years, sets the time scale: how fast the slope dies away and where the hump sits, the latter peaking around 1.79 λ. Small λ, everything happens in the first months and the curve is already flat at two years; large λ, the slope stretches and the hump moves towards the long end."),
          ],
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
            "COMMENT ON TROUVE LES QUATRE NOMBRES. Si l'on fixe λ, la courbe devient une simple somme de trois formes connues, et trouver les trois poids revient à résoudre un système de trois équations : un calcul exact, en une fois, sans tâtonnement. Formellement, en posant x(τ) = (1, f₁(τ), f₂(τ)), l'ajustement est une régression par moindres carrés pondérés — on minimise Σ wᵢ (yᵢ − x(τᵢ)ᵀβ)², dont la solution est β = (XᵀWX)⁻¹ XᵀWy. La matrice XᵀWX est de taille 3×3 : on l'accumule en un passage sur les observations et on la résout par élimination de Gauss-Jordan avec pivot partiel, ce qui rend au passage son inverse. Aucun optimiseur, aucun point de départ à deviner, aucune divergence possible. C'est la méthode des banques centrales, et c'est pour cela que l'ajustement ne peut pas partir de travers.",
            "HOW THE FOUR NUMBERS ARE FOUND. If λ is fixed, the curve becomes a plain sum of three known shapes, and finding the three weights amounts to solving three equations: an exact calculation, in one pass, with no trial and error. Formally, setting x(τ) = (1, f₁(τ), f₂(τ)), the fit is a weighted least-squares regression — one minimises Σ wᵢ (yᵢ − x(τᵢ)ᵀβ)², whose solution is β = (XᵀWX)⁻¹ XᵀWy. The matrix XᵀWX is 3×3: it is accumulated in one pass over the observations and solved by Gauss-Jordan elimination with partial pivoting, which also returns its inverse. No optimiser, no starting point to guess, no possible divergence. This is the central banks' method, and it is why the fit cannot go astray.",
          ),
        },
      ],
    },
    {
      id: "lambda",
      title: l("λ : le balayage, et le piège d'identification", "λ: the sweep, and the identification trap"),
      blocks: [
        {
          type: "p",
          text: l(
            "λ étant le seul nombre non linéaire, on ne tâtonne que sur lui : on en essaie quatre-vingts, on garde celui dont la courbe passe le plus près des points, puis on affine autour. La grille est en progression géométrique entre deux bornes déduites des durées observées : lo = max(0,05 ; τ_min / 1,79 / 1,5) et hi = max(1,2·lo ; 1,5 · τ_max / 1,79). Pour chaque λ on résout le 3×3 et on retient la somme des carrés résiduels la plus faible.",
            "λ being the only non-linear number, it alone is searched: eighty are tried, the one whose curve passes closest to the points is kept, then refined around it. The grid is geometrically spaced between two bounds derived from the observed maturities: lo = max(0.05, τ_min / 1.79 / 1.5) and hi = max(1.2·lo, 1.5 · τ_max / 1.79). For each λ the 3×3 is solved and the lowest residual sum of squares kept.",
          ),
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "CE QUI PEUT MAL TOURNER, ET POURQUOI LES BORNES. Quand λ devient grand, la forme « pente » et la forme « bosse » se ressemblent de plus en plus : sur l'intervalle observé elles deviennent presque colinéaires, et le calcul peut donner à l'une un poids énorme et à l'autre l'inverse, sans que la courbe bouge. Ce n'est pas une crainte théorique : avec une grille libre jusqu'à six ans, nos données donnaient un niveau de −628 pour cent pour le Gabon et de −821 pour le Congo. La parade vient de la théorie : la bosse, qui culmine à 1,79 λ, doit se placer À L'INTÉRIEUR des durées observées, sinon rien ne la contraint. λ est donc borné par ce que les données peuvent voir, ce qui est une correction de spécification et non un bricolage.",
            "WHAT CAN GO WRONG, AND WHY THE BOUNDS. As λ grows, the “slope” shape and the “hump” shape look more and more alike: over the observed interval they become nearly collinear, and the calculation can give one an enormous weight and the other its opposite, without the curve moving. This is not a theoretical worry: with a free grid up to six years, our data gave a level of −628 per cent for Gabon and −821 for Congo. The remedy comes from the theory: the hump, peaking at 1.79 λ, must sit INSIDE the observed maturities, or nothing constrains it. λ is therefore bounded by what the data can see, which is a specification fix and not a patch.",
          ),
        },
        {
          type: "p",
          text: l(
            "Le pas géométrique laisse à λ une erreur d'un demi-pas, que β₂ absorbe : la courbure revenait à 3,986 pour une vraie valeur de 4. Une recherche ternaire de quarante itérations sur l'intervalle des deux voisins de grille réduit l'écart à rien, pour un coût qui ne se mesure pas.",
            "The geometric step leaves λ with a half-step error, which β₂ absorbs: curvature came back as 3.986 for a true value of 4. A forty-iteration ternary search over the interval between the two neighbouring grid points reduces the gap to nothing, at a cost too small to measure.",
          ),
        },
        {
          type: "p",
          text: l(
            "LA COURBURE λ, À L'ÉCRAN. Deux choix : « propre à chacun », où chaque Trésor trouve la sienne par le balayage ci-dessus, et « celle de la zone », où l'on impose à tous celle qui ressort de leurs données réunies — la grille et la recherche ternaire sont alors court-circuitées et seuls β₀, β₁, β₂ sont estimés. Le second sert aux Trésors qui n'ont pas assez de durées pour trouver la leur : ils empruntent la forme commune et ne cherchent plus que leur niveau et leur pente.",
            "CURVATURE λ, ON SCREEN. Two choices: “each its own”, where every Treasury finds its own by the sweep above, and “the zone's”, where the one emerging from their pooled data is imposed on all — the grid and the ternary search are then bypassed and only β₀, β₁, β₂ are estimated. The second serves Treasuries lacking enough maturities to find their own: they borrow the common shape and look only for their level and slope.",
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
            "Une extension existe, dite de Svensson, qui ajoute une deuxième bosse : six nombres au lieu de quatre. Elle décrit mieux les courbes riches, et ne s'identifie pas chez nous : six nombres sur treize durées dont la moitié sous un an, il n'y a pas de quoi les contraindre.",
            "An extension exists, Svensson's, adding a second hump: six numbers instead of four. It describes rich curves better, and does not identify here: six numbers over thirteen maturities, half of them under a year, leaves nothing to constrain them.",
          ),
        },
      ],
    },
    {
      id: "sorties",
      title: l("Ce que l'ajustement rend", "What the fit returns"),
      blocks: [
        {
          type: "list",
          items: [
            l("Les trois coefficients et λ, affichés au tableau avec le taux instantané β₀ + β₁.", "The three coefficients and λ, shown in the table together with the instantaneous rate β₀ + β₁."),
            l("L'écart aux points, RMSE = √(SCR / n) × 100, en points de base.", "The deviation from the points, RMSE = √(RSS / n) × 100, in basis points."),
            l("Le demi-intervalle de confiance à 95 % : b(τ) = 1,96 · √(σ̂² · x(τ)ᵀ (XᵀWX)⁻¹ x(τ)), avec σ̂² = SCR / (n − 3), le dénominateur étant les degrés de liberté et non l'effectif.", "The 95 % half-confidence interval: b(τ) = 1.96 · √(σ̂² · x(τ)ᵀ (XᵀWX)⁻¹ x(τ)), with σ̂² = RSS / (n − 3), the denominator being the degrees of freedom and not the sample size."),
            l("Les bornes des durées réellement observées, qui séparent l'interpolation de l'extrapolation.", "The bounds of the maturities actually observed, which separate interpolation from extrapolation."),
          ],
        },
        {
          type: "p",
          text: l(
            "L'écart aux points est le chiffre le plus important des quatre affichés au-dessus de la figure, avec le taux court, l'âge du point le plus frais et le nombre de durées distinctes. Il dit de combien la courbe s'éloigne en moyenne des séances observées. Huit points de base, c'est huit centièmes de pour cent : la courbe passe au ras de ses points. Cent cinquante, c'est un point et demi d'écart, et la courbe raconte alors sa propre histoire.",
            "The deviation from the points is the most important of the four figures shown above the chart, with the short rate, the age of the freshest point and the number of distinct maturities. It says how far the curve sits, on average, from the observed sessions. Eight basis points is eight hundredths of a per cent: the curve skims its points. A hundred and fifty is one and a half points of gap, and the curve is then telling its own story.",
          ),
        },
        {
          type: "note",
          kind: "info",
          text: l(
            "La bande s'élargit là où l'on extrapole, et c'est exactement son rôle : la forme quadratique x(τ)ᵀ(XᵀWX)⁻¹x(τ) croît quand τ s'éloigne de la masse des observations. Une courbe ajustée sur six points ne vaut pas la même chose à un an, où il y en a trois, et à dix ans, où il n'y en a aucun. Les poids y entrent comme des PRÉCISIONS RELATIVES et non comme des effectifs : sous-pondérer un point élargit la bande autour de lui.",
            "The band widens where one extrapolates, and that is precisely its purpose: the quadratic form x(τ)ᵀ(XᵀWX)⁻¹x(τ) grows as τ moves away from the mass of observations. A curve fitted on six points is not worth the same at one year, where there are three, and at ten, where there are none. The weights enter as RELATIVE PRECISIONS and not as counts: under-weighting a point widens the band around it.",
          ),
        },
      ],
    },
    {
      id: "refus",
      title: l("Les trois refus", "The three refusals"),
      blocks: [
        {
          type: "p",
          text: l(
            "Quand la figure refuse de tracer, elle dit pourquoi, et ce n'est pas une page manquante : les observations sont là, elles valent ce qu'elles valent, et c'est le modèle qui refuse. Les trois gardes se déclenchent dans cet ordre.",
            "When the figure refuses to draw, it says why, and it is not a missing page: the observations are there, they are worth what they are worth, and it is the model that refuses. The three guards fire in this order.",
          ),
        },
        {
          type: "steps",
          items: [
            l(
              "MOINS DE QUATRE DURÉES DISTINCTES. Trois paramètres plus un degré de liberté pour estimer le bruit : en dessous il n'y a pas de résidu, donc pas de bande, donc rien à publier. Huit durées sont nécessaires pour que l'ajustement soit stable.",
              "FEWER THAN FOUR DISTINCT MATURITIES. Three parameters plus one degree of freedom to estimate the noise: below that there is no residual, hence no band, hence nothing to publish. Eight maturities are needed for the fit to be stable.",
            ),
            l(
              "COEFFICIENTS HORS DU MONDE. Si l'un des β dépasse 40 en valeur absolue, les durées observées ne contraignent pas la courbure. « Non identifié » invite à regarder les données ; un chiffre absurde invite à en faire quelque chose.",
              "COEFFICIENTS OUT OF THIS WORLD. If any β exceeds 40 in absolute value, the observed maturities do not constrain the curvature. “Not identified” invites one to look at the data; an absurd figure invites one to act on it.",
            ),
            l(
              "LA COURBE AJUSTÉE SORT DES TAUX PLAUSIBLES. Des coefficients bornés peuvent encore produire deux cents pour cent à dix ans. On vérifie donc le TRACÉ, aux deux bornes observées et aux durées usuelles 0,25 · 0,5 · 1 · 2 · 3 · 5 · 7 · 10 ans, contre un intervalle de −5 % à 60 %.",
              "THE FITTED CURVE LEAVES PLAUSIBLE RATES. Bounded coefficients can still produce two hundred per cent at ten years. We therefore check the PLOT, at both observed bounds and at the usual maturities 0.25 · 0.5 · 1 · 2 · 3 · 5 · 7 · 10 years, against a range of −5 % to 60 %.",
            ),
          ],
        },
      ],
    },
    {
      id: "zero",
      title: l("Rendement actuariel ou taux zéro-coupon", "Redemption yield or zero-coupon rate"),
      blocks: [
        {
          type: "p",
          text: l(
            "CE QU'ON AJUSTE. Le rendement à l'échéance d'une obligation dépend de son coupon : deux titres de même échéance et de coupons différents n'ont pas le même, et les poser sur une même courbe mélange deux grandeurs. Le taux zéro-coupon z(τ), lui, est celui auquel un franc reçu en τ s'actualise ; il ne dépend que de la durée. C'est lui qui s'appelle proprement une courbe des taux, lui qui sert à valoriser un portefeuille et à fixer le prix d'une émission nouvelle.",
            "WHAT IS FITTED. A bond's yield to maturity depends on its coupon: two securities with the same maturity and different coupons do not share one, and putting them on a single curve mixes two quantities. The zero-coupon rate z(τ) is the one at which a franc received at τ discounts; it depends on maturity alone. It is what a yield curve properly is, what serves to value a portfolio and to price a new issue.",
          ),
        },
        {
          type: "note",
          kind: "info",
          text: l(
            "Image : le rendement actuariel est le prix moyen d'un panier, qui dépend de ce qu'on y a mis. Le zéro-coupon est le prix de chaque article. Nos bons sont zéro-coupon par construction ; les obligations s'y ramènent en actualisant leurs coupons intermédiaires sur la courbe déjà connue. Sur nos pièces l'effet va de moins vingt-quatre à plus cinquante points de base, et le pied du graphique dit combien de titres ont bougé.",
            "An image: the redemption yield is the average price of a basket, which depends on what was put in it. The zero-coupon rate is the price of each item. Our bills are zero-coupon by construction; bonds are reduced to it by discounting their intermediate coupons on the curve already known. On our documents the effect runs from minus twenty-four to plus fifty basis points, and the foot of the chart says how many securities moved.",
          ),
        },
        {
          type: "p",
          text: l(
            "Le calcul est un amorçage itératif, Trésor par Trésor et jamais sur un mélange. On part de z = y. À chaque passage, on interpole la courbe zéro-coupon courante, on retire du prix de chaque obligation la valeur actualisée de ses coupons intermédiaires sur cette courbe, et on déduit le taux du flux terminal : z(τ) = (N / (P − Σ C/(1+z(tᵢ))^tᵢ))^(1/τ) − 1. On recommence jusqu'à ce que plus rien ne bouge au milliardième, dix passages au plus, trois suffisant en pratique parce que le flux terminal domine. Les bons, qui n'ont qu'un flux, ne bougent pas du tout.",
            "The computation is an iterative bootstrap, Treasury by Treasury and never across a mix. We start from z = y. At each pass, the current zero-coupon curve is interpolated, the discounted value of each bond's intermediate coupons on that curve is stripped out of its price, and the terminal cash-flow rate deduced: z(τ) = (N / (P − Σ C/(1+z(tᵢ))^tᵢ))^(1/τ) − 1. We repeat until nothing moves to the billionth, at most ten passes, three being enough in practice because the terminal flow dominates. Bills, which have a single flow, do not move at all.",
          ),
        },
      ],
    },
    {
      id: "zone",
      title: l("L'agrégat CEMAC", "The CEMAC aggregate"),
      blocks: [
        {
          type: "p",
          text: l(
            "Dans la vision des données, la série « CEMAC » est une moyenne arithmétique, à chaque horizon, des taux des TRÉSORS DISTINCTS présents à cet horizon ; un horizon porté par une seule signature est écarté, parce qu'il serait la courbe d'un pays sous le nom de la zone. L'âge affiché est celui du plus ancien composant. Dans la vision du modèle, la série CEMAC n'est pas une moyenne mais un ajustement unique sur les points de tous les pays réunis.",
            "In the data view, the “CEMAC” series is an arithmetic mean, at each horizon, of the rates of the DISTINCT TREASURIES present at that horizon; a horizon carried by a single signature is dropped, because it would be one country's curve under the zone's name. The age shown is that of the oldest component. In the model view, the CEMAC series is not an average but a single fit over all countries' points together.",
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
            [l("une courbe écrêtée", "a clipped curve"), l("le tracé s'arrête aux durées observées : au-delà, le modèle extrapolerait sans donnée", "the plot stops at the observed maturities: beyond them, the model would extrapolate with no data")],
            [l("une bande pâle autour", "a pale band around it"), l("l'intervalle à 95 % : étroit là où les points sont serrés, large là où ils manquent", "the 95 % interval: narrow where points are close, wide where they are missing")],
            [l("un cercle plein", "a filled circle"), l("une séance relue et représentative : plus d'un soumissionnaire, demande couvrant l'offre", "a reviewed and representative session: more than one bidder, demand covering the offer")],
            [l("un cercle creux", "a hollow circle"), l("une séance mince : vraie, mais pas représentative. La marque ne dépend pas du traitement choisi", "a thin session: true, but not representative. The mark does not depend on the chosen treatment")],
            [l("l'opacité d'un point", "a dot's opacity"), l("son poids. Un point presque transparent est ancien, mince, ou les deux", "its weight. An almost transparent dot is old, thin, or both")],
            [l("un trait vertical sous un point", "a vertical tick under a dot"), l("le résidu : l'écart entre l'observation et la courbe ajustée à cette durée", "the residual: the gap between the observation and the fitted curve at that maturity")],
            [l("un pointillé gris nommé BEAC", "a grey dotted line named BEAC"), l("la courbe de la BEAC, relevée dans le tracé de son PDF, rangée par durée d'ÉMISSION et non par vie restante", "the BEAC's curve, read off the vector plot of its PDF, ordered by maturity AT ISSUE and not by life remaining")],
            [l("une valeur grisée dans la table", "a greyed value in the table"), l("un taux extrapolé : aucune séance à cette durée", "an extrapolated rate: no session at that maturity")],
            [l("un tiret dans la table", "a dash in the table"), l("pas une valeur manquante : ce Trésor n'a rien adjugé à cette durée, et aucun chiffre n'est produit pour combler la case", "not a missing value: this Treasury auctioned nothing at that maturity, and no figure is produced to fill the cell")],
          ],
        },
        {
          type: "note",
          kind: "rule",
          text: l(
            "Les deux visions ne sont pas deux styles de la même chose. « Les données » porte des observations relues et se publie ; « La courbe » est produite par un modèle et reste interne. L'écran le dit en quatre endroits, et c'est voulu : on ne diffuse pas une interpolation sous le même nom qu'une mesure.",
            "The two views are not two styles of the same thing. “Data” carries reviewed observations and may be published; “Curve” is produced by a model and stays internal. The screen says so in four places, deliberately: one does not circulate an interpolation under the same name as a measurement.",
          ),
        },
        {
          type: "p",
          text: l(
            "Un repère de densité, affiché en continu : huit horizons distincts ou plus suffisent à une courbe ajustée ; six suffisent tout juste si λ est contraint ; trois donnent une pente mais aucune courbure ; en dessous, c'est une observation et non une courbe.",
            "A density gauge, shown continuously: eight or more distinct horizons are enough for a fitted curve; six are just enough if λ is constrained; three give a slope but no curvature; below that, it is an observation and not a curve.",
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
              "Les lignes déjà remboursées restent tracées, à la vie restante qu'elles avaient le jour de LEUR séance. Les retirer viderait les fenêtres profondes sans rendre la courbe plus vraie ; leur nombre est affiché sous la figure.",
              "Already-redeemed lines stay plotted, at the remaining life they had on the day of THEIR session. Removing them would empty the deep windows without making the curve truer; their number is shown below the figure.",
            ),
            l(
              "Une date d'observation passée est reconstruite avec les données d'aujourd'hui.",
              "A past observation date is rebuilt with today's data.",
            ),
            l(
              "Ce n'est pas la courbe de la BEAC. La sienne porte l'encours rangé par durée d'émission, la nôtre les adjudications rangées par vie restante. Elle dit ce que la dette coûte en moyenne, nous ce que le marché a facturé à la dernière séance.",
              "It is not the BEAC's curve. Hers carries the outstanding stock ordered by maturity at issue, ours the auctions ordered by life remaining. She says what the debt costs on average, we what the market charged at the last session.",
            ),
            l(
              "La vue de zone est une moyenne des Trésors présents à chaque durée. C'est un niveau de zone, jamais un taux auquel quiconque emprunte.",
              "The zone view is an average of the Treasuries present at each maturity. It is a zone level, never a rate at which anyone borrows.",
            ),
            l(
              "Le modèle a trois facteurs, et tout point vient d'une séance signée par une personne. Une lecture automatique non relue n'entre jamais dans la courbe.",
              "The model has three factors, and every point comes from a session signed off by a person. An unreviewed machine reading never enters the curve.",
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
        {
          type: "link",
          href: "/desk/analyses#fusion",
          label: l("L'écran de la courbe", "The curve screen"),
          hint: l("Chaque réglage y porte un « ? » qui dit ce qu'il change.", "Every control there carries a “?” saying what it changes."),
        },
      ],
    },
  ],
};
