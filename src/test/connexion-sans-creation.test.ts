import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/* « SE CONNECTER » N'OUVRE PAS DE COMPTE (21 novembre 2026, le client : option A, « refuser et proposer la création », numéro plus tard).
   Le formulaire e-mail de la porte envoyait tout le monde dans « Créer votre compte », et une adresse inconnue recevait un code et un compte neuf. */
const lire = (f: string) => readFileSync(f, "utf8");
const envoi = lire("src/lib/auth/email-code.ts");
const actions = lire("src/app/connexion/actions.ts");
const formulaire = lire("src/app/connexion/EmailOtpForm.tsx");
const page = lire("src/app/connexion/page.tsx");

describe("la connexion n'ouvre pas de compte", () => {
  it("l'envoi du code ne crée l'utilisateur que pour la création", () => {
    expect(envoi).toMatch(/const creer = options\.creer !== false;/);
    expect(envoi).toMatch(/\/not found\/i\.test\(error\.message\) && !creer\) return \{ ok: false, withCode: true, inconnu: true/);
    expect(envoi).toMatch(/shouldCreateUser: creer/);
  });
  it("la connexion par e-mail demande l'envoi sans création, et rend « inconnu »", () => {
    expect(actions).toMatch(/sendSignInCode\(email\.data, base, next, \{ creer: false \}\)/);
    expect(actions).toMatch(/if \(sent\.inconnu\) return \{ step: "email", inconnu: true/);
  });
  it("la connexion par numéro ne crée plus de compte non plus", () => {
    expect(actions).toMatch(/signInWithOtp\(\{ phone, options: \{ channel, shouldCreateUser: false \} \}\)/);
  });
  it("la création de compte, elle, crée toujours (valeur par défaut)", () => {
    const guest = lire("src/app/offres/[id]/actions.ts");
    expect(guest).toMatch(/sendSignInCode\(email\.data, base\)/);
  });
  it("l'écran refuse l'adresse inconnue et propose la création ; le formulaire entre dans l'application", () => {
    expect(formulaire).toMatch(/\{inconnu \? \(/);
    expect(formulaire).toMatch(/t\("Créer un compte"\)/);
    expect(page).toMatch(/<EmailOtpForm next=\{next\} creerLien=\{!administration\}/);
    expect(page, "le formulaire de connexion renvoie encore vers la création").not.toMatch(/EmailOtpForm next=\{[^}]*connexion\/creer/);
  });
  it("le desk n'offre pas la création", () => {
    expect(formulaire).toMatch(/\{creerLien && !inconnu && \(/);
  });
});
