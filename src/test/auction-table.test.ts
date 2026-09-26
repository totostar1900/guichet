import { describe, expect, it } from "vitest";
import { applyFilter, distinct, sortRows, summarise, toRow } from "@/lib/market/auction-table";
import type { AuctionResult } from "@/lib/market/auction-results";

/**
 * La table est d'abord le contrôle de la relecture.
 *
 * Une séance à la fois, on ne voit rien : un taux recopié 70 % au lieu de
 * 7,00 % passe dans un formulaire et saute aux yeux dans une colonne triée.
 * Les règles ci-dessous portent donc moins sur l'esthétique d'un tableau que
 * sur ce qu'il ne doit jamais laisser croire.
 */
const s = (over: Partial<AuctionResult>): AuctionResult => ({
  id: over.id ?? "x",
  country: "Congo",
  instrument: "BTA",
  tenor: "52 semaines",
  sessionOn: "2026-09-15",
  abondement: false,
  sourceUrl: `https://beac.int/${over.id ?? "x"}.pdf`,
  sourceTitle: "RESULTATS",
  createdAt: "2026-09-16T10:00:00Z",
  updatedAt: "2026-09-16T10:00:00Z",
  ...over,
});

const relue = (over: Partial<AuctionResult>) => s({ confirmedBy: "Desk", confirmedAt: "2026-09-16T10:00:00Z", ...over });

describe("les filtres", () => {
  const rows = [
    relue({ id: "cg", country: "Congo", rateAvg: 6.97 }),
    relue({ id: "cm", country: "Cameroun", rateAvg: 5.5 }),
    s({ id: "ga", country: "Gabon", tenor: "3 ans", instrument: "OTA" }),
  ];

  it("regardent la zone entière tant qu'on ne demande rien", () => {
    // Un Trésor ne se lit pas seul : c'est la comparaison qui porte le sens.
    expect(applyFilter(rows, {})).toHaveLength(3);
    expect(applyFilter(rows, { pays: "tout" })).toHaveLength(3);
  });

  it("resserrent sur un Trésor, un instrument, une durée", () => {
    expect(applyFilter(rows, { pays: "Congo" }).map((r) => r.id)).toEqual(["cg"]);
    expect(applyFilter(rows, { instrument: "OTA" }).map((r) => r.id)).toEqual(["ga"]);
    expect(applyFilter(rows, { duree: "3 ans" }).map((r) => r.id)).toEqual(["ga"]);
  });

  it("séparent ce qui est relu de ce qui ne l'est pas", () => {
    expect(applyFilter(rows, { etat: "relues" }).map((r) => r.id)).toEqual(["cg", "cm"]);
    expect(applyFilter(rows, { etat: "a-relire" }).map((r) => r.id)).toEqual(["ga"]);
  });

  it("bornent les dates aux deux bouts, bornes comprises", () => {
    const d = [s({ id: "a", sessionOn: "2026-01-10" }), s({ id: "b", sessionOn: "2026-06-30" })];
    expect(applyFilter(d, { du: "2026-01-10", au: "2026-06-30" })).toHaveLength(2);
    expect(applyFilter(d, { du: "2026-02-01" }).map((r) => r.id)).toEqual(["b"]);
  });
});

describe("le tri", () => {
  const rows = [
    relue({ id: "haut", rateAvg: 9.4, sessionOn: "2026-05-01" }),
    relue({ id: "bas", rateAvg: 5.5, sessionOn: "2026-06-01" }),
    s({ id: "vide", sessionOn: "2026-07-01" }),
  ].map(toRow);

  it("range les vides en dernier, dans les deux sens", () => {
    // Trier par taux croissant remonterait sinon en tête toutes les séances pas
    // encore relues, qui n'ont pas de taux : l'écran ferait mine de répondre.
    expect(sortRows(rows, "chiffre", false).map((x) => x.r.id)).toEqual(["bas", "haut", "vide"]);
    expect(sortRows(rows, "chiffre", true).map((x) => x.r.id)).toEqual(["haut", "bas", "vide"]);
  });

  it("met le taux le plus élevé en tête quand on inverse : c'est ce qu'on cherche", () => {
    expect(sortRows(rows, "chiffre", true)[0].r.id).toBe("haut");
  });

  it("départage à égalité par la séance la plus récente", () => {
    const ex = [relue({ id: "vieux", rateAvg: 7, sessionOn: "2026-01-01" }), relue({ id: "neuf", rateAvg: 7, sessionOn: "2026-08-01" })].map(toRow);
    expect(sortRows(ex, "chiffre", false).map((x) => x.r.id)).toEqual(["neuf", "vieux"]);
  });
});

describe("le résumé de la tranche affichée", () => {
  it("compte les relues à part du total : trois sur deux cents ne fondent rien", () => {
    const rows = [relue({ id: "a", rateAvg: 7 }), s({ id: "b" }), s({ id: "c" })].map(toRow);
    const r = summarise(rows);
    expect(r.total).toBe(3);
    expect(r.relues).toBe(1);
  });

  it("ne moyenne que ce qui a été relu", () => {
    // Une lecture que personne n'a arrêtée ne pèse pas dans une moyenne.
    const rows = [relue({ id: "a", rateAvg: 7 }), s({ id: "b", rateAvg: 100 })].map(toRow);
    expect(summarise(rows).moyenneTaux).toBe(7);
  });

  it("ne mélange pas les taux et les prix dans une seule moyenne", () => {
    const rows = [relue({ id: "a", rateAvg: 7 }), relue({ id: "o", instrument: "OTA", tenor: "3 ans", priceAvg: 90 })].map(toRow);
    const r = summarise(rows);
    expect(r.moyenneTaux).toBe(7);
    expect(r.moyennePrix).toBe(90);
  });

  it("donne les deux bornes de période et le nombre de Trésors", () => {
    const rows = [s({ id: "a", sessionOn: "2026-01-10" }), s({ id: "b", country: "Tchad", sessionOn: "2026-09-15" })].map(toRow);
    const r = summarise(rows);
    expect([r.du, r.au]).toEqual(["2026-01-10", "2026-09-15"]);
    expect(r.pays).toBe(2);
  });

  it("compte les minces parmi les relues : elles ne valent pas les autres", () => {
    const rows = [relue({ id: "m", rateAvg: 6.97, bidders: 1 }), relue({ id: "p", rateAvg: 7, bidders: 8, coverage: 150 })].map(toRow);
    expect(summarise(rows).minces).toBe(1);
  });
});

describe("les valeurs proposées aux filtres", () => {
  it("sortent des données, et laissent tomber le tiret du vide", () => {
    const rows = [s({ id: "a", tenor: "52 semaines" }), s({ id: "b", tenor: "—" }), s({ id: "c", tenor: "52 semaines" })];
    expect(distinct(rows, (r) => r.tenor)).toEqual(["52 semaines"]);
  });
});
