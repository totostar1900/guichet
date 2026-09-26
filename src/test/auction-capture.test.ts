import { describe, expect, it } from "vitest";
import { confirmable, millions, type AuctionResult } from "@/lib/market/auction-results";
import { tenorOf } from "@/lib/market/beac";

/**
 * Ce qu'une séance doit porter pour cesser d'être une proposition.
 *
 * Le robot lit l'index de la BEAC, où le titre donne le pays, l'instrument, la
 * durée et la date. Les chiffres et le code d'émission sont à l'intérieur d'un
 * scan, donc la ligne naît vide. Tant qu'elle l'est, elle ne fonde rien : c'est
 * la confirmation qui fait d'une lecture une référence, et une faute de lecture
 * devenue référence se propagerait sans bruit à toutes les offres suivantes.
 */
const seance = (over: Partial<AuctionResult>): AuctionResult => ({
  id: "s1",
  country: "Congo",
  instrument: "BTA",
  tenor: "52 semaines",
  sessionOn: "2026-09-15",
  abondement: false,
  sourceUrl: "https://beac.int/resultats.pdf",
  sourceTitle: "RESULTATS",
  createdAt: "2026-09-16T10:00:00Z",
  updatedAt: "2026-09-16T10:00:00Z",
  ...over,
});

describe("confirmer une séance", () => {
  it("réclame le code d'émission : sans lui, la séance ne se rattache à rien", () => {
    expect(confirmable(seance({ rateAvg: 6.97 }))).toMatch(/code d'émission/);
    expect(confirmable(seance({ codeEmission: "  ", rateAvg: 6.97 }))).toMatch(/code d'émission/);
  });

  it("réclame un chiffre : une séance sans taux ne dit rien", () => {
    expect(confirmable(seance({ codeEmission: "CG1300001480" }))).toMatch(/taux/i);
  });

  it("accepte le taux limite quand le moyen pondéré n'est pas imprimé", () => {
    expect(confirmable(seance({ codeEmission: "CG1300001480", rateLimit: 7 }))).toBeNull();
  });

  it("attend un prix pour une obligation, pas un taux", () => {
    const ota = seance({ instrument: "OTA", tenor: "3 ans", codeEmission: "CG2A00000668", rateAvg: 6 });
    expect(confirmable(ota)).toMatch(/[Pp]rix/);
    expect(confirmable({ ...ota, priceAvg: 90 })).toBeNull();
  });

  it("laisse passer ce que tous les Trésors n'impriment pas", () => {
    // Ni couverture, ni nombre de soumissionnaires, ni montants : la séance se
    // confirme quand même. Exiger l'exhaustivité reviendrait à refuser la moitié
    // des communiqués de la zone.
    expect(confirmable(seance({ codeEmission: "CG1300001480", rateAvg: 6.97 }))).toBeNull();
  });
});

describe("la durée, lue dans le titre du communiqué", () => {
  it("se normalise, quelle que soit la main qui l'a écrite", () => {
    expect(tenorOf("COMMUNIQUE DANNONCE DE LEMISSION DES BTA 52 SEMAINES DU LUNDI 21 SEPTEMBRE 2026")).toBe("52 semaines");
    expect(tenorOf("BTA 13 semaine du 22 septembre")).toBe("13 semaines");
    expect(tenorOf("OTA 3 ANS")).toBe("3 ans");
    expect(tenorOf("OTA 2 ans")).toBe("2 ans");
  });

  it("ne met pas « mois » au pluriel, qui n'en a pas", () => {
    expect(tenorOf("BTA 6 mois")).toBe("6 mois");
  });

  it("apparie ce qui doit l'être, et sépare ce qui ne doit pas", () => {
    expect(tenorOf("BTA 52 SEMAINES")).toBe(tenorOf("bta 52 semaines du lundi"));
    expect(tenorOf("BTA 26 semaines")).not.toBe(tenorOf("BTA 52 semaines"));
  });

  it("se tait quand le titre ne porte pas de durée", () => {
    expect(tenorOf("CALENDRIER DES EMISSIONS DU TRESOR")).toBeUndefined();
  });
});

describe("les montants du communiqué", () => {
  it("passent des millions imprimés aux francs stockés", () => {
    // « 15 000 » sur la pièce, quinze milliards en base.
    expect(millions(15_000)).toBe(15_000_000_000);
  });
});
