import { describe, expect, it } from "vitest";
import { APPARENCES, PALETTES, THEMES, apparenceDe } from "@/lib/palette";

/** SIX APPARENCES, UNE LISTE (21 novembre 2026, choix 2A) : chaque apparence est un couple palette + thème qui existe, et tout couple d'avant se lit comme l'une d'elles. */
describe("les six apparences", () => {
  it("sont six, chacune un couple connu", () => {
    expect(APPARENCES.map((a) => a.key)).toEqual(["auto", "clair", "ivoire", "tamise", "marine", "nuit"]);
    for (const a of APPARENCES) {
      expect(PALETTES.some((p) => p.key === a.palette), a.key).toBe(true);
      expect((THEMES as readonly string[]).includes(a.theme), a.key).toBe(true);
    }
  });
  it("relisent leur propre couple", () => {
    for (const a of APPARENCES) expect(apparenceDe(a.palette, a.theme)).toBe(a.key);
  });
  it("reprennent tout couple déjà enregistré, sans en laisser un sans nom", () => {
    for (const p of PALETTES) for (const t of THEMES) expect(APPARENCES.some((a) => a.key === apparenceDe(p.key, t)), `${p.key}/${t}`).toBe(true);
    expect(apparenceDe("ardoise", "dark")).toBe("nuit");
    expect(apparenceDe("encre", "light")).toBe("clair");
    expect(apparenceDe(undefined, undefined)).toBe("auto");
  });
});
