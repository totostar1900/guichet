import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";

/**
 * The compliance decision form: every button must work with the screening
 * block still empty (it used to fail as « Décision invalide »), and the
 * submission of a file no longer needs the pieces.
 */
const desk: Session = { userId: "u-op", role: "desk", name: "Op Test", email: "op@example.com", segment: "Desk", tier: 2, provider: "dev", mfaEnrolled: true, mfaVerified: true };
vi.mock("@/lib/auth", () => ({ getSession: async () => desk, requireSession: async () => desk, requireDesk: async () => desk, requireResponsable: async () => desk, authMode: () => "dev", mfaRequired: () => false }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
});

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe("revue KYC", () => {
  it("submits without pieces, then every desk decision works with an empty screening block", async () => {
    const { repo } = await import("@/lib/data");
    const { emptyClientFile } = await import("@/lib/domain/kyc");
    const { missingForSubmission, missingForApproval } = await import("@/lib/kyc/checklist");
    const { reviewAction } = await import("@/app/desk/clients/actions");
    const r = repo();
    const base = emptyClientFile("u-client-1", "physique", "Awa Ngono", { phone: "+237600000001", email: "awa@example.cm" });
    const file = await r.createClientFile({
      ...base,
      funds: { ...base.funds, source: "Salaire" },
      profile: { ...base.profile, objectives: "Épargne", horizon: "3 ans", riskTolerance: "faible" },
      consents: { ...base.consents, dataAt: new Date().toISOString(), conventionAt: new Date().toISOString() },
      status: "soumis",
    });
    expect(missingForSubmission(file)).toEqual([]); // no piece, no id number: still submittable
    expect(missingForApproval(file).length).toBeGreaterThan(3); // the desk sees what is left

    // « Demander des compléments » with the screening select left on « — à renseigner — » (empty string).
    const noItems = await reviewAction(null, form({ fileId: file.id, decision: "complements", screeningOutcome: "", requestedItems: "" }));
    expect(noItems.ok).toBe(false);
    expect(!noItems.ok && noItems.error).toMatch(/Compléments à demander/);
    const asked = await reviewAction(null, form({ fileId: file.id, decision: "complements", screeningOutcome: "", requestedItems: "Pièce d'identité recto et verso" }));
    expect(asked.ok).toBe(true);
    expect((await r.getClientFile(file.id))!.status).toBe("complements");

    const saved = await reviewAction(null, form({ fileId: file.id, decision: "en_revue", screeningOutcome: "", notes: "Appel prévu lundi" }));
    expect(saved.ok).toBe(true);
    expect((await r.getClientFile(file.id))!.review.notes).toBe("Appel prévu lundi");

    // Approval still demands the screening attestation.
    const early = await reviewAction(null, form({ fileId: file.id, decision: "approuve", risk: "faible", screeningOutcome: "" }));
    expect(early.ok).toBe(false);
    expect(!early.ok && early.error).toMatch(/sanctions/);
    const ok = await reviewAction(null, form({ fileId: file.id, decision: "approuve", risk: "faible", screeningLists: "ONU, UE, OFAC", screeningOutcome: "aucun" }));
    expect(ok.ok).toBe(true);
    expect((await r.getClientFile(file.id))!.status).toBe("approuve");

    const refused = await reviewAction(null, form({ fileId: file.id, decision: "refuse", screeningOutcome: "", notes: "Test" }));
    expect(refused.ok).toBe(true);
  });
});
