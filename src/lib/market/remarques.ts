import type { MarketBulletin } from "@/lib/domain/market";

/**
 * CE QUE LE LECTEUR A DIT, RANGÉ PAR FAMILLE ET PORTÉ PAR UNE LETTRE.
 *
 * Le bulletin sort du lecteur avec deux listes de phrases, `anomalies` et
 * `warnings`. Sur les 808 séances lues, elles font 1 362 phrases, et la page
 * n'en montrait que la première, tronquée à quatre-vingt-dix caractères. On ne
 * pouvait donc ni compter, ni filtrer, ni comparer : seulement lire une phrase
 * au hasard et deviner le reste.
 *
 * Dix-huit familles couvrent les 1 362, vérifié : aucune ne tombe dans le
 * fourre-tout. C'est la condition pour que les codes soient honnêtes, et c'est
 * ce que le cliquet tient.
 *
 * TROIS FAMILLES NE SONT PAS DES DÉFAUTS DE LECTURE : A, B et C reprochent au
 * passé de ne pas être le présent. L'indice n'existe au bulletin que depuis le
 * 12 décembre 2023, la table des OPCVM depuis le 4 août 2023. Une séance qui
 * ne porte que ces codes ne s'améliorera jamais, quel que soit le lecteur, et
 * la distinguer évite de la relire indéfiniment.
 *
 * Module pur : il se lit du serveur comme du navigateur, et un test l'atteint
 * sans monter de base.
 */
/**
 * LE SORT DE LA DONNÉE : LE SECOND AXE, ET IL MANQUAIT.
 *
 * Une famille ne portait qu'un axe, la GRAVITÉ, « anomalie » ou
 * « avertissement ». Il en manquait un, perpendiculaire : CE QU'EST DEVENUE
 * LA DONNÉE. Les deux se confondaient, et cela coûtait deux fois.
 *
 * D'abord au desk. La famille N, « saut de valeur au-delà du seuil », était
 * rangée en anomalie, le cran qui dit « cette séance manque de matière ».
 * Or la valeur est lue, écrite en base, et simplement signalée : rien ne
 * manque. Le desk rouvrait une séance entière pour un fonds qui avait
 * bougé de 12 %.
 *
 * Ensuite au suivi. « Combien de notre base avons-nous retouché, et
 * combien la bourse ne nous a jamais donné » n'avait aucune réponse, parce
 * qu'aucun champ ne distinguait une valeur réparée d'une valeur refusée ni
 * d'une valeur jamais publiée. C'est pourtant la question qu'un régulateur,
 * un client ou le fournisseur de données posent en premier.
 *
 * SIX SORTS, ET ILS SE LISENT COMME UNE PHRASE :
 *
 *   corrigee     lue, réparée, ÉCRITE. Le message porte la valeur d'origine,
 *                et c'est la règle : toute retouche se défait.
 *   telle_quelle lue, écrite SANS retouche, mais signalée.
 *   ecartee      lue, jugée invraisemblable, NON écrite. Elle manque chez
 *                nous, et c'est notre décision.
 *   perdue       présente dans le document, le lecteur n'a pas su la lire.
 *                Elle manque chez nous, et c'est notre limite.
 *   absente      le document ne la contient pas. Elle manque partout, et
 *                ce n'est la faute de personne.
 *   sans_objet   rien ne manque : la remarque porte sur la forme ou sur le
 *                volume, pas sur une valeur.
 *
 * « Ignorée », « manquante » et « introuvable » se disaient pêle-mêle : elles
 * deviennent écartée, absente et perdue, et chacune répond à une question
 * différente. Nous avons refusé · la bourse n'a pas publié · nous n'avons pas
 * su lire.
 */
export type SortDeLaDonnee = "corrigee" | "telle_quelle" | "ecartee" | "perdue" | "absente" | "sans_objet";

export const SORT: Record<SortDeLaDonnee, { libelle: string; dit: string; ecrite: boolean }> = {
  corrigee: { libelle: "Corrigée et intégrée", dit: "Le lecteur a réparé la cellule et l'a écrite. La valeur d'origine figure dans le message.", ecrite: true },
  telle_quelle: { libelle: "Intégrée telle quelle", dit: "La valeur est écrite sans retouche. La remarque la signale, elle ne la retire pas.", ecrite: true },
  ecartee: { libelle: "Écartée", dit: "La valeur a été lue puis refusée : elle manque dans notre base, par notre décision.", ecrite: false },
  perdue: { libelle: "Non lue", dit: "La donnée est dans le document et le lecteur n'a pas su la lire : elle manque, par notre limite.", ecrite: false },
  absente: { libelle: "Absente du document", dit: "La bourse ne l'a pas publiée ce jour-là. Elle ne manque à personne en particulier.", ecrite: false },
  sans_objet: { libelle: "Sans objet", dit: "Aucune valeur en cause : la remarque porte sur la forme ou sur le volume.", ecrite: false },
};

export interface Famille {
  /** La lettre portée par la pastille. */
  code: string;
  /** Une anomalie compte double : elle dit que la séance manque de matière. */
  genre: "anomalie" | "avertissement";
  /** Ce qu'est devenue la donnée. Voir SortDeLaDonnee. */
  sort: SortDeLaDonnee;
  /** Ce que la famille désigne, en une ligne. */
  libelle: string;
  /** Ce qu'il faut en faire, quand il y a quelque chose à en faire. */
  quoiFaire: string;
  motif: RegExp;
}

/**
 * L'ordre des lettres suit la lecture d'un bulletin, du cadre vers le détail :
 * ce qui manque en entier, puis les sections courtes, puis les lignes.
 */
export const FAMILLES: Famille[] = [
  { code: "A", genre: "avertissement", sort: "absente", libelle: "Indice BVMAC introuvable", quoiFaire: "Rien avant le 12/12/2023 : l'indice n'était pas publié.", motif: /^Indice BVMAC/ },
  { code: "B", genre: "avertissement", sort: "absente", libelle: "Section OPCVM introuvable", quoiFaire: "Rien avant le 04/08/2023 : la table n'existait pas.", motif: /^Section OPCVM introuvable/ },
  { code: "C", genre: "anomalie", sort: "sans_objet", libelle: "Table OPCVM sous le plancher", quoiFaire: "Rien avant le 04/08/2023 ; après, la table est vraiment courte.", motif: /^Seulement .* OPCVM(?!.*contre)/ },
  { code: "D", genre: "anomalie", sort: "sans_objet", libelle: "Table OPCVM plus courte que la veille", quoiFaire: "Comparer à la séance précédente : un fonds a disparu ou la table est coupée.", motif: /^Seulement .* OPCVM.*contre/ },
  { code: "E", genre: "anomalie", sort: "sans_objet", libelle: "Section obligations incomplète", quoiFaire: "Presque toujours accompagné de H : des lignes n'ont pas été reconnues.", motif: /^Seulement .* obligation/ },
  { code: "F", genre: "anomalie", sort: "sans_objet", libelle: "Section actions incomplète", quoiFaire: "Grave : l'indice se calcule sur les actions.", motif: /^Seulement .* action/ },
  { code: "G", genre: "anomalie", sort: "sans_objet", libelle: "Lignes disparues depuis la veille", quoiFaire: "Comparer les deux cotes : une ligne qui revient plus tard n'est pas sortie.", motif: /^Lignes présentes au bulletin précédent/ },
  { code: "H", genre: "avertissement", sort: "perdue", libelle: "Obligation : ligne de cours non reconnue", quoiFaire: "Le défaut le plus fréquent. La ligne dense du PDF ne correspond à aucun motif connu.", motif: /^Obligation.*ligne de cours non reconnue/ },
  { code: "I", genre: "avertissement", sort: "perdue", libelle: "Obligation : prix et nominal collés", quoiFaire: "Deux nombres accolés sans séparateur : le découpage est ambigu, la ligne est écartée.", motif: /^Obligation.*prix \/ nominal ambigus/ },
  { code: "J", genre: "avertissement", sort: "perdue", libelle: "Action : ligne dense non reconnue", quoiFaire: "Même défaut que H, côté actions. Rare et coûteux.", motif: /^Action.*ligne dense non reconnue/ },
  { code: "K", genre: "anomalie", sort: "ecartee", libelle: "Cours de clôture nul ou illisible", quoiFaire: "La ligne est lue mais son cours ne l'est pas : elle entre à zéro ou pas du tout.", motif: /cours de clôture nul ou illisible/ },
  /* Y PASSE AVANT L, et l'ordre est le garde : le classement retient la
     PREMIÈRE famille qui reconnaît la phrase, et le motif de L attrape toute
     VL ignorée. Placée après, cette famille ne verrait jamais rien. */
  {
    code: "Y",
    genre: "avertissement",
    sort: "ecartee",
    libelle: "OPCVM : montant imprimé en date",
    quoiFaire:
      "Rien à reprendre chez nous : la cellule ne contient pas de date, elle contient un montant qu'un tableur a rendu en date. Le numéro de série est dans la phrase, et c'est lui qu'il faut montrer au fournisseur : « 10/01/1936 » ne désigne rien dans son fichier, « 13 159 » si. Mesuré sur les sept rangées de la base, le montant déduit tombe à moins d'un franc de la VL que la série du fonds porte par ailleurs, toujours en dessous : le rendu en date tronque les centimes.",
    motif: /^OPCVM .*: VL du \d{4}-\d{2}-\d{2} ignorée : cette cellule n'est pas une date/,
  },
  { code: "L", genre: "avertissement", sort: "ecartee", libelle: "OPCVM : valeur liquidative écartée", quoiFaire: "Le motif est nommé dans la phrase. Mesuré le 12 octobre 2026 sur 89 cas : 56 précédaient la création du fonds et se réparent seuls, 20 devançaient la séance, 6 étaient trop anciennes, zéro portait une valeur fautive.", motif: /^OPCVM.*VL du.*ignorée/ },
  { code: "M", genre: "avertissement", sort: "perdue", libelle: "OPCVM : ligne au format inattendu", quoiFaire: "Une ligne de la table n'a pas la forme attendue et passe à la trappe.", motif: /^OPCVM : ligne ignorée/ },
  { code: "N", genre: "avertissement", sort: "telle_quelle", libelle: "Fonds : saut de valeur au-delà du seuil", quoiFaire: "La VL bondit : erreur de lecture, ou vrai mouvement à confirmer.", motif: /^FCP .*précédente \(>/ },
  { code: "O", genre: "avertissement", sort: "perdue", libelle: "Capitalisation : cellules incomplètes", quoiFaire: "La page de capitalisation est là, mais une ligne manque de chiffres.", motif: /^Capitalisation.*cellules incomplètes/ },
  { code: "P", genre: "avertissement", sort: "perdue", libelle: "Capitalisation présente mais illisible", quoiFaire: "La section existe et ne rend aucune ligne.", motif: /^Section « Capitalisation/ },
  { code: "Q", genre: "avertissement", sort: "telle_quelle", libelle: "Écart brutal avec le dernier cours", quoiFaire: "Plus de 15 % d'écart : défaut de lecture, ou vrai mouvement.", motif: /écart avec le dernier cours/ },
  /* DEUX ÉVÉNEMENTS, ET NON UN. Le lecteur signale un en-tête illisible et
     continue ; l'ingestion, elle, abandonne la séance entière. Les confondre
     sous une seule lettre mettait la même pastille sur « j'ai perdu le numéro »
     et sur « rien n'est entré ». Le cliquet contre la production l'a vu : la
     famille paraissait des deux côtés à la fois. */
  /* DEUX PHRASES POUR UN SEUL DÉFAUT, et la seconde tombait dans le
     fourre-tout. « Lecture écartée faute d'en-tête » dit exactement la même
     chose que « En-tête du bulletin non reconnu », et elle est PIRE à lire :
     elle annonce que six actions et neuf obligations avaient pourtant été
     lues avant d'être jetées. Une séance entière perdue pour un en-tête. */
  { code: "R", genre: "anomalie", sort: "perdue", libelle: "En-tête non reconnu : rien n'est entré", quoiFaire: "La séance entière est perdue. À reprendre en premier : au 4 janvier 2023, six actions et neuf obligations avaient été correctement lues avant d'être jetées pour ce seul motif.", motif: /^(?:En-tête du bulletin non reconnu : |Lecture écartée faute d'en-tête)/ },
  { code: "S", genre: "avertissement", sort: "telle_quelle", libelle: "En-tête illisible : numéro ou date", quoiFaire: "Le lecteur a continué sans le numéro ou la date du bulletin.", motif: /^En-tête du bulletin non reconnu \(/ },
  /* Prévue par le lecteur, jamais vue en production : sans elle, le jour où
     elle paraît, elle tombe au fourre-tout et fausse les comptes en silence. */
  { code: "T", genre: "avertissement", sort: "perdue", libelle: "Obligation : cellules incomplètes", quoiFaire: "La ligne est trouvée mais une de ses colonnes manque.", motif: /^Obligation.*cellules incomplètes/ },
  /* La lecture géométrique est le dernier recours du lecteur. Quand elle non
     plus ne sait pas ouvrir le document, la séance reste au texte aplati et
     il faut le savoir : un recours qui renonce en silence ne vaut rien.
     Prévue par le lecteur, jamais vue en production. */
  { code: "U", genre: "anomalie", sort: "sans_objet", libelle: "Lecture géométrique impossible", quoiFaire: "Le document n'a pas pu être ouvert par la lecture de secours : la séance reste lue au texte seul.", motif: /^Lecture géométrique impossible/ },
  /* LIRE ET ENREGISTRER NE SONT PAS LE MÊME MOMENT, et les confondre a fait
     mentir un écran pendant des mois. Le 22 décembre 2023, le lecteur lit cinq
     actions sur six ; la base refuse une ligne dont un cours d'ouverture sort
     à vingt-et-un chiffres, l'écriture est tout-ou-rien, et les quatre bonnes
     tombent avec elle. La séance gardait alors « Seulement 0 action(s) lue(s) »,
     qui accuse la LECTURE, et le desk n'avait d'autre choix que de signer un
     motif faux sur le document. Ce qui est refusé doit se dire comme un refus
     d'écriture. */
  { code: "V", genre: "anomalie", sort: "ecartee", libelle: "Lu, mais refusé à l'enregistrement", quoiFaire: "Le lecteur a réussi : c'est la base qui refuse une valeur. Corriger la valeur ou la colonne, pas la lecture.", motif: /^Écriture refusée/ },
  /* UNE RÉPARATION N'EST PAS UNE REMARQUE, et celle-ci ne paraît jamais dans
     la file du desk : elle sort en note, et cette famille ne sert qu'à lui
     donner son nom et sa couleur dans le rapport. La nommer évite qu'elle
     s'affiche en « famille inconnue », ce qui ferait croire à un défaut là où
     le robot vient de se corriger tout seul. */
  { code: "W", genre: "avertissement", sort: "corrigee", libelle: "OPCVM : année de la VL corrigée", quoiFaire: "Rien à faire : la VL précédait la création du fonds, et l'année suivante résout tout. Un fonds qui revient souvent mérite un mot à la bourse.", motif: /^OPCVM .*: année de la VL corrigée/ },
  /* Comme la W : le robot s'est corrigé tout seul et le dit. La rangée portait
     un numéro de série Excel là où le bulletin imprime une date, et la
     variation imprimée sur la rangée a validé la conversion. Rien n'est perdu,
     mais rien n'est caché non plus. */
  { code: "X", genre: "avertissement", sort: "corrigee", libelle: "OPCVM : date au format Excel convertie", quoiFaire: "Rien à faire sur la séance : la variation imprimée a validé la date déduite. En revanche un fonds qui revient tous les mois mérite un mot à la bourse, car la cellule est mal typée à la source.", motif: /^OPCVM .*: date au format Excel convertie/ },
];

const PAR_CODE = new Map(FAMILLES.map((f) => [f.code, f]));
export const famille = (code: string): Famille | undefined => PAR_CODE.get(code);

/** Le fourre-tout. Il doit rester vide, et un cliquet le vérifie. */
export const INCONNU = "Z";

export const classer = (message: string): string => FAMILLES.find((f) => f.motif.test(message))?.code ?? INCONNU;

export interface Remarque {
  code: string;
  genre: "anomalie" | "avertissement";
  texte: string;
}

/** Les remarques d'un bulletin, anomalies d'abord, chacune portant sa lettre. */
export function remarques(b: Pick<MarketBulletin, "anomalies" | "warnings">): Remarque[] {
  return [
    ...(b.anomalies ?? []).map((texte) => ({ code: classer(texte), genre: "anomalie" as const, texte })),
    ...(b.warnings ?? []).map((texte) => ({ code: classer(texte), genre: "avertissement" as const, texte })),
  ];
}

/** Les lettres d'un bulletin, sans répétition, dans l'ordre de l'alphabet. */
export const codes = (b: Pick<MarketBulletin, "anomalies" | "warnings">): string[] => [...new Set(remarques(b).map((r) => r.code))].sort();

/** Combien de fois chaque lettre paraît : « H » peut peser une fois ou soixante. */
export function parCode(b: Pick<MarketBulletin, "anomalies" | "warnings">): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of remarques(b)) out[r.code] = (out[r.code] ?? 0) + 1;
  return out;
}

/**
 * LES TROIS CODES DE DATE, et pourquoi ils méritent leur propre notion.
 *
 * Une séance retenue par eux seuls ne gagnera jamais rien à être relue : on lui
 * reproche de ne pas contenir ce que la bourse ne publiait pas encore. Mesuré
 * le 6 octobre 2026 : 29 séances sur les 287 en attente sont dans ce cas, et
 * six passes de relecture dans la nuit ne leur ont rien fait gagner.
 */
export const CODES_DE_DATE = new Set(["A", "B", "C"]);

/** Elle attend une relecture : le lecteur l'a marquée, ou elle n'a aucun cours d'action. */
export const enAttente = (b: Pick<MarketBulletin, "status" | "counts">): boolean => b.status !== "ok" || !b.counts?.equities;

/** Retenue par les seuls codes de date : aucune relecture ne la libérera. */
export function jamaisReparable(b: Pick<MarketBulletin, "anomalies" | "warnings" | "status" | "counts">): boolean {
  const c = codes(b);
  return enAttente(b) && c.length > 0 && c.every((x) => CODES_DE_DATE.has(x));
}

/** Elle porte au moins un défaut que le lecteur peut encore corriger. */
export const reparable = (b: Pick<MarketBulletin, "anomalies" | "warnings" | "status" | "counts">): boolean =>
  enAttente(b) && codes(b).some((x) => !CODES_DE_DATE.has(x));

/**
 * LES VUES DU DÉPÔT : des préréglages, et non des tableaux séparés.
 *
 * « À reprendre » n'est pas une seconde table : c'est la même, filtrée et
 * remise dans l'ordre de la file. Les séparer mettait deux fois les mêmes
 * séances sur une page, ce qui est le défaut que l'audit du 6 octobre 2026 a
 * passé la journée à retirer d'ailleurs.
 *
 * Elles vivent ici, et non dans la page, pour deux raisons : « ce qui
 * attend », « ce qui est réparable » et « ce qui ne le sera jamais » sont des
 * notions du bulletin ; et leurs noms traversent t() sous forme de variable,
 * donc seuls un module de domaine et son cliquet peuvent les couvrir.
 */
export interface Vue {
  id: string;
  nom: string;
  ou: (b: MarketBulletin) => boolean;
  /** Une vue de travail : la file passe en tête, dans son ordre à elle. */
  file?: boolean;
  dit: string;
}

export const VUES: Vue[] = [
  { id: "tout", nom: "Tout le dépôt", ou: () => true, dit: "Les séances lues, la plus récente d'abord." },
  { id: "reprendre", nom: "À reprendre", ou: enAttente, file: true, dit: "La file de relecture, la moins récemment reprise en tête : c'est cet ordre qui empêche les mêmes de revenir sans fin." },
  { id: "reparable", nom: "Réparable", ou: reparable, file: true, dit: "Au moins un défaut que le lecteur peut encore corriger. C'est le vrai arriéré." },
  { id: "jamais", nom: "Jamais réparable", ou: jamaisReparable, dit: "Retenues par les seuls codes de date : elles réclament un indice ou une table OPCVM qui n'existaient pas encore. Aucune relecture ne les libérera." },
  { id: "sanscopie", nom: "Sans notre copie", ou: (b) => !b.fileKey, dit: "Le PDF n'existe que chez la bourse. Si elle réorganise ses dossiers, la séance devient irrelisable." },
];
