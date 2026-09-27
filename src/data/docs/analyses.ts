import { l, type DocPage } from "./types";

/**
 * The methodology and the procedure behind the desk's market analyses: where a
 * yield comes from, what the curve refuses to draw, how the secondary market is
 * measured, and what has to be true before any of it leaves the desk.
 */
export const ANALYSES: DocPage = {
  slug: "analyses",
  title: l("Analyses de marché : méthode et procédure", "Market analyses: method and procedure"),
  summary: l(
    "D'où vient un rendement, ce que la courbe refuse de tracer, comment se mesure la liquidité, et ce qui doit être vrai avant qu'un chiffre quitte le desk.",
    "Where a yield comes from, what the curve refuses to draw, how liquidity is measured, and what must be true before any figure leaves the desk.",
  ),
  visibility: "desk",
  audience: ["desk", "admin"],
  order: 4,
  checkedOn: "2026-09-27",
  owner: "Georges",
  chapters: [
    {
      id: "pourquoi",
      title: l("Ce que ces pages font, et ce qu'elles ne font pas", "What these pages do, and what they do not"),
      blocks: [
        {
          type: "lead",
          text: l(
            "Six États de la CEMAC empruntent au même guichet et aucun ne publie sa courbe des taux. La BEAC publie les résultats de chaque séance, la BVMAC publie un bulletin par jour : la matière existe, elle est publique, et personne ne la met en forme. Ces pages la mettent en forme.",
            "Six CEMAC states borrow at the same window and none publishes its yield curve. The BEAC publishes the results of every auction, the BVMAC a bulletin every day: the material exists, it is public, and nobody puts it in order. These pages put it in order.",
          ),
        },
        {
          type: "p",
          text: l(
            "Elles ne produisent aucun conseil et ne portent aucune recommandation. Une courbe dit le coût de l'argent souverain à chaque horizon ; ce que l'on en fait pour un client relève de la relation, pas de la mesure.",
            "They produce no advice and carry no recommendation. A curve states the cost of sovereign money at each horizon; what is made of it for a client belongs to the relationship, not to the measurement.",
          ),
        },
        { type: "link", href: "/desk/courbe", label: l("La courbe des taux", "The yield curve"), hint: l("Une durée, un point, par Trésor.", "One tenor, one point, per Treasury.") },
        { type: "link", href: "/desk/analyses", label: l("Le dossier d'analyses", "The analysis file"), hint: l("Pression, exécution, liquidité, fraîcheur, pont.", "Pressure, execution, liquidity, freshness, bridge.") },
        { type: "link", href: "/desk/adjudications/tableau", label: l("Toutes les séances", "Every session"), hint: l("La table de contrôle de la relecture.", "The control table of the review.") },
      ],
    },
    {
      id: "rendement",
      title: l("D'où vient un rendement", "Where a yield comes from"),
      blocks: [
        {
          type: "p",
          text: l(
            "Un bon du Trésor s'adjuge à un taux, une obligation à un prix, et les deux ne se posent pas sur le même axe. Trois chemins mènent à un rendement comparable, et ils ne se valent pas : le premier qui aboutit est retenu, et il est nommé à côté du chiffre.",
            "A Treasury bill is auctioned at a rate, a bond at a price, and the two do not sit on the same axis. Three routes lead to a comparable yield, and they are not equal: the first that succeeds is used, and it is named beside the figure.",
          ),
        },
        {
          type: "table",
          head: [l("Origine", "Origin"), l("Quand", "When"), l("Ce qui est supposé", "What is assumed")],
          rows: [
            [
              l("Imprimé", "Printed"),
              l("Le Trésor publie un « taux de rendement moyen pondéré » à côté des prix. Le Cameroun le fait.", "The Treasury publishes a weighted average yield beside the prices. Cameroon does."),
              l("Rien. C'est la meilleure des sources.", "Nothing. It is the best source."),
            ],
            [
              l("Prix et coupon", "Price and coupon"),
              l("Obligation : le prix adjugé et le taux d'intérêt facial donnent le rendement actuariel, par dichotomie.", "Bond: the auctioned price and the coupon rate give the actuarial yield, by bisection."),
              l("Coupon annuel, capital remboursé en une fois à l'échéance.", "Annual coupon, principal repaid in one instalment at maturity."),
            ],
            [
              l("Taux précompté", "Discount rate"),
              l("Bon : le taux affiché est un escompte, pas un rendement, et il est toujours le plus petit des deux.", "Bill: the quoted rate is a discount, not a yield, and always the smaller of the two."),
              l("Escompte en exact/360, capitalisation en exact/365.", "Discount on exact/360, compounding on exact/365."),
            ],
          ],
        },
        {
          type: "note",
          kind: "rule",
          text: l(
            "Un prix d'obligation sans coupon ne donne aucun rendement. Le même 95,00 % peut valoir 7 % comme 12 % selon ce que la ligne paie : le combler par un coupon moyen donnerait une courbe lisse et fausse, dont personne ne verrait qu'elle est fausse. La séance reste alors sans point, et la page compte le trou.",
            "A bond price without a coupon gives no yield. The same 95.00 % can be 7 % or 12 % depending on what the line pays: filling it with an average coupon would give a smooth, false curve that nobody could see was false. The session then has no point, and the page counts the gap.",
          ),
        },
        {
          type: "p",
          text: l(
            "L'écart entre un taux précompté et le rendement qu'il procure n'est pas un détail : sur un bon à 52 semaines adjugé à 6,97 %, il dépasse soixante points de base, et il grandit avec la durée. Comparer un taux de bon à un rendement d'obligation sans convertir aplatit la courbe précisément là où elle se lit.",
            "The gap between a discount rate and the yield it produces is not a detail: on a 52-week bill auctioned at 6.97 %, it exceeds sixty basis points, and it grows with the tenor. Comparing a bill rate to a bond yield without converting flattens the curve exactly where it is read.",
          ),
        },
        {
          type: "p",
          text: l(
            "Quand le Trésor exprime le prix moyen en francs par titre (9 899,45) plutôt qu'en pourcentage, la conversion se fait sur une valeur nominale de 10 000 francs. C'est une hypothèse, elle est déclarée avec le chiffre, et elle se vérifie sur la pièce.",
            "When the Treasury states the average price in francs per security (9,899.45) rather than as a percentage, the conversion uses a nominal value of 10,000 francs. That is an assumption, declared with the figure, and checked against the document.",
          ),
        },
      ],
    },
    {
      id: "courbe",
      title: l("Ce que la courbe refuse de faire", "What the curve refuses to do"),
      blocks: [
        {
          type: "list",
          items: [
            l(
              "Elle n'utilise que des séances relues par une personne. Une lecture automatique peut porter un 7,00 % lu de travers sur un scan ; devenue point de courbe, elle se propagerait à toutes les indications du desk.",
              "It uses only sessions reviewed by a person. An automatic reading can carry a 7.00 % misread from a scan; as a curve point it would propagate to every indication the desk gives.",
            ),
            l(
              "Une durée, un point, le plus récent. Deux séances de même durée à quinze jours d'écart ne se moyennent pas : la plus récente est le marché, l'autre est de l'histoire, et l'histoire se lit dans une série.",
              "One tenor, one point, the most recent. Two sessions of the same tenor a fortnight apart are not averaged: the later one is the market, the other is history, and history is read in a series.",
            ),
            l(
              "Une séance représentative passe devant une séance récente. Un bon servi à un seul soumissionnaire dit ce que cette contrepartie voulait, pas ce que le marché demandait ; le point est tracé creux.",
              "A representative session comes before a recent one. A bill served to a single bidder says what that counterparty wanted, not what the market asked; the point is drawn hollow.",
            ),
            l(
              "Rien ne se moyenne entre deux Trésors. L'écart entre deux signatures est exactement ce que la courbe sert à lire.",
              "Nothing is averaged across Treasuries. The gap between two signatures is exactly what the curve exists to show.",
            ),
            l(
              "Sous deux durées, un Trésor n'est pas tracé : une observation n'est pas une courbe. Elle figure quand même au tableau.",
              "Below two tenors a Treasury is not drawn: an observation is not a curve. It still appears in the table.",
            ),
          ],
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "L'écart entre deux Trésors porte toujours le nombre de jours qui sépare leurs deux séances. Au-delà d'un mois, ce n'est pas un écart de crédit, c'est un écart de date, et l'écran le dit au lieu de le laisser croire.",
            "The gap between two Treasuries always carries the number of days between their two sessions. Beyond a month it is not a credit spread, it is a date spread, and the screen says so rather than letting it pass.",
          ),
        },
      ],
    },
    {
      id: "secondaire",
      title: l("Le marché secondaire, mesuré", "The secondary market, measured"),
      blocks: [
        {
          type: "p",
          text: l(
            "« Marché étroit » est une opinion ; la part des couples ligne-séance où quelque chose s'est échangé est une mesure, et elle ne dépend d'aucune hypothèse. Elle se calcule sur les bulletins déjà lus, sans donnée nouvelle.",
            "“Narrow market” is an opinion; the share of line-session pairs where something traded is a measurement, and it depends on no assumption. It is computed from bulletins already read, with no new data.",
          ),
        },
        {
          type: "list",
          items: [
            l("La part traitée : séances où la ligne a traité, sur séances où elle était cotée.", "Traded share: sessions where the line traded, over sessions where it was quoted."),
            l("Les séances muettes : celles où aucune ligne de la cote n'a traité.", "Mute sessions: those where no line on the board traded at all."),
            l("La dormance : les jours écoulés depuis la dernière transaction d'une ligne. Une ligne qui n'a jamais traité n'a pas une dormance de zéro, elle n'en a pas.", "Dormancy: days since a line's last trade. A line that never traded does not have a dormancy of zero, it has none."),
          ],
        },
        {
          type: "note",
          kind: "rule",
          text: l(
            "Un niveau d'indice ne se publie pas sans sa fraîcheur. L'indice n'est pas faux parce que ses composantes dorment : il est calculé sur des cours qui datent, et la seule faute serait de publier le niveau sans publier cela. La phrase à reprendre est écrite sur la page d'analyses, elle se copie telle quelle.",
            "An index level is not published without its freshness. The index is not wrong because its components are dormant: it is computed on stale prices, and the only fault would be to publish the level without publishing that. The sentence to reuse is written on the analysis page and copies as it stands.",
          ),
        },
        {
          type: "p",
          text: l(
            "La fraîcheur se compte en nombre de composantes et non en capitalisation, faute d'une pondération publiée par la bourse. L'approximation va dans le sens de la prudence : une grosse ligne dormante pèse plus que ce compte ne le montre. Elle se lèvera avec la note méthodologique de la BVMAC.",
            "Freshness is counted in components and not in capitalisation, for want of a weighting published by the exchange. The approximation errs on the safe side: a large dormant line weighs more than this count shows. It will be lifted with the BVMAC methodology note.",
          ),
        },
      ],
    },
    {
      id: "pont",
      title: l("Le pont primaire / secondaire", "The primary / secondary bridge"),
      blocks: [
        {
          type: "p",
          text: l(
            "Un Trésor place une obligation à 95,00 % un lundi ; la même semaine, la cote affiche 100,00 % pour une de ses lignes déjà émises. Les deux chiffres sont vrais : l'un est un prix payé par des banques en concurrence, l'autre un prix de référence reporté de séance en séance sur une ligne qui n'a jamais traité.",
            "A Treasury places a bond at 95.00 % on a Monday; the same week the board shows 100.00 % for one of its outstanding lines. Both figures are true: one is a price paid by competing banks, the other a reference price carried forward session after session on a line that never traded.",
          ),
        },
        {
          type: "list",
          items: [
            l("L'écart est en points de prix et jamais en rendement : un écart de rendement demanderait le coupon des deux côtés.", "The gap is in price points and never in yield: a yield gap would require the coupon on both sides."),
            l("La ligne cotée porte sa dormance dans la même rangée que l'écart.", "The quoted line carries its dormancy in the same row as the gap."),
            l("Le rapprochement se fait sur le nom de l'émetteur tel que le bulletin l'imprime, déclaré en clair dans le code. Un Trésor absent de cette table n'a pas de pont, et c'est plus honnête qu'un rapprochement deviné.", "The match is on the issuer name as the bulletin prints it, declared in plain sight in the code. A Treasury absent from that table has no bridge, which is more honest than a guessed match."),
          ],
        },
      ],
    },
    {
      id: "procedure",
      title: l("La procédure, de la séance à la note", "The procedure, from session to note"),
      blocks: [
        {
          type: "steps",
          items: [
            l("Le robot relève l'index de la BEAC et crée la séance : pays, instrument, durée, date, et le communiqué rapatrié dans le dépôt. Il ne confirme jamais.", "The robot reads the BEAC index and creates the session: country, instrument, tenor, date, and the communiqué kept in the repository. It never confirms."),
            l("La lecture automatique remplit les champs vides depuis le communiqué, et n'écrase jamais une correction faite à la main. La séance passe à « à relire ».", "Automatic reading fills the empty fields from the communiqué and never overwrites a correction made by hand. The session moves to “to review”."),
            l("Une personne ouvre la séance, la pièce à côté, vérifie chaque chiffre, relève le coupon si l'obligation en porte un, puis confirme. La séance passe à « relue » et devient utilisable.", "A person opens the session with the document beside it, checks every figure, notes the coupon if the bond carries one, then confirms. The session becomes “reviewed” and usable."),
            l("La courbe et le dossier d'analyses se recalculent seuls : aucune saisie ne s'y fait, et aucun chiffre n'y est recopié à la main.", "The curve and the analysis file recompute on their own: nothing is typed there, and no figure is copied by hand."),
            l("Avant de publier, on lit la colonne « publiable / interne » de chaque panneau. Une mesure interne ne sort pas telle quelle, et la raison se lève par du travail, pas par une décision.", "Before publishing, read each panel's “publishable / internal” column. An internal measurement does not leave as it stands, and the reason is lifted by work, not by a decision."),
            l("Une note qui sort passe par Publications, où elle prend un numéro, une version et une trace au journal.", "A note that goes out passes through Publications, where it takes a number, a version and a trace in the journal."),
          ],
        },
        {
          type: "table",
          head: [l("Panneau", "Panel"), l("Sort du desk quand", "Leaves the desk when")],
          rows: [
            [l("La courbe souveraine", "The sovereign curve"), l("Deux Trésors au moins portent chacun deux durées relues.", "At least two Treasuries each carry two reviewed tenors.")],
            [l("La pression de la demande", "Demand pressure"), l("L'année porte au moins cinq séances relues.", "The year carries at least five reviewed sessions.")],
            [l("L'exécution du programme", "Programme execution"), l("La série des séances d'un Trésor est complète sur l'année : sinon ce n'est pas son programme, c'est notre échantillon.", "A Treasury's series is complete over the year: otherwise it is not its programme, it is our sample.")],
            [l("La liquidité du secondaire", "Secondary liquidity"), l("Toujours : elle ne repose sur aucune hypothèse.", "Always: it rests on no assumption.")],
            [l("La fraîcheur de l'indice", "Index freshness"), l("Toujours, et jamais séparée du niveau qu'elle qualifie.", "Always, and never separated from the level it qualifies.")],
            [l("Le pont primaire / secondaire", "Primary / secondary bridge"), l("Il se commente, il ne se publie pas seul : coupons et maturités diffèrent des deux côtés.", "It is commented, not published alone: coupons and maturities differ on both sides.")],
          ],
        },
        {
          type: "note",
          kind: "info",
          text: l(
            "Tout chiffre publié porte sa date d'observation, son nombre de séances et l'origine de ses rendements. Un rendement calculé se présente comme calculé : c'est la seule chose qu'un lecteur ne peut pas retrouver seul.",
            "Every published figure carries its observation date, its number of sessions and the origin of its yields. A computed yield presents itself as computed: it is the one thing a reader cannot recover unaided.",
          ),
        },
      ],
    },
    {
      id: "limites",
      title: l("Ce que nous savons ne pas savoir", "What we know we do not know"),
      blocks: [
        {
          type: "list",
          items: [
            l(
              "L'échéancier réel des obligations. Beaucoup s'amortissent par tranches après un différé, ce qui raccourcit la durée de vie moyenne et relève le rendement. Tant que le communiqué ne le dit pas, le calcul suppose un remboursement in fine et le déclare.",
              "The real repayment schedule of bonds. Many amortise in instalments after a grace period, which shortens average life and raises the yield. While the communiqué does not say, the computation assumes a bullet repayment and declares it.",
            ),
            l(
              "La pondération de l'indice. La note méthodologique de la BVMAC reste à obtenir ; la fraîcheur se compte donc en composantes.",
              "The index weighting. The BVMAC methodology note is still to obtain; freshness is therefore counted in components.",
            ),
            l(
              "La couverture de la série. Une large part des communiqués de résultats publiés par la BEAC n'est pas encore ingérée, et la page de courbe affiche ce qu'elle a plutôt que de laisser croire qu'elle a tout.",
              "The coverage of the series. A large share of the results communiqués published by the BEAC is not yet ingested, and the curve page shows what it has rather than letting it pass for everything.",
            ),
          ],
        },
      ],
    },
  ],
};
