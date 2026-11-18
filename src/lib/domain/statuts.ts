import { PHRASE_INTERDITE } from "./annonce";
import type { Offer } from "./types";

/**
 * LES STATUTS (17 novembre 2026, décidé sur la planche « Accueil et insights », idée 1) : UNE RANGÉE DE RONDS, UNE LIGNE PAR ROND, CHOISIE PAR LE DESK.
 *
 * Le desk décide quelles lignes y passent et dans quel ordre ; la première page tire un message dans une base qu'il alimente (voir plus bas). Le client touche un rond : une première page (le message,
 * un fond de couleur), puis une page par ligne avec « Voir la fiche » et « Passer un ordre ». C'est une information de la maison : jamais un conseil, jamais une urgence.
 *
 * Ils vivent dans la table « reference » (genre « statut »), comme l'annonce : une ligne par ligne retenue. Rien ne s'efface : une ligne
 * retirée garde la date et la personne.
 */
export const REF_STATUT = "statut";
export const STATUTS_MAX = 8;
export const MESSAGE_MIN = 8;
export const MESSAGE_MAX = 160;

export interface StatutLigne {
  kind: "ligne";
  id: string;
  offerId: string;
  position: number;
  ajouteePar: string;
  ajouteeLe: string;
  retireeLe?: string;
  retireePar?: string;
}
export type StatutRow = StatutLigne;

export const idDeLigne = (offerId: string): string => `l-${offerId}`;

/** Les lignes retenues, non retirées, dans l'ordre du desk. */
export const lignesRetenues = (rows: StatutRow[]): StatutLigne[] =>
  rows
    .filter((r) => r.kind === "ligne" && !r.retireeLe)
    .sort((a, b) => a.position - b.position || a.ajouteeLe.localeCompare(b.ajouteeLe));

/**
 * Ce que le client voit : les lignes retenues QUI EXISTENT ENCORE parmi celles qu'il peut lire (publiées, non masquées). Une ligne retirée du catalogue sort de la
 * rangée sans que le desk ait rien à faire ; elle reste écrite, et le desk la voit « hors catalogue ».
 */
export function statutsAffiches(rows: StatutRow[], visibles: Offer[]): { ligne: StatutLigne; offre: Offer }[] {
  const parId = new Map(visibles.map((o) => [o.id, o]));
  return lignesRetenues(rows)
    .map((ligne) => ({ ligne, offre: parId.get(ligne.offerId) }))
    .filter((x): x is { ligne: StatutLigne; offre: Offer } => Boolean(x.offre))
    .slice(0, STATUTS_MAX);
}

/**
 * LES GROUPES DES STATUTS (18 novembre 2026, planche « Statuts et dynamisme », 1B) : « La maison » (le message tiré), puis une famille de lignes chacune. Un balayage de côté passe
 * au groupe suivant ; les nouveautés d'abord. « La cote » réunit les actions et les obligations cotées.
 */
export type GroupeDeStatut = "maison" | "tresor" | "fonds" | "cote";
export const GROUPES: { id: GroupeDeStatut; nom: string }[] = [
  { id: "maison", nom: "La maison" },
  { id: "tresor", nom: "Trésor" },
  { id: "fonds", nom: "Fonds" },
  { id: "cote", nom: "La cote" },
];
export const groupeDe = (kind: string): GroupeDeStatut => (kind === "BTA" || kind === "OTA" ? "tresor" : kind === "FONDS" ? "fonds" : "cote");
/** Combien de secondes dure une page avant la suivante. */
export const SECONDES_PAR_PAGE = 5;

/* ------------------------------------------------------------------ */
/* LES MESSAGES DE LA PREMIÈRE PAGE : UNE BASE QUE LE DESK ALIMENTE PAR UN TABLEAU EXCEL, TIRÉE AU HASARD (18 novembre 2026).
 *
 * Chaque ouverture des statuts tire un message dans la base, dans la langue du client (à défaut, dans toutes). Elle vit dans la table « reference » (genre « statut-message »), une ligne
 * par message. Tant que le desk n'a rien importé, la base est celle du code (ci-dessous) : le tableau qu'il télécharge la contient, et ce qu'il renvoie la REMPLACE. Un message
 * absent du tableau renvoyé est retiré, pas effacé : il garde la date et le nom de qui l'a retiré. */
export const REF_STATUT_MESSAGE = "statut-message";
export const MESSAGES_MAX = 500;
export type LangueDeMessage = "fr" | "en";

export interface MessageDeStatut {
  id: string;
  texte: string;
  langue: LangueDeMessage;
  ajouteePar: string;
  ajouteeLe: string;
  retireeLe?: string;
  retireePar?: string;
}

const FR = [
  "Mon capital a trouvé un sens.",
  "Purpose Capital : on donne du sens, pas des conseils au hasard.",
  "J'ai pas de plan B. J'ai un compte-titres.",
  "Mon argent fait du sport : il travaille.",
  "Ici, même l'épargne fait des heures sup'.",
  "Je ne dors pas à la banque. Mon argent non plus.",
  "Achète bas, vends haut, souris entre les deux.",
  "Plus-value > plus de soucis.",
  "BTA, OTA… et toi, t'attends quoi ?",
  "La tontine, c'est bien. La bourse, c'est le niveau d'après.",
  "Du ndolè dans l'assiette, des OTA dans le portefeuille.",
  "On n'est pas là pour regarder le marché, on est là pour le faire.",
  "Six pays, une bourse, zéro excuse.",
  "Je matche les acheteurs et les vendeurs. Pas sur Tinder.",
  "Courtier le jour, courtier la nuit (mais je dors bien).",
];
const EN = [
  "Invest with Purpose. Or don't. (But do.)",
  "My money found its purpose.",
  "On a mission. With Purpose.",
  "My savings have a job now.",
  "Buy low. Sell high. Stay chill.",
  "Idle money is a crime. (Not legally. Emotionally.)",
  "I don't have trust issues. I have trade confirmations.",
  "Bonds, not drama.",
  "Diversify your portfolio, not your excuses.",
  "Six countries. One market. Your move.",
  "Born in Yaoundé. Trading CEMAC-wide.",
  "Professional matchmaker: buyers ❤️ sellers.",
  "I speak fluent FCFA.",
];
const NUM = (n: number) => `m-${String(n).padStart(3, "0")}`;

/** La base de départ, celle du code : identifiants stables (m-001…), pour que le tableau téléchargé puis renvoyé retrouve ses messages. */
export const MESSAGES_PAR_DEFAUT: MessageDeStatut[] = [
  ...FR.map((texte, i): MessageDeStatut => ({ id: NUM(i + 1), texte, langue: "fr", ajouteePar: "maison", ajouteeLe: "2026-11-18T00:00:00.000Z" })),
  ...EN.map((texte, i): MessageDeStatut => ({ id: NUM(FR.length + i + 1), texte, langue: "en", ajouteePar: "maison", ajouteeLe: "2026-11-18T00:00:00.000Z" })),
];

/** Le texte d'un message refusé, ou rien quand il est recevable (même règle que l'annonce : ni conseil, ni promesse, ni urgence). */
export function verifierTexte(texte: string): string | undefined {
  const t = texte.trim();
  if (t.length < MESSAGE_MIN) return `moins de ${MESSAGE_MIN} caractères`;
  if (t.length > MESSAGE_MAX) return `plus de ${MESSAGE_MAX} caractères`;
  if (PHRASE_INTERDITE.test(t)) return "conseil, promesse ou urgence (« meilleur », « garanti », « dernière chance »…)";
  return undefined;
}

/** La base sur laquelle un import travaille : la table s'il y a eu un import, sinon la base du code (pour que les identifiants m-001… se retrouvent). */
export const baseCourante = (rows: MessageDeStatut[]): MessageDeStatut[] => (rows.length === 0 ? MESSAGES_PAR_DEFAUT : rows);

/** Les messages en jeu : ceux de la base courante, retirés exclus. Une table dont tout est retiré rend la base du code plutôt qu'une première page muette. */
export function messagesActifs(rows: MessageDeStatut[]): MessageDeStatut[] {
  const actifs = baseCourante(rows).filter((m) => !m.retireeLe).sort((a, b) => a.id.localeCompare(b.id));
  return actifs.length > 0 ? actifs : MESSAGES_PAR_DEFAUT;
}

/** Les messages à jouer pour un client : ceux de sa langue, ou tous quand sa langue n'en a aucun. */
export function messagesPourLaLangue(actifs: MessageDeStatut[], langue: string): MessageDeStatut[] {
  const les = actifs.filter((m) => m.langue === langue);
  return les.length > 0 ? les : actifs;
}

/** Une ligne lue dans le tableau envoyé par le desk. */
export interface LigneDeTableau {
  rang: number;
  id?: string;
  texte: string;
  langue?: string;
  actif?: string;
}

const OUI = /^(oui|o|yes|y|vrai|true|1|x)$/i;
const NON = /^(non|n|no|faux|false|0)$/i;
export function langueDe(brut: string | undefined): LangueDeMessage | undefined {
  const l = (brut ?? "").trim().toLowerCase();
  if (l === "") return "fr";
  if (/^(fr|français|francais|french)$/.test(l)) return "fr";
  if (/^(en|anglais|english)$/.test(l)) return "en";
  return undefined;
}

export interface PlanDImport {
  erreurs: string[];
  /** Ce qui s'écrit : les messages du tableau (nouveaux, modifiés ou inchangés) et ceux qui sortent. */
  ecrire: MessageDeStatut[];
  ajoutes: number;
  modifies: number;
  retires: number;
  actifs: number;
}

/**
 * Le tableau REMPLACE la base. Un message est retrouvé par son identifiant, à défaut par son texte exact ; une ligne « Actif = non » sort ; un message de la base qui n'est plus
 * dans le tableau sort aussi. Une seule erreur refuse tout le tableau : un import à moitié fait ferait croire au desk que sa base est celle de son fichier.
 */
export function planifierImport(avant: MessageDeStatut[], lignes: LigneDeTableau[], qui: string, maintenant: string, nouvelId: () => string): PlanDImport {
  const erreurs: string[] = [];
  const pleines = lignes.filter((l) => l.texte.trim() !== "" || (l.id ?? "").trim() !== "");
  if (pleines.length === 0) erreurs.push("Le tableau ne contient aucun message.");
  if (pleines.length > MESSAGES_MAX) erreurs.push(`Le tableau dépasse ${MESSAGES_MAX} messages.`);
  const parId = new Map(avant.map((m) => [m.id, m]));
  const parTexte = new Map(avant.map((m) => [m.texte, m]));
  const vus = new Set<string>();
  const dedans = new Map<string, MessageDeStatut>();
  for (const l of pleines) {
    const texte = l.texte.trim();
    const pb = verifierTexte(texte);
    if (pb) erreurs.push(`Ligne ${l.rang} : ${pb}.`);
    const langue = langueDe(l.langue);
    if (!langue) erreurs.push(`Ligne ${l.rang} : langue « ${l.langue} » inconnue (fr ou en).`);
    const actif = (l.actif ?? "").trim();
    if (actif !== "" && !OUI.test(actif) && !NON.test(actif)) erreurs.push(`Ligne ${l.rang} : « Actif » attend oui ou non.`);
    if (texte === "" || !langue) continue;
    if (vus.has(texte.toLowerCase())) {
      erreurs.push(`Ligne ${l.rang} : message en double.`);
      continue;
    }
    vus.add(texte.toLowerCase());
    if (NON.test(actif)) continue;
    const connu = (l.id && parId.get(l.id.trim())) || parTexte.get(texte);
    dedans.set(connu?.id ?? nouvelId(), { id: connu?.id ?? "", texte, langue, ajouteePar: connu?.ajouteePar ?? qui, ajouteeLe: connu?.ajouteeLe ?? maintenant });
  }
  const ecrire: MessageDeStatut[] = [];
  let ajoutes = 0;
  let modifies = 0;
  for (const [id, m] of dedans) {
    const ancien = parId.get(id);
    const ligne: MessageDeStatut = { ...m, id };
    if (!ancien) ajoutes++;
    else if (ancien.texte !== ligne.texte || ancien.langue !== ligne.langue || ancien.retireeLe) modifies++;
    ecrire.push(ligne);
  }
  let retires = 0;
  for (const m of avant) {
    if (dedans.has(m.id)) continue;
    if (m.retireeLe) continue;
    retires++;
    ecrire.push({ ...m, retireeLe: maintenant, retireePar: qui });
  }
  if (dedans.size === 0 && erreurs.length === 0) erreurs.push("Aucun message actif : la première page n'aurait rien à dire.");
  return { erreurs, ecrire, ajoutes, modifies, retires, actifs: dedans.size };
}
