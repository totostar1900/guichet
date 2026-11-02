import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { drapeauDe, monogrammeDe, avatarDe } from "@/components/Avatar";
import { SEED_OFFERS } from "@/data/seed";
import { variationDe, variationDesDerniersEchanges } from "@/lib/domain/accueil";
import type { Quote } from "@/lib/domain/market";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * L'ACCUEIL « CARTES », 2 NOVEMBRE 2026 : sept décisions prises sur la planche de référence.
 * Le chiffre du portefeuille en tête (avant les devoirs) ; quatre gestes ronds ; l'aspect
 * « cartes » posé sur la racine de la page seule ; titres sobres à chevron ; lignes en une
 * carte, précédées d'un rond ; aucun pied réglementaire sur cette page.
 */
describe("l'Accueil « cartes »", () => {
  const page = code("src/app/Console.tsx");

  it("le chiffre du portefeuille vient AVANT les devoirs", () => {
    const hero = page.indexOf("className={styles.hero}");
    const devoirs = page.indexOf("<CeQuiVousAttend");
    expect(hero, "le héros a disparu").toBeGreaterThan(-1);
    expect(devoirs, "les devoirs ont disparu").toBeGreaterThan(-1);
    expect(hero, "le chiffre doit se lire avant les devoirs").toBeLessThan(devoirs);
  });

  it("les quatre gestes ronds mènent aux quatre pages", () => {
    for (const href of ["/moi/provision/alimenter", "/moi/provision/reprendre", "/titres", "/trader"]) expect(page, `le geste vers ${href} a disparu`).toContain(`href: "${href}"`);
  });

  it("l'aspect « cartes » est posé sur la racine de la page, jamais sur <html>", () => {
    expect(page).toContain('data-tuiles="cartes"');
    expect(code("src/lib/config.ts")).toMatch(/export const TUILES: AspectDesTuiles = "tuiles";/);
    expect(lire("src/app/globals.css")).toMatch(/\[data-tuiles="cartes"\]\s*\{[^}]*--tuile-rayon:\s*16px/);
  });

  it("aucun pied réglementaire sur l'Accueil", () => {
    expect(page).not.toMatch(/Votre capital est exposé|risques du marché/);
  });

  it("les lignes de l'Accueil sont sobres : titre à chevron et rond", () => {
    expect(code("src/components/accueil/TuilesDuHaut.tsx")).toMatch(/<SelectionDuDesk offres=\{offres\} sobre \/>/);
    expect(code("src/components/SelectionDuDesk.tsx")).toContain("<TitreDeBloc");
    expect(code("src/components/CeQuiFermeBientot.tsx")).toContain("<TitreDeBloc");
    expect(code("src/components/TitreDeBloc.module.css")).toMatch(/text-transform: uppercase;/);
  });

  it("l'avatar : le drapeau pour le Trésor, le monogramme pour le reste", () => {
    expect(drapeauDe("Cameroun")).toBe("🇨🇲");
    expect(monogrammeDe("Société Générale")).toBe("SO");
    expect(avatarDe({ issuer: "Trésor public du Cameroun", country: "Cameroun", title: "BTA" }).drapeau).toBe("🇨🇲");
    expect(avatarDe({ issuer: "Afriland First Bank", country: "Cameroun", title: "Obligation" })).toEqual({ mono: "AF" });
  });

  it("A1 · B1 · D1 : titres en étiquette, chiffre au-dessus du nom, carte plus claire que la surface", () => {
    const css = lire("src/app/globals.css");
    expect(css, "le titre n'est plus une étiquette de 12 px").toMatch(/--accueil-titre-tuile:\s*var\(--t-3\)/);
    expect(css, "le titre n'est plus en capitales").toMatch(/--accueil-titre-casse:\s*uppercase/);
    expect(css, "l'encre des titres repasse sous 4,5:1 sur la carte (mesuré le 2 novembre 2026 : --ink-3 donnait 4,24 en sombre, 4,4 en « dim »)").toMatch(/--accueil-titre-encre:\s*var\(--ink-2\)/);
    expect(css, "le chiffre n'est plus une marche au-dessus du nom").toMatch(/--accueil-chiffre:\s*var\(--t-6\)/);
    expect(css, "la carte n'est plus plus claire que la surface").toMatch(/--tuile-fond:\s*color-mix\(in srgb, var\(--surface-2\) 94%, var\(--ink\)\)/);
  });

  it("C2 : la variation n'existe que si la maison la connaît, et se pose sur les lignes qui la portent", () => {
    for (const o of SEED_OFFERS) {
      const v = variationDe(o);
      if (o.kind === "FONDS" && typeof o.fund?.variationPct === "number") expect(v, o.id).toBe(o.fund.variationPct);
      else expect(v, `${o.id} : pas de variation connue, pas de pastille`).toBeUndefined();
    }
    expect(code("src/components/PastilleVariation.tsx")).toMatch(/if \(v === undefined\) return null;/);
    expect(code("src/components/SelectionDuDesk.tsx")).toMatch(/<PastilleVariation v=\{variationAffichee\(o, actions, t\)\?\.v\}/);
    expect(code("src/components/accueil/GrilleInvestir.tsx")).toMatch(/variation: variationAffichee\(o, actions, t\)/);
  });

  it("la variation d'une action va du dernier échange au précédent, séances muettes ignorées", () => {
    const q = (sessionDate: string, close: number, volumeTraded: number, trades = volumeTraded > 0 ? 1 : 0) => ({ isin: "X", sessionDate, close, volumeTraded, trades }) as unknown as Quote;
    // la plus récente d'abord ; le 29 et le 27 n'ont pas traité
    const v = variationDesDerniersEchanges([q("2026-10-30", 102, 5), q("2026-10-29", 90, 0), q("2026-10-27", 90, 0), q("2026-10-26", 100, 3)]);
    expect(v).toEqual({ pct: 2, depuis: "2026-10-26", le: "2026-10-30" });
    // un cours identique est un zéro réel, rendu comme tel
    expect(variationDesDerniersEchanges([q("2026-10-30", 82500, 4), q("2026-10-29", 82500, 2)])?.pct).toBe(0);
    // un seul échange, ou rien : pas de variation, jamais un zéro inventé
    expect(variationDesDerniersEchanges([q("2026-10-30", 100, 1), q("2026-10-29", 99, 0)])).toBeUndefined();
    expect(variationDesDerniersEchanges([])).toBeUndefined();
    // un cours précédent nul ne se divise pas
    expect(variationDesDerniersEchanges([q("2026-10-30", 100, 1), q("2026-10-29", 0, 1)])).toBeUndefined();
  });

  it("seules les actions lisent l'historique, une lecture par ligne affichée", () => {
    const v = code("src/lib/market/variations.ts");
    expect(v, "les lignes cotées sont de genre MARCHE : le filtre ne doit pas se limiter à ACTIONS").toMatch(/o\.kind === "MARCHE" \|\| o\.kind === "ACTIONS"/);
    expect(v, "c'est la cotation qui dit action ou obligation").toMatch(/q\[0\]\?\.instrument === "action"/);
    expect(v).toMatch(/repo\(\)\.listQuotes\(o\.isin, 60\)/);
    expect(v, "jamais la vue entière des dernières cotations").not.toMatch(/latestQuotes/);
  });
});
