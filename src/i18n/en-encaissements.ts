/**
 * English for what has come in, and what custody costs.
 *
 * One distinction governs every line here, and getting it wrong in English
 * would undo the whole service: « échu » is *due*, an event on a schedule, and
 * « reçu » is *received*, a credit someone has actually seen. The application
 * said "due" for everything because it could not tell; it can now, and these
 * two words must stay as far apart in English as they are in French.
 *
 * « Droits de garde » are custody fees. « Assiette » is the fee base. « Barème »
 * is the fee schedule, and it is rendered "schedule" rather than "scale"
 * because the house has not set it yet: a closed schedule charges nothing.
 */
export const EN_ENCAISSEMENTS: Record<string, string> = {
  /* ---------- la bande des coupons ---------- */
  "{m} FCFA reçus et disponibles": "{m} FCFA received and available",
  "{m} FCFA échus et pas encore reçus": "{m} FCFA due and not yet received",
  "le plus ancien depuis {n} jours": "the oldest for {n} days",
  "L'émetteur doit encore ces sommes, et le desk les suit.": "The issuer still owes these amounts, and the desk is tracking them.",
  "Réinvestir automatiquement": "Reinvest automatically",
  "Vos encaissements, replacés dès qu'ils arrivent": "Your receipts, reinvested as they arrive",
  "à partir de {m} FCFA encaissés": "from {m} FCFA received",
  "quel que soit le montant": "whatever the amount",

  /* ---------- la file du desk ---------- */
  Encaissements: "Receipts",
  "Ce que les émetteurs devaient et qui n'est pas arrivé. Une échéance passée n'est pas un encaissement : tant que personne n'a constaté le crédit, le client lit « échu » et non « reçu ».":
    "What issuers owed and has not arrived. A past due date is not a receipt: until someone has confirmed the credit, the client reads \"due\" and not \"received\".",
  "Échéances attendues": "Payments awaited",
  "Montant attendu": "Amount awaited",
  "Retard le plus long": "Longest delay",
  "Déjà encaissé": "Already received",
  "{n} échéances attendues": "{n} payments awaited",
  "Constater l'encaissement": "Confirm the receipt",
  "Inscription…": "Recording…",
  "Aucune échéance en attente : tout ce qui est échu a été constaté au journal, et les clients peuvent lire « reçu ».":
    "No payment outstanding: everything due has been recorded in the ledger, and clients can read \"received\".",
  "Ce que ce geste engage": "What this action commits",
  "Inscrire un encaissement, c'est constater un crédit sur le compte de règlement. Ce n'est pas dire qu'une échéance est passée : cela, l'échéancier le sait déjà et le client le lit déjà.":
    "Recording a receipt means confirming a credit on the settlement account. It does not mean a due date has passed: the schedule already knows that, and the client already reads it.",
  "Un mouvement s'ajoute et ne se corrige pas : une erreur se répare par un mouvement inverse, jamais par une réécriture.":
    "An entry is added and never corrected: a mistake is repaired by an opposite entry, never by rewriting.",
  "L'argent inscrit n'attend aucune opération, et c'est voulu : soit une instruction de réinvestissement le réclame et le robot le place, soit il repart chez le client. Ce qu'il ne fait pas, c'est dormir sur la plateforme.":
    "The money recorded awaits no operation, and that is deliberate: either a reinvestment instruction claims it and the robot places it, or it goes back to the client. What it does not do is sit idle on the platform.",
  "La même échéance ne s'inscrit qu'une fois : la base le garantit, et deux clics ne créditent pas deux fois.":
    "The same payment is recorded only once: the database guarantees it, and two clicks do not credit twice.",
  "Cette échéance est déjà portée au journal.": "This payment is already recorded in the ledger.",

  /* ---------- l'instruction de réinvestissement ---------- */
  "Réinvestir vos encaissements": "Reinvest your receipts",
  "Un coupon qui dort sur un compte en banque cesse de rapporter pendant que la ligne qui l'a versé continue. Cette instruction replace ce qui vous revient, dès qu'il arrive, sur la ligne que vous choisissez maintenant.":
    "A coupon sitting in a bank account stops earning while the line that paid it carries on. This instruction reinvests what comes to you, as soon as it arrives, in the line you choose now.",
  "Ce que vous avez aujourd'hui": "What you hold today",
  Disponible: "Available",
  "reçu et n'attendant aucune opération": "received and awaiting no operation",
  "Échu, pas encore reçu": "Due, not yet received",
  "{n} échéances, la plus ancienne depuis {j} jours": "{n} payments, the oldest for {j} days",
  "Encaissé à ce jour": "Received to date",
  "porté à votre journal": "recorded in your ledger",
  "le prochain le {d}": "the next on {d}",
  "aucune échéance connue": "no known payment",
  "« Disponible » est de l'argent réellement arrivé sur le compte de règlement et constaté par le desk. « Échu, pas encore reçu » est une créance sur l'émetteur : elle vous est due, elle n'est pas là, et rien ne se replace avec.":
    "\"Available\" is money that has actually arrived on the settlement account and been confirmed by the desk. \"Due, not yet received\" is a claim on the issuer: it is owed to you, it is not there, and nothing is reinvested with it.",
  "Votre instruction": "Your instruction",
  "Mettre le réinvestissement en place": "Set up the reinvestment",
  "Comment cela marche": "How it works",
  "Un coupon ou un remboursement tombe. Le desk constate le crédit et le porte à votre journal : à ce moment seulement, la somme est « reçue ».":
    "A coupon or a redemption falls due. The desk confirms the credit and records it in your ledger: only then is the amount \"received\".",
  "Le lendemain au plus tard, tout ce qui est disponible part sur la ligne que vous avez choisie, si le total atteint votre plancher.":
    "By the next day at the latest, everything available goes to the line you chose, provided the total reaches your floor.",
  "L'ordre produit est un ordre ordinaire : il porte une référence, vous en recevez l'avis, et il paraît dans votre espace comme les autres.":
    "The order produced is an ordinary order: it carries a reference, you receive its notice, and it appears in your space like the others.",
  "Vous arrêtez l'instruction d'un bouton, sans motif à donner. Ce qui est facile à prendre doit être au moins aussi facile à quitter.":
    "You stop the instruction with one button, with no reason to give. What is easy to take up must be at least as easy to leave.",
  "La maison ne choisit rien : ni la ligne, ni le moment, ni le montant. La ligne est la vôtre, le moment est celui où l'argent arrive, et le montant est ce que l'émetteur a versé. Choisir à votre place demanderait un agrément que Purpose Capital n'a pas.":
    "The firm chooses nothing: not the line, not the timing, not the amount. The line is yours, the timing is when the money arrives, and the amount is what the issuer paid. Choosing on your behalf would require a licence Purpose Capital does not hold.",
  "Aucun fonds n'est ouvert à la souscription en ce moment : le réinvestissement se programmera dès qu'il y en aura un.":
    "No fund is open for subscription at the moment: the reinvestment can be set up as soon as one is.",
  "Où replacer vos encaissements": "Where to reinvest your receipts",
  "Une ligne précise, fixée maintenant. La maison n'a pas l'agrément pour choisir à votre place le mois venu.":
    "A specific line, fixed now. The firm does not hold the licence to choose on your behalf when the time comes.",
  "À partir de quelle somme encaissée": "From what amount received",
  "En deçà, on attend le coupon suivant plutôt que de passer un ordre dont les frais mangeraient le produit.":
    "Below that, we wait for the next coupon rather than place an order whose fees would eat the proceeds.",
  "Ce fonds demande au moins {m} FCFA par versement.": "This fund requires at least {m} FCFA per instalment.",
  "Si la destination se ferme": "If the destination closes",
  "garder l'argent disponible et m'en avertir": "keep the money available and tell me",
  "arrêter l'instruction": "stop the instruction",
  "Décidé maintenant, par vous. Improviser le jour venu reviendrait à décider à votre place.":
    "Decided now, by you. Improvising when the day comes would mean deciding on your behalf.",
  "Enregistrement…": "Saving…",
  "Connectez-vous pour programmer un réinvestissement.": "Sign in to set up a reinvestment.",
  "Un réinvestissement est déjà en place. Arrêtez-le avant d'en programmer un autre.":
    "A reinvestment is already in place. Stop it before setting up another.",
};
