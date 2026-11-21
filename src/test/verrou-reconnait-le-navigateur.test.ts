import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/* L'APPAREIL SE RECONNAÎT PAR UNE QUESTION (21 novembre 2026, le client : « demander si l'appareil doit être enregistré, avec un "ne plus demander" ; avec l'e-mail, demander le code une fois l'adresse confirmée ; le verrou se lève avec le code jusqu'à la sortie formelle »).
   Avant : le verrou enrôlait le navigateur sans le demander, et seulement s'il se posait (après cinq minutes d'inertie). */
const verrou = readFileSync("src/components/VerrouDeLApp.tsx", "utf8");
const securite = readFileSync("src/app/moi/securite/SecurityPanel.tsx", "utf8");
const appareil = readFileSync("src/lib/device-client.ts", "utf8");

describe("le code est demandé une fois après l'e-mail ; la confiance est une question", () => {
  it("le code est demandé à l'ouverture tant que ce navigateur n'a pas de code, qu'on ait refusé la confiance ou non", () => {
    expect(verrou).toMatch(/!codeDeCetAppareil\(readDevice\(\)\) && sessionStorage\.getItem\(CLE_RECO\) !== "1"/);
    expect(verrou, "le « ne plus demander » ne doit pas supprimer le code après l'e-mail").not.toMatch(/!codeDeCetAppareil\(readDevice\(\)\) && !appareilOublieVoulu\(\) && sessionStorage/);
    expect(verrou).toMatch(/sessionStorage\.setItem\(CLE_RECO, "1"\)/);
    expect(verrou).toMatch(/const ouvert = \(verrouille \|\| aPoser \|\| reconnaitre\) && !surLaPorte;/);
  });
  it("la question a trois réponses : oui (enrôle), pas cette fois, ne plus demander (drapeau)", () => {
    expect(verrou).toMatch(/const peutDemanderLaConfiance = \(\): boolean => !codeDeCetAppareil\(readDevice\(\)\) && !appareilOublieVoulu\(\);/);
    expect(verrou).toMatch(/t\("Faire confiance à cet appareil \?"\)/);
    expect(verrou).toMatch(/await reconnaitreCeNavigateur\(confiance, prenom\);\s*onLeve\(\);/);
    expect(verrou).toMatch(/marquerAppareilOublie\(\);\s*onLeve\(\);/);
    expect(verrou).toMatch(/t\("Pas cette fois"\)/);
  });
  it("on n'enrôle JAMAIS sans réponse : ni à la pose du code, ni au déverrouillage ordinaire", () => {
    expect(verrou).toMatch(/if \(peutDemanderLaConfiance\(\)\) return setConfiance\(code\);/);
    expect(verrou).toMatch(/if \(reconnaitre && peutDemanderLaConfiance\(\)\) return setConfiance\(code\);/);
    expect(verrou.match(/await reconnaitreCeNavigateur\(/g)?.length, "l'enrôlement ne part que de la réponse « oui »").toBe(1);
  });
  it("le déverrouillage ordinaire (inertie) ne repose pas la question ; la sortie formelle seule oblige à ressaisir l'adresse", () => {
    expect(verrou).toMatch(/reconnaitre && peutDemanderLaConfiance/);
    expect(verrou).toMatch(/await logoutVersLaPorte\(\)/);
  });
  it("une clé d'accès d'avant le 20 novembre ne compte pas pour un appareil reconnu : c'est le CODE du navigateur qui compte", () => {
    expect(verrou).not.toMatch(/if \(readDevice\(\) \|\|/);
    expect(verrou).toMatch(/if \(codeDeCetAppareil\(readDevice\(\)\)\) return;/);
  });
  it("« Oublier cet appareil » éteint la question ; enrôler efface le drapeau", () => {
    expect(securite).toMatch(/clearDevice\(\);\s*marquerAppareilOublie\(\);/);
    expect(appareil).toMatch(/localStorage\.removeItem\(OUBLI_VOULU\);\s*localStorage\.setItem\(KEY/);
  });
  it("un échec d'enrôlement n'empêche jamais d'entrer", () => {
    expect(verrou).toMatch(/catch \{\s*\/\* un échec ne doit jamais empêcher d'entrer \*\//);
  });
});
