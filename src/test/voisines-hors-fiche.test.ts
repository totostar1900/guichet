import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { estUneFiche } from "@/lib/fiche-url";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

/**
 * LES VOISINES D'UNE FICHE NE SE DEMANDENT QUE DEPUIS UNE FICHE.
 *
 * Relevé en production le 1er novembre 2026 : dix familles d'erreurs « Could not
 * find the module … in the React Client Manifest » (KpiCard, LineMenu,
 * FichePanes…) sur la route « /info/[key] », en rafales — la même seconde pour
 * toutes. Cause reproduite sur le build de production : l'action serveur
 * « neighbourReading » rend la fiche voisine, donc des composants client que
 * seule la route des fiches porte à son manifeste ; postée depuis « /info/{clé} »
 * elle échoue, postée depuis « /offres/{id} » elle réussit.
 */
describe("estUneFiche", () => {
  it("reconnaît le chemin d'une fiche, relatif ou absolu, avec ou sans requête", () => {
    for (const u of ["/offres/rca-ota-a-2028", "/offres/rca-ota-a-2028/", "https://guichet.purposecapital.africa/offres/x1?liste=fonds", "/offres/x#kpi"]) expect(estUneFiche(u), u).toBe(true);
  });
  it("refuse tout ce qui n'est pas la fiche elle-même", () => {
    for (const u of ["/info/franc-cfa-parite", "/offres/x/intention", "/offres", "/offres/", "/", "", null, undefined, "https://guichet.purposecapital.africa/info/risques"]) expect(estUneFiche(u as string | null | undefined), String(u)).toBe(false);
  });
});

describe("l'action des voisines", () => {
  it("répond « rien » avant de rendre quoi que ce soit quand elle ne vient pas d'une fiche", () => {
    const src = lire("src/app/offres/[id]/neighbour.tsx");
    const garde = src.indexOf("if (depuis && !estUneFiche(depuis)) return null;");
    expect(garde, "la garde du referer a disparu de l'action").toBeGreaterThan(0);
    expect(src.indexOf("await loadFiche(o)", garde), "la garde ne précède plus le rendu de la fiche").toBeGreaterThan(garde);
    expect(src.indexOf('get("referer")'), "l'action ne lit plus la page d'où elle vient").toBeGreaterThan(0);
  });
  it("n'est appelée par le pager que depuis le chemin d'une fiche", () => {
    const src = lire("src/components/mobile/SwipePager.tsx");
    const garde = src.indexOf("if (!estUneFiche(window.location.pathname)) return;");
    expect(garde, "la garde du chemin courant a disparu du pager").toBeGreaterThan(0);
    expect(src.indexOf("neighbourReading(nid)", garde), "la garde ne précède plus l'appel de l'action").toBeGreaterThan(garde);
  });
});
