import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PARAMETRES_PAGES } from "@/lib/nav-groups";

const lire = (f: string) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * PARAMÈTRES ET CONNEXION (19 novembre 2026, planche « Paramètres et connexion », 1A · 2A · 3A · 4A).
 * Le client : « Paramètres remonte et sort de Mon compte » ; Face ID, alertes et informations en interrupteurs ; le code se change sur sa page, code actuel exigé ; la méthode choisie s'offre toute seule à la connexion et au verrou.
 */
describe("Paramètres : une ligne du menu, hors de Mon compte (1A)", () => {
  it("le menu a sa ligne, juste sous « Mon compte »", () => {
    const menu = lire("src/components/mobile/BarreDuHaut.tsx");
    expect(menu).toMatch(/href="\/moi\/compte"[\s\S]{0,200}Mon compte[\s\S]{0,120}href="\/parametres"[\s\S]{0,200}Paramètres/);
    expect(PARAMETRES_PAGES.map((p) => p.href)).toEqual(["/parametres"]);
  });
});

describe("Paramètres : des interrupteurs, sans Apparence ni langue (2A)", () => {
  it("Face ID et le code ouvrent la section Connexion ; le code a sa page", () => {
    const c = lire("src/app/parametres/Connexion.tsx");
    expect(c).toMatch(/<Interrupteur[^>]*label=\{t\("Face ID ou empreinte"\)\}/);
    expect(c).toMatch(/href="\/parametres\/code"/);
  });
  it("le code du compte ne s'éteint pas : aucun interrupteur ne le porte", () => {
    expect(lire("src/app/parametres/Connexion.tsx")).not.toMatch(/Interrupteur[^>]*Code de connexion/);
  });
  it("un réglage qui échoue revient en arrière", () => {
    expect(lire("src/app/moi/appareil/Appareil.tsx")).toMatch(/setPrefs\(avant\)/);
    expect(lire("src/app/moi/appareil/Appareil.tsx")).toMatch(/\[canal\]: !on/);
  });
});

describe("Modifier le code : l'actuel d'abord, la coche à la fin (3A)", () => {
  const page = lire("src/app/parametres/code/ModifierLeCode.tsx");
  it("demande le code actuel, puis le nouveau, puis encore le nouveau", () => {
    expect(page).toMatch(/useState<Etape>\(aUnCode \? "actuel" : "nouveau"\)/);
    expect(page).toMatch(/verifierLeCode\(c\)/);
    expect(page).toMatch(/modifierLeCode\(actuel, c\)/);
  });
  it("le serveur revérifie l'ancien code avant de poser le nouveau", () => {
    const s = lire("src/app/verrou/actions.ts");
    const f = s.slice(s.indexOf("export async function modifierLeCode"));
    expect(f.indexOf("verifierCodeDuCompte(s, actuel)")).toBeGreaterThan(0);
    expect(f.indexOf("verifierCodeDuCompte(s, actuel)")).toBeLessThan(f.indexOf("poserCodeDuCompte(s, nouveau)"));
  });
  it("le code de ce navigateur reprend les nouveaux chiffres, et la fin se montre par une coche", () => {
    expect(page).toMatch(/enrolPin\(token, c, deviceLabel\(\)\)/);
    expect(page).toMatch(/Code modifié/);
    expect(lire("src/app/parametres/code/modifier.module.css")).toMatch(/prefers-reduced-motion/);
  });
});

describe("La méthode choisie s'offre toute seule (4A)", () => {
  it("le verrou propose Face ID dès qu'il paraît, par-dessus le clavier ; la touche d'empreinte la rappelle ; « Code oublié ? » est le seul lien", () => {
    const v = lire("src/components/VerrouDeLApp.tsx");
    expect(v).toMatch(/propose\.current = true;\s*parLaCle\(\)/);
    expect(v).toMatch(/empreinte=\{clePasse && !aPoser \? parLaCle : undefined\}/);
    expect(v).toMatch(/marquerCodeOublie\(\)/);
    expect(lire("src/components/EcranDeCode.tsx")).toMatch(/Code oublié \?/);
  });
  it("l'écran de code est au plus petit : bienvenue avec le prénom, six ronds, le clavier, un lien", () => {
    const e = lire("src/components/EcranDeCode.tsx");
    expect(e).toMatch(/Bonjour \{prenom\}/);
    expect(lire("src/components/ClavierCode.tsx")).toMatch(/Array\.from\(\{ length: CHIFFRES_DU_CODE \}/);
    expect(lire("src/lib/verrou.ts")).toMatch(/CHIFFRES_DU_CODE = 6/);
  });
  it("un geste annulé ne se dit pas : le clavier est la réponse", () => {
    for (const f of ["src/components/VerrouDeLApp.tsx", "src/app/connexion/PorteDeConnexion.tsx"]) expect(lire(f)).toMatch(/nom !== "NotAllowedError"/);
  });
  it("la clé garde le code de ce navigateur comme seconde méthode, et allumer Face ID demande le code", () => {
    expect(lire("src/lib/device-client.ts")).toMatch(/pin\?: \{ id: string; token: string \}/);
    expect(lire("src/app/parametres/Connexion.tsx")).toMatch(/verifierLeCode\(c\)[\s\S]*startRegistration/);
  });
  it("la porte propose l'empreinte d'elle-même, une fois ; sans code sur l'appareil, « Toucher pour réessayer » prend le relais", () => {
    const p = lire("src/app/connexion/PorteDeConnexion.tsx");
    expect(p).toMatch(/proposee\.current = true;\s*ouvrirParLaCle\(\)/);
    expect(p).toMatch(/Toucher pour réessayer/);
  });
  it("« Code oublié ? » : l'adresse est prouvée par le code reçu, puis un NOUVEAU code est choisi", () => {
    const c = lire("src/app/connexion/creer/CreerCompte.tsx");
    expect(c).toMatch(/const codeExiste = codeExisteBrut && !oublie/);
    expect(c).toMatch(/effacerCodeOublie\(\)/);
  });
  it("les anciennes adresses mènent à Paramètres", () => {
    for (const f of ["src/app/moi/securite/page.tsx", "src/app/moi/appareil/page.tsx"]) expect(lire(f)).toMatch(/redirect\("\/parametres"/);
  });
});

describe("Le mode choisi, et lui seul ; le blocage du code (20 novembre 2026)", () => {
  it("avec l'empreinte, le clavier ne paraît qu'après l'annulation, un échec ou 8 secondes ; porte et verrou pareil", () => {
    for (const f of ["src/components/VerrouDeLApp.tsx", "src/app/connexion/PorteDeConnexion.tsx"]) {
      const c = lire(f);
      expect(c, f).toMatch(/setRevele\(true\)/);
      expect(c, f).toMatch(/setTimeout\(\(\) => setRevele\(true\), 8000\)/);
    }
    expect(lire("src/components/VerrouDeLApp.tsx")).toMatch(/clavier=\{!auto \|\| revele\}/);
    expect(lire("src/app/connexion/PorteDeConnexion.tsx")).toMatch(/clavier=\{device\.kind !== "passkey" \|\| revele\}/);
    expect(lire("src/components/EcranDeCode.tsx")).toMatch(/\{clavier && onOubli && \(/);
  });
  it("cinq codes faux suppriment le code, et le client en est prévenu sur ses deux canaux", () => {
    const d = lire("src/lib/auth/devices.ts");
    const f = d.slice(d.indexOf("export async function verifierCodeDuCompte"));
    expect(f).toMatch(/failures >= ESSAIS_DU_CODE[\s\S]*removeDevices\(s\.userId, "code"\)[\s\S]*annoncerAuClient/);
    expect(d).toMatch(/async function annoncerAuClient[\s\S]*sendWhatsAppText[\s\S]*sendEmail[\s\S]*logEvent/);
  });
});

describe("La première connexion : e-mail, téléphone, prénom ; les pièces viennent après (19 novembre 2026)", () => {
  it("le prénom vient juste après le téléphone, avant « Avant d'entrer », et le parcours reprend par lui", () => {
    const c = lire("src/app/connexion/creer/CreerCompte.tsx");
    expect(c).toMatch(/creerVerifierCodeEmail[\s\S]*vers\("telephone"\)/);
    expect(c).toMatch(/checkPhoneProof[\s\S]*vers\("prenom"\)/);
    expect(c).toMatch(/creerEnregistrerPrenom\(prenom\)[\s\S]*vers\("avant"\)/);
    expect(lire("src/app/connexion/creer/page.tsx")).toMatch(/"prenom" : "appareil"/);
  });
  it("le prénom est seul : aucune pièce ne se demande à la création", () => {
    const c = lire("src/app/connexion/creer/CreerCompte.tsx");
    expect(c).not.toMatch(/uploadDoc|piece_identite|selfie|rib/);
  });
  it("on ne salue jamais une adresse e-mail : un appareil sans prénom dit « Bonjour »", () => {
    for (const f of ["src/app/connexion/PorteDeConnexion.tsx", "src/components/VerrouDeLApp.tsx"]) expect(lire(f)).toMatch(/who\.includes\("@"\)/);
  });
  it("les pièces viennent après, dans l'ordre : identité, selfie, RIB, puis justificatif et NIU", async () => {
    const { requiredDocs } = await import("@/lib/kyc/checklist");
    expect(requiredDocs("physique")).toEqual(["piece_identite_recto", "piece_identite_verso", "selfie", "rib", "justificatif_domicile", "niu"]);
    expect(requiredDocs("physique", true), "un résident à l'étranger n'a pas de NIU").toEqual(["piece_identite_recto", "piece_identite_verso", "selfie", "rib", "justificatif_domicile"]);
  });
});
