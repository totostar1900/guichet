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
export interface Famille {
  /** La lettre portée par la pastille. */
  code: string;
  /** Une anomalie compte double : elle dit que la séance manque de matière. */
  genre: "anomalie" | "avertissement";
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
  { code: "A", genre: "avertissement", libelle: "Indice BVMAC introuvable", quoiFaire: "Rien avant le 12/12/2023 : l'indice n'était pas publié.", motif: /^Indice BVMAC/ },
  { code: "B", genre: "avertissement", libelle: "Section OPCVM introuvable", quoiFaire: "Rien avant le 04/08/2023 : la table n'existait pas.", motif: /^Section OPCVM introuvable/ },
  { code: "C", genre: "anomalie", libelle: "Table OPCVM sous le plancher", quoiFaire: "Rien avant le 04/08/2023 ; après, la table est vraiment courte.", motif: /^Seulement .* OPCVM(?!.*contre)/ },
  { code: "D", genre: "anomalie", libelle: "Table OPCVM plus courte que la veille", quoiFaire: "Comparer à la séance précédente : un fonds a disparu ou la table est coupée.", motif: /^Seulement .* OPCVM.*contre/ },
  { code: "E", genre: "anomalie", libelle: "Section obligations incomplète", quoiFaire: "Presque toujours accompagné de H : des lignes n'ont pas été reconnues.", motif: /^Seulement .* obligation/ },
  { code: "F", genre: "anomalie", libelle: "Section actions incomplète", quoiFaire: "Grave : l'indice se calcule sur les actions.", motif: /^Seulement .* action/ },
  { code: "G", genre: "anomalie", libelle: "Lignes disparues depuis la veille", quoiFaire: "Comparer les deux cotes : une ligne qui revient plus tard n'est pas sortie.", motif: /^Lignes présentes au bulletin précédent/ },
  { code: "H", genre: "avertissement", libelle: "Obligation : ligne de cours non reconnue", quoiFaire: "Le défaut le plus fréquent. La ligne dense du PDF ne correspond à aucun motif connu.", motif: /^Obligation.*ligne de cours non reconnue/ },
  { code: "I", genre: "avertissement", libelle: "Obligation : prix et nominal collés", quoiFaire: "Deux nombres accolés sans séparateur : le découpage est ambigu, la ligne est écartée.", motif: /^Obligation.*prix \/ nominal ambigus/ },
  { code: "J", genre: "avertissement", libelle: "Action : ligne dense non reconnue", quoiFaire: "Même défaut que H, côté actions. Rare et coûteux.", motif: /^Action.*ligne dense non reconnue/ },
  { code: "K", genre: "anomalie", libelle: "Cours de clôture nul ou illisible", quoiFaire: "La ligne est lue mais son cours ne l'est pas : elle entre à zéro ou pas du tout.", motif: /cours de clôture nul ou illisible/ },
  { code: "L", genre: "avertissement", libelle: "OPCVM : valeur liquidative invraisemblable", quoiFaire: "Date ou montant hors de tout : la VL est ignorée plutôt que fausse.", motif: /^OPCVM.*VL du.*ignorée/ },
  { code: "M", genre: "avertissement", libelle: "OPCVM : ligne au format inattendu", quoiFaire: "Une ligne de la table n'a pas la forme attendue et passe à la trappe.", motif: /^OPCVM : ligne ignorée/ },
  { code: "N", genre: "anomalie", libelle: "Fonds : saut de valeur au-delà du seuil", quoiFaire: "La VL bondit : erreur de lecture, ou vrai mouvement à confirmer.", motif: /^FCP .*précédente \(>/ },
  { code: "O", genre: "avertissement", libelle: "Capitalisation : cellules incomplètes", quoiFaire: "La page de capitalisation est là, mais une ligne manque de chiffres.", motif: /^Capitalisation.*cellules incomplètes/ },
  { code: "P", genre: "avertissement", libelle: "Capitalisation présente mais illisible", quoiFaire: "La section existe et ne rend aucune ligne.", motif: /^Section « Capitalisation/ },
  { code: "Q", genre: "anomalie", libelle: "Écart brutal avec le dernier cours", quoiFaire: "Plus de 15 % d'écart : défaut de lecture, ou vrai mouvement.", motif: /écart avec le dernier cours/ },
  /* DEUX ÉVÉNEMENTS, ET NON UN. Le lecteur signale un en-tête illisible et
     continue ; l'ingestion, elle, abandonne la séance entière. Les confondre
     sous une seule lettre mettait la même pastille sur « j'ai perdu le numéro »
     et sur « rien n'est entré ». Le cliquet contre la production l'a vu : la
     famille paraissait des deux côtés à la fois. */
  { code: "R", genre: "anomalie", libelle: "En-tête non reconnu : rien n'est entré", quoiFaire: "La séance entière est perdue. À reprendre en premier.", motif: /^En-tête du bulletin non reconnu : / },
  { code: "S", genre: "avertissement", libelle: "En-tête illisible : numéro ou date", quoiFaire: "Le lecteur a continué sans le numéro ou la date du bulletin.", motif: /^En-tête du bulletin non reconnu \(/ },
  /* Prévue par le lecteur, jamais vue en production : sans elle, le jour où
     elle paraît, elle tombe au fourre-tout et fausse les comptes en silence. */
  { code: "T", genre: "avertissement", libelle: "Obligation : cellules incomplètes", quoiFaire: "La ligne est trouvée mais une de ses colonnes manque.", motif: /^Obligation.*cellules incomplètes/ },
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
