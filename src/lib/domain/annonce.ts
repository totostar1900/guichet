/**
 * L'ANNONCE DE LA MAISON : UNE PHRASE AU-DESSUS DES PAGES, UNE SEULE À LA FOIS (14 novembre 2026, planche 4A).
 *
 * C'est une information de la maison SUR la maison : une séance annoncée, une fermeture, un incident. Elle vient EN PLUS de « À la une » (les lignes que le desk met
 * en avant) et des actualités ; elle n'en remplace aucune. Elle vit dans la table « reference » (genre « annonce »), une ligne par annonce, que rien n'efface : une
 * annonce retirée garde son texte, sa date et la personne qui l'a retirée.
 */
export const REF_ANNONCE = "annonce";

export interface Annonce {
  id: string;
  texte: string;
  /** Dernier jour où elle s'affiche, AAAA-MM-JJ. */
  jusquAu: string;
  publieePar: string;
  publieeLe: string;
  retireeLe?: string;
  retireePar?: string;
  /** Pourquoi elle a été retirée : « remplacée » quand une nouvelle l'a relevée. */
  motifDeRetrait?: string;
}

export const ANNONCE_MIN = 8;
export const ANNONCE_MAX = 140;
/** Au-delà, une annonce n'en est plus une : elle durerait plus qu'une séance. */
export const ANNONCE_JOURS_MAX = 30;

/** Ce qu'une annonce ne dit pas : un conseil, une urgence fabriquée, une promesse (même règle que « À la une », plus l'urgence). */
const INTERDITS = /\b(meilleur|recommand|conseill|à saisir|profitez|garanti|sûr|opportunité en or|exceptionnel|dernière chance|ne manquez pas|vite|urgent)/i;

/** Le message d'une saisie refusée, ou rien quand elle est recevable. */
export function verifierAnnonce(texte: string, jusquAu: string, aujourdhui: string): string | undefined {
  const t = texte.trim();
  if (t.length < ANNONCE_MIN) return `Écrivez une phrase d'au moins ${ANNONCE_MIN} caractères.`;
  if (t.length > ANNONCE_MAX) return `Une annonce tient en ${ANNONCE_MAX} caractères au plus.`;
  if (INTERDITS.test(t)) return "Une annonce informe : ni conseil, ni promesse, ni urgence (« meilleur », « garanti », « dernière chance »…).";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jusquAu)) return "Date de fin requise.";
  if (jusquAu < aujourdhui) return "La date de fin est déjà passée.";
  const limite = new Date(`${aujourdhui}T12:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() + ANNONCE_JOURS_MAX);
  if (jusquAu > limite.toISOString().slice(0, 10)) return `Une annonce dure ${ANNONCE_JOURS_MAX} jours au plus.`;
  return undefined;
}

/** L'annonce qui s'affiche aujourd'hui : non retirée, non échue. Si deux le sont (ce que le desk ne produit pas), la plus récente. */
export function annonceEnCours(rows: Annonce[], aujourdhui: string): Annonce | undefined {
  return rows
    .filter((a) => !a.retireeLe && a.jusquAu >= aujourdhui)
    .sort((a, b) => b.publieeLe.localeCompare(a.publieeLe))[0];
}
