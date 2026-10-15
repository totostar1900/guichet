import fsSync from "node:fs";
import { createHash } from "node:crypto";

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

/**
 * Le lot de référence : une pièce par adresse, dans un ordre stable.
 *
 * Chaque ligne porte aussi `premierVu`, la date de la PREMIÈRE observation de
 * cette adresse. C'est elle qui décide, en cas de collision de noms, laquelle
 * garde le nom nu : l'ordre alphabétique est déterministe mais pas stable, et
 * un nouveau venu n'a jamais été vu avant celui qui est déjà rangé.
 */
export async function lotDuJournal(sb) {
  const obs = await tout(sb, "beac_observations", "url, titre, genre, pays, instrument, tenor, seance, abondement, present, empreinte, page, vu_le");
  const vus = new Map();
  const premiers = new Map();
  for (const o of obs) {
    const avant = vus.get(o.url);
    /* Deux observations de la même adresse : la plus récente dit ce qu'elle est. */
    if (!avant || String(o.vu_le ?? "") > String(avant.vu_le ?? "")) vus.set(o.url, o);
    const tot = premiers.get(o.url);
    if (!tot || String(o.vu_le ?? "") < tot) premiers.set(o.url, String(o.vu_le ?? ""));
  }
  for (const o of vus.values()) o.premierVu = premiers.get(o.url) ?? "";
  return [...vus.values()].sort((a, b) => a.url.localeCompare(b.url));
}

/** L'ancienneté d'une pièce du journal, telle que `marquesDeCollision` l'attend. */
export const ANCIENNETE = (p) => String(p.premierVu ?? "");

/** La clef de dépôt d'une pièce BEAC, telle que l'index la connaît. */
export async function clefDeDepot(url) {
  const { storageKey } = await import("../src/lib/intake/cle.ts");
  return storageKey(`beac/${decodeURIComponent(String(url).split("/").pop() ?? "")}`);
}

/** Les places que `library_items` a enregistrées, par adresse de pièce. */
export async function placesInscrites(sb, lot) {
  const { storageKey } = await import("../src/lib/intake/cle.ts");
  const parClef = new Map();
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from("library_items").select("file_key, library_path").range(de, de + 999);
    for (const x of data ?? []) parClef.set(x.file_key, x.library_path);
    if ((data ?? []).length < 1000) break;
  }
  const out = new Map();
  for (const o of lot) {
    const p = parClef.get(storageKey(`beac/${decodeURIComponent(String(o.url).split("/").pop() ?? "")}`));
    if (p) out.set(o.url, p);
  }
  return out;
}

/** Ce que l'inventaire a noté de chaque pièce au moment où elle est descendue. */
export function empreintesDeLInventaire(biblio) {
  const out = new Map();
  const csv = `${biblio}/1. Donnees de marche/9. Index/inventaire.csv`;
  if (!fsSync.existsSync(csv)) return out;
  for (const ligne of fsSync.readFileSync(csv, "utf8").split(/\r?\n/).slice(1).filter(Boolean)) {
    const c = ligne.split(";");
    if (c[6] && c[7]?.startsWith("http")) out.set(c[7], c[6]);
  }
  return out;
}

/**
 * QUI GARDE LE NOM NU QUAND DEUX PIÈCES LE RÉCLAMENT.
 *
 * Trois arbitres, dans cet ordre, et chacun répare l'angle mort du suivant.
 *
 *   LE FICHIER LUI-MÊME. Une seule des deux pièces a l'empreinte du document
 *   posé à cet endroit. C'est le seul arbitre qui ne tourne pas en rond :
 *   l'index, lui, peut porter DEUX clefs vers UN fichier, et il le faisait
 *   pour huit paires, chacune se croyant chez elle.
 *
 *   LA PLACE ENREGISTRÉE, quand l'inventaire ne dit rien de la pièce.
 *
 *   LA DATE DE PREMIÈRE OBSERVATION, puis l'adresse, pour que deux exécutions
 *   rendent les mêmes chemins. Elle ne sépare pas une pièce de sa traduction,
 *   que la BEAC publie le même jour : c'est pourquoi elle vient en dernier.
 *
 * L'ordre alphabétique seul est déterministe sans être stable : il est stable
 * à lot constant, et le lot grandit. Le 15 octobre 2026, vingt communiqués
 * rangés depuis des mois ont perdu leur nom au profit de leur traduction
 * anglaise, entrée le jour même dans la famille « annonce ».
 */
export function anciennetePar(places, chemin, biblio, empreintes) {
  const vus = new Map();
  const sha = (rel) => {
    if (vus.has(rel)) return vus.get(rel);
    let v = "";
    try {
      /* L'inventaire ne garde que seize signes de l'empreinte : on compare ce
         qu'il a écrit, pas ce qu'on aurait voulu qu'il écrive. */
      v = createHash("sha256").update(fsSync.readFileSync(`${biblio}/${rel}`)).digest("hex").slice(0, 16);
    } catch {
      v = "";
    }
    vus.set(rel, v);
    return v;
  };
  return (p) => {
    const voulu = chemin(p);
    const sienne = empreintes?.get(p.url);
    const rang = sienne && sha(voulu) === sienne ? "0" : places.get(p.url) === voulu ? "1" : "2";
    return `${rang} ${String(p.premierVu ?? "")} ${p.url}`;
  };
}
