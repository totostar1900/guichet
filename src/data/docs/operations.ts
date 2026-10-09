import { l, type DocPage } from "./types";

/**
 * Comment une opération se fait, du côté du client et du côté du desk.
 *
 * CETTE PAGE EXISTE PARCE QU'UN PARCOURS NE SE DÉDUIT PAS DU CODE. Le cycle
 * des états vit dans domain/intent, les documents dans le registre, les
 * espèces dans la convention : trois endroits justes, et aucun ne dit combien
 * de fois le client doit lever le doigt. C'est pourtant la seule mesure qui
 * compte pour lui, et c'est celle que la maison s'engage à tenir.
 *
 * Décisions arrêtées les 8 et 9 octobre 2026, avec les réponses du dirigeant :
 * espèces non rémunérées sans que la plateforme le dise, remboursement sous
 * 72 heures, ordre accepté avant l'ouverture du sous-compte pour les
 * résidents, reçu de paiement valant
 * signature, placement de la provision en fonds monétaire à la demande du
 * client ou sur proposition de la plateforme.
 */
export const OPERATIONS: DocPage = {
  slug: "operations",
  title: l("Opérations : les gestes du client, le go du desk", "Operations: the client's moves, the desk's go"),
  summary: l(
    "Combien de fois un client agit pour une opération, selon le moyen de paiement, et ce que le desk fait une seule fois. La règle de l'argent, le mandat d'ouverture, la provision et les soixante-douze heures.",
    "How many times a client acts for one operation, by means of payment, and what the desk does once. The money rule, the opening mandate, the provision and the seventy-two hours.",
  ),
  visibility: "desk",
  audience: ["desk", "admin"],
  order: 2,
  checkedOn: "2026-10-09",
  owner: "Georges",
  chapters: [
    {
      id: "regles",
      title: l("Les quatre règles", "The four rules"),
      blocks: [
        {
          type: "lead",
          text: l(
            "Tout ce qui suit découle de quatre phrases. Elles ont été écrites contre une habitude : faire revenir le client une fois de plus parce que la maison n'avait pas tout demandé du premier coup.",
            "Everything below follows from four sentences. They were written against one habit: bringing the client back once more because the house had not asked for everything at the first pass.",
          ),
        },
        {
          type: "note",
          kind: "rule",
          text: l(
            "L'argent ne précède jamais l'ordre. Au mieux il l'accompagne, quand le paiement est immédiat. Au pire il le suit, quand il est viré, et il porte alors la référence imprimée sur l'ordre signé.",
            "Money never precedes the order. At best it goes with it, when payment is immediate. At worst it follows it, when transferred, and then carries the reference printed on the signed order.",
          ),
        },
        {
          type: "note",
          kind: "rule",
          text: l(
            "Le reçu d'un paiement authentifié vaut signature de l'ordre qu'il règle. On ne demande pas deux preuves du même consentement à trente secondes d'intervalle.",
            "The receipt of an authenticated payment stands as the signature of the order it settles. We do not ask for two proofs of the same consent thirty seconds apart.",
          ),
        },
        {
          type: "note",
          kind: "rule",
          text: l(
            "Un seul go du desk par opération. Le desk décide ; il ne refait pas ce que le client a déjà signé, et il ne redemande rien que le dossier porte déjà.",
            "One desk go per operation. The desk decides; it does not redo what the client has already signed, and asks for nothing the file already carries.",
          ),
        },
        {
          type: "note",
          kind: "rule",
          text: l(
            "La convention vaut mandat d'ouverture. Le client ne signe jamais une seconde fois pour qu'un compte s'ouvre à son nom : la maison l'ouvre pour lui.",
            "The agreement carries the opening mandate. The client never signs a second time for an account to be opened in their name: the house opens it for them.",
          ),
        },
        {
          type: "p",
          text: l(
            "La quatrième règle vaut d'être comparée. En Europe et aux États-Unis, la friction n'existe pas parce que les titres sont inscrits au nom du courtier, qui tient un registre interne : il n'y a aucun compte à ouvrir chez un tiers. La CEMAC est nominative, le compte-titres existe réellement au nom du client chez le teneur de compte. L'étape ne peut donc pas disparaître ; seule la demande faite au client peut disparaître, et c'est ce que fait le mandat.",
            "The fourth rule is worth comparing. In Europe and the United States the friction does not exist because securities are registered in the broker's name, who keeps an internal register: there is no account to open with a third party. CEMAC is nominative, the securities account really exists in the client's name with the account keeper. The step cannot disappear; only the request made to the client can, and that is what the mandate does.",
          ),
        },
      ],
    },
    {
      id: "gestes",
      title: l("Le compte des gestes, par opération", "The count of moves, by operation"),
      blocks: [
        {
          type: "lead",
          text: l(
            "Un geste est un acte délibéré du client : une saisie, une signature, une authentification, un virement. Lire un avis n'en est pas un. Un moment est une session, à un endroit : l'application, ou sa banque. C'est le tableau que la maison s'engage à tenir ; une opération qui en demande davantage est un défaut, pas une fatalité.",
            "A move is a deliberate act by the client: an entry, a signature, an authentication, a transfer. Reading a notice is not one. A sitting is one session in one place: the app, or their bank. This is the table the house commits to; an operation that asks for more is a defect, not a fate.",
          ),
        },
        {
          type: "table",
          head: [l("Opération", "Operation"), l("Paiement", "Payment"), l("Gestes", "Moves"), l("Quand, et en combien de temps", "When, and how long"), l("Go du desk", "Desk go")],
          rows: [
            [l("Souscription de parts d'OPCVM", "Fund units, subscription"), l("Carte, mobile money", "Card, mobile money"), l("2 : composer, puis confirmer-et-payer", "2: compose, then confirm-and-pay"), l("Un seul moment, une à deux minutes.", "One sitting, one to two minutes."), l("1", "1")],
            [l("Souscription de parts d'OPCVM", "Fund units, subscription"), l("Sur provision", "From the provision"), l("2 : composer, signer au doigt", "2: compose, sign with a touch"), l("Un seul moment, immédiat, sans frais d'encaissement.", "One sitting, immediate, no collection fee."), l("1", "1")],
            [l("Souscription de parts d'OPCVM", "Fund units, subscription"), l("Virement", "Bank transfer"), l("3 : composer, signer, virer avec la référence", "3: compose, sign, transfer with the reference"), l("Deux moments : l'application tout de suite, la banque à son rythme.", "Two sittings: the app at once, the bank at its own pace."), l("1", "1")],
            [l("Rachat de parts", "Fund units, redemption"), l("Aucun", "None"), l("2 : composer, signer", "2: compose, sign"), l("Un seul moment, une minute.", "One sitting, one minute."), l("1", "1")],
            [l("Arbitrage d'un fonds à l'autre", "Switch between funds"), l("Aucun", "None"), l("2, pour les deux jambes", "2, for both legs"), l("Un seul moment. Un arbitrage ne se signe pas deux fois.", "One sitting. A switch is not signed twice."), l("1", "1")],
            [l("Adjudication, ordre ferme à plafond", "Auction, firm order with a ceiling"), l("Carte, mobile money, provision", "Card, mobile money, provision"), l("2 : composer avec le plafond, confirmer-et-payer", "2: compose with the ceiling, confirm-and-pay"), l("Un seul moment, au plus tard la veille de la séance.", "One sitting, by the day before the auction at the latest."), l("1", "1")],
            [l("Adjudication, ordre ferme à plafond", "Auction, firm order with a ceiling"), l("Virement", "Bank transfer"), l("3", "3"), l("Deux moments, à solder avant la veille de la séance.", "Two sittings, to be settled before the day of the auction."), l("1", "1")],
            [l("Adjudication non servie, ou servie en partie", "Auction not served, or served in part"), l("—", "—"), l("0 ou 1 : rien, ou demander le versement", "0 or 1: nothing, or ask for payment"), l("Le solde redevient disponible dès le résultat ; il part sous 72 heures ouvrables sur demande.", "The balance becomes available as soon as the result is known; it leaves within 72 working hours on request."), l("0", "0")],
            [l("Sondage avant adjudication", "Poll before an auction"), l("Aucun, jamais", "None, ever"), l("1 : dire son intention", "1: state the intention"), l("Trente secondes. Aucun engagement, aucun versement.", "Thirty seconds. No commitment, no payment."), l("0", "0")],
            [l("L'ordre qui suit un sondage", "The order that follows a poll"), l("Selon le moyen", "By the means used"), l("1 ou 2 : l'ordre est pré-rempli de l'intention", "1 or 2: the order is pre-filled from the intention"), l("Un seul moment, à l'ouverture de la séance.", "One sitting, when the auction opens."), l("1", "1")],
            [l("Achat d'un titre coté", "Listed security, purchase"), l("Carte, mobile money, provision", "Card, mobile money, provision"), l("2 : composer avec la limite, confirmer-et-payer", "2: compose with the limit, confirm-and-pay"), l("Un seul moment. L'argent est bloqué, pas déplacé : il ne part qu'au dénouement.", "One sitting. The money is blocked, not moved: it leaves only at settlement."), l("1", "1")],
            [l("Vente d'un titre coté", "Listed security, sale"), l("Aucun", "None"), l("2 : composer, signer", "2: compose, sign"), l("Un seul moment ; le produit arrive au dénouement.", "One sitting; the proceeds arrive at settlement."), l("1", "1")],
            [l("Approvisionner la provision", "Funding the provision"), l("Carte, mobile money, virement", "Card, mobile money, transfer"), l("1", "1"), l("Un seul moment, sans ordre attaché. Elle sert les opérations suivantes.", "One sitting, with no order attached. It serves the operations that follow."), l("0", "0")],
            [l("La première fois seulement", "The first time only"), l("Aucun", "None"), l("Le dossier, puis la convention après l'approbation", "The file, then the agreement after approval"), l("Une fois dans la vie du compte. Rien ne se resigne ensuite.", "Once in the life of the account. Nothing is signed again afterwards."), l("1 approbation", "1 approval")],
          ],
        },
        {
          type: "list",
          items: [
            l("Deux gestes, un seul moment, moins de deux minutes : c'est le plancher. On ne descend pas sous « décider » et « confirmer ».", "Two moves, one sitting, under two minutes: that is the floor. One cannot go below “decide” and “confirm”."),
            l("Trois gestes quand l'argent passe par la banque, et le troisième n'est pas chez nous : il est chez elle.", "Three moves when money goes through the bank, and the third is not ours: it is the bank's."),
            l("Zéro go du desk sur un sondage et sur un non-servi laissé en place. Un go n'existe que là où une décision est prise.", "Zero desk go on a poll and on an unserved amount left in place. A go exists only where a decision is made."),
          ],
        },
      ],
    },
    {
      id: "especes",
      title: l("Les espèces : provision, rémunération, soixante-douze heures", "Cash: provision, return, seventy-two hours"),
      blocks: [
        {
          type: "p",
          text: l(
            "Un client peut approvisionner son compte de règlement par avance. C'est le meilleur gain de vitesse du lot : une opération réglée sur provision ne demande ni carte, ni banque, ni attente, et se signe au doigt.",
            "A client may fund their settlement account in advance. It is the best speed gain of the lot: an operation settled from the provision needs no card, no bank and no waiting, and is signed with a touch.",
          ),
        },
        {
          type: "note",
          kind: "rule",
          text: l(
            "Elle n'est jamais obligatoire, et le desk ne la propose jamais comme une condition. Le choix du moyen de règlement appartient au client : il peut payer chaque ordre au coup par coup, y compris par virement après l'avoir signé, et ne jamais constituer de provision. Une commodité présentée comme un passage obligé est une friction de plus, pas une de moins.",
            "It is never compulsory, and the desk never offers it as a condition. The choice of means of settlement belongs to the client: they may pay for each order one at a time, including by transfer after signing it, and never build up a provision. A convenience presented as a required step is one more friction, not one fewer.",
          ),
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "La provision ne rapporte rien, et la plateforme n'en dit rien : rémunérer des fonds reçus du public est le métier d'un établissement de crédit, sous COBAC, pas celui d'une société de bourse. Promettre un intérêt sur un solde client, c'est changer la qualification de l'activité. Aucun intérêt n'est dû sans stipulation : le silence suffit, et l'écrire au client afficherait un manque au moment précis où on lui demande de laisser de l'argent. Ce qui se dit à sa place, c'est la sortie : le fonds monétaire. Un client qui pose la question reçoit la réponse franche.",
            "The provision earns nothing, and the platform says nothing about it: paying a return on funds received from the public is the business of a credit institution under COBAC, not of a brokerage firm. Promising interest on a client balance changes the nature of the activity. No interest is owed without a stipulation: silence is enough, and writing it to the client would advertise a shortfall at the very moment we ask them to leave money with us. What is said instead is the way out: the money market fund. A client who asks gets the plain answer.",
          ),
        },
        {
          type: "p",
          text: l(
            "La sortie est à notre porte : la provision se place, à la demande du client ou sur proposition de la plateforme qu'il lui appartient d'accepter, en parts d'un fonds monétaire inscrites à son nom. Le client touche le rendement du fonds, la maison ne doit rien et ne garantit rien, et elle place son propre produit. Le prix à dire : les parts se rachètent dans le délai de centralisation du fonds, pendant lequel la somme n'est pas disponible pour régler un ordre.",
            "The way out is at our door: the provision is placed, at the client's request or on a proposal from the platform which is theirs to accept, in money market fund units registered in their name. The client earns the fund's return, the house owes nothing and guarantees nothing, and it places its own product. The price to state: units are redeemed within the fund's centralisation period, during which the sum is not available to settle an order.",
          ),
        },
        {
          type: "table",
          head: [l("Poche", "Pocket"), l("Rendement", "Return"), l("Disponible", "Available")],
          rows: [
            [l("Règlement", "Settlement"), l("Aucun", "None"), l("Tout de suite, pour le prochain ordre.", "At once, for the next order.")],
            [l("Placée, en fonds monétaire", "Placed, in a money market fund"), l("Celui du fonds, jamais promis", "The fund's, never promised"), l("Après rachat, au délai de centralisation.", "After redemption, at the centralisation period.")],
          ],
        },
        {
          type: "list",
          items: [
            l("Le versement d'un solde disponible part sous soixante-douze heures ouvrables, et vers le compte bancaire déclaré au dossier, à lui seul. La plateforme ne doit jamais pouvoir servir à déplacer de l'argent d'un compte vers un autre.", "Payment of an available balance leaves within seventy-two working hours, and to the bank account declared in the file, to that account alone. The platform must never be usable to move money from one account to another."),
            l("Une provision est de l'argent qui entre sans objet déclaré : c'est précisément ce que la surveillance LBC/FT regarde. Un dépôt qui sort de l'enveloppe annoncée au dossier se signale au desk.", "A provision is money coming in with no stated purpose: that is exactly what AML monitoring looks at. A deposit beyond the amount declared in the file is flagged to the desk."),
            l("Le rapprochement du compte de cantonnement se fait tous les jours. Avec une provision, le flottant grossit : un écart cesse d'être une anomalie de journal et devient un sinistre.", "The segregated account is reconciled every day. With a provision the float grows: a discrepancy stops being a journal anomaly and becomes an incident."),
          ],
        },
      ],
    },
    {
      id: "ouverture",
      title: l("Le mandat d'ouverture, et l'ordre qui n'attend pas", "The opening mandate, and the order that does not wait"),
      blocks: [
        {
          type: "p",
          text: l(
            "La convention porte mandat d'ouvrir, au nom du client et sans autre signature, tout compte nécessaire à ses ordres : sous-compte titres chez le teneur de compte, inscription au registre d'un fonds. Le mandat porte sur l'ouverture et sur elle seule : le client reste titulaire et seul décideur.",
            "The agreement carries a mandate to open, in the client's name and with no further signature, any account their orders need: a securities sub-account with the account keeper, registration in a fund's register. The mandate covers the opening and nothing else: the client remains the holder and the sole decision-maker.",
          ),
        },
        {
          type: "p",
          text: l(
            "Ce que le mandat ne règle pas, et ne réglera jamais : l'identification. L'identité se vérifie avant la relation d'affaires et avant toute opération. Accepter l'argent d'abord et vérifier ensuite est le défaut classique qui coûte un agrément.",
            "What the mandate does not settle, and never will: identification. Identity is verified before the business relationship and before any operation. Taking the money first and checking afterwards is the classic failure that costs a licence.",
          ),
        },
        {
          type: "note",
          kind: "info",
          text: l(
            "Pour un résident dont le dossier est approuvé, un ordre sur titre est accepté avant que le sous-compte soit ouvert : l'ouverture part aussitôt, l'ordre n'est transmis qu'une fois le sous-compte ouvert, et si l'ouverture échoue l'ordre devient caduc et les sommes redeviennent disponibles. Depuis l'étranger, l'ordre attend l'appel vidéo et l'ouverture.",
            "For a resident whose file is approved, a securities order is accepted before the sub-account is open: the opening starts at once, the order is transmitted only once the sub-account is open, and if the opening fails the order lapses and the sums become available again. From abroad, the order waits for the video call and the opening.",
          ),
        },
      ],
    },
    {
      id: "reste",
      title: l("Ce qui reste à construire", "What is still to be built"),
      blocks: [
        {
          type: "steps",
          items: [
            l("Le reçu d'un paiement authentifié valant signature : il faut d'abord un encaissement en ligne, carte ou mobile money, et la preuve que le payeur est le client.", "The receipt of an authenticated payment standing as the signature: it first needs online collection, card or mobile money, and proof that the payer is the client."),
            l("La provision et son règlement en un geste, avec la signature au doigt plutôt qu'un code reçu par courriel.", "The provision and its one-move settlement, with a touch signature rather than a code received by e-mail."),
            l("Le plafond « au plus » sur les ordres de titres et d'adjudication : aujourd'hui seules les parts d'OPCVM se signent, parce que leur montant est ferme.", "The “at most” ceiling on securities and auction orders: today only fund units can be signed, because their amount is firm."),
            l("L'état d'un ordre accepté mais en attente de l'ouverture du sous-compte : ni refusé, ni transmis, et visible des deux côtés.", "The state of an order accepted but waiting for the sub-account to open: neither refused nor transmitted, and visible on both sides."),
            l("Le numéro de compte bancaire distinct par client pour les virements entrants : il supprime la référence à recopier, donc la famille entière des paiements orphelins. Il dépend de ce que la banque sait faire.", "A distinct bank account number per client for incoming transfers: it removes the reference to copy, and with it the whole family of orphan payments. It depends on what the bank can do."),
          ],
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "Les clients qui ont accepté la convention avant le 9 octobre 2026 ont signé un texte sans mandat d'ouverture. Leur exemplaire, daté, fait foi. Le mandat leur sera demandé une fois, à la prochaine occasion utile, et non supposé.",
            "Clients who accepted the agreement before 9 October 2026 signed a text without the opening mandate. Their dated copy is the record. The mandate will be asked of them once, at the next useful occasion, and not assumed.",
          ),
        },
      ],
    },
  ],
};
