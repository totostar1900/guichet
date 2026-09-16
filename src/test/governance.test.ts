import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";

/**
 * Governance rules on the in-memory repository: optimistic locking refuses a
 * stale write, every version keeps a snapshot, the audit trail chains hashes,
 * an opérateur outside the delegated window lands in the approval queue, and a
 * responsable cannot approve their own proposal.
 */

const operateur: Session = { userId: "u-op", role: "desk", name: "Op Test", email: "op@example.com", segment: "Desk", tier: 2, provider: "dev", mfaEnrolled: true, mfaVerified: true };
const responsable: Session = { userId: "u-resp", role: "responsable", name: "Resp Test", email: "resp@example.com", segment: "Desk", tier: 2, provider: "dev", mfaEnrolled: true, mfaVerified: true };
let current: Session = operateur;

vi.mock("@/lib/auth", () => ({
  getSession: async () => current,
  requireSession: async () => current,
  requireDesk: async () => current,
  requireResponsable: async () => {
    if (current.role !== "responsable") throw new Error("redirect");
    return current;
  },
  authMode: () => "dev",
  mfaRequired: () => false,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "10.0.0.1", "user-agent": "vitest" }) }));

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
});

describe("locking, versions, audit, four-eyes", () => {
  it("refuses a stale write and keeps a snapshot per version", async () => {
    const { repo } = await import("@/lib/data");
    const { ConflictError } = await import("@/lib/domain/types");
    const r = repo();
    const o = (await r.getOffer("mkt-bhc"))!;
    await r.upsertOffer({ ...o, lastPrice: 5000, version: o.version + 1 }, { expectedVersion: o.version, by: "Op Test", note: "test" });
    await expect(r.upsertOffer({ ...o, lastPrice: 5100, version: o.version + 1 }, { expectedVersion: o.version })).rejects.toBeInstanceOf(ConflictError);
    const versions = await r.listOfferVersions("mkt-bhc");
    expect(versions[0].version).toBe(o.version + 1);
    expect(versions[0].snapshot?.lastPrice).toBe(5000);
  });

  it("chains audit hashes", async () => {
    const { audit } = await import("@/lib/audit");
    const a = await audit("test.one", "offer", "x", { after: { a: 1 } });
    const b = await audit("test.two", "offer", "x", { after: { a: 2 } });
    expect(b.prevHash).toBe(a.hash);
    expect(a.ip).toBe("10.0.0.1");
    expect(a.actor).toBe("op@example.com");
  });

  it("sends an out-of-window quote to approval, which the proposer cannot decide", async () => {
    const { updateQuoteAction } = await import("@/app/desk/marche/actions");
    const { decideApprovalAction } = await import("@/app/desk/approbations/actions");
    const { repo } = await import("@/lib/data");
    const r = repo();
    const o = (await r.getOffer("mkt-bhc"))!;
    const form = new FormData();
    form.set("offerId", o.id);
    form.set("lastPrice", String(Math.round((o.lastPrice ?? 5000) * 1.5))); // +50 % > 10 % window
    form.set("version", String(o.version));
    const res = await updateQuoteAction(null, form);
    expect(res.ok).toBe(true);
    expect((await r.getOffer(o.id))!.version).toBe(o.version); // nothing written yet
    const open = await r.listApprovals(true);
    expect(open.length).toBeGreaterThan(0);
    const a = open[0];
    // The proposer, even promoted, cannot approve their own proposal.
    current = { ...responsable, name: "Op Test" };
    const self = new FormData();
    self.set("id", a.id);
    self.set("decision", "approuve");
    expect((await decideApprovalAction(null, self)).ok).toBe(false);
    // Another responsable approves: the record is written as a new version and audited.
    current = responsable;
    const ok = await decideApprovalAction(null, self);
    expect(ok.ok).toBe(true);
    const after = (await r.getOffer(o.id))!;
    expect(after.version).toBe(o.version + 1);
    expect(after.lastPrice).toBe(Math.round((o.lastPrice ?? 5000) * 1.5));
    const trail = await r.listAudit({ entity: "offer", entityId: o.id });
    expect(trail.some((t) => t.action === "offer.quote" && t.reason?.includes("Approbation"))).toBe(true);
  });

  it("lets a responsable quote inside the window directly, with locking", async () => {
    const { updateQuoteAction } = await import("@/app/desk/marche/actions");
    const { repo } = await import("@/lib/data");
    const r = repo();
    current = responsable;
    const o = (await r.getOffer("mkt-bhc"))!;
    const form = new FormData();
    form.set("offerId", o.id);
    form.set("lastPrice", String((o.lastPrice ?? 5000) + 10));
    form.set("version", String(o.version - 1)); // stale screen
    const stale = await updateQuoteAction(null, form);
    expect(stale.ok).toBe(false);
    form.set("version", String(o.version));
    const fresh = await updateQuoteAction(null, form);
    expect(fresh.ok).toBe(true);
    expect((await r.getOffer(o.id))!.version).toBe(o.version + 1);
  });
});
