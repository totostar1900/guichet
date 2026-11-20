import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * « LIRE LA PIÈCE » A PLUS DE TEMPS QUE L'ARRIVÉE D'UN COURRIEL (20 novembre 2026, le client : « le bouton apparaît mais rien ne se passe »).
 * Trois clics, trois abandons à quarante secondes, même avec le modèle rapide : le délai était la seule coupure.
 */
describe("la lecture demandée depuis le desk", () => {
  const extract = lire("src/lib/intake/extract.ts");
  const lecture = lire("src/lib/intake/lecture.ts");
  const ingest = lire("src/lib/intake/ingest.ts");

  it("dispose de deux minutes, la page « À valider » portant sa propre durée maximale", () => {
    expect(extract).toMatch(/LECTURE_DESK_MS = 120_000/);
    expect(extract).toMatch(/timeout: options\.delaiMs \?\? LECTURE_MS/);
    expect(lecture).toMatch(/extractOffer\(input, \{ delaiMs: LECTURE_DESK_MS \}\)/);
    expect(lire("src/app/desk/a-valider/page.tsx")).toMatch(/export const maxDuration = 300;/);
  });

  it("l'arrivée d'un courriel garde ses quarante secondes (le webhook n'a que soixante secondes)", () => {
    expect(extract).toMatch(/const LECTURE_MS = 40_000;/);
    expect(ingest).toMatch(/extractOffer\(extraction!\)/);
    expect(ingest).not.toMatch(/LECTURE_DESK_MS/);
  });

  it("le bouton dit qu'il travaille, et seul celui qui a envoyé le formulaire se grise en le disant", () => {
    const f = lire("src/app/desk/a-valider/ValidateForm.tsx");
    expect(f).toMatch(/useFormStatus\(\)/);
    expect(f).toMatch(/data\?\.get\("geste"\) === "lire"/);
    expect(f).toMatch(/name="geste" value="lire" formAction=\{lireSourceAction\}/);
  });
});
