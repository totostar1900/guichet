import { l, type DocPage } from "./types";

/** How Guichet works — the story in ten short chapters, for everyone. */
export const FONCTIONNEMENT: DocPage = {
  slug: "fonctionnement",
  title: l("Comment fonctionne Guichet", "How Guichet works"),
  summary: l("Ce que voit le client, ce que fait le desk, la vie d'une ligne et d'un dossier, les canaux, ce qui est automatique et ce qui ne l'est jamais.", "What the client sees, what the desk does, the life of a line and of a file, the channels, what is automatic and what never is."),
  visibility: "desk",
  audience: ["desk", "admin"],
  order: 1,
  checkedOn: "2026-09-19",
  owner: "Georges",
  chapters: [
    {
      id: "une-page",
      title: l("En une page", "In one page"),
      blocks: [
        { type: "lead", text: l("Guichet est le comptoir en ligne de Purpose Capital : un client y voit toutes les occasions de placement de la zone CEMAC, comprend chaque chiffre, dit ce qu'il veut faire et suit ce que le desk en fait. L'application ne débite jamais d'argent et ne conseille jamais : elle informe, enregistre une intention, et c'est un conseiller qui rappelle, confirme et transmet l'ordre.", "Guichet is Purpose Capital's online counter: a client sees every investment opportunity in the CEMAC zone, understands each figure, says what they want to do and follows what the desk does with it. The app never debits money and never advises: it informs, records an intention, and an adviser calls back, confirms and transmits the order.") },
        {
          type: "table",
          head: [l("Qui", "Who"), l("Ce qu'il fait", "What they do"), l("Où", "Where")],
          rows: [
            [l("Le client (particulier, entreprise, groupement, institution)", "The client (individual, company, group, institution)"), l("Consulte, compare, ouvre un compte, déclare une intention, suit ses ordres et ses documents.", "Browses, compares, opens an account, declares an intention, follows orders and documents."), l("Le site public et « Mon espace », sur téléphone ou ordinateur ; WhatsApp.", "The public site and \"My space\", on phone or desktop; WhatsApp.")],
            [l("Le desk (opérateurs)", "The desk (operators)"), l("Publie les lignes, traite les intentions, appelle les clients, transmet les ordres au SVT, saisit les résultats, produit les documents, répond aux messages, publie les actualités.", "Publishes lines, handles intentions, calls clients, transmits orders to the primary dealer, enters results, produces documents, answers messages, publishes news."), l("/desk, réservé, avec second facteur.", "/desk, restricted, with a second factor.")],
            [l("Le responsable", "The manager"), l("Tout ce que fait un opérateur, plus les approbations hors fenêtre déléguée, l'équipe, le référentiel, le journal, le reporting.", "Everything an operator does, plus approvals outside the delegated window, the team, reference data, the audit log, reporting."), l("/desk › Pilotage", "/desk › Governance")],
          ],
        },
        { type: "p", text: l("Ce que Guichet fait : informer avec des chiffres vérifiés, enregistrer des intentions, tracer chaque étape, produire les documents réglementaires, parler aux clients sur leurs canaux. Ce qu'il ne fait pas : exécuter un ordre lui-même, toucher à l'argent, donner un conseil, publier un chiffre que personne n'a validé.", "What Guichet does: inform with checked figures, record intentions, trace every step, produce the regulatory documents, talk to clients on their channels. What it does not do: execute an order itself, touch money, give advice, publish a figure nobody validated.") },
      ],
    },
    {
      id: "client",
      title: l("Ce que voit le client", "What the client sees"),
      blocks: [
        { type: "lead", text: l("Le site est en français et en anglais (bouton FR · EN), sur téléphone comme sur ordinateur. Cinq sections, et un espace personnel une fois connecté.", "The site is in French and English (FR · EN button), on phone and desktop. Five sections, and a personal space once signed in.") },
        {
          type: "table",
          head: [l("Section", "Section"), l("Ce qu'on y trouve", "What is there")],
          rows: [
            [l("Titres (accueil)", "Securities (home)"), l("Toutes les lignes ouvertes ou à venir : emprunts des Trésors (OTA, BTA), introductions en bourse, rachats, marché secondaire de la BVMAC ; deux interrupteurs Marché primaire / Marché secondaire, tous deux allumés par défaut. Chaque ligne montre son chiffre-clé (le rendement), sa date limite, son minimum. Filtres par pays, type, rendement ; « À la une » = la sélection du desk.", "Every open or upcoming line: Treasury issues (OTA, BTA), IPOs, buybacks, the BVMAC secondary market; two switches, Primary market / Secondary market, both on by default. Each line shows its key figure (the yield), its deadline, its minimum. Filters by country, type, yield; \"À la une\" = the desk's picks.")],
            [l("Fonds", "Funds"), l("Un seul tableau des OPCVM avec leur dernière valeur liquidative, les quatre catégories expliquées dans un bandeau repliable ; « Souscrire » n'apparaît que sous convention de distribution. La fiche d'un fonds donne cinq lectures de ses VL (VL, rendement annualisé, 1 000 000 FCFA placés, variations, repli) sur une période au choix, avec le dernier BTA en repère.", "One table of the funds with their latest NAV, the four categories explained in a foldable band; \"Subscribe\" appears only under a distribution agreement. A fund's page gives five readings of its NAVs (NAV, annualised return, 1 000 000 FCFA invested, changes, drawdown) over a chosen period, with the latest BTA as a reference.")],
            [l("Sociétés", "Companies"), l("Les sept sociétés cotées et les émetteurs obligataires : activité, comptes certifiés, cours, ratios expliqués, documents publiés, rapport PDF.", "The seven listed companies and the bond issuers: activity, audited accounts, prices, explained ratios, published documents, PDF report.")],
            [l("Actualités", "News"), l("Ce que publient les Trésors, la BVMAC, la COSUMAF, la presse, avec deux lignes du desk sur ce que cela change ; l'article reste chez son éditeur.", "What Treasuries, the BVMAC, the COSUMAF and the press publish, with two lines from the desk on what it changes; the article stays with its publisher.")],
            [l("Guide", "Guide"), l("Deux parcours — « Lire une ligne » (huit leçons) et « Comprendre le marché CEMAC » (cinq sections repliables, vingt leçons avec schémas : carte des acteurs, chemin d'un ordre, ligne de vie, catégories de fonds) —, le glossaire avec sa recherche et ses catégories, le simulateur d'obligation, le comparateur (deux lignes côte à côte, puis des graphiques adaptés à la paire), une recherche ; « Premiers pas » rejouable. Les leçons se modifient dans le Référentiel (onglet Leçons, colonne Cours).", "Two courses — \"Reading a line\" (eight lessons) and \"Understanding the CEMAC market\" (five folding sections, twenty lessons with diagrams: actors map, path of an order, lifeline, fund categories) —, the glossary with its search and categories, the bond simulator, the comparer (two lines side by side, then charts fitted to the pair), a search; replayable first steps. Lessons are edited in the Référentiel (Lessons tab, Course column).")],
            [l("Mon espace (connecté)", "My space (signed in)"), l("Le dossier d'ouverture de compte, les intentions et leur état, les positions, les documents reçus (bulletins, appels de fonds, avis), les lignes suivies, les préférences (WhatsApp, e-mail, notifications).", "The account file, intentions and their state, positions, received documents (forms, calls for funds, notices), followed lines, preferences (WhatsApp, e-mail, notifications).")],
          ],
        },
        { type: "p", text: l("Sur chaque fiche de ligne, le client trouve le même ordre : le chiffre qui compte, où en est la ligne, l'estimation pour son montant, les documents, « À garder en tête » (les risques), puis le formulaire d'intention. Un bouton « i » explique chaque terme en une phrase et renvoie à la leçon.", "On every line page the client finds the same order: the figure that matters, where the line stands, the estimate for their amount, the documents, \"Keep in mind\" (the risks), then the intention form. An \"i\" button explains each term in one sentence and links to the lesson.") },
        { type: "p", text: l("La connexion se fait par un code reçu par e-mail : pas de mot de passe. Sur téléphone, une barre en bas donne Guichet, Fonds, Mon espace, Info, et l'icône journal ouvre les actualités.", "Sign-in is a code received by e-mail: no password. On a phone, a bottom bar gives Guichet, Funds, My space, Info, and the newspaper icon opens the news.") },
      ],
    },
    {
      id: "desk",
      title: l("Ce que fait le desk", "What the desk does"),
      blocks: [
        { type: "lead", text: l("Le desk est l'arrière-boutique : seize pages en quatre groupes, un compteur sur chaque onglet qui attend une action, un guide intégré avec visite guidée. L'objectif d'une journée tient en une phrase : zéro intention non traitée à la clôture.", "The desk is the back office: sixteen pages in four groups, a counter on each tab that awaits an action, a built-in guide with a tour. A day's goal fits in one sentence: zero untreated intention at closing.") },
        {
          type: "table",
          head: [l("Groupe", "Group"), l("Pages", "Pages"), l("À quoi ça sert", "What for")],
          rows: [
            [l("Opérations", "Operations"), l("Carnet, À valider, Résultats, Documents", "Book, To validate, Results, Documents"), l("Le quotidien : intentions reçues et leur état, communiqués à transformer en lignes publiées, résultats d'adjudication à saisir, documents générés et bordereaux SVT.", "The day: intentions and their state, notices to turn into published lines, auction results to enter, generated documents and SVT slips.")],
            [l("Clients", "Clients"), l("Dossiers, Messages", "Files, Messages"), l("Dossiers d'ouverture de compte (KYC) à compléter et approuver ; boîte de réception WhatsApp et e-mail, une conversation par client.", "Account files (KYC) to complete and approve; WhatsApp and e-mail inbox, one conversation per client.")],
            [l("Marché", "Market"), l("Cotes & VL, Actualités, Robot", "Prices & NAV, News, Bot"), l("Le bulletin de la BVMAC ingéré chaque soir (cours, valeurs liquidatives), les actualités à publier, le banc d'essai du robot WhatsApp.", "The BVMAC bulletin ingested every evening (prices, NAVs), the news to publish, the WhatsApp robot's test bench.")],
            [l("Pilotage (responsable)", "Governance (manager)"), l("Approbations, Référentiel, Journal, Équipe, Reporting, Santé, Documentation", "Approvals, Reference data, Audit log, Team, Reporting, Health, Documentation"), l("Ce qui sort de la fenêtre déléguée, les données de référence, la piste d'audit, les rôles, le reporting mensuel, l'état de santé du système, cette documentation.", "What falls outside the delegated window, reference data, the audit trail, roles, monthly reporting, system health, this documentation.")],
          ],
        },
        { type: "p", text: l("La journée type :", "A typical day:") },
        {
          type: "steps",
          items: [
            l("7 h : le point du matin arrive par e-mail (clôtures du jour, intentions de la nuit, santé).", "7 am: the morning digest arrives by e-mail (today's closings, overnight intentions, health)."),
            l("Matinée : trier les liens reçus, appeler les clients des intentions « reçues », confirmer, préparer le bordereau SVT avant l'heure limite.", "Morning: sort received links, call the clients of \"received\" intentions, confirm, prepare the SVT slip before the deadline."),
            l("Après-midi : saisir les résultats, envoyer les avis, compléter les dossiers KYC, répondre aux messages.", "Afternoon: enter results, send notices, complete KYC files, answer messages."),
            l("18 h 30 : le bulletin BVMAC est ingéré seul ; à vérifier sur Santé le lendemain.", "6:30 pm: the BVMAC bulletin is ingested by itself; check Health the next morning."),
          ],
        },
        { type: "p", text: l("Deux rôles. L'opérateur fait tout le quotidien dans une fenêtre déléguée (prix dans les bornes, diffusion limitée) ; le responsable approuve ce qui en sort, gère l'équipe et le référentiel. Tout changement de niveau et toute approbation sont journalisés : quatre yeux, sans goulot.", "Two roles. The operator does all the daily work within a delegated window (prices within bounds, limited broadcast); the manager approves what falls outside it and manages the team and reference data. Every role change and approval is logged: four eyes, no bottleneck.") },
        { type: "link", href: "/desk/guide", label: l("Guide des pages du desk, champ par champ", "Desk pages guide, field by field"), hint: l("avec la visite guidée", "with the guided tour") },
      ],
    },
    {
      id: "vie-ligne",
      title: l("La vie d'une ligne", "The life of a line"),
      blocks: [
        { type: "lead", text: l("Une ligne naît d'un communiqué, vit une fenêtre de souscription, puis continue jusqu'à son échéance. À chaque étape, l'application dit qui agit et garde une version.", "A line is born from a notice, lives through a subscription window, then continues to maturity. At every step the app says who acts and keeps a version.") },
        {
          type: "flow",
          steps: [l("Communiqué reçu", "Notice received"), l("À valider : extraction + contrôles", "To validate: extraction + checks"), l("Publiée sur le Guichet", "Published"), l("Intentions des clients", "Client intentions"), l("Bordereau au SVT", "Slip to the primary dealer"), l("Résultats saisis", "Results entered"), l("Règlement", "Settlement"), l("Vie du titre : coupons, cotation, rachat", "Life of the security: coupons, prices, buyback")],
        },
        {
          type: "table",
          head: [l("Étape", "Step"), l("Qui", "Who"), l("Ce qui se passe", "What happens")],
          rows: [
            [l("Communiqué reçu", "Notice received"), l("Trésor, BVMAC, émetteur → desk", "Treasury, BVMAC, issuer → desk"), l("PDF ou photo arrivé par e-mail (intake@), par WhatsApp d'un téléphone de l'équipe, ou déposé à la main.", "PDF or photo by e-mail (intake@), by WhatsApp from a staff phone, or uploaded by hand.")],
            [l("À valider", "To validate"), l("Robot puis opérateur", "Robot then operator"), l("Le texte est extrait automatiquement (dates, coupon, nominal, heure limite) ; l'opérateur vérifie la liste de contrôle, fixe le prix, choisit la diffusion.", "The text is extracted automatically (dates, coupon, par, deadline); the operator checks the list, sets the price, picks the broadcast.")],
            [l("Publiée", "Published"), l("Opérateur (responsable si hors fenêtre)", "Operator (manager if outside the window)"), l("Version 1 de la ligne ; clients notifiés par WhatsApp, e-mail, notification. Chaque modification crée une version suivante, restaurable.", "Version 1 of the line; clients notified by WhatsApp, e-mail, push. Every change creates a next, restorable version.")],
            [l("Intentions", "Intentions"), l("Clients", "Clients"), l("Appétit, prise ferme, cession, information ou rappel, avec montant et coordonnées (chapitre suivant).", "Interest, firm order, sale, information or call-back, with amount and contact details (next chapter).")],
            [l("Bordereau au SVT", "Slip to the primary dealer"), l("Opérateur", "Operator"), l("Les intentions confirmées sont regroupées dans un bordereau de soumission (PDF) transmis à la banque agréée avant l'heure limite.", "Confirmed intentions are grouped in a submission slip (PDF) sent to the approved bank before the deadline.")],
            [l("Résultats", "Results"), l("Opérateur", "Operator"), l("Prix servi, pourcentage servi par client ; avis d'allocation ou de non-allocation générés et envoyés.", "Price served, allocation per client; allocation or non-allocation notices generated and sent.")],
            [l("Règlement", "Settlement"), l("Client + desk", "Client + desk"), l("Appel de fonds (PDF avec les coordonnées de règlement), confirmation du règlement-livraison ; la position apparaît dans Mon espace.", "Call for funds (PDF with settlement details), settlement-delivery confirmed; the position appears in My space.")],
            [l("Vie du titre", "Life of the security"), l("Automatique + desk", "Automatic + desk"), l("Avis de coupon J-3 et J, cours du bulletin BVMAC chaque soir, rachat par l'émetteur, relevé de position.", "Coupon notices D-3 and D, nightly BVMAC prices, buyback by the issuer, position statement.")],
          ],
        },
        { type: "p", text: l("Les types de lignes : OTA (obligation du Trésor, coupon annuel), BTA (bon du Trésor à intérêts précomptés), APE (emprunt obligataire ouvert au public), action (introduction en bourse), rachat (l'émetteur reprend ses titres), marché (obligations et actions déjà cotées), fonds (parts d'OPCVM). Le desk peut créer d'autres types dans le référentiel sans toucher au code.", "Line types: OTA (Treasury bond, annual coupon), BTA (discounted Treasury bill), APE (public bond issue), share (IPO), buyback (the issuer takes back its securities), market (bonds and shares already listed), fund (fund units). The desk can create other types in the reference data without touching the code.") },
      ],
    },
    {
      id: "intention",
      title: l("Une intention n'est pas un ordre", "An intention is not an order"),
      blocks: [
        { type: "lead", text: l("Le client dit ce qu'il veut ; rien n'est engagé tant qu'un conseiller n'a pas confirmé avec lui. Chaque intention porte une référence, un état, et laisse des documents.", "The client says what they want; nothing is committed until an adviser has confirmed with them. Every intention carries a reference, a state, and leaves documents.") },
        {
          type: "table",
          head: [l("Type", "Type"), l("Sens", "Meaning"), l("Référence", "Reference")],
          rows: [
            [l("Appétit", "Interest"), l("« Je serais intéressé pour environ tel montant » ; sans engagement, rappel du conseiller.", "\"I would be interested for roughly this amount\"; no commitment, adviser calls back."), l("AP-", "AP-")],
            [l("Prise ferme", "Firm order"), l("« Je souscris ce montant » ; bulletin d'ordre à signer et appel de fonds.", "\"I subscribe this amount\"; order form to sign and call for funds."), l("PF-", "PF-")],
            [l("Cession", "Sale"), l("Sur un rachat ou le marché : « je vends tant de titres ».", "On a buyback or the market: \"I sell this many securities\"."), l("CS-", "CS-")],
            [l("Achat / Vente", "Buy / Sell"), l("Marché secondaire, avec ou sans prix limite.", "Secondary market, with or without a limit price."), l("OA- / OV-", "OA- / OV-")],
            [l("Souscription / Rachat de fonds", "Fund subscription / redemption"), l("Parts d'OPCVM à la prochaine valeur liquidative.", "Fund units at the next NAV."), l("SO- / RA-", "SO- / RA-")],
            [l("Information / Rappel", "Information / Call-back"), l("Une question, ou « rappelez-moi ».", "A question, or \"call me back\"."), l("IN- / RP-", "IN- / RP-")],
          ],
        },
        { type: "flow", steps: [l("Reçue", "Received"), l("Confirmée (appel du conseiller)", "Confirmed (adviser's call)"), l("Transmise (bordereau SVT)", "Transmitted (SVT slip)"), l("Servie / non servie (résultats)", "Served / not served (results)"), l("Réglée", "Settled")] },
        { type: "p", text: l("Avant d'accepter une intention, l'application vérifie ce qu'elle peut : montant au-dessus du minimum et multiple du nominal, ligne encore ouverte, titres détenus pour une cession, compte-titres à ouvrir. Chaque contrôle a un bouton « i » qui donne la règle et sa raison, la même que voit le client.", "Before accepting an intention the app checks what it can: amount above the minimum and a multiple of par, line still open, securities held for a sale, custody account to open. Every check has an \"i\" button giving the rule and its reason, the same the client sees.") },
        { type: "p", text: l("Documents produits, dans l'ordre : accusé de réception, bulletin d'ordre et appel de fonds à la confirmation, bordereau de soumission à la transmission, avis de résultat, avis de coupon et relevé pendant la vie du titre. Tous sont dans Documents côté desk et dans Mon espace côté client.", "Documents produced, in order: acknowledgement, order form and call for funds at confirmation, submission slip at transmission, result notice, coupon notices and statements during the life of the security. All are under Documents on the desk side and in My space on the client side.") },
      ],
    },
    {
      id: "dossier",
      title: l("La vie d'un dossier client", "The life of a client file"),
      blocks: [
        { type: "lead", text: l("Ouvrir un compte prend cinq minutes sur téléphone ; rien ne bloque à la soumission. Le desk complète et décide ensuite, avec une liste de contrôle par type de client.", "Opening an account takes five minutes on a phone; nothing blocks at submission. The desk completes and decides afterwards, with a checklist per client type.") },
        { type: "flow", steps: [l("Brouillon (le client remplit)", "Draft (the client fills in)"), l("Soumis", "Submitted"), l("En revue (compléments demandés)", "Under review (more asked)"), l("Approuvé + compte-titres ouvert", "Approved + custody account opened"), l("Revue périodique", "Periodic review")] },
        {
          type: "table",
          head: [l("Type de client", "Client type"), l("Pièces attendues", "Documents expected")],
          rows: [
            [l("Personne physique", "Individual"), l("Pièce d'identité recto-verso, selfie, justificatif de domicile, RIB, attestation NIU ; questionnaire investisseur ; consentements.", "ID front and back, selfie, proof of address, bank details, tax identifier; investor questionnaire; consents.")],
            [l("Entreprise, institution", "Company, institution"), l("Extrait RCCM, statuts, pouvoirs des signataires, bénéficiaires effectifs, RIB.", "Trade register extract, articles, signatories' powers, beneficial owners, bank details.")],
            [l("Groupement", "Group"), l("Récépissé ou acte constitutif, PV désignant les mandataires et la règle de décision, liste des membres, matrice des signataires ; au-delà de 25 M FCFA, association déclarée.", "Receipt or founding deed, minutes appointing proxies and the decision rule, list of members, signatory matrix; above 25 M FCFA, a registered association.")],
          ],
        },
        { type: "p", text: l("Ce qui bloque quoi : un client peut déclarer une intention avec un dossier soumis ; l'approbation du dossier (et l'attestation sanctions / PPE) est exigée avant qu'un ordre soit transmis ; le compte-titres nominatif chez le SVT est ouvert à l'approbation.", "What blocks what: a client may declare an intention with a submitted file; the file's approval (and the sanctions / PEP attestation) is required before an order is transmitted; the nominative custody account at the primary dealer is opened at approval.") },
        { type: "note", kind: "rule", text: l("Seule l'approbation exige l'attestation manuelle sanctions / PPE par un membre du desk, même avec le pré-contrôle automatique.", "Only approval requires the manual sanctions / PEP attestation by a desk member, even with the automatic pre-screen.") },
      ],
    },
    {
      id: "canaux",
      title: l("Les canaux", "The channels"),
      blocks: [
        { type: "lead", text: l("WhatsApp est le canal principal des clients ; l'e-mail double chaque envoi ; la notification du navigateur prévient ceux qui l'ont acceptée. Tout ce qui entre est gardé dans une boîte de réception.", "WhatsApp is the clients' main channel; e-mail doubles every send; the browser notification alerts those who accepted it. Everything that comes in is kept in an inbox.") },
        {
          type: "table",
          head: [l("Canal", "Channel"), l("Sortant", "Outbound"), l("Entrant", "Inbound")],
          rows: [
            [l("WhatsApp (numéro de la société)", "WhatsApp (the company's number)"), l("Modèles approuvés pour les offres et mises à jour, documents PDF, réponses libres dans les 24 h.", "Approved templates for offers and updates, PDF documents, free-form replies within 24 h."), l("Questions des clients → robot ou conseiller ; photos et PDF d'un téléphone de l'équipe → À valider ; liens de l'équipe → Actualités ; STOP / START gèrent l'accord.", "Client questions → robot or adviser; photos and PDFs from a staff phone → To validate; staff links → News; STOP / START manage consent.")],
            [l("E-mail", "E-mail"), l("Codes de connexion, avis, documents, point du matin, résumé des actualités.", "Sign-in codes, notices, documents, morning digest, news digest."), l("intake@ : communiqués et liens ; toute réponse d'un client arrive dans Messages.", "intake@: notices and links; every client reply lands in Messages.")],
            [l("Notification (web push)", "Browser notification"), l("Lignes suivies, opportunités.", "Followed lines, opportunities."), l("—", "—")],
          ],
        },
        { type: "p", text: l("Le robot WhatsApp répond aux questions simples à partir des lignes publiées, du glossaire et des intentions du client. Il ne conseille jamais, ne promet jamais une allocation, ne parle jamais d'un autre client ; une prise ferme, une cession ou une réclamation passent toujours par un conseiller, qu'il prévient.", "The WhatsApp robot answers simple questions from the published lines, the glossary and the client's own intentions. It never advises, never promises an allocation, never speaks about another client; a firm order, a sale or a complaint always go to an adviser, whom it alerts.") },
      ],
    },
    {
      id: "automatique",
      title: l("Automatique ou humain", "Automatic or human"),
      blocks: [
        { type: "lead", text: l("L'application fait seule ce qui est répétitif et vérifiable ; une personne décide tout ce qui engage un client ou un chiffre publié.", "The app does alone what is repetitive and checkable; a person decides everything that commits a client or a published figure.") },
        {
          type: "table",
          head: [l("Tourne seul", "Runs alone"), l("Quand", "When"), l("Demande toujours une personne", "Always needs a person")],
          rows: [
            [l("Ingestion du bulletin BVMAC (cours, VL)", "BVMAC bulletin ingestion (prices, NAVs)"), l("18 h 30, lundi–vendredi", "6:30 pm, Monday–Friday"), l("Fixer le prix d'une ligne, la publier", "Setting a line's price, publishing it")],
            [l("Avis de coupon J-3 et J", "Coupon notices D-3 and D"), l("7 h", "7 am"), l("Confirmer une intention avec le client", "Confirming an intention with the client")],
            [l("Point du matin au desk, suivi des lignes suivies", "Morning digest, followed-line alerts"), l("7 h 15, 6 h 30", "7:15 am, 6:30 am"), l("Transmettre un ordre, saisir un résultat", "Transmitting an order, entering a result")],
            [l("Collecte des documents des sociétés cotées", "Listed companies' documents collection"), l("Lundi 6 h", "Monday 6 am"), l("Approuver un dossier client, attester sanctions / PPE", "Approving a client file, attesting sanctions / PEP")],
            [l("Veille des actualités, vérification des liens", "News watch, link check"), l("4 h", "4 am"), l("Publier une actualité et ses deux lignes", "Publishing a news item and its two lines")],
            [l("Résumé des actualités aux clients", "News digest to clients"), l("Vendredi 16 h", "Friday 4 pm"), l("Répondre à une réclamation", "Answering a complaint")],
            [l("Extraction d'un communiqué, réponse du robot", "Notice extraction, robot's reply"), l("À la réception", "On receipt"), l("Changer un rôle, approuver hors fenêtre", "Changing a role, approving outside the window")],
          ],
        },
        { type: "p", text: l("La page Santé du desk dit chaque matin si tout a tourné : dernier bulletin, ingestions à vérifier, VL en retard, messages sans réponse, liens morts, lignes sans prix.", "The desk's Health page says every morning whether everything ran: last bulletin, ingestions to check, late NAVs, unanswered messages, dead links, lines without a price.") },
      ],
    },
    {
      id: "jamais",
      title: l("Ce que Guichet ne fait jamais", "What Guichet never does"),
      blocks: [
        {
          type: "list",
          items: [
            l("Il n'exécute pas d'ordre et ne touche pas à l'argent : le règlement se fait par virement au SVT, sur appel de fonds.", "It executes no order and touches no money: settlement is a transfer to the primary dealer, on a call for funds."),
            l("Il ne conseille pas : chaque chiffre est expliqué, jamais recommandé ; les mots « achetez », « garanti », « à ne pas manquer » sont refusés à la publication.", "It does not advise: every figure is explained, never recommended; the words \"buy\", \"guaranteed\", \"not to be missed\" are refused at publication."),
            l("Il n'affiche pas de commission : les conditions sont communiquées par le conseiller lors de la confirmation.", "It shows no commission: terms are communicated by the adviser at confirmation."),
            l("Il ne publie pas un chiffre non validé : tout communiqué passe par À valider et sa liste de contrôle.", "It publishes no unvalidated figure: every notice goes through To validate and its checklist."),
            l("Il n'efface rien : lignes retirées, versions, intentions, dossiers et décisions restent dans le journal, chaînés et horodatés.", "It deletes nothing: withdrawn lines, versions, intentions, files and decisions stay in the log, chained and time-stamped."),
            l("Il ne reproduit pas les articles : les actualités renvoient à l'original.", "It reproduces no article: news items link to the original."),
          ],
        },
      ],
    },
    {
      id: "mots",
      title: l("Les mots à connaître", "Words to know"),
      blocks: [
        {
          type: "table",
          head: [l("Mot", "Word"), l("En clair", "Plainly")],
          rows: [
            [l("Ligne", "Line"), l("Une occasion de placement identifiée par un ISIN : un emprunt, une action, un fonds.", "An investment opportunity identified by an ISIN: a bond issue, a share, a fund.")],
            [l("Intention", "Intention"), l("Ce que le client dit vouloir faire ; devient un ordre quand un conseiller la confirme.", "What the client says they want to do; becomes an order when an adviser confirms it.")],
            [l("SVT", "Primary dealer"), l("La banque agréée qui dépose nos ordres à l'adjudication du Trésor.", "The approved bank that files our orders at the Treasury auction.")],
            [l("Adjudication", "Auction"), l("La vente des titres du Trésor aux offres les mieux-disantes ; un ordre peut être servi en partie ou pas du tout.", "The sale of Treasury securities to the best bids; an order may be served in part or not at all.")],
            [l("Rendement actuariel", "Yield to maturity"), l("Ce que rapporte réellement un titre acheté à ce prix et gardé jusqu'au bout, coupon couru compris.", "What a security really earns, bought at this price and held to the end, accrued interest included.")],
            [l("Valeur liquidative (VL)", "Net asset value (NAV)"), l("Le prix d'une part de fonds ; on souscrit à la prochaine, pas à celle affichée.", "The price of a fund unit; you subscribe at the next one, not the one shown.")],
            [l("KYC", "KYC"), l("Le dossier d'ouverture de compte : identité, origine des fonds, profil, consentements.", "The account-opening file: identity, source of funds, profile, consents.")],
            [l("Fenêtre déléguée", "Delegated window"), l("Ce qu'un opérateur peut publier seul ; au-delà, un responsable approuve.", "What an operator may publish alone; beyond it, a manager approves.")],
            [l("Référentiel", "Reference data"), l("Les données que le desk maintient sans code : types de produits, échéanciers, glossaire, sociétés.", "Data the desk maintains without code: product types, schedules, glossary, companies.")],
            [l("Journal", "Audit log"), l("La piste d'audit : qui a fait quoi, avant / après, chaînée.", "The audit trail: who did what, before / after, chained.")],
            [l("Santé", "Health"), l("La page qui dit si les tâches automatiques ont tourné.", "The page that says whether the automatic tasks ran.")],
            [l("Bordereau", "Slip"), l("Le PDF de soumission groupée envoyé au SVT, avec une annexe par client.", "The grouped submission PDF sent to the primary dealer, with an annex per client.")],
          ],
        },
      ],
    },
  ],
};
