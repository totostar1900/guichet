import { describe, expect, it } from "vitest";
import { anomalies, dureeNormale, echelleDesPrefixes, prefixeDuree } from "@/lib/market/anomalies";
import type { AuctionResult } from "@/lib/market/auction-results";

/**
 * Les quatre témoins nés du sujet des bornes.
 *
 * Chacun a la même forme : un deuxième témoin contredit un champ. C'est la
 * seule façon d'attraper une erreur sans rouvrir la pièce, et c'est ce qui les
 * distingue d'une règle de saisie. Une séance peut être complète, cohérente en
 * elle-même, relue, et fausse.
 */
const seance = (p: Partial<AuctionResult> = {}): AuctionResult =>
  ({
    id: p.id ?? Math.random().toString(36).slice(2),
    country: "Congo",
    sessionOn: "2025-04-15",
    instrument: "BTA",
    tenor: "13 semaines",
    sourceUrl: "https://exemple/piece.pdf",
    sourceTitle: "Communiqué",
    createdAt: "2025-04-16",
    updatedAt: "2025-04-16",
    ...p,
  }) as AuctionResult;

const clefs = (rows: AuctionResult[]) => anomalies(rows).map((a) => a.quoi.key);

describe("le crible, sur les bornes et les durées", () => {
  describe("les colonnes échangées", () => {
    it("attrape un prix minimum au-dessus de son maximum", () => {
      const a = anomalies([seance({ instrument: "OTA", tenor: "2 ans", priceMin: 91, priceMax: 90 })]);
      expect(a.map((x) => x.quoi.key)).toContain("prix minimum {a} au-dessus du maximum {b} : les colonnes sont échangées");
      expect(a[0].quoi.params).toMatchObject({ a: 91, b: 90 });
    });

    it("dit d'un taux inversé que ce n'est jamais une convention", () => {
      expect(clefs([seance({ rateMin: 7.2, rateMax: 6.4 })])).toContain("taux minimum {a} au-dessus du maximum {b}, ce qui n'est jamais une convention");
    });

    it("ne dit rien de bornes dans l'ordre", () => {
      expect(clefs([seance({ instrument: "OTA", tenor: "2 ans", priceMin: 90, priceMax: 91 })])).toEqual([]);
      expect(clefs([seance({ rateMin: 6.4, rateMax: 7.2 })])).toEqual([]);
    });
  });

  describe("le moyen contre le limite", () => {
    it("refuse un prix moyen sous le prix limite", () => {
      expect(clefs([seance({ instrument: "OTA", tenor: "2 ans", priceAvg: 89, priceLimit: 90 })])).toContain("prix moyen {a} sous le prix limite {b}");
    });

    it("refuse un taux moyen au-dessus du taux limite", () => {
      expect(clefs([seance({ rateAvg: 7.2, rateLimit: 7 })])).toContain("taux moyen {a} au-dessus du taux limite {b}");
    });

    it("accepte le sens normal de chacun", () => {
      /* Le limite est le dernier servi : pire que la moyenne des servis, dans
         le sens propre à chaque instrument. */
      expect(clefs([seance({ instrument: "OTA", tenor: "2 ans", priceAvg: 90.93, priceLimit: 90 })])).toEqual([]);
      expect(clefs([seance({ rateAvg: 6.86, rateLimit: 7 })])).toEqual([]);
    });
  });

  describe("les doublons", () => {
    it("signale les deux lignes d'un même code sur une même séance", () => {
      const a = anomalies([
        seance({ id: "un", codeEmission: "CG2A00000072", sourceUrl: "https://a.pdf" }),
        seance({ id: "deux", codeEmission: "CG2A00000072", sourceUrl: "https://b.pdf" }),
      ]);
      expect(a.filter((x) => x.quoi.key.startsWith("{n} enregistrements"))).toHaveLength(2);
    });

    it("laisse tranquilles deux lignes distinctes de la même séance", () => {
      /* Un Trésor adjuge plusieurs lignes le même jour : deux codes, deux lignes. */
      const a = anomalies([seance({ id: "un", codeEmission: "CG2A00000072" }), seance({ id: "deux", codeEmission: "CG2A00000080" })]);
      expect(a.filter((x) => x.quoi.key.startsWith("{n} enregistrements"))).toEqual([]);
    });
  });

  describe("l'échelle des préfixes, dérivée du dépôt", () => {
    const troupe = (prefixe: string, duree: string, n: number) =>
      Array.from({ length: n }, (_, i) => seance({ id: `${prefixe}-${i}`, codeEmission: `CG${prefixe}0000000${i}`, tenor: duree }));

    it("lit la durée que la majorité donne à un préfixe", () => {
      const e = echelleDesPrefixes(troupe("11", "13 semaines", 5));
      expect(e.get("11")).toMatchObject({ duree: "13 semaines", sur: 5, total: 5 });
    });

    it("ignore un préfixe vu moins de trois fois : il ne prouve rien", () => {
      expect(echelleDesPrefixes(troupe("2C", "7 ans", 2)).has("2C")).toBe(false);
    });

    it("attrape la minoritaire contre sa propre majorité", () => {
      const rows = [...troupe("11", "13 semaines", 5), seance({ id: "fautive", codeEmission: "CG1100009999", tenor: "26 semaines" })];
      const a = anomalies(rows).filter((x) => x.quoi.key.startsWith("durée"));
      expect(a).toHaveLength(1);
      expect(a[0].id).toBe("fautive");
      expect(a[0].quoi.params).toMatchObject({ d: "26 semaines", k: "11", attendu: "13 semaines" });
    });

    it("apprend d'elle-même une durée nouvelle dès que trois séances la portent", () => {
      const e = echelleDesPrefixes(troupe("14", "8 semaines", 3));
      expect(e.get("14")?.duree).toBe("8 semaines");
    });
  });

  describe("les outils de lecture", () => {
    it("prend les deux caractères qui suivent le pays", () => {
      expect(prefixeDuree("CG2A00000072")).toBe("2A");
      expect(prefixeDuree("GA1100001807")).toBe("11");
      expect(prefixeDuree("")).toBeUndefined();
      expect(prefixeDuree(undefined)).toBeUndefined();
    });

    it("ramène une durée à une forme comparable", () => {
      expect(dureeNormale("13 semaines")).toBe("13 semaines");
      expect(dureeNormale("13 SEMAINES")).toBe("13 semaines");
      expect(dureeNormale("2 ans")).toBe("2 ans");
      expect(dureeNormale("3,5 ans")).toBe("3,5 ans");
      expect(dureeNormale(undefined)).toBeUndefined();
    });
  });
});
