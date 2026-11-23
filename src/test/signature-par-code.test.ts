import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * TOUTE SIGNATURE D'ORDRE SE FAIT AU PIN DU COMPTE (23 novembre 2026, le client : « la signature se fait avec le pin code »).
 *
 * Le 16 novembre 2026 la page « Signer mon ordre » n'offrait plus que le code reçu (plus de Face ID ni d'empreinte). Elle n'offre plus que le code à six chiffres du compte, celui qui ouvre l'application :
 * plus de code à usage unique envoyé, attendu, renvoyé. Le PDF n'est pas affiché : il part par e-mail et sur WhatsApp à la signature.
 */
const ACTIONS = readFileSync("src/app/moi/ordres/[id]/actions.ts", "utf8");
const PAGE = readFileSync("src/app/moi/ordres/[id]/page.tsx", "utf8");
const SIGNATURE = readFileSync("src/app/moi/ordres/[id]/Signature.tsx", "utf8");
const DEVICES = readFileSync("src/lib/auth/devices.ts", "utf8");

describe("l'ordre ne se signe que par le PIN du compte", () => {
  it("aucune action de signature par l'appareil ne subsiste", () => {
    expect(ACTIONS).not.toMatch(/signerAvecLaClef|signerAvecLeCodeDeLAppareil|optionsDeClefAction|confirmerPar/);
    expect(DEVICES).not.toMatch(/export async function confirmerPar/);
    expect(PAGE).not.toMatch(/AuDoigt/);
  });
  it("plus de code à usage unique : rien ne part, rien n'attend, rien ne se renvoie", () => {
    expect(ACTIONS).not.toMatch(/envoyerCodeOrdreAction|signerOrdreAction|notifyCode|nouveauCode/);
    expect(SIGNATURE).not.toMatch(/Recevoir le code|Renvoyer|Saisir le code|reporterLeVerrou/);
  });
  it("la seule méthode écrite à la signature est le code du compte, vérifié sur le serveur", () => {
    const appels = ACTIONS.match(/acheverLaSignature\(/g) ?? [];
    expect(appels.length, "la définition et l'appel du PIN").toBe(2);
    expect(ACTIONS).toMatch(/acheverLaSignature\(intent, userId, "code du compte"\)/);
    expect(ACTIONS).toMatch(/verifierCodeDuCompte\(s, pin\)/);
  });
  it("l'action refuse un ordre déjà signé ou qui ne se signe plus, avant de vérifier le code", () => {
    const i = ACTIONS.indexOf("export async function signerParPin");
    const corps = ACTIONS.slice(i, i + 1100);
    expect(corps).toMatch(/intent\.signedAt/);
    expect(corps).toMatch(/ordreSignable\(intent\)/);
    expect(corps.indexOf("ordreSignable(intent)")).toBeLessThan(corps.indexOf("verifierCodeDuCompte"));
  });
});

describe("les gestes de l'ordre vivent dans la barre du bas", () => {
  it("le clavier du code signe, la barre porte « Supprimer », sans « Modifier » ni bloc « Ensuite »", () => {
    expect(SIGNATURE).toMatch(/<BarreDEtape/);
    expect(SIGNATURE).toMatch(/<ClavierCode/);
    expect(SIGNATURE).toMatch(/signerParPin\(id, code\)/);
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

describe("le PDF part par e-mail et sur WhatsApp, il ne s'affiche pas (23 novembre 2026)", () => {
  it("chaque signature envoie son exemplaire sur les deux canaux, sans jamais bloquer la signature", () => {
    expect(ACTIONS).toMatch(/\["email", "whatsapp"\] as const/);
    expect(ACTIONS).toMatch(/notifyDocument\(doc, canal\)/);
    const i = ACTIONS.indexOf("notifyDocument(doc");
    expect(ACTIONS.slice(i - 300, i)).toMatch(/try \{/);
    expect(ACTIONS, "l'envoi doit se faire après l'écriture de la signature").toMatch(/signedAt: signeLe[\s\S]*notifyDocument\(doc, canal\)/);
    expect(ACTIONS, "un exemplaire qu'aucun canal n'a pu porter est signalé au desk").toMatch(/avis_manque/);
  });
  it("le PDF n'est pas lu à l'écran avant la signature : le lien « Lire l'ordre complet » a disparu, seul « Lire l'ordre signé » reste", () => {
    expect(PAGE).not.toMatch(/Lire l'ordre complet/);
    expect(PAGE).toMatch(/intent\.signedAt && \(\s*<p className=\{styles\.lire\}>/);
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

describe("signer sur un écran, puis une page de confirmation (23 novembre 2026, planche « Signer tous les ordres », 1B)", () => {
  it("un seul écran : le récapitulatif en haut, le clavier du code dessous", () => {
    expect(SIGNATURE).toMatch(/t\("Étape 2 sur 2 · signer"\)/);
    expect(SIGNATURE).toMatch(/\{relire\}[\s\S]*<ClavierCode/);
  });
  it("le serveur passe le récapitulatif ; l'adresse du code n'est plus masquée, il n'y a plus de code envoyé", () => {
    expect(PAGE).toMatch(/relire=\{/);
    expect(PAGE).not.toMatch(/masquerLAdresse|canalDuCode/);
  });
  it("« Envoyer » ouvre la signature : le reçu ne s'intercale pas", () => {
    const f = readFileSync("src/components/IntentForm.tsx", "utf8");
    expect(f).toMatch(/routeur\.push\(`\/moi\/ordres\/\$\{versLaSignature\}`\)/);
  });
  it("la signature acquise ouvre la page de confirmation, qui dit les canaux réellement partis", () => {
    /* Depuis le serveur : une navigation côté client ne partait pas, le composant étant démonté par le rendu « signé » (mesuré). */
    expect(ACTIONS).toMatch(/if \(fin\.ok\) redirect\(`\/moi\/ordres\/\$\{intent\.id\}\/signe`\)/);
    expect(SIGNATURE, "la navigation côté client est revenue").not.toMatch(/router\.replace/);
    const p = readFileSync("src/app/moi/ordres/[id]/signe/page.tsx", "utf8");
    expect(p).toMatch(/if \(!intent\.signedAt\) redirect\(`\/moi\/ordres\/\$\{id\}`\)/);
    expect(p, "les canaux se lisent de ce qui est parti").toMatch(/listNotifications\(500\)/);
    expect(p).toMatch(/n\.status !== "skipped" && n\.status !== "failed"/);
    expect(p).toMatch(/n\.channel === "whatsapp"/);
    expect(p).toContain('href="/moi/ordres"');
    expect(p, "les étapes suivantes ont leur composant").toMatch(/<EtapesSuivantes intent=\{intent\}/);
  });
});
