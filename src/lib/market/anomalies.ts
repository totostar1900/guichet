import type { AuctionResult } from "./auction-results";
import { priceOf, tenorYears, vieRestante, ytm } from "./yield";

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
  /**
   * Ce qui se contredit : une clef et ses valeurs, mises en mots par la page.
   *
   * Les nombres voyagent en paramètres plutôt que collés dans la phrase, sans
   * quoi la phrase n'est la clef de rien et sort en français sur un écran
   * anglais, avec des points à la place des virgules.
   */
  quoi: { key: string; params?: Record<string, string | number> };
  /** Ce qu'il faut regarder sur la pièce. */
  verifier: string;
  gravite: GraviteAnomalie;
}

const n = (v: number | undefined) => (v == null ? null : Number(v));

/**
 * Le préfixe d'un code d'émission, et le Trésor qu'il désigne.
 *
 * « CG2J00000875 » est congolais, « GA1100002227 » gabonais : les deux
 * premières lettres sont le code ISO du pays, et la BEAC ne s'en écarte pas.
 * La colonne « pays » de son index vient d'ailleurs que le code, qui est lu
 * dans le scan : les deux se contrôlent donc l'un l'autre, gratuitement.
 */
const PREFIXE: Record<string, AuctionResult["country"]> = {
  CM: "Cameroun",
  CG: "Congo",
  GA: "Gabon",
  TD: "Tchad",
  CF: "RCA",
  GQ: "Guinée éq.",
};

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
    // L anomalie porte l identifiant d une des lignes du groupe : il doit être
    // toujours le même, sans quoi la ranger sur une séance ne la range pas, et
    // le panneau la redemande au passage suivant dans un autre ordre.
    const [t] = [...lot].sort((x, y) => x.id.localeCompare(y.id));
    out.push({
      id: t.id,
      quand: t.sessionOn,
      pays: t.country,
      instrument: t.instrument,
      tenor: lot.map((r) => r.tenor).join(", "),
      quoi: { key: "{n} lignes portent le même annoncé, le même soumis et le même servi", params: { n: lot.length } },
      verifier: "un total de séance recopié sur chaque ligne, plutôt que des lignes réellement identiques",
      gravite: lot.some((r) => r.confirmedBy) ? "confirmee" : "attente",
    });
  }
  return out;
}

/**
 * Ce qu'une séance a déjà fait vérifier.
 *
 * Une anomalie rangée ne disparaît pas du monde : elle sort du panneau et se
 * compte à part. Si le crible trouve plus tard un autre motif sur la même
 * séance, celui-là se signalera, n'ayant pas été vu.
 */
const vue = (r: AuctionResult, key: string) => (r.anomaliesVues ?? []).includes(key);

export interface Crible {
  /** Ce qui attend encore un œil. */
  restent: Anomalie[];
  /** Ce qui a été vérifié sur la pièce : la source se contredit, la lecture est fidèle. */
  vues: number;
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
      out.push({
        ...base,
        quoi: { key: "chiffre retenu {v} hors de la fourchette publiée {lo}–{hi}", params: { v: retenu.toLocaleString("fr-FR", { maximumFractionDigits: 4 }), lo: Math.min(lo, hi).toLocaleString("fr-FR", { maximumFractionDigits: 4 }), hi: Math.max(lo, hi).toLocaleString("fr-FR", { maximumFractionDigits: 4 }) } },
        verifier: "la colonne d'où vient le chiffre retenu, et celles des deux bornes",
      });
    }

    // Un bon se sert à un taux, une obligation à un prix.
    if (r.instrument === "BTA" && (n(r.priceAvg) ?? n(r.priceLimit)) != null && (n(r.rateAvg) ?? n(r.rateLimit)) == null) {
      out.push({ ...base, quoi: { key: "un bon servi à un prix, sans taux" }, verifier: "l'instrument de la séance, ou la colonne lue" });
    }
    if (r.instrument === "OTA" && (n(r.rateAvg) ?? n(r.rateLimit)) != null && (n(r.priceAvg) ?? n(r.priceLimit)) == null) {
      out.push({ ...base, quoi: { key: "une obligation servie à un taux, sans prix" }, verifier: "l'instrument de la séance, ou la colonne lue" });
    }

    // Les montants doivent s'ordonner.
    const servi = n(r.served);
    const soumis = n(r.bid);
    if (servi != null && soumis != null && servi > soumis * 1.001) {
      out.push({
        ...base,
        quoi: { key: "servi {a} M supérieur aux soumissions {b} M", params: { a: Math.round(servi / 1e6).toLocaleString("fr-FR"), b: Math.round(soumis / 1e6).toLocaleString("fr-FR") } },
        verifier: "les deux montants sur la pièce, et leur unité",
      });
    }

    // Le code dit un Trésor, la colonne de la BEAC en dit un autre.
    const prefixe = r.codeEmission?.trim().slice(0, 2).toUpperCase();
    const dit = prefixe ? PREFIXE[prefixe] : undefined;
    if (dit && dit !== r.country) {
      out.push({
        ...base,
        quoi: { key: "code {code} : préfixe {p}, or la séance est rangée sous {pays}", params: { code: r.codeEmission ?? "", p: prefixe ?? "", pays: r.country } },
        verifier: "le pays de la séance, ou le code lu sur le communiqué voisin",
      });
    }

    // Un montant hors de toute échelle : la plus grosse adjudication de la zone
    // se compte en dizaines de milliards, pas en milliers. Au-delà, l unité a
    // été lue de travers, et le chiffre traverserait la chaîne sans surprendre
    // personne puisqu il est bien un nombre dans la bonne colonne.
    const PLAFOND = 500e9;
    for (const [champ, v] of [["montant annoncé", n(r.announced)], ["total des soumissions", n(r.bid)], ["total servi", n(r.served)]] as const) {
      if (v != null && v > PLAFOND) {
        out.push({
          ...base,
          quoi: { key: "{champ} de {v} Md : hors de toute échelle pour la zone", params: { champ, v: Math.round(v / 1e9).toLocaleString("fr-FR") } },
          verifier: "l unité annoncée en tête du tableau : millions, milliers ou francs",
        });
      }
    }

    // Une séance du 1er janvier n'existe pas : c'est une date mal lue.
    if (/-01-01$/.test(r.sessionOn)) out.push({ ...base, quoi: { key: "séance datée du 1er janvier" }, verifier: "la date imprimée en tête du communiqué" });

    /**
     * Le rendement imprimé ne suit pas du prix et du coupon imprimés.
     *
     * Trois nombres que le Trésor pose côte à côte sur la même pièce se
     * déduisent l'un de l'autre. Notre calcul reproduit le rendement camerounais
     * à moins d'un point de base sur dix des treize séances où il figure, et les
     * avis d'annonce congolais confirment l'échéancier en toutes lettres :
     * « Remboursement : In fine », intérêts annuels. Un écart de plus de quinze
     * points de base ne vient donc pas de nous, et l'un des trois nombres est à
     * relire sur la pièce.
     */
    if (r.yieldAvg != null && r.couponRate != null) {
      const p = priceOf(r);
      const vie = vieRestante(r);
      const calcule = p && vie ? ytm(p.pct, r.couponRate, vie.years) : undefined;
      /**
       * La convention du Trésor, essayée avant de crier.
       *
       * Le Trésor camerounais actualise sur la durée annoncée et non sur ce
       * qu'il reste à courir : son 3 ans du 21 août 2019, à deux ans et neuf
       * mois du terme, donne 4,365 % sur trois ans pleins, et il imprime 4,36 %.
       * Sans cet essai, chacun de ses abondements serait signalé pour rien, et
       * un panneau qui crie sans motif cesse d'être lu.
       */
      const annonce = tenorYears(r.tenor);
      const surEtiquette = p && annonce != null ? ytm(p.pct, r.couponRate, annonce) : undefined;
      const ecart = (x: number | undefined) => (x == null ? undefined : Math.round((x - r.yieldAvg!) * 100));
      const bpVie = ecart(calcule);
      const bpEtiquette = ecart(surEtiquette);
      const explique = [bpVie, bpEtiquette].some((x) => x != null && Math.abs(x) <= 15);
      const bp = bpVie ?? 0;
      if (p && calcule != null && !explique) {
        out.push({
          ...base,
          quoi: {
            key: "rendement imprimé {y} %, or le prix {p} et le coupon {c} % en donnent {z} % : {bp} points de base d'écart",
            params: {
              y: r.yieldAvg.toLocaleString("fr-FR", { minimumFractionDigits: 2 }),
              p: p.pct.toLocaleString("fr-FR", { minimumFractionDigits: 2 }),
              c: r.couponRate.toLocaleString("fr-FR", { minimumFractionDigits: 2 }),
              z: calcule.toLocaleString("fr-FR", { maximumFractionDigits: 2 }),
              bp: Math.abs(bp),
            },
          },
          verifier: "les trois nombres sur la pièce : le prix moyen, le taux facial et le taux de rendement",
        });
      }
    }

    // Plus de soumissionnaires que de spécialistes dans le réseau.
    if (r.bidders != null && r.networkSize != null && r.bidders > r.networkSize) {
      out.push({ ...base, quoi: { key: "{n} soumissionnaires pour un réseau de {m}", params: { n: r.bidders, m: r.networkSize } }, verifier: "les deux nombres, souvent voisins sur la pièce" });
    }
  }

  // Ce qui est déjà entré dans les références passe devant.
  return out.sort((a, b) => (a.gravite === b.gravite ? b.quand.localeCompare(a.quand) : a.gravite === "confirmee" ? -1 : 1));
}

/** Le crible complet : ce qui reste à voir, et le compte de ce qui a été vu. */
export function cribler(rows: AuctionResult[]): Crible {
  const parId = new Map(rows.map((r) => [r.id, r]));
  const toutes = anomalies(rows);
  const restent = toutes.filter((a) => {
    const r = parId.get(a.id);
    return !r || !vue(r, a.quoi.key);
  });
  return { restent, vues: toutes.length - restent.length };
}
