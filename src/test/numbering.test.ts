import { beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Two references per document. What a client holds says nothing about how many
 * documents the firm has issued; the register, kept at the desk, is an unbroken
 * sequence that never reuses a number, even after a document is removed.
 * In-memory repository.
 */
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
});

const doc = (number: string, registerNo?: string) => ({
  type: "fonds" as const,
  number,
  registerNo,
  title: "t",
  fileKey: `docs/${number}.pdf`,
  status: "genere" as const,
  createdAt: "2026-09-22T09:00:00.000Z",
});

describe("les références d'un document", () => {
  it("gives a client document an opaque reference and keeps the sequence in the register", async () => {
    const { repo } = await import("@/lib/data");
    const { nextNumbers, registerOf } = await import("@/lib/documents/numbering");
    const now = new Date("2026-09-22T09:00:00.000Z");

    const first = await nextNumbers("fonds", now);
    expect(first.registerNo).toBe("PC-AF-2026-0001");
    // the client's copy carries the day and four characters, no rank
    expect(first.number).toMatch(/^PC-AF-260922-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{4}$/);
    expect(first.number).not.toContain("0001");

    await repo().createDocument(doc(first.number, first.registerNo));
    const second = await nextNumbers("fonds", now);
    expect(second.registerNo).toBe("PC-AF-2026-0002");
    expect(second.number).not.toBe(first.number);
  });

  it("never hands a removed document's number to the next one", async () => {
    const { repo } = await import("@/lib/data");
    const { nextNumbers } = await import("@/lib/documents/numbering");
    const now = new Date("2026-09-22T09:00:00.000Z");

    const a = await nextNumbers("releve", now);
    const kept = await repo().createDocument({ ...doc(a.number, a.registerNo), type: "releve" });
    const b = await nextNumbers("releve", now);
    await repo().createDocument({ ...doc(b.number, b.registerNo), type: "releve" });
    expect(b.registerNo).toBe("PC-REL-2026-0002");

    // the first entry disappears : the next one still follows the highest logged
    const docs = await repo().listDocuments();
    const rest = docs.filter((d) => d.id !== kept.id);
    vi.spyOn(repo(), "listDocuments").mockResolvedValueOnce(rest);
    const c = await nextNumbers("releve", now);
    expect(c.registerNo).toBe("PC-REL-2026-0003");
  });

  it("keeps the sequence as the reference for a counterparty document", async () => {
    const { nextNumbers, isSequentialRef } = await import("@/lib/documents/numbering");
    const now = new Date("2026-09-22T09:00:00.000Z");
    expect(isSequentialRef("bordereau")).toBe(true);
    expect(isSequentialRef("dossier_svt")).toBe(true);
    expect(isSequentialRef("bulletin")).toBe(false);
    const b = await nextNumbers("bordereau", now);
    expect(b.number).toBe(b.registerNo);
    expect(b.number).toBe("PC-SVT-2026-0001");
  });

  it("lets a note on the index keep the reference of its period", async () => {
    const { nextNumbers } = await import("@/lib/documents/numbering");
    const n = await nextNumbers("note_indice", new Date("2026-09-22T09:00:00.000Z"), "PC-IDX-2026T2");
    expect(n.number).toBe("PC-IDX-2026T2");
    expect(n.registerNo).toBe("PC-IDX-2026-0001");
  });

  it("reads an older document's register entry from the reference it was given", async () => {
    const { registerOf } = await import("@/lib/documents/numbering");
    expect(registerOf({ number: "PC-AF-2026-0002", registerNo: undefined })).toBe("PC-AF-2026-0002");
    expect(registerOf({ number: "PC-AF-260922-K7Q4", registerNo: "PC-AF-2026-0002" })).toBe("PC-AF-2026-0002");
  });
});

describe("la référence d'un ordre", () => {
  it("carries no rank, while the order journal keeps the sequence", async () => {
    const { makeOrderNo, makeRef } = await import("@/lib/data/repository");
    const day = new Date("2026-09-14T09:00:00.000Z");
    const a = makeRef("ferme", day);
    expect(a).toMatch(/^PF-0914-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{4}$/);
    // no I, L, O, U, zero or one : it is read out on the phone and typed on a transfer form
    expect(a.slice(8)).not.toMatch(/[ILOU01]/);
    // two orders taken the same day do not follow one another
    const b = makeRef("ferme", day);
    expect(b).not.toBe(a);
    expect(makeOrderNo(18)).toBe("PC-ORD-000018");
  });

  it("gives a new order both references", async () => {
    const { repo } = await import("@/lib/data");
    const offers = await repo().listOffers();
    const offer = offers[0];
    const i = await repo().createIntent({ offerId: offer.id, clientName: "Cliente de test", clientSegment: "Particulier", type: "ferme", amount: 1_000_000, channel: "WhatsApp" });
    expect(i.ref).toMatch(/^PF-\d{4}-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{4}$/);
    expect(i.registerNo).toMatch(/^PC-ORD-\d{6}$/);
  });
});
