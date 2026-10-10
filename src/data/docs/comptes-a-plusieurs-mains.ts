import { l, type DocPage } from "./types";

/**
 * Qui donne les ordres d'un compte, et ce qui change quand le titulaire
 * n'est pas une personne physique. Écrit pour celui qui ouvrira un dossier
 * de société un matin sans savoir par quel bout le prendre.
 */
export const COMPTES_A_PLUSIEURS_MAINS: DocPage = {
  slug: "comptes-a-plusieurs-mains",
  title: l("Les comptes à plusieurs mains", "Accounts with several hands"),
  summary: l(
    "Un seul donneur d'ordres, et ce que cela veut dire pour une société, une association ou une indivision : qui peut agir, qui reçoit un accès, jusqu'à quel montant, et ce qu'on fait le jour où le conseil change.",
    "A single order-giver, and what that means for a company, an association or an undivided account: who may act, who receives an access, up to what amount, and what to do the day the board changes.",
  ),
  visibility: "desk",
  audience: ["desk", "admin"],
  order: 2,
  checkedOn: "2026-10-11",
  owner: "Georges",
  chapters: [
    {
      id: "donneur-d-ordres",
      title: l("Un seul donneur d'ordres", "A single order-giver"),
      blocks: [
        {
          type: "lead",
          text: l(
            "Le titulaire est SEUL à donner ses ordres. La maison n'accepte aucune procuration, n'en prépare aucune, et n'exécute l'ordre d'aucun tiers, quels que soient le lien de parenté, l'insistance ou le papier présenté.",
            "The holder ALONE gives their orders. The firm accepts no power of attorney, prepares none, and executes no third party's order, whatever the family tie, the insistence or the paper produced.",
          ),
        },
        {
          type: "p",
          text: l(
            "Ce n'est pas une prudence, c'est la règle de la maison, arrêtée le 10 octobre 2026. Le produit l'honorait déjà sans le dire : aucun mandataire n'a jamais pu se connecter. Mais il offrait une procuration de papier, un acte réglementaire que rien à l'écran ne faisait vivre. Un acte que le produit n'honore pas est une promesse qu'il ne tiendra pas le jour où on l'invoque : la procuration a donc été retirée, et l'article 9 de la convention le dit maintenant au client.",
            "This is not caution, it is the firm's rule, settled on 10 October 2026. The product already honoured it without saying so: no agent could ever sign in. But it offered a paper power of attorney, a regulated deed that nothing on screen brought to life. A deed the product does not honour is a promise it will not keep the day it is invoked: the power of attorney was therefore withdrawn, and article 9 of the agreement now says so to the client.",
          ),
        },
        {
          type: "table",
          head: [l("Qui", "Who"), l("Peut-il donner un ordre ?", "May they give an order?")],
          rows: [
            [l("Le titulaire, personne physique", "The holder, a natural person"), l("oui, et lui seul", "yes, and they alone")],
            [
              l("Le représentant légal d'une société ou d'une association", "The legal representative of a company or association"),
              l("oui, parce qu'il EST le titulaire qui agit : une personne morale n'a pas d'autres mains. Il doit être déclaré au dossier.", "yes, because they ARE the holder acting: a legal entity has no other hands. They must be declared in the file."),
            ],
            [
              l("Les cotitulaires désignés d'un groupement", "The designated co-holders of a group"),
              l("oui, dans la règle de décision que le PV a fixée : le compte est à eux, en indivision.", "yes, within the decision rule set by the minutes: the account is theirs, undivided."),
            ],
            [l("Un bénéficiaire effectif", "A beneficial owner"), l("non. Détenir plus de 25 % n'est pas agir.", "no. Holding more than 25 % is not acting.")],
            [
              l("Un proche, un conseiller, un gérant de fortune, qui que ce soit d'autre", "A relative, an adviser, a wealth manager, anyone else"),
              l("non, sans exception et quel que soit le document produit.", "no, without exception and whatever document is produced."),
            ],
          ],
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "LA BONNE RÉPONSE AU TÉLÉPHONE EST LA MÊME POUR TOUS : « Je ne peux prendre un ordre que du titulaire lui-même. Demandez-lui de nous écrire ou de nous appeler, nous le rappelons dans l'heure. » Ne rien promettre de recontacter le tiers, ne rien dire du dossier, et proposer le rappel du titulaire : c'est la seule issue, et elle est rapide.",
            "THE RIGHT ANSWER ON THE PHONE IS THE SAME FOR EVERYONE: « I can only take an order from the holder themselves. Ask them to write or call us, we call back within the hour. » Promise nothing about calling the third party back, say nothing about the file, and offer to call the holder: it is the only way through, and it is quick.",
          ),
        },
        {
          type: "p",
          text: l(
            "Le seul cas où la position cesse de dépendre du titulaire est son décès : elle est alors conservée jusqu'à instruction des ayants droit dûment justifiés, et c'est l'article 9 qui le règle, pas une procuration.",
            "The only case where the position stops depending on the holder is their death: it is then kept until instructed by the duly evidenced heirs, and article 9 settles that, not a power of attorney.",
          ),
        },
        {
          type: "note",
          kind: "info",
          text: l(
            "LA MÊME PROCÉDURE POUR UNE SOCIÉTÉ ET POUR UNE ASSOCIATION, et c'est ce que fait la place. Les pièces du dossier diffèrent, récépissé contre RCCM, mais le modèle d'accès est le même, parce que la question posée est la même : qui, parmi les personnes déclarées, peut agir. Seule l'indivision se distingue vraiment, et dans l'autre sens : ses désignés ne représentent personne, ils SONT le titulaire.",
            "THE SAME PROCEDURE FOR A COMPANY AND FOR AN ASSOCIATION, and that is what the market does. The file's documents differ, registration receipt against trade register, but the access model is the same, because the question asked is the same: who, among the declared persons, may act. Only the undivided account really differs, and in the other direction: its designated people represent nobody, they ARE the holder.",
          ),
        },
      ],
    },
    {
      id: "acces",
      title: l("L'accès nommé", "Named access"),
      blocks: [
        {
          type: "lead",
          text: l(
            "QUAND LE TITULAIRE N'EST PAS UNE PERSONNE PHYSIQUE, IL A PLUSIEURS MAINS, et chacune a sa clef. Un compte porte un identifiant, donc une connexion : pour une société, une association ou une indivision, deux ou trois personnes la partageaient. Le journal ne pouvait jamais dire laquelle avait agi, retirer quelqu'un du conseil obligeait à changer le code de tout le monde, et la règle de décision d'un PV ne pouvait pas exister derrière un seul jeu d'identifiants.",
            "WHEN THE HOLDER IS NOT A NATURAL PERSON, IT HAS SEVERAL HANDS, and each has its key. An account carries one identity, hence one sign-in: for a company, an association or an undivided account, two or three people shared it. The log could never say which one had acted, removing someone from the board meant changing everyone's code, and the decision rule of a minute could not exist behind a single set of credentials.",
          ),
        },
        {
          type: "steps",
          items: [
            l(
              "L'accès se donne depuis le dossier, à une personne DÉCLARÉE et qui peut agir : un représentant légal, un cotitulaire désigné. Un bénéficiaire effectif n'en reçoit pas. On choisit dans la liste, jamais en tapant un nom : ce qui n'est pas déclaré n'existe pas.",
              "Access is granted from the file, to a DECLARED person who may act: a legal representative, a designated co-holder. A beneficial owner gets none. You pick from the list, never by typing a name: what is not declared does not exist.",
            ),
            l(
              "Il se donne à un NUMÉRO OU UNE ADRESSE, pas à un compte : vous n'avez de compte à créer pour personne. Le premier code reçu à ce canal lie l'accès à l'identité qui l'a reçu, une fois, et le canal cesse alors de suffire.",
              "It is granted to a NUMBER OR AN ADDRESS, not to an account: you have no account to create for anybody. The first code received at that channel binds the access to the identity that received it, once, and the channel then stops being enough.",
            ),
            l(
              "La personne se connecte avec son propre code et arrive sur le compte, que l'écran lui nomme en haut de page. Le compte reste le titulaire : positions, espèces et documents ne bougent pas. Ce qui change est que CHAQUE GESTE PORTE LE NOM DE LA MAIN qui l'a fait, au registre des gestes comme à l'audit.",
              "The person signs in with their own code and lands on the account, which the screen names at the top of the page. The account remains the holder: positions, cash and documents do not move. What changes is that EVERY MOVE CARRIES THE NAME OF THE HAND that made it, in the register of moves as in the audit.",
            ),
            l(
              "Un canal ne sert qu'un accès, et une personne n'agit que sur un compte à la fois. Un représentant qui sert deux sociétés demanderait un sélecteur de compte, et l'ambiguïté sur « quel compte suis-je en train d'engager » est ce qu'un écran de marché supporte le moins. L'écran refuse en nommant l'autre accès.",
              "A channel serves one access, and a person acts on one account at a time. A representative serving two companies would need an account switcher, and ambiguity about « which account am I committing » is what a market screen tolerates least. The screen refuses, naming the other access.",
            ),
          ],
        },
        {
          type: "note",
          kind: "info",
          text: l(
            "LE SECOND REGARD EST PLACÉ LÀ OÙ LA PLACE LE MET, et pas sur les ordres. Interactive Brokers n'impose pas deux personnes sur une transaction : il les impose sur l'ajout d'un utilisateur et sur le changement de ses droits. La raison est bonne, et nous la reprenons : un ordre est borné par un plafond, réversible et tracé ; donner à quelqu'un la main sur un compte ne l'est pas. Un ordre à deux signatures paralyserait le compte sans fermer le vrai risque.",
            "THE SECOND PAIR OF EYES SITS WHERE THE MARKET PUTS IT, and not on orders. Interactive Brokers does not require two people on a trade: it requires them on adding a user and on changing their rights. The reason is sound, and we take it: an order is capped, reversible and traced; giving someone the keys to an account is not. A two-signature order would paralyse the account without closing the real risk.",
          ),
        },
      ],
    },
    {
      id: "plafond",
      title: l("Le plafond par ordre", "The per-order cap"),
      blocks: [
        {
          type: "p",
          text: l(
            "Un PV dit « double signature au-delà de cinq millions par ordre ». On n'applique PAS la double signature : elle obligerait deux personnes à être devant leur téléphone au moment où une adjudication se clôt, et la place ne le fait nulle part. Ce que le PV veut dire est qu'au-delà d'un montant, le groupe ne veut pas qu'une seule personne engage la caisse d'un geste. Au-delà du plafond, l'ordre QUITTE LE LIBRE-SERVICE et se passe avec un conseiller, qui parle au groupe. Rien n'est refusé ; un chemin plus lent est imposé, ce qui est exactement le but.",
            "A minute says « two signatures above five million per order ». We do NOT apply the double signature: it would force two people to be at their phone when an auction closes, and the market does it nowhere. What the minute means is that beyond an amount, the group does not want one person committing the fund in a single move. Beyond the cap, the order LEAVES SELF-SERVICE and is placed with an adviser, who speaks to the group. Nothing is refused; a slower path is imposed, which is exactly the point.",
          ),
        },
        {
          type: "table",
          head: [l("Le plafond", "The cap"), l("Ce qu'il fait", "What it does")],
          rows: [
            [
              l("Deux étages", "Two tiers"),
              l(
                "celui du compte vient du PV ; une personne peut en porter un plus bas quand le PV donne des pouvoirs inégaux. Le plus bas gagne : une délégation ne dépasse jamais le mandat dont elle sort.",
                "the account's comes from the minutes; a person may carry a lower one where the minutes give unequal powers. The lower wins: a delegation never exceeds the mandate it comes from.",
              ),
            ],
            [
              l("Il ne regarde que ce qui engage", "It only looks at what commits"),
              l("vendre, racheter des parts et sortir ses espèces ne sont jamais bornés : les borner enfermerait le groupe dans son compte.", "selling, redeeming units and withdrawing cash are never capped: capping them would lock the group inside its account."),
            ],
            [
              l("Il se dit avant, pas au refus", "It is said beforehand, not at the refusal"),
              l("le client le lit en haut de son espace. Le découvrir en butant dessus au moment de signer est une panne muette : il a déjà réuni le groupe.", "the client reads it at the top of their space. Discovering it by bumping into it at signing time is a silent failure: they have already gathered the group."),
            ],
            [
              l("Relever demande deux regards", "Raising requires two pairs of eyes"),
              l("abaisser, non. Élargir ce qu'une personne engage seule est le même geste que lui donner un accès ; le restreindre doit pouvoir se faire d'une main.", "lowering does not. Widening what one person commits alone is the same move as granting them access; restricting it must take one hand."),
            ],
          ],
        },
        {
          type: "note",
          kind: "info",
          text: l(
            "La phrase du PV reste à côté du chiffre, dans « Règle de décision ». Elle dit ce que le groupe a voulu ; le champ dit ce qui s'applique. Un fait qui doit être tenu vit dans un champ, jamais dans une phrase qu'on réécrit.",
            "The minute's sentence stays beside the figure, under « Decision rule ». It says what the group wanted; the field says what applies. A fact that must be held lives in a field, never in a sentence that gets rewritten.",
          ),
        },
      ],
    },
    {
      id: "personnes",
      title: l("La liste des personnes déclarées", "The list of declared persons"),
      blocks: [
        {
          type: "note",
          kind: "warn",
          text: l(
            "QUI ÉCRIT CETTE LISTE COMMANDE QUI PEUT RECEVOIR UN ACCÈS, et c'est pour cela que l'ajout d'un signataire est le geste le plus contrôlé de tout ce lot. Le client déclare ses personnes à l'ouverture et n'y touche plus après l'approbation ; le desk le peut, parce qu'un conseil change et qu'un dossier ne doit pas geler avec lui, mais il lui faut une seconde personne ET l'acte qui désigne le nouveau venu. Un signataire ne s'ajoute pas sur un appel téléphonique.",
            "WHOEVER WRITES THIS LIST COMMANDS WHO MAY RECEIVE AN ACCESS, which is why adding a signatory is the most controlled move of this whole set. The client declares their persons at opening and no longer touches them after approval; the desk may, because a board changes and a file must not freeze with it, but it needs a second person AND the deed that appoints the newcomer. A signatory is not added on a phone call.",
          ),
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "RETIRER QUELQU'UN FERME SON ACCÈS DANS LE MÊME GESTE, et c'est tout le point. Les deux séparés laisseraient un ancien administrateur se connecter et passer des ordres sur un compte dont il ne répond plus : on ne peut pas compter sur le souvenir de faire le second. Un point de Santé compte les accès dont la personne n'est plus déclarée ; il devrait toujours valoir zéro, et c'est précisément pour cela qu'il existe.",
            "REMOVING SOMEONE CLOSES THEIR ACCESS IN THE SAME MOVE, and that is the whole point. The two apart would let a former director sign in and place orders on an account they no longer answer for: one cannot rely on remembering to do the second. A health point counts accesses whose person is no longer declared; it should always read zero, and that is precisely why it exists.",
          ),
        },
        {
          type: "p",
          text: l(
            "La date de naissance de chaque personne déclarée est obligatoire depuis le 10 octobre 2026, et ce n'est pas une formalité : elle sert deux fois. Le contrôle sanctions ne recevait qu'un nom, alors que son propre champ de notes demande d'écarter l'homonymie « date de naissance comparée ». Et le registre des personnes écartées n'accroche par le nom que si la date l'accompagne, ce qui est la seule prise qui survive à une pièce neuve.",
            "The date of birth of each declared person has been required since 10 October 2026, and it is not a formality: it serves twice. The sanctions check received only a name, while its own notes field asks to rule out namesakes by « date of birth compared ». And the register of barred persons only catches by name if the date comes with it, which is the one grip that survives a new document.",
          ),
        },
      ],
    },
    {
      id: "situations",
      title: l("Quatre situations, pas à pas", "Four situations, step by step"),
      blocks: [
        {
          type: "lead",
          text: l(
            "Ce qui précède dit pourquoi. Ceci dit comment, dans l'ordre, pour les quatre cas qui arrivent vraiment.",
            "What precedes says why. This says how, in order, for the four cases that actually come up.",
          ),
        },
        {
          type: "p",
          text: l("UNE TONTINE OUVRE UN COMPTE.", "A SAVINGS GROUP OPENS AN ACCOUNT."),
        },
        {
          type: "steps",
          items: [
            l("Le client remplit son dossier : forme du groupement, les deux ou trois cotitulaires désignés avec leur date de naissance et leur pièce, la règle de décision telle que le PV l'écrit.", "The client fills their file: the group's form, the two or three designated co-holders with their date of birth and document, the decision rule as the minutes write it."),
            l("À la revue, vérifiez le PV : il doit désigner nommément ces personnes-là et porter la règle. Le contrôle sanctions passe sur tous les noms, et la date de naissance écarte les homonymes.", "At review, check the minutes: they must name those people and carry the rule. The sanctions check runs on every name, and the date of birth rules out namesakes."),
            l("Approuvez. Puis, dans « Qui peut se connecter sur ce compte », portez le plafond du PV dans le champ du compte : tant qu'il n'y est pas, la règle n'est qu'une phrase.", "Approve. Then, under « Who may sign in on this account », put the minutes' cap in the account's field: until it is there, the rule is only a sentence."),
            l("Accordez un accès à chaque cotitulaire, sur SON numéro. Un second responsable confirme. Dites-leur que le premier code reçu liera leur accès.", "Grant an access to each co-holder, on THEIR number. A second manager confirms. Tell them the first code received will bind their access."),
          ],
        },
        {
          type: "p",
          text: l("UNE SOCIÉTÉ CHANGE DE DIRECTEUR GÉNÉRAL.", "A COMPANY CHANGES ITS MANAGING DIRECTOR."),
        },
        {
          type: "steps",
          items: [
            l("Demandez l'acte : PV du conseil, décision de l'assemblée. Sans lui, rien ne bouge, et le dire au client n'est pas une lenteur, c'est la protection de sa propre société.", "Ask for the deed: board minutes, general meeting decision. Without it nothing moves, and saying so to the client is not slowness, it is the protection of their own company."),
            l("RETIREZ L'ANCIEN D'ABORD. Son accès se ferme dans le même geste, et c'est la raison de cet ordre : commencer par l'ajout laisse une fenêtre où deux personnes peuvent engager la société.", "REMOVE THE OUTGOING ONE FIRST. Their access closes in the same move, and that is the reason for this order: starting with the addition leaves a window where two people may commit the company."),
            l("Ajoutez le nouveau avec sa date de naissance, sa pièce et la référence de l'acte. Un second responsable confirme.", "Add the new one with their date of birth, their document and the deed's reference. A second manager confirms."),
            l("REFAITES LE CONTRÔLE SANCTIONS avec son nom : le dossier porte une attestation, et elle ne vaut que pour les noms qu'elle a vus. L'écran ne vous le rappellera pas.", "REDO THE SANCTIONS CHECK with their name: the file carries an attestation, and it only covers the names it has seen. The screen will not remind you."),
            l("Accordez-lui un accès, et son plafond propre si le conseil lui en donne un autre.", "Grant them an access, and their own cap if the board gives them a different one."),
          ],
        },
        {
          type: "p",
          text: l("QUELQU'UN DIT NE PAS POUVOIR SE CONNECTER.", "SOMEONE SAYS THEY CANNOT SIGN IN."),
        },
        {
          type: "list",
          items: [
            l("Son accès a-t-il été retiré ? La fiche du compte le dit, avec la date et le motif.", "Was their access withdrawn? The account's file says so, with the date and the reason."),
            l("Se connecte-t-il avec le canal de l'accès ? Un accès posé sur un numéro ne s'ouvre pas avec une adresse.", "Are they signing in with the access's channel? An access set on a number does not open with an address."),
            l("Le numéro est-il le bon à un chiffre près ? C'est la panne la plus fréquente, et l'accès dit « jamais connecté » tant qu'elle dure.", "Is the number right to the digit? That is the most frequent failure, and the access reads « never signed in » while it lasts."),
            l("A-t-il déjà un dossier à son nom ? Alors il reste sur son compte à lui : une personne qui a son propre compte n'est jamais déplacée chez un autre.", "Do they already have a file of their own? Then they stay on their own account: a person with their own account is never moved to someone else's."),
            l("Son accès est-il lié à une AUTRE identité ? Le premier qui a reçu un code à ce canal l'a pris. Retirez l'accès et redonnez-le sur un canal qui n'appartient qu'à elle.", "Is their access bound to ANOTHER identity? Whoever first received a code at that channel took it. Withdraw the access and grant it again on a channel that belongs to them alone."),
          ],
        },
        {
          type: "p",
          text: l("UN CLIENT DIT QUE SON ORDRE EST REFUSÉ POUR DÉPASSEMENT.", "A CLIENT SAYS THEIR ORDER IS REFUSED FOR EXCEEDING THE CAP."),
        },
        {
          type: "steps",
          items: [
            l("C'est voulu : au-delà du plafond, l'ordre se passe avec vous. Ne proposez pas de relever le plafond pour le dépanner, ce serait défaire la règle que le groupe s'est donnée.", "This is intended: beyond the cap, the order is placed with you. Do not offer to raise the cap to help them out, that would undo the rule the group gave itself."),
            l("Demandez la confirmation du groupe selon SA règle de décision, celle qui est écrite sur la fiche. Un courriel des deux cotitulaires suffit s'il dit le montant et la ligne.", "Ask for the group's confirmation under ITS decision rule, the one written on the file. An e-mail from both co-holders is enough if it states the amount and the line."),
            l("Passez l'ordre, et rangez la confirmation dans l'échange du dossier : c'est elle qui vous couvre.", "Place the order, and file the confirmation in the file's exchange: that is what covers you."),
            l("Un plafond ne se relève que sur un nouvel acte, et à deux regards.", "A cap is only raised on a new deed, and with two pairs of eyes."),
          ],
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
            [l("Les personnes déclarées, les accès, les plafonds", "The declared persons, the accesses, the caps"), l("Dossiers › le client (comptes non physiques seulement)", "Files › the client (non-natural-person accounts only)")],
            [l("Qui a fait quoi sur un compte à plusieurs", "Who did what on a shared account"), l("Journal › Gestes des clients, colonne « Qui »", "Journal › Client moves, « Who » column")],
            [l("Un accès qui aurait survécu à sa personne", "An access that outlived its person"), l("Santé › Accès sans personne déclarée", "Health › Access with no declared person")],
            [l("Ce que le client lit de son côté", "What the client reads on their side"), l("Son espace : le compte sur lequel il agit, et son plafond", "Their space: the account they act on, and their cap")],
            [l("La règle écrite au client", "The rule as written to the client"), l("Convention, article 9", "Agreement, article 9")],
          ],
        },
      ],
    },
  ],
};
