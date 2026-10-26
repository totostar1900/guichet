/**
 * LE SONDAGE D'AVANT SÉANCE (pages /sondage et /desk/sondage, 26 octobre 2026).
 *
 * Il a son fichier parce qu'il forme un vocabulaire à lui, et que ce
 * vocabulaire doit rester STABLE : « prendre », « porter au Trésor », « ce que
 * la place prendrait ». Chaque phrase de cette page tient la même promesse —
 * rien ici n'engage personne — et une traduction qui durcirait un verbe ferait
 * lire un ordre là où il n'y a qu'un renseignement.
 *
 * CE QU'IL FAUT TENIR EN ANGLAIS : « would take », jamais « will buy » ; « say
 * what you would take », jamais « place an order ». Le conditionnel EST la
 * fonctionnalité.
 */
export const EN_SONDAGE: Record<string, string> = {
  /* ---------- Les étapes du service, lues par le brief ---------- */
  "Lire ce que la maison sonde : un compartiment, un Trésor, une durée, et le montant qu'elle cherche.":
    "Read what the firm is surveying : a compartment, a Treasury, a term, and the amount it is after.",
  "Dire ce que vous prendriez et à partir de quand. Un taux ou un prix si vous en avez un : sans condition, votre réponse tient quel que soit le niveau.":
    "Say what you would take and from when. A rate or a price if you have one : with no condition, your answer holds whatever the level.",
  "Si ce que vous cherchez n'est pas sondé, remplir le gabarit : OTA ou BTA, le Trésor, la durée, le niveau, le montant.":
    "If what you are after is not being surveyed, fill in the template : OTA or BTA, the Treasury, the term, the level, the amount.",
  "Le desk réunit les demandes qui se ressemblent et les porte au Trésor. Rien ne vous engage, et vous retirez votre attente quand vous voulez.":
    "The desk gathers similar requests and carries them to the Treasury. Nothing commits you, and you withdraw your expression of interest whenever you want.",

  /* ---------- La page du client ---------- */
  "Le sondage en bref": "The survey in brief",
  "Dire ce que vous prendriez avant qu'une séance ouvre. Rien ici ne vous engage : c'est un renseignement que la maison porte au Trésor, et c'est lui qui décide s'il emprunte.":
    "Say what you would take before a session opens. Nothing here commits you : it is intelligence the firm carries to the Treasury, and the Treasury decides whether it borrows.",
  "Ce que la maison demande en ce moment": "What the firm is asking right now",
  "Aucune ligne sondée en ce moment. Vous pouvez tout de même proposer la vôtre plus bas : c'est de là que partent la plupart des séances que nous obtenons.":
    "No line is being surveyed right now. You can still propose your own below : that is where most of the sessions we obtain begin.",
  "Ce que la maison cherche": "What the firm is after",
  "Taux indiqué": "Rate indicated",
  "Coupon indiqué": "Coupon indicated",
  "Séance visée": "Session targeted",
  "à dire": "to be said",
  "Vous avez répondu : {m} FCFA, {d}.": "You answered : {m} FCFA, {d}.",
  "Répondre de nouveau remplace cette réponse.": "Answering again replaces that answer.",
  "Ce que vous avez dit": "What you have said",
  "Vous n'avez encore rien dit. Répondre à une ligne ci-dessus prend deux chiffres.": "You have not said anything yet. Answering a line above takes two figures.",
  "Ce que vous prendriez": "What you would take",
  "Au taux d'au moins": "At a rate of at least",
  "Au coupon d'au moins": "At a coupon of at least",
  "Prêt à partir du": "Ready from",
  "Proposer votre propre ligne": "Propose your own line",
  "Si ce que vous cherchez n'est pas sondé, dites-le : le desk réunit les demandes qui se ressemblent et les porte au Trésor concerné. Une ligne se porte quand plusieurs clients la demandent, donc votre réponse compte même seule.":
    "If what you are after is not being surveyed, say so : the desk gathers similar requests and carries them to the Treasury concerned. A line is carried when several clients ask for it, so your answer counts even on its own.",

  /* ---------- Les deux formulaires ---------- */
  "Je serais preneur": "I would be a taker",
  "Ce que vous prendriez (FCFA)": "What you would take (FCFA)",
  "Au taux d'au moins (%)": "At a rate of at least (%)",
  "Au coupon d'au moins (%)": "At a coupon of at least (%)",
  "Facultatif : sans condition, votre réponse tient quel que soit le niveau.": "Optional : with no condition, your answer holds whatever the level.",
  "Prêt à partir de (jours)": "Ready in (days)",
  "Une séance tenue avant ce délai vous trouverait sans fonds : c'est pour cela qu'on vous le demande.": "A session held before then would find you without funds : that is why we ask.",
  "Dire au desk": "Tell the desk",
  "Remplir le gabarit": "Fill in the template",
  "Ce que vous cherchez": "What you are after",
  "Une obligation du Trésor : elle verse un coupon chaque année, sur plusieurs années.": "A Treasury bond : it pays a coupon each year, over several years.",
  "Un bon du Trésor : il se vend précompté et se rembourse en une fois, sous un an.": "A Treasury bill : it is sold at a discount and redeemed in one go, within a year.",
  "Le Trésor": "The Treasury",
  "La durée": "The term",
  "Le coupon que vous attendez, au moins (%)": "The coupon you expect, at least (%)",
  "Le taux que vous accepteriez, au moins (%)": "The rate you would accept, at least (%)",
  "Le prix que vous accepteriez, au plus (%)": "The price you would accept, at most (%)",
  "Ce que le desk doit savoir (facultatif)": "What the desk should know (optional)",
  "Pourquoi cette ligne, ou ce qui vous ferait changer d'avis.": "Why this line, or what would change your mind.",
  "Retirer cette attente": "Withdraw this expression of interest",
  "Retrait impossible.": "Cannot be withdrawn.",

  /* ---------- Le gabarit, lu au domaine ---------- */
  "Le coupon que vous attendez, au moins": "The coupon you expect, at least",
  "Le taux que vous accepteriez, au moins": "The rate you would accept, at least",
  "Le prix que vous accepteriez, au plus": "The price you would accept, at most",
  "À partir de quand": "From when",
  "Lequel des six États de la zone emprunte.": "Which of the zone's six States is borrowing.",
  "13, 26 ou 52 semaines : un bon ne va pas au-delà de l'année.": "13, 26 or 52 weeks : a bill does not go beyond the year.",
  "En années, de 2 à 10 : c'est ce que vous prêtez.": "In years, from 2 to 10 : that is what you are lending.",
  "En pourcentage précompté. Plus il descend, mieux le Trésor est servi — et moins vous recevez.": "As a discounted percentage. The lower it goes, the better the Treasury is served — and the less you receive.",
  "En pourcentage par an. C'est ce que la ligne versera chaque année.": "As a percentage per year. That is what the line will pay out each year.",
  "En pourcentage du nominal. Au-dessus de 100, vous payez plus que ce qui sera remboursé.": "As a percentage of par. Above 100, you pay more than what will be redeemed.",
  "En francs. C'est ce chiffre qui est porté au Trésor, et rien ne vous engage.": "In francs. That is the figure carried to the Treasury, and nothing commits you.",
  "La date où vous seriez prêt, ou le nombre de jours. Une séance tenue avant elle vous trouverait sans fonds.":
    "The date you would be ready, or the number of days. A session held before it would find you without funds.",

  /* ---------- L'état d'une attente ---------- */
  Reçue: "Received",
  Portée: "Carried",
  Close: "Closed",
  "Votre réponse est au desk. Elle ne vous engage à rien : c'est un renseignement, et il sert à dire au Trésor à quel niveau la demande tient encore.":
    "Your answer is with the desk. It commits you to nothing : it is intelligence, and it serves to tell the Treasury at what level demand still holds.",
  "Votre ligne est au desk. Elle ne vous engage à rien, et elle attend d'autres clients : une ligne se porte à un Trésor quand plusieurs la demandent.":
    "Your line is with the desk. It commits you to nothing, and it is waiting for other clients : a line is carried to a Treasury when several ask for it.",
  "Votre ligne est entrée dans la demande que la maison porte au Trésor. Si une séance s'ouvre dessus, le desk vous rappellera avant la clôture.":
    "Your line has entered the demand the firm carries to the Treasury. If a session opens on it, the desk will call you before the cut-off.",
  "Cette attente est close. Elle a été portée, ou la date est passée : rien n'en reste engagé, puisque rien ne l'était.":
    "This expression of interest is closed. It was carried, or the date has passed : nothing of it stays committed, since nothing was.",

  /* ---------- La tuile du matin, au desk ---------- */
  "Sondage à porter": "Survey to carry",
  "{n} attente(s) en cours, sous le seuil": "{n} expression(s) of interest open, below the threshold",
  "aucune attente en cours": "no expression of interest open",
  "porter au Trésor": "carry to the Treasury",

  /* ---------- La file du desk ---------- */
  Sondage: "Survey",
  "Sondage d'avant séance": "Pre-session survey",
  "Ce que la place prendrait, avant qu'un Trésor annonce quoi que ce soit. Le consensus se recalcule à chaque lecture : il n'y a pas de chiffre d'hier ici. Une demande se porte à partir de {m} FCFA et de {n} clients.":
    "What the market would take, before any Treasury announces anything. The consensus is recomputed on every read : there is no figure from yesterday here. A demand is carried from {m} FCFA and {n} clients onwards.",
  "À porter au Trésor": "To carry to the Treasury",
  "Aucune demande n'atteint encore le seuil. Ce n'est pas une panne : une ligne se porte quand elle pèse, et la page du dessous montre ce qui s'accumule.":
    "No demand reaches the threshold yet. This is not a failure : a line is carried when it weighs, and the section below shows what is building up.",
  "{m} FCFA de {n} clients, autour de {r}, tous prêts à partir du {d}": "{m} FCFA from {n} clients, around {r}, all ready from {d}",
  "sans condition": "with no condition",
  "À ce taux ou mieux": "At this rate or better",
  "Demande tenue": "Demand held",
  Taux: "Rate",
  "Ce qui s'accumule": "What is building up",
  "Rien d'autre en attente.": "Nothing else waiting.",
  "Au plus tôt": "At the earliest",
  "Les questions ouvertes": "Open questions",
  "Aucune question posée en ce moment.": "No question asked at the moment.",
  cherchés: "sought",
  "aucune réponse encore": "no answer yet",
  "{n} réponse(s)": "{n} answer(s)",
  "Poser une question à la place": "Ask the market a question",
  "Les {n} demandes, une par une": "The {n} requests, one by one",
  "Prêt le": "Ready on",
  précompté: "discounted",
  Compartiment: "Compartment",
  Trésor: "Treasury",
  Durée: "Term",
  "Taux indicatif (%)": "Indicative rate (%)",
  "Coupon indicatif (%)": "Indicative coupon (%)",
  "Montant cherché (FCFA)": "Amount sought (FCFA)",
  "Séance visée (date)": "Session targeted (date)",
  "…ou dans (jours)": "…or in (days)",
  "Ce que les clients doivent savoir": "What clients should know",
  "Pourquoi cette ligne est sondée, et ce qu'on attend d'eux.": "Why this line is being surveyed, and what is expected of them.",
  "Poser la question": "Ask the question",
  "Portée au Trésor": "Carried to the Treasury",
  Clore: "Close",
  "Pourquoi ({r})": "Why ({r})",
};
