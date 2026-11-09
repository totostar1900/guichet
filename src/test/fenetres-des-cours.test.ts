import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fenetresDesCours } from "@/lib/market/performe";
import type { Quote } from "@/lib/domain/market";

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
const code = (f: string) => lire(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const q = (isin: string, sessionDate: string, close: number) => ({ instrument: "action", isin, mnemo: isin.slice(-3), designation: isin, sessionDate, close }) as unknown as Quote;

/**
 * LA VARIATION D'UNE ACTION SUR SIX MOIS, DOUZE MOIS ET DEUX ANS (9 novembre 2026) vit dans l'extension de sa carte, à la place de « cours inchangé depuis » et de l'ISIN (qui passe à côté de l'état).
 */
describe("la variation sur six mois, douze mois et deux ans", () => {
  const ancienne = [q("GA0000000AAA", "2024-11-11", 100), q("GA0000000AAA", "2025-05-02", 120), q("GA0000000AAA", "2025-11-10", 150), q("GA0000000AAA", "2026-05-11", 180), q("GA0000000AAA", "2026-11-09", 198)];
  const recente = [q("GA0000000BBB", "2026-08-26", 85000), q("GA0000000BBB", "2026-11-09", 85000)];

  it("une ligne cotée depuis assez longtemps a ses trois chiffres", () => {
    const f = fenetresDesCours([...ancienne, ...recente], "2026-11-09")["GA0000000AAA"];
    expect(f.mois6.pct).toBeCloseTo(((198 - 180) / 180) * 100, 5);
    expect(f.mois12.pct).toBeCloseTo(((198 - 150) / 150) * 100, 5);
    expect(f.ans2.pct).toBeCloseTo(((198 - 100) / 100) * 100, 5);
  });
  it("une ligne entrée à la cote pendant la fenêtre n'a pas de chiffre inventé : elle dit depuis quand elle y est", () => {
    const f = fenetresDesCours([...ancienne, ...recente], "2026-11-09")["GA0000000BBB"];
    for (const w of [f.mois6, f.mois12, f.ans2]) {
      expect(w.pct, "un chiffre a été prêté à une ligne qui n'était pas à la cote").toBeNull();
      expect(w.depuis).toBe("2026-08-26");
    }
  });
  it("l'extension montre les trois fenêtres côte à côte, l'ISIN à côté de l'état, et plus le cours ni « cours inchangé »", () => {
    const oc = code("src/components/OfferCard.tsx");
    expect(oc).toMatch(/\{dos && <span className=\{styles\.isinCoin\}>\{o\.isin\}<\/span>\}\s*<span className=\{`pill/);
    expect(oc, "les trois fenêtres ont disparu de l'extension").toMatch(/\["6 mois", courbe\.fenetres\.mois6\], \["12 mois", courbe\.fenetres\.mois12\], \["2 ans", courbe\.fenetres\.ans2\]/);
    expect(oc, "le chiffre en avant est revenu dans l'extension").toMatch(/\{!dos && \(\s*<>\s*\{estAction && prix \? \(/);
    expect(oc, "« cours inchangé depuis » est revenu dans l'extension").toMatch(/faitsAction\(s\)\.filter\(\(\[k\]\) => k !== "Cours inchangé depuis" && k !== "Ticket min\."\)/);
    expect(oc, "l'ISIN est revenu au pied de l'extension").toMatch(/\{!dos && <span className=\{styles\.footIsin\}>/);
    expect(code("src/app/TitresBody.tsx"), "la cote ne lit plus les trois fenêtres").toMatch(/fenetres: fenetres\[l\.isin\]/);
  });
  it("l'extension d'un fonds ne redit pas son titre et porte l'ISIN à côté de la pastille", () => {
    const fc = code("src/app/fonds/FundCard.tsx");
    expect(fc).toMatch(/\{!dos && <div className=\{styles\.fundTitle\}>/);
    expect(fc).toMatch(/\{dos && <span className=\{styles\.isinCoin\}>\{r\.isin\}<\/span>\}\s*\{pastille\}/);
  });
});
