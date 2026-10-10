import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { depasseLePlafond, direLePlafond, plafondEffectif } from "@/lib/domain/plafond-du-compte";

/**
 * LE PLAFOND PAR ORDRE : LA RÈGLE DU PV, ENFIN APPLIQUÉE.
 *
 * Elle vivait dans un champ libre que le client tapait, que le desk lisait
 * sur la fiche, et qu'aucun code ne vérifiait. Une règle affichée et non
 * tenue est pire qu'une règle absente : tout le monde la croit tenue.
 */
const lire = (p: string) => readFileSync(p, "utf8");
const fmt = (n: number) => n.toLocaleString("fr-FR");

describe("deux étages, et le plus bas gagne", () => {
  it("le compte seul, la personne seule, ou les deux", () => {
    expect(plafondEffectif(undefined, undefined)).toEqual({ source: "aucun" });
    expect(plafondEffectif(5_000_000, undefined)).toEqual({ montant: 5_000_000, source: "compte" });
    expect(plafondEffectif(undefined, 2_000_000)).toEqual({ montant: 2_000_000, source: "personne" });
    expect(plafondEffectif(5_000_000, 2_000_000)).toEqual({ montant: 2_000_000, source: "personne" });
  });

  it("une délégation ne dépasse jamais le mandat dont elle sort", () => {
    // Un plafond de personne au-dessus de celui du compte ne relève rien.
    expect(plafondEffectif(5_000_000, 50_000_000)).toEqual({ montant: 5_000_000, source: "compte" });
    // Et l'écran le dit plutôt que de ranger un chiffre sans effet.
    expect(lire("src/app/desk/clients/acces-actions.ts")).toContain("un plafond de personne au-dessus ne relèverait rien");
  });

  it("un zéro n'est pas un plafond, c'est un champ vide", () => {
    expect(plafondEffectif(0, undefined)).toEqual({ source: "aucun" });
  });
});

describe("ce que le plafond arrête, et ce qu'il laisse", () => {
  const p = { montant: 5_000_000, source: "compte" as const };

  it("il arrête ce qui engage au-delà", () => {
    expect(depasseLePlafond({ plafond: p, montant: 5_000_001, sens: "augmente" })).toBe(true);
    expect(depasseLePlafond({ plafond: p, montant: 5_000_000, sens: "augmente" })).toBe(false);
  });

  it("il ne regarde jamais ce qui réduit", () => {
    /* Borner une vente enfermerait le groupe dans son compte, et c'est la
       même règle que partout ailleurs dans la maison. */
    expect(depasseLePlafond({ plafond: p, montant: 900_000_000, sens: "reduit" })).toBe(false);
    expect(depasseLePlafond({ plafond: p, montant: 900_000_000, sens: "aucun" })).toBe(false);
  });

  it("un montant inconnu ne dépasse rien", () => {
    // On ne refuse pas sur une ignorance : ces ordres passent déjà par une
    // borne signée, et le desk les voit.
    expect(depasseLePlafond({ plafond: p, montant: undefined, sens: "augmente" })).toBe(false);
  });

  it("et sans plafond, rien n'est borné", () => {
    expect(depasseLePlafond({ plafond: { source: "aucun" }, montant: 10_000_000_000, sens: "augmente" })).toBe(false);
  });
});

describe("ce que le client lit", () => {
  it("le montant, d'où il vient, et par où passer", () => {
    const dit = direLePlafond({ montant: 5_000_000, source: "compte" }, fmt);
    expect(dit).toContain("fixé pour ce compte");
    expect(dit).toContain("5");
    // Rien n'est refusé : un chemin plus lent est imposé, ce qui est le but.
    expect(dit).toContain("un conseiller le prend avec vous");
    expect(direLePlafond({ montant: 2_000_000, source: "personne" }, fmt)).toContain("qui vous est fixé");
  });

  it("et il le lit AVANT de buter dessus", () => {
    /* Le découvrir au moment de signer est une panne muette : le client a
       déjà réuni le groupe et rempli son ordre. */
    expect(lire("src/app/Console.tsx")).toContain("session.plafondParOrdre != null ? direLePlafond(");
  });
});

describe("le garde est ce qui le rend réel", () => {
  it("il lit le plafond de la session, après les mesures", () => {
    const g = lire("src/lib/garde.ts");
    expect(g).toContain("depasseLePlafond(");
    /* L'ordre des deux compte pour ce que le client lit : un compte suspendu
       doit s'entendre dire qu'il est suspendu, pas qu'il dépasse. */
    expect(g.indexOf("if (!verdict.ok) return verdict;")).toBeLessThan(g.indexOf("depasseLePlafond("));
  });

  it("et la session le calcule une fois, où les deux étages sont lus", () => {
    const a = lire("src/lib/auth/index.ts");
    expect(a).toContain("plafondEffectif(f.identity.plafondParOrdre, s.plafondParOrdre)");
  });
});

describe("relever demande deux regards, abaisser non", () => {
  it("c'est le même geste que donner un accès", () => {
    const a = lire("src/app/desk/clients/acces-actions.ts");
    const i = a.indexOf("export async function fixerPlafondAction");
    const bloc = a.slice(i, a.indexOf("export async function revoquerAccesAction"));
    expect(bloc).toContain("const releve = voulu == null || (avant != null && voulu > avant);");
    expect(bloc).toContain("if (releve) {");
    expect(bloc).toContain("quatreYeux(me,");
    // Retirer le plafond est le relèvement le plus large qui soit.
    expect(bloc).toContain("voulu == null ||");
  });

  it("la phrase du PV reste lisible à côté du chiffre qui s'applique", () => {
    /* Un fait qui doit être tenu vit dans un champ ; la phrase du groupe
       garde sa place, elle dit ce que le groupe a voulu. */
    const k = lire("src/lib/domain/kyc.ts");
    expect(k).toContain("decisionRule?: string;");
    expect(k).toContain("plafondParOrdre?: number;");
  });
});
