import { l, type DocPage } from "./types";

/**
 * La note technique de la courbe des taux.
 *
 * POURQUOI UNE SECONDE PAGE. « courbe-des-taux » est la lettre de méthode,
 * écrite pour un lecteur qui n'est ni statisticien ni obligataire. Celle-ci
 * s'adresse à qui doit REFAIRE le calcul ou le contester : un auditeur, un
 * confrère, un technicien qui reprend le module. Même objet, deux registres,
 * et il vaut mieux deux pages franches qu'une page qui perd les deux lecteurs.
 *
 * Elle cite les formules telles que le code les applique. Quand l'une change
 * dans `nelson-siegel.ts`, `yield.ts`, `curve.ts`, `lecture-b.ts` ou
 * `zero-coupon.ts`, elle change ici le même jour, sans quoi elle devient un
 * document qui a l'air vrai.
 */
export const COURBE_TECHNIQUE: DocPage = {
  slug: "courbe-note-technique",
  title: l("La courbe des taux, note technique", "The yield curve, technical note"),
  summary: l(
    "La chaîne complète, du communiqué d'adjudication au tracé : les trois façons d'obtenir un rendement, la fenêtre, la sélection, la pondération, le modèle de Nelson-Siegel et sa résolution, les trois refus, et comment lire chaque marque du graphique.",
    "The whole chain, from the auction communiqué to the plot: the three ways of obtaining a yield, the window, the selection, the weighting, the Nelson-Siegel model and how it is solved, the three refusals, and how to read every mark on the chart.",
  ),
  visibility: "desk",
  audience: ["desk", "tech", "admin"],
  order: 6,
  checkedOn: "2026-10-08",
  owner: "Georges",
  chapters: [
    {
      id: "objet",
      title: l("L'objet, et ce qu'il n'est pas", "The object, and what it is not"),
      blocks: [
        {
          type: "lead",
          text: l(
            "La courbe associe à chaque durée τ un taux y(τ). La nôtre est estimée sur des adjudications du marché primaire des six Trésors de la CEMAC, signées une à une par une personne du desk. Elle dit donc ce qu'un Trésor a payé pour placer, et non où le papier s'échange ensuite.",
            "The curve maps each maturity τ to a rate y(τ). Ours is estimated on primary-market auctions of the six CEMAC Treasuries, each signed off by a person at the desk. It therefore says what a Treasury paid to place its paper, not where that paper trades afterwards.",
          ),
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "La distinction n'est pas de forme. Une adjudication porte une concession d'émission : le Trésor paie un peu plus que le marché secondaire ne demanderait, pour être sûr de placer. Une courbe primaire est donc structurellement au-dessus d'une courbe secondaire, et la comparer à une courbe de marché d'un autre pays sans le dire serait une faute.",
            "The distinction is not cosmetic. An auction carries an issuance concession: the Treasury pays slightly more than the secondary market would ask, to be sure of placing. A primary curve therefore sits structurally above a secondary one, and comparing it with another country's market curve without saying so would be an error.",
          ),
        },
        {
          type: "p",
          text: l(
            "La cote de la BVMAC n'entre pas dans la courbe. Elle alimente les panneaux de liquidité et de fraîcheur, plus bas sur la même page, et sert à juger si un cours coté peut servir de référence. Le choix est documenté sous le nom de « lecture B » : nous n'avons pas de marché secondaire liquide, il n'existe donc pas de rendement vivant à observer un jour donné.",
            "The BVMAC listing does not enter the curve. It feeds the liquidity and freshness panels further down the same page, and serves to judge whether a listed price can be used as a reference. The choice is documented as “reading B”: we have no liquid secondary market, so there is no live yield to observe on a given day.",
          ),
        },
      ],
    },
    {
      id: "observation",
      title: l("D'un communiqué à une observation", "From a communiqué to an observation"),
      blocks: [
        {
          type: "p",
          text: l(
            "Une observation est un couple (τ, y) assorti d'un poids. L'abscisse τ est la VIE RESTANTE au jour de la séance, exprimée en années, et non la durée annoncée de la ligne. Un abondement d'une obligation à six ans peut n'avoir que dix-huit mois devant lui : l'actualiser sur six ans donne un rendement faux de plusieurs centaines de points de base. L'échéance imprimée passe donc devant l'étiquette, et le calcul dit laquelle des deux a servi.",
            "An observation is a pair (τ, y) together with a weight. The abscissa τ is the REMAINING LIFE on the day of the session, in years, not the announced tenor of the line. A tap of a six-year bond may have only eighteen months left: discounting it over six years gives a yield wrong by several hundred basis points. The printed maturity therefore takes precedence over the label, and the computation states which of the two was used.",
          ),
        },
        {
          type: "p",
          text: l(
            "L'ordonnée y s'obtient de trois façons, dans cet ordre de préférence, et l'écran nomme toujours celle qui a servi.",
            "The ordinate y is obtained in three ways, in this order of preference, and the screen always names the one that was used.",
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
              "TAUX PRÉCOMPTÉ, pour les bons (BTA). Le Trésor annonce un taux d'escompte d sur n jours. Le prix vaut P = 1 − d·n/360, et le rendement actuariel équivalent y = (1/P)^(365/n) − 1. Escompte exact/360, capitalisation exact/365 : la convention est écrite à côté du chiffre. Les jours n sont les jours RESTANTS quand l'échéance est imprimée, pas la durée nominale : le Trésor gabonais a adjugé le même jour quatre lignes de treize semaines dont deux à vingt-trois et trente-sept jours du terme.",
              "DISCOUNT RATE, for bills (BTA). The Treasury announces a discount rate d over n days. The price is P = 1 − d·n/360, and the equivalent actuarial yield y = (1/P)^(365/n) − 1. Discount actual/360, compounding actual/365: the convention is written beside the figure. The days n are the REMAINING days when the maturity is printed, not the nominal tenor: the Gabonese Treasury auctioned four thirteen-week lines on the same day, two of them twenty-three and thirty-seven days from term.",
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
      title: l("La fenêtre : date d'observation et profondeur", "The window: observation date and depth"),
      blocks: [
        {
          type: "p",
          text: l(
            "Soit D la date d'observation et P la profondeur en jours. Une séance datée s est retenue si et seulement si 0 ≤ D − s ≤ P. La première inégalité est la plus importante et la plus souvent mal lue : tout ce qui s'est adjugé APRÈS D est hors champ, non pas déprécié mais absent. Reculer la date d'observation ne donne aucune priorité aux séances anciennes ; cela supprime les récentes.",
            "Let D be the observation date and P the depth in days. A session dated s is kept if and only if 0 ≤ D − s ≤ P. The first inequality is the most important and the most often misread: everything auctioned AFTER D is out of scope, not discounted but absent. Moving the observation date back gives no priority to older sessions; it removes the recent ones.",
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
          type: "note",
          kind: "warn",
          text: l(
            "La reconstruction d'une date passée se fait avec LES DONNÉES D'AUJOURD'HUI. Une séance relue la semaine dernière y figure ; une séance que nous n'avions pas encore ramassée à l'époque y figure aussi. C'est la courbe de ce jour-là vue d'ici, et non ce que nous en savions alors : la distinction compte si l'on veut juger une décision prise à l'époque.",
            "Rebuilding a past date uses TODAY's data. A session re-read last week appears in it; so does a session we had not yet collected at the time. It is that day's curve seen from here, not what we knew then: the distinction matters if one wants to judge a decision made at the time.",
          ),
        },
        {
          type: "p",
          text: l(
            "Si aucune séance de la tranche ne porte une durée donnée, il n'y a pas de point à cette durée, et rien ne le remplace. La courbe ajustée peut passer au-dessus de ce vide, mais c'est alors une extrapolation, signalée comme telle : le tracé est écrêté aux durées réellement observées et les cases extrapolées du tableau sont grisées.",
            "If no session in the slice carries a given maturity, there is no point at that maturity, and nothing replaces it. The fitted curve may pass over that void, but it is then an extrapolation, flagged as such: the plot is clipped to the maturities actually observed and the extrapolated table cells are greyed out.",
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
            "Rien ne se moyenne jamais entre deux dates du même pays : la plus récente est le marché, l'autre est de l'histoire. La seule moyenne de la page est la série agrégée « CEMAC » de la vision des données, décrite plus bas.",
            "Nothing is ever averaged between two dates of the same country: the most recent is the market, the other is history. The only average on the page is the aggregated “CEMAC” series of the data view, described below.",
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
      title: l("Les poids", "The weights"),
      blocks: [
        {
          type: "p",
          text: l(
            "Le poids d'une observation est w = 0,5^(a/H) × m, où a est l'âge de la séance en jours, H la demi-vie choisie, et m le traitement des séances minces. Avec H = 180 jours : aujourd'hui 1,00 ; trois mois 0,71 ; six mois 0,50 ; un an 0,25 ; deux ans 0,063 ; trois ans 0,016. Une séance de trois ans pèse donc un soixantième d'une séance du jour. L'option « jamais » pose H absent et w = 1 pour toutes.",
            "An observation's weight is w = 0.5^(a/H) × m, where a is the session's age in days, H the chosen half-life, and m the treatment of thin sessions. With H = 180 days: today 1.00; three months 0.71; six months 0.50; one year 0.25; two years 0.063; three years 0.016. A three-year-old session therefore weighs one sixtieth of today's. The “never” option sets no H and w = 1 for all.",
          ),
        },
        {
          type: "p",
          text: l(
            "Une séance est MINCE si elle a au plus un soumissionnaire, ou si la demande n'a pas couvert le montant offert — le taux de couverture étant celui que le Trésor publie, à défaut le rapport des montants soumis sur annoncés. Le chiffre reste vrai ; il cesse d'être représentatif, parce que c'est le prix d'une contrepartie et non d'un marché. Le facteur m vaut 1 pour « à part entière », 0,35 pour « sous-pondérée », 0 pour « écartée ».",
            "A session is THIN if it has at most one bidder, or if demand did not cover the amount offered — the coverage ratio being the one the Treasury publishes, failing that the ratio of bids to the announced amount. The figure remains true; it stops being representative, because it is the price of one counterparty and not of a market. The factor m is 1 for “in full”, 0.35 for “under-weighted”, 0 for “set aside”.",
          ),
        },
        {
          type: "note",
          kind: "rule",
          text: l(
            "La pondération ne choisit aucun point : la sélection a eu lieu avant, côté serveur, et ne dépend d'aucun bouton. Le poids ne change que combien chaque point tire sur la courbe ajustée. Seule l'option « écartée » retire effectivement un point du tracé ajusté, et elle est aussi la seule qui puisse, en faisant tomber le nombre de durées distinctes sous quatre, empêcher la courbe d'exister.",
            "Weighting chooses no point: the selection happened earlier, server-side, and depends on no button. The weight only changes how hard each point pulls on the fitted curve. Only the “set aside” option actually removes a point from the fitted plot, and it is also the only one that can, by dropping the number of distinct maturities below four, prevent the curve from existing at all.",
          ),
        },
      ],
    },
    {
      id: "modele",
      title: l("Le modèle, et pourquoi il se résout exactement", "The model, and why it solves exactly"),
      blocks: [
        {
          type: "lead",
          text: l(
            "y(τ) = β₀ + β₁·f₁(τ) + β₂·f₂(τ), avec f₁ = (1 − e^(−τ/λ)) / (τ/λ) et f₂ = f₁ − e^(−τ/λ).",
            "y(τ) = β₀ + β₁·f₁(τ) + β₂·f₂(τ), with f₁ = (1 − e^(−τ/λ)) / (τ/λ) and f₂ = f₁ − e^(−τ/λ).",
          ),
        },
        {
          type: "list",
          items: [
            l("β₀ est le niveau long : la valeur vers laquelle la courbe tend quand τ croît, puisque f₁ et f₂ tendent vers zéro.", "β₀ is the long level: the value the curve tends to as τ grows, since f₁ and f₂ tend to zero."),
            l("β₁ est la pente. f₁ vaut 1 en zéro et s'éteint avec la durée, donc β₀ + β₁ est le taux instantané, lu sous la plus courte durée observée.", "β₁ is the slope. f₁ equals 1 at zero and dies away with maturity, so β₀ + β₁ is the instantaneous rate, read below the shortest observed maturity."),
            l("β₂ est la courbure : l'ampleur du creux ou de la bosse du milieu. f₂ vaut 0 en zéro, atteint son maximum vers τ ≈ 1,79 λ, puis redescend.", "β₂ is the curvature: the size of the dip or hump in the middle. f₂ is 0 at zero, peaks around τ ≈ 1.79 λ, then falls back."),
            l("λ, en années, dit OÙ cette courbure se place. C'est le seul paramètre non linéaire.", "λ, in years, says WHERE that curvature sits. It is the only non-linear parameter."),
          ],
        },
        {
          type: "p",
          text: l(
            "La limite en τ → 0 est traitée explicitement : f₁ = 1 et f₂ = 0, pour éviter la forme indéterminée 0/0 du quotient.",
            "The limit as τ → 0 is handled explicitly: f₁ = 1 and f₂ = 0, to avoid the indeterminate 0/0 form of the quotient.",
          ),
        },
        {
          type: "p",
          text: l(
            "Le point qui rend la chose praticable : À λ FIXÉ, LE MODÈLE EST LINÉAIRE EN β. En posant x(τ) = (1, f₁(τ), f₂(τ)), l'ajustement est une régression par moindres carrés pondérés : on minimise Σ wᵢ (yᵢ − x(τᵢ)ᵀβ)², dont la solution est β = (XᵀWX)⁻¹ XᵀWy. La matrice XᵀWX est de taille 3×3 : on l'accumule en un passage sur les observations et on la résout par élimination de Gauss-Jordan avec pivot partiel, ce qui rend au passage son inverse. Aucun optimiseur, aucun point de départ à deviner, aucune divergence possible. C'est la méthode des banques centrales.",
            "The point that makes this practical: WITH λ FIXED, THE MODEL IS LINEAR IN β. Setting x(τ) = (1, f₁(τ), f₂(τ)), the fit is a weighted least-squares regression: we minimise Σ wᵢ (yᵢ − x(τᵢ)ᵀβ)², whose solution is β = (XᵀWX)⁻¹ XᵀWy. The matrix XᵀWX is 3×3: it is accumulated in one pass over the observations and solved by Gauss-Jordan elimination with partial pivoting, which also returns its inverse. No optimiser, no starting point to guess, no possible divergence. This is the central banks' method.",
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
            "λ étant le seul paramètre non linéaire, on le balaie. La grille compte 80 valeurs en progression géométrique entre deux bornes déduites des durées observées : lo = max(0,05 ; τ_min / 1,79 / 1,5) et hi = max(1,2·lo ; 1,5 · τ_max / 1,79). Pour chaque λ on résout le 3×3 et on retient la somme des carrés résiduels la plus faible.",
            "λ being the only non-linear parameter, it is swept. The grid has 80 geometrically spaced values between two bounds derived from the observed maturities: lo = max(0.05, τ_min / 1.79 / 1.5) and hi = max(1.2·lo, 1.5 · τ_max / 1.79). For each λ the 3×3 is solved and the lowest residual sum of squares is kept.",
          ),
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "POURQUOI LES BORNES. Un λ qui place la bosse 1,79 λ hors de l'intervalle observé n'est pas identifiable : sur cet intervalle f₁ et f₂ deviennent presque colinéaires, et β₀ et β₁ peuvent diverger en sens contraire sans que la courbe ajustée bouge. Ce n'est pas une crainte théorique : avec une grille libre jusqu'à six ans, nos données donnaient β₀ = −628 pour le Gabon et β₀ = −821 pour le Congo. Le remède est de borner λ pour que la bosse reste dans les durées observées, ce qui est une correction de spécification et non un bricolage.",
            "WHY THE BOUNDS. A λ that places the hump 1.79 λ outside the observed interval is not identifiable: over that interval f₁ and f₂ become nearly collinear, and β₀ and β₁ can diverge in opposite directions without the fitted curve moving. This is not a theoretical worry: with a free grid up to six years, our data gave β₀ = −628 for Gabon and β₀ = −821 for Congo. The remedy is to bound λ so the hump stays within the observed maturities, which is a specification fix and not a patch.",
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
            "L'option « courbure de la zone » impose λ au lieu de le calibrer : le λ ajusté sur l'ensemble des Trésors est passé en contrainte, la grille et la recherche ternaire sont court-circuitées, et seuls β₀, β₁, β₂ sont estimés. Un Trésor qui n'apporte que six durées n'a pas de quoi trouver sa propre courbure, mais il a de quoi se placer sur celle de la zone. L'hypothèse sous-jacente — même forme du coût du temps pour six signatures d'une même monnaie — tient à court terme, où les écarts restent sous vingt points de base, et cesse de tenir au-delà de deux ans, où ils se comptent en centaines.",
            "The “zone curvature” option imposes λ instead of calibrating it: the λ fitted across all Treasuries is passed as a constraint, the grid and ternary search are bypassed, and only β₀, β₁, β₂ are estimated. A Treasury bringing only six maturities has no way of finding its own curvature, but it has enough to place itself on the zone's. The underlying assumption — the same shape of the cost of time for six signatures in one currency — holds at the short end, where spreads stay under twenty basis points, and stops holding beyond two years, where they run into hundreds.",
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
            l("L'écart type des résidus, RMSE = √(SCR / n) × 100, en points de base : ce dont la courbe s'écarte des points observés.", "The residual standard error, RMSE = √(RSS / n) × 100, in basis points: how far the curve sits from the observed points."),
            l("Le demi-intervalle de confiance à 95 % : b(τ) = 1,96 · √(σ̂² · x(τ)ᵀ (XᵀWX)⁻¹ x(τ)), avec σ̂² = SCR / (n − 3), le dénominateur étant les degrés de liberté et non l'effectif.", "The 95 % half-confidence interval: b(τ) = 1.96 · √(σ̂² · x(τ)ᵀ (XᵀWX)⁻¹ x(τ)), with σ̂² = RSS / (n − 3), the denominator being the degrees of freedom and not the sample size."),
            l("Les bornes des durées réellement observées, qui séparent l'interpolation de l'extrapolation.", "The bounds of the maturities actually observed, which separate interpolation from extrapolation."),
          ],
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
            "Un ajustement qui n'aboutit pas rend une raison nommée, affichée à l'écran, et non une figure vide. Les trois gardes se déclenchent dans cet ordre.",
            "A fit that does not succeed returns a named reason, shown on screen, rather than an empty figure. The three guards fire in this order.",
          ),
        },
        {
          type: "steps",
          items: [
            l(
              "MOINS DE QUATRE DURÉES DISTINCTES. Trois paramètres plus un degré de liberté pour estimer le bruit : en dessous il n'y a pas de résidu, donc pas de bande, donc rien à publier.",
              "FEWER THAN FOUR DISTINCT MATURITIES. Three parameters plus one degree of freedom to estimate the noise: below that there is no residual, hence no band, hence nothing to publish.",
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
      title: l("Le dépouillement zéro-coupon", "Stripping to zero-coupon"),
      blocks: [
        {
          type: "p",
          text: l(
            "Le rendement actuariel dépend du coupon du titre : deux obligations de même échéance mais de coupons différents n'ont pas le même, et les poser sur une même courbe mélange deux grandeurs. Le taux zéro-coupon z(τ) est celui auquel un franc reçu en τ s'actualise ; il ne dépend que de la durée, et c'est lui qu'on appelle proprement une courbe des taux.",
            "Yield to maturity depends on the security's coupon: two bonds with the same maturity but different coupons do not share one, and putting them on a single curve mixes two quantities. The zero-coupon rate z(τ) is the one at which a franc received at τ discounts; it depends on maturity alone, and that is what is properly called a yield curve.",
          ),
        },
        {
          type: "p",
          text: l(
            "On l'obtient par amorçage itératif, Trésor par Trésor et jamais sur un mélange. On part de z = y. À chaque passage, on interpole la courbe zéro-coupon courante, on retire du prix de chaque obligation la valeur actualisée de ses coupons intermédiaires sur cette courbe, et on déduit le taux du flux terminal : z(τ) = (N / (P − Σ C/(1+z(tᵢ))^tᵢ))^(1/τ) − 1. On recommence jusqu'à ce que plus rien ne bouge au milliardième, dix passages au plus, trois suffisant en pratique parce que le flux terminal domine. Les bons, qui n'ont qu'un flux, ne bougent pas du tout.",
            "It is obtained by iterative bootstrapping, Treasury by Treasury and never across a mix. We start from z = y. At each pass, the current zero-coupon curve is interpolated, the discounted value of each bond's intermediate coupons on that curve is stripped out of its price, and the terminal cash-flow rate is deduced: z(τ) = (N / (P − Σ C/(1+z(tᵢ))^tᵢ))^(1/τ) − 1. We repeat until nothing moves to the billionth, at most ten passes, three being enough in practice because the terminal flow dominates. Bills, which have a single flow, do not move at all.",
          ),
        },
        {
          type: "note",
          kind: "info",
          text: l(
            "Le pied du graphique dit combien de titres ont été déplacés et de combien de points de base. Un dépouillement qui ne déplace rien signale un marché de bons, pas une erreur.",
            "The foot of the chart says how many securities moved and by how many basis points. A stripping that moves nothing signals a bill market, not an error.",
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
      id: "lecture",
      title: l("Lire le graphique", "Reading the chart"),
      blocks: [
        {
          type: "table",
          head: [l("Marque", "Mark"), l("Ce qu'elle dit", "What it says")],
          rows: [
            [l("Disque plein", "Filled disc"), l("Une séance représentative : plus d'un soumissionnaire et demande couvrant l'offre.", "A representative session: more than one bidder and demand covering the offer.")],
            [l("Cercle creux", "Hollow circle"), l("Une séance mince. Le chiffre est vrai, il n'est pas représentatif. La marque ne dépend pas du traitement choisi.", "A thin session. The figure is true, it is not representative. The mark does not depend on the chosen treatment.")],
            [l("Opacité du point", "Dot opacity"), l("Son poids. Un point presque transparent est ancien, mince, ou les deux.", "Its weight. An almost transparent dot is old, thin, or both.")],
            [l("Trait vertical sous un point", "Vertical tick under a dot"), l("Le résidu : l'écart entre l'observation et la courbe ajustée à cette durée.", "The residual: the gap between the observation and the fitted curve at that maturity.")],
            [l("Bande autour de la courbe", "Band around the curve"), l("L'intervalle de confiance à 95 %. Large où l'on extrapole, serrée où les points abondent.", "The 95 % confidence interval. Wide where one extrapolates, tight where points abound.")],
            [l("Courbe écrêtée", "Clipped curve"), l("Le tracé s'arrête aux durées observées : au-delà, le modèle extrapolerait sans donnée.", "The plot stops at the observed maturities: beyond them, the model would extrapolate with no data.")],
            [l("Pointillé en filigrane", "Dotted watermark"), l("La courbe que la BEAC publie elle-même, relevée dans le tracé de son PDF. Mesure étrangère, et son abscisse est la durée d'émission, pas la vie restante.", "The curve the BEAC publishes itself, read off the vector plot of its PDF. A foreign measurement, and its abscissa is the issue tenor, not the remaining life.")],
            [l("Case grisée du tableau", "Greyed table cell"), l("Une durée hors des bornes observées : un chiffre extrapolé, pas une mesure.", "A maturity outside the observed bounds: an extrapolated figure, not a measurement.")],
            [l("Tiret dans le tableau", "Dash in the table"), l("Pas une valeur manquante : ce Trésor n'a rien adjugé à cette durée, et aucun chiffre n'est produit pour combler la case.", "Not a missing value: this Treasury auctioned nothing at that maturity, and no figure is produced to fill the cell.")],
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
      title: l("Limites, en clair", "Limits, plainly"),
      blocks: [
        {
          type: "list",
          items: [
            l("Marché primaire : la courbe porte une concession d'émission et n'est pas une courbe secondaire.", "Primary market: the curve carries an issuance concession and is not a secondary curve."),
            l("Les lignes déjà remboursées restent tracées, à la vie restante qu'elles avaient le jour de LEUR séance. Les retirer viderait les fenêtres profondes sans rendre la courbe plus vraie ; leur nombre est affiché.", "Already-redeemed lines stay plotted, at the remaining life they had on the day of THEIR session. Removing them would empty the deep windows without making the curve truer; their number is shown."),
            l("Une date d'observation passée est reconstruite avec les données d'aujourd'hui.", "A past observation date is rebuilt with today's data."),
            l("Le modèle de Nelson-Siegel a trois facteurs. Svensson, qui en a six, a été écarté : nos durées ne l'identifient pas.", "The Nelson-Siegel model has three factors. Svensson, which has six, was rejected: our maturities do not identify it."),
            l("Tout point vient d'une séance signée par une personne. Une lecture automatique non relue n'entre jamais dans la courbe.", "Every point comes from a session signed off by a person. An unreviewed machine reading never enters the curve."),
          ],
        },
        {
          type: "link",
          href: "/desk/docs/courbe-des-taux",
          label: l("La courbe des taux, expliquée", "The yield curve, explained"),
          hint: l("La même matière sans formules, pour un lecteur qui n'est ni statisticien ni obligataire.", "The same material without formulas, for a reader who is neither a statistician nor a bond specialist."),
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
