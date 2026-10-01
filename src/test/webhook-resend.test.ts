import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signatureValide } from "@/lib/intake/webhook-resend";

/**
 * La signature d'un courrier entrant par Resend.
 *
 * Deux choses se perdraient sans ce cliquet, et ce sont les deux qui comptent.
 *
 * LE CORPS BRUT. La signature porte sur la chaîne telle qu'elle est arrivée :
 * relire le JSON puis le re-sérialiser déplace un espace ou l'ordre d'une clef,
 * et plus rien ne tombe. Le test signe une chaîne et vérifie qu'un corps
 * équivalent mais réécrit est refusé.
 *
 * LA FENÊTRE DE TEMPS. Sans elle une requête interceptée se rejoue des mois
 * plus tard avec sa signature encore bonne.
 */
const SECRET = "whsec_" + Buffer.from("ceci-est-une-clef-de-test-32oct").toString("base64");

const signer = (corps: string, id = "msg_2abc", t = Math.floor(Date.now() / 1000)) => {
  const clef = Buffer.from(SECRET.replace(/^whsec_/, ""), "base64");
  const sig = createHmac("sha256", clef).update(`${id}.${t}.${corps}`).digest("base64");
  return { id, timestamp: String(t), signature: `v1,${sig}` };
};

const CORPS = '{"type":"email.received","data":{"email_id":"56761188-7520-42d8-8898-ff6fc54ce618"}}';

describe("la signature d'un courrier entrant", () => {
  it("accepte une signature juste", () => {
    expect(signatureValide(CORPS, signer(CORPS), SECRET)).toBe(true);
  });

  it("accepte quand l'en-tête porte plusieurs versions", () => {
    // Une rotation de secret en laisse deux le temps du recouvrement.
    const bon = signer(CORPS);
    const h = { ...bon, signature: `v1,dGVsbGVtZW50RmF1eA== ${bon.signature}` };
    expect(signatureValide(CORPS, h, SECRET)).toBe(true);
  });

  it("refuse un corps réécrit, même équivalent", () => {
    const h = signer(CORPS);
    // Le même objet, re-sérialisé : un espace de plus et c'est fini.
    const reecrit = JSON.stringify(JSON.parse(CORPS), null, 1);
    expect(signatureValide(reecrit, h, SECRET)).toBe(false);
  });

  it("refuse une signature périmée", () => {
    const vieux = Math.floor(Date.now() / 1000) - 6 * 60;
    expect(signatureValide(CORPS, signer(CORPS, "msg_2abc", vieux), SECRET)).toBe(false);
  });

  it("refuse une signature venue du futur", () => {
    const tard = Math.floor(Date.now() / 1000) + 6 * 60;
    expect(signatureValide(CORPS, signer(CORPS, "msg_2abc", tard), SECRET)).toBe(false);
  });

  it("refuse un identifiant qui n'est pas celui signé", () => {
    const h = signer(CORPS);
    expect(signatureValide(CORPS, { ...h, id: "msg_autre" }, SECRET)).toBe(false);
  });

  it("refuse une version inconnue", () => {
    const h = signer(CORPS);
    expect(signatureValide(CORPS, { ...h, signature: h.signature.replace("v1,", "v9,") }, SECRET)).toBe(false);
  });

  it("refuse quand un en-tête manque, et sans secret", () => {
    const h = signer(CORPS);
    expect(signatureValide(CORPS, { ...h, signature: null }, SECRET)).toBe(false);
    expect(signatureValide(CORPS, { ...h, timestamp: null }, SECRET)).toBe(false);
    expect(signatureValide(CORPS, { ...h, id: null }, SECRET)).toBe(false);
    expect(signatureValide(CORPS, h, undefined)).toBe(false);
  });
});
