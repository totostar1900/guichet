import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * TOUTE SIGNATURE SE FAIT AVEC UN CODE (16 novembre 2026).
 *
 * La page « Signer mon ordre » proposait aussi Face ID, l'empreinte et le code de l'appareil. Elle n'offre plus que le code reçu : une seule preuve à expliquer, la même
 * que la convention et le mandat. Les appareils servent à se connecter, plus à signer.
 */
const ACTIONS = readFileSync("src/app/moi/ordres/[id]/actions.ts", "utf8");
const PAGE = readFileSync("src/app/moi/ordres/[id]/page.tsx", "utf8");
const SIGNATURE = readFileSync("src/app/moi/ordres/[id]/Signature.tsx", "utf8");
const DEVICES = readFileSync("src/lib/auth/devices.ts", "utf8");

describe("l'ordre ne se signe que par le code reçu", () => {
  it("aucune action de signature par l'appareil ne subsiste", () => {
    expect(ACTIONS).not.toMatch(/signerAvecLaClef|signerAvecLeCodeDeLAppareil|optionsDeClefAction|confirmerPar/);
    expect(DEVICES).not.toMatch(/export async function confirmerPar/);
    expect(PAGE).not.toMatch(/AuDoigt/);
  });
  it("la seule méthode écrite à la signature est le code à usage unique", () => {
    const appels = ACTIONS.match(/acheverLaSignature\(/g) ?? [];
    expect(appels.length, "la définition et l'appel du code reçu").toBe(2);
    expect(ACTIONS).toMatch(/acheverLaSignature\(intent, mien\.userId, "code à usage unique"/);
  });
  it("l'action refuse un ordre déjà signé ou qui ne se signe plus", () => {
    const i = ACTIONS.indexOf("export async function signerOrdreAction");
    const corps = ACTIONS.slice(i, i + 900);
    expect(corps).toMatch(/intent\.signedAt/);
    expect(corps).toMatch(/ordreSignable\(intent\)/);
  });
});

describe("les gestes de l'ordre vivent dans la barre du bas", () => {
  it("signer et supprimer, côte à côte, sans « Modifier » ni bloc « Ensuite »", () => {
    expect(SIGNATURE).toMatch(/<BarreDEtape/);
    expect(SIGNATURE).toMatch(/t\("Je signe mon ordre"\)/);
    expect(SIGNATURE).toMatch(/t\("Supprimer"\)/);
    expect(SIGNATURE, "il n'y a pas de modification d'un ordre").not.toMatch(/t\("Modifier"\)/);
    expect(PAGE, "le bloc « Ensuite » est retiré").not.toMatch(/styles\.suite|t\("Ensuite"\)|Le desk donne le go/);
  });
  it("le rappel « ?retirer » ouvre la confirmation d'office", () => {
    expect(PAGE).toMatch(/ouvertDoffice=\{"retirer" in/);
    expect(SIGNATURE).toMatch(/useState\(Boolean\(ouvertDoffice\)\)/);
  });
});

describe("la signature confirme l'ordre : pas de validation du desk (16 novembre 2026)", () => {
  it("à la signature, l'ordre reçu passe à confirmé, et le registre le dit", () => {
    expect(ACTIONS).toMatch(/if \(intent\.state === "recue"\) \{\s*await r\.setIntentState\(intent\.id, "confirmee"\);/);
    expect(ACTIONS).toMatch(/confirmé par la signature du client/);
  });
  it("la page signée dit comment régler : coordonnées du desk, motif = référence de l'ordre", () => {
    expect(PAGE).toMatch(/loadReglement\(\)/);
    expect(PAGE).toMatch(/t\("Pour finir"\)/);
    expect(PAGE).toMatch(/<b className="mono">\{intent\.ref\}<\/b>\s*<Copier valeur=\{intent\.ref\}/);
    expect(PAGE, "rien à virer quand la provision a couvert l'ordre").toMatch(/intent\.signedAt && !couvert && aRegler > 0/);
  });
});
