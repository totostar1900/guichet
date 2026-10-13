/**
 * POURQUOI L'ENCOURS A BOUGÉ ENTRE DEUX SÉANCES.
 *
 * UN STOCK QUI CHANGE SANS RAISON NOMMÉE N'EST PAS UNE DONNÉE, C'EST UN
 * CHIFFRE. Toute la valeur de cette table est dans son évolution, et une
 * évolution ne se défend que si chaque variation s'explique. La somme doit
 * boucler : ce qui ne s'explique pas est ce qu'on a mal lu.
 *
 * CINQ CAUSES, ET ELLES SUFFISENT. L'encours d'une ligne vaut
 * titres × nominal restant × cours ÷ 100. Il ne peut donc bouger que de cinq
 * façons :
 *
 *   une ligne ENTRE à la cote                    + son encours
 *   une ligne SORT                               − son encours
 *   le nominal restant baisse                    AMORTISSEMENT
 *   le nombre de titres monte                    ABONDEMENT
 *   le cours bouge                               REVALORISATION
 *
 * LA DÉCOMPOSITION EST SÉQUENTIELLE, ET L'ORDRE EST UNE CONVENTION qu'il
 * faut écrire : on fait bouger le nominal, puis les titres, puis le cours.
 * Un autre ordre répartirait autrement les termes croisés. Celui-ci a une
 * raison : l'amortissement est le seul des trois qui soit un ÉVÉNEMENT de
 * la dette, les deux autres sont des mesures. On le prend donc en premier,
 * à prix et à titres inchangés, pour qu'il porte sa valeur pleine.
 *
 * LA SOMME EST EXACTE PAR CONSTRUCTION, et c'est vérifiable à la main :
 *   u₀n₀p₀ → u₀n₁p₀ → u₁n₁p₀ → u₁n₁p₁
 * Les trois écarts se télescopent et rendent u₁n₁p₁ − u₀n₀p₀.
 *
 * CE QUE CE MODULE ATTRAPE SANS QU'ON LE LUI DEMANDE : une ligne qui SORT
 * avant son échéance n'est pas sortie, c'est un trou de lecture. Le garde de
 * complétude le dit déjà séance par séance ; ici il se chiffre en francs, ce
 * qui est la seule façon de savoir si un trou déforme une courbe ou non.
 *
 * Module sans dépendance d'exécution : un test l'atteint sans monter de base.
 */

export interface LigneDEncours {
  isin: string;
  units: number;
  /** Le nominal restant par titre. */
  nominal: number;
  /** Le cours, en pour cent du nominal. */
  coursPct: number;
  /** L'encours publié, qui fait foi pour les totaux. */
  encours: number;
  /** L'échéance, qui dit si une sortie est normale. */
  echeance?: string;
}

export type Cause = "entree" | "retour" | "sortie" | "echeance" | "amortissement" | "abondement" | "revalorisation" | "trou";

export interface Mouvement {
  isin: string;
  cause: Cause;
  /** En francs, signé : ce que la cause ajoute à l'encours total. */
  montant: number;
  /** Ce qu'il faut dire d'elle, quand ce n'est pas évident. */
  detail?: string;
}

export interface Reconciliation {
  avant: number;
  apres: number;
  /** La variation observée, apres − avant. */
  variation: number;
  mouvements: Mouvement[];
  /** La variation expliquée. Elle doit égaler la variation observée. */
  explique: number;
  /** Ce qui reste : des arrondis, ou une erreur. */
  residu: number;
  /** Les lignes sorties avant leur échéance : des trous, pas des remboursements. */
  trous: Mouvement[];
}

const somme = (xs: Mouvement[]) => xs.reduce((a, m) => a + m.montant, 0);

/**
 * Le mouvement d'un stock entre deux séances, cause par cause.
 *
 * `laSeance` est la date de la séance d'arrivée : elle seule permet de dire
 * si une ligne disparue est arrivée à échéance ou si elle manque.
 */
export function expliquerLeMouvement(
  avant: LigneDEncours[],
  apres: LigneDEncours[],
  laSeance: string,
  /**
   * LE CRITÈRE QUI TRANCHE VRAIMENT, quand l'appelant peut le fournir : une
   * ligne qui REVIENT plus tard n'est pas sortie, quoi qu'en dise sa date.
   *
   * Mesuré le 14 octobre 2026 : sans lui, la classification par la seule
   * échéance rendait ZÉRO sortie légitime sur 808 séances, ce qui est
   * impossible, et comptait comme trous les fins de vie normales. L'échéance
   * calculée (première cotation + maturité) tombe à côté de la dernière
   * cotation réelle, parfois de trois mois : ALIOS01, « 2018-2023 », quitte
   * la cote en septembre 2023 pour une échéance calculée en décembre.
   *
   * Le retour, lui, ne se discute pas : il est dans la série.
   */
  revientPlusTard?: (isin: string) => boolean,
  /** Cette ligne a-t-elle déjà paru AVANT la séance précédente ? */
  dejaVuAvant?: (isin: string) => boolean,
): Reconciliation {
  const parIsinAvant = new Map(avant.map((l) => [l.isin, l]));
  const parIsinApres = new Map(apres.map((l) => [l.isin, l]));
  const mouvements: Mouvement[] = [];

  for (const l of apres) {
    if (parIsinAvant.has(l.isin)) continue;
    /* UNE LIGNE QUI REPARAÎT N EST PAS UNE ÉMISSION. Sans cette symétrie, un
       trou qui se referme compte comme une entrée, et les cumuls perdent tout
       sens : 11 389 Mds d « entrées » sur trois ans et demi pour un marché
       qui en pèse 1 227. Un trou a deux bords, et il faut les deux. */
    const dejaVue = dejaVuAvant?.(l.isin) ?? false;
    mouvements.push({
      isin: l.isin,
      cause: dejaVue ? "retour" : "entree",
      montant: l.encours,
      detail: dejaVue ? "reparaît après une absence : le trou se referme" : undefined,
    });
  }

  for (const l of avant) {
    if (parIsinApres.has(l.isin)) continue;
    /* UNE LIGNE NE SORT QU'À SON ÉCHÉANCE. Avant elle, une disparition est un
       trou de lecture, et l'appeler « remboursement » ferait lire une
       extinction de dette là où il n'y a qu'une rangée perdue. */
    const revient = revientPlusTard?.(l.isin);
    const arrivee = revient === false || (revient === undefined && l.echeance != null && l.echeance <= laSeance);
    mouvements.push({
      isin: l.isin,
      cause: arrivee ? "echeance" : "trou",
      montant: -l.encours,
      detail: arrivee
        ? revient === false
          ? "ne reparaît plus : sortie de cote"
          : `échéance du ${l.echeance}`
        : revient
          ? "reparaît à une séance ultérieure : la lecture a lâché"
          : `absente sans être échue${l.echeance ? ` (échéance ${l.echeance})` : ""}`,
    });
  }

  for (const b of apres) {
    const a = parIsinAvant.get(b.isin);
    if (!a) continue;
    /* L'ordre est la convention écrite en tête : nominal, puis titres, puis
       cours. Les trois écarts se télescopent exactement. */
    const amortissement = (b.nominal - a.nominal) * a.units * (a.coursPct / 100);
    const abondement = (b.units - a.units) * b.nominal * (a.coursPct / 100);
    const revalorisation = ((b.coursPct - a.coursPct) / 100) * b.units * b.nominal;
    if (Math.abs(amortissement) > 0.5) mouvements.push({ isin: b.isin, cause: "amortissement", montant: amortissement, detail: `nominal ${a.nominal} → ${b.nominal}` });
    if (Math.abs(abondement) > 0.5) mouvements.push({ isin: b.isin, cause: "abondement", montant: abondement, detail: `titres ${a.units} → ${b.units}` });
    if (Math.abs(revalorisation) > 0.5) mouvements.push({ isin: b.isin, cause: "revalorisation", montant: revalorisation, detail: `cours ${a.coursPct} → ${b.coursPct} %` });
  }

  const totalAvant = avant.reduce((s, l) => s + l.encours, 0);
  const totalApres = apres.reduce((s, l) => s + l.encours, 0);
  const explique = somme(mouvements);
  return {
    avant: totalAvant,
    apres: totalApres,
    variation: totalApres - totalAvant,
    mouvements,
    explique,
    residu: totalApres - totalAvant - explique,
    trous: mouvements.filter((m) => m.cause === "trou"),
  };
}

/** Le total par cause, pour une lecture d'un coup d'œil. */
export function parCause(r: Reconciliation): Record<Cause, number> {
  const out = { entree: 0, retour: 0, sortie: 0, echeance: 0, amortissement: 0, abondement: 0, revalorisation: 0, trou: 0 } as Record<Cause, number>;
  for (const m of r.mouvements) out[m.cause] += m.montant;
  return out;
}
