import { describe, expect, it } from "vitest";
import { isDesk, peutOPCVM, surSonDossier, type Session } from "@/lib/auth/types";
import { etapesDuDossier } from "@/lib/kyc/checklist";
import { emptyClientFile } from "@/lib/domain/kyc";

/**
 * LA TROISIÈME PORTE, ET L'ÉTAT QU'ELLE OUVRE.
 *
 * Décision du 12 octobre 2026. « Se connecter » et « Ouvrir un compte » ne
 * sont pas deux faces d'une même porte : entre les deux il y a « créer son
 * compte », qui ne demande aucun document. Guichet savait déjà le faire, sans
 * le nommer et sans lui donner d'écran : le visiteur qui venait de prouver son
 * adresse recevait la console du client, avec un portefeuille à zéro.
 *
 * Ces cas tiennent la règle : qui voit l'écran de son dossier, et qui ne le
 * voit pas.
 */
const s = (p: Partial<Session>): Session => ({ userId: "u1", name: "Amina N.", role: "client", tier: 1, ...p }) as Session;

describe("qui est sur son dossier", () => {
  it("personne, quand il n'y a personne", () => {
    expect(surSonDossier(null)).toBe(false);
    expect(surSonDossier(undefined)).toBe(false);
  });

  it("le compte créé dont le dossier n'est pas commencé", () => {
    /* C'est l'état par défaut : la session existe, le dossier n'a pas de cran. */
    expect(surSonDossier(s({}))).toBe(true);
    expect(surSonDossier(s({ kycStatus: "brouillon" }))).toBe(true);
  });

  it("et celui dont le dossier est parti, tant qu'il n'est pas revenu", () => {
    for (const kycStatus of ["soumis", "en_revue", "complements"] as const) {
      expect(surSonDossier(s({ kycStatus }))).toBe(true);
    }
  });

  it("APPROUVÉ NE SUFFIT PAS : il y faut la convention", () => {
    /* C'est la nuance qui a fait écrire « Dossier à compléter » à des clients
       ouverts depuis des mois : le compte est approuvé, et il n'est pas actif
       tant que la convention n'est pas acceptée. */
    expect(surSonDossier(s({ kycStatus: "approuve" }))).toBe(true);
    expect(surSonDossier(s({ kycStatus: "approuve", conventionAccepted: true }))).toBe(false);
  });

  it("le desk n'est jamais sur son dossier, parce qu'il n'en a pas", () => {
    /* Sans cette borne, un opérateur arrivait sur l'écran d'un client qui
       n'aurait pas rempli ses pièces. */
    const desk = s({ role: "desk" });
    expect(isDesk(desk)).toBe(true);
    expect(peutOPCVM(desk)).toBe(false);
    expect(surSonDossier(desk)).toBe(false);
    expect(surSonDossier(s({ role: "responsable" }))).toBe(false);
  });
});

describe("les étapes du dossier, comptées une seule fois", () => {
  const vide = emptyClientFile("u1", "physique", "Amina N.", { email: "a@x.cm" });

  it("un dossier neuf n'a que son type de fait", () => {
    const e = etapesDuDossier(vide);
    expect(e).toHaveLength(5);
    expect(e.filter((x) => x.fait).map((x) => x.clef)).toEqual(["Type de client"]);
  });

  it("la convention n'apparaît qu'une fois à portée", () => {
    /* Elle n'est pas une étape du formulaire : elle vient après la décision du
       desk, et l'afficher plus tôt promettrait une signature prématurée. */
    expect(etapesDuDossier(vide).some((x) => x.clef === "Convention")).toBe(false);
    expect(etapesDuDossier({ ...vide, status: "approuve" }).some((x) => x.clef === "Convention")).toBe(true);
  });

  it("l'identité se compte faite quand le nom, un canal et la pièce y sont", () => {
    const nomSeul = { ...vide, identity: { ...vide.identity, name: "Amina N." } };
    expect(etapesDuDossier(nomSeul).find((x) => x.clef === "Identité")?.fait).toBe(false);
    const complet = { ...vide, identity: { ...vide.identity, name: "Amina N.", email: "a@x.cm", idNumber: "AB1234" } };
    expect(etapesDuDossier(complet).find((x) => x.clef === "Identité")?.fait).toBe(true);
  });
});
