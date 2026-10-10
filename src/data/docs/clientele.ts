import { l, type DocPage } from "./types";

/**
 * Knowing the clientele: what is recorded, what is read from it, and what the
 * desk may decide. Written for whoever arrives after us.
 */
export const CLIENTELE: DocPage = {
  slug: "clientele",
  title: l("Connaître sa clientèle", "Knowing the clientele"),
  summary: l(
    "Ce que la maison note des gestes d'un client, les trois lectures qu'elle en tire, les groupes qui commandent les envois, et les mesures qu'elle peut décider contre lui.",
    "What the firm records of a client's moves, the three readings it draws from them, the groups that drive the sends, and the measures it may decide against them.",
  ),
  visibility: "desk",
  audience: ["desk", "admin"],
  order: 2,
  checkedOn: "2026-10-10",
  owner: "Georges",
  chapters: [
    {
      id: "registre",
      title: l("Ce qui est noté, et ce qui ne l'est pas", "What is recorded, and what is not"),
      blocks: [
        {
          type: "lead",
          text: l(
            "Jusqu'au 10 octobre 2026, huit gestes sur les quarante et un qu'un client peut faire laissaient une trace, et seulement ceux qui touchaient une décision du desk. Signer un mandat, prouver un numéro, déposer une pièce, abandonner un dossier à mi-chemin : rien ne s'écrivait. La maison ne savait de son client que ce qu'il avait acheté.",
            "Until 10 October 2026, eight of the forty-one moves a client can make left a trace, and only those touching a desk decision. Signing a mandate, proving a number, uploading a document, abandoning a file halfway: nothing was written. The firm knew of its client only what they had bought.",
          ),
        },
        {
          type: "list",
          items: [
            l(
              "Noté : les trente-sept gestes du catalogue, chacun avec sa date, son objet, son canal et l'appareil employé.",
              "Recorded: the thirty-seven moves of the catalogue, each with its date, object, channel and device used.",
            ),
            l(
              "Noté aussi : la consultation d'un objet nommé, fiche, document, portefeuille ou séance, UNE FOIS par jour et par objet.",
              "Also recorded: viewing a named object, sheet, document, portfolio or session, ONCE a day and per object.",
            ),
            l(
              "Jamais noté : la durée d'une visite, le défilement, les mouvements du pointeur, l'ordre des écrans. L'objet consulté dit déjà ce qu'on veut savoir ; le reste ferait un journal de lecture qu'il faudrait justifier.",
              "Never recorded: the duration of a visit, scrolling, pointer movements, the order of screens. The object viewed already says what we want to know; the rest would make a reading log that would have to be justified.",
            ),
          ],
        },
        {
          type: "note",
          kind: "info",
          text: l(
            "Une consultation se note depuis le NAVIGATEUR, jamais au rendu de la page. Les listes préchargent la fiche voisine avant tout clic : une page qui noterait son passage au rendu inscrirait des fiches seulement survolées, et « a consulté » ne voudrait plus rien dire.",
            "A consultation is recorded from the BROWSER, never when the page renders. Lists prefetch the neighbouring sheet before any click: a page recording its own visit at render time would log sheets merely hovered, and « viewed » would stop meaning anything.",
          ),
        },
        {
          type: "p",
          text: l(
            "Le registre vit à part de la chaîne d'audit. L'audit enchaîne chaque ligne à la précédente par une empreinte, ce qui lui impose de relire la dernière avant chaque écriture : juste pour une décision du desk, intenable pour des milliers de gestes. L'audit garde les décisions, ce registre garde les gestes. Les deux se lisent sous Journal.",
            "The register lives apart from the audit chain. The audit links each line to the previous by a hash, which forces it to re-read the last one before every write: right for a desk decision, untenable for thousands of moves. The audit keeps decisions, this register keeps moves. Both are read under Journal.",
          ),
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "Treize mois de détail, puis des compteurs sans le geste, par un robot mensuel. Ce n'est pas un réglage : l'article 8 de la convention le promet au client, et le client lit son propre registre dans « Votre activité ». Changer la durée oblige à changer l'article, donc à faire reprendre la convention.",
            "Thirteen months of detail, then counters without the move, by a monthly robot. This is not a setting: article 8 of the agreement promises it to the client, and the client reads their own register under « Your activity ». Changing the duration means changing the article, hence having the agreement re-accepted.",
          ),
        },
      ],
    },
    {
      id: "trois-lectures",
      title: l("Trois lectures qu'on ne mélange jamais", "Three readings never to be mixed"),
      blocks: [
        {
          type: "table",
          head: [l("Lecture", "Reading"), l("Ce qu'elle dit", "What it says"), l("Sa forme, et pourquoi", "Its form, and why")],
          rows: [
            [
              l("Le statut", "Status"),
              l("L'état du compte : actif, dormant, visiteur, sous mesure, clos.", "The state of the account: active, dormant, visitor, under measure, closed."),
              l("Un mot. Il décide de ce que le client peut faire.", "A word. It decides what the client may do."),
            ],
            [
              l("La tenue", "Conduct"),
              l("Sa conduite, en manquements datés.", "Their conduct, in dated lapses."),
              l(
                "Quatre crans nommés, JAMAIS une note. Un cran se conteste ligne à ligne ; un « 37 sur 100 » ne se conteste pas, et c'est précisément pourquoi il serait plus commode et moins juste.",
                "Four named levels, NEVER a score. A level can be disputed line by line; a « 37 out of 100 » cannot, and that is precisely why it would be handier and less fair.",
              ),
            ],
            [
              l("L'activité", "Activity"),
              l("Son intensité.", "Their intensity."),
              l(
                "Un nombre, parce qu'elle n'ordonne qu'une liste. Ses cinq poids s'affichent PARCE QU'ILS SONT ARBITRAIRES : la discussion porte alors sur le poids, jamais sur le chiffre.",
                "A number, because it only orders a list. Its five weights are displayed BECAUSE THEY ARE ARBITRARY: the discussion then bears on the weight, never on the figure.",
              ),
            ],
          ],
        },
        {
          type: "note",
          kind: "info",
          text: l(
            "Aucune des trois ne décide quoi que ce soit. Elles mettent une liste dans l'ordre et attirent l'œil ; une mesure se prend par une personne, avec un motif et une durée.",
            "None of the three decides anything. They put a list in order and draw the eye; a measure is taken by a person, with a reason and a duration.",
          ),
        },
      ],
    },
    {
      id: "tenue",
      title: l("La tenue : cinq manquements, trois exclusions", "Conduct: five lapses, three exclusions"),
      blocks: [
        {
          type: "list",
          items: [
            l(
              "Un ordre servi et jamais réglé au-delà de cinq jours ouvrés : le plus grave, parce que la maison a soumissionné au nom du client et porte le papier. Avant ce délai, ce n'est pas un manquement, c'est un virement en route.",
              "An order allotted and never settled beyond five working days: the gravest, because the firm bid in the client's name and carries the paper. Before that delay it is not a lapse, it is a transfer on its way.",
            ),
            l("Deux appétits ou plus restés sans suite. Un seul est une hésitation.", "Two or more appetites left with no follow-up. A single one is hesitation."),
            l("Un prélèvement rejeté reste une tenue correcte ; deux font surveiller.", "One rejected direct debit keeps conduct sound; two call for watching."),
            l("Un versement programmé non réglé au-delà du même délai.", "A scheduled payment unsettled beyond the same delay."),
            l("Deux envois en échec : un canal déclaré ne répond plus.", "Two failed sends: a declared channel no longer answers."),
          ],
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "TROIS EXCLUSIONS RENDENT LE COMPTE DES APPÉTITS JUSTE, et sans elles la maison punirait ses propres oublis. Une ligne qui n'a jamais ouvert ne compte pas : le client n'a pas eu l'occasion de tenir. Un silence après aucune relance ne compte pas, et c'est le journal des envois qui tranche : le manquement est alors le nôtre. Une ligne retirée par la maison ne compte pas non plus. Un ordre ferme antérieur à l'appétit ne le tient pas davantage.",
            "THREE EXCLUSIONS MAKE THE APPETITE COUNT FAIR, and without them the firm would punish its own oversights. A line that never opened does not count: the client had no chance to follow through. Silence after no reminder does not count, and the send log settles it: the lapse is then ours. A line withdrawn by the firm does not count either. Nor does a firm order placed before the appetite satisfy it.",
          ),
        },
      ],
    },
    {
      id: "activite",
      title: l("L'activité et son barème", "Activity and its scale"),
      blocks: [
        {
          type: "table",
          head: [l("Ingrédient", "Ingredient"), l("Poids d'origine", "Original weight"), l("Ce qu'il mesure", "What it measures")],
          rows: [
            [l("Présence aux séances ouvertes", "Attendance at opened sessions"), l("30", "30"), l("les séances où il a déposé quelque chose, sur celles qui ont ouvert", "the sessions where they placed something, out of those that opened")],
            [
              l("Volume réglé", "Volume settled"),
              l("30", "30"),
              l(
                "comparé AU PALIER et jamais dans l'absolu : sans cela trois institutionnels occuperaient tout le haut de la liste",
                "compared WITHIN THE TIER and never in absolute terms: otherwise three institutions would occupy the whole top of the list",
              ),
            ],
            [l("Suite donnée à ses appétits", "Follow-up on their appetites"), l("20", "20"), l("plein s'il n'a rien annoncé : on ne punit pas un silence", "full if they announced nothing: silence is not punished")],
            [l("Mois où il a agi", "Months with a move"), l("10", "10"), l("de trois sources, parce que le registre des gestes est jeune", "from three sources, because the register of moves is young")],
            [l("Dossier à jour, canaux prouvés", "File up to date, channels proven"), l("10", "10"), l("ce qui nous évite de lui redemander ce qu'il a donné", "what saves us asking again for what they gave")],
          ],
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "UN SCORE NE SE COMPARE QU'À BARÈME ÉGAL. Les poids se règlent dans Référentiel › Barème, donc ils bougent ; chaque barème porte un numéro et une date, et tout score affiché dit duquel il sort. Sans cela, « 56 en octobre, 71 en novembre » ne dirait pas si le client a bougé ou si le barème a bougé. Un barème se publie en voyant qui bouge : l'écran compare nom par nom avant de publier, et publier change qui reçoit les annonces.",
            "A SCORE ONLY COMPARES AT EQUAL SCALE. The weights are set under Reference data › Scale, so they move; every scale carries a number and a date, and every score shown says which one it comes from. Otherwise « 56 in October, 71 in November » would not say whether the client moved or the scale moved. A scale is published while seeing who moves: the screen compares name by name before publishing, and publishing changes who receives announcements.",
          ),
        },
        {
          type: "p",
          text: l(
            "Une consultation ne pèse rien dans le score. Elle nourrit la cadence et le fil des gestes. Sinon regarder vaudrait acheter, et le classement de la maison deviendrait un classement des curieux.",
            "A consultation weighs nothing in the score. It feeds the rhythm and the thread of moves. Otherwise looking would be worth buying, and the firm's ranking would become a ranking of the curious.",
          ),
        },
      ],
    },
    {
      id: "cohortes",
      title: l("Les cohortes, et les deux limites de l'envoi", "The cohorts, and the two limits on sending"),
      blocks: [
        {
          type: "p",
          text: l(
            "Quatre groupes nommés : à surveiller, dormants, fidèles, tièdes. Un client n'est que dans un seul, et l'ordre de priorité est une décision : un manquement passe avant tout, parce qu'écrire une offre à quelqu'un dont un ordre n'est pas réglé serait au mieux maladroit ; le sommeil, six mois sans un geste, passe avant la fidélité, parce qu'un ancien fidèle qui dort est d'abord quelqu'un qu'on a perdu de vue.",
            "Four named groups: to watch, dormant, loyal, lukewarm. A client is in only one, and the order of priority is a decision: a lapse comes before everything, because sending an offer to someone whose order is unsettled would be clumsy at best; dormancy, six months with no move, comes before loyalty, because a former loyal client who sleeps is first of all someone lost from sight.",
          ),
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "UNE COHORTE CHOISIT QUI PRÉVENIR, JAMAIS QUEL PRIX PROPOSER. Deux clients devant la même offre lisent la même chose. Moduler un prix ou une condition par groupe ferait de la maison autre chose qu'un intermédiaire, et la phrase « ni conseil, ni garantie d'allocation » tomberait avec. C'est écrit à l'article 8 de la convention.",
            "A COHORT CHOOSES WHO TO TELL, NEVER WHAT PRICE TO OFFER. Two clients facing the same offer read the same thing. Modulating a price or a condition by group would make the firm something other than an intermediary, and the phrase « neither advice nor a guarantee of allocation » would fall with it. It is written in article 8 of the agreement.",
          ),
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "LE CONSENTEMENT COMMANDE L'ENVOI, JAMAIS L'APPARTENANCE. Un client qui n'a rien accepté reste dans sa cohorte, garde tous ses droits, et ne reçoit rien. Le plafond d'un message par jour, les heures calmes et le seuil des cinquante destinataires ne bougent pas davantage.",
            "CONSENT DRIVES THE SEND, NEVER THE MEMBERSHIP. A client who accepted nothing stays in their cohort, keeps every right, and receives nothing. The one-message-a-day cap, the quiet hours and the fifty-recipient threshold do not move either.",
          ),
        },
      ],
    },
    {
      id: "mesures",
      title: l("Les mesures : ce qu'elles empêchent, ce qu'elles ne toucheront jamais", "Measures: what they stop, what they will never touch"),
      blocks: [
        {
          type: "table",
          head: [l("Cran", "Level"), l("Ce qu'il dit", "What it says"), l("Ce qui reste possible", "What remains possible")],
          rows: [
            [
              l("Prépaiement exigé", "Prepayment required"),
              l("payez d'abord", "pay first"),
              l("tout, sauf un ordre ferme dont la provision ne couvre pas le montant. Il ne retire rien, il déplace l'ordre du paiement.", "everything, except a firm order whose provision does not cover the amount. It takes nothing away, it moves the order of payment."),
            ],
            [
              l("Fermeture seule", "Close only"),
              l("plus rien de nouveau", "nothing new"),
              l(
                "vendre, racheter ses parts, sortir ses espèces, tout cela lui-même et quand il veut. Seul ce qui AUGMENTE ses lignes est refusé : ordre d'achat, souscription, appétit, épargne, réinvestissement, mandat.",
                "selling, redeeming units, withdrawing cash, all of it themselves and whenever they want. Only what INCREASES their holdings is refused: buy order, subscription, appetite, savings plan, reinvestment, mandate.",
              ),
            ],
            [
              l("Compte suspendu", "Account suspended"),
              l("nous n'agissons plus de nous-mêmes sur ce compte", "we no longer act on this account by ourselves"),
              l(
                "lire son portefeuille, demander ses espèces, écrire au desk, se plaindre, cesser de s'engager. Sa sortie reste entière mais passe par une personne : pour vendre, il nous écrit et un conseiller passe l'ordre avec lui.",
                "reading their portfolio, requesting their cash, writing to the desk, complaining, ceasing to commit. Their way out stays whole but goes through a person: to sell, they write to us and an adviser places the order with them.",
              ),
            ],
          ],
        },
        {
          type: "note",
          kind: "info",
          text: l(
            "LE CRAN DU MILIEU EST CELUI QU'ON VOULAIT. Il ferme une relation sans punir personne : le client ne peut plus s'engager, et rien d'autre ne change. Son absence, jusqu'au 10 octobre 2026, poussait à suspendre des comptes qui ne méritaient que de ne plus grossir.",
            "THE MIDDLE LEVEL IS THE ONE WE WANTED. It closes a relationship without punishing anybody: the client can no longer commit, and nothing else changes. Its absence, until 10 October 2026, pushed us to suspend accounts that deserved only to stop growing.",
          ),
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "CE CRAN A OBLIGÉ LE GARDE À REGARDER LE SENS DE L'INTENTION, et il a découvert deux promesses qui n'étaient pas tenues. Vendre et acheter empruntent la même porte : la suspension les refusait toutes les deux, alors que son propre message disait au client qu'il pouvait vendre. Poser une question empruntait aussi cette porte : un compte suspendu ne pouvait pas nous écrire, au moment précis où l'écran lui disait de le faire. Un compte en clôture ne pouvait pas non plus solder ses lignes, donc jamais se clore. Les trois sont réparés avec le cran.",
            "THIS LEVEL FORCED THE GUARD TO LOOK AT THE DIRECTION OF THE INTENTION, and it uncovered two promises that were not kept. Selling and buying go through the same door: suspension refused both, while its own message told the client they could sell. Asking a question went through that door too: a suspended account could not write to us, at the very moment the screen told it to. An account being closed could not settle its lines either, hence never close. All three are fixed along with the level.",
          ),
        },
        {
          type: "steps",
          items: [
            l(
              "Une mesure ne retient JAMAIS l'argent ni les titres du client : ils sont à lui. Seule une décision de justice ou une instruction de l'ANIF le permettrait, et c'est alors elle le fondement, pas notre appréciation.",
              "A measure NEVER holds the client's money or securities: they are theirs. Only a court decision or an ANIF instruction would allow it, and it is then the basis, not our appreciation.",
            ),
            l(
              "Une mesure ne coupe JAMAIS le chemin vers nous. Un compte suspendu reste un compte dont on peut se plaindre.",
              "A measure NEVER cuts the way to us. A suspended account remains an account one can complain about.",
            ),
            l(
              "Cesser de s'engager reste possible : arrêter son épargne, révoquer son mandat, refuser une contre-proposition ne sont pas gardés, sinon la mesure aggraverait ce qu'elle veut arrêter.",
              "Ceasing to commit remains possible: stopping a savings plan, revoking a mandate, declining a counter-offer are not guarded, otherwise the measure would worsen what it means to stop.",
            ),
            l(
              "Une mesure a une fin écrite d'avance, quatre-vingt-dix jours par défaut, et elle tombe d'elle-même : sinon un compte reste puni par oubli.",
              "A measure has an end written in advance, ninety days by default, and it lapses by itself: otherwise an account stays punished by oversight.",
            ),
          ],
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "LE MOTIF VIENT D'UNE LISTE FERMÉE, parce qu'une cause qui se réécrit n'est plus contestable, et c'est lui qui décide de ce que le client lit. Le motif « vérification de conformité » ne lui dit rien : prévenir quelqu'un qu'il est soupçonné est une faute au regard des textes LBC/FT, et cela prévient précisément la personne qu'il ne faut pas prévenir. Ce silence est la loi, pas une pudeur.",
            "THE REASON COMES FROM A CLOSED LIST, because a cause that can be rewritten can no longer be disputed, and it decides what the client reads. The « compliance check » reason tells them nothing: warning someone that they are suspected is an offence under AML/CFT rules, and it warns precisely the person who must not be warned. That silence is the law, not coyness.",
          ),
        },
        {
          type: "p",
          text: l(
            "Poser ou lever une mesure passe par le contrôle à quatre yeux, et le client lit la sienne en tête de son espace, avec sa cause et son terme : une restriction qu'il découvre en butant dessus est une panne muette, il croit avoir mal cliqué.",
            "Setting or lifting a measure goes through the four-eyes control, and the client reads theirs at the top of their space, with its cause and its term: a restriction discovered by bumping into it is a silent failure, they think they mis-clicked.",
          ),
        },
      ],
    },
    {
      id: "registre-ecartes",
      title: l("Le registre des personnes écartées", "The register of barred persons"),
      blocks: [
        {
          type: "lead",
          text: l(
            "Une mesure vit sur un compte. Fermer le compte l'efface donc, et rien n'empêche la même personne de revenir le lendemain avec une autre adresse et un autre numéro : c'est le seul endroit du produit où tout le travail de la tenue et des mesures s'annule d'un geste. Ce registre vit à côté des comptes, et c'est pour cela qu'il existe.",
            "A measure lives on an account. Closing the account therefore erases it, and nothing stops the same person coming back the next day with another address and another number: it is the one place in the product where all the work of conduct and measures is undone in a single move. This register lives beside the accounts, and that is why it exists.",
          ),
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "IL NE REFUSE JAMAIS TOUT SEUL. Une correspondance lève un drapeau au-dessus de la décision, et une personne nommée tranche en disant pourquoi. Refuser d'ouvrir un compte est une décision qui doit porter un nom : une machine qui la prendrait sur une homonymie en ferait une décision que personne n'a prise, et que personne ne peut donc expliquer.",
            "IT NEVER REFUSES BY ITSELF. A match raises a flag above the decision, and a named person settles it saying why. Refusing to open an account is a decision that must carry a name: a machine taking it on a namesake would make it a decision nobody took, and that nobody can therefore explain.",
          ),
        },
        {
          type: "table",
          head: [l("Ce qui accroche", "What catches"), l("Ce que ça vaut", "What it is worth")],
          rows: [
            [
              l("Correspondance : le même numéro de pièce", "Match: the same document number"),
              l("à une faute de saisie près, c'est la même personne", "bar a typing slip, it is the same person"),
            ],
            [
              l("Ressemblance : même nom ET même date de naissance, autre pièce", "Resemblance: same name AND same date of birth, different document"),
              l(
                "c'est celui qui revient avec un passeport neuf, ou c'est un homonyme né le même jour. Le nom SEUL ne produit rien : « Jean Nguema » accrocherait tous les Jean Nguema du pays, et un drapeau qui se lève toujours cesse d'être lu.",
                "it is the one coming back with a new passport, or a namesake born the same day. The name ALONE produces nothing: « Jean Nguema » would catch every Jean Nguema in the country, and a flag that always rises stops being read.",
              ),
            ],
          ],
        },
        {
          type: "p",
          text: l(
            "Le registre regarde TOUTES les personnes d'un dossier, pas seulement son titulaire, parce que c'est le cas qui compte : quelqu'un d'écarté revient rarement en son nom propre. Il revient comme représentant d'une société, comme mandataire sur le compte d'un proche, ou comme bénéficiaire effectif d'un groupement.",
            "The register looks at EVERY person in a file, not only its holder, because that is the case that matters: someone barred rarely comes back in their own name. They come back as a company's representative, as an agent on a relative's account, or as a group's beneficial owner.",
          ),
        },
        {
          type: "note",
          kind: "info",
          text: l(
            "LE NUMÉRO DE PIÈCE EST ÉCRIT EN CLAIR, et ce choix mérite sa phrase. On peut n'en garder qu'une empreinte, pour que le registre ne soit pas une liste lisible de gens qu'on refuse. Trois raisons l'ont emporté : la personne inscrite était presque toujours cliente, donc la maison détient déjà son numéro dans son dossier et le hacher ici ne protège rien ; personne ne pourrait plus vérifier une inscription, ni voir la faute de frappe qui l'empêche de jamais correspondre ; et une empreinte ne compare qu'à l'identique, là où une ressemblance attrape celui qui revient avec une pièce neuve. Le registre est donc protégé exactement comme les dossiers dont il sort : desk seulement.",
            "THE DOCUMENT NUMBER IS WRITTEN IN CLEAR, and that choice deserves its sentence. One can keep only a hash of it, so the register is not a readable list of people we refuse. Three reasons won: the person listed was almost always a client, so the firm already holds their number in their file and hashing it here protects nothing; nobody could verify an entry any more, nor see the typo that keeps it from ever matching; and a hash only compares identically, where a resemblance catches the one coming back with a new document. The register is therefore protected exactly like the files it comes from: desk only.",
          ),
        },
        {
          type: "steps",
          items: [
            l(
              "Le motif vient d'une liste fermée, comme pour une mesure, et quatre des six sont des motifs de conformité qui ne se disent jamais à la personne : fraude avérée, pièces falsifiées, déclaration à l'ANIF, liste de sanctions. Les deux autres se disent : une dette non réglée envers la maison, et la demande de la personne elle-même.",
              "The reason comes from a closed list, as for a measure, and four of the six are compliance reasons never told to the person: confirmed fraud, forged documents, report to the financial intelligence unit, sanctions list. The other two can be said: an unsettled debt to the firm, and the person's own request.",
            ),
            l(
              "Une inscription finit, cinq ans par défaut, la durée pendant laquelle les textes imposent déjà de garder les pièces : au-delà, la maison n'a plus la trace qui la justifierait, donc elle ne peut plus la défendre. Seuls la déclaration à l'ANIF, les sanctions et la demande de la personne peuvent ne pas finir.",
              "An entry ends, five years by default, the period for which the rules already require keeping the documents: beyond it, the firm no longer has the trace that would justify it, so it can no longer defend it. Only the intelligence-unit report, sanctions and the person's own request may have no end.",
            ),
            l(
              "Une inscription se publie, comme tout le référentiel, et sa publication demande une SECONDE PERSONNE : écarter quelqu'un vaut une mesure posée d'avance sur un compte qui n'existe pas encore, et dont l'intéressé ne saura donc rien.",
              "An entry is published, like all reference data, and its publication requires a SECOND PERSON: barring someone is worth a measure set in advance on an account that does not yet exist, and of which the person will therefore know nothing.",
            ),
            l(
              "Une inscription levée n'est jamais supprimée. C'est la règle des instructions arrêtées, et c'est aussi la seule façon de répondre à quelqu'un qui demande pourquoi il a été refusé l'an dernier.",
              "A lifted entry is never deleted. It is the rule of stopped instructions, and it is also the only way to answer someone who asks why they were refused last year.",
            ),
          ],
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "CE N'EST PAS UN MUR, C'EST UN FILET, et deux trous sont connus. Un chiffre inversé dans un numéro y passe : le registre attrape celui qui revient, pas celui qui se fabrique une identité. Et un mandataire ne donne au dossier que son numéro, ni sa date de naissance ni le type de sa pièce : il peut donc produire une correspondance de numéro, jamais une ressemblance de nom. Demander la date de naissance des mandataires fermerait ce second trou, et c'est un changement au formulaire du client.",
            "IT IS NOT A WALL, IT IS A NET, and two holes are known. A transposed digit in a number goes through: the register catches the one who comes back, not the one who manufactures an identity. And an agent gives the file only their number, neither their date of birth nor their document type: they can therefore produce a number match, never a name resemblance. Asking agents for their date of birth would close that second hole, and that is a change to the client's own form.",
          ),
        },
      ],
    },
    {
      id: "ou",
      title: l("Où regarder", "Where to look"),
      blocks: [
        {
          type: "table",
          head: [l("Pour", "For"), l("Aller à", "Go to")],
          rows: [
            [l("La liste, ses crans et ses scores, et les quatre groupes", "The list, its levels and scores, and the four groups"), l("Répertoire", "Directory")],
            [l("La tenue d'un client, son score détaillé, sa mesure", "One client's conduct, their detailed score, their measure"), l("Dossiers › le client", "Files › the client")],
            [l("Ce qu'un client a traité, par mois, trimestre ou année", "What a client has traded, by month, quarter or year", ), l("Dossiers › le client › Ce qu'il a traité", "Files › the client › What they traded")],
            [l("Les gestes de tout le monde", "Everyone's moves"), l("Journal › Gestes des clients", "Journal › Client moves")],
            [l("Régler les poids du score", "Setting the score's weights"), l("Référentiel › Barème", "Reference data › Scale")],
            [l("Écrire à un groupe", "Writing to a group"), l("Carnet › la ligne à la une › Segment", "Book › the featured line › Segment")],
            [l("Écarter quelqu'un, ou lever une inscription", "Barring someone, or lifting an entry"), l("Référentiel › Registre", "Reference data › Register")],
            [l("Ce que le client voit de lui-même", "What the client sees of themselves"), l("Son espace › Votre activité", "Their space › Your activity")],
          ],
        },
      ],
    },
  ],
};
