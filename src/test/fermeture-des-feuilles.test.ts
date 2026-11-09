import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { COURBE_DES_FEUILLES, commencerLeGeste, relacherLaFeuille, suivreLeGeste } from "@/components/mobile/relacher";

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
const code = (f: string) => lire(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

/**
 * LA FERMETURE D'UNE FEUILLE REPREND LÀ OÙ EST LE DOIGT (9 novembre 2026, planche « Gestes et feuilles », 3A).
 * Avant : au relâchement, la feuille était remise à sa position ouverte (« transform = "" », transition comprise) avant d'être fermée : un rebond d'un battement.
 */
const faux = (h = 400) => ({ offsetHeight: h, style: {} as Record<string, string>, classList: { remove: vi.fn() } }) as unknown as HTMLElement & { style: Record<string, string> };

describe("la fermeture d'une feuille", () => {
  it("garde sa position et glisse vers le bas, sans jamais repasser par la position ouverte", () => {
    const el = faux();
    const g = commencerLeGeste(100);
    suivreLeGeste(g, 260, false); // 160 px tirés
    const ferme = relacherLaFeuille(el, g, { classeDeGlissement: "drag" });
    expect(ferme).toBe(true);
    expect(el.style.transform, "la feuille est repassée par sa position ouverte avant de se fermer").toBe("translateY(105%)");
    expect(el.style.transition).toContain(COURBE_DES_FEUILLES);
  });
  it("une fenêtre centrée glisse vers le bas en s'éteignant, une feuille du haut remonte", () => {
    const c = faux();
    const g = commencerLeGeste(100);
    suivreLeGeste(g, 300, false);
    relacherLaFeuille(c, g, { centre: true, classeDeGlissement: "drag" });
    expect(c.style.transform).toMatch(/translate\(-50%, calc\(-50% \+ 55vh\)\)/);
    expect(c.style.opacity).toBe("0");
    const h = faux();
    const g2 = commencerLeGeste(300);
    suivreLeGeste(g2, 100, true);
    relacherLaFeuille(h, g2, { haut: true, classeDeGlissement: "drag" });
    expect(h.style.transform).toBe("translateY(-105%)");
  });
  it("la durée suit la vitesse et reste dans la présence de 300 ms", () => {
    for (const reste of [40, 400, 4000]) {
      const el = faux(reste);
      const g = commencerLeGeste(0);
      g.dy = 100;
      g.v = 0.1;
      relacherLaFeuille(el, g, { classeDeGlissement: "drag" });
      const ms = Number(/transform (\d+)ms/.exec(el.style.transition)?.[1]);
      expect(ms, `durée ${ms} ms hors de 160 à 300`).toBeGreaterThanOrEqual(160);
      expect(ms).toBeLessThanOrEqual(300);
    }
  });
  it("un geste lancé ferme même court, un tiré court revient en place", () => {
    const lance = faux();
    const g = commencerLeGeste(0);
    g.dy = 30;
    g.v = 1.2;
    expect(relacherLaFeuille(lance, g, { classeDeGlissement: "drag" })).toBe(true);
    vi.stubGlobal("window", { setTimeout: (f: () => void) => f() });
    const court = faux();
    const g2 = commencerLeGeste(0);
    g2.dy = 30;
    g2.v = 0.1;
    expect(relacherLaFeuille(court, g2, { classeDeGlissement: "drag" })).toBe(false);
    expect(court.style.transform).toBe("");
    vi.unstubAllGlobals();
  });
  it("Sheet et LineMenu passent par ce relâchement, et n'ont plus le rebond", () => {
    for (const f of ["src/components/mobile/Sheet.tsx", "src/components/mobile/LineMenu.tsx"]) {
      const src = code(f);
      expect(src, `${f} ne relâche plus par « relacher »`).toContain("relacherLaFeuille(");
      expect(src, `${f} remet la feuille en place avant de la fermer (le rebond)`).not.toMatch(/style\.transform = "";\s*if \(dy > 80\)/);
    }
    expect(lire("src/components/mobile/Sheet.module.css")).toMatch(/transition: transform 0\.32s cubic-bezier\(0\.32, 0\.72, 0, 1\)/);
  });
});
