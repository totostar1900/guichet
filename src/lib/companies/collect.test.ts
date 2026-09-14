import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classify, extractLinks } from "./collect";

describe("issuer documents catalogue", () => {
  it("classifies BVMAC file names by company, kind and year", () => {
    expect(classify("https://www.bvm-ac.org/wp-content/uploads/2026/07/Etats-financiers-OHADA-SEMC-2025.pdf")).toMatchObject({ mnemo: "SEMC", kind: "etats_ohada", year: 2025 });
    expect(classify("https://www.bvm-ac.org/wp-content/uploads/2025/07/Etats-financiers-IFRS-SAFACAM-1.pdf")).toMatchObject({ mnemo: "SAF", kind: "etats_ifrs" });
    expect(classify("https://www.bvm-ac.org/wp-content/uploads/2025/12/Fiche-signaletique-SCG-Re-2024.pdf")).toMatchObject({ mnemo: "SCGRE", kind: "fiche", year: 2024 });
    expect(classify("https://www.bvm-ac.org/wp-content/uploads/2024/11/LA-REGIONALE-ETATS-FINANCIERS-30-06-24-2.pdf")).toMatchObject({ mnemo: "REG", kind: "rapport_semestriel" });
    expect(classify("https://www.bvm-ac.org/wp-content/uploads/2025/07/RAPPORT-DE-GESTION-BANGE-2024.pdf")).toMatchObject({ mnemo: "BANGE", kind: "rapport_gestion", year: 2024 });
  });
  it("extracts the document links of the listed-companies page", () => {
    const html = readFileSync(new URL("./__fixtures__/societes-cotees.html", import.meta.url), "utf8");
    const links = extractLinks(html);
    expect(links.length).toBeGreaterThan(60);
    expect(links.some((l) => l.url.endsWith("Etats-financiers-OHADA-SEMC-2025.pdf"))).toBe(true);
    expect(links.some((l) => /FICHE-EMETTEUR-BHC/.test(l.url))).toBe(true);
  });
});
