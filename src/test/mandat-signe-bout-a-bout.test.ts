import { FAUX_NEXT_CACHE } from "./faux-next-cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * L'EXEMPLAIRE DU MANDAT, LU TEL QUE LE CLIENT LE REÇOIT.
 *
 * Le 25 octobre 2026, en pilotant l'application du premier clic jusqu'au
 * fichier, le PDF d'un mandat SIGNÉ portait « Le débiteur : lu et approuvé,
 * date et signature » — la branche d'un mandat NON signé, sur la seule pièce
 * du Guichet dont l'effet se produit chez un tiers. Une agence bancaire la
 * réclame, et elle la refuse si rien n'y est signé.
 *
 * LA CAUSE : deux écritures dans le mauvais ordre. « generateMandat » relit le
 * mandat EN BASE ; il était appelé avant que la signature n'y soit inscrite.
 * Le commentaire d'alors affirmait pourtant le contraire — « il porte donc la
 * signature, et non un bloc vide ».
 *
 * POURQUOI LA GARDE D'ALORS N'A RIEN VU. Elle vérifiait que « generateMandat »
 * apparaît APRÈS le début de la fonction de signature. C'est vrai des deux
 * ordres possibles : elle ne pouvait pas échouer. Celle-ci ne lit plus le code
 * du tout — elle fait signer un mandat par l'action elle-même, et lit le PDF
 * qui en sort.
 */
const MOI = { userId: "u-mandat", name: "Client Mandaté", role: "client", segment: "Personne physique", tier: 2, provider: "dev" };
/* « garde » lit la session par « getSession » : un faux qui n'en rend qu'une
   moitié fait tomber l'action sur un défaut de montage, et non sur ce que
   l'épreuve veut mesurer. */
vi.mock("@/lib/auth", () => ({ requireSession: async () => MOI, getSession: async () => MOI }));
vi.mock("@/lib/audit", () => ({ audit: async () => {} }));
vi.mock("next/cache", () => FAUX_NEXT_CACHE);

const champs = (o: Record<string, string>): FormData => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.append(k, v);
  return f;
};

describe("le mandat signé dans l'application", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("produit un exemplaire qui porte la signature, et non une ligne manuscrite vide", async () => {
    const { creerMandatAction, envoyerCodeMandatAction, signerMandatAction } = await import("@/app/moi/prelevements/actions");
    const { repo } = await import("@/lib/data");
    const r = repo();

    /* Le dossier : sans lui, aucun code ne part — c'est la règle de la page,
       et elle vaut ici aussi. Un e-mail suffit. */
    const { emptyClientFile } = await import("@/lib/domain/kyc");
    const vide = emptyClientFile("u-mandat", "physique", "Client Mandaté", { email: "mandat@essai.africa" });
    await r.createClientFile({ ...vide, status: "approuve" });

    const cree = await creerMandatAction(null, champs({ objet: "provision", amount: "50000", dayOfMonth: "5", accountHolder: "Client Mandaté", bankName: "Banque d'essai", bankAccount: "10005 00001 98765432109 55" }));
    expect(cree.ok, cree.ok ? "" : cree.error).toBe(true);

    const [mandat] = await r.listMandats("u-mandat");
    expect(mandat, "le mandat n'a pas été créé").toBeTruthy();
    expect(mandat.signedAt, "un mandat naît non signé").toBeUndefined();

    const envoi = await envoyerCodeMandatAction(null, champs({ id: mandat.id }));
    expect(envoi.ok, envoi.ok ? "" : envoi.error).toBe(true);
    const code = envoi.ok ? envoi.code : undefined;
    expect(code, "le mode démonstration doit rendre le code, sinon rien n'est signable ici").toBeTruthy();

    const signe = await signerMandatAction(null, champs({ id: mandat.id, code: code! }));
    expect(signe.ok, signe.ok ? "" : signe.error).toBe(true);

    const apres = (await r.listMandats("u-mandat"))[0];
    expect(apres.signedAt, "le mandat n'est pas signé").toBeTruthy();
    expect(apres.docId, "aucun exemplaire n'a été produit").toBeTruthy();

    /* LA PIÈCE ELLE-MÊME, ET NON SA LIGNE EN BASE. */
    const doc = (await r.listDocuments()).find((d) => d.id === apres.docId);
    expect(doc, "la pièce n'est pas au registre").toBeTruthy();
    const { readSource } = await import("@/lib/intake/storage");
    const bytes = await readSource(doc!.fileKey);
    const parse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const txt = (await parse(Buffer.from(bytes))).text.replace(/\s+/g, " ");

    expect(txt, "l'exemplaire porte la ligne manuscrite d'un mandat non signé : la pièce dément la signature").not.toMatch(/lu et approuvé/i);
    expect(txt, "l'exemplaire ne porte pas la signature électronique").toContain("Signature électronique");
    expect(txt, "le cadre manuscrit pour la banque n'est pas sur la pièce").toMatch(/Signature manuscrite du débiteur, pour sa banque/);
    expect(txt, "la référence du mandat manque : c'est elle qu'on cite en contestation").toContain(apres.ref);
  }, 60_000);
});
