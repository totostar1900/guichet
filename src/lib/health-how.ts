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
  boc: {
    label: "Dernier bulletin BVMAC",
    href: "/desk#aujourdhui",
    how: "Sous la tuile du bulletin : « relancer » relit la BVMAC ; si le site ne répond pas, « déposer le PDF » reçu par e-mail.",
    docs: { href: "/desk/docs/sources#bulletin", label: "Le bulletin, de la BVMAC à la fiche" },
  },
  lignes: {
    label: "Lignes publiées contre le bulletin",
    href: "/desk/sante#lignes",
    how: "Le tableau « Lignes et bulletin », plus bas sur cette page. Une sortie de cote dont l'échéance est passée se retire seule à la lecture du bulletin ; celles dont l'échéance est inconnue attendent un « Retirer ». Un cours ou un instrument qui diffère du bulletin est un défaut de lecture : relancer la lecture de la séance.",
    docs: { href: "/desk/docs/sources#bulletin", label: "Le bulletin, de la BVMAC à la fiche" },
  },
  relire: {
    label: "Bulletins à relire",
    href: "/desk/sante#relire",
    how: "Le tableau « Bulletins à relire », plus bas sur cette page : « Relire les plus anciens » reprend six séances depuis l'adresse d'origine du bulletin, « Relire » en fait une seule. À relancer après chaque correction du lecteur.",
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
    how: "Une VL quotidienne ou hebdomadaire vieille de plus de trois semaines : demander la VL à la société de gestion, la saisir sur le fonds, ou vérifier que le bulletin la publie encore.",
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
    how: "Un lien mort se retire ou se remplace ; un lien reçu depuis plus de sept jours se publie ou se rejette.",
    docs: { href: "/desk/docs/sources#sources", label: "D'où vient chaque information" },
  },
};
