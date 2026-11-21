import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ authMode: () => "dev", getSession: async () => undefined, requireSession: async () => ({}) }));

const lire = (f: string) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * UN CANAL NE SERT QU'À UN COMPTE (21 novembre 2026, le client : « l'app ne détecte pas les e-mails et numéros déjà utilisés et permet une nouvelle inscription avec des accréditations déjà en place »).
 * Le numéro prouvé par WhatsApp n'était comparé à aucun autre compte ; une adresse déjà inscrite repassait par toute la création.
 */
describe("un numéro prouvé ne sert qu'à un compte", () => {
  it("le dépôt dit quel compte porte un numéro prouvé, et pas un numéro seulement saisi", async () => {
    const { repo } = await import("@/lib/data");
    await repo().markChannelVerified("u-doublon-a", "phone", "+237611111111");
    expect(await repo().channelOwner("phone", "+237611111111")).toBe("u-doublon-a");
    expect(await repo().channelOwner("phone", "+237622222222")).toBeUndefined();
  });
  it("un autre compte ne reçoit pas de code pour ce numéro, et ne peut pas le valider", async () => {
    const { repo } = await import("@/lib/data");
    const { requestPhoneProof, confirmPhoneProof, MESSAGE_NUMERO_PRIS } = await import("@/lib/channels");
    await repo().markChannelVerified("u-doublon-c", "phone", "+237633333333");
    const envoi = await requestPhoneProof("u-doublon-d", "+237 6 33 33 33 33");
    expect(envoi).toEqual({ ok: false, error: MESSAGE_NUMERO_PRIS });
    const verif = await confirmPhoneProof("u-doublon-d", "+237633333333", "123456");
    expect(verif).toEqual({ ok: false, error: MESSAGE_NUMERO_PRIS });
  });
  it("le compte qui le porte déjà peut le renvoyer prouver sans être refusé", async () => {
    const { repo } = await import("@/lib/data");
    const { requestPhoneProof, MESSAGE_NUMERO_PRIS } = await import("@/lib/channels");
    await repo().markChannelVerified("u-doublon-e", "phone", "+237644444444");
    const envoi = await requestPhoneProof("u-doublon-e", "+237644444444");
    expect(envoi.ok === false ? envoi.error : "").not.toBe(MESSAGE_NUMERO_PRIS);
  });
});

describe("une adresse déjà inscrite ne refait pas l'inscription", () => {
  it("la vérification du code rend « existant » quand le numéro est déjà prouvé, dans les deux modes", () => {
    const a = lire("src/app/connexion/creer/actions.ts");
    expect(a.match(/existant: true/g)?.length, "un des deux modes ne détecte plus le compte existant").toBeGreaterThanOrEqual(2);
    expect(a, "le test du compte complet n'est plus le numéro prouvé").toMatch(/canaux\?\.phoneVerifiedAt/);
  });
  it("l'écran dit que le compte existe et ne redemande ni prénom, ni numéro, ni mentions", () => {
    const c = lire("src/app/connexion/creer/CreerCompte.tsx");
    expect(c).toMatch(/vers\(r\.existant \? "existant" : "telephone"\)/);
    const debut = c.indexOf('etape === "existant"');
    const bloc = c.slice(debut, c.indexOf('etape === "telephone"', debut));
    expect(bloc).toMatch(/onClick=\{fin\}/);
    expect(bloc, "l'écran du compte existant redemande une saisie").not.toMatch(/<input/);
  });
});
