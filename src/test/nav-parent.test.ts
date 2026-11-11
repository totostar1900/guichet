import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parentDe } from "@/lib/nav-parent";
import { majPile, precedentDe } from "@/lib/nav-pile";

/** LE RETOUR REMONTE D'UN CRAN DE L'ARBRE, ET SUIT LA PAGE D'OÙ L'ON VIENT (10 novembre 2026, audit « Mon argent »). */
describe("parentDe : l'étape précédente d'une page de l'Activité", () => {
  it("la chaîne du virement remonte à « Mon argent », puis à l'Activité", () => {
    expect(parentDe("/moi/provision/alimenter/virement/envoye")).toBe("/moi/provision/alimenter/virement");
    expect(parentDe("/moi/provision/alimenter/virement", "/moi/argent")).toBe("/moi/argent");
    expect(parentDe("/moi/provision/alimenter/virement", null)).toBe("/moi/argent");
    expect(parentDe("/moi/argent")).toBe("/activite");
  });
  it("retirer et placer reviennent d'où l'on vient (Mon argent ou Activité), sinon à la provision", () => {
    for (const p of ["/moi/provision/reprendre", "/moi/provision/placer"]) {
      expect(parentDe(p, "/moi/argent"), p).toBe("/moi/argent");
      expect(parentDe(p, "/activite"), p).toBe("/activite");
      expect(parentDe(p, "/offres/x"), p).toBe("/moi/provision");
      expect(parentDe(p, null), p).toBe("/moi/provision");
    }
  });
  it("les pages de règle reviennent d'où l'on vient : Mon argent, Ce qui part tout seul, l'épargne (mandat)", () => {
    expect(parentDe("/moi/prelevements?de=regles", "/moi/regles")).toBe("/moi/regles");
    expect(parentDe("/moi/prelevements?instruction=st-1&de=epargne", "/moi/epargne")).toBe("/moi/epargne");
    expect(parentDe("/moi/prelevements", null)).toBe("/moi/argent");
    for (const p of ["/moi/epargne", "/moi/reinvestir"]) {
      expect(parentDe(p, "/moi/regles"), p).toBe("/moi/regles");
      expect(parentDe(p, null), p).toBe("/moi/argent");
    }
  });
  it("« Ce qui part tout seul » revient à « Mon argent » s'il en vient, sinon à l'Activité", () => {
    expect(parentDe("/moi/regles", "/moi/argent")).toBe("/moi/argent");
    expect(parentDe("/moi/regles", null)).toBe("/activite");
  });
  it("les autres rubriques de l'Activité remontent à l'Activité, leurs sous-pages à leur rubrique", () => {
    for (const p of ["/moi/ordres", "/moi/documents", "/moi/profil", "/moi/compte"]) expect(parentDe(p), p).toBe("/activite");
    expect(parentDe("/moi/ordres/42")).toBe("/moi/ordres");
  });
  it("une page qui n'est pas de l'Activité garde le retour d'avant", () => {
    for (const p of ["/offres/x", "/titres", "/marche", "/moi/contact", "/info/aide"]) expect(parentDe(p), p).toBeUndefined();
  });
});

describe("la pile des pages vues : un retour dépile, une page nouvelle empile", () => {
  it("avancer empile, reculer (flèche ou Android) dépile : pas de boucle", () => {
    let p = majPile([], "/activite", false);
    p = majPile(p, "/moi/argent", false);
    p = majPile(p, "/moi/epargne", false);
    expect(precedentDe(p)).toBe("/moi/argent");
    p = majPile(p, "/moi/argent", false); // retour : la page d'avant est celle-là
    expect(p).toEqual(["/activite", "/moi/argent"]);
    expect(precedentDe(p)).toBe("/activite");
  });
  it("une flèche qui remplace la page la remplace dans la pile", () => {
    let p = majPile(["/offres/x", "/moi/provision/reprendre"], "/moi/provision", true);
    expect(p).toEqual(["/offres/x", "/moi/provision"]);
    p = majPile(p, "/moi/provision", false);
    expect(p).toEqual(["/offres/x", "/moi/provision"]);
  });
});

describe("la barre du haut et les boutons « Retour » s'en servent", () => {
  it("la flèche remonte par l'arbre, ou recule d'une étape", () => {
    const s = readFileSync("src/components/mobile/MobileShell.tsx", "utf8");
    expect(s).toMatch(/const parent = parentDe\(path, venuDe\);\s*if \(parent\) \{\s*retourEtape\(router, parent\);/);
    expect(s, "la flèche ne revient plus à l'étape d'avant d'un formulaire à étapes").toMatch(/get\("etape"\)\) \{\s*router\.back\(\);/);
    expect(readFileSync("src/components/mobile/retourEtape.ts", "utf8")).toMatch(/router\.back\(\);\s*return;[\s\S]*router\.replace\(cible/);
  });
  it("l'étape 2 de l'épargne programmée est dans l'adresse : Android et la flèche reviennent à l'étape 1", () => {
    const st = readFileSync("src/components/Standing.tsx", "utf8");
    expect(st).toMatch(/sp\.get\("etape"\) === "2" && verse > 0 \? 2 : 1/);
    expect(st).toMatch(/router\.push\(`\$\{chemin\}\?etape=2`, \{ scroll: false \}\)/);
  });
});
