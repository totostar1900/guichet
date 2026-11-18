import { SECTIONS_INVESTIR } from "../nav-ruban";

/**
 * LA DERNIÈRE SECTION D'INVESTIR VUE (18 novembre 2026, planche « Le balayage », 2A) : en arrivant dans Investir par un balayage, on retrouve Titres, Fonds ou Adjudications, selon la dernière ouverte.
 * Une préférence de ce téléphone, rien de plus : elle vit dans le navigateur, et son absence (navigation privée, stockage refusé) revient à Titres.
 */
const CLE = "guichet:investir";

export function lireDerniereSection(): string | undefined {
  try {
    const v = window.localStorage.getItem(CLE);
    return v && (SECTIONS_INVESTIR as readonly string[]).includes(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

export function noterDerniereSection(chemin: string): void {
  const c = chemin.split("?")[0].replace(/(.)\/$/, "$1");
  if (!(SECTIONS_INVESTIR as readonly string[]).includes(c)) return;
  try {
    window.localStorage.setItem(CLE, c);
  } catch {
    /* stockage refusé : on retombe sur Titres */
  }
}
