/**
 * Les rappels d'une procédure laissée en route : la page du desk qui les
 * règle, et le geste du client qui les interrompt.
 *
 * Un fichier à eux parce qu'ils se relisent ensemble : le texte que le desk
 * écrit et celui que le client lit doivent dire la même chose, et les séparer
 * en deux dictionnaires ferait diverger le mot « rappel » d'un écran à
 * l'autre.
 */
export const EN_RELANCES: Record<string, string> = {
  /* ---- la page du desk ---- */
  "Rappels des procédures": "Procedure reminders",
  "Quand un client commence une démarche qui engage une décision — une convention, un bulletin, un mandat — et ne la termine pas, la maison le lui rappelle. Ce qui suit règle combien de fois, à partir de quand, par quel canal et avec quels mots.":
    "When a client begins a procedure that commits a decision — an agreement, an order form, a mandate — and does not finish it, the firm reminds them. What follows sets how many times, from when, through which channel and in which words.",
  "Ce qui déclenche un rappel": "What triggers a reminder",
  "Un devoir écrit, jamais une hésitation. Un bulletin émis, un mandat créé, une convention approuvée, des pièces demandées : ces quatre-là existent en base parce que le client a cliqué. Un formulaire rempli et non envoyé n'existe pas, et il ne doit pas exister — écrire « vous étiez sur le point de placer 250 000 FCFA » à quelqu'un qui a justement renoncé n'est pas un service.":
    "A written duty, never a hesitation. An issued order form, a created mandate, an approved agreement, requested documents: those four exist in the database because the client clicked. A form filled in and not sent does not exist, and must not exist — writing « you were about to place 250,000 FCFA » to someone who has just decided against it is not a service.",
  "Deux règles ne se règlent pas ici. Un seul message par jour et par client, quel que soit le nombre de devoirs ouverts : le plus bloquant parle, les autres attendent leur tour. Et l'interruption demandée par le client, qui est immédiate, sans motif, et que le desk ne peut pas reprendre sans sa demande.":
    "Two rules are not set here. One message per client per day, whatever the number of open duties: the most blocking one speaks, the others wait their turn. And the interruption requested by the client, which is immediate, needs no reason, and which the desk cannot undo without their asking.",
  "Le réglage": "The setting",
  "Ce que le prochain tour fera": "What the next run will do",
  "tous les jours à 9 h 20": "every day at 9:20 am",
  "Aucune procédure en attente : personne n'a laissé de démarche en route.": "No procedure waiting: nobody has left one unfinished.",
  "Ceux qui ont demandé qu'on se taise": "Those who asked us to stop",
  "Leur démarche reste ouverte et visible dans leur espace : écarter un rappel n'annule rien. Reprendre un rappel se fait à la demande du client, et le motif est gardé — rallumer des messages que quelqu'un a fait taire est le genre de geste qu'on doit pouvoir retrouver six mois plus tard.":
    "Their procedure stays open and visible in their space: stopping a reminder cancels nothing. Restarting a reminder is done at the client's request, and the reason is kept — switching back on messages someone silenced is exactly the kind of move one must be able to find again six months later.",
  "Où cela se voit ailleurs": "Where this shows elsewhere",
  "Les messages partis figurent au journal des notifications, et les tours du robot à la page Santé.":
    "Sent messages appear in the notification log, and the robot's runs on the Health page.",
  "Rappels": "Reminders",
  "Prochain": "Next",
  "Interrompu le": "Stopped on",
  "Reçus avant": "Received before",
  "Personne n'a interrompu ses rappels.": "Nobody has stopped their reminders.",
  "À la demande du client, le …": "At the client's request, on …",
  /* Le prénom de l'exemple : il paraît dans l'aperçu du message, donc il se
     traduit comme tout ce que le desk lit. */
  "Awa": "Awa",

  /* ---- le formulaire ---- */
  "Envoyer les rappels": "Send the reminders",
  "Décoché, le robot continue de constater et de tenir la file, mais plus rien ne part.": "Unchecked, the robot keeps recording and holding the queue, but nothing goes out.",
  "La cadence": "The rhythm",
  "Combien de rappels au plus": "How many reminders at most",
  "Le premier, combien de jours après": "The first, how many days later",
  "Un rappel tous les combien de jours": "A reminder every how many days",
  "Un client qui ne répond à rien recevra {n} message(s), le premier {j}, puis un tous les {c} jour(s).":
    "A client who answers nothing will receive {n} message(s), the first {j}, then one every {c} day(s).",
  "le jour même": "the same day",
  "le lendemain": "the next day",
  "{d} jours après": "{d} days later",
  "Sauter le samedi et le dimanche": "Skip Saturday and Sunday",
  "Décoché, cinq rappels sont cinq jours de suite : un bulletin qui attend n'attend pas moins le samedi.":
    "Unchecked, five reminders are five days running: an order form that waits does not wait less on a Saturday.",
  "Se taire le jour d'un préavis de prélèvement": "Stay silent on the day of a direct debit notice",
  "Deux messages de la maison le même jour sur deux sujets différents, c'est un message qu'on n'ouvre plus — et le préavis annonce un débit, donc il est dû.":
    "Two messages from the firm on the same day about two different subjects is a message nobody opens any more — and the notice announces a debit, so it is owed.",
  "Les canaux": "The channels",
  "Seulement vers les clients qui ont donné leur accord WhatsApp.": "Only to clients who have given their WhatsApp consent.",
  "Vers l'adresse du dossier.": "To the address on file.",
  "Aucun canal coché : rien ne partira, quel que soit le reste du réglage.": "No channel ticked: nothing will go out, whatever the rest of the setting says.",
  "Les sujets, et ce que chacun bloque": "The subjects, and what each one blocks",
  "en attente": "waiting",
  "{n} écartés": "{n} stopped",
  "{n} épuisés": "{n} exhausted",
  "Voir et modifier le message": "See and edit the message",
  "Masquer le message": "Hide the message",
  "Objet (e-mail)": "Subject (e-mail)",
  "Message": "Message",
  "Trois trous : {a} le prénom du client, {b} l'objet précis (le titre de la ligne, la destination du mandat), {c} l'adresse du geste. {c} est obligatoire.":
    "Three placeholders: {a} the client's first name, {b} the precise object (the line's title, the mandate's destination), {c} the address of the move. {c} is required.",
  "Ce que le client lira": "What the client will read",
  "Revenir au texte de la maison": "Back to the house text",
  "{n} message(s) au plus": "{n} message(s) at most",
  "si aucun des {v} client(s) en attente ne répond ni n'interrompt les rappels": "if none of the {v} waiting client(s) answers or stops the reminders",
  "Les rappels sont désactivés : rien ne partira.": "Reminders are switched off: nothing will go out.",
  "Enregistrer le réglage": "Save the setting",
  "Reprendre": "Restart",
  "Réglage enregistré. Le prochain tour du robot le lit.": "Setting saved. The robot's next run reads it.",
  "Rappels désactivés. Plus aucun message ne partira.": "Reminders switched off. No message will go out any more.",
  "Rappel repris. Le prochain tour l'enverra.": "Reminder restarted. The next run will send it.",
  "Dites pourquoi : ce geste rallume des messages qu'un client a fait taire.": "Say why: this move switches back on messages a client silenced.",
  "Ce rappel n'est pas écarté.": "This reminder is not stopped.",
  "Rappel introuvable.": "Reminder not found.",

  /* ---- les sujets, nommés une fois et lus des deux côtés ---- */
  "Convention à accepter": "Agreement to accept",
  "Pièces demandées": "Documents requested",
  "Bulletin à signer": "Order form to sign",
  "Contre-proposition à trancher": "Counter-offer to settle",
  "Mandat de prélèvement à signer": "Direct debit mandate to sign",
  "Le compte ne s'ouvre pas : aucune souscription, aucun rachat, aucun ordre.": "The account does not open: no subscription, no redemption, no order.",
  "L'examen du dossier est suspendu tant que les pièces manquent.": "The file's review is suspended while documents are missing.",
  "L'ordre est prêt et ne part pas. La ligne peut se clôturer entre-temps.": "The order is ready and does not go. The line may close in the meantime.",
  "L'ordre attend une réponse ; sans elle il s'éteint à la clôture.": "The order awaits an answer; without it, it lapses at close.",
  "Rien n'est bloqué : le versement vit sans le mandat, qui n'est qu'un confort de paiement.": "Nothing is blocked: the payment lives without the mandate, which is only a payment convenience.",

  /* ---- les raisons qu'une ligne de la file peut porter ---- */
  "rappels désactivés": "reminders switched off",
  "sujet décoché": "subject unticked",
  "aucun canal": "no channel",
  "série épuisée": "series exhausted",
  "pas encore": "not yet",
  "déjà parti aujourd'hui": "already sent today",
  "week-end": "weekend",

  /* ---- ce que le client voit ---- */
  "Quand vous voudrez": "Whenever you like",
  "Mandat": "Mandate",
  "Votre mandat de prélèvement pour {d} attend sa signature. Sans lui, rien ne s'arrête : vous virez vous-même à chaque échéance.":
    "Your direct debit mandate for {d} is waiting to be signed. Without it nothing stops: you transfer the money yourself at each due date.",
  "Signer mon mandat": "Sign my mandate",
  "votre provision": "your cash reserve",
  "Ne plus me le rappeler": "Stop reminding me",
  "Ne plus recevoir de rappel ? La démarche reste ici.": "Stop receiving reminders? The procedure stays here.",
  "Oui, ne plus me le rappeler": "Yes, stop reminding me",
  "déjà rappelé une fois": "reminded once already",
  "déjà rappelé {n} fois": "reminded {n} times already",
  "C'est noté : nous ne vous le rappellerons plus. La démarche reste ici quand vous voudrez la reprendre.":
    "Noted: we will not remind you again. The procedure stays here for whenever you want to take it up.",
  "Ce rappel n'existe pas, ou il ne vous appartient pas.": "This reminder does not exist, or it is not yours.",
  "Les rappels sont déjà interrompus pour cette démarche.": "Reminders are already stopped for this procedure.",
  "Cette démarche est terminée : plus rien ne vous est rappelé.": "This procedure is finished: nothing more is being reminded.",
};
