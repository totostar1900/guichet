import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { classerSurFenetre, debutDeFenetre, MOIS_FENETRE } from "@/lib/market/performe";
import type { Quote } from "@/lib/domain/market";

/**
 * LE CLASSEMENT SUR TROIS MOIS, ET CE QU'IL REFUSE D'INVENTER (3 novembre 2026).
 *
 * Deux refus, et chacun répare un chiffre faux plutôt qu'un chiffre manquant : une ligne entrée à la cote
 * pendant la fenêtre ne part pas d'un cours qu'elle n'avait pas, et une obligation ne se classe pas à côté
 * d'une action. Et UN ACCEPT : une ligne immobile y figure, à 0,0 % — « toujours deux à trois lignes ».
 */
const cote = (over: Partial<Quote>): Quote =>
  ({
    isin: "CM0000000001",
    sessionDate: "2026-10-23",
    bulletinNo: 1284,
    instrument: "action",
    mnemo: "AAA",
    issuer: "Société A",
    designation: "Société A",
    previousClose: 100,
    previousDate: "2026-10-22",
    open: 100,
    close: 100,
    thresholdHigh: 110,
    thresholdLow: 90,
    variationPct: 0,
    referenceNext: 100,
    volumeTraded: 0,
    valueTraded: 0,
    trades: 0,
    status: "NC",
    ...over,
  }) as Quote;

const DEPUIS = "2026-08-02";

describe("ce qui performe sur trois mois", () => {
  it("mesure la variation entre la première et la dernière cotation de la fenêtre, pas celle de la séance", () => {
    const cotes = [cote({ isin: "A", mnemo: "AAA", sessionDate: "2026-08-03", close: 100 }), cote({ isin: "A", mnemo: "AAA", sessionDate: "2026-11-02", close: 120, variationPct: 0 })];
    const [l] = classerSurFenetre(cotes, DEPUIS);
    expect(l.variationPct).toBeCloseTo(20, 6);
    expect(l.cours).toBe(120);
    expect(l.depuis).toBe("2026-08-03");
    expect(l.entree).toBe(false);
  });

  it("garde la série des cours, du plus ancien au plus récent, pour le petit graphe", () => {
    const cotes = [
      cote({ isin: "A", sessionDate: "2026-10-01", close: 110 }),
      cote({ isin: "A", sessionDate: "2026-08-03", close: 100 }),
      cote({ isin: "A", sessionDate: "2026-09-01", close: 105 }),
    ];
    expect(classerSurFenetre(cotes, DEPUIS)[0].serie).toEqual([100, 105, 110]);
  });

  it("range de la plus forte hausse à la plus forte baisse, et départage les égalités par le mnémonique", () => {
    const paire = (isin: string, mnemo: string, fin: number) => [cote({ isin, mnemo, sessionDate: "2026-08-03", close: 100 }), cote({ isin, mnemo, sessionDate: "2026-11-02", close: fin })];
    const cotes = [...paire("A", "AAA", 90), ...paire("B", "BBB", 130), ...paire("C", "CCC", 100), ...paire("D", "DDD", 100)];
    expect(classerSurFenetre(cotes, DEPUIS).map((l) => l.mnemo)).toEqual(["BBB", "CCC", "DDD", "AAA"]);
  });

  /* BGFI HOLDING EST ENTRÉE À LA COTE LE 26 AOÛT 2026. Lui prêter un cours de départ au 3 août donnerait un
     chiffre inventé, et ce serait le plus gros du classement : sa variation part de sa première cotation. */
  it("part de la première cotation d'une ligne entrée pendant la fenêtre, et le dit", () => {
    const cotes = [cote({ isin: "N", mnemo: "NEW", sessionDate: "2026-08-26", close: 100 }), cote({ isin: "N", mnemo: "NEW", sessionDate: "2026-11-02", close: 110 })];
    const [l] = classerSurFenetre(cotes, DEPUIS);
    expect(l.entree).toBe(true);
    expect(l.depuis).toBe("2026-08-26");
    expect(l.variationPct).toBeCloseTo(10, 6);
  });

  it("garde ce qui n'a pas bougé, à 0,0 % : un bloc ne se vide pas sur un marché calme", () => {
    const cotes = [cote({ isin: "A", mnemo: "AAA", sessionDate: "2026-08-03", close: 100 }), cote({ isin: "A", mnemo: "AAA", sessionDate: "2026-11-02", close: 100 })];
    const [l] = classerSurFenetre(cotes, DEPUIS);
    expect(l).toBeDefined();
    expect(l.variationPct).toBe(0);
  });

  /* UNE OBLIGATION SE COTE EN POUR-CENT DU NOMINAL et son mouvement dit l'état des taux ; une action se cote en
     francs et dit celui de la société. Les classer ensemble compare deux grandeurs qui n'ont ni la même unité
     ni la même cause. */
  it("ne classe que les actions", () => {
    const cotes = [
      cote({ isin: "O", mnemo: "OTA", instrument: "obligation", sessionDate: "2026-08-03", close: 100 }),
      cote({ isin: "O", mnemo: "OTA", instrument: "obligation", sessionDate: "2026-11-02", close: 102 }),
      cote({ isin: "A", mnemo: "AAA", sessionDate: "2026-08-03", close: 100 }),
      cote({ isin: "A", mnemo: "AAA", sessionDate: "2026-11-02", close: 120 }),
    ];
    expect(classerSurFenetre(cotes, DEPUIS).map((l) => l.mnemo)).toEqual(["AAA"]);
  });

  it("ne fait pas une performance d'une seule cotation, ni d'un cours absent ou nul", () => {
    expect(classerSurFenetre([cote({ isin: "A", sessionDate: "2026-11-02", close: 120 })], DEPUIS)).toEqual([]);
    expect(classerSurFenetre([cote({ isin: "A", sessionDate: "2026-08-03", close: 0 }), cote({ isin: "A", sessionDate: "2026-11-02", close: 120 })], DEPUIS)).toEqual([]);
  });

  it("n'écrit pas ce qui précède la fenêtre", () => {
    const cotes = [cote({ isin: "A", sessionDate: "2026-06-01", close: 50 }), cote({ isin: "A", sessionDate: "2026-08-03", close: 100 }), cote({ isin: "A", sessionDate: "2026-11-02", close: 110 })];
    expect(classerSurFenetre(cotes, DEPUIS)[0].serie).toEqual([100, 110]);
  });

  it("la fenêtre est de trois mois civils avant la dernière séance", () => {
    expect(MOIS_FENETRE).toBe(3);
    expect(debutDeFenetre("2026-11-02")).toBe("2026-08-02");
    expect(debutDeFenetre("2026-05-31")).toBe("2026-03-03");
  });

  /* LE COÛT EST LA RAISON D'ÊTRE DE CE FICHIER, donc il se garde. « indexPageData » répond à la même question en
     une dizaine de requêtes, dont sept non bornées. Le classement ET le graphe lisent la même chose : le dernier
     bulletin, puis les cotations des actions depuis la borne, en UNE requête. */
  it("ne lit que deux fois, et jamais l'histoire d'une ligne", () => {
    const src = fs.readFileSync(path.join(__dirname, "../lib/market/performe.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect((src.match(/r\.listBulletins\(/g) ?? []).length, "la date de fin n'est plus lue une seule fois").toBe(1);
    expect((src.match(/r\.actionQuotesSince\(/g) ?? []).length, "les cotations ne sont plus lues en une seule requête").toBe(1);
    expect(src, "la lecture dédiée rappelle « indexPageData », qu'elle existait pour éviter").not.toContain("indexPageData");
    expect(src, "la lecture dédiée est repassée à l'histoire ligne par ligne : une requête par société cotée").not.toContain("listQuotes");
    expect(src, "la lecture dédiée relit toutes les séances d'un jour").not.toContain("quotesOn");
  });
});
