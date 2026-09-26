import { describe, expect, it } from "vitest";
import { fmtWhen } from "@/lib/format";
import { repaymentLabel } from "@/lib/domain/status";
import type { Offer } from "@/lib/domain/types";

/**
 * Deux silences que la fiche doit tenir.
 *
 * L'heure d'abord. Le Cameroun écrit « avant 09 h 00 », le Congo s'arrête au
 * jour. Afficher une heure dans les deux cas revient à en inventer une, et un
 * client arrivé à 10 h sur une clôture qu'il croyait à midi ne se console pas
 * en apprenant qu'elle venait d'une valeur par défaut.
 *
 * Le remboursement ensuite. Deux lignes de même taux et de même échéance ne se
 * valent pas si l'une rend le capital d'un coup et l'autre par tranches : la
 * seconde rend l'argent plus tôt, donc en risque moins. Le mot se déduit de ce
 * qui construit l'échéancier, pour qu'il ne puisse jamais le contredire.
 */
describe("l'heure d'un moment de l'opération", () => {
  it("se dit quand le communiqué la donne", () => {
    expect(fmtWhen("2026-09-21T09:00:00")).toMatch(/9\s*h/);
  });

  it("se tait à minuit, qui vaut « heure non communiquée »", () => {
    const silencieux = fmtWhen("2026-09-22T00:00:00");
    expect(silencieux).not.toMatch(/h/);
    expect(silencieux).toContain("22");
  });

  it("garde le jour dans les deux cas", () => {
    expect(fmtWhen("2026-09-21T09:00:00")).toContain("21");
  });
});

const ligne = (over: Partial<Offer>): Offer =>
  ({
    id: "x",
    kind: "OTA",
    operation: "nouvelle_ligne",
    country: "Cameroun",
    countryName: "Cameroun",
    issuer: "Trésor",
    title: "OTA",
    isin: "CM0000000000",
    status: "published",
    blurb: "",
    documents: [],
    opensAt: "2026-01-01T09:00:00",
    deadlineAt: "2026-02-01T09:00:00",
    settleOn: "2026-02-03",
    lastCouponOn: null,
    nominal: 10_000,
    couponRate: 6,
    commissionPct: 0,
    version: 1,
    ...over,
  }) as Offer;

describe("comment le capital revient", () => {
  it("dit « in fine » sur une adjudication du primaire", () => {
    expect(repaymentLabel(ligne({}))).toMatch(/in fine/);
    expect(repaymentLabel(ligne({ kind: "BTA", couponRate: undefined, precountRate: 6 }))).toMatch(/in fine/);
  });

  it("ne dit rien là où la question ne se pose pas", () => {
    expect(repaymentLabel(ligne({ kind: "FONDS" }))).toBeUndefined();
    expect(repaymentLabel(ligne({ kind: "ACTIONS" }))).toBeUndefined();
  });

  it("dit « par tranches » sur une ligne cotée dont le référentiel porte l'échéancier", () => {
    // ECMR 6,75 % NET 2023-2029 : le référentiel en donne les dates de paiement.
    const cotee = ligne({ kind: "MARCHE", instrument: "obligation", isin: "CM0000020370", couponRate: 6.75 });
    const dit = repaymentLabel(cotee);
    expect(dit).toBeDefined();
    expect(dit).toMatch(/tranches|in fine/);
  });
});
