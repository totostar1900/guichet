import { describe, expect, it } from "vitest";
import { RELEVE_OFFICIEL } from "@/data/budgets-officiels";
import { sommeDes } from "@/lib/market/budget";
import { cleDePiece, entiteDeBudget, lireLignesBudget, typeAdmis } from "@/lib/market/pieces";

/**
 * LE RELEVÉ DES PIÈCES OFFICIELLES TIENT SES PROPRES COMPTES (7 novembre 2026).
 *
 * Chaque tableau d'une loi s'additionne. Un poste mal recopié se voit à une somme qui ne tombe plus : c'est la seule vérification que la saisie à la main permet.
 */
const de = (p: string) => RELEVE_OFFICIEL.find((b) => b.pays === p)!;

describe("le relevé des budgets officiels", () => {
  it("couvre cinq États, pas le Gabon (aucune pièce officielle ouverte)", () => {
    expect(RELEVE_OFFICIEL.map((b) => b.pays).sort()).toEqual(["Cameroun", "Congo", "Guinée éq.", "RCA", "Tchad"]);
  });

  it("chaque budget nomme une pièce source et ses pièces, toutes en https", () => {
    for (const b of RELEVE_OFFICIEL) {
      expect(b.source.url, b.pays).toMatch(/^https:\/\//);
      expect(b.references?.length, b.pays).toBeGreaterThan(0);
      for (const r of b.references ?? []) if (r.url) expect(r.url, `${b.pays} ${r.titre}`).toMatch(/^https:\/\//);
    }
  });

  it("Tchad : recettes, dépenses et financement tombent juste, comme les tableaux de la loi", () => {
    const b = de("Tchad");
    expect(sommeDes(b.recettes)).toBe(2_275_000);
    expect(sommeDes(b.depenses)).toBe(b.budgetTotal);
    expect(sommeDes(b.recettes) - sommeDes(b.depenses)).toBeCloseTo(b.soldeDeclare!, -1);
    expect(sommeDes(b.financement)).toBe(b.besoinDeFinancement);
  });

  it("Guinée équatoriale : budget équilibré, plan de financement égal aux dépenses de trésorerie", () => {
    const b = de("Guinée éq.");
    expect(sommeDes(b.recettes)).toBe(1_294_282);
    expect(Math.abs(sommeDes(b.depenses) - 1_294_282)).toBeLessThanOrEqual(2);
    expect(b.soldeDeclare).toBe(0);
    expect(sommeDes(b.financement)).toBe(b.besoinDeFinancement);
  });

  it("Centrafrique : les ressources font le budget, les sources de financement le besoin brut", () => {
    const b = de("RCA");
    expect(sommeDes(b.recettes)).toBe(b.budgetTotal);
    expect(sommeDes(b.financement)).toBe(b.besoinDeFinancement);
    expect(b.budgetTotal! - sommeDes(b.depenses)).toBe(b.soldeDeclare);
  });

  it("Congo : recettes moins dépenses donnent l'excédent, et le plan couvre les charges de trésorerie", () => {
    const b = de("Congo");
    expect(sommeDes(b.recettes) - sommeDes(b.depenses)).toBe(b.soldeDeclare);
    expect(Math.abs(sommeDes(b.financement) - b.besoinDeFinancement!)).toBeLessThanOrEqual(1);
  });

  it("une seule ligne porte les titres publics, et partout où le plan en parle", () => {
    for (const b of RELEVE_OFFICIEL) expect(b.financement.filter((f) => f.titres).length, b.pays).toBeLessThanOrEqual(1);
  });

  it("un écart entre deux pièces est nommé, jamais tranché en silence", () => {
    expect(de("Tchad").aRelever!.join(" ")).toMatch(/2 531,5/);
    expect(de("RCA").aRelever!.join(" ")).toMatch(/172,66/);
  });
});

describe("les pièces conservées", () => {
  it("la clef d'une pièce porte l'entité, le jour, un bout de l'empreinte et un titre sans accent", () => {
    const k = cleDePiece("budget-tchad-2026", "Loi de finances pour l'exercice 2026 — Tchad", "abcdef0123456789", "application/pdf", "2026-11-07");
    expect(k).toBe("pieces/budget-tchad-2026/2026-11-07-abcdef01-Loi-de-finances-pour-l-exercice-2026-Tchad.pdf");
  });

  it("l'entité d'un budget est stable", () => {
    expect(entiteDeBudget("Guinée éq.")).toBe("budget-guinee-equatoriale-2026");
  });

  it("le type se lit dans les octets avant l'en-tête : un PDF annoncé « octet-stream » reste un PDF", () => {
    expect(typeAdmis("application/octet-stream", new TextEncoder().encode("%PDF-1.7 ..."))).toBe("application/pdf");
    expect(typeAdmis("text/html; charset=utf-8")).toBe("text/html");
    expect(typeAdmis("application/zip")).toBeUndefined();
  });

  it("une ligne de saisie se lit en milliards avec virgule ou point, et la ligne des titres se marque", () => {
    const r = lireLignesBudget("Recettes fiscales | 1 446,058\nTitres publics | 15 | titres\n\nDons | 401.063");
    expect(r.refus).toEqual([]);
    expect(r.postes.map((p) => p.montant)).toEqual([1_446_058, 15_000, 401_063]);
    expect(r.postes[1].titres).toBe(true);
  });

  it("une ligne sans montant lisible est refusée avec son numéro, rien n'est deviné", () => {
    const r = lireLignesBudget("Recettes | beaucoup\nDépenses |");
    expect(r.postes).toEqual([]);
    expect(r.refus).toHaveLength(2);
    expect(r.refus[0]).toMatch(/ligne 1/);
  });
});
