/**
 * LA BIBLIOTHÈQUE PARTAGÉE : OÙ VIVENT LES PIÈCES, ET COMMENT ON Y RENVOIE.
 *
 * Règle de la maison, arrêtée le 14 octobre 2026 : **les documents physiques
 * sont conservés dans la bibliothèque, et le desk n'en garde que le lien.**
 * Le dépôt Supabase cessait d'être une archive pour devenir une seconde copie
 * que personne ne regardait, et il coûtait son plafond : 1 589 Mo pour un plan
 * à 1 Go, dont 1 099 pour les seuls bulletins.
 *
 * CE QUI REND CECI POSSIBLE SANS MICROSOFT GRAPH, et c'est tout l'intérêt : la
 * bibliothèque est un SITE D'ÉQUIPE SharePoint synchronisé, pas un dossier
 * local. Chaque fichier y a donc déjà une adresse web déterministe, qui se
 * construit à partir de son chemin relatif. Aucune inscription d'application,
 * aucun consentement d'administrateur, aucun secret de plus à faire tourner.
 *
 *   C:\Users\…\PURPOSE CAPITAL\PurpCapSharedLib - Guichet\…
 *   https://purposecapital475.sharepoint.com/sites/PurpCapSahredLib/Guichet/…
 *
 * ON GARDE LE CHEMIN RELATIF, JAMAIS L'ADRESSE ENTIÈRE. Une adresse entière
 * écrite dans mille huit cents lignes fige le nom du locataire, du site et de
 * la bibliothèque : le jour où l'un des trois change, tout casse d'un coup et
 * sans bruit. Le chemin, lui, est ce que la maison voit dans son explorateur.
 *
 * CE QUE CE CHOIX COÛTE, ET IL FAUT LE DIRE : le lien s'ouvre pour qui a un
 * compte Microsoft 365 de la maison. C'est le bon périmètre pour le desk, ce
 * ne l'est pas pour un client. Les pièces des clients et leur courrier restent
 * donc au dépôt, où l'accès se contrôle ligne par ligne.
 *
 * Le nom du site porte une faute de frappe, « PurpCapSahredLib », qui est
 * celle de SharePoint : on la recopie telle quelle parce qu'une adresse ne se
 * corrige pas, elle se suit.
 */

/** La racine web de la bibliothèque, sans barre finale. */
export const BIBLIOTHEQUE_WEB =
  process.env.BIBLIOTHEQUE_WEB ?? "https://purposecapital475.sharepoint.com/sites/PurpCapSahredLib/Guichet";

/**
 * Le dossier synchronisé, pour les outils qui tournent sur une machine de la
 * maison. Vide en production : Vercel n'a pas de disque, et c'est voulu.
 */
export const BIBLIOTHEQUE_DISQUE = process.env.BIBLIOTHEQUE_DISQUE;

/**
 * L'adresse d'une pièce, depuis son chemin dans la bibliothèque.
 *
 * Chaque segment est encodé séparément : `encodeURIComponent` sur le chemin
 * entier mangerait les barres obliques et rendrait une adresse plate, et
 * `encodeURI` laisserait passer un `#`, qu'un titre de communiqué porte
 * parfois et qui coupe l'adresse en deux sans prévenir.
 */
export function lienBibliotheque(chemin: string): string {
  const propre = chemin.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${BIBLIOTHEQUE_WEB}/${propre.split("/").map(encodeURIComponent).join("/")}`;
}

/** Le chemin sur le disque synchronisé, quand il y en a un. */
export function cheminSurDisque(chemin: string): string | undefined {
  if (!BIBLIOTHEQUE_DISQUE) return undefined;
  return `${BIBLIOTHEQUE_DISQUE.replace(/[/\\]+$/, "")}/${chemin.replace(/\\/g, "/").replace(/^\/+/, "")}`;
}

/**
 * Où va chaque famille dans la bibliothèque.
 *
 * Écrit ici et nulle part ailleurs : deux scripts qui rangent au même endroit
 * par deux chemins différents finissent par ranger à deux endroits.
 */
export const DOSSIERS = {
  bulletins: "1. Donnees de marche/2. BVMAC - Bulletin officiel de la cote",
  beacResultats: "1. Donnees de marche/1. BEAC - Marche des titres publics/Adjudications - resultats",
  beacAnnonces: "1. Donnees de marche/1. BEAC - Marche des titres publics/Adjudications - annonces",
  beacCalendriers: "1. Donnees de marche/1. BEAC - Marche des titres publics/Calendriers indicatifs",
  beacTableaux: "1. Donnees de marche/1. BEAC - Marche des titres publics/Tableaux de bord hebdomadaires",
  beacAutres: "1. Donnees de marche/1. BEAC - Marche des titres publics/Autres communiques",
  emetteurs: "1. Donnees de marche/3. Emetteurs - fiches et prospectus",
} as const;

/**
 * LES RÈGLES DE NOMMAGE VIVENT ICI, ET NULLE PART AILLEURS.
 *
 * Trois outils rangeaient déjà dans la bibliothèque, chacun avec sa copie de
 * la règle. C'est exactement la faute que `storage.ts` signale à propos de la
 * clef de dépôt : « une copie libre a envoyé dix-sept avis de Guinée
 * équatoriale sous une clef illisible ». Deux scripts qui rangent au même
 * endroit par deux chemins différents finissent par ranger à deux endroits.
 *
 * Le nom est celui qu'un humain cherche dans un explorateur : « BOC 1788 du
 * 2023-03-08.pdf » et non « boc/BOC-20230308.pdf ».
 */
export const nomDeFichier = (s: string | undefined | null, coupe = 110): string =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, coupe);

/** Le chemin d'un bulletin, qui est la seule règle de nommage qui compte. */
export const cheminDuBulletin = (seance: string, numero?: number | null): string =>
  `${DOSSIERS.bulletins}/${seance.slice(0, 4)}/BOC ${numero ?? "sans numero"} du ${seance}.pdf`;

const PAYS_DOSSIER: Record<string, string> = {
  Cameroun: "Cameroun",
  Gabon: "Gabon",
  Congo: "Congo",
  Tchad: "Tchad",
  "Guinée éq.": "Guinee equatoriale",
  "Guinée équatoriale": "Guinee equatoriale",
  RCA: "RCA",
};

/** Une observation du journal BEAC, réduite à ce qui décide de sa place. */
export interface PieceBeac {
  titre?: string | null;
  genre?: string | null;
  pays?: string | null;
  instrument?: string | null;
  tenor?: string | null;
  seance?: string | null;
}

/** Le chemin d'une pièce de la BEAC, telle que `ramasser-beac` la range. */
export function cheminBeac(o: PieceBeac): string {
  const an = (o.seance ?? "").slice(0, 4) || (o.titre?.match(/\b(20\d{2})\b/) ?? [])[1] || "sans date";
  const pays = (o.pays && PAYS_DOSSIER[o.pays]) || "Zone";
  if (o.genre === "calendrier") return `${DOSSIERS.beacCalendriers}/${pays}/${an} ${nomDeFichier(o.titre)}.pdf`;
  if (o.genre === "annonce" || o.genre === "resultats") {
    const racine = o.genre === "annonce" ? DOSSIERS.beacAnnonces : DOSSIERS.beacResultats;
    const quoi = [o.instrument, o.tenor].filter(Boolean).join(" ");
    return `${racine}/${pays}/${an}/${`${o.seance ?? an} ${nomDeFichier(quoi)} - ${o.genre}.pdf`.replace(/\s+/g, " ")}`;
  }
  /**
   * LE TABLEAU DE BORD HEBDOMADAIRE A SON DOSSIER, ET CE N'EST PAS UN RANGEMENT
   * DE CONFORT.
   *
   * Ces 81 pièces portent le livre des mouvements du marché des titres publics
   * des six Trésors, et elles dormaient noyées parmi 355 « autres communiqués »
   * parce que leur genre, dans le journal de la BEAC, n'est pas reconnu. Les
   * sortir de là est ce qui les a rendues visibles.
   *
   * LA RÈGLE VIT ICI PARCE QUE LE RAMASSEUR ET LE LECTEUR DOIVENT S'ACCORDER.
   * Si le lecteur déplaçait les pièces de son côté, le ramasseur ne les
   * trouverait plus à l'endroit qu'il calcule, conclurait qu'elles manquent, et
   * retéléchargerait quatre-vingt-une pièces à chacun de ses passages.
   */
  if (/tableau\s+(de\s+bord|hebdomadaire)/i.test(o.titre ?? "")) {
    return `${DOSSIERS.beacTableaux}/${an}/${nomDeFichier(o.titre)}.pdf`;
  }
  return `${DOSSIERS.beacAutres}/${an}/${nomDeFichier(o.titre)}.pdf`;
}

/** Le chemin d'une pièce d'émetteur : l'année sépare deux fiches homonymes. */
export function cheminEmetteur(d: { mnemo?: string | null; year?: number | null; title?: string | null }, defaut: string): string {
  const qui = nomDeFichier(d.mnemo ?? "Inconnu");
  const nom = nomDeFichier([d.year, d.title].filter(Boolean).join(" ")) || defaut;
  return `${DOSSIERS.emetteurs}/${qui}/${nom.toLowerCase().endsWith(".pdf") ? nom : `${nom}.pdf`}`;
}
