import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lire = (f: string) => readFileSync(f, "utf8");
const sansCommentaires = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * LA CRÉATION D'UN COMPTE, UN ÉCRAN PAR GESTE (19 novembre 2026).
 * Planche « Parcours d'inscription » : « 7B, 6A, 5A et 5B on valide e-mail et téléphone, 4A, 3A, 2A, 1A ; retirer la connexion Google : on veut les informations réelles, ce qui n'est pas toujours le cas en passant par Google. » Puis : « les boutons de validation en bas de page ».
 */
describe("la création d'un compte", () => {
  const page = sansCommentaires(lire("src/app/connexion/creer/page.tsx"));
  const composant = sansCommentaires(lire("src/app/connexion/creer/CreerCompte.tsx"));
  const css = sansCommentaires(lire("src/app/connexion/creer/creer.module.css"));
  const actions = sansCommentaires(lire("src/app/connexion/creer/actions.ts"));

  it("les étapes sont celles choisies : adresse, code, numéro, code, prénom, mentions, code de l'appareil (sans biométrie)", () => {
    const ordre = ["email", "email-code", "telephone", "telephone-code", "prenom", "avant", "code", "code-bis"];
    const type = composant.match(/type Etape = ([^;]+);/)?.[1] ?? "";
    expect(ordre.map((e) => type.indexOf(`"${e}"`)).every((i, k, a) => i >= 0 && (k === 0 || i > a[k - 1])), "les étapes ne sont plus dans l'ordre choisi").toBe(true);
  });

  it("les deux canaux sont prouvés par un code, avec les actions qui existaient", () => {
    expect(composant).toMatch(/sendPhoneProof\(/);
    expect(composant).toMatch(/checkPhoneProof\(/);
    expect(actions).toMatch(/guestSendEmailCode/);
    expect(actions).toMatch(/guestVerifyEmailCode/);
  });

  it("les mentions s'acceptent dans le parcours (« Avant d'entrer »), à la version courante, et la fenêtre générale se tait sur cette seule adresse", () => {
    expect(composant).toMatch(/acceptTerms\(legalVersion\)/);
    expect(composant).toMatch(/Avant d'entrer/);
    expect(lire("src/proxy.ts")).toMatch(/entetes\.set\("x-chemin", path\)/);
    expect(sansCommentaires(lire("src/app/layout.tsx"))).toMatch(/x-chemin[\s\S]{0,80}startsWith\("\/connexion\/creer"\)[\s\S]{0,160}!creation/);
  });

  it("le code de l'appareil se saisit deux fois, et la création ne propose plus d'empreinte (20 novembre 2026)", () => {
    expect(composant).toMatch(/enrolPin\(token, c, deviceLabel\(\)\)/);
    expect(composant).toMatch(/c !== codeA/);
    expect(composant).toMatch(/t\("Plus tard"\)/);
    expect(composant, "l'empreinte est revenue dans la création").not.toMatch(/platformAuthenticatorIsAvailable|startRegistration|"bio"|biométri/);
  });

  it("le bouton de validation est en bas de l'écran, et l'erreur s'écrit sous le champ, jamais dans une fenêtre", () => {
    expect(css).toMatch(/\.corps \{[^}]*min-height: calc\(100dvh/);
    expect(css).toMatch(/\.bas \{[^}]*margin-top: auto;/);
    expect(composant).toMatch(/role="alert"/);
    expect(composant, "une fenêtre d'erreur est revenue").not.toMatch(/alert\(|confirm\(|window\.prompt|Dialog|Sheet/);
  });

  it("aucune porte Google, ni à la création ni à la connexion", () => {
    const connexion = sansCommentaires(lire("src/app/connexion/page.tsx"));
    const act = sansCommentaires(lire("src/app/connexion/actions.ts"));
    for (const [nom, src] of [["la page de connexion", connexion], ["ses actions", act], ["la création", composant + actions]] as const) {
      expect(src, `${nom} parle encore de Google`).not.toMatch(/google|signInWithOAuth|GOOGLE_OAUTH/i);
    }
    expect(lire(".env.example"), "le réglage Google est revenu dans l'exemple d'environnement").not.toMatch(/GOOGLE_OAUTH_ENABLED/);
  });

  it("« Créer un compte » et « Ouvrir un compte » mènent au parcours ; le desk n'a pas de création", () => {
    const connexion = sansCommentaires(lire("src/app/connexion/page.tsx"));
    expect(connexion).toMatch(/creer === "1" \|\| next\.startsWith\("\/ouvrir-un-compte"\)\) && !administrationHote\) redirect\(`\/connexion\/creer\?next=/);
    expect(page).toMatch(/isDeskHost\(\(await headers\(\)\)\.get\("host"\)\)\) redirect\("\/connexion"/);
  });

  it("le parcours se reprend là où il s'est arrêté", () => {
    expect(page).toMatch(/!\(canaux\.phoneVerifiedAt \|\| session\.phoneVerified\) \? "telephone" : consentement\.version !== LEGAL_VERSION \? \(prenomConnu \? "avant" : "prenom"\) : "appareil"/);
  });
});

/**
 * WhatsApp porte le code et les avis, avec un lien qui ouvre la bonne page de Guichet (19 novembre 2026, « Option A, go »). Le geste se fait dans l'application ; aucun ordre ne se passe par conversation.
 */
describe("les avis du dossier portent un lien vers Guichet", () => {
  const notif = sansCommentaires(lire("src/lib/kyc/notify.ts"));
  it("l'approbation et les compléments donnent l'adresse de la page, pas seulement son nom", () => {
    expect(notif).toMatch(/const lien = `\$\{process\.env\.NEXT_PUBLIC_APP_URL[^`]*\/ouvrir-un-compte`/);
    expect(notif).toMatch(/acceptez la convention par code\.\\n\$\{lien\}/);
    expect(notif).toMatch(/Reprenez votre dossier :\\n\$\{lien\}/);
    expect(notif, "l'ancienne formule sans lien est revenue").not.toMatch(/dans le Guichet › Ouvrir un compte/);
  });
});

/**
 * LE DOSSIER PAS À PAS (4A) ET LES PIÈCES APRÈS L'ENVOI (option B), 19 novembre 2026.
 */
describe("la nationalité se choisit dans une liste, la zone CEMAC en tête", () => {
  const pays = lire("src/lib/domain/pays.ts");
  it("les six pays de la zone d'abord, puis les autres", () => {
    const zone = pays.match(/PAYS_CEMAC = \[([^\]]+)\]/)?.[1] ?? "";
    expect(zone.match(/"[^"]+"/g)?.length).toBe(6);
    for (const p of ["Cameroun", "Congo", "Gabon", "Guinée équatoriale", "République centrafricaine", "Tchad"]) expect(zone, p).toContain(`"${p}"`);
    expect(pays, "un pays de la zone est répété dans l'autre liste").not.toMatch(/AUTRES_PAYS = \[[\s\S]*?"Cameroun"/);
  });
  it("la section d'identité passe par le choix du pays, avec le même champ que l'ancien texte libre", () => {
    const sections = sansCommentaires(lire("src/app/ouvrir-un-compte/Sections.tsx"));
    expect(sections).toMatch(/<ChoixDuPays name="nationality"/);
    expect(sections, "le champ texte libre de la nationalité est revenu").not.toMatch(/<input name="nationality"/);
  });
});

/**
 * LA PORTE : DÉVERROUILLER D'ABORD, L'E-MAIL EN SECOURS (19 novembre 2026, « 2A »).
 */
describe("la connexion sur un appareil reconnu", () => {
  const porte = sansCommentaires(lire("src/app/connexion/PorteDeConnexion.tsx"));
  const page = sansCommentaires(lire("src/app/connexion/page.tsx"));
  it("n'offre que le code Guichet : le clavier à six chiffres ; l'e-mail est derrière « Code oublié ? »", () => {
    expect(porte).toMatch(/<EcranDeCode[^>]*onFini=\{ouvrirParLeCode\}/);
    expect(porte).toMatch(/const deverrouille = device && code && !autre && !oublie/);
    expect(porte).toMatch(/marquerCodeOublie\(\);\s*setAutre\(true\)/);
    expect(porte, "l'empreinte est revenue sur la porte").not.toMatch(/startAuthentication|passkey|empreinte/i);
  });
  it("le formulaire e-mail ne s'affiche qu'à travers la porte, et entre directement dans l'application (il n'ouvre plus la création de compte)", () => {
    expect(page).toMatch(/<PorteDeConnexion[\s\S]*<EmailOtpForm next=\{next\} creerLien=\{!administration\}/);
  });
  it("rien n'est montré avant l'hydratation : pas de formulaire e-mail qui clignote sous un appareil reconnu", () => {
    expect(porte).toMatch(/if \(!pret\)[\s\S]*<div className=\{styles\.masque\}>/);
    /* L'ATTENTE : le G se trace, rendu par le serveur, au lieu d'un écran vide (20 novembre 2026, planche « Écran d'attente », 1A). */
    expect(porte).toMatch(/<LogoDAttente \/>/);
    expect(sansCommentaires(lire("src/app/connexion/page.module.css"))).toMatch(/\.masque \{[^}]*visibility: hidden;/);
  });
  it("le clavier est partagé avec la création du compte", () => {
    expect(sansCommentaires(lire("src/app/connexion/creer/CreerCompte.tsx"))).toMatch(/<ClavierCode /);
  });
});
