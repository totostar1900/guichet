import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * L'EMPREINTE A QUITTÉ LE NAVIGATEUR (20 novembre 2026, le client : « le password de l'écran ne devrait pas pouvoir ouvrir l'application. Uniquement celui rentré par le client »).
 *
 * Dans un navigateur, l'empreinte passe par une clé d'accès (WebAuthn), et le téléphone l'accorde aussi au code d'écran, connu des proches ; aucun réglage ne n'accepte que la biométrie. Les deux entrées serveur sont supprimées : seul le code Guichet ouvre. L'empreinte reviendra avec une application native.
 */
describe("aucune entrée n'ouvre Guichet par une clé d'accès", () => {
  const a = lire("src/app/connexion/actions.ts");
  const code = (f: string) => lire(f).replace(/\/\*[\s\S]*?\*\//g, "");
  it("le serveur n'expose ni les options ni l'ouverture par clé, ni l'enrôlement d'une clé", () => {
    expect(code("src/app/connexion/actions.ts")).not.toMatch(/passkeyOptions|passkeyLogin|passkeyAuthenticate/);
    expect(code("src/app/moi/securite/actions.ts")).not.toMatch(/beginPasskey|finishPasskey|passkeyRegister/);
    expect(a).toMatch(/export async function pinLogin/);
  });
  it("aucun écran du navigateur n'appelle WebAuthn", () => {
    for (const f of ["src/components/VerrouDeLApp.tsx", "src/app/connexion/PorteDeConnexion.tsx", "src/app/connexion/creer/CreerCompte.tsx", "src/app/parametres/Connexion.tsx", "src/components/ClavierCode.tsx", "src/components/EcranDeCode.tsx"]) {
      expect(code(f), f).not.toMatch(/@simplewebauthn|startAuthentication|startRegistration|passkeyLogin|beginPasskey/);
    }
    expect(existsSync("src/app/connexion/DeviceSignIn.tsx"), "le bloc d'empreinte de la porte est revenu").toBe(false);
  });
  it("« Oublier » un appareil se fait à Paramètres ; la page de connexion n'oublie rien côté serveur", () => {
    expect(code("src/app/connexion/PorteDeConnexion.tsx")).not.toMatch(/forgetDevice/);
    expect(lire("src/app/moi/securite/actions.ts")).toMatch(/export async function forgetDeviceAction/);
  });
});

describe("la page de connexion : une colonne centrée, des champs et des boutons pleine largeur", () => {
  const css = lire("src/app/connexion/page.module.css");
  const p = lire("src/app/connexion/page.tsx").replace(/\/\*[\s\S]*?\*\//g, "");
  it("la colonne fait 28rem, sans cadre à bord doré ; la démonstration garde sa largeur", () => {
    expect(css).toMatch(/\.card \{[^}]*width: min\(28rem, 100%\);/);
    expect(css).not.toMatch(/border-top: 3px solid var\(--gold\)/);
    expect(css).toMatch(/\.card\.large \{[^}]*width: min\(720px, 100%\);/);
    expect(p).toMatch(/mode === "supabase" \? "" : styles\.large/);
  });
  it("les champs et les boutons du code sont à bouts ronds et pleine largeur", () => {
    expect(css).toMatch(/\.otp :global\(\.field\) input \{[^}]*width: 100%;[^}]*border-radius: 999px;/);
    expect(css, "la porte Google est revenue dans la feuille").not.toMatch(/\.google/);
  });
  it("plus de « Vous découvrez Guichet ? » ni de bloc d'empreinte sous le formulaire", () => {
    expect(p, "« Vous découvrez Guichet ? » est revenu").not.toMatch(/Vous découvrez Guichet|ReplayPresentation|Trente secondes pour comprendre/);
    expect(p, "le bloc d'empreinte est revenu").not.toMatch(/DeviceSignIn/);
  });
});
