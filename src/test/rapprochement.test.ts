import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { duAuxClients, ecart, pourquoiPasDeRapprochement, tenuParLaMaison, type CompteDeclare } from "@/lib/domain/rapprochement";
import type { CashEntry } from "@/lib/domain/cash";
import type { Intent } from "@/lib/domain/types";

/**
 * CE QUE LA MAISON DOIT, FACE A CE QU'ELLE TIENT.
 *
 * La règle des espèces s'est ouverte le 2 octobre 2026 : l'argent qui se trouve
 * sur les comptes de la maison appartient au client et peut y rester aussi
 * longtemps qu'il le souhaite. Cette phrase crée l'obligation de contrôle que
 * l'ancienne règle évitait en ne gardant rien.
 *
 * Quatre propriétés se tiennent ici, et deux ne sont pas évidentes :
 *
 *   L'ÉCART N'EST PAS SYMÉTRIQUE. Tenir plus que ce qu'on doit est ordinaire,
 *   tenir moins ne l'est jamais.
 *
 *   UN SOLDE NÉGATIF NE SE COMPENSE PAS. La maison ne doit pas « le net » : si
 *   un journal est négatif, le total ne doit pas l'absorber en silence, sinon
 *   une anomalie sur un client masquerait le dû d'un autre.
 */
const NOW = new Date("2026-10-03T12:00:00Z");

const entry = (o: Partial<CashEntry>): CashEntry => ({ id: "c1", userId: "u1", at: "2026-09-10T08:00:00.000Z", amount: 100_000, kind: "coupon", label: "Coupon", ...o });
const intent = (id: string, state: Intent["state"]): Intent => ({ id, state } as unknown as Intent);
const compte = (o: Partial<CompteDeclare>): CompteDeclare => ({ label: "BEAC · compte de règlement", balance: 100_000, evidence: "relevé du 03/10", ...o });

describe("le dû aux clients", () => {
  it("totalise les journaux, et sépare l'affecté du réclamable", () => {
    const du = duAuxClients(
      [
        { entries: [entry({ amount: 272_500 })], intents: [] },
        { entries: [entry({ id: "c2", kind: "provision", amount: 1_000_000, intentId: "i1", dueBy: "2026-12-31" })], intents: [intent("i1", "recue")] },
      ],
      NOW,
    );
    expect(du.owed).toBe(1_272_500);
    // Le million attend le règlement d'un ordre vivant : c'est du règlement.
    expect(du.assigned).toBe(1_000_000);
    expect(du.reclamable).toBe(272_500);
    expect(du.clients).toBe(2);
  });

  it("ne compte pas un client à zéro", () => {
    const du = duAuxClients([{ entries: [entry({ amount: 100_000 }), entry({ id: "c2", kind: "souscription", amount: 100_000 })], intents: [] }], NOW);
    expect(du.owed).toBe(0);
    expect(du.clients).toBe(0);
  });

  it("ne laisse pas un solde négatif compenser celui d'un autre client", () => {
    /* La maison ne doit pas « le net ». Si le journal d'un client est négatif,
       c'est une anomalie, et l'absorber dans le total masquerait le dû d'un
       autre : le rapprochement paraîtrait juste alors qu'il manque 272 500. */
    const du = duAuxClients(
      [
        { entries: [entry({ amount: 272_500 })], intents: [] },
        { entries: [entry({ id: "c2", kind: "souscription", amount: 500_000 })], intents: [] },
      ],
      NOW,
    );
    expect(du.owed).toBe(272_500);
    // Et non 272 500 − 500 000, qui serait négatif et sans aucun sens.
    expect(du.owed).not.toBe(-227_500);
  });
});

describe("l'écart, et son sens", () => {
  it("juste quand les deux chiffres se répondent", () => {
    expect(ecart(1_272_500, 1_272_500)).toEqual({ montant: 0, sens: "juste" });
  });

  it("un excédent est ordinaire : les fonds propres sont sur les mêmes comptes", () => {
    expect(ecart(1_272_500, 2_000_000)).toEqual({ montant: 727_500, sens: "excedent" });
  });

  it("un manque est la seule chose grave", () => {
    const e = ecart(1_272_500, 1_000_000);
    expect(e.sens).toBe("manque");
    expect(e.montant).toBe(-272_500);
  });

  it("totalise les comptes déclarés", () => {
    expect(tenuParLaMaison([compte({ balance: 1_000_000 }), compte({ label: "BVMAC", balance: 272_500 })])).toBe(1_272_500);
    expect(tenuParLaMaison([])).toBe(0);
  });
});

describe("ce qui empêche d'enregistrer un contrôle", () => {
  it("aucun compte déclaré", () => {
    expect(pourquoiPasDeRapprochement({ accounts: [], owed: 0 })).toMatch(/au moins un compte/i);
  });

  it("un solde sans sa pièce", () => {
    expect(pourquoiPasDeRapprochement({ accounts: [compte({ evidence: "" })], owed: 100_000 })).toMatch(/pièce/i);
  });

  it("un compte sans nom", () => {
    expect(pourquoiPasDeRapprochement({ accounts: [compte({ label: "  " })], owed: 100_000 })).toMatch(/nom du compte/i);
  });

  it("un écart sans explication", () => {
    // Un écart sans explication n'est pas un contrôle, c'est un constat d'ignorance.
    expect(pourquoiPasDeRapprochement({ accounts: [compte({ balance: 50_000 })], owed: 100_000 })).toMatch(/expliquez/i);
    expect(pourquoiPasDeRapprochement({ accounts: [compte({ balance: 50_000 })], owed: 100_000, note: "fonds propres" })).toBeNull();
  });

  it("rien n'empêche un contrôle juste, même sans note", () => {
    // Un rapprochement qui tombe juste n'a rien à justifier.
    expect(pourquoiPasDeRapprochement({ accounts: [compte({ balance: 100_000 })], owed: 100_000 })).toBeNull();
  });
});

vi.mock("@/lib/auth", () => ({ requireDesk: async () => ({ name: "Desk Test", role: "desk" }) }));
vi.mock("@/lib/audit", () => ({ audit: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const champs = (o: Record<string, string | string[]>): FormData => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
  return f;
};

describe("le contrôle, bout à bout", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("gèle les deux chiffres et garde les pièces", async () => {
    const { enregistrerRapprochement, duDuJour } = await import("@/app/desk/rapprochement/actions");
    const { repo } = await import("@/lib/data");
    const r = repo();

    /* Le jeu de données n'a pas d'espèces : sans ce coupon, le dû serait à zéro
       et le test passerait sans rien mesurer du côté qu'il vient contrôler. */
    const unClient = (await r.listIntents()).find((i) => i.clientId)!.clientId!;
    await r.addCash({ userId: unClient, amount: 272_500, kind: "coupon", label: "Coupon" });
    const du = await duDuJour();
    expect(du.owed).toBeGreaterThan(0);

    const res = await enregistrerRapprochement(
      null,
      champs({
        onDate: "2026-10-03",
        label: ["BEAC · compte de règlement", "Afriland · 0472"],
        balance: [String(du.owed), "1 200 000"],
        evidence: ["relevé BEAC du 03/10", "extrait du 03/10"],
        note: "1 200 000 de fonds propres sur le compte Afriland",
      }),
    );
    expect(res.ok).toBe(true);

    const [ligne] = await r.listRapprochements();
    expect(ligne.onDate).toBe("2026-10-03");
    expect(ligne.owed).toBe(du.owed);
    expect(ligne.held).toBe(du.owed + 1_200_000);
    expect(ligne.accounts).toHaveLength(2);
    expect(ligne.accounts[1].evidence).toBe("extrait du 03/10");
    expect(ligne.createdBy).toBe("Desk Test");
    // L'excédent est annoncé à l'opérateur, pas seulement rangé.
    if (res.ok) expect(res.message).toMatch(/excédent/i);
  });

  it("refuse un écart sans explication, et une date dans l'avenir", async () => {
    const { enregistrerRapprochement } = await import("@/app/desk/rapprochement/actions");
    const sansNote = await enregistrerRapprochement(null, champs({ onDate: "2026-10-03", label: "BEAC", balance: "999", evidence: "relevé du 03/10" }));
    expect(sansNote.ok).toBe(false);
    if (!sansNote.ok) expect(sansNote.error).toMatch(/expliquez/i);

    const demain = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    const avenir = await enregistrerRapprochement(null, champs({ onDate: demain, label: "BEAC", balance: "0", evidence: "relevé" }));
    expect(avenir.ok).toBe(false);
    if (!avenir.ok) expect(avenir.error).toMatch(/avenir/i);
  });

  it("ignore une ligne restée vide plutôt que de la refuser", async () => {
    // Un formulaire qui propose quatre lignes ne punit pas celui qui n'en
    // remplit que deux.
    const { enregistrerRapprochement } = await import("@/app/desk/rapprochement/actions");
    const { repo } = await import("@/lib/data");
    const du = await (await import("@/app/desk/rapprochement/actions")).duDuJour();
    const res = await enregistrerRapprochement(
      null,
      champs({ onDate: "2026-10-02", label: ["BEAC", "", ""], balance: [String(du.owed), "", ""], evidence: ["relevé du 02/10", "", ""] }),
    );
    expect(res.ok).toBe(true);
    const ligne = (await repo().listRapprochements()).find((x) => x.onDate === "2026-10-02")!;
    expect(ligne.accounts).toHaveLength(1);
  });

  it("un contrôle ne se modifie pas", () => {
    // La valeur d'un rapprochement tient entièrement à ce qu'il n'a pas été
    // réécrit après coup, et c'est la base qui le garantit.
    const sql = readFileSync("C:/dev/guichet/supabase/migrations/0061_rapprochement.sql", "utf8");
    expect(sql).toMatch(/cash_reconciliations_no_update/);
    expect(sql).toMatch(/before update or delete on cash_reconciliations/);
    // Les deux chiffres sont des colonnes, donc gelés : les recalculer ferait
    // dériver le passé.
    expect(sql).toMatch(/owed\s+numeric/);
    expect(sql).toMatch(/held\s+numeric/);
  });
});
