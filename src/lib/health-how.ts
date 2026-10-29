/**
 * For each Santé point: where the desk goes to act, what to do there in one
 * line, and the documentation section that explains it. Client-safe (no
 * data access) so the « Depuis Santé » strip can read it on the target page.
 */
export interface HealthHow {
  label: string;
  href: string;
  how: string;
  docs?: { href: string; label: string };
}

export const HEALTH_HOW: Record<string, HealthHow> = {
  /* LE REPÈRE SE RÉPARE PAR UNE RELECTURE, PAS PAR UN RÉGLAGE. Son silence
     tient soit à la place — aucune séance comparable, et il n'y a rien à
     faire — soit à un communiqué relu dont le taux ou le prix n'a pas été
     saisi, et c'est la page des adjudications qui rouvre celui-là. Le détail
     du point dit laquelle des deux causes domine. */
  repere: {
    label: "Repère du marché sur les adjudications ouvertes",
    href: "/desk/adjudications",
    how: "Les séances relues, une par une : rouvrir celles dont le taux précompté ou le prix servi est vide et le saisir depuis le communiqué. Un silence qui ne tient à aucune séance incomplète est la place elle-même : aucune adjudication comparable sur ce Trésor et cette durée depuis deux ans, et le formulaire a raison de ne rien dire.",
  },
  depouillement: {
    label: "Séances closes sans résultat",
    href: "/desk/resultats",
    how: "La page des résultats, groupée par séance : le prix servi est proposé quand le dépouillement est au dépôt, il reste à le relire et à appliquer. Une séance sans communiqué attend le sien, et c'est la BEAC qui le publie.",
  },
  boc: {
    label: "Dernier bulletin BVMAC",
    href: "/desk#aujourdhui",
    how: "Sous la tuile du bulletin : « relancer » relit la BVMAC ; si le site ne répond pas, « déposer le PDF » reçu par e-mail.",
    docs: { href: "/desk/docs/sources#bulletin", label: "Le bulletin, de la BVMAC à la fiche" },
  },
  lignes: {
    label: "Lignes publiées contre le bulletin",
    // Santé détecte, le domicile répare : le tableau vit avec les lignes depuis le 6 octobre 2026.
    href: "/desk/marche#lignes",
    how: "Le tableau « Lignes et bulletin », sur la page Marché. Une sortie de cote dont l'échéance est passée se retire seule à la lecture du bulletin ; celles dont l'échéance est inconnue attendent un « Retirer ». Un cours ou un instrument qui diffère du bulletin est un défaut de lecture : relancer la lecture de la séance.",
    docs: { href: "/desk/docs/sources#bulletin", label: "Le bulletin, de la BVMAC à la fiche" },
  },
  relire: {
    label: "Bulletins à relire",
    // Même règle, et le nom du bouton avait déjà dérivé : il s'appelait encore
    // « Relire les plus anciens » ici, trois heures après avoir été renommé.
    href: "/desk/bulletins#relire",
    how: "Le tableau « Bulletins de la BVMAC à relire », sur la page Bulletins : « Relire 6 séances » reprend les six les moins récemment reprises depuis l'adresse d'origine, « Confier 60 séances au robot » envoie la suite au robot de lecture, et « Relire » sur une ligne en fait une seule. À relancer après chaque correction du lecteur.",
    docs: { href: "/desk/docs/sources#bulletin", label: "Le bulletin, de la BVMAC à la fiche" },
  },
  ingests: {
    label: "Ingestions à vérifier",
    href: "/desk/depot",
    how: "Ouvrir la séance en « à vérifier » ou « échec », comparer le PDF conservé au bulletin BVMAC, relancer la lecture depuis Aujourd'hui ou saisir les cours manquants dans Cotes & VL.",
    docs: { href: "/desk/docs/sources#depot", label: "Le dépôt de documents" },
  },
  prices: {
    label: "Lignes cotées sans cours à la dernière séance",
    href: "/desk/marche?filtre=sans-cours",
    how: "Une ligne sans cours à la dernière séance n'a pas traité ce jour-là, ou le bulletin l'a manquée : vérifier le bulletin ; si un cours existe, le saisir en secours (la fiche dira « cours saisi par le desk ») ; sinon attendre la prochaine séance.",
    docs: { href: "/desk/docs/sources#bulletin", label: "Le bulletin, de la BVMAC à la fiche" },
  },
  navs: {
    label: "VL en retard",
    href: "/desk/marche?filtre=vl-retard#opcvm",
    how: "Une VL quotidienne ou hebdomadaire vieille de plus de trois semaines : demander la VL à la société de gestion, la saisir sur le fonds, ou vérifier que le bulletin la publie encore. Figée depuis plus de trois mois, la première chose à écarter est un fonds en double sous deux orthographes.",
    docs: { href: "/desk/docs/sources#sources", label: "D'où vient chaque information" },
  },
  "fonds-doubles": {
    label: "Fonds connus sous deux clefs",
    href: "/desk/fonds",
    how: "La clef d'un fonds se fabrique de son nom : une orthographe différente dans un seul bulletin en crée un second, qui reste publié avec la VL de ce jour-là. Ouvrir les deux, vérifier que c'est bien le même fonds, puis demander la fusion : la série et la ligne publiée du jumeau sont à retirer.",
    docs: { href: "/desk/docs/sources#sources", label: "D'où vient chaque information" },
  },
  "fonds-rythme": {
    label: "Fréquence annoncée ≠ rythme réel",
    href: "/desk/fonds",
    how: "La fréquence vient de la section du bulletin où le fonds paraît, et cette section est un horizon de comparaison, pas une cadence de valorisation. Quand le rythme réel des VL la dément, c'est la promesse faite au client qu'il faut corriger, ou le fonds qui a changé de rythme.",
    docs: { href: "/desk/docs/sources#sources", label: "D'où vient chaque information" },
  },
  notify: {
    label: "Messages clients",
    href: "/desk/messages",
    how: "Un message en échec se renvoie depuis Messages ; si WhatsApp ou l'e-mail n'est pas configuré, les clés sont sur Vercel (OPERATIONS.md § 9).",
    docs: { href: "/desk/docs/relation#canaux", label: "Canaux et règles" },
  },
  terms: {
    label: "Obligations cotées sans échéancier exact",
    href: "/desk/referentiel?onglet=echeanciers&filtre=sans-echeancier",
    how: "Le prix se calcule sur l'année du bulletin tant que l'échéancier manque : sur la ligne orange, « Créer l'échéancier » avec la fiche signalétique BVMAC sous les yeux (date exacte, paiements par an, différé), enregistrer, puis « Publier ».",
    docs: { href: "/desk/docs/administration#referentiel", label: "Le référentiel" },
  },
  pricing: {
    label: "Lignes ouvertes sans prix du desk",
    href: "/desk?filtre=sans-prix#offres",
    how: "Une ligne ouverte aux intentions sans prix ni taux affiché : renseigner le prix ou le taux de précompte sur la ligne, ou la repasser en brouillon.",
    docs: { href: "/desk/docs/fonctionnement#vie-ligne", label: "La vie d'une ligne" },
  },
  index: {
    label: "Indice BVMAC et cours d'actions",
    href: "/desk/marche",
    how: "L'indice publié a bougé sans qu'aucun cours d'action ne change dans la lecture (ou l'inverse) : ouvrir le PDF conservé de la séance au Dépôt, comparer la page « Marché des actions » et le bloc de l'indice, relancer la lecture depuis Aujourd'hui ou saisir le cours manquant.",
    docs: { href: "/desk/docs/indice", label: "L'indice BVMAC" },
  },
  news: {
    label: "Actualités",
    href: "/desk/actualites",
    how: "Un lien mort se retire ou se remplace. Un lien reçu se publie, avec son titre réécrit pour le client et ses deux lignes de « pourquoi ça compte », ou se rejette : la file se vide chaque semaine, elle ne se laisse pas vieillir.",
    docs: { href: "/desk/docs/sources#sources", label: "D'où vient chaque information" },
  },
  virements: {
    label: "Virements reçus sans nom",
    href: "/desk/virements",
    how: "La file « En attente, sans nom », rangée par ancienneté. Quand le motif approche d'une référence à un caractère près, le client est proposé : il reste à l'appeler pour qu'il confirme, puis « Rattacher ». Si personne ne le reconnaît, « Restituer » avec son motif, et le virement de retour se fait en banque.",
    docs: { href: "/desk/docs/operations#especes", label: "Les espèces : provision, rémunération, soixante-douze heures" },
  },
  prelevements: {
    label: "Prélèvements remis sans nouvelle",
    href: "/desk/prelevements",
    how: "Le panneau « Remises en attente de sort », rangé par ancienneté. Un tirage remis depuis plus de dix jours sans encaissement ni rejet appelle la banque, pas le client : c'est elle qui sait si l'opération a été présentée. La réponse obtenue s'inscrit ici, « Encaissé » ou « Rejeté » avec sa cause, et la cause décide de la suite.",
    docs: { href: "/desk/docs/operations#especes", label: "Les espèces : provision, rémunération, soixante-douze heures" },
  },
  versements: {
    label: "Versements programmés non réglés",
    href: "/desk",
    how: "Le carnet, filtré sur les ordres confirmés : un versement programmé par virement attend l'argent du client, et celui dont la provision portait déjà le montant n'apparaît pas ici. Au-delà de cinq jours ouvrés, ce n'est plus un virement en route : appeler le client, ou lui proposer un mandat de prélèvement pour que le mois suivant se règle seul. Un ordre sans suite se clôt avec son motif.",
    docs: { href: "/desk/docs/operations#especes", label: "Les espèces : provision, rémunération, soixante-douze heures" },
  },
  tenue: {
    label: "Clients en défaut",
    href: "/desk/repertoire?cohorte=a_surveiller",
    how: "Un ordre servi et jamais réglé au-delà de cinq jours ouvrés : la maison a soumissionné au nom du client et porte le papier. Ouvrir sa fiche, lire ses manquements, appeler. Si rien ne vient, la mesure « prépaiement » le met en règle pour la suite sans rien lui retirer : il garde ses titres, son argent et son accès au desk. La tenue ne décide rien : elle met la liste dans l'ordre.",
    docs: { href: "/desk/docs/clientele#tenue", label: "La tenue : cinq manquements, trois exclusions" },
  },
  mesures: {
    label: "Mesures en cours",
    href: "/desk/repertoire",
    how: "Une mesure tombe d'elle-même à son terme, pour qu'aucun compte ne reste puni par oubli. L'inverse est l'autre oubli : la laisser tomber sans avoir regardé relâche un client dont rien n'a changé. Sept jours avant, ce point le dit. Ouvrir la fiche du client, lire sa tenue, et décider : reposer une mesure avec un nouveau terme, ou la laisser s'éteindre.",
    docs: { href: "/desk/docs/clientele#mesures", label: "Les mesures sur un compte" },
  },
  registre: {
    label: "Registre des gestes",
    href: "/desk/journal?registre=gestes",
    how: "Le scripteur avale ses erreurs, et c'est voulu : un journal ne doit jamais casser le geste qu'il note. Le revers est qu'il peut s'arrêter sans un bruit, et ce point est la contrepartie de ce silence. Des ordres arrivent et le registre reste vide : regarder les journaux du serveur, lignes « journal : ». Tant qu'il est tombé, la tenue et l'activité vieillissent sans le dire.",
    docs: { href: "/desk/docs/clientele#registre", label: "Ce qui est noté, et ce qui ne l'est pas" },
  },
  bareme: {
    label: "Barème de l'activité",
    href: "/desk/referentiel/bareme",
    how: "Un brouillon attend d'être publié. Les scores affichés restent ceux du barème en vigueur, ce qui est juste, mais un brouillon qui dort est une décision que personne n'a prise pendant que le desk croit l'avoir prise. Ouvrir l'écran, lire qui bouge, puis publier ou abandonner. Les cohortes commandent les envois : publier change qui reçoit les annonces de lignes.",
    docs: { href: "/desk/docs/clientele#activite", label: "L'activité et son barème" },
  },
  "registre-ecartes": {
    label: "Registre des personnes écartées",
    href: "/desk/clients",
    how: "Un dossier accroche une inscription du registre. Un COMPTE OUVERT passe devant un dossier en cours : le premier passe des ordres pendant qu on lit, le second attend une décision qu on n a pas prise. Ouvrir le dossier : le bandeau au-dessus de la décision nomme la personne, ce sur quoi elle a accroché et ce que la maison avait écrit ce jour-là. Une correspondance de pièce est presque sûrement la même personne ; une ressemblance de nom et de date de naissance peut être un homonyme. Sur un dossier en cours, le registre ne refuse pas : il faut écrire dans « Notes internes » ce qui écarte la correspondance avant de pouvoir approuver. Sur un compte déjà ouvert, l inscription ne suffit pas : posez la mesure qui convient, ou retirez l accès de la personne. Un brouillon au registre n écarte encore personne.",
    docs: { href: "/desk/docs/clientele#registre-ecartes", label: "Le registre des personnes écartées" },
  },
  "acces-orphelins": {
    label: "Accès sans personne déclarée",
    href: "/desk/clients",
    how: "Quelqu'un peut se connecter sur un compte dont le dossier ne le connaît plus : un ancien administrateur qui passe encore des ordres. Ce point devrait toujours valoir zéro, puisque retirer un signataire ferme son accès dans le même geste ; s'il monte, c'est que la règle a été contournée, ou qu'une reprise de données a laissé un accès derrière elle. Ouvrir le dossier du compte, fermer l'accès, puis chercher dans l'audit comment il a survécu.",
    docs: { href: "/desk/docs/comptes-a-plusieurs-mains#personnes", label: "Un seul donneur d'ordres, et les comptes à plusieurs mains" },
  },
  stockage: {
    label: "Stockage et plafond du plan",
    href: "/desk/docs/plateformes",
    how: "La maison est restée au plan gratuit de Supabase, décidé le 11 octobre 2026 : la base ne pèse rien, et la vraie échéance est le gigaoctet de stockage. Ce point compte les jours qui restent au rythme des trente derniers, et non un pourcentage, parce qu'un pourcentage ne dit pas s'il faut agir cette semaine. Orange à soixante jours : c'est le moment de décider. Rouge à vingt et un : prendre Pro, qui porte le plafond à huit gigaoctets, et changer PLAFOND_STOCKAGE dans le code, sinon le point continuera d'alerter sur l'ancien plafond. L'autre voie a été prise le 16 octobre 2026 : les 483 Mo de communiqués de la BEAC et de documents d'émetteurs sont sortis vers la bibliothèque partagée, où ils étaient déjà, et le dépôt est retombé de 653 à 13,8 Mo. Une pièce ne sort que si elle est inscrite à une place, que le fichier y est, qu'il pèse le même poids à l'octet près, et qu'elle a déjà été lue, le cron de nuit lisant ses octets depuis le dépôt.",
    docs: { href: "/desk/docs/plateformes", label: "Plateformes, services et coûts" },
  },
  schema: {
    label: "Schéma de la base contre les migrations du dépôt",
    /* Il n'y a pas de page pour réparer cela : la réparation est un geste
       d'exploitation, pas un bouton. On envoie donc où c'est expliqué. */
    href: "/desk/docs/technique",
    how: "Une migration du dépôt n'est pas appliquée à la base. Les passer DANS L'ORDRE, à la main, depuis l'éditeur SQL de Supabase ou la ligne de commande, puis recharger cette page : le point redevient vert de lui-même. Le détail nomme ce qui manque — une table, une colonne, un index, une valeur d'énumération — ce qui suffit à retrouver le fichier dans supabase/migrations. Ce point est né le 27 octobre 2026, après quatre jours pendant lesquels sept migrations sont restées non appliquées sous du code déjà déployé : le robot des relances criait dans les journaux de Vercel, et ceux de l'arbitrage et du sondage ne criaient pas du tout — ils levaient au premier appel, et cette page les montrait en bonne santé puisqu'ils avaient bien tourné. Il se tait quand il n'a pas pu regarder, ce qui est le cas en développement, où le dépôt est en mémoire et n'a pas de schéma.",
    docs: { href: "/desk/docs/technique", label: "La base, les migrations et le déploiement" },
  },
  "quatre-yeux": {
    label: "Gestes passés sans second regard",
    href: "/desk/approbations",
    how: "Un geste sensible attend une seconde personne : celle qui propose ne peut pas approuver, quel que soit son rôle. Quand la maison n'a qu'un seul responsable, le contrôle est impossible et le geste passe en le disant : c'est ce qui se compte ici. Un chiffre qui monte appelle une décision d'effectif, pas un réglage : nommer un second responsable dans Référentiel › Personnel, ou accepter que ces gestes-là restent à une paire d'yeux.",
    docs: { href: "/desk/docs/administration#approbations", label: "Les approbations : qui propose, qui écrit" },
  },
  "echeance-adjudications": {
    label: "Adjudications sans date d'échéance",
    href: "/desk/adjudications",
    how: "L'échéance est imprimée sur le communiqué, à côté du code d'émission : une séance sans elle a été lue à moitié. Ce n'est pas un détail de confort, c'est ce qui rend la séance utilisable : sans échéance, ni le mur des échéances, ni le taux de rollover, ni le besoin de financement net ne se calculent, et un ratio bâti sur un corpus troué est faussement précis. Ouvrir les séances concernées, relire la pièce, compléter le champ.",
    docs: { href: "/desk/docs/sources#sources", label: "D'où vient chaque donnée" },
  },
  /* LES CINQ SÉRIES. Un robot dit « j'ai tourné », une série dit « j'ai reçu »,
     et la réparation n'est pas la même : relancer un robot ne répare pas une
     écriture cassée, et rien ne répare une source qui ne publie pas. */
  "serie-encours": {
    label: "Encours des titres de dette",
    href: "/desk/bulletins#relire",
    how: "L'encours est lu dans la table du bulletin, à chaque séance. S'il n'arrive plus alors que le bulletin est ingéré, ce n'est pas l'ordonnanceur qu'il faut relancer : c'est que la lecture géométrique de cette table refuse toutes ses rangées, et une relecture de la séance le montrera dans ses remarques. Vérifier d'abord que la section « ENCOURS DES TITRES DE DETTE » existe encore dans le PDF : la bourse change ses gabarits sans prévenir.",
    docs: { href: "/desk/docs/sources#bulletin", label: "Le bulletin, de la BVMAC à la fiche" },
  },
  "serie-cotations": {
    label: "Cotations de la cote",
    href: "/desk#aujourdhui",
    how: "Les cours arrivent avec le bulletin. Si la série se tait alors que le bulletin est ingéré, le lecteur ne reconnaît plus les rangées de cours : regarder les remarques de la dernière séance avant de toucher à quoi que ce soit.",
    docs: { href: "/desk/docs/sources#bulletin", label: "Le bulletin, de la BVMAC à la fiche" },
  },
  "serie-calendrier-beac": {
    label: "Journal du calendrier BEAC",
    href: "/desk/adjudications",
    how: "Ce journal n'écrit QUE ce qui change : une semaine calme n'écrit rien, et c'est normal. Un silence long veut donc dire que la page d'annonces de la BEAC ne bouge plus, ce qui est une information de marché avant d'être une panne. Ouvrir la page de la BEAC et comparer : si elle porte des documents que nous n'avons pas, la lecture est cassée ; si elle est identique, c'est la place qui s'est tue.",
    docs: { href: "/desk/docs/sources#sources", label: "D'où vient chaque donnée" },
  },
  "serie-adjudications": {
    label: "Résultats d'adjudication",
    href: "/desk/adjudications",
    how: "Six Trésors émettent sur ce marché, et les résultats suivent la séance de quelques jours. Trois semaines sans un seul résultat sur toute la zone n'est pas une accalmie : soit la BEAC a cessé de publier, soit elle a déplacé sa page. Vérifier à la source avant de conclure, et noter la date du dernier document : c'est elle qui date l'événement, pas la date de notre lecture.",
    docs: { href: "/desk/docs/sources#sources", label: "D'où vient chaque donnée" },
  },
  "serie-avis-emission": {
    label: "Avis d'émission",
    href: "/desk/bulletins#relire",
    how: "Un avis paraît avec chaque émission nouvelle, et c'est lui qui porte le coupon, le nominal et le mode de remboursement. Quelques-uns par trimestre : deux mois de silence restent plausibles. Au-delà, vérifier qu'un second document accompagne encore le bulletin de séance.",
    docs: { href: "/desk/docs/sources#bulletin", label: "Le bulletin, de la BVMAC à la fiche" },
  },
};
