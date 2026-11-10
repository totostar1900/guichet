import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parentDe } from "@/lib/nav-parent";

/** LE RETOUR REMONTE D'UN CRAN DE L'ARBRE (10 novembre 2026) : la barre du haut ne rejoue plus l'historique pour les pages de l'Activité. */
describe("parentDe : l'étape précédente d'une page de l'Activité", () => {
  it("la chaîne de l'approvisionnement remonte jusqu'à l'Activité, une marche à la fois", () => {
    const chaine = ["/moi/provision/alimenter/virement/envoye", "/moi/provision/alimenter/virement", "/moi/provision/alimenter", "/moi/provision", "/activite"];
    for (let i = 0; i < chaine.length - 1; i++) expect(parentDe(chaine[i]), chaine[i]).toBe(chaine[i + 1]);
  });
  it("« Autoriser un prélèvement » retourne d'où l'on vient : le choix d'approvisionnement, « Ce qui part tout seul », sinon « Mon argent »", () => {
    expect(parentDe("/moi/prelevements?de=alimenter", "/moi/provision/alimenter")).toBe("/moi/provision/alimenter");
    expect(parentDe("/moi/prelevements", "/moi/regles")).toBe("/moi/regles");
    expect(parentDe("/moi/prelevements", "/moi/argent")).toBe("/moi/argent");
    expect(parentDe("/moi/prelevements", null)).toBe("/moi/argent");
  });
  it("les pages de règle (épargne, coupons) retournent à « Mon argent » ou à « Ce qui part tout seul », qui remontent à l'Activité", () => {
    for (const p of ["/moi/epargne", "/moi/reinvestir"]) {
      expect(parentDe(p, "/moi/regles"), p).toBe("/moi/regles");
      expect(parentDe(p, null), p).toBe("/moi/argent");
    }
    expect(parentDe("/moi/argent")).toBe("/activite");
    expect(parentDe("/moi/regles")).toBe("/activite");
  });
  it("les autres rubriques de l'Activité remontent à l'Activité, leurs sous-pages à leur rubrique", () => {
    for (const p of ["/moi/ordres", "/moi/documents", "/moi/profil", "/moi/compte"]) expect(parentDe(p), p).toBe("/activite");
    expect(parentDe("/moi/ordres/42")).toBe("/moi/ordres");
  });
  it("une page qui n'est pas de l'Activité garde le retour d'avant", () => {
    for (const p of ["/offres/x", "/titres", "/marche", "/moi/contact", "/info/aide"]) expect(parentDe(p), p).toBeUndefined();
  });
  it("la barre du haut s'en sert", () => {
    expect(readFileSync("src/components/mobile/MobileShell.tsx", "utf8")).toMatch(/const parent = parentDe\(path, venuDe\);\s*if \(parent\) \{\s*router\.push\(parent,/);
  });
});
