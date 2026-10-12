import { describe, expect, it } from "vitest";
import { dateDeSerieExcel } from "@/lib/market/boc-parse";

/**
 * LA DATE RESTÉE EN NUMÉRO DE SÉRIE EXCEL.
 *
 * Le bulletin sort d'un tableur, et la cellule de la date précédente de
 * FCP ECOBANK OBLIGATAIRE CEMAC n'a jamais reçu son format : elle traverse la
 * chaîne en nombre nu. 65 des 68 débris OPCVM de la base tiennent à cela.
 *
 * CE QUI SE TESTE ICI N'EST PAS LA CONVERSION, qui est arithmétique, mais les
 * TROIS GARDES, et surtout le troisième. Une valeur liquidative de 46 120
 * francs est parfaitement plausible : rien dans la fenêtre des dates ne
 * distingue une date d'un montant. C'est la variation imprimée sur la rangée
 * qui tranche, parce qu'elle ne s'accorde avec les deux VL que si la lecture
 * est la bonne. Sans elle, cette tolérance serait une invention.
 */
describe("une date restée en numéro de série Excel", () => {
  /* Les deux cas réels de la base, avec leur rangée imprimée. */
  it("lit 46 120,00 comme le 8 avril 2026, une semaine avant la VL courante", () => {
    expect(dateDeSerieExcel("46 120,00", "15/04/2026", 14434, 14454, "0,14%")).toBe("08/04/2026");
  });

  it("lit 46 185,00 comme le 12 juin 2026", () => {
    expect(dateDeSerieExcel("46 185,00", "17/06/2026", 14603, 14624, "0,14%")).toBe("12/06/2026");
  });

  it("ancre la conversion : 45 292 est le 1er janvier 2024", () => {
    /* Une ancre connue, pour que la table de conversion ne repose pas sur la
       mémoire de celui qui l'a écrite. 2024-01-01 est le repère usuel. */
    expect(dateDeSerieExcel("45 292,00", "08/01/2024", 100, 101, "1,00%")).toBe("01/01/2024");
  });

  describe("les trois gardes", () => {
    it("1 · refuse un nombre hors de la fenêtre 2015-2030", () => {
      // 12 000 serait 1932, et 60 000 serait 2064 : ce sont des montants.
      expect(dateDeSerieExcel("12 000,00", "15/04/2026", 11900, 12000, "0,84%")).toBeUndefined();
      expect(dateDeSerieExcel("60 000,00", "15/04/2026", 59500, 60000, "0,84%")).toBeUndefined();
    });

    it("1 · refuse un nombre à centimes, qu'aucune date ne porte", () => {
      expect(dateDeSerieExcel("46 120,50", "15/04/2026", 14434, 14454, "0,14%")).toBeUndefined();
    });

    it("2 · refuse une date postérieure à la VL courante", () => {
      // 46 185 = 12 juin 2026, soit APRÈS le 15 avril : l'ordre est impossible.
      expect(dateDeSerieExcel("46 185,00", "15/04/2026", 14434, 14454, "0,14%")).toBeUndefined();
    });

    it("2 · refuse un écart de plus de 400 jours", () => {
      // 42 005 = 1er janvier 2015, onze ans avant la séance.
      expect(dateDeSerieExcel("42 005,00", "15/04/2026", 14434, 14454, "0,14%")).toBeUndefined();
    });

    it("3 · LE GARDE QUI COMPTE : refuse si la variation imprimée ne s'accorde pas", () => {
      /* Mêmes nombres, mêmes dates, une variation qui ne colle pas : la
         cellule est alors un montant et non une date, et on ne touche à
         rien. C'est le seul garde capable de le dire. */
      expect(dateDeSerieExcel("46 120,00", "15/04/2026", 14434, 14454, "2,50%")).toBeUndefined();
    });

    it("3 · refuse quand la rangée ne porte aucune variation à vérifier", () => {
      expect(dateDeSerieExcel("46 120,00", "15/04/2026", 14434, 14454, undefined)).toBeUndefined();
      expect(dateDeSerieExcel("46 120,00", "15/04/2026", 14434, 14454, "-")).toBeUndefined();
    });

    it("3 · tolère l'arrondi de l'impression, et pas davantage", () => {
      /* La variation est imprimée à deux décimales, donc l'écart d'arrondi
         vaut au plus 0,005. (14454-14434)/14434 = 0,1386 %, et le bulletin
         écrit 0,14 % : l'écart de 0,0014 passe. 0,15 % serait à 0,0114 et ne
         passe pas, ce qui est voulu. */
      expect(dateDeSerieExcel("46 120,00", "15/04/2026", 14434, 14454, "0,14%")).toBe("08/04/2026");
      expect(dateDeSerieExcel("46 120,00", "15/04/2026", 14434, 14454, "0,15%")).toBeUndefined();
    });
  });
});
