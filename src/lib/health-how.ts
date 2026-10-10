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
    how: "Un dossier en cours accroche une inscription du registre. Ouvrir le dossier : le bandeau au-dessus de la décision nomme la personne, ce sur quoi elle a accroché et ce que la maison avait écrit ce jour-là. Une correspondance de pièce est presque sûrement la même personne ; une ressemblance de nom et de date de naissance peut être un homonyme. Le registre ne refuse pas : il faut écrire dans « Notes internes » ce qui écarte la correspondance avant de pouvoir approuver, et cette phrase reste avec la décision. Un brouillon au registre n'écarte encore personne : il attend sa publication.",
    docs: { href: "/desk/docs/clientele#registre-ecartes", label: "Le registre des personnes écartées" },
  },
  "acces-orphelins": {
    label: "Accès sans personne déclarée",
    href: "/desk/clients",
    how: "Quelqu'un peut se connecter sur un compte dont le dossier ne le connaît plus : un ancien administrateur qui passe encore des ordres. Ce point devrait toujours valoir zéro, puisque retirer un signataire ferme son accès dans le même geste ; s'il monte, c'est que la règle a été contournée, ou qu'une reprise de données a laissé un accès derrière elle. Ouvrir le dossier du compte, fermer l'accès, puis chercher dans l'audit comment il a survécu.",
    docs: { href: "/desk/docs/comptes-a-plusieurs-mains#personnes", label: "Un seul donneur d'ordres, et les comptes à plusieurs mains" },
  },
  "quatre-yeux": {
    label: "Gestes passés sans second regard",
    href: "/desk/approbations",
    how: "Un geste sensible attend une seconde personne : celle qui propose ne peut pas approuver, quel que soit son rôle. Quand la maison n'a qu'un seul responsable, le contrôle est impossible et le geste passe en le disant : c'est ce qui se compte ici. Un chiffre qui monte appelle une décision d'effectif, pas un réglage : nommer un second responsable dans Référentiel › Personnel, ou accepter que ces gestes-là restent à une paire d'yeux.",
    docs: { href: "/desk/docs/administration#approbations", label: "Les approbations : qui propose, qui écrit" },
  },
};
