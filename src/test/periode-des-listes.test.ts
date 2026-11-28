import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Quote } from "@/lib/domain/market";
import { estPeriodeDeLaListe, PERIODE_DE_LA_LISTE_PAR_DEFAUT, PERIODES_DE_LA_LISTE } from "@/lib/market/periodes";
import { periodesDesCours } from "@/lib/market/performe";

/* LA PÉRIODE, SUR LA LIGNE DE LA RECHERCHE (28 novembre 2026) : 3 mois, 6 mois, 1 an sur Titres ; le même sélecteur sur Fonds. */
const q = (isin: string, sessionDate: string, close: number) => ({ instrument: "action", isin, mnemo: isin.slice(-3), designation: isin, sessionDate, close, volumeTraded: 10, trades: 1 }) as unknown as Quote;
const lire = (f: string) => readFileSync(f, "utf8");

describe("les trois périodes de la liste des titres", () => {
  it("sont 3 mois, 6 mois et 1 an, la première par défaut ; le 1 mois et le début d'année n'y sont pas", () => {
    expect(PERIODES_DE_LA_LISTE.map((p) => p.cle)).toEqual(["3m", "6m", "1a"]);
    expect(PERIODE_DE_LA_LISTE_PAR_DEFAUT).toBe("3m");
    expect(estPeriodeDeLaListe("6m")).toBe(true);
    expect(estPeriodeDeLaListe("debut")).toBe(false);
    expect(estPeriodeDeLaListe(null)).toBe(false);
  });

  it("une action cotée depuis plus d'un an a une variation sur chaque période, chacune de sa propre base", () => {
    const cours = [q("A", "2025-11-03", 100), q("A", "2026-05-04", 120), q("A", "2026-08-03", 150), q("A", "2026-11-03", 165)];
    const p = periodesDesCours(cours, "2026-11-03").A;
    expect(p["3m"]?.variationPct).toBeCloseTo(10, 5);
    expect(p["6m"]?.variationPct).toBeCloseTo(37.5, 5);
    expect(p["1a"]?.variationPct).toBeCloseTo(65, 5);
    expect(p["1a"]?.serie).toHaveLength(4);
  });

  it("une ligne entrée à la cote en cours de période n'a pas de chiffre sur 6 mois ni 1 an ; sur 3 mois elle garde la règle de « Ce qui performe »", () => {
    const cours = [q("B", "2026-09-10", 100), q("B", "2026-11-03", 110)];
    const p = periodesDesCours(cours, "2026-11-03").B;
    expect(p["3m"]?.variationPct).toBeCloseTo(10, 5);
    expect(p["6m"]).toBeUndefined();
    expect(p["1a"]).toBeUndefined();
  });
});

describe("le sélecteur est un, sur la ligne de la recherche, et la liste le suit", () => {
  const ob = lire("src/components/OfferBrowser.tsx");
  const fb = lire("src/app/fonds/FundsBrowser.tsx");
  it("Titres et Fonds posent le même composant sur la barre, à côté de l'affichage", () => {
    expect(ob, "Titres n'a plus son sélecteur").toMatch(/<ChoixPeriode\s/);
    expect(fb, "Fonds n'a plus son sélecteur").toMatch(/<ChoixPeriode\s/);
    expect(fb, "l'ancienne rangée de boutons est revenue dans le bandeau de Fonds").not.toMatch(/ChoixFenetre/);
  });
  it("le tri, le filtre hausse / baisse et la colonne nomment la période choisie", () => {
    expect(ob).toMatch(/FACETTE_DE_VARIATION\[periode\]/);
    expect(ob).toMatch(/TRI_DE_VARIATION\[periode\]/);
    expect(ob).toMatch(/SOUS_LA_VARIATION\[periode\]/);
    expect(ob, "« Tout effacer » ne défait plus la période").toMatch(/mesure: undefined, periode: undefined/);
  });
  it("une période que les données ne servent pas reste dans la liste, éteinte, avec sa raison", () => {
    expect(ob).toMatch(/indisponible: periodesServies\[p\.cle\] \? undefined : t\("historique insuffisant"\)/);
    expect(fb).toMatch(/indisponible: comptes\[f\.id\] === 0 \? t\("historique insuffisant"\) : undefined/);
    expect(lire("src/components/ChoixPeriode.tsx")).toMatch(/disabled: Boolean\(o\.indisponible\)/);
  });
  it("la liste s'ouvre sur la mention « Performances passées »", () => {
    expect(lire("src/components/ChoixPeriode.tsx")).toMatch(/t\("Performances passées"\)/);
  });
  it("la cote lit les cotations UNE fois pour les trois périodes et les fenêtres de l'extension", () => {
    expect(lire("src/app/TitresBody.tsx")).toMatch(/lectureDeLaCote\(\)/);
    expect(lire("src/lib/market/performe.ts")).toMatch(/export async function lectureDeLaCote/);
  });
});
