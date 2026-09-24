import type { AuditEntry } from "@/lib/domain/types";

/**
 * L'intégrité de la chaîne d'audit, et pourquoi elle se vérifie à part.
 *
 * Chaque ligne porte l'empreinte de la précédente : retirer ou modifier une
 * ligne casse la suite, et c'est tout l'intérêt du procédé. Mais la suite n'a
 * de sens que sur la séquence entière. La page du journal vérifiait la liste
 * qu'elle affichait, filtre compris : dès qu'on cliquait « Intentions », les
 * lignes voisines à l'écran n'étaient plus voisines dans la chaîne, leurs
 * empreintes ne se répondaient pas, et la page annonçait « Chaîne rompue »
 * alors que rien n'avait bougé.
 *
 * Une fausse alerte sur un signal de ce genre est pire qu'un signal absent :
 * elle apprend au desk à ignorer la seule chose qui compterait vraiment si la
 * chaîne se cassait pour de bon. La vérification porte donc sur une tranche
 * non filtrée, et ce qu'on affiche n'a plus d'influence sur ce qu'on vérifie.
 */
export type ChainState = { state: "ok"; checked: number } | { state: "short"; checked: number } | { state: "broken"; checked: number; at: string; id: string };

/**
 * Les lignes doivent arriver du plus récent au plus ancien, sans filtre et
 * sans trou : c'est l'ordre que rend `listAudit`.
 *
 * Ne vaut que pour la tranche examinée. Une ligne touchée plus loin dans le
 * passé ne se voit pas d'ici, et le libellé le dit en donnant le nombre de
 * lignes vérifiées plutôt qu'en promettant le tout.
 */
export function chainState(rows: AuditEntry[]): ChainState {
  if (rows.length < 2) return { state: "short", checked: rows.length };
  for (let i = 0; i < rows.length - 1; i++) {
    if (rows[i].prevHash !== rows[i + 1].hash) return { state: "broken", checked: rows.length, at: rows[i].at, id: rows[i].id };
  }
  return { state: "ok", checked: rows.length };
}
