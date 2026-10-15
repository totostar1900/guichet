/**
 * LE LOT DE RÉFÉRENCE DU JOURNAL BEAC, ET POURQUOI IL EST PARTAGÉ.
 *
 * UNE MARQUE DE COLLISION DÉPEND DE L'ENSEMBLE QU'ON LUI DONNE. Deux pièces de
 * même titre se partagent un chemin : la première garde le nom nu, la seconde
 * prend six signes de son empreinte. Si un script charge 1 377 lignes et un
 * autre 1 347, la seconde pièce porte une marque chez l'un et pas chez l'autre,
 * et les deux cherchent le même document à deux endroits.
 *
 * Mesuré le 2026-10-15 : le rangeur a déplacé 82 pièces, et l'audit en a
 * déclaré 16 absentes qui étaient là, parce que l'audit filtrait sur `present`
 * et pas le rangeur. AUCUN DES DEUX N'AVAIT TORT : ils n'avaient pas le même
 * ensemble.
 *
 * Le lot de référence est donc défini UNE FOIS : toutes les lignes du journal,
 * une par adresse, quel que soit leur état. Une pièce retirée du site garde sa
 * place dans la bibliothèque, et c'est précisément ce qu'on veut d'une archive.
 */

/** Toutes les lignes d'une table, par pages de mille. */
export async function tout(sb, table, colonnes) {
  const out = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from(table).select(colonnes).range(de, de + 999);
    if (error) throw new Error(`${table} : ${error.message}`);
    out.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  return out;
}

/** Le lot de référence : une pièce par adresse, dans un ordre stable. */
export async function lotDuJournal(sb) {
  const obs = await tout(sb, "beac_observations", "url, titre, genre, pays, instrument, tenor, seance, present, vu_le");
  const vus = new Map();
  for (const o of obs) {
    const avant = vus.get(o.url);
    /* Deux observations de la même adresse : la plus récente dit ce qu'elle est. */
    if (!avant || String(o.vu_le ?? "") > String(avant.vu_le ?? "")) vus.set(o.url, o);
  }
  return [...vus.values()].sort((a, b) => a.url.localeCompare(b.url));
}
