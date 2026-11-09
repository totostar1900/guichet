import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { badgesFor } from "@/lib/domain/summary";
import type { Offer } from "@/lib/domain/types";

const code = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

/**
 * LES SÉANCES CLOSES ET LEURS RÉSULTATS (9 novembre 2026, planche « Séances closes et résultats », 1A · 2A · 3A).
 * Le résultat confirmé au Desk EST la ligne close : aucune offre n'est créée. Aucune « sélection du desk » sur une séance close. La page du Marché lit le même composant.
 */
const offre = (o: Partial<Offer>) => ({ id: "o1", kind: "OTA", version: 1, deadlineAt: "2026-11-01T12:00:00Z", featured: { reason: "Retenue pour sa durée", until: "2026-12-31" }, ...o }) as unknown as Offer;

describe("les séances closes", () => {
  it("une séance close n'a plus de « Sélection du desk », une séance ouverte la garde", () => {
    const now = new Date("2026-11-09T10:00:00Z");
    expect(badgesFor(offre({}), "closed" as never, now).map((b) => b.key), "la sélection du desk paraît sur une séance close").not.toContain("selection");
    expect(badgesFor(offre({ deadlineAt: "2026-11-20T12:00:00Z" }), "open" as never, now).map((b) => b.key)).toContain("selection");
  });
  it("la page d'Investir lit les résultats confirmés, sans créer d'offre, six au plus, hors lignes déjà au catalogue", () => {
    const p = code("src/app/calendrier/page.tsx");
    expect(p).toMatch(/vueClient\(await repo\(\)\.listAuctionResults\(/);
    expect(p, "les résultats ne sont plus bornés à six").toMatch(/\.slice\(0, 6\)/);
    expect(p).toMatch(/codesDuCatalogue\.has\(r\.codeEmission\)/);
    expect(p, "une offre est créée depuis un résultat").not.toMatch(/createOffer|publishOffer|upsertOffer/);
    expect(p).toMatch(/<CarteDeSeanceClose key=\{r\.id\} s=\{r\} \/>/);
  });
  it("la carte close montre les huit chiffres du communiqué, aucun bouton d'ordre, aucune sélection", () => {
    const c = code("src/components/market/CarteDeSeanceClose.tsx");
    for (const k of ["Annoncé", "Soumissions", "Servi", "Couverture", "Soumissionnaires", "SVT du réseau"]) expect(c, `« ${k} » a disparu`).toMatch(new RegExp(`faits\\.push\\(\\["${k}",`));
    expect(c, "la carte close porte un geste d'ordre").not.toMatch(/Passer un ordre|Déclarer|Souscrire|BoutonsDeLaCarte/);
    expect(c, "la carte close porte une sélection du desk").not.toMatch(/featured|Sélection du desk/);
    expect(c).toMatch(/<BoutonsDeSeanceClose href=\{href\} \/>/);
  });
  it("la page du Marché lit le même composant, en tuiles pleine largeur, sans panneau", () => {
    const m = code("src/app/marche/adjudications/page.tsx");
    expect(m).toMatch(/<CarteDeSeanceClose key=\{s\.id\} s=\{s\} \/>/);
    expect(m, "le panneau qui rétrécissait les rangées est revenu").not.toMatch(/className="panel" id="seances"/);
  });
});
