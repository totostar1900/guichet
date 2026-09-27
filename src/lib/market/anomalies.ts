import type { AuctionResult } from "./auction-results";

/**
 * Ce que la table attrape et qu'un formulaire ne montre pas.
 *
 * Une séance à la fois, on ne voit rien : un chiffre absurde a l'air d'un
 * chiffre. Rangé en colonne à côté de deux cent quarante-huit autres, il saute
 * aux yeux. Ce module fait le tri à la place de l'œil, sur les seuls motifs qui
 * ne demandent pas d'ouvrir la pièce.
 *
 * Aucun de ces motifs ne dit qu'un chiffre est faux : ils disent qu'il se
 * contredit, lui-même ou son voisin. La décision appartient à qui ouvrira le
 * communiqué, et c'est pourquoi chaque anomalie porte l'identifiant de sa
 * séance : elle est un chemin vers la pièce, pas un verdict.
 *
 * L'ordre importe. Une anomalie sur une séance déjà confirmée passe devant une
 * anomalie sur une séance qui attend : la première est entrée dans les
 * références du desk, la seconde n'a encore rien contaminé.
 */

export type GraviteAnomalie = "confirmee" | "attente";

export interface Anomalie {
  id: string;
  quand: string;
  pays: AuctionResult["country"];
  instrument: AuctionResult["instrument"];
  tenor: string;
  /** Ce qui se contredit, en une phrase. */
  quoi: string;
  /** Ce qu'il faut regarder sur la pièce. */
  verifier: string;
  gravite: GraviteAnomalie;
}

const n = (v: number | undefined) => (v == null ? null : Number(v));

/**
 * Les montants d'une séance à plusieurs lignes, tous identiques.
 *
 * Le 14 septembre 2026, les cinq lignes camerounaises de trois à sept ans
 * portent le même annoncé, le même soumis et le même servi, à l'unité près :
 * 27 550 190 000. Cinq lignes réellement identiques sont possibles, un total
 * de séance recopié sur chaque ligne l'est bien davantage, et la différence
 * change la lecture de chaque point de courbe qui en sort.
 */
function montantsRepetes(rows: AuctionResult[]): Anomalie[] {
  const parSeance = new Map<string, AuctionResult[]>();
  for (const r of rows) {
    if (!r.announced) continue;
    const k = `${r.country}|${r.sessionOn}`;
    parSeance.set(k, [...(parSeance.get(k) ?? []), r]);
  }
  const out: Anomalie[] = [];
  for (const lot of parSeance.values()) {
    if (lot.length < 3) continue;
    const memes = new Set(lot.map((r) => `${r.announced}|${r.bid}|${r.served}`));
    if (memes.size !== 1) continue;
    const [t] = lot;
    out.push({
      id: t.id,
      quand: t.sessionOn,
      pays: t.country,
      instrument: t.instrument,
      tenor: lot.map((r) => r.tenor).join(", "),
      quoi: `${lot.length} lignes portent le même annoncé, le même soumis et le même servi`,
      verifier: "un total de séance recopié sur chaque ligne, plutôt que des lignes réellement identiques",
      gravite: lot.some((r) => r.confirmedBy) ? "confirmee" : "attente",
    });
  }
  return out;
}

export function anomalies(rows: AuctionResult[]): Anomalie[] {
  const out: Anomalie[] = [...montantsRepetes(rows)];

  for (const r of rows) {
    const base = { id: r.id, quand: r.sessionOn, pays: r.country, instrument: r.instrument, tenor: r.tenor, gravite: (r.confirmedBy ? "confirmee" : "attente") as GraviteAnomalie };

    // Le chiffre retenu hors de la fourchette publiée. Vérifié sur la pièce
    // gabonaise du 7 février 2024 : la lecture est exacte, c'est le Trésor qui
    // publie une moyenne au-dessus de son propre maximum. Le motif reste, parce
    // qu'il ne se distingue pas d'une colonne mal lue sans ouvrir la pièce.
    const lo = n(r.priceMin) ?? n(r.rateMin);
    const hi = n(r.priceMax) ?? n(r.rateMax);
    const retenu = n(r.priceAvg) ?? n(r.priceLimit) ?? n(r.rateAvg) ?? n(r.rateLimit);
    if (lo != null && hi != null && retenu != null && (retenu < Math.min(lo, hi) - 0.01 || retenu > Math.max(lo, hi) + 0.01)) {
      out.push({ ...base, quoi: `chiffre retenu ${retenu} hors de la fourchette publiée ${Math.min(lo, hi)}–${Math.max(lo, hi)}`, verifier: "la colonne d'où vient le chiffre retenu, et celles des deux bornes" });
    }

    // Un bon se sert à un taux, une obligation à un prix.
    if (r.instrument === "BTA" && (n(r.priceAvg) ?? n(r.priceLimit)) != null && (n(r.rateAvg) ?? n(r.rateLimit)) == null) {
      out.push({ ...base, quoi: "un bon servi à un prix, sans taux", verifier: "l'instrument de la séance, ou la colonne lue" });
    }
    if (r.instrument === "OTA" && (n(r.rateAvg) ?? n(r.rateLimit)) != null && (n(r.priceAvg) ?? n(r.priceLimit)) == null) {
      out.push({ ...base, quoi: "une obligation servie à un taux, sans prix", verifier: "l'instrument de la séance, ou la colonne lue" });
    }

    // Les montants doivent s'ordonner.
    const servi = n(r.served);
    const soumis = n(r.bid);
    if (servi != null && soumis != null && servi > soumis * 1.001) {
      out.push({ ...base, quoi: `servi ${Math.round(servi / 1e6)} M supérieur aux soumissions ${Math.round(soumis / 1e6)} M`, verifier: "les deux montants sur la pièce, et leur unité" });
    }

    // Une séance du 1er janvier n'existe pas : c'est une date mal lue.
    if (/-01-01$/.test(r.sessionOn)) out.push({ ...base, quoi: "séance datée du 1er janvier", verifier: "la date imprimée en tête du communiqué" });

    // Plus de soumissionnaires que de spécialistes dans le réseau.
    if (r.bidders != null && r.networkSize != null && r.bidders > r.networkSize) {
      out.push({ ...base, quoi: `${r.bidders} soumissionnaires pour un réseau de ${r.networkSize}`, verifier: "les deux nombres, souvent voisins sur la pièce" });
    }
  }

  // Ce qui est déjà entré dans les références passe devant.
  return out.sort((a, b) => (a.gravite === b.gravite ? b.quand.localeCompare(a.quand) : a.gravite === "confirmee" ? -1 : 1));
}
