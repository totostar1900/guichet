import { beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { Session } from "@/lib/auth/types";
import { SEUIL_ARRIERE_PLAN, SEUIL_INERTIE, TOLERANCE_APRES_UN_CODE, faudraitVerrouiller } from "@/lib/verrou";

const lire = (f: string) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * LE VERROU DE L'APPLICATION (19 novembre 2026) : 5 minutes hors de l'écran, 5 minutes d'inertie, 10 minutes après l'envoi d'un code (délais portés à 5 minutes le 20 novembre 2026) ; fixes, jamais réglables par le client.
 */
describe("quand l'application se verrouille", () => {
  const t0 = 1_000_000;
  it("on la quitte moins de 5 minutes : rien ; plus : verrou au retour", () => {
    expect(faudraitVerrouiller({ maintenant: t0 + 290_000, quitteLe: t0, derniereActivite: t0 })).toBe(false);
    expect(faudraitVerrouiller({ maintenant: t0 + SEUIL_ARRIERE_PLAN + 1, quitteLe: t0, derniereActivite: t0 })).toBe(true);
  });
  it("elle reste ouverte et inerte : verrou après 5 minutes, pas avant", () => {
    expect(faudraitVerrouiller({ maintenant: t0 + SEUIL_INERTIE - 1, derniereActivite: t0 })).toBe(false);
    expect(faudraitVerrouiller({ maintenant: t0 + SEUIL_INERTIE + 1, derniereActivite: t0 })).toBe(true);
  });
  it("un code vient de partir : la tolérance passe à 10 minutes, puis les seuils ordinaires reviennent", () => {
    const graceJusqua = t0 + TOLERANCE_APRES_UN_CODE;
    expect(faudraitVerrouiller({ maintenant: t0 + 400_000, quitteLe: t0, derniereActivite: t0, graceJusqua })).toBe(false);
    expect(faudraitVerrouiller({ maintenant: t0 + 590_000, quitteLe: t0, derniereActivite: t0, graceJusqua })).toBe(false);
    expect(faudraitVerrouiller({ maintenant: t0 + 610_000, quitteLe: t0, derniereActivite: t0, graceJusqua })).toBe(true);
    expect(faudraitVerrouiller({ maintenant: graceJusqua + 1, quitteLe: graceJusqua - 20_000, derniereActivite: graceJusqua - 20_000, graceJusqua })).toBe(false);
  });
  it("les seuils sont des constantes de la maison : aucun réglage client, le desk est ignoré, l'application ne s'ouvre pas sur la porte", () => {
    const verrou = lire("src/components/VerrouDeLApp.tsx");
    expect(verrou, "un réglage client est apparu").not.toMatch(/localStorage|prefs|setSeuil|preference/i);
    expect(verrou).toMatch(/chemin\.startsWith\("\/connexion"\)/);
    expect(lire("src/app/layout.tsx")).toMatch(/session && !desk \? <VerrouDeLApp aUnCode=\{Boolean\(codeDuCompte\)\} prenom=\{session\.name\} \/>/);
    expect(lire("src/lib/verrou.ts")).toMatch(/SEUIL_ARRIERE_PLAN = 300_000[\s\S]*SEUIL_INERTIE = 300_000[\s\S]*TOLERANCE_APRES_UN_CODE = 600_000/);
  });
  it("le voile couvre dès que l'application quitte l'écran, et ne navigue jamais", () => {
    const verrou = lire("src/components/VerrouDeLApp.tsx");
    expect(verrou).toMatch(/setMasque\(true\)/);
    expect(verrou, "le verrou navigue au lieu de couvrir").not.toMatch(/router\.(push|replace)/);
    expect(verrou).toMatch(/Cinq codes faux|r\.bloque/);
  });
  it("les deux signatures repoussent le verrou quand un code vient de partir", () => {
    expect(lire("src/app/moi/ordres/[id]/Signature.tsx")).toMatch(/if \(envoi\?\.ok\) reporterLeVerrou\(\)/);
    expect(lire("src/app/ouvrir-un-compte/convention/Signer.tsx")).toMatch(/if \(sendState\?\.ok\) reporterLeVerrou\(\)/);
  });
});

/* ---------- le code du compte ---------- */
const client: Session = { userId: "dev-nouveau-code-test", role: "client", name: "Code Test", email: "code@example.com", segment: "Personne physique", tier: 1, provider: "dev", mfaEnrolled: true, mfaVerified: true };
const jar = new Map<string, string>();
vi.mock("@/lib/auth", () => ({ authMode: () => "dev", getSession: async () => client, requireSession: async () => client }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined), set: (k: string, v: string) => jar.set(k, v), delete: (k: string) => jar.delete(k) }),
  headers: async () => new Headers({ host: "localhost:3000" }),
}));
beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
});

describe("le code du compte", () => {
  it("se pose, se vérifie sur tout appareil, compte les échecs et bloque au cinquième", async () => {
    const { poserCodeDuCompte, verifierCodeDuCompte, aUnCodeDuCompte } = await import("@/lib/auth/devices");
    expect(await aUnCodeDuCompte(client.userId)).toBe(false);
    expect((await poserCodeDuCompte(client, "123456")).ok, "une suite passe").toBe(false);
    expect((await poserCodeDuCompte(client, "12")).ok).toBe(false);
    expect((await poserCodeDuCompte(client, "258014")).ok).toBe(true);
    expect(await aUnCodeDuCompte(client.userId)).toBe(true);
    expect((await verifierCodeDuCompte(client, "258014")).ok).toBe(true);
    const faux = await verifierCodeDuCompte(client, "999999");
    expect(faux.ok).toBe(false);
    expect(!faux.ok && faux.left).toBe(4);
    expect((await verifierCodeDuCompte(client, "258014")).ok, "un bon code remet le compte à zéro").toBe(true);
    let dernier;
    for (let i = 0; i < 5; i++) dernier = await verifierCodeDuCompte(client, "999999");
    expect(dernier && !dernier.ok && dernier.bloque).toBe(true);
    /* CINQ FAUX SUPPRIMENT LE CODE : se reconnecter ne le rend pas, et le bon code ne passe plus. */
    expect(await aUnCodeDuCompte(client.userId), "le code est supprimé au cinquième échec").toBe(false);
    const apres = await verifierCodeDuCompte(client, "258014");
    expect(apres.ok, "même le bon code ne passe plus : il faut en choisir un nouveau").toBe(false);
  });
  it("changer le code remplace l'ancien et oublie les codes d'appareil ; les clés d'accès restent", async () => {
    const { repo } = await import("@/lib/data");
    const { poserCodeDuCompte, verifierCodeDuCompte } = await import("@/lib/auth/devices");
    /* Le test précédent a fini sur un code supprimé : on en pose un d'abord, c'est de son remplacement qu'il s'agit. */
    await poserCodeDuCompte(client, "258014");
    await repo().addDevice({ userId: client.userId, kind: "pin", name: "Autre navigateur", secretHash: "x" });
    await repo().addDevice({ userId: client.userId, kind: "passkey", name: "Téléphone", credentialId: "cred-1", publicKey: "k", counter: 0 });
    expect((await poserCodeDuCompte(client, "357913")).ok).toBe(true);
    const kinds = (await repo().listDevices(client.userId)).map((d) => d.kind).sort();
    expect(kinds, "un seul code du compte, la clé reste, le code d'appareil est oublié").toEqual(["code", "passkey"]);
    expect((await verifierCodeDuCompte(client, "258014")).ok, "l'ancien code ne passe plus").toBe(false);
    expect((await verifierCodeDuCompte(client, "357913")).ok).toBe(true);
  });
  it("le code du compte n'est jamais listé parmi les appareils, et la table l'accepte", () => {
    expect(lire("src/app/parametres/page.tsx")).toMatch(/filter\(\(d\) => d\.kind !== "code"\)/);
    expect(readFileSync("supabase/migrations/0135_code_du_compte.sql", "utf8")).toMatch(/kind in \('passkey','pin','code'\)/);
  });
});
