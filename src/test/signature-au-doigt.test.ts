import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EN_ALL } from "@/i18n/core";

/**
 * SIGNER AU DOIGT, ET CE QUE CE RACCOURCI NE DOIT PAS RACCOURCIR.
 *
 * Un ordre couvert par la provision n'attend plus rien : l'argent est là, le
 * plafond est signé, et il restait un code à aller chercher dans une boîte
 * aux lettres. L'appareil déjà reconnu le remplace, et la preuve est au moins
 * aussi forte : un code prouve qu'on tient la boîte aux lettres, une clef
 * d'accès qu'on tient l'appareil ET qu'on en a passé le verrou.
 *
 * Trois choses que ce raccourci n'a pas le droit de perdre, et ce fichier
 * les tient.
 */
const DEVICES = readFileSync("src/lib/auth/devices.ts", "utf8");
const ACTIONS = readFileSync("src/app/moi/ordres/[id]/actions.ts", "utf8");
const PDF = readFileSync("src/lib/documents/pdf/primitives.tsx", "utf8");

describe("une confirmation n'est pas une connexion", () => {
  it("les deux fonctions de confirmation ne battent pas de session", () => {
    /* `mintSession` au milieu d'un ordre ferait d'une signature un acte de
       connexion, avec tout ce qu'il emporte. La preuve est partagée avec le
       chemin de connexion, la suite ne l'est pas. */
    for (const nom of ["confirmerParClef", "confirmerParCode"]) {
      const i = DEVICES.indexOf(`export async function ${nom}`);
      expect(i, nom).toBeGreaterThan(0);
      const corps = DEVICES.slice(i, DEVICES.indexOf("\n}", i));
      expect(corps, `${nom} ne doit pas ouvrir de session`).not.toMatch(/mintSession/);
    }
  });

  it("et elles exigent que l'appareil soit celui de la personne connectée", () => {
    /* Une clef découvrable laisse le téléphone choisir le compte : sans ce
       contrôle, on signerait l'ordre d'un autre avec son propre doigt sur un
       appareil partagé. */
    expect(DEVICES).toMatch(/confirmerParClef[\s\S]{0,400}?device\.userId !== userId/);
    expect(DEVICES).toMatch(/confirmerParCode[\s\S]{0,400}?device\.userId !== userId/);
  });

  it("la vérification elle-même reste écrite une seule fois", () => {
    /* Deux copies de la vérification divergeraient au premier correctif, et
       c'est de la cryptographie : la connexion et la confirmation partagent
       la preuve, et ne diffèrent qu'après. */
    expect(DEVICES.match(/verifyAuthenticationResponse\(/g) ?? []).toHaveLength(1);
    expect(DEVICES.match(/async function verifierLaClef\(/g) ?? []).toHaveLength(1);
    expect(DEVICES.match(/async function verifierLeCode\(/g) ?? []).toHaveLength(1);
    for (const appelant of ["passkeyAuthenticate", "confirmerParClef"]) expect(DEVICES, appelant).toMatch(new RegExp(`${appelant}[\\s\\S]{0,300}?verifierLaClef\\(response\\)`));
    for (const appelant of ["pinAuthenticate", "confirmerParCode"]) expect(DEVICES, appelant).toMatch(new RegExp(`${appelant}[\\s\\S]{0,300}?verifierLeCode\\(deviceId, token, pin\\)`));
  });
});

describe("les deux chemins de signature finissent pareil", () => {
  it("tous passent par la même fin", () => {
    /* Le document, la couverture sur la provision et la ligne au journal ne
       dépendent pas du geste. Deux copies auraient divergé au premier détail
       ajouté d'un côté. */
    const appels = ACTIONS.match(/acheverLaSignature\(/g) ?? [];
    expect(appels.length, "trois chemins : code reçu, clé d'accès, code de l'appareil").toBe(4);
    expect(ACTIONS).toMatch(/async function acheverLaSignature\(intent: Intent, userId: string, methode: string, to\?: string\)/);
  });

  it("et chacun refuse un ordre qui ne se signe plus", () => {
    for (const nom of ["signerOrdreAction", "signerAvecLaClefAction", "signerAvecLeCodeDeLAppareilAction"]) {
      const i = ACTIONS.indexOf(`export async function ${nom}`);
      expect(i, nom).toBeGreaterThan(0);
      const corps = ACTIONS.slice(i, i + 900);
      expect(corps, `${nom} doit refuser un ordre déjà signé`).toMatch(/intent\.signedAt/);
      expect(corps, `${nom} doit vérifier ordreSignable`).toMatch(/ordreSignable\(intent\)/);
    }
  });
});

describe("la pièce dit comment l'ordre a été signé", () => {
  it("« envoyé au » ne s'écrit pas devant un nom d'appareil", () => {
    /* `signedTo` porte une boîte aux lettres pour un code reçu, et le nom de
       l'appareil pour une signature au doigt : « envoyé au iPhone de
       Georges » aurait été faux dans une pièce opposable. */
    expect(PDF).toMatch(/surLAppareil\(intent\.signedMethod\)/);
    expect(PDF).toMatch(/sur l'appareil « \$\{intent\.signedTo\}/);
  });

  it("et les deux méthodes sont des mots courts, donc traduisibles", () => {
    /* Composer « clé d'accès de l'appareil « X » » aurait produit une phrase
       qu'aucun dictionnaire ne peut porter, affichée telle quelle par le
       t(variable) de la page. Quatrième fois que cet angle mort se présente. */
    expect(ACTIONS).toMatch(/acheverLaSignature\(intent, userId, "clé d'accès", v\.name\)/);
    expect(ACTIONS).toMatch(/acheverLaSignature\(intent, userId, "code de l'appareil", v\.name\)/);
    expect(EN_ALL["clé d'accès"]).toBeTruthy();
    expect(EN_ALL["code de l'appareil"]).toBeTruthy();
    expect(EN_ALL["code à usage unique"]).toBeTruthy();
  });
});

describe("le code reçu ne disparaît jamais", () => {
  it("l'écran garde les deux chemins, l'appareil au-dessus", () => {
    /* Pour l'appareil qu'on n'a pas enregistré, pour celui qui préfère, et
       pour le jour où la clef est refusée. */
    const page = readFileSync("src/app/moi/ordres/[id]/page.tsx", "utf8");
    const i = page.indexOf("<AuDoigt");
    const j = page.indexOf("<SignatureOrdre");
    expect(i, "le bloc de l'appareil doit exister").toBeGreaterThan(0);
    expect(j, "le bloc du code doit rester").toBeGreaterThan(0);
    expect(i).toBeLessThan(j);
  });
});
