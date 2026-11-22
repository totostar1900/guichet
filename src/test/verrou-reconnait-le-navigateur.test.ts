import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/* L'APPAREIL SE RECONNAÎT TOUT SEUL, PAR UNE CASE (21 novembre 2026, le client : « l'enregistrement de l'appareil se fait automatiquement » ; « à la connexion par e-mail, une case à cocher : les prochaines connexions se font avec le code seul » ; « remettre Bonjour prénom »).
   Avant : une question à trois réponses, puis « Reconnaître cet appareil » à la place du « Bonjour ». */
const verrou = readFileSync("src/components/VerrouDeLApp.tsx", "utf8");
const formulaire = readFileSync("src/app/connexion/EmailOtpForm.tsx", "utf8");
const page = readFileSync("src/app/connexion/page.tsx", "utf8");
const securite = readFileSync("src/app/moi/securite/SecurityPanel.tsx", "utf8");
const appareil = readFileSync("src/lib/device-client.ts", "utf8");

describe("la connexion par e-mail porte la case « Reconnaître cet appareil »", () => {
  it("la case est DÉCOCHÉE d'emblée (22 novembre 2026), sur la porte du client seulement (pas celle du desk)", () => {
    expect(formulaire).toMatch(/<input type="checkbox" name="confiance" \/>/);
    expect(formulaire, "la case est de nouveau cochée d'emblée").not.toMatch(/name="confiance" defaultChecked/);
    expect(formulaire).toMatch(/t\("Reconnaître cet appareil : mes prochaines connexions se feront avec mon code seul, sans code e-mail\."\)/);
    expect(page).toMatch(/<EmailOtpForm next=\{next\} creerLien=\{!administration\} confiance=\{!administration\}/);
  });
  it("son état est gardé avant l'envoi du code, et lu après la saisie du code du compte", () => {
    expect(formulaire).toMatch(/marquerConfiance\(new FormData\(e\.currentTarget\)\.get\("confiance"\) === "on"\)/);
    expect(appareil).toMatch(/export function confianceVoulue\(\): boolean \| null/);
  });
});

describe("le code du compte est demandé une fois après l'e-mail, et l'appareil s'enregistre si la case est cochée", () => {
  it("passer par la porte remet la reconnaissance à zéro : le drapeau d'onglet ne survit pas à la déconnexion (22 novembre 2026)", () => {
    const porte = readFileSync("src/app/connexion/PorteDeConnexion.tsx", "utf8");
    expect(porte).toMatch(/useEffect\(\(\) => \{\s*oublierLaReconnaissance\(\);\s*\}, \[\]\);/);
    expect(appareil).toMatch(/export const CLE_RECONNAISSANCE = "guichet_reconnaissance";/);
    expect(verrou).toMatch(/const CLE_RECO = CLE_RECONNAISSANCE;/);
  });
  it("le code est demandé à l'ouverture tant que ce navigateur n'a pas de code", () => {
    expect(verrou).toMatch(/!codeDeCetAppareil\(readDevice\(\)\) && sessionStorage\.getItem\(CLE_RECO\) !== "1"/);
    expect(verrou).toMatch(/sessionStorage\.setItem\(CLE_RECO, "1"\)/);
    expect(verrou).toMatch(/const ouvert = \(verrouille \|\| aPoser \|\| reconnaitre\) && !surLaPorte;/);
  });
  it("plus de question : l'enrôlement part du code saisi, et seulement si le client a coché la case", () => {
    expect(verrou, "la question de confiance est revenue").not.toMatch(/Faire confiance à cet appareil|Pas cette fois|Ne plus demander|setConfiance/);
    expect(verrou).toMatch(/const doitReconnaitre = \(\): boolean => confianceVoulue\(\) === true;/);
    expect(verrou).toMatch(/if \(codeDeCetAppareil\(readDevice\(\)\) \|\| !doitReconnaitre\(\)\) return;/);
    expect(verrou).toMatch(/if \(reconnaitre\) await reconnaitreCeNavigateur\(code, prenom\);/);
    expect(verrou).toMatch(/await reconnaitreCeNavigateur\(code, prenom\);\s*onCodePose\(\);/);
    expect(verrou).toMatch(/effacerConfiance\(\);/);
  });
  it("l'écran du code redit « Bonjour {prénom} » : seul le choix du code porte un titre", () => {
    expect(verrou).toMatch(/const titre = aPoser \? \(premier === null \? "Choisissez votre code" : "Saisissez-le encore"\) : undefined;/);
    expect(verrou, "« Reconnaître cet appareil » est revenu comme titre").not.toMatch(/"Reconnaître cet appareil"/);
  });
  it("une clé d'accès d'avant le 20 novembre ne compte pas pour un appareil reconnu : c'est le CODE du navigateur qui compte", () => {
    expect(verrou).not.toMatch(/if \(readDevice\(\) \|\|/);
  });
  it("« Oublier cet appareil » éteint l'enrôlement automatique ; enrôler efface le drapeau", () => {
    expect(securite).toMatch(/clearDevice\(\);\s*marquerAppareilOublie\(\);/);
    expect(appareil).toMatch(/localStorage\.removeItem\(OUBLI_VOULU\);\s*localStorage\.setItem\(KEY/);
  });
  it("un échec d'enrôlement n'empêche jamais d'entrer", () => {
    expect(verrou).toMatch(/catch \{\s*\/\* un échec ne doit jamais empêcher d'entrer \*\//);
  });
});
