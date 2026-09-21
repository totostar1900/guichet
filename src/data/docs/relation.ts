import { l, type DocPage } from "./types";

/** The client relationship and the way the desk speaks: procedures, channels, words, timings, what to do when it goes wrong. */
export const RELATION: DocPage = {
  slug: "relation",
  title: l("Relation client et communication", "Client relationship and communication"),
  summary: l("Le parcours d'un client, ce que le desk fait à chaque étape, les canaux et leurs règles, les délais, les mots à employer et ceux à éviter, les réclamations, la journée du desk.", "A client's path, what the desk does at each step, the channels and their rules, the timings, the words to use and those to avoid, complaints, the desk's day."),
  visibility: "desk",
  audience: ["desk", "admin"],
  order: 2,
  checkedOn: "2026-09-21",
  owner: "Georges",
  chapters: [
    {
      id: "parcours",
      title: l("Le parcours du client", "The client's path"),
      blocks: [
        { type: "lead", text: l("Un client passe par six moments : il découvre, il comprend, il déclare, il est rappelé, il est servi, il suit. Le Guichet porte les trois premiers et le dernier ; le desk porte les deux du milieu, et c'est là que la relation se fait.", "A client goes through six moments: they discover, they understand, they declare, they are called back, they are served, they follow. Guichet carries the first three and the last; the desk carries the two in the middle, and that is where the relationship is made.") },
        { type: "diagram", kind: "relation", caption: l("Les six moments ; en or, ceux où une personne du desk parle au client.", "The six moments; in gold, those where a desk person speaks to the client.") },
        {
          type: "table",
          head: [l("Moment", "Moment"), l("Ce que fait le Guichet", "What Guichet does"), l("Ce que fait le desk", "What the desk does"), l("Trace", "Trace")],
          rows: [
            [l("Découvre", "Discovers"), l("Le site public, la présentation de trente secondes, les lignes et leurs chiffres ; un lien de ligne envoyé par WhatsApp ouvre directement la fiche.", "The public site, the thirty-second presentation, the lines and their figures; a line link sent by WhatsApp opens the line directly."), l("Répond au premier message sur WhatsApp ; envoie le lien de la ligne dont on parle (Cotes & VL › partager), jamais une capture.", "Answers the first message on WhatsApp; sends the link of the line discussed (Quotes & NAV › share), never a screenshot."), l("Le message dans Messages", "The message in Messages")],
            [l("Comprend", "Understands"), l("La fiche (Essentiel, Chiffres, Documents, Émetteur), le Guide, le simulateur, le profil financier en deux minutes.", "The line (Essentials, Figures, Documents, Issuer), the Guide, the simulator, the two-minute financial profile."), l("Oriente vers la leçon qui répond, pas vers une opinion : « la leçon sur le rendement l'explique en trente secondes ».", "Points to the lesson that answers, not to an opinion: “the lesson on yield explains it in thirty seconds”."), l("Rien, sauf si une question devient une entrée de l'Aide", "Nothing, unless a question becomes a Help entry")],
            [l("Déclare", "Declares"), l("La page d'intention : type, montant, coordonnées, deux canaux prouvés (WhatsApp et e-mail) ; accusé de réception sur les deux ; l'intention arrive au carnet à la seconde.", "The intention page: type, amount, details, two proven channels (WhatsApp and e-mail); acknowledgement on both; the intention reaches the carnet within the second."), l("Rien encore : le client ne doit jamais être appelé avant d'avoir fini de déclarer.", "Nothing yet: the client must never be called before they have finished declaring."), l("L'intention « reçue », l'accusé dans Diffusion", "The intention “received”, the acknowledgement in Broadcast")],
            [l("Est rappelé", "Is called back"), l("Aujourd'hui compte les intentions non traitées et l'âge de la plus ancienne ; l'appel se note sur l'intention.", "Today counts the untreated intentions and the age of the oldest; the call is noted on the intention."), l("Rappelle dans l'heure ouvrée par le canal que le client a choisi d'abord (son compte le dit) ; vérifie le montant, le prix, la date, le règlement ; confirme ; le bulletin d'ordre et l'appel de fonds partent.", "Calls back within the business hour through the channel the client chose first (their account says which); checks amount, price, date, settlement; confirms; the order form and fund call go out."), l("Passage « reçue → confirmée » signé, documents numérotés", "Signed “received → confirmed” move, numbered documents")],
            [l("Est servi", "Is served"), l("Suit l'état : transmise, servie, réglée ; avis de résultat et relevé ; alerte si la ligne bouge.", "Follows the state: transmitted, served, settled; result notice and statement; alert if the line moves."), l("Transmet l'ordre au SVT, saisit le résultat, constate le règlement, prévient le client d'un mot si le résultat diffère de l'attente (servi en partie, prix différent).", "Transmits the order to the primary dealer, enters the result, records settlement, tells the client in a word if the result differs from expectation (partly served, different price)."), l("Chaque passage d'état, le bordereau, l'avis", "Every state move, the slip, the notice")],
            [l("Suit", "Follows"), l("Mon espace : positions, historique, documents, flux à venir ; alertes sur l'appareil ; relevé à la demande ; résumé du vendredi.", "My space: positions, history, documents, upcoming flows; device alerts; statement on request; Friday digest."), l("Répond aux messages ; propose une ligne quand elle correspond au profil déclaré, jamais « la meilleure ».", "Answers messages; suggests a line when it matches the declared profile, never “the best”."), l("Messages, Diffusion", "Messages, Broadcast")],
          ],
        },
      ],
    },
    {
      id: "canaux",
      title: l("Les canaux et leurs règles", "The channels and their rules"),
      blocks: [
        { type: "diagram", kind: "communication", caption: l("Quatre canaux, quatre usages, une règle chacun.", "Four channels, four uses, one rule each.") },
        {
          type: "list",
          items: [
            l("WhatsApp est la voix du desk : c'est là que le client écrit d'abord et que l'on répond d'abord, aux heures ouvrées (lundi à vendredi, 8 h à 17 h, Yaoundé). En dehors, le robot accuse réception et donne l'heure de reprise.", "WhatsApp is the desk's voice: it is where the client writes first and where we answer first, during business hours (Monday to Friday, 8 to 17, Yaoundé). Outside, the robot acknowledges and gives the resumption time."),
            l("L'e-mail porte ce qui doit rester : le code de connexion, les documents, les appels de fonds, les relevés, le résumé du vendredi. Expéditeur guichet@purposecapital.africa, toujours.", "E-mail carries what must remain: the sign-in code, documents, fund calls, statements, the Friday digest. Sender guichet@purposecapital.africa, always."),
            l("L'appel confirme : on n'engage rien au clavier. Avant de transmettre, une voix a vérifié le montant, le prix et la date avec le client. Ce qui a été dit se note sur l'intention (qui, quand, quoi).", "The call confirms: nothing is committed on a keyboard. Before transmitting, a voice has checked amount, price and date with the client. What was said is noted on the intention (who, when, what)."),
            l("Les alertes sur l'appareil sont rares (au plus une par jour) et factuelles : une clôture qui approche, un ordre servi, une ligne suivie qui bouge. Le client les active lui-même.", "Device alerts are rare (at most one a day) and factual: a closing approaching, an order served, a followed line moving. The client turns them on themself."),
            l("Le client dit dans son compte par quel canal commencer (WhatsApp, e-mail, appel) et si les relevés partent par e-mail : le dossier client et l'intention le montrent au desk sous l'identité.", "The client says in their account which channel to start with (WhatsApp, e-mail, call) and whether statements go by e-mail: the client file and the intention show it to the desk under the identity."),
          ],
        },
        { type: "note", kind: "rule", text: l("Un lien de ligne envoyé par le desk porte le numéro du destinataire : ce numéro compte comme prouvé quand la personne déclare depuis ce lien. On envoie donc un lien à une personne, jamais à un groupe.", "A line link sent by the desk carries the recipient's number: that number counts as proven when the person declares from that link. So a link is sent to a person, never to a group.") },
      ],
    },
    {
      id: "delais",
      title: l("Les délais que l'on tient", "The timings we keep"),
      blocks: [
        {
          type: "table",
          head: [l("Situation", "Situation"), l("Délai", "Timing"), l("Qui", "Who"), l("Si dépassé", "If exceeded")],
          rows: [
            [l("Message WhatsApp reçu aux heures ouvrées", "WhatsApp message received during business hours"), l("Réponse dans l'heure", "Answer within the hour"), l("Opérateur de permanence", "Operator on duty"), l("Le message reste « non lu » dans Messages ; le responsable le voit", "The message stays “unread” in Messages; the manager sees it")],
            [l("Intention reçue", "Intention received"), l("Rappel dans l'heure ouvrée ; même jour au plus tard", "Call back within the business hour; same day at the latest"), l("Opérateur", "Operator"), l("Aujourd'hui passe en orange, puis en rouge à 24 h", "Today turns orange, then red at 24 h")],
            [l("Intention confirmée sur une ligne qui clôture", "Confirmed intention on a line that closes"), l("Transmise avant la clôture, bordereau produit", "Transmitted before closing, slip produced"), l("Opérateur", "Operator"), l("Le point du matin liste les clôtures du jour", "The morning brief lists the day's closings")],
            [l("Résultat d'adjudication connu", "Auction result known"), l("Saisi le jour même ; avis envoyé", "Entered the same day; notice sent"), l("Opérateur", "Operator"), l("Tuile « résultats à saisir » dans Aujourd'hui", "“Results to enter” tile in Today")],
            [l("Dossier d'ouverture soumis", "Account-opening file submitted"), l("Première revue sous deux jours ouvrés", "First review within two business days"), l("Opérateur, puis responsable pour l'approbation", "Operator, then manager for approval"), l("Le dossier reste « soumis » dans Dossiers, en tête de file", "The file stays “submitted” in Files, at the head of the queue")],
            [l("Réclamation", "Complaint"), l("Accusé le jour même, réponse sous cinq jours ouvrés", "Acknowledged the same day, answered within five business days"), l("Responsable", "Manager"), l("Noter dans le journal, informer la direction", "Note in the log, inform management")],
          ],
        },
      ],
    },
    {
      id: "mots",
      title: l("Les mots", "The words"),
      blocks: [
        { type: "p", text: l("Le ton du Guichet : on dit ce que l'on fait, jamais ce que l'on n'est pas ; des chiffres, des dates, des sources ; des phrases courtes ; pas de tirets longs, des deux-points, des virgules et le point médian. Le client doit pouvoir répéter ce qu'on lui a dit à quelqu'un d'autre sans se tromper.", "Guichet's tone: we say what we do, never what we are not; figures, dates, sources; short sentences; no long dashes, colons, commas and the middle dot. The client must be able to repeat what they were told to someone else without error.") },
        {
          type: "table",
          head: [l("À éviter", "To avoid"), l("À dire", "To say")],
          rows: [
            [l("« C'est la meilleure ligne du moment. »", "“It's the best line right now.”"), l("« Elle rend 6,93 % au cours du 18 septembre, coupon 5,60 %, échéance décembre 2028 : la fiche le détaille. »", "“It yields 6.93% at the 18 September price, coupon 5.60%, maturity December 2028: the line details it.”")],
            [l("« Vous ne pouvez pas perdre. »", "“You can't lose.”"), l("« Un État rembourse sur son budget ; la leçon sur les quatre risques dit ce qui peut changer. »", "“A state repays from its budget; the lesson on the four risks says what can change.”")],
            [l("« Je vous conseille de… »", "“I advise you to…”"), l("« Votre profil dit horizon court et tolérance faible ; cette ligne va à cinq ans : c'est à vous de voir, je vous donne les chiffres. »", "“Your profile says short horizon and low tolerance; this line runs five years: it's your call, I give you the figures.”")],
            [l("« Le montant est débité. »", "“The amount is debited.”"), l("« Rien n'est débité : vous virez à réception de l'appel de fonds, sur le compte indiqué. »", "“Nothing is debited: you transfer on receipt of the fund call, to the account stated.”")],
            [l("« Je vous envoie une capture d'écran. »", "“I'll send you a screenshot.”"), l("« Je vous envoie le lien de la ligne : les chiffres y sont à jour et datés. »", "“I'll send you the line's link: the figures there are current and dated.”")],
            [l("« Ça devrait passer. »", "“It should go through.”"), l("« La ligne clôture jeudi à 12 h ; votre ordre est transmis mercredi, le résultat vous arrive vendredi. »", "“The line closes Thursday at 12; your order is transmitted Wednesday, the result reaches you Friday.”")],
          ],
        },
        { type: "note", kind: "rule", text: l("Une mise à la une n'est pas un conseil : sa raison est factuelle (« clôture cette semaine », « nouvelle ligne », « coupon le 30 »), jamais un jugement. L'application refuse les mots « meilleur », « recommandé », « garanti ».", "A featured line is not advice: its reason is factual (“closes this week”, “new line”, “coupon on the 30th”), never a judgement. The app refuses the words “best”, “recommended”, “guaranteed”.") },
      ],
    },
    {
      id: "situations",
      title: l("Situations et conduite à tenir", "Situations and what to do"),
      blocks: [
        { type: "p", text: l("Quatre actes ont leur document et leur circuit : le mandat quand un tiers passe les ordres (desk › Dossiers › Actes et avis, signé par le client et le mandataire), l'avis de coupon ou de remboursement quand un flux est payé (Aujourd'hui, ou le dossier), la réclamation (le client la dépose depuis Mon espace, signée par code ; accusé de réception sous deux jours ouvrés, réponse sous trente jours, recours COSUMAF), le transfert ou la clôture (ordre signé par le client, dossier « en clôture » puis « clos » à la confirmation du dépositaire, relevé final joint).", "Four acts have their document and their circuit: the mandate when a third party places orders (desk › Files › Acts and notices, signed by the client and the agent), the coupon or redemption notice when a flow is paid (Today, or the file), the complaint (the client files it from My space, signed by code; acknowledgement within two business days, answer within thirty days, COSUMAF as recourse), the transfer or closure (order signed by the client, file “in closure” then “closed” at the custodian's confirmation, final statement attached).") },
        {
          type: "table",
          head: [l("Situation", "Situation"), l("Conduite", "What to do")],
          rows: [
            [l("Le client veut plus que son épargne déclarée ne le permet", "The client wants more than their declared savings allow"), l("La fiche a déjà demandé une confirmation ; l'intention arrive avec le drapeau. Au rappel : le dire simplement, proposer un montant, ne jamais refuser sans écouter ; noter.", "The line already asked for a confirmation; the intention arrives flagged. On the call: say it simply, suggest an amount, never refuse without listening; note it.")],
            [l("Le client n'a qu'un canal prouvé", "The client has only one proven channel"), l("Le Guichet ne prend pas l'intention ; envoyer le lien de la ligne par WhatsApp (le numéro devient prouvé) ou lui demander le code e-mail.", "Guichet does not take the intention; send the line link by WhatsApp (the number becomes proven) or ask them for the e-mail code.")],
            [l("Le client demande un chiffre qui n'est pas sur la fiche", "The client asks for a figure that is not on the line"), l("Chercher la source (Dépôt › Références) ; si elle existe, la mettre dans le registre ou la fiche avec sa date ; sinon dire qu'elle n'est pas publiée. Jamais un chiffre de mémoire.", "Look for the source (Repository › References); if it exists, put it in the registry or the line with its date; otherwise say it is not published. Never a figure from memory.")],
            [l("Le client se plaint d'un résultat (servi en partie, prix)", "The client complains about a result (partly served, price)"), l("Reprendre l'avis de résultat et le bordereau ; expliquer l'adjudication avec la leçon ; si erreur du desk, le dire, corriger, journaliser ; le responsable est informé.", "Go back to the result notice and the slip; explain the auction with the lesson; if the desk erred, say so, correct, log it; the manager is informed.")],
            [l("Un message arrive hors heures ouvrées", "A message arrives outside business hours"), l("Le robot accuse réception et donne l'heure de reprise ; l'opérateur reprend le fil à l'ouverture, dans l'ordre d'arrivée.", "The robot acknowledges and gives the resumption time; the operator picks up the thread at opening, in order of arrival.")],
            [l("Un client demande à être oublié", "A client asks to be forgotten"), l("Le responsable archive le dossier (jamais supprimé : obligations de conservation), coupe les envois, note la demande au journal, répond par écrit.", "The manager archives the file (never deleted: retention duties), stops sends, notes the request in the log, answers in writing.")],
            [l("Un proche appelle pour le client", "A relative calls for the client"), l("On ne parle d'un dossier qu'au titulaire ou à son mandataire déclaré dans le dossier ; proposer que le client écrive lui-même.", "A file is discussed only with its holder or the representative declared in the file; suggest the client writes themself.")],
          ],
        },
      ],
    },
    {
      id: "journee",
      title: l("La journée du desk", "The desk's day"),
      blocks: [
        { type: "diagram", kind: "journee", caption: l("Le système tient les heures fixes ; le desk tient les gens.", "The system keeps the fixed hours; the desk keeps the people.") },
        {
          type: "steps",
          items: [
            l("07:30, le point du matin arrive par e-mail : clôtures du jour, intentions de la nuit, bulletin, santé.", "07:30, the morning brief arrives by e-mail: the day's closings, the night's intentions, bulletin, health."),
            l("08:00, desk › Carnet › Aujourd'hui : six tuiles (bulletin, lignes à rafraîchir, à la une, intentions non traitées, à valider, santé). Tout en vert : rien à faire ; une tuile orange ou rouge dit quoi faire et où.", "08:00, desk › Carnet › Today: six tiles (bulletin, lines to refresh, featured, untreated intentions, to validate, health). All green: nothing to do; an orange or red tile says what to do and where."),
            l("Puis les intentions : rappeler dans l'ordre d'arrivée, confirmer, transmettre ; les messages ; À valider si une source est arrivée.", "Then the intentions: call back in order of arrival, confirm, transmit; the messages; To validate if a source arrived."),
            l("19:30, le bulletin se lit tout seul ; le lendemain matin, Aujourd'hui dit s'il faut le relancer ou déposer le PDF reçu par e-mail.", "19:30, the bulletin reads itself; next morning, Today says whether to relaunch it or drop the PDF received by e-mail."),
          ],
        },
        { type: "link", href: "/desk", label: l("Ouvrir le carnet", "Open the carnet"), hint: l("Aujourd'hui est en tête", "Today is at the top") },
      ],
    },
  ],
};
