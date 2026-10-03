import { describe, expect, it } from "vitest";
import { LIEU_LABEL, SECTIONS, SECTION_LABEL, SECTION_NOTE, SEGMENT_BOC, lieuDe, sectionDe, type Section } from "@/lib/domain/sections";
import { ISSUER_REGISTRY } from "@/data/issuer-registry";
import { EN_ALL } from "@/i18n/core";
import type { Offer } from "@/lib/domain/types";

/**
 * TROIS LIEUX, ET LEURS SECTIONS.
 *
 * Ce que ce cliquet tient n'est pas un goût de rangement : c'est que chaque
 * ligne ait UNE place et que les places se répondent. Mesuré le 4 octobre
 * 2026 : neuf séances closes depuis deux à trois semaines dormaient dans la
 * liste des titres à l'état « publié », parce qu'un bon du Trésor n'est jamais
 * coté et que la liste ne retirait une ligne qu'à sa cotation.
 *
 * LES TROIS SECTIONS OBLIGATAIRES DE LA COTE SONT CELLES DU BULLETIN. Le BOC
 * imprime « etats », « regionales », « privees ». Nous déduisons la section de
 * la famille de l'émetteur, parce qu'une ligne du primaire n'a pas de bulletin
 * et doit bien se ranger aussi ; le contrôle ci-dessous vérifie que les deux
 * chemins disent la même chose sur les émetteurs que nous connaissons.
 */
const ligne = (o: Partial<Offer>): Offer => ({ id: "x", kind: "MARCHE", market: "BVMAC", instrument: "obligation", title: "", isin: "", issuer: "", country: "Gabon", countryName: "Gabon", status: "published", settleOn: "2026-10-07", nominal: 10_000, commissionPct: 0.5, sizeLabel: "", operation: "secondaire", documents: [], version: 1, ...o }) as unknown as Offer;

describe("le lieu dit comment on achète", () => {
  it("une séance de la BEAC n'est pas la cote", () => {
    /* Le défaut corrigé : un BTA clôturé restait parmi les titres négociables,
       faute d'être cotable un jour. */
    expect(lieuDe({ kind: "BTA" })).toBe("adjudications");
    expect(lieuDe({ kind: "OTA" })).toBe("adjudications");
    expect(lieuDe({ kind: "RACHAT" })).toBe("adjudications");
    expect(lieuDe({ kind: "MARCHE" })).toBe("cote");
    expect(lieuDe({ kind: "FONDS" })).toBe("fonds");
  });

  it("une émission de la BVMAC reste sur la cote, où elle atterrira", () => {
    // Ni une séance de la BEAC, ni encore un cours : un prix fixé et une fenêtre.
    expect(lieuDe({ kind: "APE" })).toBe("cote");
    expect(lieuDe({ kind: "ACTIONS" })).toBe("cote");
    expect(sectionDe(ligne({ kind: "APE" }))).toBe("souscription");
    expect(sectionDe(ligne({ kind: "ACTIONS" }))).toBe("souscription");
  });

  it("chaque section appartient à un lieu et à un seul", () => {
    const vues = Object.values(SECTIONS).flat();
    expect(new Set(vues).size, "une section est listée dans deux lieux").toBe(vues.length);
  });
});

describe("les sections de la cote sont celles du bulletin", () => {
  it("un État, la BDEAC et une entreprise ne se suivent plus sous un seul titre", () => {
    expect(sectionDe(ligne({ title: "État du Gabon · EOG MT 6,6 % NET 2024-2027-II", isin: "GA0000020552", issuer: "État du Gabon" }))).toBe("etats");
    expect(sectionDe(ligne({ title: "BDEAC · BDEAC 5,95 % NET 2024-2029", isin: "CG0000020436", issuer: "BDEAC", country: "Congo" }))).toBe("regionales");
    expect(sectionDe(ligne({ title: "Alios Finance · ALIOS 6,5 % BRUT 2023-2028", isin: "CM0000020412", issuer: "Alios Finance", country: "Cameroun" }))).toBe("entreprises");
  });

  it("une action est le capital, pas une créance", () => {
    expect(sectionDe(ligne({ instrument: "action", title: "SEMC", isin: "CM0000010009", issuer: "SEMC", country: "Cameroun" }))).toBe("actions");
  });

  it("chaque famille du registre tombe dans une section de la cote", () => {
    /* Une famille d'émetteur neuve qui ne serait rangée nulle part finirait
       dans « Entreprises » par défaut, sans que rien ne le dise. */
    const attendu: Record<string, Section> = { etat: "etats", supranational: "regionales", banque: "entreprises", societe: "entreprises", gestion: "entreprises" };
    const inconnues = [...new Set(ISSUER_REGISTRY.map((p) => p.family))].filter((f) => !attendu[f]);
    expect(inconnues, `familles sans section : ${inconnues.join(", ")}`).toEqual([]);
    expect(ISSUER_REGISTRY.length, "registre vide : le cliquet ne regarde plus rien").toBeGreaterThan(10);
  });

  it("les trois sections obligataires portent le nom d'un segment du bulletin", () => {
    // « etats », « regionales », « privees » : relevés dans notre propre table de cotes.
    expect(SEGMENT_BOC).toEqual({ etats: "etats", regionales: "regionales", entreprises: "privees" });
  });
});

describe("chaque section se nomme et se dit", () => {
  it("porte un titre et une phrase, dans les deux langues", () => {
    const manque: string[] = [];
    for (const s of Object.values(SECTIONS).flat()) {
      if (!SECTION_LABEL[s]) manque.push(`${s} : pas de titre`);
      if (!SECTION_NOTE[s]) manque.push(`${s} : pas de phrase`);
      if (SECTION_LABEL[s] && EN_ALL[SECTION_LABEL[s]] == null) manque.push(`${s} : titre absent du dictionnaire`);
      if (SECTION_NOTE[s] && EN_ALL[SECTION_NOTE[s]] == null) manque.push(`${s} : phrase absente du dictionnaire`);
    }
    for (const l of Object.keys(LIEU_LABEL)) if (EN_ALL[LIEU_LABEL[l as keyof typeof LIEU_LABEL]] == null) manque.push(`lieu ${l} : absent du dictionnaire`);
    expect(manque, `ces libellés sortiraient en français :\n  ${manque.join("\n  ")}`).toEqual([]);
  });

  it("la phrase dit la règle d'appartenance, pas un argument", () => {
    /* Un titre de section est le seul endroit où le lecteur apprend pourquoi
       deux lignes voisines sont voisines. « Les meilleures opportunités » ne
       le dit pas ; « la BDEAC, ni un État ni une entreprise » le dit. */
    for (const [s, note] of Object.entries(SECTION_NOTE)) {
      expect(note.length, `${s} : phrase trop courte pour dire une règle`).toBeGreaterThan(40);
      expect(note.length, `${s} : phrase trop longue pour un sous-titre`).toBeLessThan(110);
    }
  });
});
