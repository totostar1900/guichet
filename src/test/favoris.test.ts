import { afterEach, describe, expect, it } from "vitest";
import { titreDeLOnglet } from "@/components/mobile/titre-onglet";
import { COMPANY, PRODUCT } from "@/lib/config";
import { cheminDeFavori, echeancesUrgentes, lesFavoris } from "@/lib/domain/favoris";
import type { Echeance } from "@/lib/domain/echeances";
import type { Favori, Offer, Watch } from "@/lib/domain/types";

const e = (jours: number): Echeance => ({ offerId: `o${jours}`, titre: "t", quoi: { key: "x" }, jours, urgence: "calme", href: "/offres/x" });
const w = (offerId: string): Watch => ({ id: offerId, userId: "u", offerId, createdAt: "2026-10-01" });
const f = (href: string): Favori => ({ id: href, userId: "u", href, title: href, createdAt: "2026-10-01" });

describe("cheminDeFavori : ce qu'on accepte de mettre en favori", () => {
  it("garde un chemin interne et sa requête, pas son fragment", () => {
    expect(cheminDeFavori("/info/lire-une-ligne")).toBe("/info/lire-une-ligne");
    expect(cheminDeFavori("/fonds?cat=O")).toBe("/fonds?cat=O");
    expect(cheminDeFavori("/indice#lecture")).toBe("/indice");
  });
  it("refuse tout ce qui mène hors de la maison", () => {
    for (const x of ["https://exemple.com", "//exemple.com", "exemple", "/\\exemple.com", "javascript:alert(1)", ""]) expect(cheminDeFavori(x), x).toBeNull();
  });
  it("refuse les pages qui n'ont pas de sens en favori, et la fiche d'une ligne", () => {
    for (const x of ["/favoris", "/echeances", "/desk", "/desk/clients", "/connexion", "/api/x", "/offres/ota-gabon"]) expect(cheminDeFavori(x), x).toBeNull();
  });
  it("ne confond pas un préfixe avec un chemin voisin", () => {
    expect(cheminDeFavori("/echeancier-mondial")).toBe("/echeancier-mondial");
  });
});

describe("l'horloge ne compte que ce qui presse", () => {
  it("sept jours inclus, pas huit", () => {
    expect(echeancesUrgentes([e(0), e(7), e(8), e(30)])).toBe(2);
    expect(echeancesUrgentes([e(8)])).toBe(0);
  });
});

describe("les favoris : les lignes suivies, et les pages", () => {
  it("une veille sans offre n'est pas un favori", () => {
    const offres = [{ id: "a" }] as Offer[];
    const r = lesFavoris([w("a"), w("fantome")], offres, [f("/indice")]);
    expect(r.lignes.map((o) => o.id)).toEqual(["a"]);
    expect(r.pages).toHaveLength(1);
  });
});

describe("le nom qu'on range en favori : celui de l'onglet, sans le suffixe de la maison", () => {
  const poser = (t: string) => ((globalThis as { document?: unknown }).document = { title: t });
  afterEach(() => delete (globalThis as { document?: unknown }).document);
  it("coupe « · Guichet » et « · Purpose Capital », et rien d'autre", () => {
    poser(`Le parcours CEMAC · ${PRODUCT.name}`);
    expect(titreDeLOnglet()).toBe("Le parcours CEMAC");
    poser(`${PRODUCT.name} · ${COMPANY.name}`);
    expect(titreDeLOnglet(), "la racine garde le nom du produit : il n'y a rien avant le séparateur").toBe(PRODUCT.name);
    poser("Fonds - rendement net");
    expect(titreDeLOnglet(), "un tiret dans le titre ne doit pas le couper").toBe("Fonds - rendement net");
  });
});
