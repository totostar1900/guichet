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
};
