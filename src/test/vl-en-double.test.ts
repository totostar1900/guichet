import { describe, expect, it } from "vitest";
import type { FundNav } from "@/lib/domain/market";

/**
 * DEUX VL DU MÊME FONDS, LE MÊME JOUR, DANS LE MÊME LOT.
 *
 * Mesuré le 12 octobre 2026 à la relecture de 2023 : la séance du 7 août 2023
 * refusait de s'écrire entièrement, avec « ON CONFLICT DO UPDATE command
 * cannot affect row a second time ». Pas une cotation, pas une VL, pas un
 * statut : tout le lot tombait pour un doublon.
 *
 * LE DOUBLON VIENT DU BULLETIN. La table des OPCVM y paraît jusqu'à quatre
 * fois, par période de variation, et ce jour-là la bourse a écrit « FCP BGFI
 * Bank ATLAS » à la table quotidienne et « FCP BGFIBank ATLAS » à
 * l'hebdomadaire. La clef se fabrique du nom indépendamment des espaces,
 * exprès, pour que ce soit un seul fonds : les deux lignes ont donc convergé
 * sur la même clef.
 *
 * Ce cas tient la règle du dédoublonnage, à part de Supabase pour qu'il se
 * vérifie sans réseau : la dernière occurrence l'emporte, parce que c'est
 * elle qui porte les variations mensuelle et trimestrielle.
 */
const nav = (fundKey: string, navDate: string, p: Partial<FundNav> = {}): FundNav =>
  ({ fundKey, navDate, name: fundKey, nav: 10_000, navOrigin: 10_000, perfSinceInceptionPct: 0, bulletinNo: 2500, sessionDate: navDate, ...p }) as FundNav;

/** La règle, telle que upsertFundNavs l'applique avant d'écrire. */
const dedoubler = (navs: FundNav[]): FundNav[] => {
  const parCouple = new Map<string, FundNav>();
  for (const n of navs) parCouple.set(`${n.fundKey}\u0000${n.navDate}`, n);
  return [...parCouple.values()];
};

describe("un lot de VL n'écrit jamais deux fois le même couple", () => {
  it("le cas du 7 août 2023 : deux orthographes, une clef", () => {
    const lot = [nav("fcpbgfibankatlas", "2023-08-07"), nav("fcpbgfibankatlas", "2023-08-07", { variationMonthlyPct: 1.2 })];
    const sorti = dedoubler(lot);
    expect(sorti).toHaveLength(1);
    /* LA DERNIÈRE L'EMPORTE : c'est elle qui porte la variation mensuelle, et
       garder la première reviendrait à jeter l'information la plus riche. */
    expect(sorti[0].variationMonthlyPct).toBe(1.2);
  });

  it("deux dates du même fonds restent deux lignes", () => {
    expect(dedoubler([nav("x", "2023-08-07"), nav("x", "2023-08-08")])).toHaveLength(2);
  });

  it("deux fonds à la même date restent deux lignes", () => {
    expect(dedoubler([nav("x", "2023-08-07"), nav("y", "2023-08-07")])).toHaveLength(2);
  });

  it("et un lot sain traverse sans rien perdre", () => {
    const lot = [nav("a", "2023-08-07"), nav("b", "2023-08-07"), nav("c", "2023-08-08")];
    expect(dedoubler(lot)).toHaveLength(3);
  });
});
