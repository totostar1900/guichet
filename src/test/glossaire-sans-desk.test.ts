import { describe, expect, it } from "vitest";
import { translator } from "@/i18n/core";
import { GLOSSARY } from "@/lib/glossary";

/* LE GLOSSAIRE NE DIT PAS « DESK » (21 novembre 2026, le client : « retire desk du glossaire aussi »). Le mot est celui de la maison, pas du client : un terme que le client ouvre dit « la maison ». */
describe("le glossaire du client", () => {
  const en = translator("en");
  it("aucune définition ne dit « desk », en français comme en anglais", () => {
    for (const [clef, t] of Object.entries(GLOSSARY)) {
      expect(`${t.short} ${t.text}`, `« ${clef} » (français)`).not.toMatch(/\bdesk\b/i);
      expect(en(t.text), `« ${clef} » (anglais)`).not.toMatch(/\bdesk\b/i);
    }
  });
});
