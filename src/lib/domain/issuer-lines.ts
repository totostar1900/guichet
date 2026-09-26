import { fmtDate, fmtPrice, localIso } from "../format";
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
  /** L'emprunteur l'a déjà remboursée : elle descend au bas de l'échelle. */
  past: boolean;
  /** La fiche qu'on est en train de lire : elle garde sa place dans l'échelle. */
  here: boolean;
}

export interface IssuerYear {
  /** L'année d'échéance ; vide sur les deux groupes qui n'en portent pas. */
  year: string;
  /**
   * « annee » : une année à venir, celle du rail.
   * « sans » : ce qui n'a pas d'échéance, une action ou un fonds.
   * « echues » : ce que l'emprunteur a déjà remboursé.
   */
  kind: "annee" | "sans" | "echues";
  lines: IssuerLine[];
}

/** « État du Gabon · EOG 6 % NET 2024-2027 » → « EOG 6 % NET 2024-2027 ». */
export function designation(title: string, issuer: string): string {
  const head = `${issuer} · `;
  return title.startsWith(head) ? title.slice(head.length) : title;
}

/**
 * « EOG MT 6,75 % NET 2024-2028-II » → « EOG MT 6,75 % 24-28-II ».
 *
 * Le couple d'années est la convention du bulletin : l'année d'émission et
 * l'année de remboursement. Deux chiffres chacune suffisent à retrouver la ligne
 * sans occuper la moitié d'un écran de téléphone.
 *
 * L'année d'émission a d'abord sauté, puisque le rail porte déjà celle du
 * remboursement. Mais l'État du Gabon a émis un 6,25 % en 2022 et un autre en
 * 2023, tous deux remboursables en 2028 : sans l'année d'émission, deux lignes
 * différentes portaient le même nom sur la même page. Elle reste.
 */
export function shorten(d: string): string {
  return d.replace(/\bNET\s+/i, "").replace(/\b(\d{4})-(\d{4})\b/, (_m, a: string, b: string) => `${a.slice(2)}-${b.slice(2)}`);
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

/**
 * Les lignes d'un émetteur, groupées par année d'échéance, la plus proche d'abord.
 *
 * Trois étages, dans cet ordre : les années à venir, ce qui n'a pas d'échéance,
 * et les lignes échues.
 *
 * Les échues descendent parce qu'une ligne remboursée n'a plus rien à donner :
 * la BVMAC continue de l'imprimer un moment, et elle ouvrait l'échelle avec un
 * rang mort, sans cours ni rendement, là où le lecteur cherche la prochaine
 * échéance. Elles ne disparaissent pas pour autant : un client qui en détient
 * encore doit retrouver sa ligne. Entre elles, la plus récemment remboursée
 * d'abord, qui est celle dont on parle encore.
 *
 * Leur date porte son année, contrairement aux autres : leur rail dit « échues »
 * et non une année, donc plus rien ne la porterait.
 */
export function issuerLadder(rows: { o: Offer; s: OfferSummary }[], issuer: string, hereId: string, now = new Date()): IssuerYear[] {
  const today = localIso(now);
  const lines = rows
    .map(({ o, s }) => {
      const approx = maturityIsGuess(o);
      const title = designation(o.title, issuer);
      const past = Boolean(o.maturityOn && o.maturityOn < today);
      const kind: IssuerYear["kind"] = past ? "echues" : o.maturityOn ? "annee" : "sans";
      return {
        kind,
        key: o.maturityOn ?? "9999-99-99",
        year: kind === "annee" ? o.maturityOn!.slice(0, 4) : "",
        line: {
          id: o.id,
          title,
          short: shorten(title),
          day: !o.maturityOn ? undefined : past ? (approx ? o.maturityOn.slice(0, 4) : fmtDate(o.maturityOn)) : approx ? undefined : fmtDate(o.maturityOn, false),
          approx,
          past,
          price: coursOf(o),
          figure: s.hero,
          basis: s.yieldPct == null ? "aucun" : displayYield(o).atPar ? "coupon" : "rendement",
          here: o.id === hereId,
        } satisfies IssuerLine,
      };
    })
    .sort((a, b) => {
      const rank = { annee: 0, sans: 1, echues: 2 };
      if (rank[a.kind] !== rank[b.kind]) return rank[a.kind] - rank[b.kind];
      // Les échues remontent le temps : la dernière remboursée en tête.
      const d = a.kind === "echues" ? b.key.localeCompare(a.key) : a.key.localeCompare(b.key);
      return d || a.line.title.localeCompare(b.line.title);
    });

  const out: IssuerYear[] = [];
  for (const { kind, year, line } of lines) {
    const last = out[out.length - 1];
    if (last && last.kind === kind && last.year === year) last.lines.push(line);
    else out.push({ year, kind, lines: [line] });
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
