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
  "Lire ce que la maison sonde : un compartiment, un Trésor, une durée, et le niveau qu'elle indique.":
    "Read what the firm is surveying : a compartment, a Treasury, a term, and the level it indicates.",
  "Dire ce que vous prendriez et à partir de quand. Un taux ou un prix si vous en avez un : sans condition, votre réponse tient quel que soit le niveau.":
    "Say what you would take and from when. A rate or a price if you have one : with no condition, your answer holds whatever the level.",
  "Si ce que vous cherchez n'est pas sondé, remplir le gabarit : OTA ou BTA, le Trésor, la durée, le niveau, le montant.":
    "If what you are after is not being surveyed, fill in the template : OTA or BTA, the Treasury, the term, the level, the amount.",
  "Le desk réunit les demandes qui se ressemblent et les porte au Trésor. Rien ne vous engage, et vous retirez votre attente quand vous voulez.":
    "The desk gathers similar requests and carries them to the Treasury. Nothing commits you, and you withdraw your expression of interest whenever you want.",

  /* ---------- La page du client ---------- */
  /* LA SECONDE ÉCRITURE, 26 octobre 2026 : « moins chargé, plus aéré ». Les
     phrases longues sont passées derrière le point d'interrogation, et ce qui
     reste à l'écran est devenu une phrase de faits. Les anciennes clefs sont
     remplacées, pas complétées : une clef que le français ne dit plus garde en
     anglais une version de la page qui n'existe plus. */
  "Dire ce que vous prendriez avant qu'une séance ouvre. Rien ici ne vous engage.": "Say what you would take before a session opens. Nothing here commits you.",
  "À quoi sert un sondage": "What a survey is for",
  "Les six Trésors de la CEMAC décident seuls de ce qu'ils émettent, et quand. Ce qu'ils achètent à une société de bourse, c'est le renseignement : à quel niveau la demande tient encore, et pour combien. Une ligne sondée ici n'annonce donc aucune séance : c'est la maison qui réunit les appétits, avant qu'il y ait quoi que ce soit à annoncer.":
    "The six CEMAC Treasuries alone decide what they issue, and when. What they buy from a broker is intelligence : at what level demand still holds, and for how much. So a line surveyed here announces no session : it is the firm gathering appetites, before there is anything at all to announce.",
  "Votre réponse entre dans ce renseignement. Ce n'est pas un ordre : il n'y a rien à signer et rien à provisionner, et vous la retirez quand vous voulez. Si une séance s'ouvre sur une ligne que vous avez demandée, le desk vous rappelle avant la clôture.":
    "Your answer feeds that intelligence. It is not an order : there is nothing to sign and nothing to fund, and you withdraw it whenever you want. If a session opens on a line you asked for, the desk calls you before the cut-off.",
  "Sur chaque ligne, « ~ » précède la date à partir de laquelle elle serait prête — ce n'est pas une séance, et ce n'est pas une promesse. « ind. » est le niveau que la maison indique ; « min. » celui que vous posez comme plancher.":
    "On every line, « ~ » precedes the date from which it would be ready — it is not a session, and it is not a promise. « ind. » is the level the firm indicates ; « min. » the floor you set.",
  /* LES DEUX TITRES, le 26 octobre 2026. « Ce que la maison demande » décrivait
     au client ce qu'il avait sous les yeux ; « Combien investiriez-vous ? » lui
     demande quelque chose, et c'est ce que la page attend de lui. « Vos
     intentions » remplace « Ce que vous avez dit » : ce qui est là engage le
     desk à rappeler, ce n'est pas une conversation. */
  "Combien investiriez-vous ?": "How much would you invest ?",
  "Vos intentions": "Your expressions of interest",
  /* LES DEUX RUBRIQUES DE L'ACCUEIL, le 26 octobre 2026. « Au sondage » n'est
     pas de l'ornement : « Vos intentions » nomme déjà les ordres dans la même
     liste, et deux rubriques du même nom se confondent. L'anglais tient la même
     distinction. */
  "Vos intentions au sondage": "Your survey expressions of interest",
  "Ce que vous prendriez, avant qu'une séance ouvre": "What you would take, before a session opens",
  "{n} au desk": "{n} with the desk",
  "1 au desk": "1 with the desk",
  Répondu: "Answered",
  "Modifier ma réponse": "Change my answer",
  Modifier: "Change",
  Enregistrer: "Save",
  "Proposer votre propre ligne": "Propose your own line",
  "Modifier votre ligne": "Change your line",
  "Votre intention est modifiée. Le desk lit la nouvelle, et elle garde la même référence.": "Your expression of interest is changed. The desk reads the new one, and it keeps the same reference.",
  "Cette intention n'est pas la vôtre.": "This expression of interest is not yours.",
  "Cette intention est close : elle ne se modifie plus. Dites-en une nouvelle.": "This expression of interest is closed : it can no longer be changed. State a new one.",
  /* ---------- LA BANDE DE FAITS, LA MÊME POUR LES DEUX TUILES ----------
     « Harmoniser les tuiles » : montant court, maturité, coupon pour une OTA,
     taux pour un bon. Le rôle ne change QUE le sens du niveau — la maison dit
     un niveau indicatif, le client dit un plancher — et l'anglais doit tenir
     cette différence, qui est la seule. */
  /* ─── LA BANDE ABRÈGE, le 26 octobre 2026 ───────────────────────────────
     « OTA • CMR • 5 ans • coupon ind. 5% • Rendement ind. 5.5% • ~ 30 oct »,
     le gabarit du dirigeant. « ind. » quand la maison indique, « min. » quand
     le client pose un plancher : deux abréviations de même longueur, au même
     endroit de la phrase, pour que l'œil compare les chiffres et non les mots.
     L'ANGLAIS RETOURNE L'ORDRE — l'épithète précède le nom — et c'est tout ce
     qu'il change : l'abréviation, elle, se dit pareil dans les deux langues. */
  "coupon {q}": "{q} coupon",
  "taux {q}": "{q} rate",
  "rendement {q}": "{q} yield",
  /* LE RENDEMENT PREND LA PLACE DU PRIX SUR LA TUILE, le 26 octobre 2026 : le
     prix en était l'ingrédient, et les deux côte à côte faisaient trois nombres
     pour deux faits. « Rendement » seul, parce que le qualificatif — indicatif,
     au moins — est déjà porté par le coupon dont il découle. */
  "Une attente reçue": "An expression of interest received",
  "Une attente portée au Trésor": "An expression of interest carried to the Treasury",
  "Une attente close": "A closed expression of interest",
  "Rien n'est sondé en ce moment. Proposez la vôtre ci-dessous : c'est de là que partent la plupart des séances que nous obtenons.":
    "Nothing is being surveyed right now. Propose your own below : that is where most of the sessions we obtain begin.",
  "Rien encore. Répondre à une ligne ci-dessus prend deux chiffres ; proposer la vôtre en prend six.":
    "Nothing yet. Answering a line above takes two figures ; proposing your own takes six.",
  "Proposer sa propre ligne": "Proposing your own line",
  "Si ce que vous cherchez n'est pas sondé, dites-le : le desk réunit les demandes qui se ressemblent et les porte au Trésor concerné. Une ligne se porte quand plusieurs clients la demandent, donc votre réponse compte même seule.":
    "If what you are after is not being surveyed, say so : the desk gathers similar requests and carries them to the Treasury concerned. A line is carried when several clients ask for it, so your answer counts even on its own.",
  "Six champs : le compartiment, le Trésor, la durée, le niveau, le montant, et la date à partir de laquelle vous seriez prêt.":
    "Six fields : the compartment, the Treasury, the term, the level, the amount, and the date from which you would be ready.",
  /* Le point d'interrogation lui-même : son nom dit DE QUOI, parce qu'un
     lecteur d'écran qui annonce quatre boutons « aide » n'a rien annoncé. */
  "Pourquoi : {q}": "Why : {q}",
  "Le sondage en bref": "The survey in brief",
  "Dire ce que vous prendriez avant qu'une séance ouvre. Rien ici ne vous engage : c'est un renseignement que la maison porte au Trésor, et c'est lui qui décide s'il emprunte.":
    "Say what you would take before a session opens. Nothing here commits you : it is intelligence the firm carries to the Treasury, and the Treasury decides whether it borrows.",
  /* LES ÉTIQUETTES DES TROIS COLONNES SONT PARTIES AVEC ELLES, le 26 octobre
     2026 : « Ce que la maison cherche », « Taux indiqué », « Séance visée »,
     « Prêt à partir du ». La bande de faits ne porte plus d'étiquette — on lit
     « 500 M FCFA · 5 ans · coupon indicatif 6,25 % » d'un trait — et une clef
     que le français ne dit plus garde en anglais une page qui n'existe pas. */
  "Ce que vous prendriez": "What you would take",
  "Au taux d'au moins": "At a rate of at least",
  "Au coupon d'au moins": "At a coupon of at least",

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
  Retirer: "Withdraw",
  "Retirer l'attente {r}": "Withdraw expression of interest {r}",
  /* LA SECONDE CONFIRMATION, le 26 octobre 2026. Les deux boutons NOMMENT le
     geste — « Oui, retirer » et « Annuler » : un « Confirmer » ne dit pas ce
     qu'il confirme, et c'est au moment où l'on hésite qu'on a besoin de le
     lire. L'anglais tient la même règle. */
  "Retirer cette intention ?": "Withdraw this expression of interest ?",
  "Oui, retirer": "Yes, withdraw",
  "Oui, retirer l'attente {r}": "Yes, withdraw expression of interest {r}",
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
  "Ce que la place prendrait, avant qu'un Trésor annonce quoi que ce soit.": "What the market would take, before any Treasury announces anything.",
  "Comment ce consensus est calculé": "How this consensus is computed",
  "Il se recalcule à CHAQUE LECTURE de cette page : il n'y a pas de chiffre d'hier ici. Un consensus rangé chaque soir dans une table vieillirait entre deux lectures, et rien ne dirait l'écart.":
    "It is recomputed on EVERY READ of this page : there is no figure from yesterday here. A consensus stored each evening in a table would age between two reads, and nothing would say by how much.",
  "Le niveau est la moyenne des taux PONDÉRÉE PAR LES MONTANTS : dix clients à un million ne pèsent pas comme un à cent millions devant un Trésor. L'échelle, elle, dit où la demande s'arrête vraiment.":
    "The level is the average of the rates WEIGHTED BY THE AMOUNTS : ten clients at one million do not weigh like one at a hundred million before a Treasury. The ladder, for its part, says where demand really stops.",
  "La date est le PLUS TARD des « à partir de » : une séance tenue avant elle trouverait sans fonds un client compté dans la demande.":
    "The date is the LATEST of the « ready from » dates : a session held before it would find without funds a client counted in the demand.",
  "Une demande se porte à partir de {m} FCFA ET de {n} clients. Cent millions d'un seul client ne sont pas une demande de la place, c'est un ordre, et il a sa propre porte.":
    "A demand is carried from {m} FCFA AND {n} clients onwards. A hundred million from a single client is not market demand, it is an order, and it has its own door.",
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
  /* LE MONTANT CHERCHÉ NE VIT PLUS QUE SUR CETTE PAGE : il a quitté la tuile du
     client, où il donnait la réponse avant la question. Ici il est la cible,
     mise en regard de ce que la place a répondu. */
  "reçus sur {m} cherchés, de {n} réponse(s)": "received of {m} sought, from {n} answer(s)",
  "Poser une question à la place": "Ask the market a question",
  "Les {n} demandes, une par une": "The {n} requests, one by one",
  "Prêt le": "Ready on",
  précompté: "discounted",
  Compartiment: "Compartment",
  Trésor: "Treasury",
  Durée: "Term",
  "Taux indicatif (%)": "Indicative rate (%)",
  "Coupon indicatif (%)": "Indicative coupon (%)",
  "Prix indicatif (%)": "Indicative price (%)",
  "Montant cherché (FCFA)": "Amount sought (FCFA)",
  "À partir du (date)": "From (date)",
  "…ou dans (jours)": "…or in (days)",
  "Ce que les clients doivent savoir": "What clients should know",
  "Pourquoi cette ligne est sondée, et ce qu'on attend d'eux.": "Why this line is being surveyed, and what is expected of them.",
  "Poser la question": "Ask the question",
  "Portée au Trésor": "Carried to the Treasury",
  Clore: "Close",
  "Pourquoi ({r})": "Why ({r})",
};
