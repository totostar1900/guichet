import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { classer } from "@/lib/market/performe";
import type { Quote } from "@/lib/domain/market";

/**
 * LE CLASSEMENT SUR UNE FENÊTRE, ET CE QU'IL REFUSE D'INVENTER.
 *
 * Trois refus, et chacun répare un chiffre faux plutôt qu'un chiffre
 * manquant : une ligne qui n'était pas cotée à la borne n'a pas de
 * performance, une ligne immobile n'a pas performé, et une obligation ne se
 * classe pas à côté d'une action.
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

describe("ce qui performe", () => {
  it("mesure la variation entre les deux bornes, et non celle de la séance", () => {
    /* « variationPct » du bulletin est celle du JOUR, et elle vaut zéro trois
       fois sur quatre : c'est précisément pour cela que la fenêtre existe. */
    const fin = [cote({ isin: "A", mnemo: "AAA", close: 120, variationPct: 0 })];
    const debut = [cote({ isin: "A", mnemo: "AAA", close: 100 })];
    const [l] = classer(fin, debut);
    expect(l.variationPct).toBeCloseTo(20, 6);
    expect(l.cours).toBe(120);
  });

  it("range de la plus forte hausse à la plus forte baisse", () => {
    const fin = [cote({ isin: "A", mnemo: "AAA", close: 90 }), cote({ isin: "B", mnemo: "BBB", close: 130 }), cote({ isin: "C", mnemo: "CCC", close: 105 })];
    const debut = [cote({ isin: "A", mnemo: "AAA", close: 100 }), cote({ isin: "B", mnemo: "BBB", close: 100 }), cote({ isin: "C", mnemo: "CCC", close: 100 })];
    expect(classer(fin, debut).map((l) => l.mnemo)).toEqual(["BBB", "CCC", "AAA"]);
  });

  /* BGFI HOLDING EST ENTRÉE À LA COTE LE 26 AOÛT 2026. Lui prêter une
     variation depuis une séance où elle n'était pas cotée donnerait un
     chiffre inventé, et ce serait le plus gros du classement. */
  it("n'invente pas la performance d'une ligne absente de la borne", () => {
    const fin = [cote({ isin: "NEUVE", mnemo: "NEW", close: 150 })];
    expect(classer(fin, [])).toEqual([]);
  });

  it("écarte ce qui n'a pas bougé sur la fenêtre", () => {
    /* Une ligne à « 0,0 % » n'a pas performé : l'inscrire remplirait le
       classement de lignes immobiles, ce que la fenêtre évitait. */
    const fin = [cote({ isin: "A", mnemo: "AAA", close: 100.02 })];
    const debut = [cote({ isin: "A", mnemo: "AAA", close: 100 })];
    expect(classer(fin, debut)).toEqual([]);
  });

  /* UNE OBLIGATION SE COTE EN POUR-CENT DU NOMINAL et son mouvement dit
     l'état des taux ; une action se cote en francs et dit celui de la
     société. Les classer ensemble compare deux grandeurs qui n'ont ni la
     même unité ni la même cause. */
  it("ne classe que les actions", () => {
    const fin = [cote({ isin: "O", mnemo: "OTA", instrument: "obligation", close: 102 }), cote({ isin: "A", mnemo: "AAA", close: 120 })];
    const debut = [cote({ isin: "O", mnemo: "OTA", instrument: "obligation", close: 100 }), cote({ isin: "A", mnemo: "AAA", close: 100 })];
    expect(classer(fin, debut).map((l) => l.mnemo)).toEqual(["AAA"]);
  });

  it("ne divise pas par un cours absent", () => {
    const fin = [cote({ isin: "A", mnemo: "AAA", close: 120 })];
    const debut = [cote({ isin: "A", mnemo: "AAA", close: 0 })];
    expect(classer(fin, debut)).toEqual([]);
  });
  /* LE COÛT EST LA RAISON D'ÊTRE DE CE FICHIER, donc il se garde.
     « indexPageData » répond à la même question en une dizaine de requêtes,
     dont sept non bornées — deux mille cotations PAR LIGNE cotée. C'est juste
     sur la page du marché ; c'est hors de prix sur la page d'arrivée. Le jour
     où quelqu'un « simplifie » en rappelant « indexPageData » ou en lisant
     l'histoire ligne par ligne, rien ne casse : la page ralentit, et
     personne ne fait le lien. */
  it("ne lit que trois fois, et jamais l'histoire d'une ligne", () => {
    const src = fs.readFileSync(path.join(__dirname, "../lib/market/performe.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect((src.match(/r\.listBulletins\(/g) ?? []).length, "le calendrier des séances n'est plus lu une seule fois").toBe(1);
    expect((src.match(/r\.quotesOn\(/g) ?? []).length, "les deux bornes ne sont plus lues en deux fois exactement").toBe(2);
    expect(src, "la lecture dédiée rappelle « indexPageData », qu'elle existait pour éviter").not.toContain("indexPageData");
    expect(src, "la lecture dédiée est repassée à l'histoire ligne par ligne : une requête par société cotée").not.toContain("listQuotes");
    expect(src, "la borne des bulletins a disparu : la lecture n'est plus bornée").toMatch(/listBulletins\(BULLETINS_LUS\)/);
  });
});
