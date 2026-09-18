/**
 * The desk guide, as data: one section per page, every field commented, and
 * the stops of the guided tour (which page, which element — `data-coach`).
 * The page /desk/guide renders it; the tour drives the same stops across pages.
 */
export interface GuideField {
  name: string;
  what: string; // what the field is
  how?: string; // what to do with it
}
export interface GuideSection {
  key: string;
  path: string;
  title: string;
  role: "operateur" | "responsable";
  purpose: string;
  when: string; // when in the day / the flow
  fields: GuideField[];
  tips?: string[];
  /** Extra screenshots (public/guide/<key>.png) with a caption, for a page that has sub-pages. */
  shots?: { key: string; caption: string }[];
}
export interface TourStop {
  path: string;
  target: string;
  title: string;
  text: string;
  /** A page to open beside the tour (new tab), e.g. what the client sees. */
  link?: { href: string; label: string };
  /** A small preview shown in the bubble (public/guide/<file>), e.g. the client's page this desk page feeds. */
  image?: string;
}

export const ROLES = {
  operateur: {
    title: "Opérateur desk",
    text: "Tient le guichet au quotidien : valide les sources reçues (communiqués, bulletins) et publie les lignes dans la fenêtre déléguée, traite les intentions des clients (confirme, transmet, saisit les résultats et le règlement), revoit les dossiers clients, tient le référentiel, envoie les documents. Tout ce qu'il fait est journalisé sous son nom.",
    cannot: ["publier un prix hors de la fenêtre déléguée (la demande part en approbation)", "donner ou retirer un accès desk", "décider une approbation", "modifier la fenêtre déléguée", "diffuser une alerte à plus de 50 clients"],
  },
  responsable: {
    title: "Responsable",
    text: "Opérateur, plus la gouvernance : décide les approbations (quatre yeux), fixe la fenêtre déléguée, gère l'équipe (accès, niveaux, second facteur), signe les diffusions larges. Il reste toujours au moins un responsable ; personne ne modifie son propre niveau.",
    cannot: ["modifier son propre niveau", "retirer le dernier responsable", "effacer une ligne du journal (il est immuable, chaîné par empreinte)"],
  },
};

export const GUIDE: GuideSection[] = [
  {
    key: "carnet",
    path: "/desk",
    title: "Carnet du jour",
    role: "operateur",
    purpose: "La page d'ouverture : ce qui clôture, ce qui attend, ce que les clients viennent de demander.",
    when: "Plusieurs fois par jour ; d'abord le matin, puis à chaque notification.",
    fields: [
      { name: "À la une", what: "Les lignes mises en avant dans le Guichet (trois au plus), avec la raison neutre donnée et la date de fin.", how: "Choisir une ligne ouverte, écrire une raison factuelle (« clôture cette semaine », « nouvelle ligne »), fixer la fin ; retirer quand la raison ne tient plus. Une sélection n'est jamais un conseil." },
      { name: "Prochaine clôture dans", what: "Le compte à rebours de la première ligne qui ferme.", how: "Si des prises fermes sont encore « reçues » à moins de deux heures, les confirmer ou appeler." },
      { name: "Prises fermes / Appétits à convertir", what: "Montants engagés (fermes) et montants pressentis (appétits) sur les lignes ouvertes.", how: "Les appétits se rappellent avant la clôture pour arrêter un montant." },
      { name: "Intentions non traitées", what: "Les demandes clients encore à l'état « reçue ».", how: "Objectif zéro à la clôture." },
      { name: "Flux en direct", what: "Chaque événement (intention, passage d'étape, message WhatsApp entrant, document) à la seconde où il arrive." },
      { name: "Diffusion", what: "Les messages sortis (WhatsApp, e-mail, push) et leur état : envoyé, préparé (canal non configuré), échec.", how: "Un « échec » se relance depuis l'intention ; un « préparé » signifie que la clé du canal manque sur Vercel." },
      { name: "Carnet d'appétits", what: "Par ligne ouverte : prix Purpose, prises fermes et appétits, volume visuel, rendement publié, clôture." },
      { name: "Intentions reçues — barre de filtres", what: "Recherche (réf., client, ligne, téléphone), pastilles d'état, ligne, tri.", how: "« À traiter » est le filtre de travail ; le lien sur la référence ou « Ouvrir » ouvre l'intention avec le client à côté." },
      { name: "Boutons d'étape", what: "Confirmer → Transmettre → Servi / Non servi → Réglé, ou Annuler.", how: "Chaque passage est journalisé, produit ses documents (bulletin, appel de fonds, avis) et prévient le client." },
    ],
  },
  {
    key: "intention",
    path: "/desk/intentions/…",
    title: "Une intention, ouverte",
    role: "operateur",
    purpose: "Analyser l'ordre sans quitter l'écran : la ligne telle que le client l'a vue, les contrôles, son dossier, son historique, ses positions, ses messages, et la décision.",
    when: "Pour chaque intention « reçue », avant de confirmer.",
    fields: [
      { name: "En-tête", what: "Type d'ordre et montant, état actuel, référence, date et canal de réception." },
      { name: "La ligne", what: "Identité de la ligne, rendement ou repère, statut et clôture, ticket minimum — exactement ce que le client a lu." },
      { name: "Au prix publié", what: "Titres ou parts, décaissement, coupon couru, rendement si servi au prix publié." },
      { name: "Contrôles", what: "Minimum, titres entiers, quotité, prix limite, position détenue, compte-titres, dossier client. Vert : rien à signaler ; orange : à savoir ; rouge : l'ordre ne peut pas passer tel quel.", how: "Le bouton « i » donne la règle et sa raison — le même texte que le client a vu sous son champ de saisie." },
      { name: "Message du client", what: "Le texte libre joint à la demande (contrainte de trésorerie, question)." },
      { name: "Étape", what: "reçue → confirmée → transmise → servie → réglée." },
      { name: "Décision", what: "Les passages possibles depuis l'état actuel ; « Exécuter (Marché) » pour un ordre de bourse ou d'OPCVM transmis ; « Répondre sur WhatsApp » ouvre la conversation.", how: "Confirmer = le client est d'accord sur le montant ; Transmettre = l'ordre est chez le SVT / en bourse / chez la société de gestion." },
      { name: "Dossier client (côté droit)", what: "Statut KYC, risque et prochaine revue, compte-titres, pièces reçues, attestation sanctions / PPE, ce qui manque encore.", how: "« Ouvrir le dossier KYC » mène à la revue ; un ordre se confirme avec un dossier en cours, mais ne se règle qu'avec un dossier approuvé." },
      { name: "Positions", what: "Valorisation, nombre de lignes, ce qui est détenu sur cette ligne (pour une vente), prochain flux." },
      { name: "Historique", what: "Les intentions précédentes du même client (même compte, même numéro ou même adresse)." },
      { name: "Messages", what: "Sortants et événements reçus liés aux intentions de ce client, du plus récent au plus ancien." },
    ],
  },
  {
    key: "a-valider",
    path: "/desk/a-valider",
    title: "À valider — sources reçues",
    role: "operateur",
    purpose: "Transformer un communiqué (e-mail, WhatsApp, PDF, texte collé) en ligne publiée, en vérifiant chaque champ extrait.",
    when: "À chaque source reçue ; le matin pour les adjudications de la semaine.",
    fields: [
      { name: "Source", what: "D'où vient le document (adresse, numéro, heure) et s'il est marqué officiel (expéditeur de confiance)." },
      { name: "Type de produit", what: "OTA, BTA, rachat, IPO, emprunt APE… (référentiel).", how: "Le type fixe les champs attendus, les cautions de la fiche et la liste de contrôle." },
      { name: "Champs extraits", what: "Émetteur, ISIN, dates (ouverture, clôture, règlement, échéance), nominal, coupon ou taux, volume, minimum. Un champ manquant est surligné.", how: "Comparer au document affiché à côté ; corriger, ne jamais deviner." },
      { name: "Prix Purpose / taux précompté", what: "Le prix auquel nous servons la ligne (% du nominal) ou le taux (BTA).", how: "Dans la fenêtre déléguée, la ligne se publie ; hors fenêtre, elle part en approbation." },
      { name: "Minimum de titres", what: "Le minimum de l'émetteur ; sert aux contrôles de cohérence côté client." },
      { name: "Segment et canaux", what: "À qui annoncer la ligne et par quel canal (WhatsApp, e-mail, push)." },
      { name: "Liste de contrôle", what: "Les cases du type de produit (communiqué joint, dates vérifiées…) — toutes cochées avant de publier." },
    ],
  },
  {
    key: "resultats",
    path: "/desk/resultats",
    title: "Résultats & positions",
    role: "operateur",
    purpose: "Saisir le résultat d'une adjudication (prix servi, taux d'allocation), passer les intentions en servies / non servies, suivre les positions et les flux à venir.",
    when: "Le jour des résultats, puis au règlement.",
    fields: [
      { name: "Résultat de la ligne", what: "Prix ou taux servi, allocation, résumé publié sur la fiche.", how: "Une fois saisi, les avis de résultat partent aux clients." },
      { name: "Positions clients", what: "Ce que chaque client détient chez nous, valorisé au dernier cours ou à la dernière VL.", how: "Filtrer par client depuis une intention (« Positions et relevés »)." },
      { name: "Flux des 30 prochains jours", what: "Coupons et remboursements attendus ; le cron du matin prévient les clients la veille." },
    ],
  },
  {
    key: "documents",
    path: "/desk/documents",
    title: "Documents",
    role: "operateur",
    purpose: "Les soumissions SVT par adjudication, la génération et l'envoi des documents clients, la chaîne documentaire.",
    when: "Avant la clôture (soumission), à chaque passage d'étape (documents automatiques), à la demande (relevé, attestation).",
    fields: [
      { name: "Soumissions SVT", what: "Le bordereau par adjudication : les prises fermes confirmées, agrégées pour le SVT." },
      { name: "Générer", what: "Bulletin, appel de fonds, ordre de cession, avis, relevé de position, attestation, convention.", how: "Les documents du cycle se génèrent seuls ; ici, ceux à la demande." },
      { name: "Documents émis", what: "Numéro, type, client, état (généré, envoyé, signé), canal.", how: "« Envoyer » choisit WhatsApp ou e-mail selon le contact." },
    ],
  },
  {
    key: "clients",
    path: "/desk/clients",
    title: "Dossiers clients — revue KYC",
    role: "operateur",
    purpose: "Revoir un dossier soumis, demander des compléments, attester le criblage sanctions / PPE, approuver et ouvrir le compte.",
    when: "À chaque dossier soumis ; avant tout règlement.",
    fields: [
      { name: "File d'attente", what: "Les dossiers par état : soumis, en revue, compléments, brouillon, approuvé, refusé." },
      { name: "Identité, personnes, pièces", what: "Ce que le client a saisi et envoyé ; les pièces s'ouvrent en plein écran.", how: "Rien n'est bloquant à la soumission : c'est ici que l'on complète." },
      { name: "Contrôles automatiques", what: "Cohérence des dates, pièce expirée, RIB au nom du client, plafond d'indivision, montant déclaré." },
      { name: "Criblage sanctions / PPE", what: "Listes consultées, résultat (aucun, faux positif, confirmé), notes.", how: "Obligatoire pour approuver ; « à renseigner » ne bloque plus les autres décisions." },
      { name: "Risque", what: "Faible, moyen, élevé — proposé d'après le dossier ; fixe la prochaine revue (5, 3, 1 an)." },
      { name: "Compte-titres", what: "La référence chez le teneur de compte, renseignée à l'approbation ou après." },
      { name: "Compléments à demander", what: "La liste envoyée au client (WhatsApp / e-mail) quand on choisit « Demander des compléments »." },
      { name: "Boutons", what: "Refuser · Demander des compléments · Enregistrer la revue (garde les notes, passe « en revue ») · Approuver et ouvrir le compte." },
    ],
  },
  {
    key: "messages",
    path: "/desk/messages",
    title: "Messages",
    role: "operateur",
    purpose: "La boîte de réception du desk : une conversation par numéro WhatsApp ou adresse e-mail, ce que le client a écrit et ce que nous avons envoyé.",
    when: "En continu ; le compteur sur l'onglet donne les conversations à traiter.",
    fields: [
      { name: "Conversations", what: "Nom ou identifiant, canal, dernier message, nombre de messages non traités." },
      { name: "Fil", what: "Messages reçus à gauche, envoyés à droite, avec leur état (envoyé, préparé, échec) et le lien vers l'intention concernée." },
      { name: "Répondre", what: "Un texte libre, signé de votre nom.", how: "WhatsApp : possible dans les 24 h qui suivent le dernier message du client (règle Meta) ; au-delà, passer par un modèle ou l'e-mail." },
      { name: "Marquer comme traité", what: "Ferme la conversation dans le compteur ; les messages restent." },
    ],
  },
  {
    key: "marche",
    path: "/desk/marche",
    title: "Cotes & VL — Bulletin Officiel de la Cote",
    role: "operateur",
    purpose: "Importer le bulletin BVMAC (cours, VL), vérifier les anomalies, régler les conditions des fonds, exécuter les ordres de bourse et d'OPCVM.",
    when: "Chaque jour de bourse à 18 h 30 le cron l'importe seul ; ici pour vérifier ou reprendre à la main.",
    fields: [
      { name: "Importer", what: "Le PDF du bulletin ; les cours et VL sont historisés par séance (jamais écrasés), les fiches rafraîchies, les lignes nouvelles créées." },
      { name: "Anomalies", what: "Lignes absentes par rapport au bulletin précédent, valeurs invraisemblables.", how: "Une ligne absente n'est pas retirée automatiquement : décider ici." },
      { name: "Cotations", what: "Dernier cours, source (bulletin ou desk), fourchette, quotité, masquer / afficher." },
      { name: "OPCVM", what: "Convention, droits d'entrée et de sortie, minimum, heure limite, délai de règlement.", how: "Les fonds arrivent ouverts à la souscription ; fermer un fonds ici si besoin." },
      { name: "Ordres de bourse et d'OPCVM", what: "Les ordres transmis à exécuter : prix d'exécution, quantité servie, VL retenue." },
    ],
  },
  {
    key: "actualites",
    path: "/desk/actualites",
    title: "Actualités",
    role: "operateur",
    purpose: "Publier des liens vers ce que d'autres publient (Trésors, BVMAC, COSUMAF, presse, sociétés, sociétés de gestion) avec deux lignes sur ce que cela change pour les lignes du Guichet. Jamais l'article : le lecteur va à l'original.",
    when: "Au fil de la journée, dès qu'une source suivie dit quelque chose qui compte ; les liens reçus se trient le matin.",
    fields: [
      { name: "Lien", what: "L'adresse de l'original.", how: "Collez-la puis « Lire la page » : titre, source, date et format sont lus sur la page." },
      { name: "Titre affiché", what: "Le titre tel que le client le lit.", how: "Reformulez : ce que dit la page, pour quelqu'un qui ne l'a pas ouverte." },
      { name: "Pourquoi ça compte", what: "Deux lignes de lecture, 320 caractères au plus.", how: "Informer, jamais recommander : « achetez », « garanti », « à ne pas manquer » sont refusés à la publication." },
      { name: "Lignes et notions liées", what: "Les lignes, sociétés, émetteurs ou termes du glossaire concernés.", how: "La publication apparaît aussi sur leur fiche. Séparez par des virgules ; la liste propose les noms." },
      { name: "Mettre à la une", what: "Une seule publication en tête de page, dans le cadre doré.", how: "Elle remplace la une précédente." },
      { name: "Visible jusqu'au", what: "Le dernier jour d'affichage ; 30 jours par défaut.", how: "Après, la publication reste dans « Semaines précédentes »." },
      { name: "Liens reçus", what: "Ce que la veille de nuit, le robot WhatsApp (un lien envoyé depuis un téléphone du desk) ou un e-mail ont déposé.", how: "« Préparer » ouvre le formulaire pré-rempli ; « Écarter » le classe sans publier." },
    ],
    tips: ["Chaque changement est versionné dans le journal, comme une offre.", "Un lien mort est détecté la nuit et signalé sur Santé.", "Le vendredi à 16 h, les liens de la semaine partent aux clients qui acceptent nos messages."],
  },
  {
    key: "docs",
    path: "/desk/docs",
    title: "Documentation",
    role: "operateur",
    purpose: "Comprendre l'application et la faire vivre : comment elle fonctionne, ce qu'elle coûte, comment aider un client, comment l'administrer, comment la maintenir. Cinq pages en français et en anglais, en mots simples.",
    when: "À l'arrivée d'une recrue ; avant de répondre à un client sur un cas nouveau ; à chaque changement d'écran (la page concernée est relue et sa date « vérifié le » mise à jour).",
    fields: [
      { name: "Recherche", what: "Un mot, une question : chaque chapitre qui le contient, avec un extrait.", how: "Les filtres restreignent aux pages écrites pour les clients, le desk, l'administration ou la technique." },
      { name: "Navigation", what: "À gauche, les pages et les chapitres de la page ouverte ; à droite, « Sur cette page » suit le défilement.", how: "Le lien « Guide, champ par champ » renvoie à ce guide." },
      { name: "Vérifié le", what: "La date à laquelle la page a été relue face à l'application, et son responsable.", how: "Un texte se corrige dans src/data/docs ; la date se met à jour dans le même envoi." },
      { name: "Visibilité", what: "Desk : la page ne sort jamais du desk. Public : la page est rendue aux clients sur /info/aide, écrite pour eux seuls ; un test refuse tout détail interne.", how: "Une seule page publique aujourd'hui : l'aide." },
    ],
    shots: [
      { key: "docs-fonctionnement", caption: "Comment fonctionne Guichet" },
      { key: "docs-plateformes", caption: "Plateformes, services et coûts" },
      { key: "docs-support", caption: "Aider un client : le guide du support" },
      { key: "docs-administration", caption: "Administrer Guichet : le guide du responsable" },
      { key: "docs-technique", caption: "Aperçu technique et exploitation" },
      { key: "docs-aide", caption: "Aide : vos questions, nos réponses (côté desk)" },
      { key: "docs-notes", caption: "Notes de travail de l'assistant, lues depuis docs/notes" },
      { key: "aide-client", caption: "La même aide, telle que le client la voit sur /info/aide" },
      { key: "info-client", caption: "La page Info du client : recherche, aide, leçons, simulateur, glossaire" },
      { key: "premiers-pas", caption: "Premiers pas : l'écran « Comprendre, et trouver de l'aide » (téléphone)" },
    ],
  },
  {
    key: "robot",
    path: "/desk/robot",
    title: "Robot WhatsApp",
    role: "operateur",
    purpose: "Tester ce que le robot répond à un message client (lignes ouvertes, statut d'une intention, glossaire) avant qu'il le fasse en production.",
    when: "Après un changement de référentiel ; en cas de doute sur une réponse.",
    fields: [{ name: "Banc d'essai", what: "Un message, la réponse, la règle déclenchée." }],
  },
  {
    key: "approbations",
    path: "/desk/approbations",
    title: "Approbations",
    role: "responsable",
    purpose: "Décider ce qui sort de la fenêtre déléguée : prix hors bornes, cours saisi trop éloigné, frais de fonds au-dessus du plafond, diffusion large.",
    when: "Dès qu'une demande apparaît (compteur sur l'onglet).",
    fields: [
      { name: "En attente", what: "Qui demande, quoi, pourquoi (la règle enfreinte), avant / après." , how: "Approuver publie la version proposée ; refuser la rejette avec une note." },
      { name: "Fenêtre déléguée", what: "Bornes de prix OTA / APE, bornes de taux BTA, écart de cours autorisé, plafond de frais d'entrée, interrupteur.", how: "Ce que l'opérateur peut publier seul. Modifiable ici par un responsable, journalisé." },
      { name: "Décidées récemment", what: "L'historique des décisions." },
    ],
  },
  {
    key: "referentiel",
    path: "/desk/referentiel",
    title: "Référentiel",
    role: "operateur",
    purpose: "Les données de référence de l'application : types de produits, échéanciers, glossaire, leçons, sociétés cotées, émetteurs.",
    when: "À l'arrivée d'un nouveau produit ou émetteur ; pour corriger un texte.",
    fields: [
      { name: "Types de produits", what: "Libellé, segment, moteur de calcul, couleur, cautions de la fiche, liste de contrôle, intentions ouvertes." },
      { name: "Échéanciers", what: "Dates de coupon et de remboursement par ISIN, pour les calculs de rendement et de flux." },
      { name: "Glossaire", what: "Les bulles « i » de toute l'application." },
      { name: "Leçons", what: "L'onglet Info : titre, texte, question." },
      { name: "Sociétés et émetteurs", what: "Fiches, documents publiés, contacts." },
    ],
    shots: [
      { key: "info-client", caption: "La page Info du client : le glossaire et les leçons de ces onglets, tels que le client les lit" },
      { key: "aide-client", caption: "La page Aide du client, reliée depuis Info" },
    ],
  },
  {
    key: "journal",
    path: "/desk/journal",
    title: "Journal",
    role: "operateur",
    purpose: "La piste d'audit : qui a fait quoi, sur quel enregistrement, avant / après, pourquoi, d'où. Immuable, chaîné par empreinte.",
    when: "Pour comprendre un changement ; pour un contrôle COSUMAF.",
    fields: [{ name: "Filtres", what: "Par entité (offre, intention, dossier, référentiel, équipe…)." }],
  },
  {
    key: "equipe",
    path: "/desk/equipe",
    title: "Équipe",
    role: "responsable",
    purpose: "Donner et retirer l'accès desk, fixer le niveau (opérateur ou responsable), voir l'état du second facteur.",
    when: "À l'arrivée ou au départ d'un membre ; téléphone perdu.",
    fields: [
      { name: "Accès desk", what: "Nom, adresse, niveau, second facteur activé ou non." },
      { name: "Donner l'accès", what: "L'adresse d'une personne qui s'est déjà connectée une fois au Guichet.", how: "À sa connexion suivante, elle active son application d'authentification." },
    ],
  },
  {
    key: "reporting",
    path: "/desk/reporting",
    title: "Reporting",
    role: "operateur",
    purpose: "Journal des ordres, activité par segment, documents et diffusion, registre des clients, positions en conservation — et le rapport d'activité PDF.",
    when: "Fin de mois ; à la demande du régulateur.",
    fields: [{ name: "Période", what: "Le mois ou l'intervalle du rapport." }],
  },
  {
    key: "sante",
    path: "/desk/sante",
    title: "Santé",
    role: "operateur",
    purpose: "Les derniers bulletins importés, les derniers messages, l'état des canaux (WhatsApp, e-mail, push) et des crons.",
    when: "Quand quelque chose ne part pas ou n'arrive pas.",
    fields: [{ name: "Crons", what: "Coupons 07 h 00 · point du matin 06 h 30 · suivi 07 h 15 · bulletin 18 h 30 (jours de bourse) · émetteurs lundi 06 h 00." }],
  },
];

export const TOUR: TourStop[] = [
  { path: "/desk", target: "nav", title: "Quatre groupes", text: "Opérations (le quotidien), Clients, Marché, Pilotage. Un compteur signale ce qui attend une action ; « Guide » ouvre ce mode d'emploi." },
  { path: "/desk", target: "kpis", title: "Les quatre chiffres du matin", text: "Prochaine clôture, prises fermes, appétits à convertir, intentions non traitées. L'objectif de la journée : zéro intention non traitée à la clôture." },
  { path: "/desk", target: "feed", title: "Flux en direct", text: "Chaque intention, message WhatsApp ou document apparaît ici à la seconde. Inutile de rafraîchir." },
  { path: "/desk", target: "intents", title: "Intentions reçues", text: "La barre filtre par état, ligne et texte. Cliquez sur une référence ou « Ouvrir » : l'intention s'ouvre avec le client à côté." },
  { path: "/desk/clients", target: "queue", title: "Dossiers clients", text: "Les dossiers soumis en premier. Rien n'est bloquant à la soumission : c'est ici que l'on complète et que l'on décide." },
  { path: "/desk/clients", target: "review", title: "La décision KYC", text: "Refuser, demander des compléments, enregistrer la revue, approuver et ouvrir le compte. Seule l'approbation exige l'attestation sanctions / PPE." },
  { path: "/desk/messages", target: "inbox", title: "Messages", text: "Une conversation par numéro ou adresse. Répondez ici ; WhatsApp accepte une réponse libre dans les 24 h suivant le dernier message du client." },
  { path: "/desk/marche", target: "import", title: "Le bulletin de la BVMAC", text: "Importé seul chaque soir de bourse par le cron. Les cours et les VL sont historisés, jamais écrasés ; les anomalies s'affichent en dessous." },
  { path: "/desk/actualites", target: "news-inbox", title: "Liens reçus", text: "La veille de nuit, un lien envoyé au robot WhatsApp depuis un téléphone du desk ou un e-mail déposent ici ce qui mérite un regard. « Préparer » ouvre le formulaire pré-rempli ; « Écarter » classe sans publier." },
  { path: "/desk/actualites", target: "news-form", title: "Deux lignes, jamais l'article", text: "Le titre reformulé pour le client, « Pourquoi ça compte » en deux lignes sans recommandation, les lignes et notions liées. Publier met le lien sur la page Actualités et sur les fiches concernées ; chaque version est journalisée." },
  { path: "/desk/actualites", target: "news-list", title: "Ce que voit le client", text: "Les publications, par état : à la une, publiée, brouillon, expirée, écartée. Côté client, la page Actualités montre la une dans son cadre doré puis le fil par jour ; chaque fiche de ligne, de société ou d'émetteur reprend ses actualités liées.", link: { href: "/actualites", label: "Voir la page Actualités" } },
  { path: "/desk/approbations", target: "window", title: "Fenêtre déléguée", text: "Ce qu'un opérateur publie seul. Hors bornes, la demande attend un responsable : quatre yeux sans goulot." },
  { path: "/desk/referentiel", target: "ref-tabs", title: "Ce que le client apprend", text: "Le glossaire et les huit leçons de ces onglets sont la page Info du client : les bulles « i » des fiches, les leçons de deux minutes, la recherche, le simulateur, et la page Aide. Corriger un terme ici le corrige partout, sans code.", link: { href: "/info", label: "Voir la page Info" }, image: "/guide/info-client.png" },
  { path: "/desk/equipe", target: "roles", title: "Deux niveaux", text: "Opérateur desk : le quotidien. Responsable : opérateur + approbations, fenêtre déléguée, équipe. Tout changement de niveau est journalisé." },
  { path: "/desk/docs", target: "docs-search", title: "La documentation", text: "Cinq pages en français et en anglais : comment l'application fonctionne, ce qu'elle coûte, comment aider un client, comment l'administrer, comment la maintenir. Un mot dans la recherche trouve chaque chapitre ; les filtres disent pour qui la page est écrite." },
  { path: "/desk/docs", target: "docs-aide", title: "Ce que lit le client", text: "La seule page publique : l'aide, des réponses sans procédure ni détail interne. Un test refuse tout mot interne dans une page publique ; tout le reste ne sort jamais du desk. Le support s'y réfère pour savoir ce que le client a déjà lu.", link: { href: "/info/aide", label: "Voir l'aide client" }, image: "/guide/aide-client.png" },
  { path: "/desk/docs/fonctionnement", target: "docs-tree", title: "Les pages, les chapitres", text: "À gauche, toutes les pages de la documentation ; sous la page ouverte, ses chapitres. Le lien du bas renvoie au guide des pages du desk, champ par champ." },
  { path: "/desk/docs/fonctionnement", target: "docs-page", title: "Une page se lit de haut en bas", text: "Un résumé, les publics visés, puis les chapitres : phrases courtes, tableaux, étapes numérotées. Le texte suit la langue choisie (FR · EN) ; il vit dans le code et change avec l'application." },
  { path: "/desk/docs/fonctionnement", target: "docs-outline", title: "Sur cette page", text: "Le plan de la page suit votre défilement. En dessous : la date à laquelle elle a été relue face à l'application et son responsable. Une page dont la date recule après un changement d'écran est une page à relire." },
  { path: "/desk/docs/notes", target: "notes-page", title: "Les notes de travail", text: "Ce que l'assistant garde entre ses sessions : l'état du projet, les décisions et leur raison, les conventions, les migrations appliquées, ce qui reste à faire. En anglais, lues depuis le dépôt (docs/notes) à chaque visite : un push les met à jour. Pour le quotidien, les autres pages ; pour comprendre pourquoi, celle-ci." },
];
