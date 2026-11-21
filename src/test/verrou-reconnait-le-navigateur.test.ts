import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/* LE VERROU ENRÔLE CE NAVIGATEUR (21 novembre 2026, le client : « après la déconnexion de cet appareil, la reconnexion renvoie vers l'inscription »).
   Un compte dont le code a été posé par le verrou n'avait jamais d'appareil reconnu : la porte montrait le champ e-mail, puis « Créer votre compte ». */
const verrou = readFileSync("src/components/VerrouDeLApp.tsx", "utf8");
const securite = readFileSync("src/app/moi/securite/SecurityPanel.tsx", "utf8");
const appareil = readFileSync("src/lib/device-client.ts", "utf8");

describe("le verrou reconnaît le navigateur", () => {
  it("enrôle ce navigateur avec le code saisi, à la pose comme au déverrouillage", () => {
    expect(verrou).toMatch(/enrolPin\(token, code, deviceLabel\(\)\)/);
    expect(verrou).toMatch(/enregistrerLeCode\(/);
    expect(verrou).toMatch(/await poserLeCode\(code\);[\s\S]*?await reconnaitreCeNavigateur\(code, prenom\);/);
    expect(verrou).toMatch(/const r = await verifierLeCode\(code\);\s*if \(r\.ok\) \{\s*await reconnaitreCeNavigateur\(code, prenom\);/);
  });
  it("ne refait rien si le navigateur est déjà reconnu, ni après « Oublier cet appareil »", () => {
    expect(verrou).toMatch(/if \(readDevice\(\) \|\| appareilOublieVoulu\(\)\) return;/);
    expect(securite).toMatch(/clearDevice\(\);\s*marquerAppareilOublie\(\);/);
    expect(appareil).toMatch(/localStorage\.removeItem\(OUBLI_VOULU\);\s*localStorage\.setItem\(KEY/);
  });
  it("un échec d'enrôlement n'empêche jamais d'entrer", () => {
    expect(verrou).toMatch(/catch \{\s*\/\* un échec ne doit jamais empêcher d'entrer \*\//);
  });
});
