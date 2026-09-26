import { describe, expect, it } from "vitest";
import { designation, issuerLadder, marketYields, shorten } from "@/lib/domain/issuer-lines";
import { summarize } from "@/lib/domain/summary";
import type { Offer } from "@/lib/domain/types";

/**
 * Ce que l'échelle d'un émetteur doit refuser de confondre.
 *
 * Les huit obligations gabonaises cotées à la BVMAC servent de banc d'essai :
 * deux d'entre elles ont traité à 97 % et portent un vrai rendement de marché,
 * les six autres n'ont jamais changé de mains et le bulletin les imprime au
 * pair, ce qui fait passer leur coupon pour un rendement. Les deux chiffres se
 * rangeaient dans la même colonne, au même poids : « 10,96 % » à côté de
 * « 6,00 % » se lit comme presque le double, alors que ce sont deux grandeurs
 * différentes.
 */
const eog = (over: Partial<Offer>): Offer =>
  ({
    id: over.id ?? "x",
    kind: "MARCHE",
    instrument: "obligation",
    operation: "secondaire",
    country: "Gabon",
    countryName: "Gabon",
    issuer: "État du Gabon",
    title: "État du Gabon · EOG 6 % NET 2024-2027",
    isin: "GA0000020487",
    status: "published",
    market: "BVMAC",
    blurb: "",
    documents: [],
    opensAt: "2024-03-29T09:00:00",
    deadlineAt: "2027-03-29T09:00:00",
    settleOn: "2026-09-29",
    maturityOn: "2027-03-29",
    lastCouponOn: null,
    nominal: 10_000,
    couponRate: 6,
    commissionPct: 0,
    lastPrice: 100,
    lastPriceOn: "2026-09-25",
    version: 1,
    ...over,
  }) as Offer;

const now = new Date("2026-09-26T10:00:00");
const row = (o: Offer) => ({ o, s: summarize(o, now) });

describe("le nom d'une ligne dans la carte de son émetteur", () => {
  it("perd le nom de l'émetteur, qui est déjà au-dessus", () => {
    expect(designation("État du Gabon · EOG 6 % NET 2024-2027", "État du Gabon")).toBe("EOG 6 % NET 2024-2027");
  });

  it("reste entier quand il ne porte pas ce préfixe", () => {
    expect(designation("BTA 52 semaines", "État du Gabon")).toBe("BTA 52 semaines");
  });

  it("se raccourcit pour le téléphone", () => {
    expect(shorten("EOG MT 6,75 % NET 2024-2028-II")).toBe("EOG MT 6,75 % 24-28-II");
    expect(shorten("EOG 6 % NET 2024-2027")).toBe("EOG 6 % 24-27");
  });

  it("garde l'année d'émission, sans quoi deux lignes portent le même nom", () => {
    // L'État du Gabon a émis un 6,25 % en 2022 et un autre en 2023, tous deux
    // remboursables en 2028 : ils se suivent sur la même page.
    expect(shorten("EOG 6,25 % NET 2022-2028")).not.toBe(shorten("EOG 6,25 % NET 2023-2028"));
  });

  it("ne touche pas à ce qui ne suit pas la convention du bulletin", () => {
    expect(shorten("BTA 52 semaines")).toBe("BTA 52 semaines");
  });
});

describe("l'échelle des échéances", () => {
  const lignes = [
    eog({ id: "a", title: "État du Gabon · EOG 7,5 % NET 2024-2031", maturityOn: "2031-03-29", couponRate: 7.5 }),
    eog({ id: "b", title: "État du Gabon · EOG 5,6 % NET 2025-2027", maturityOn: "2027-04-05", couponRate: 5.6 }),
    eog({ id: "c", title: "État du Gabon · EOG MT 6,6 % NET 2024-2027-II", maturityOn: "2027-12-30", couponRate: 6.6, lastPrice: 97, lastTradedOn: "2026-09-25" }),
    eog({ id: "ici", maturityOn: "2027-03-29" }),
  ].map(row);

  it("range de la plus proche à la plus lointaine, et groupe par année", () => {
    const y = issuerLadder(lignes, "État du Gabon", "ici");
    expect(y.map((g) => g.year)).toEqual(["2027", "2031"]);
    expect(y[0].lines.map((l) => l.id)).toEqual(["ici", "b", "c"]);
  });

  it("garde la fiche qu'on lit à sa place, marquée", () => {
    const y = issuerLadder(lignes, "État du Gabon", "ici");
    const ici = y[0].lines.find((l) => l.id === "ici");
    expect(ici?.here).toBe(true);
    expect(y.flatMap((g) => g.lines).filter((l) => l.here)).toHaveLength(1);
  });

  it("ne répète pas l'année sur chaque ligne : il reste le jour et le mois", () => {
    const y = issuerLadder(lignes, "État du Gabon", "ici");
    expect(y[0].lines[0].day).toMatch(/29/);
    expect(y[0].lines[0].day).not.toMatch(/2027/);
  });

  it("sépare le rendement de marché du coupon du contrat", () => {
    const y = issuerLadder(lignes, "État du Gabon", "ici");
    const traitee = y[0].lines.find((l) => l.id === "c");
    const jamais = y[0].lines.find((l) => l.id === "b");
    expect(traitee?.basis).toBe("rendement");
    expect(jamais?.basis).toBe("coupon");
  });

  it("ne donne un cours qu'à la ligne qui a réellement changé de mains", () => {
    const y = issuerLadder(lignes, "État du Gabon", "ici");
    // Le bulletin imprime 100 % pour une ligne qui n'a pas traité : ce n'est pas
    // un prix de marché, et l'afficher lui en donnerait la couleur.
    expect(y[0].lines.find((l) => l.id === "b")?.price).toBeUndefined();
    expect(y[0].lines.find((l) => l.id === "c")?.price).toBe("97 %");
  });

  it("compte les rendements de marché, pas les cours, pour la phrase de tête", () => {
    // Trois des huit gabonaises cotent au pair : elles ont un cours, et leur
    // rendement reste leur coupon. Compter les cours en annoncerait cinq.
    const auPair = eog({ id: "pair", title: "État du Gabon · EOG 7 % NET 2024-2029", maturityOn: "2029-07-01", couponRate: 7, lastPrice: 100, lastTradedOn: "2026-09-25" });
    const y = issuerLadder([...lignes, row(auPair)], "État du Gabon", "ici");
    expect(y.flatMap((g) => g.lines).filter((l) => l.price)).toHaveLength(2);
    expect(marketYields(y)).toBe(1);
  });

  it("met au bout ce qui n'a pas d'échéance, sous son propre libellé", () => {
    const action = eog({ id: "act", kind: "ACTIONS", instrument: undefined, title: "État du Gabon · Une action", maturityOn: undefined, pricePerShare: 1000 });
    const y = issuerLadder([...lignes, row(action)], "État du Gabon", "ici");
    expect(y[y.length - 1].year).toBe("");
    expect(y[y.length - 1].lines.map((l) => l.id)).toEqual(["act"]);
  });

  it("se tait sur le jour quand le bulletin ne donne que l'année", () => {
    // « NET 2024-2029 » : le BOC n'imprime pas le jour, la fiche stocke le 31/12.
    const floue = eog({ id: "floue", title: "État du Gabon · EOG 6 % NET 2024-2029", isin: "GA0000099999", maturityOn: "2029-12-31" });
    const y = issuerLadder([row(floue)], "État du Gabon", "ici");
    const l = y[0].lines[0];
    expect(l.approx).toBe(true);
    expect(l.day).toBeUndefined();
    expect(y[0].year).toBe("2029");
  });
});
