import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cequiManque, enAttenteDOuverture, ordreAcceptable } from "@/lib/domain/ouverture";
import { emptyClientFile, type ClientFile } from "@/lib/domain/kyc";

/**
 * LE CLIENT N'ATTEND PLUS L'OUVERTURE, L'ORDRE L'ATTEND.
 *
 * Règle arrêtée le 9 octobre 2026, avec la révision de la convention. Un
 * résident approuvé passait son ordre sur titre et devait patienter jusqu'à
 * ce que le teneur de compte rende le numéro du sous-compte, soit un à deux
 * jours pendant lesquels une séance peut se fermer. L'ordre est maintenant
 * pris tout de suite ; c'est la TRANSMISSION au marché qui attend, parce
 * qu'un titre doit avoir un compte où s'inscrire.
 *
 * Ce que ce cliquet garde : la diligence ne se saute pas pour autant. Pas de
 * dossier approuvé, pas d'ordre ; pas de convention, pas d'ordre ; et depuis
 * l'étranger, l'ordre attend bel et bien l'ouverture.
 */
const fiche = (p: Partial<ClientFile> = {}): ClientFile => {
  const f = emptyClientFile("u1", "physique", "Essai", {});
  return { id: "kyc-essai", ...f, status: "approuve", consents: { ...f.consents, conventionAt: new Date().toISOString() }, ...p };
};
const avecSousCompte = (f: ClientFile): ClientFile => ({ ...f, review: { ...f.review, custodianAccount: "ECB-CT-2026-00087" } });
const deLEtranger = (f: ClientFile): ClientFile => ({ ...f, identity: { ...f.identity, residentAbroad: true } });

describe("ce qu'il faut avoir ouvert", () => {
  it("une part de fonds n'attend aucun compte-titres", () => {
    expect(enAttenteDOuverture("souscription", fiche())).toBe(false);
    expect(enAttenteDOuverture("rachat", fiche())).toBe(false);
    expect(ordreAcceptable("souscription", fiche())).toBe(true);
  });

  it("un titre attend le sous-compte pour PARTIR, pas pour être pris", () => {
    const f = fiche();
    expect(enAttenteDOuverture("ferme", f)).toBe(true);
    // Pris quand même : c'est tout l'objet de la règle.
    expect(ordreAcceptable("ferme", f)).toBe(true);
    expect(cequiManque("ferme", f)).toBe("sous-compte titres à ouvrir");
  });

  it("une fois le sous-compte ouvert, plus rien n'attend", () => {
    const f = avecSousCompte(fiche());
    expect(enAttenteDOuverture("ferme", f)).toBe(false);
    expect(cequiManque("ferme", f)).toBeUndefined();
  });

  it("depuis l'étranger, l'ordre sur titre attend l'ouverture", () => {
    const f = deLEtranger(fiche());
    expect(ordreAcceptable("ferme", f)).toBe(false);
    expect(cequiManque("ferme", f)).toContain("appel vidéo");
    // Les parts de fonds, elles, passent : la chaîne de conservation diffère.
    expect(ordreAcceptable("souscription", f)).toBe(true);
  });

  it("aucune diligence ne se saute : sans dossier approuvé ni convention, rien ne passe", () => {
    const brouillon = { ...fiche(), status: "brouillon" as const };
    const sansConvention = { ...fiche(), consents: {} };
    for (const f of [brouillon, sansConvention, undefined]) {
      expect(ordreAcceptable("souscription", f)).toBe(false);
      expect(ordreAcceptable("ferme", f)).toBe(false);
      expect(cequiManque("souscription", f)).toBe("dossier à approuver et convention à accepter");
    }
  });
});

describe("le garde-fou du desk", () => {
  it("la transmission refuse l'ordre sur titre sans sous-compte, et le dit", () => {
    const src = readFileSync("src/app/desk/actions.ts", "utf8");
    expect(src).toContain('state === "transmise"');
    expect(src).toContain("enAttenteDOuverture");
    /* LE REFUS SE DIT. Un garde qui rend la main sans un mot est la panne la
       plus chère de ce projet : le desk clique, rien ne bouge, personne ne
       sait pourquoi. Le journal porte donc la raison. */
    expect(src).toContain("transmission refusée");
  });
});
