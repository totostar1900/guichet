import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { debutDePeriode, periodeOuDefaut } from "@/app/indice/Periode";

/**
 * « SUR LA PÉRIODE » (8 novembre 2026, option A de « l'indice et la note ») : la page de l'indice montre les graphes et tableaux de la note, sur la période choisie, par le même calcul.
 */
const lire = (f: string) => readFileSync(`${process.cwd()}/${f}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const BODY = lire("src/app/indice/IndiceBody.tsx");
const PERIODE = lire("src/app/indice/Periode.tsx");
const QUARTER = lire("src/lib/market/index-quarter.ts");

describe("la période se lit dans l'adresse", () => {
  it("quatre périodes, trois mois par défaut, une valeur inconnue retombe sur le défaut", () => {
    expect(periodeOuDefaut()).toBe("3m");
    expect(periodeOuDefaut("ytd")).toBe("ytd");
    expect(periodeOuDefaut("tout")).toBe("3m");
  });
  it("le début de la période part de la dernière séance lue", () => {
    expect(debutDePeriode("ytd", "2026-09-30")).toBe("2026-01-01");
    expect(debutDePeriode("1m", "2026-09-30")).toBe("2026-08-31");
    expect(debutDePeriode("12m", "2026-09-30")).toBe("2025-09-30");
  });
});

describe("une seule lecture, deux endroits", () => {
  it("la page de l'indice rend la section avec les figures de la note", () => {
    expect(BODY).toMatch(/<Periode vue=\{vue\}/);
    expect(BODY, "la page n'a plus de sommaire « Sur cette page »").not.toMatch(/Sommaire|Sur cette page/);
    expect(PERIODE).toMatch(/from "\.\/note\/\[trimestre\]\/Figures"/);
    expect(PERIODE).toMatch(/<Comparaison /);
    expect(PERIODE).toMatch(/<ContribBars /);
  });
  it("la note n'a pas sa propre copie du calcul : elle lit celui de la période", () => {
    expect(QUARTER).toMatch(/lignesDeLaPeriode\(d, quarter\.from, quarter\.to\)/);
    expect(QUARTER).toMatch(/statsDeSeance\(inQ\)/);
    expect(QUARTER, "la note recalcule la part de la finance").not.toMatch(/const FINANCE =/);
  });
  it("la page ne recopie pas le commentaire : elle renvoie à la note", () => {
    expect(PERIODE).toMatch(/quarterNoteHref/);
    expect(PERIODE).not.toMatch(/ne dit pas|ne mesure pas/);
  });
  it("les quatre tuiles (repli maximal…) suivent tout de suite la contribution de chaque société", () => {
    const contrib = PERIODE.indexOf("<ContribBars");
    const tuiles = PERIODE.indexOf("<dl className={styles.stats}>");
    const societes = PERIODE.indexOf('t("Les sociétés de la cote sur la période")');
    expect(contrib).toBeGreaterThan(0);
    expect(tuiles, "les tuiles ne suivent plus la contribution").toBeGreaterThan(contrib);
    expect(tuiles, "les tuiles sont passées après le tableau des sociétés").toBeLessThan(societes);
  });
  it("la période est dans l'adresse des liens du tableau des séances", () => {
    expect(BODY).toMatch(/if \(periode !== "3m"\) u\.set\("periode", periode\)/);
  });
});
