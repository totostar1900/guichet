import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { CAUSES_DE_REJET, estUneCauseDeRejet, phraseDuRejet } from "@/lib/desk/rejet";
import { EN_ALL } from "@/i18n/core";

/**
 * « REJETER » DIT MAINTENANT POURQUOI.
 *
 * C'était la seule décision du desk sans motif : refuser une approbation,
 * renvoyer un brouillon, annuler un ordre, écarter une séance, refuser un
 * versement, tous demandent une note et la gardent. Une pièce rejetée
 * changeait d'état en silence, et six mois plus tard personne ne pouvait dire
 * pourquoi une offre n'avait pas été publiée. Troisième et dernier point de
 * l'audit du 26 septembre 2026.
 */
const ACTIONS = "src/app/desk/a-valider/actions.ts";
const FORM = "src/app/desk/a-valider/ValidateForm.tsx";
const lire = (f: string) => readFileSync(f, "utf8");

describe("la cause est nommée, et elle dit ce qui suit", () => {
  it("chaque cause porte un libellé et une suite", () => {
    /* La suite est la moitié utile : « redemander la source » et « ne rien
       publier » ne sont pas le même rejet. */
    const causes = Object.entries(CAUSES_DE_REJET);
    expect(causes.length).toBeGreaterThanOrEqual(5);
    for (const [cle, m] of causes) {
      expect(m.libelle, cle).toBeTruthy();
      expect(m.suite.length, cle).toBeGreaterThan(30);
    }
  });

  it("« Autre » exige une précision, les autres non", () => {
    // Sans cette règle, « Autre » devient le bouton de ceux qui sont pressés.
    expect(CAUSES_DE_REJET.autre.precisionRequise).toBe(true);
    expect(Object.entries(CAUSES_DE_REJET).filter(([, m]) => m.precisionRequise)).toHaveLength(1);
  });

  it("une cause inconnue n'en est pas une", () => {
    expect(estUneCauseDeRejet("doublon")).toBe(true);
    expect(estUneCauseDeRejet("")).toBe(false);
    expect(estUneCauseDeRejet("parce que")).toBe(false);
  });

  it("la phrase gardée au dossier porte la cause, puis la précision", () => {
    expect(phraseDuRejet("doublon")).toBe("Déjà traitée");
    expect(phraseDuRejet("autre", "  le Trésor a changé de calendrier ")).toBe("Autre · le Trésor a changé de calendrier");
  });
});

describe("l'action refuse un rejet muet", () => {
  it("exige la cause, et la précision sous « Autre »", () => {
    const src = lire(ACTIONS);
    expect(src).toMatch(/if \(!estUneCauseDeRejet\(cause\)\) return \{ ok: false/);
    expect(src).toMatch(/precisionRequise && !precision\) return \{ ok: false/);
  });

  it("garde la cause dans un champ, et la phrase au journal", () => {
    /* Le champ pour ce qui se compte, la phrase pour ce qui se lit : c'est le
       partage retenu le même jour pour le demandeur d'une relecture. */
    const src = lire(ACTIONS);
    expect(src).toMatch(/state: "rejete", rejectReason: cause, notes: `Rejetée par \$\{desk\.name\} : \$\{phrase\}`/);
    expect(src).toMatch(/audit\("intake\.reject", "intake", id, \{ before: \{ state: item\.state \}, after: \{ state: "rejete", cause \}, reason: phrase \}\)/);
    expect(src).toMatch(/logEvent\(\{ kind: "desk"/);
  });

  it("et répond au desk au lieu de se taire", () => {
    // L'ancienne action ne rendait rien : une erreur n'avait nulle part où s'afficher.
    expect(lire(ACTIONS)).toMatch(/export async function rejectAction\(_prev: IntakeResult \| null, form: FormData\): Promise<IntakeResult>/);
    expect(lire(FORM)).toMatch(/useActionState<IntakeResult \| null, FormData>\(rejectAction, null\)/);
    expect(lire(FORM)).toMatch(/rejState && !rejState\.ok/);
  });
});

describe("l'action, exercée", () => {
  const poser = () => {
    const faits: { patch?: Record<string, unknown>; audits: { reason?: string }[]; events: { html: string }[] } = { audits: [], events: [] };
    vi.resetModules();
    vi.doMock("next/cache", () => ({ revalidatePath: () => undefined }));
    vi.doMock("@/lib/auth", () => ({ requireDesk: async () => ({ name: "Aline", role: "desk" }), requireSession: async () => ({ userId: "u" }) }));
    vi.doMock("@/lib/audit", () => ({ audit: async (_a: string, _e: string, _i: string, d: { reason?: string }) => void faits.audits.push({ reason: d.reason }) }));
    vi.doMock("@/lib/data", () => ({
      repo: () => ({
        getIntake: async () => ({ id: "i1", title: "Communiqué d'essai", state: "a_valider" }),
        updateIntake: async (_id: string, patch: Record<string, unknown>) => void (faits.patch = patch),
        logEvent: async (e: { html: string }) => void faits.events.push(e),
      }),
    }));
    return faits;
  };
  const formulaire = (cause: string, precision = "") => {
    const f = new FormData();
    f.set("itemId", "i1");
    f.set("rejectReason", cause);
    f.set("rejectNote", precision);
    return f;
  };

  it("refuse un rejet sans cause, et le dit", async () => {
    poser();
    const { rejectAction } = await import("@/app/desk/a-valider/actions");
    const r = await rejectAction(null, formulaire(""));
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ error: expect.stringContaining("Dites pourquoi") });
  });

  it("refuse « Autre » sans précision", async () => {
    poser();
    const { rejectAction } = await import("@/app/desk/a-valider/actions");
    expect((await rejectAction(null, formulaire("autre"))).ok).toBe(false);
    expect((await rejectAction(null, formulaire("autre", "le Trésor a changé de calendrier"))).ok).toBe(true);
  });

  it("et sur une cause valable, écrit l'état, le champ, la note et les deux traces", async () => {
    const faits = poser();
    const { rejectAction } = await import("@/app/desk/a-valider/actions");
    expect((await rejectAction(null, formulaire("doublon"))).ok).toBe(true);
    expect(faits.patch).toMatchObject({ state: "rejete", rejectReason: "doublon" });
    expect(String(faits.patch?.notes)).toContain("Rejetée par Aline : Déjà traitée");
    expect(faits.audits[0]?.reason).toBe("Déjà traitée");
    expect(faits.events[0]?.html).toContain("Déjà traitée");
  });
});

describe("ce que le scanner de clefs ne voit pas est traduit quand même", () => {
  it("les libellés et les suites des causes ont leur anglais", () => {
    // Elles passent par tr(variable) depuis le catalogue : invisibles au scanner.
    for (const [cle, m] of Object.entries(CAUSES_DE_REJET)) {
      expect(EN_ALL[m.libelle], cle).toBeTruthy();
      expect(EN_ALL[m.suite], cle).toBeTruthy();
    }
  });
});
