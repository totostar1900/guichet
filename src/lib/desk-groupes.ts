/**
 * LES GROUPES DU DESK, EN DONNÉE ET NON DANS UN COMPOSANT.
 *
 * La table vivait dans `DeskNav.tsx`, qui est un composant SERVEUR : il lit
 * les traductions avec `next/headers`. La colonne de gauche, elle, est un
 * composant client, et en important la table elle tirait DeskNav tout entier
 * dans le paquet du navigateur. La page a répondu 500, et le message était
 * exact : « You're importing a module that depends on next/headers ».
 *
 * Une donnée partagée entre le serveur et le client vit donc dans `lib`, où
 * elle ne traîne aucune dépendance derrière elle.
 */
export const DESK_GROUPS: { label: string; tabs: [string, string][] }[] = [
  {
    // Ce qui attend une décision aujourd'hui, et rien d'autre.
    label: "La journée",
    tabs: [
      ["/desk", "Carnet"],
      ["/desk/a-valider", "À valider"],
      ["/desk/approbations", "Approbations"],
      ["/desk/messages", "Messages"],
    ],
  },
  {
    /* Tout ce qui se fait POUR quelqu'un : son dossier, ce qu'il a reçu, ce
       qu'il doit, ce qu'on lui a émis. « Allocations et règlement » et
       « Encaissements » étaient rangés sous Opérations, « Droits de garde »
       sous Pilotage : trois moments du même client. */
    label: "Les clients",
    tabs: [
      ["/desk/clients", "Dossiers"],
      /* LES PAGES QUE LA BARRE N AVAIT PAS LA PLACE DE PORTER. Une barre a un
         budget de largeur, une colonne un budget de longueur : ces quatre-la
         existaient sans qu aucun onglet n y mene, et l on n y arrivait qu en
         tapant l adresse. Mesure le 19 octobre 2026. */
      ["/desk/clients/quantitatif", "Vue quantitative"],
      ["/desk/repertoire", "Répertoire"],
      ["/desk/resultats", "Allocations et règlement"],
      ["/desk/encaissements", "Encaissements"],
      /* Voisin d'Encaissements, et pas dedans : là, un émetteur doit une
         échéance annoncée et le défaut est le retard ; ici, un client vire
         quand il veut et le défaut est l'anonymat. */
      ["/desk/virements", "Virements reçus"],
      /* Le mandat se signe chez le client, il s'exécute ici : deux pages pour
         un sujet, parce qu'une autorisation qu'on donne et un travail qu'on
         fait n'ont ni le même lecteur ni le même geste. */
      ["/desk/prelevements", "Prélèvements"],
      ["/desk/rapprochement", "Rapprochement"],
      ["/desk/garde", "Droits de garde"],
      ["/desk/documents", "Documents"],
    ],
  },
  {
    /* La matière : ce que la maison lit du marché et en tire. Six onglets au
       lieu de douze, parce que publier n'est pas lire et qu'un miroir de
       l'application client n'est pas un outil du desk. */
    label: "Le marché",
    tabs: [
      ["/desk/marche", "Cotes & VL"],
      ["/desk/bulletins", "Bulletins"],
      ["/desk/adjudications", "Adjudications"],
      ["/desk/adjudications/tableau", "Résultats"],
      ["/desk/dette", "Dette des États"],
      /* Le stock, puis le FLUX qui le fabrique : les deux pages se lisent
         l'une après l'autre et se renvoient l'une à l'autre. Interne au
         desk — aucune route publique, et « Vue client » n'en porte rien. */
      ["/desk/budgets", "Budgets des États"],
      /* La BEAC publie ce que la cote ne dit pas : l encours officiel des six
         Tresors, ses courbes et le cout de leurs ressources. Page a part de
         « Dette des Etats », qui part de la cote BVMAC : deux sources, deux
         perimetres, et les melanger ferait un total sans date. */
      ["/desk/beac", "BEAC"],
      ["/desk/analyses", "Courbe des taux"],
      ["/desk/indice/apercu", "Indice"],
    ],
  },
  {
    // Écrire pour le dehors : la note trimestrielle, et ce qu'on relaie.
    label: "Publier",
    tabs: [
      ["/desk/indice", "Notes"],
      ["/desk/actualites", "Actualités"],
    ],
  },
  {
    /* Les mêmes pages que le client, rendues par les mêmes composants, en
       lecture. Ce ne sont pas des outils : c'est une vérification, « voir ce
       que le client voit », et elle mérite son propre coin plutôt que d'être
       mêlée aux cotes. */
    label: "Vue client",
    tabs: [
      ["/desk/titres", "Titres"],
      ["/desk/fonds", "Fonds"],
      ["/desk/societes", "Sociétés"],
      ["/desk/comparer", "Comparer"],
    ],
  },
  {
    /* Ce qui fait tourner la maison. Le banc d'essai WhatsApp arrive de
       « Marché », où il n'avait rien à faire entre les cotes et les
       adjudications : c'est un canal, pas un marché. */
    label: "La maison",
    tabs: [
      ["/desk/referentiel", "Référentiel"],
      ["/desk/referentiel/modeles", "Modèles"],
      ["/desk/referentiel/bareme", "Barème"],
      ["/desk/referentiel/registre", "Registre"],
      ["/desk/referentiel/souffrance", "Délai de souffrance"],
      ["/desk/referentiel/relances", "Rappels des procédures"],
      ["/desk/equipe", "Équipe"],
      ["/desk/journal", "Journal"],
      ["/desk/reporting", "Reporting"],
      ["/desk/sante", "Santé"],
      ["/desk/depot", "Dépôt"],
      ["/desk/robot", "Robot"],
      ["/desk/docs", "Documentation"],
      ["/desk/docs/notes", "Notes du lecteur"],
      ["/desk/guide", "Guide"],
    ],
  },
];
export const DESK_TABS: [string, string][] = DESK_GROUPS.flatMap((g) => g.tabs);

