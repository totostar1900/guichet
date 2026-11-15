import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parentDe } from "@/lib/nav-parent";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * LES OPÉRATIONS DE « MES DOCUMENTS » SONT UN SOMMAIRE DE TUILES-LIENS (décision du 15 novembre 2026, 1A · 2A · 3A) : chaque opération mène à sa page, au lieu de se déplier.
 */
describe("le sommaire des opérations", () => {
  const o = lire("src/app/moi/documents/Operations.tsx");

  it("n'a plus de pli : une tuile-lien par opération, et une pour les papiers hors opération", () => {
    expect(o).not.toMatch(/<Pli\b|components\/Pli/);
    expect(o).toMatch(/href=\{`\/moi\/documents\/operations\/\$\{op\.id\}`\} className=\{styles\.tuile\}/);
    expect(o).toMatch(/href=\{`\/moi\/documents\/operations\/\$\{HORS_OPERATION\}`\}/);
  });

  it("la bascule reste en tête et « par date » reste une liste à plat", () => {
    expect(o).toMatch(/Par opération/);
    expect(o).toMatch(/parDate\.map\(/);
    expect(o).toMatch(/window\.localStorage|localStorage\.setItem\(KEY, v\)/);
  });

  it("une tuile qui attend un geste le porte sur elle", () => {
    expect(o).toMatch(/attend > 0 && <em className=\{styles\.attend\}>/);
  });

  it("les opérations se lisent du dernier papier au plus ancien", () => {
    const g = lire("src/app/moi/documents/operations/groupes.ts");
    expect(g).toMatch(/\.sort\(\(a, b\) => b\.rows\[b\.rows\.length - 1\]\.at\.localeCompare\(a\.rows\[a\.rows\.length - 1\]\.at\)\)/);
  });
});

describe("la page d'une opération", () => {
  const s = lire("src/app/moi/documents/operations/[op]/page.tsx");
  it("liste les papiers de l'opération, sans pli, et refuse une opération inconnue", () => {
    expect(s).not.toMatch(/<Pli\b/);
    expect(s).toMatch(/<Ligne /);
    expect(s).toMatch(/notFound\(\)/);
    expect(s).toMatch(/requireSession\(/);
  });
  it("le retour est la liste des opérations", () => {
    expect(parentDe("/moi/documents/operations/abc")).toBe("/moi/documents/operations");
  });
});
