import type { Country } from "@/lib/domain/types";
import type { AuctionResult } from "./auction-results";
import type { LineLiquidity } from "./liquidity";
import { priceOf } from "./yield";

/**
 * Le pont entre le primaire et le secondaire.
 *
 * Un Trésor place une obligation à 95,00 % un lundi ; la même semaine, la cote
 * affiche 100,00 % pour une de ses lignes déjà émises. Les deux chiffres sont
 * vrais et ils ne disent pas la même chose : l'un est un prix payé par des
 * banques en concurrence, l'autre est un prix de référence reporté de séance
 * en séance sur une ligne qui n'a jamais traité. L'écart entre les deux est la
 * seule mesure qui dise à un client si le prix qu'on lui montre est cher.
 *
 * Trois prudences, portées par la structure et non par une note.
 *
 *   La ligne cotée porte sa dormance. Comparer à un cours qui n'a pas bougé
 *   depuis deux ans n'est pas comparer à un marché, et le tableau doit le
 *   montrer dans la même rangée que l'écart.
 *
 *   L'écart est en points de prix, jamais présenté comme un rendement. Coupons
 *   et maturités diffèrent des deux côtés ; un écart de rendement demanderait
 *   le coupon des deux lignes, et il vaut mieux une mesure modeste et juste
 *   qu'une mesure ambitieuse et fausse.
 *
 *   Le rapprochement se fait sur le nom de l'émetteur tel que le bulletin
 *   l'imprime, déclaré ici en clair : aucune heuristique, aucune
 *   approximation silencieuse. Un Trésor absent de cette table n'a simplement
 *   pas de pont, et c'est plus honnête qu'un rapprochement deviné.
 */

export const TREASURY_ISSUER: Partial<Record<Country, string>> = {
  Cameroun: "ETAT DU CAMEROUN",
  Congo: "ETAT DU CONGO",
  Gabon: "ETAT DU GABON",
  Tchad: "ETAT DU TCHAD",
  RCA: "ETAT CENTRAFRICAIN",
  "Guinée éq.": "ETAT DE GUINEE EQUATORIALE",
};

export interface BridgeRow {
  country: Country;
  /** La séance primaire la plus récente portant un prix d'obligation. */
  primary: AuctionResult;
  primaryPrice: number;
  /** Une ligne du même émetteur, cotée à la BVMAC. */
  line: LineLiquidity;
  /** Cours coté moins prix adjugé, en points de prix. */
  gapPoints: number;
}

const norm = (s: string) => s.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function bridge(rows: AuctionResult[], lines: LineLiquidity[]): BridgeRow[] {
  const out: BridgeRow[] = [];
  for (const [pays, emetteur] of Object.entries(TREASURY_ISSUER) as [Country, string][]) {
    const primaires = rows
      .filter((r) => r.confirmedBy && r.country === pays && r.instrument === "OTA" && priceOf(r))
      .sort((a, b) => b.sessionOn.localeCompare(a.sessionOn));
    const primary = primaires[0];
    if (!primary) continue;
    const prix = priceOf(primary)!.pct;
    for (const line of lines) {
      if (line.instrument !== "obligation" || line.close == null) continue;
      if (!norm(line.issuer).includes(norm(emetteur))) continue;
      out.push({ country: pays, primary, primaryPrice: prix, line, gapPoints: line.close - prix });
    }
  }
  return out.sort((a, b) => a.country.localeCompare(b.country) || Math.abs(b.gapPoints) - Math.abs(a.gapPoints));
}
