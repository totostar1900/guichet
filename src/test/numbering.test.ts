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
