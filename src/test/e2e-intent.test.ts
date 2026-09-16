import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";

/**
 * The whole chain a client order goes through, on the in-memory repository:
 * intent submitted from the fiche → recorded with its contact → acknowledgement
 * prepared on both channels → desk confirms → bulletin + appel de fonds PDFs
 * generated and attached to the intent. Guards every push.
 */

const client: Session = { userId: "u-test", role: "client", name: "Test Client", email: "client@example.com", phone: "+237600000000", segment: "Personne physique · Douala", tier: 1, provider: "dev", mfaEnrolled: true, mfaVerified: true };
const desk: Session = { userId: "u-desk", role: "desk", name: "Desk Test", email: "desk@example.com", segment: "Desk", tier: 2, provider: "dev", mfaEnrolled: true, mfaVerified: true };
let current: Session = client;

vi.mock("@/lib/auth", () => ({
  getSession: async () => current,
  requireSession: async () => current,
  requireDesk: async () => current,
  authMode: () => "dev",
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL; // memory repository, .uploads on disk
});

describe("intent → desk → documents", () => {
  it("runs end to end", async () => {
    const { submitIntent } = await import("@/app/offres/[id]/actions");
    const { transitionIntent } = await import("@/app/desk/actions");
    const { repo } = await import("@/lib/data");
    const { readSource } = await import("@/lib/intake/storage");
    const r = repo();

    // 1. A signed-in client sends a buy order on a listed share.
    const form = new FormData();
    form.set("offerId", "mkt-bhc");
    form.set("type", "achat");
    form.set("amount", "100");
    form.set("firstName", "Awa");
    form.set("lastName", "Ndongo");
    form.set("contactPhone", "6 87 67 67 67");
    form.set("contactEmail", "Awa.Ndongo@example.com");
    form.set("channel", "WhatsApp");
    form.set("message", "test e2e");
    const res = await submitIntent(null, form);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.ref).toMatch(/^[A-Z]{2}-\d{4}-\d{3}$/);
    expect(res.phone).toBe("+237687676767");
    expect(res.email).toBe("awa.ndongo@example.com");
    expect(res.sent.length).toBe(2); // WhatsApp + e-mail, prepared even without providers
    expect(res.sent.every((s) => s.status === "skipped" || s.status === "sent")).toBe(true);

    // 2. The desk sees it, with the contact the client typed and the name for the bulletin.
    const intent = (await r.listIntents()).find((i) => i.ref === res.ref)!;
    expect(intent).toBeDefined();
    expect(intent.clientName).toBe("Awa Ndongo");
    expect(intent.contactPhone).toBe("+237687676767");
    expect(intent.contactEmail).toBe("awa.ndongo@example.com");
    expect(intent.state).toBe("recue");
    expect((await r.getContact("u-test"))?.phone).toBe("+237687676767");

    // 3. Both acknowledgements are on the notification log.
    const notes = (await r.listNotifications(50)).filter((n) => n.intentId === intent.id);
    expect(notes.map((n) => n.channel).sort()).toEqual(["email", "whatsapp"]);

    // 4. The desk confirms: bulletin d'ordre + appel de fonds come out as real PDFs.
    current = desk;
    const f2 = new FormData();
    f2.set("intentId", intent.id);
    f2.set("state", "confirmee");
    await transitionIntent(f2);
    const after = (await r.listIntents()).find((i) => i.id === intent.id)!;
    expect(after.state).toBe("confirmee");
    const docs = (await r.listDocuments()).filter((d) => d.intentId === intent.id);
    expect(docs.map((d) => d.type).sort()).toEqual(["bulletin", "fonds"]);
    for (const d of docs) {
      const bytes = await readSource(d.fileKey);
      expect(Buffer.from(bytes.slice(0, 4)).toString("latin1")).toBe("%PDF");
      expect(bytes.length).toBeGreaterThan(2000);
    }
    const events = await r.listEvents(20);
    expect(events.some((e) => e.intentId === intent.id && /Confirmée/i.test(e.html))).toBe(true);
  }, 60_000);
});
