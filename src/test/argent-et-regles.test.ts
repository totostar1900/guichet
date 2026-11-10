import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const lire = (f: string) => readFileSync(f, "utf8");
const code = (f: string) => lire(f).replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

/** « MON ARGENT » (ce que l'on peut faire) ET « CE QUI PART TOUT SEUL » (ce qui est en place) — 10 novembre 2026, planche « Les mouvements d'argent », 2A et 2B. */
describe("Mon argent : les verbes, et chaque tuile mène droit à la page qui fait le geste", () => {
  const a = code("src/app/moi/argent/page.tsx");
  it("porte verser, retirer, placer, sans étape intermédiaire", () => {
    for (const href of ["/moi/provision/alimenter/virement", "/moi/prelevements?de=argent", "/moi/epargne", "/moi/provision/reprendre", "/moi/provision/placer", "/moi/reinvestir"]) expect(a, `la tuile vers ${href} a disparu`).toContain(`href: "${href}"`);
    expect(a).toContain('href="/moi/regles"');
  });
});
describe("Ce qui part tout seul : ce qui est en place, sans écriture", () => {
  const r = code("src/app/moi/regles/page.tsx");
  it("rassemble prélèvements, épargnes et coupons, et renvoie chaque ligne à sa page de gestion", () => {
    expect(r).toMatch(/listMandats/);
    expect(r).toMatch(/source === "virement"/);
    expect(r).toMatch(/source === "encaissements"/);
    for (const href of ["/moi/prelevements?de=regles", "/moi/epargne", "/moi/reinvestir"]) expect(r, href).toContain(href);
    expect(r).toContain('href="/moi/argent"');
  });
  it("n'écrit rien : aucune action serveur, aucun audit", () => {
    expect(r).not.toMatch(/"use server"|audit\(|\.insert|\.upsert|\.update\(/);
  });
});
