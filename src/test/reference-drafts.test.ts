import { describe, expect, it } from "vitest";
import { memoryRepository } from "@/lib/data/memory";

/**
 * The reference data moves in three states: the code default, a draft the
 * desk saved, the published value. Publishing applies the drafts, discarding
 * drops them, a « reset » draft removes the row at publication, and a new
 * entry that never got published simply disappears when discarded.
 */
const KIND = "bond_term";
const r = memoryRepository;

describe("reference drafts", () => {
  it("a draft does not move the published value until publication", async () => {
    await r.upsertReference(KIND, "T1", { periodsPerYear: 1 }, "seed");
    await r.saveReferenceDraft(KIND, "T1", { op: "set", data: { periodsPerYear: 2 } }, "Georges");
    let row = (await r.listReference(KIND)).find((x) => x.key === "T1")!;
    expect(row.data).toEqual({ periodsPerYear: 1 });
    expect(row.draft).toEqual({ op: "set", data: { periodsPerYear: 2 } });
    expect(row.draftBy).toBe("Georges");
    expect(await r.publishReference(KIND)).toEqual(["T1"]);
    row = (await r.listReference(KIND)).find((x) => x.key === "T1")!;
    expect(row.data).toEqual({ periodsPerYear: 2 });
    expect(row.draft).toBeUndefined();
    expect(row.updatedBy).toBe("Georges");
  });

  it("discarding keeps the published value; a never-published entry disappears", async () => {
    await r.saveReferenceDraft(KIND, "T1", { op: "set", data: { periodsPerYear: 4 } }, "Awa");
    await r.saveReferenceDraft(KIND, "NEW1", { op: "set", data: { periodsPerYear: 1 } }, "Awa");
    expect((await r.listReference(KIND)).find((x) => x.key === "NEW1")?.data).toBeNull();
    expect((await r.discardReference(KIND)).sort()).toEqual(["NEW1", "T1"]);
    const rows = await r.listReference(KIND);
    expect(rows.find((x) => x.key === "T1")?.data).toEqual({ periodsPerYear: 2 });
    expect(rows.find((x) => x.key === "NEW1")).toBeUndefined();
  });

  it("a reset draft removes the row at publication, so the code default shows again", async () => {
    await r.saveReferenceDraft(KIND, "T1", { op: "reset" }, "Georges");
    await r.saveReferenceDraft(KIND, "T2", { op: "set", data: { periodsPerYear: 2 } }, "Georges");
    expect(await r.publishReference(KIND, ["T1"])).toEqual(["T1"]);
    const rows = await r.listReference(KIND);
    expect(rows.find((x) => x.key === "T1")).toBeUndefined();
    expect(rows.find((x) => x.key === "T2")?.draft).toBeDefined();
  });
});
