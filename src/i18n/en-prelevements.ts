/**
 * Les mandats de prélèvement (page /moi/prelevements, 9 octobre 2026).
 *
 * Ils ont leur fichier parce qu'ils forment un vocabulaire à eux : un mandat,
 * un plafond par échéance, un compte débité, une révocation. Les disperser
 * dans en-console aurait noyé trente-six clefs qui se relisent ensemble le
 * jour où le juriste demandera ce que le client a exactement autorisé.
 */
export const EN_PRELEVEMENTS: Record<string, string> = {
  "Vos prélèvements": "Your direct debits",
  "Payer sans y penser": "Paying without thinking about it",
  "Vous pouvez nous autoriser à prélever une somme sur votre compte bancaire, à une date fixe du mois. C'est vous qui fixez le plafond, et nous ne le dépassons jamais. Chaque prélèvement est annoncé avant de partir, et vous pouvez révoquer votre autorisation à tout moment, sans motif.":
    "You may authorise us to debit a sum from your bank account, on a fixed day of the month. You set the ceiling, and we never go beyond it. Every debit is announced before it leaves, and you may revoke your authorisation at any time, without giving a reason.",
  "Vos autorisations": "Your authorisations",
  "Alimenter ma provision": "Funding my provision",
  "Alimenter mon épargne programmée": "Funding my savings plan",
  suspendu: "suspended",
  actif: "active",
  "{m} FCFA, le {j}": "{m} FCFA, on the {j}",
  "Plafond par échéance": "Ceiling per instalment",
  "Compte débité": "Account debited",
  "Référence du mandat": "Mandate reference",
  "Signé le {d}. Votre exemplaire est dans vos documents : votre banque peut vous le demander.":
    "Signed on {d}. Your copy is in your documents: your bank may ask you for it.",
  "Recevoir mon code": "Get my code",
  "Je signe ce mandat": "I sign this mandate",
  Garder: "Keep it",
  "Révoquer ce mandat": "Revoke this mandate",
  "En ajouter un": "Add another",
  "Autoriser un prélèvement": "Authorise a direct debit",
  "Préparer un mandat": "Prepare a mandate",
  "À quoi sert ce prélèvement ?": "What is this debit for?",
  "Alimenter ma provision, chaque mois": "Funding my provision, every month",
  "Alimenter une épargne programmée": "Funding a savings plan",
  "Alimenter une épargne programmée (vous n'en avez pas encore)": "Funding a savings plan (you have none yet)",
  Laquelle: "Which one",
  "{r} · {m} FCFA le {j}": "{r} · {m} FCFA on the {j}",
  "Montant prélevé chaque mois": "Amount debited each month",
  "Jour du mois ({a} à {b})": "Day of the month ({a} to {b})",
  "Plafond par échéance : nous ne prélèverons jamais plus": "Ceiling per instalment: we will never debit more",
  "Titulaire du compte à débiter": "Holder of the account to debit",
  "Banque du compte à débiter": "Bank of the account to debit",
  "RIB ou IBAN du compte à débiter": "Bank details or IBAN of the account to debit",
  "Ce compte doit être ouvert à votre nom. Nous ne présentons jamais de prélèvement sur le compte d'un tiers.":
    "This account must be in your name. We never present a debit on a third party's account.",
  "Préparer, puis signer": "Prepare, then sign",
  Révoqués: "Revoked",
  Provision: "Provision",
  "révoqué le {d}": "revoked on {d}",

  /* Le desk : l'exécution des mandats (page /desk/prelevements). Même
     vocabulaire que la page du client, et c'est la raison du même fichier :
     un mandat, une échéance, un tirage, une remise, un rejet et sa cause. */
  "L'échéance du {d}":
    "The {d} instalment",
  "Rien ne part sans que son préavis soit parti, et pas avant {n} jours.":
    "Nothing leaves before its notice has left, and not less than {n} days before.",
  "Aucun mandat ne se présente à cette échéance.":
    "No mandate falls due on this date.",
  "plafond {m}":
    "ceiling {m}",
  "à annoncer":
    "to announce",
  "préavis parti":
    "notice sent",
  "préavis non parti":
    "notice not sent",
  "aucun canal joignable":
    "no channel reachable",
  "Écartés d'office, et pourquoi":
    "Set aside, and why",
  "Relancer les préavis non partis":
    "Send the notices that did not leave",
  "Préparer et annoncer ({n})":
    "Prepare and announce ({n})",
  "Remettre à la banque ({n})":
    "Hand to the bank ({n})",
  "Remise {r} partie le {d}. Le fichier se retélécharge ci-dessous.":
    "Batch {r} handed over on {d}. The file can be downloaded again below.",
  "{n} tirage(s) prêt(s) sont arrivés après son départ : ils ne peuvent pas partir aujourd'hui, un second fichier le même jour ferait un double prélèvement. Appelez le client, ou laissez-les à l'échéance suivante.":
    "{n} ready draw(s) arrived after it left: they cannot leave today, as a second file on the same day would debit twice. Call the client, or leave them to the next instalment.",
  "seconde présentation, après un rejet":
    "second presentation, after a reject",
  "tirage déjà préparé":
    "draw already prepared",
  "{n} prêts sur {total} · {m} FCFA":
    "{n} ready out of {total} · {m} FCFA",
  "{n} attendent que leur préavis parte":
    "{n} are waiting for their notice to leave",
  "Prélèvements":
    "Direct debits",
  "Ici la maison tire, au lieu que le client pousse. Une échéance se prépare, s'annonce, se remet à la banque en un fichier, et revient avec trois issues possibles par ligne. La troisième, « sans nouvelle », est la pire : rien ne s'est passé, et rien ne le dit.":
    "Here the firm pulls, instead of the client pushing. An instalment is prepared, announced, handed to the bank as a file, and comes back with three possible outcomes per line. The third, « no news », is the worst: nothing happened, and nothing says so.",
  "Échéance en cours":
    "Instalment in hand",
  "À prélever":
    "To debit",
  "Prêts à remettre":
    "Ready to hand over",
  "Sans nouvelle":
    "No news",
  "Rejets ce mois":
    "Rejects this month",
  "Mandats suspendus":
    "Suspended mandates",
  "Remise {r} · {n} tirages · {m} FCFA":
    "Batch {r} · {n} draws · {m} FCFA",
  "Remise le {d}":
    "Handed over on {d}",
  "Le fichier de la remise (CSV)":
    "The batch file (CSV)",
  "Le format exact reste à convenir avec la banque : ce sont les colonnes qui bougeront, pas les lignes. La lettre d'accompagnement suivra quand la banque aura dit ce qu'elle veut y lire.":
    "The exact format remains to be agreed with the bank: the columns will move, the lines will not. The covering letter will follow once the bank says what it wants to read on it.",
  "La cause d'un rejet décide de la suite":
    "The cause of a reject decides what follows",
  "Et ce n'est pas le nombre de rejets qui décide, sauf pour une seule cause.":
    "And it is not the number of rejects that decides, except for one single cause.",
  "Une seconde présentation, quinze jours plus tard, annoncée comme la première. Au second rejet de cette cause, le mandat se suspend.":
    "A second presentation, fifteen days later, announced like the first. On the second reject of this cause, the mandate suspends itself.",
  "Suspension immédiate. Représenter n'aboutirait pas, et insister fait casser le mandat par la banque du client.":
    "Immediate suspension. Presenting again would not succeed, and insisting gets the mandate cancelled by the client's bank.",
  "Rien ne part sans préavis parti. C'est déjà la loi des instructions permanentes, et elle vaut davantage ici : un versement qu'on n'a pas annoncé ne fait que ne pas avoir lieu, un prélèvement qu'on n'a pas annoncé est un débit que le client découvre sur son relevé.":
    "Nothing leaves before its notice has left. It is already the law of standing instructions, and it matters more here: a payment that was not announced merely fails to happen, a debit that was not announced is one the client discovers on their statement.",
  "Jamais au-delà du plafond signé. Une échéance qui dépasse n'est pas rognée en silence : elle est écartée, et quelqu'un appelle. Rogner reviendrait à décider du montant à la place du client.":
    "Never beyond the signed ceiling. An instalment that exceeds it is not quietly trimmed: it is set aside, and somebody calls. Trimming would mean deciding the amount for the client.",
  "Un tirage remis a trois issues, et la troisième est l'absence des deux autres. « Sans nouvelle » se calcule et ne se range pas : au-delà de {n} jours, la page le dit et Santé le signale.":
    "A draw handed over has three outcomes, and the third is the absence of the other two. « No news » is computed, never stored: beyond {n} days, the page says so and Health flags it.",
  "La cause d'un rejet décide de la suite, pas le compte. Une provision insuffisante se représente une fois ; un compte clos ne se représente jamais. Compter sans lire la cause ferait harceler la banque d'un client dont le compte n'existe plus.":
    "The cause of a reject decides what follows, not the count. Insufficient funds are presented once more; a closed account never is. Counting without reading the cause would mean hounding the bank of a client whose account no longer exists.",
  "Le préavis part {n} jours avant l'échéance : un versement programmé se refuse en un jour, un prélèvement demande d'avoir les fonds sur son compte, et cela ne se fait pas en une nuit.":
    "The notice leaves {n} days before the instalment: a scheduled payment can be refused in a day, a direct debit requires having the funds on the account, and that is not done overnight.",
  "Remises passées":
    "Past batches",
  "Une remise ne se refait pas : un second fichier pour le même jour serait un double prélèvement.":
    "A batch is not made twice: a second file for the same day would be a double debit.",
  "{n} tirages":
    "{n} draws",
  "encaissés":
    "collected",
  "rejetés":
    "rejected",
  "Référence de l'échéance affichée : {r}":
    "Reference of the instalment shown: {r}",
  "Remises en attente de sort":
    "Batches awaiting their outcome",
  "Un tirage remis a trois issues. Tant qu'aucune n'est inscrite, l'argent n'existe nulle part.":
    "A draw handed over has three outcomes. Until one is recorded, the money exists nowhere.",
  "Rien n'attend son sort.":
    "Nothing is awaiting an outcome.",
  "échéance du {d}":
    "instalment of {d}",
  "sans nouvelle · {n} jours":
    "no news · {n} days",
  "Remis, ni crédité ni rejeté. C'est la banque qu'on appelle.":
    "Handed over, neither credited nor rejected. It is the bank we call.",
  "remis il y a {n} jours":
    "handed over {n} days ago",
  "Motif du rejet":
    "Reason for the reject",
  "Le code de la banque, si elle en donne un":
    "The bank's code, if it gives one",
  "Inscrire le rejet":
    "Record the reject",
  "Encaissé":
    "Collected",
  "Rejeté…":
    "Rejected…",
  "Ils ne se réactivent pas tout seuls : un mot au client d'abord, le bouton ensuite.":
    "They do not reactivate by themselves: a word to the client first, the button afterwards.",
  "{n} rejet(s) consécutifs":
    "{n} consecutive reject(s)",
  "Réactiver":
    "Reactivate",
  "présenté à votre banque":
    "presented to your bank",
  "annoncé, à venir":
    "announced, to come",
  "à venir":
    "to come",
  "reçu":
    "received",
  "Provision insuffisante":
    "Insufficient funds",
  "Compte clos":
    "Account closed",
  "Opposition du client":
    "Client's objection",
  "Coordonnées bancaires erronées":
    "Incorrect bank details",
  "Mandat inconnu de la banque":
    "Mandate unknown to the bank",
  "Autre motif":
    "Other reason",
  "Votre banque n'a pas pu honorer le prélèvement. Nous le représenterons une fois, et nous vous préviendrons avant.":
    "Your bank could not honour the debit. We will present it once more, and we will tell you beforehand.",
  "Le compte à débiter est clos. Votre mandat est en pause : indiquez-nous le nouveau compte et nous le reprenons.":
    "The account to debit is closed. Your mandate is paused: tell us the new account and we will take it up again.",
  "Votre banque nous signale une opposition sur ce prélèvement. Nous ne présentons plus rien, et votre conseiller vous appelle.":
    "Your bank reports an objection to this debit. We present nothing further, and your adviser will call you.",
  "Le prélèvement n'a pas abouti : les coordonnées du compte ne correspondent pas. Votre mandat est en pause, nous le reprenons avec vous.":
    "The debit did not go through: the account details do not match. Your mandate is paused, and we will take it up with you.",
  "Votre banque ne reconnaît pas ce mandat. Votre mandat est en pause ; votre conseiller vous appelle pour le régulariser.":
    "Your bank does not recognise this mandate. Your mandate is paused; your adviser will call you to put it right.",
  "Le prélèvement n'a pas abouti. Votre mandat est en pause le temps que nous comprenions pourquoi.":
    "The debit did not go through. Your mandate is paused while we work out why.",
  "Votre dossier doit être ouvert avant de signer un mandat : c'est lui qui porte le canal par lequel le code vous parvient.":
    "Your account-opening file must exist before you sign a mandate: it carries the channel the code reaches you by.",
  "Il nous faut une adresse e-mail avant de signer : c'est là que part le code, puis l'annonce de chaque prélèvement.":
    "We need an e-mail address before you sign: that is where the code goes, and then the notice of every debit.",
  "Ajouter mon adresse →":
    "Add my address →",
  "Ce montant est aussi votre plafond : nous ne prélèverons jamais plus, et jamais autre chose.":
    "This amount is also your ceiling: we will never debit more, and never anything else.",
};
