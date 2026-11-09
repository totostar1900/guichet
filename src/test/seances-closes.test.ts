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
  it("la page d'Investir ne montre aucune séance close : ni résultats, ni lignes closes, des liens vers le Marché et le calendrier", () => {
    const p = code("src/app/calendrier/page.tsx");
    expect(p, "les résultats confirmés sont revenus dans Investir").not.toMatch(/listAuctionResults|CarteDeSeanceClose|Séances closes/);
    expect(p, "une ligne close passe encore dans la liste d'Investir").toMatch(/!isPast\(displayStatus\(o, maintenant\)\)/);
    expect(p, "la page vide ne mène plus aux résultats passés").toMatch(/href="\/marche\/adjudications"/);
    expect(p, "la page vide ne mène plus au calendrier").toMatch(/href="\/calendrier\/seances"/);
    expect(p, "le lien en tête du calendrier est revenu : il est une tuile à côté des filtres").not.toMatch(/Calendrier des séances\} ›/);
    const b = code("src/components/OfferBrowser.tsx");
    expect(b, "les tuiles Calendrier et Résultats ne sont plus sur la rangée des filtres").toMatch(/cle: "calendrier"[\s\S]*cle: "resultats"/);
    expect(b, "le bloc des séances closes reparaît même vide").toMatch(/closes\.length > 0 \? \[\{ clef: "closes"/);
  });
  it("le Marché porte les lignes closes du catalogue, pleine largeur, hors celles qu'un résultat porte déjà", () => {
    const m = code("src/app/marche/adjudications/page.tsx");
    expect(m).toMatch(/codesDesResultats\.has\(o\.isin\)/);
    expect(m).toMatch(/<RangeeDeLigneClose key=\{o\.id\} o=\{o\} \/>/);
    expect(code("src/components/market/RangeeDeLigneClose.tsx"), "la rangée close porte de nouveau un menu qui la rétrécit").not.toMatch(/LineMenu/);
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
