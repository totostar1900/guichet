import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "../..");
const code = (p: string) =>
  fs.readFileSync(path.join(ROOT, p), "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * TROIS RETOUCHES DEMANDÉES LE 1ER NOVEMBRE 2026.
 *
 * « Mon compte » et « Le marché » perdent leur phrase d'en-tête — celle du compte
 * redisait son titre, celle du marché portait aussi le numéro du dernier
 * bulletin, qui se lit ailleurs. Et « Se déconnecter partout » prend la forme de
 * « Se déconnecter de cet appareil », sans perdre sa confirmation : il retire
 * la clé d'accès de TOUS les appareils.
 */
describe("les en-têtes de Mon compte et du marché", () => {
  it("n'ont plus de phrase", () => {
    expect(code("src/app/moi/compte/page.tsx"), "la phrase de « Mon compte » est revenue").not.toMatch(/Qui vous êtes, ce que la maison détient/);
    const marche = code("src/app/marche/page.tsx");
    expect(marche, "la phrase du marché est revenue").not.toMatch(/Ce que la Bourse publie à chaque séance/);
    expect(marche, "le numéro du dernier bulletin est revenu dans l'en-tête").not.toMatch(/Dernier bulletin lu/);
  });
  it("gardent leur titre", () => {
    expect(code("src/app/moi/compte/page.tsx"), "« Mon compte » n'a plus son titre").toMatch(/titre=\{t\("Mon compte"\)\}/);
    expect(code("src/app/marche/page.tsx"), "« Le marché » n'a plus son titre").toMatch(/titre=\{t\("Le marché"\)\}/);
  });
});

describe("Se déconnecter partout", () => {
  const src = () => code("src/app/moi/compte/Deconnexion.tsx");
  it("a la forme du bouton « Se déconnecter de cet appareil »", () => {
    expect(src(), "« partout » n'a plus la forme du bouton de l'appareil").toMatch(/<button type="button" className=\{styles\.sortieBtn\} onClick=\{\(\) => setPartout\(true\)\}>\s*\{t\("Se déconnecter partout"\)\}/);
  });
  it("se demande encore : il ouvre une confirmation, il ne déconnecte pas au premier toucher", () => {
    const s = src();
    expect(s, "le bouton « partout » soumet directement la déconnexion générale").not.toMatch(/type="submit"[^>]*>\s*\{t\("Se déconnecter partout"\)\}/);
    expect(s, "la confirmation « Oui, partout » a disparu").toMatch(/<form action=\{logoutEverywhere\}[\s\S]*?\{t\("Oui, partout"\)\}/);
  });
});
