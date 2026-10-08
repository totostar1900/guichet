import { describe, expect, it } from "vitest";
import { ordreSignable } from "@/lib/domain/intent";
import { attenteAvantRenvoi, empreinte, ESSAIS_MAX, nouveauCode, verifier } from "@/lib/signature/code";
import type { Intent } from "@/lib/domain/types";

const ordre = (p: Partial<Intent> = {}): Intent => ({
  id: "i1",
  ref: "PF-1008-AAAA",
  offerId: "fund-x",
  offerVersion: 1,
  clientName: "Essai",
  clientSegment: "Personne physique",
  clientId: "u1",
  type: "souscription",
  amount: 5_000_000,
  channel: "E-mail",
  state: "recue",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...p,
});

/**
 * L'ORDRE PORTE SA PROPRE SIGNATURE.
 *
 * Elle se donnait hors de l'application : le desk cochait « signé » une fois le
 * papier revenu. Le client devait donc attendre que le desk fabrique le
 * bulletin avant de pouvoir le signer, alors que le desk n'ajoutait aucune
 * arithmétique entre les deux : documents/position.ts calculait déjà le
 * montant. Il ajoutait une décision, et une décision ne demande pas deux allers.
 */
describe("quels ordres se signent dans l'app", () => {
  it("les parts d'OPCVM, et elles seules pour l'instant", () => {
    expect(ordreSignable(ordre({ type: "souscription" }))).toBe(true);
    expect(ordreSignable(ordre({ type: "rachat" }))).toBe(true);
    // Sur un titre, le montant dépend du prix servi : il faudra signer un plafond.
    expect(ordreSignable(ordre({ type: "ferme" }))).toBe(false);
    expect(ordreSignable(ordre({ type: "achat" }))).toBe(false);
    // Ni une question, ni une demande de rappel : rien à signer.
    expect(ordreSignable(ordre({ type: "info" }))).toBe(false);
  });

  it("une fois signé, ou une fois pris en main par le desk, on ne resigne pas", () => {
    expect(ordreSignable(ordre({ signedAt: new Date().toISOString() }))).toBe(false);
    expect(ordreSignable(ordre({ state: "confirmee" }))).toBe(false);
    expect(ordreSignable(ordre({ state: "transmise" }))).toBe(false);
    expect(ordreSignable(ordre({ state: "annulee" }))).toBe(false);
  });
});

/**
 * Le même code qu'à la convention : mêmes bornes, même preuve. Deux copies d'un
 * mécanisme de signature, ce sont deux politiques de validité et deux façons de
 * se tromper.
 */
describe("la signature par code à usage unique", () => {
  const codeEnCours = (code: string, p: { at?: string; tries?: number } = {}) => ({ hash: empreinte(code), at: p.at ?? new Date().toISOString(), tries: p.tries ?? 0 });

  it("accepte le bon code, et lui seul", () => {
    const c = nouveauCode();
    expect(c).toMatch(/^\d{6}$/);
    expect(verifier(c, codeEnCours(c))).toEqual({ ok: true });
    // Les espaces d'une saisie au téléphone ne font pas échouer une signature.
    expect(verifier(` ${c} `, codeEnCours(c))).toEqual({ ok: true });
    const faux = verifier("000000", codeEnCours(c));
    expect(faux.ok).toBe(false);
  });

  it("compte les essais, puis brûle le code", () => {
    const c = "123456";
    const avant = verifier("999999", codeEnCours(c, { tries: 0 }));
    expect(avant).toMatchObject({ ok: false, essais: 1 });
    const epuise = verifier(c, codeEnCours(c, { tries: ESSAIS_MAX }));
    expect(epuise.ok).toBe(false);
    if (!epuise.ok) expect(epuise.erreur).toContain("Trop d'essais");
  });

  it("un code de plus de dix minutes ne vaut plus", () => {
    const c = "123456";
    const vieux = verifier(c, codeEnCours(c, { at: new Date(Date.now() - 11 * 60_000).toISOString() }));
    expect(vieux.ok).toBe(false);
    if (!vieux.ok) expect(vieux.erreur).toContain("expiré");
  });

  it("un renvoi attend quarante-cinq secondes, pas davantage", () => {
    expect(attenteAvantRenvoi(undefined)).toBe(0);
    expect(attenteAvantRenvoi(new Date(Date.now() - 60_000).toISOString())).toBe(0);
    const reste = attenteAvantRenvoi(new Date(Date.now() - 20_000).toISOString());
    expect(reste).toBeGreaterThan(0);
    expect(reste).toBeLessThanOrEqual(25);
  });
});

/**
 * LE GO DU DESK EST UN SEUL GESTE, ET IL NE REFAIT PAS CE QUI EST SIGNÉ.
 *
 * Le cycle produisait le bulletin à la confirmation, pour que le client le
 * signe et le renvoie : c'était l'aller-retour. Quand l'ordre porte déjà sa
 * signature, le réémettre créerait un second exemplaire vierge, et plus
 * personne ne saurait lequel vaut. Reste l'appel de fonds, qui n'est pas une
 * signature mais une instruction de virement.
 */
describe("le go du desk", () => {
  it("ne réémet ni le bulletin ni la demande de rachat quand l'ordre est signé", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/app/desk/actions.ts", "utf8");
    expect(src).toContain("const dejaSigne = Boolean(updated.orderDocId)");
    expect(src).toMatch(/filter\(\(d\) => !\(dejaSigne && \(d === "bulletin" \|\| d === "cession"\)\)\)/);
  });

  it("l'appel de fonds reste : c'est une instruction de virement, pas une signature", async () => {
    const { docsForTransition } = await import("@/lib/documents/registry");
    expect(docsForTransition("souscription", "confirmee")).toContain("fonds");
  });

  it("le message du go ne promet plus un bulletin à signer", async () => {
    const { intentUpdated } = await import("@/lib/notify/compose");
    const o = { id: "fund-x", kind: "FONDS", title: "FCP Essai", fund: { manager: "SG Essai" } } as never;
    const signe = intentUpdated(ordre({ signedAt: new Date().toISOString() }), o, "confirmee", "Georges");
    expect(signe.text).toContain("PF-1008-AAAA");
    expect(signe.text).not.toContain("à signer");
    // Sans signature, l'ancien chemin reste : tous les ordres ne se signent pas encore dans l'app.
    const pasSigne = intentUpdated(ordre(), o, "confirmee", "Georges");
    expect(pasSigne.text).toContain("à signer");
  });
});
