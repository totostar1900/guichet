import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CAMPAGNE, cssDeCampagne } from "@/lib/campagne";
import { ACCENTS } from "@/lib/config";
import { MARQUE } from "@/lib/marque";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * LE CALQUE « CAMPAGNE » (21 novembre 2026) : un seul fichier, vide par défaut, pour poser ou retirer le thème d'une campagne marketing ou de communication.
 */
describe("la campagne en cours", () => {
  it("est vide : l'application garde ses couleurs", () => {
    expect(CAMPAGNE.accents).toBeUndefined();
    expect(CAMPAGNE.marque).toBeUndefined();
    expect(CAMPAGNE.jetons).toBeUndefined();
    expect(cssDeCampagne(CAMPAGNE)).toBe("");
    expect(MARQUE).toEqual({ or: "#b8860b", orSombre: "#e0b65a", orVif: "#e2b94c" });
    expect(ACCENTS).toEqual({ instruments: "or", trader: "or", marche: "bleu", aide: "or", accueil: "or" });
  });
});

describe("le CSS d'une campagne", () => {
  it("redit les jetons, communs puis par thème, en « !important » (la campagne l'emporte sur le thème et sur la palette)", () => {
    const css = cssDeCampagne({ nom: "Rentrée", jetons: { commun: { "--marque-or": "#2f7d5b" }, clair: { "--gold": "#2f7d5b" }, sombre: { "--gold": "#7fd1a8", "--gold-ink": "rgb(127, 209, 168)" } } });
    expect(css).toBe(':root{--marque-or:#2f7d5b !important}html[data-theme="light"]{--gold:#2f7d5b !important}html[data-theme="dark"]{--gold:#7fd1a8 !important;--gold-ink:rgb(127, 209, 168) !important}');
  });
  it("ne pose rien d'un thème absent, et refuse ce qui sortirait du cadre", () => {
    expect(cssDeCampagne({ nom: "x", jetons: { tamise: {} } })).toBe("");
    const css = cssDeCampagne({ nom: "x", jetons: { commun: { "--ok": "#fff", "--mal nommé": "#fff", "--piege": "red;} body{display:none", "gold": "#fff", "--accolade": "{" } } });
    expect(css).toBe(":root{--ok:#fff !important}");
  });
});

describe("là où la campagne se lit", () => {
  it("la mise en page pose son CSS après les or de la marque", () => {
    expect(lire("src/app/layout.tsx")).toMatch(/__html: MARQUE_CSS \+ cssDeCampagne\(CAMPAGNE\)/);
  });
  it("les accents et la marque se redisent depuis la campagne, sans catalogue", () => {
    expect(lire("src/lib/config.ts")).toMatch(/\{ \.\.\.ACCENTS_DE_BASE, \.\.\.CAMPAGNE\.accents \}/);
    expect(lire("src/lib/marque.ts")).toMatch(/\{ \.\.\.BASE, \.\.\.CAMPAGNE\.marque \}/);
  });
});
