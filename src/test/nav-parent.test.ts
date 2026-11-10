import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parentDe } from "@/lib/nav-parent";

/** LE RETOUR REMONTE D'UN CRAN DE L'ARBRE (10 novembre 2026) : la barre du haut ne rejoue plus l'historique pour les pages de l'Activité. */
describe("parentDe : l'étape précédente d'une page de l'Activité", () => {
  it("la chaîne de l'approvisionnement remonte jusqu'à l'Activité, une marche à la fois", () => {
    const chaine = ["/moi/provision/alimenter/virement/envoye", "/moi/provision/alimenter/virement", "/moi/provision/alimenter", "/moi/provision", "/activite"];
    for (let i = 0; i < chaine.length - 1; i++) expect(parentDe(chaine[i]), chaine[i]).toBe(chaine[i + 1]);
  });
  it("« Autoriser un prélèvement » retourne au choix s'il en vient, à l'Activité sinon", () => {
    expect(parentDe("/moi/prelevements?de=alimenter", "/moi/provision/alimenter")).toBe("/moi/provision/alimenter");
    expect(parentDe("/moi/prelevements", "/activite")).toBe("/activite");
    expect(parentDe("/moi/prelevements", null)).toBe("/activite");
  });
  it("les autres rubriques de l'Activité remontent à l'Activité, leurs sous-pages à leur rubrique", () => {
    for (const p of ["/moi/ordres", "/moi/epargne", "/moi/documents", "/moi/profil", "/moi/compte"]) expect(parentDe(p), p).toBe("/activite");
    expect(parentDe("/moi/ordres/42")).toBe("/moi/ordres");
  });
  it("une page qui n'est pas de l'Activité garde le retour d'avant", () => {
    for (const p of ["/offres/x", "/titres", "/marche", "/moi/contact", "/info/aide"]) expect(parentDe(p), p).toBeUndefined();
  });
  it("la barre du haut s'en sert", () => {
    expect(readFileSync("src/components/mobile/MobileShell.tsx", "utf8")).toMatch(/const parent = parentDe\(path, venuDe\);\s*if \(parent\) \{\s*router\.push\(parent,/);
  });
});
