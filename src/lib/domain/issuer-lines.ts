import { fmtDate, fmtPrice } from "../format";
import { displayYield, maturityIsGuess } from "./status";
import type { OfferSummary } from "./summary";
import type { Offer } from "./types";

/**
 * Les autres lignes d'un émetteur, rangées comme une échelle d'échéances.
 *
 * Huit obligations du même Trésor se ressemblent par tout ce qui ne compte pas :
 * même emprunteur, même instrument, même marché. La liste répétait donc « État
 * du Gabon » huit fois dans la carte de l'État du Gabon, et « Obligation ·
 * Cotée » huit fois sous des lignes qui sont toutes des obligations cotées. Ce
 * qui les sépare vraiment, la date à laquelle l'argent revient, était enfoui
 * dans le titre et n'apparaissait nulle part comme une donnée.
 *
 * D'où l'échelle : un rail par année d'échéance, et chaque ligne réduite à son
 * jour et son mois. On lit d'un coup où se placent les remboursements, ce qui
 * est la question qu'on se pose devant le papier d'un même emprunteur.
 *
 * Reste le piège, et c'est le vrai. Une ligne cotée qui n'a jamais traité est
 * imprimée au pair par le bulletin : son « rendement » est alors son coupon, pas
 * un rendement de marché. Les deux chiffres se rangeaient dans la même colonne,
 * au même poids, dans la même couleur. Un client qui compare 10,96 % au cours
 * 97 % et 6,00 % au pair en conclut que la première paie près du double de la
 * seconde ; elle ne le paie pas, ce sont deux grandeurs différentes. « basis »
 * les sépare, et l'écran leur donne deux traitements.
 *
 * Le cours obéit à la même règle. Le bulletin imprime 100 % pour une ligne qui
 * n'a pas traité ; afficher ce 100 % en donnerait la couleur d'une cotation.
 * Seule une ligne qui a réellement changé de mains porte donc un cours, et une
 * adjudication n'en porte un qu'une fois servie.
 */
export interface IssuerLine {
  id: string;
  /** La désignation seule : le nom de l'émetteur est déjà au-dessus. */
  title: string;
  /** La forme courte, pour le téléphone : l'année est déjà sur le rail. */
  short: string;
  /** « 30 déc. » : le jour et le mois, l'année étant celle du groupe. */
  day?: string;
  /** Le bulletin ne donne que l'année de remboursement. */
  approx: boolean;
  /** Le cours, seulement si la ligne a réellement changé de mains. */
  price?: string;
  figure: string;
  /**
   * « rendement » : ce qu'un achat au cours du jour procure.
   * « coupon » : le taux inscrit au contrat, faute de prix de marché.
   */
  basis: "rendement" | "coupon" | "aucun";
  /** La fiche qu'on est en train de lire : elle garde sa place dans l'échelle. */
  here: boolean;
}

export interface IssuerYear {
  /** L'année d'échéance ; vide pour ce qui n'en a pas (une action, un fonds). */
  year: string;
  lines: IssuerLine[];
}

/** « État du Gabon · EOG 6 % NET 2024-2027 » → « EOG 6 % NET 2024-2027 ». */
export function designation(title: string, issuer: string): string {
  const head = `${issuer} · `;
  return title.startsWith(head) ? title.slice(head.length) : title;
}

/**
 * « EOG MT 6,75 % NET 2024-2028-II » → « EOG MT 6,75 % 28-II ».
 *
 * Le couple d'années est la convention du bulletin : l'année d'émission et
 * l'année de remboursement. La seconde est déjà sur le rail et la première
 * n'aide personne à choisir, donc il n'en reste que deux chiffres, assez pour
 * retrouver la ligne dans le bulletin sans occuper la moitié de l'écran.
 */
export function shorten(d: string): string {
  return d.replace(/\bNET\s+/i, "").replace(/\b\d{4}-(\d{4})\b/, (_m, end: string) => end.slice(2));
}

const coursOf = (o: Offer): string | undefined => {
  if (o.kind === "MARCHE") {
    const p = o.ask ?? o.lastPrice;
    // Le bulletin imprime un cours de clôture à chaque séance, échangée ou non.
    // Sans échange, ce chiffre n'est pas un prix de marché.
    return o.lastTradedOn && p != null ? fmtPrice(p) : undefined;
  }
  return o.servedPricePct != null ? fmtPrice(o.servedPricePct) : undefined;
};

/** Les lignes d'un émetteur, groupées par année d'échéance, la plus proche d'abord. */
export function issuerLadder(rows: { o: Offer; s: OfferSummary }[], issuer: string, hereId: string): IssuerYear[] {
  const lines = rows
    .map(({ o, s }) => {
      const approx = maturityIsGuess(o);
      const title = designation(o.title, issuer);
      return {
        key: o.maturityOn ?? "9999-99-99",
        year: o.maturityOn ? o.maturityOn.slice(0, 4) : "",
        line: {
          id: o.id,
          title,
          short: shorten(title),
          day: o.maturityOn && !approx ? fmtDate(o.maturityOn, false) : undefined,
          approx,
          price: coursOf(o),
          figure: s.hero,
          basis: s.yieldPct == null ? "aucun" : displayYield(o).atPar ? "coupon" : "rendement",
          here: o.id === hereId,
        } satisfies IssuerLine,
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key) || a.line.title.localeCompare(b.line.title));

  const out: IssuerYear[] = [];
  for (const { year, line } of lines) {
    const last = out[out.length - 1];
    if (last && last.year === year) last.lines.push(line);
    else out.push({ year, lines: [line] });
  }
  return out;
}

/**
 * Combien de ces lignes portent un rendement de marché : la légende le dit une fois.
 *
 * Ce n'est pas le nombre de lignes qui ont un cours. Une ligne cotée au pair a
 * bien un cours, et son rendement est pourtant son coupon : compter les cours
 * ferait annoncer cinq rendements de marché là où il y en a deux.
 */
export const marketYields = (years: IssuerYear[]): number => years.reduce((n, y) => n + y.lines.filter((l) => l.basis === "rendement").length, 0);
