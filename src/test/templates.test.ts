import { describe, expect, it } from "vitest";
import { checkPassage, fill, PASSAGES, resolvePassages } from "@/lib/documents/passages";
import { repo } from "@/lib/data";

/** The desk's wording: defaults from the code, versions from the registry, rules on placeholders. */
describe("templates registry", () => {
  const def = PASSAGES.bulletin!.find((d) => d.key === "ordre_primaire")!;
  it("fills placeholders and leaves an unknown one visible", () => {
    expect(fill("Ordre pour {societe} le {date_adjudication}", { societe: "PC", date_adjudication: "15 oct." })).toBe("Ordre pour PC le 15 oct.");
    expect(fill("{inconnu}", {})).toBe("{inconnu}");
  });
  it("refuses an empty language, an unknown field, a missing required field and advice words", () => {
    expect(checkPassage(def, "x {societe} {date_adjudication}", "")).toMatch(/anglais/);
    expect(checkPassage(def, "x {societe} {date_adjudication} {foo}", "y {societe} {date_adjudication}")).toMatch(/inconnu/);
    expect(checkPassage(def, "sans champs", "no fields")).toMatch(/doit rester/);
    expect(checkPassage(def, "la meilleure {societe} {date_adjudication}", "x {societe} {date_adjudication}")).toMatch(/conseille/);
    expect(checkPassage(def, "ok {societe} {date_adjudication}", "ok {societe} {date_adjudication}")).toBeUndefined();
  });
  it("serves the default at version 0, then the current version, never a pending one", async () => {
    const before = await resolvePassages("bulletin");
    expect(before.versions.irrevocable).toBe(0);
    expect(before.text.irrevocable).toBe(PASSAGES.bulletin!.find((d) => d.key === "irrevocable")!.fr);
    await repo().addTemplateText({ docType: "bulletin", passage: "irrevocable", fr: "Proposé.", en: "Proposed.", status: "pending", by: "A" });
    const still = await resolvePassages("bulletin");
    expect(still.versions.irrevocable).toBe(0);
    const v2 = await repo().addTemplateText({ docType: "bulletin", passage: "irrevocable", fr: "En vigueur.", en: "In force.", status: "current", by: "B" });
    expect(v2.version).toBe(2);
    const after = await resolvePassages("bulletin");
    expect(after.text.irrevocable).toBe("En vigueur.");
    expect(after.versions.irrevocable).toBe(2);
    expect((await resolvePassages("bulletin", "en")).text.irrevocable).toBe("In force.");
    // an older version comes back as current; the newer one is superseded
    const all = await repo().listTemplateTexts("bulletin");
    const v1 = all.find((r) => r.passage === "irrevocable" && r.version === 1)!;
    await repo().setTemplateTextStatus(v1.id, "current", "C");
    const back = await resolvePassages("bulletin");
    expect(back.text.irrevocable).toBe("Proposé.");
    expect((await repo().listTemplateTexts("bulletin")).find((r) => r.version === 2)!.status).toBe("superseded");
  });
});
