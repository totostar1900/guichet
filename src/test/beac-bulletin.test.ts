import { describe, expect, it } from "vitest";
import { abscisses, calibrer, listerBulletins, series, tresorsDuTitre, type MotPdf } from "@/lib/market/beac-bulletin";

/**
 * Le relevé de la courbe de la BEAC se vérifie sur ce qui l'a fait échouer.
 *
 * Chaque cas ci-dessous est un piège rencontré pour de vrai sur ses PDF, et
 * non un cas imaginé : un bulletin qui est un scan, un « 25,00 » venu de la
 * table voisine, et la rangée des marques de l'axe prise pour une courbe.
 */
describe("le relevé du bulletin de la BEAC", () => {
  describe("la liste des bulletins", () => {
    const page = `
      <a href="/wp-content/uploads/Statistiques-mensuelles-juillet-2026.pdf">Statistiques Mensuelles du Marché des valeurs du Trésor de la CEMAC - N° 60 juillet 2026</a>
      <a href="https://www.beac.int/x/Statistiques-mensuelles-juin-2026.pdf">Statistiques Mensuelles ... - N° 59 juin 2026</a>
      <a href="/y/janvier-2026.pdf">Statistiques Mensuelles ... - N° 54 janvier 2026</a>
      <a href="/z/autre.pdf">Programme annuel des émissions</a>`;

    it("rend les bulletins du plus récent au plus ancien", () => {
      expect(listerBulletins(page).map((b) => b.numero)).toEqual([60, 59, 54]);
    });

    it("lit le mois derrière son nom français", () => {
      expect(listerBulletins(page)[0].mois).toBe("2026-07");
      expect(listerBulletins(page)[2].mois).toBe("2026-01");
    });

    it("complète une adresse relative et laisse une absolue", () => {
      expect(listerBulletins(page)[0].url).toBe("https://www.beac.int/wp-content/uploads/Statistiques-mensuelles-juillet-2026.pdf");
      expect(listerBulletins(page)[1].url).toBe("https://www.beac.int/x/Statistiques-mensuelles-juin-2026.pdf");
    });

    it("ignore ce qui n'est pas un bulletin numéroté et daté", () => {
      expect(listerBulletins(page)).toHaveLength(3);
    });
  });

  describe("la calibration de l'ordonnée", () => {
    const axe = (n: number): MotPdf[] => Array.from({ length: n }, (_, i) => ({ s: `${i * 2},00`, x: 40, y: 500 + i * 21.65 }));

    it("pose l'échelle sur une pile de graduations", () => {
      const c = calibrer(axe(5));
      expect(typeof c).not.toBe("string");
      if (typeof c === "string") return;
      expect(c.pctDe(500)).toBeCloseTo(0, 6);
      expect(c.pctDe(500 + 4 * 21.65)).toBeCloseTo(8, 6);
    });

    it("écarte un nombre venu de la table voisine", () => {
      /* « 25,00 » figure dans les taux de participation collés au graphique et
         posait l'échelle de zéro à vingt-cinq au lieu de seize. */
      const c = calibrer([...axe(5), { s: "25,00", x: 300, y: 480 }]);
      if (typeof c === "string") throw new Error(c);
      expect(c.n).toBe(5);
      expect(c.pctDe(500 + 4 * 21.65)).toBeCloseTo(8, 6);
    });

    it("refuse une pile qui n'est pas droite", () => {
      const tordue = axe(5);
      tordue[2] = { ...tordue[2], y: tordue[2].y + 12 };
      expect(calibrer(tordue)).toBe("les graduations de l'axe ne sont pas alignées");
    });

    it("refuse un bulletin sans graduations : c'est un scan", () => {
      expect(calibrer([])).toBe("aucune courbe des taux dans ce bulletin");
      expect(calibrer(axe(2))).toBe("aucune courbe des taux dans ce bulletin");
    });
  });

  describe("les durées en abscisse", () => {
    it("lit les mois et les années, virgule comprise", () => {
      const mots: MotPdf[] = [
        { s: "3 mois", x: 80, y: 10 },
        { s: "6 mois", x: 105, y: 10 },
        { s: "1 an", x: 130, y: 10 },
        { s: "1,5 ans", x: 155, y: 10 },
        { s: "3,5A", x: 180, y: 10 },
        { s: "15 ans", x: 205, y: 10 },
      ];
      expect(abscisses(mots, 40).map((a) => a.annees)).toEqual([0.25, 0.5, 1, 1.5, 3.5, 15]);
    });

    it("ignore ce qui est à gauche de l'axe", () => {
      expect(abscisses([{ s: "3 mois", x: 20, y: 10 }], 40)).toEqual([]);
    });
  });

  describe("les séries tirées des tracés", () => {
    const abs = [0.25, 0.5, 1, 2, 3].map((annees, i) => ({ annees, x: 80 + i * 25 }));
    const cal = { pctDe: (y: number) => y / 10 };
    const montante = [60, 70, 80, 90, 95].map((y, i) => ({ x: 80 + i * 25, y }));
    const plate = Array.from({ length: 40 }, (_, i) => ({ x: 67 + i * 12, y: 520 }));

    it("écarte la rangée des marques de l'axe, qui est plate", () => {
      const s = series([plate, montante], cal, abs, ["Cameroun"]);
      if (typeof s === "string") throw new Error(s);
      expect(s).toHaveLength(1);
      expect(s[0].pays).toBe("Cameroun");
      expect(s[0].points[0]).toEqual({ annees: 0.25, pct: 6 });
    });

    it("nomme les séries dans l'ordre de la légende", () => {
      const autre = [50, 60, 75, 85, 88].map((y, i) => ({ x: 80 + i * 25, y }));
      const s = series([montante, autre], cal, abs, ["Cameroun", "Congo"]);
      if (typeof s === "string") throw new Error(s);
      expect(s.map((x) => x.pays)).toEqual(["Cameroun", "Congo"]);
    });

    it("refuse des taux hors du monde", () => {
      const folle = [60, 70, 80, 90, 4000].map((y, i) => ({ x: 80 + i * 25, y }));
      expect(series([folle], cal, abs, ["Cameroun"])).toBe("les taux relevés sortent du monde");
    });

    it("refuse quand il n'y a aucune courbe", () => {
      expect(series([plate], cal, abs, ["Cameroun"])).toBe("aucune courbe des taux dans ce bulletin");
    });

    it("ne garde qu'un point par durée", () => {
      const double = [...montante, { x: 80, y: 61 }];
      const s = series([double], cal, abs, ["Cameroun"]);
      if (typeof s === "string") throw new Error(s);
      expect(s[0].points.filter((p) => p.annees === 0.25)).toHaveLength(1);
    });
  });

  describe("les Trésors nommés par le titre", () => {
    it("les lit dans l'ordre où la figure les écrit", () => {
      expect(tresorsDuTitre("2 - Courbes des taux de rendement des valeurs du Trésor de la CEMAC ( Cameroun, Congo et Gabon)")).toEqual(["Cameroun", "Congo", "Gabon"]);
    });

    it("rend une liste vide quand la figure n'est pas là", () => {
      expect(tresorsDuTitre("C - Participation aux émissions")).toEqual([]);
    });
  });
});
