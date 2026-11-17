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
  it("la page signée dit comment régler : coordonnées du desk, motif = référence de l'ordre (écrit une seule fois, dans PourFinir)", () => {
    const pf = readFileSync("src/app/moi/ordres/[id]/PourFinir.tsx", "utf8");
    expect(pf).toMatch(/loadReglement\(\)/);
    expect(pf).toMatch(/t\("Pour finir"\)/);
    expect(pf).toMatch(/<b className="mono">\{intent\.ref\}<\/b>\s*<Copier valeur=\{intent\.ref\}/);
    expect(pf, "rien à virer quand la provision a couvert l'ordre").toMatch(/if \(couvert \|\| aRegler <= 0\) return null/);
    expect(PAGE).toMatch(/<PourFinir intent=\{intent\}/);
    expect(readFileSync("src/app/moi/ordres/[id]/signe/page.tsx", "utf8")).toMatch(/<PourFinir intent=\{intent\}/);
  });
});

describe("le code de l'ordre marche jusqu'au bout (16 novembre 2026)", () => {
  it("l'instant d'envoi ne se recalcule pas à chaque rendu : le compte à rebours baisse", () => {
    /* Mesuré : « Renvoyer dans 45 s » restait à 45 s indéfiniment et la validité à 10:00, parce que « new Date() » était appelé à chaque rendu. */
    expect(SIGNATURE).toMatch(/useMemo\(\(\) => \(envoi\?\.ok \? new Date\(\)\.toISOString\(\) : undefined\), \[envoi\]\)/);
    expect(SIGNATURE, "la date est revenue dans le rendu").not.toMatch(/const parti = envoi\?\.ok \? new Date/);
  });
  it("chaque signature envoie son exemplaire par e-mail, sans jamais bloquer la signature", () => {
    expect(ACTIONS).toMatch(/notifyDocument\(doc, "email"\)/);
    const i = ACTIONS.indexOf("notifyDocument(doc");
    expect(ACTIONS.slice(i - 400, i)).toMatch(/try \{/);
    expect(ACTIONS, "l'envoi doit se faire après l'écriture de la signature").toMatch(/signedAt: signeLe[\s\S]*notifyDocument\(doc, "email"\)/);
  });
});

describe("l'e-mail d'un ordre signé ne demande pas de le signer (16 novembre 2026)", () => {
  it("l'exemplaire signé dit qu'il est signé, qu'il n'y a rien à renvoyer, et ce qu'il reste à faire", () => {
    const compose = readFileSync("src/lib/notify/compose.ts", "utf8");
    expect(compose).toMatch(/function exemplaireSigne\(/);
    expect(compose).toMatch(/Rien à nous retourner/);
    expect(compose).toMatch(/\(i && exemplaireSigne\(d, i, o\)\) \?\? action\[d\.type\]/);
    expect(readFileSync("src/lib/notify/dispatch.ts", "utf8")).toMatch(/documentSent\(d, o, i\)/);
  });
});

describe("signer en deux étapes, puis une page de confirmation (17 novembre 2026, planche « Signer et suivre », 3A et 4A)", () => {
  it("les deux étapes ont chacune leur bouton : « Recevoir le code » puis « Je signe mon ordre », jamais les deux ensemble", () => {
    expect(SIGNATURE).toMatch(/const enCode = Boolean\(parti\) && !retour && !confirme/);
    expect(SIGNATURE).toMatch(/\) : enCode \? \(/);
    expect(SIGNATURE).toMatch(/t\("Étape 1 sur 2 · relire"\)/);
    expect(SIGNATURE).toMatch(/t\("Étape 2 sur 2 · code"\)/);
    /* « Retour » revient à la relecture sans perdre le code envoyé. */
    expect(SIGNATURE).toMatch(/onClick=\{\(\) => setRetour\(true\)\}/);
  });
  it("le serveur passe le récapitulatif à l'étape 1 et masque l'adresse du code", () => {
    expect(PAGE).toMatch(/relire=\{/);
    expect(PAGE).toMatch(/masquerLAdresse\(canal\.to\)/);
    expect(readFileSync("src/lib/kyc/canal.ts", "utf8")).toMatch(/export function masquerLAdresse/);
  });
  it("la signature acquise ouvre la page de confirmation, qui dit l'e-mail réellement parti", () => {
    /* Depuis le serveur : une navigation côté client ne partait pas, le composant étant démonté par le rendu « signé » (mesuré). */
    expect(ACTIONS).toMatch(/if \(fin\.ok\) redirect\(`\/moi\/ordres\/\$\{intent\.id\}\/signe`\)/);
    expect(SIGNATURE, "la navigation côté client est revenue").not.toMatch(/router\.replace/);
    const p = readFileSync("src/app/moi/ordres/[id]/signe/page.tsx", "utf8");
    expect(p).toMatch(/if \(!intent\.signedAt\) redirect\(`\/moi\/ordres\/\$\{id\}`\)/);
    expect(p, "l'e-mail se lit de ce qui est parti").toMatch(/listNotifications\(500\)/);
    expect(p).toMatch(/n\.status !== "skipped" && n\.status !== "failed"/);
    expect(p).toContain('href="/moi/ordres"');
  });
});
