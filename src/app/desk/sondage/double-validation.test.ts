import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const lire = (p: string) => fs.readFileSync(path.join(__dirname, p), "utf8");

/**
 * POSER UNE QUESTION ET LA CLORE SE FONT EN DEUX TEMPS ; « PORTER AU TRÉSOR » N'EXISTE PLUS (12 novembre 2026, à la demande du client).
 */
describe("le sondage du desk : deux temps pour poser et pour clore", () => {
  const f = lire("Formulaires.tsx");

  it("« Poser la question » ouvre une relecture : plus de bouton qui poste directement", () => {
    expect(f).toMatch(/<ConfirmPublish form=\{formId\} label=\{t\("Poser la question"\)\}/);
    expect(f.slice(f.indexOf("export function PoserUneQuestion"), f.indexOf("export function Statuer"))).not.toMatch(/type="submit"/);
  });

  it("la relecture redit la ligne, le montant, l'horizon et ce que les clients liront", () => {
    for (const mot of ["Question : {i}", "Montant cherché : {m} FCFA", "Ce que les clients liront", "dès maintenant sur la page de tous les clients"]) expect(f).toContain(mot);
  });

  it("« Clore » ouvre une relecture qui dit les réponses closes avec la ligne et le motif lu par le client, et exige un motif", () => {
    const s = f.slice(f.indexOf("export function Statuer"));
    expect(s).toMatch(/<ConfirmPublish\s+form=\{formId\}\s+label=\{t\("Clore"\)\}/);
    expect(s).toContain("Les {n} réponses qui la suivent sont closes avec elle.");
    expect(s).toMatch(/disabled=\{motif\.trim\(\)\.length < 3\}/);
    expect(s).not.toMatch(/type="submit"/);
  });

  it("« Portée au Trésor » n'est plus un geste du desk, ni la section « À porter au Trésor », ni l'action de la tuile du Carnet", () => {
    expect(f).not.toMatch(/t\("Portée au Trésor"\)|setEtat\("consolidee"\)/);
    const page = lire("page.tsx");
    expect(page).not.toMatch(/À porter au Trésor|styles\.mur\b/);
    expect(lire("../today/today.ts")).not.toMatch(/porter au Trésor/);
  });

  it("une demande qui a franchi le seuil ne disparaît pas : la table de ce qui s'accumule les montre toutes, avec le seuil", () => {
    expect(lire("page.tsx")).toMatch(/groupes\.map\(\(c\) => \{[\s\S]*?mur\(c\)/);
    expect(lire("Accumulation.tsx")).toMatch(/x\.atteint \? t\("atteint"\) : t\("sous le seuil"\)/);
  });
});
