import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";

/**
 * The acts and notices: a coupon notice is built from a paid flow of a
 * settled position and issued once per flow; a complaint carries its
 * acknowledgement and answer deadlines; a transfer order lists the positions.
 * In-memory repository, PDFs on disk.
 */
const desk: Session = { userId: "u-desk", role: "responsable", name: "Desk Test", email: "desk@example.com", segment: "Desk", tier: 2, provider: "dev", mfaEnrolled: true, mfaVerified: true };
vi.mock("@/lib/auth", () => ({ getSession: async () => desk, requireSession: async () => desk, requireDesk: async () => desk, authMode: () => "dev" }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
});

describe("actes et avis", () => {
  it("issues one coupon notice per paid flow, a complaint with its deadlines, a transfer order", async () => {
    const { repo } = await import("@/lib/data");
    const { generateComplaint, generateCouponNotice, generateTransferOrder, clientPositions } = await import("@/lib/documents/generate");
    const r = repo();
    const offers = await r.listOffers();
    // a bond issued two years ago, settled then: its first coupons are behind us
    const base = offers.find((o) => o.kind === "OTA" && o.couponRate != null)!;
    const past = await r.upsertOffer({ ...base, id: "ota-passe", title: "OTA test 6 % 2023-2028", isin: "CM0000TEST01", status: "published", opensAt: "2023-09-01T08:00:00.000Z", deadlineAt: "2023-09-15T16:00:00.000Z", settleOn: "2023-09-20", maturityOn: "2028-09-20", couponRate: 6, hidden: false, version: 1 } as typeof base);
    const i = await r.createIntent({ offerId: past.id, type: "ferme", amount: 1_000_000, channel: "WhatsApp", clientName: "S. E.", clientSegment: "Diaspora · Paris", clientId: "c-se", contactPhone: "+33600000013", contactEmail: "s.e@example.com" });
    await r.updateIntent(i.id, { state: "reglee" });
    const positions = await clientPositions("c-se");
    expect(positions.length).toBe(1);
    expect(positions[0].paid.length).toBeGreaterThan(0);
    const flow = positions[0].paid[0];
    const d1 = await generateCouponNotice("c-se", "CM0000TEST01", flow.date, { advisor: "Desk Test" });
    expect(d1.type).toBe("coupon");
    // the client's copy carries no rank; the register entry does, and stays at the desk
    expect(d1.number).toMatch(/^PC-AC-\d{6}-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{4}$/);
    expect(d1.registerNo).toMatch(/^PC-AC-\d{4}-\d{4}$/);
    expect(d1.flowKey).toBe(`c-se|CM0000TEST01|${flow.date}`);
    const d2 = await generateCouponNotice("c-se", "CM0000TEST01", flow.date);
    expect(d2.id).toBe(d1.id);

    const c = await generateComplaint("c-se", { facts: "Le coupon est arrivé en retard.", ask: "Une explication.", receivedVia: "Mon espace", signedBy: "code sur WhatsApp" });
    expect(c.number).toMatch(/^PC-REC-/);
    expect(c.ackBy > c.createdAt.slice(0, 10)).toBe(true);
    expect(c.answerBy > c.ackBy).toBe(true);

    const file = await r.createClientFile({ userId: "c-se", kind: "physique", status: "approuve", identity: { name: "S. E.", city: "Paris", country: "Cameroun" }, persons: [], documents: [], funds: { pep: false }, profile: { category: "non_professionnel" }, consents: {}, review: { custodianAccount: "0001-TEST" }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    const tr = await generateTransferOrder(file, { scope: "tout", destination: "Autre SDB", requestedAt: new Date().toISOString() }, "Desk Test");
    expect(tr.number).toMatch(/^PC-TRF-/);
    expect(tr.clientFileId).toBe(file.id);
  });
});
