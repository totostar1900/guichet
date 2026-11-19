import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * LA BIOMÉTRIE DIRECTEMENT, ET UNE PAGE DE CONNEXION REPRISE (18 novembre 2026).
 * Le client : « pourquoi la connexion via empreinte et Face ID me demande de choisir le "use a passkey" ? Chez Revolut l'empreinte est directement sur l'écran. Retirer le "Bonjour xxx" sur l'écran de connexion. Réorganiser la page plus élégamment. »
 */
describe("l'appareil reconnu ouvre directement sur Face ID ou l'empreinte", () => {
  const d = lire("src/lib/auth/devices.ts");
  const a = lire("src/app/connexion/actions.ts");
  const brut = lire("src/app/connexion/DeviceSignIn.tsx");
  /* Le code sans ses commentaires : les commentaires citent les mots retirés pour dire pourquoi. */
  const c = brut.replace(/\/\*[\s\S]*?\*\//g, "");

  it("le serveur désigne la clé de l'appareil reconnu (liste « allowCredentials », transport interne) et exige le visage ou l'empreinte", () => {
    const debut = d.indexOf("export async function passkeyAuthenticationOptions");
    const fonction = d.slice(debut, d.indexOf("/**", debut));
    expect(fonction).toMatch(/passkeyAuthenticationOptions\(deviceId\?: string\)/);
    expect(fonction).toMatch(/findDevice\(\{ id: deviceId \}\)/);
    expect(fonction).toMatch(/transports: \["internal" as const\]/);
    expect(fonction).toMatch(/userVerification: "required", allowCredentials/);
  });

  it("un identifiant mal formé ne désigne aucune clé : la porte sans liste s'ouvre à la place", () => {
    expect(a).toMatch(/passkeyOptions\(deviceId\?: string\)/);
    expect(a).toMatch(/\/\^\[a-zA-Z0-9-\]\{4,60\}\$\/\.test\(deviceId\)/);
  });

  it("la page envoie l'identifiant de l'appareil reconnu (jamais celui d'un code à quatre chiffres)", () => {
    expect(c).toMatch(/passkeyOptions\(device\?\.kind === "passkey" \? device\.id : undefined\)/);
  });

  it("la biométrie est un bloc d'icône, titre, phrase et bouton à bouts ronds, sans « Bonjour », sans nom, sans « Pas vous ? »", () => {
    expect(c).not.toMatch(/Bonjour/);
    expect(c).not.toMatch(/device\.who/);
    expect(c, "le lien « Pas vous ? » est revenu").not.toMatch(/Pas vous/);
    expect(c).toMatch(/className=\{styles\.bioBloc\}/);
    expect(c).toMatch(/className=\{styles\.bioBouton\}/);
    expect(c).toMatch(/Ouvrir avec Face ID, empreinte ou code de l'appareil/);
    expect(c).toMatch(/Connexion biométrique/);
    expect(lire("src/app/connexion/page.module.css")).toMatch(/\.bioBouton \{[^}]*border-radius: 999px;/);
  });

  it("« Oublier cet appareil ici » ne retire que le souvenir de ce navigateur ; le retrait de l'appareil se fait à Mon compte > Sécurité", () => {
    expect(c).toMatch(/clearDevice\(\);\s*setHidden\(true\);/);
    expect(c, "la page de connexion ne doit pas oublier l'appareil côté serveur").not.toMatch(/forgetDevice/);
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
  it("l'e-mail est en haut et la biométrie en bas ; plus de « Vous découvrez Guichet ? »", () => {
    expect(p.indexOf("<EmailOtpForm"), "le formulaire e-mail doit venir avant la biométrie").toBeLessThan(p.indexOf("<DeviceSignIn"));
    expect(p.indexOf("<DeviceSignIn"), "la biométrie doit être en bas de la carte").toBeGreaterThan(p.indexOf("devForm"));
    expect(p, "« Vous découvrez Guichet ? » est revenu").not.toMatch(/Vous découvrez Guichet|ReplayPresentation|Trente secondes pour comprendre/);
    expect(css).toMatch(/\.bioBloc \{[^}]*border-top: 1px solid var\(--line\);/);
  });
});
