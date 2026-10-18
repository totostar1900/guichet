import { describe, expect, it } from "vitest";
import type { AuctionResult } from "@/lib/market/auction-results";
import type { Offer } from "@/lib/domain/types";
import { etatDeLEcart, tariferLesLignes } from "@/lib/market/tarification";

/**
 * LE CARNET DIT-IL LA VÉRITÉ SUR CE QU'IL NE SAIT PAS ?
 *
 * Deux états se ressemblent à l'écran et ne se ressemblent pas du tout : « le
 * marché est à 7,60 % et nous montrons 7,55 % », et « nous n'avons aucune
 * séance comparable ». Le second ne doit jamais se présenter comme un petit
 * écart, parce qu'un zéro faute de mieux se lit exactement comme une mesure.
 * C'est la distinction que ces cas protègent.
 */

const offre = (p: Partial<Offer>): Offer =>
  ({
    id: p.id ?? "o1",
    kind: "OTA",
    operation: "nouvelle_ligne",
    country: "Gabon",
    countryName: "Gabon",
    issuer: "Trésor",
    title: "OTA 6 % · 2031",
    isin: "GA2B00000001",
    status: "published",
    blurb: "",
    documents: [],
    opensAt: "2026-10-01",
    deadlineAt: "2026-10-25",
    settleOn: "2026-10-27",
    maturityOn: "2031-10-27",
    nominal: 10_000,
    couponRate: 6,
    pricePct: 95,
    commissionPct: 0,
    ...p,
  }) as Offer;

const seance = (p: Partial<AuctionResult> = {}): AuctionResult =>
  ({
    id: p.id ?? "s1",
    country: "Gabon",
    instrument: "OTA",
    tenor: "5 ans",
    sessionOn: "2026-09-14",
    maturityOn: "2031-09-16",
    abondement: false,
    couponRate: 6,
    priceLimit: 95,
    priceAvg: 95.5,
    priceMin: 92,
    priceMax: 97,
    confirmedBy: "Georges",
    sourceUrl: "https://exemple",
    sourceTitle: "communiqué",
    createdAt: "2026-09-15",
    updatedAt: "2026-09-15",
    ...p,
  }) as AuctionResult;

const LE_JOUR = "2026-10-18";

describe("tariferLesLignes", () => {
  it("rapproche le rendement publié du niveau mesuré", () => {
    const m = tariferLesLignes([offre({})], [seance()], LE_JOUR);
    const l = m.get("o1")!;
    expect(l.publie).toBeGreaterThan(0);
    expect(l.niveau).toBeDefined();
    expect(l.ecartPb).toBe(Math.round((l.niveau!.point - l.publie!) * 100));
  });

  it("laisse l'écart absent, et non à zéro, quand aucune séance ne se compare", () => {
    const m = tariferLesLignes([offre({})], [], LE_JOUR);
    const l = m.get("o1")!;
    expect(l.niveau).toBeUndefined();
    expect(l.ecartPb).toBeUndefined();
    expect(etatDeLEcart(l)).toBe("sans-comparable");
  });

  it("compte l'écart positif quand le marché rend plus que ce que nous montrons", () => {
    /* Nous affichons un prix élevé, donc un rendement faible ; la séance s'est
       servie moins cher, donc elle rend davantage. Le signe doit être positif,
       et c'est la seule convention de lecture de cette colonne. */
    const m = tariferLesLignes([offre({ pricePct: 100 })], [seance({ priceLimit: 90, priceAvg: 90 })], LE_JOUR);
    expect(m.get("o1")!.ecartPb!).toBeGreaterThan(0);
  });

  it("ignore les instruments sans comparable à l'adjudication", () => {
    const m = tariferLesLignes([offre({ id: "a", kind: "ACTIONS" }), offre({ id: "f", kind: "FONDS" }), offre({ id: "m", kind: "MARCHE" })], [seance()], LE_JOUR);
    expect(m.size).toBe(0);
  });

  it("ignore une ligne déjà échue : on ne tarife pas le passé", () => {
    const m = tariferLesLignes([offre({ maturityOn: "2024-01-01" })], [seance()], LE_JOUR);
    expect(m.size).toBe(0);
  });

  it("cherche un bon chez les bons et une obligation chez les obligations", () => {
    const m = tariferLesLignes([offre({ kind: "BTA", precountRate: 7, maturityOn: "2027-09-16" })], [seance()], LE_JOUR);
    expect(m.get("o1")!.niveau).toBeUndefined();
  });
});

describe("etatDeLEcart", () => {
  const l = (ecartPb: number) => ({ offerId: "o", publie: 7, ecartPb, niveau: { point: 7 } as never });
  it("nomme les trois crans par leur distance", () => {
    expect(etatDeLEcart(l(20))).toBe("proche");
    expect(etatDeLEcart(l(-20))).toBe("proche");
    expect(etatDeLEcart(l(120))).toBe("a-regarder");
    expect(etatDeLEcart(l(-900))).toBe("tres-loin");
  });
  it("ne confond jamais l'absence de mesure avec un petit écart", () => {
    expect(etatDeLEcart(undefined)).toBe("sans-comparable");
    expect(etatDeLEcart({ offerId: "o", publie: 7 })).toBe("sans-comparable");
  });
});
