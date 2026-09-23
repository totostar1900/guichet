import { describe, expect, it } from "vitest";
import type { Offer } from "@/lib/domain/types";
import { displayStatus, isActionable, statusLabel } from "./status";

/**
 * Une ligne cotée qui quitte la cote est **clôturée**, pas retirée.
 *
 * « Retirée » serait une décision de la maison, et ce n'en est pas une : la
 * Bourse a cessé de la coter. Le client lit « Clôturée », qui dit notre
 * position sans prêter aucune conduite à la BVMAC, sa page reste consultable
 * avec ses documents, et aucun ordre ne peut plus y passer. Rien ne lui est
 * dit du remboursement, que nous n'avons pas observé.
 */
const line = (over: Partial<Offer> = {}): Offer =>
  ({
    id: "boc-cm0000020001",
    kind: "MARCHE",
    operation: "secondaire",
    country: "CM",
    countryName: "Cameroun",
    issuer: "Émetteur",
    title: "Émetteur · OBL 6 % 2021-2026",
    isin: "CM0000020001",
    status: "published",
    blurb: "",
    documents: [],
    opensAt: "2026-01-01T09:00:00",
    deadlineAt: "2099-12-31T17:00:00",
    settleOn: "2026-09-22",
    nominal: 10_000,
    commissionPct: 0,
    market: "BVMAC",
    instrument: "obligation",
    lotSize: 1,
    settlementDays: 3,
    version: 0,
    ...over,
  }) as Offer;

describe("une ligne cotée qui quitte la cote", () => {
  it("is orderable while it is quoted", () => {
    const s = displayStatus(line());
    expect(s).toBe("quoted");
    expect(isActionable(s)).toBe(true);
  });

  it("stops being orderable once closed, without the desk withdrawing it", () => {
    const s = displayStatus(line({ status: "matured" }));
    expect(s).toBe("matured");
    expect(isActionable(s)).toBe(false);
  });

  it("reads « Clôturée » to a client, which describes our position and not the exchange's", () => {
    expect(statusLabel(line({ status: "matured" }), displayStatus(line({ status: "matured" })))).toBe("Clôturée");
  });

  it("keeps a line the desk really withdrew on its own footing", () => {
    // même état pour le client, mais « withdrawn » reste la décision de la maison,
    // et c'est elle seule qui remplace la page par un mot d'explication
    const s = displayStatus(line({ status: "withdrawn" }));
    expect(s).toBe("matured");
    expect(isActionable(s)).toBe(false);
  });
});
