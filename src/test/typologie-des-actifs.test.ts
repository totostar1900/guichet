import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { peutOPCVM, peutTitres, type Session } from "@/lib/auth/types";

const s = (p: Partial<Session>): Session => ({ userId: "u1", role: "client", name: "Essai", segment: "Personne physique", tier: 1, provider: "dev", mfaEnrolled: false, mfaVerified: false, ...p });

/**
 * DEUX CHAÎNES DE CONSERVATION, DONC DEUX CAPACITÉS.
 *
 * Une part d'OPCVM s'inscrit au registre des porteurs tenu par le dépositaire du
 * fonds : le dossier approuvé et la convention suffisent, aucun compte-titres.
 * Un titre public ou une ligne cotée s'inscrit dans un compte-titres, par un
 * sous-compte nominatif ouvert chez le teneur.
 *
 * Le code le savait à un seul endroit, et partout ailleurs un « palier » unique
 * servait de mesure : or ce palier ne mesure que la chaîne titres. Un client en
 * règle qui ne détient que des parts n'y arrive jamais.
 */
describe("ce qu'il faut dépend de ce qu'on achète", () => {
  it("les parts demandent le dossier et la convention, rien de plus", () => {
    expect(peutOPCVM(s({ kycStatus: "approuve", conventionAccepted: true }))).toBe(true);
    expect(peutOPCVM(s({ kycStatus: "approuve" }))).toBe(false);
    expect(peutOPCVM(s({ kycStatus: "soumis", conventionAccepted: true }))).toBe(false);
  });

  it("les titres demandent en plus le sous-compte, que porte le palier 2", () => {
    // Dossier impeccable, convention signée, mais le teneur n'a pas rendu le sous-compte.
    expect(peutTitres(s({ kycStatus: "approuve", conventionAccepted: true, tier: 1 }))).toBe(false);
    expect(peutTitres(s({ kycStatus: "approuve", conventionAccepted: true, tier: 2 }))).toBe(true);
    // Et le palier seul ne suffit jamais : sans convention, rien n'est signé.
    expect(peutTitres(s({ kycStatus: "approuve", tier: 2 }))).toBe(false);
  });

  it("la règle des intentions lit les deux capacités, et épargne ce qui n'engage rien", () => {
    const src = readFileSync("src/app/offres/[id]/actions.ts", "utf8");
    expect(src).toContain("peutOPCVM(session)");
    expect(src).toContain("peutTitres(session)");
    // « appetit », « info » et « rappel » ne demandent aucune chaîne de conservation.
    expect(src).toMatch(/surDesTitres\s*\?/);
  });

  /* Un relevé sans ligne n'atteste rien : l'attestation sortait avec un total de
     zéro et une place pour le cachet. La porte est la position, pas le compte,
     et elle vaut pour les deux familles sans avoir à les distinguer. */
  it("un relevé ne s'édite pas sans position", () => {
    const src = readFileSync("src/lib/documents/generate.ts", "utf8");
    expect(src).toMatch(/positions\.length === 0\) throw/);
  });
});
