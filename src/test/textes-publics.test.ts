import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { estPublic } from "@/lib/porte";
import { translator } from "@/i18n/core";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * LA PORTE PUBLIQUE DES TEXTES (18 novembre 2026, le client : « le meilleur des deux mondes, sans afficher de grille ou de politique tarifaire au public »).
 */
describe("la page publique « Textes et conditions »", () => {
  const brut = lire("src/app/info/textes/page.tsx");
  /* Le code sans ses commentaires : ils citent les mots écartés pour dire pourquoi. */
  const code = brut.replace(/\/\*[\s\S]*?\*\//g, "");

  it("est publique, dans le plan du site, et « /legal » y mène", () => {
    expect(estPublic("/info/textes")).toBe(true);
    expect(lire("src/app/sitemap.ts")).toContain('"/info/textes"');
    expect(lire("next.config.ts")).toMatch(/source: "\/legal", destination: "\/info\/textes", permanent: true/);
  });

  it("liste les textes qui existent, chacun avec sa version, et renvoie aux sections des mentions plutôt que d'en inventer", () => {
    for (const v of ["LEGAL_VERSION", "RISQUES_VERSION", "CONVENTION_VERSION"]) expect(code, `la version ${v} n'est plus lue`).toContain(v);
    for (const h of ["/info/mentions", "/info/risques", "/info/mentions#canaux", "/info/mentions#reclamation"]) expect(code, `la porte ${h} a disparu`).toContain(`"${h}"`);
    expect(code).toMatch(/version du \{d\}/);
  });

  it("n'affiche AUCUNE grille ni politique tarifaire : ni l'annexe tarifaire, ni les règles des services, ni leur adresse", () => {
    expect(code, "une porte vers l'annexe tarifaire est apparue en public").not.toMatch(/\/moi\/tarifs/);
    expect(code, "une porte vers les règles des services est apparue en public").not.toMatch(/\/moi\/services/);
    expect(code, "un titre d'annexe tarifaire est apparu dans la liste").not.toMatch(/titre: t\("Annexe tarifaire"\)/);
    expect(code, "un chiffre de frais est écrit dans la page").not.toMatch(/FCFA|\d+\s?%/);
    /* La composition du contrat nomme les conditions tarifaires sans en dire le contenu. */
    expect(code).toMatch(/des conditions tarifaires que remet votre conseiller/);
  });

  it("ne publie pas le texte de la convention (son article 6 parle des tarifs) : il n'a de porte que pour un client connecté", () => {
    expect(code).toMatch(/href: client \? "\/ouvrir-un-compte\/convention" : undefined/);
    expect(code, "le texte de la convention est rendu en public").not.toMatch(/PASSAGES|resolvePassages/);
  });

  it("ne signe rien en public, ne répète pas l'adresse, et dit le nom de la maison et son agrément", () => {
    expect(code, "une signature est apparue sur une page publique").not.toMatch(/Signer|conventionAt: new|setConsent/);
    expect(code, "l'adresse ou le téléphone sont revenus").not.toMatch(/COMPANY\.(address|phone|email)/);
    expect(code).toMatch(/COMPANY\.legalName/);
    expect(code).toMatch(/COMPANY\.licence/);
  });

  it("un client connecté voit où il en est, et la porte vers « Vos textes et conditions » (qui, elle, a les tarifs)", () => {
    expect(code).toMatch(/s\.role === "client"/);
    expect(code).toMatch(/acceptées le/);
    expect(code).toMatch(/signée le/);
    expect(code).toContain('href="/moi/textes"');
  });

  it("l'accueil y mène, et l'anglais existe", () => {
    expect(lire("src/app/Accueil.tsx")).toContain('href="/info/textes"');
    const en = translator("en");
    for (const fr of ["Vos données personnelles", "En cas de désaccord", "Vos textes et conditions"]) expect(en(fr), `« ${fr} » n'est pas traduit`).not.toBe(fr);
  });
});
