import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const lire = (f: string) => readFileSync(f, "utf8");
const code = (f: string) => lire(f).replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

/** « MON ARGENT » : LE SOLDE, TROIS GESTES, ET CE QUI PART TOUT SEUL (16 novembre 2026, planche « Mon argent », 1A et 2B ; avant : « Les mouvements d'argent », 10 novembre). */
describe("Mon argent : le solde en tête, trois gestes, et chaque tuile mène droit à la page qui fait le geste", () => {
  const g = code("src/app/moi/argent/Gestes.tsx");
  const a = code("src/app/moi/argent/page.tsx");
  it("porte verser, retirer, placer, sans étape intermédiaire", () => {
    for (const href of ["/moi/provision/alimenter/virement", "/moi/prelevements/nouveau", "/moi/epargne/nouvelle", "/moi/provision/reprendre", "/moi/provision/placer"]) expect(g, `le geste vers ${href} a disparu`).toContain(`"${href}"`);
    expect(a).toContain("<SoldeDeLaProvision userId");
    expect(a, "la page ne garde plus la section « Ce qui part tout seul »").toContain('id="en-place"');
  });
  it("les anciennes pages « Ma provision » et « Ce qui part tout seul » redirigent ici", () => {
    expect(code("src/app/moi/provision/page.tsx")).toMatch(/redirect\("\/moi\/argent"\)/);
    expect(code("src/app/moi/regles/page.tsx")).toMatch(/redirect\("\/moi\/argent#en-place"\)/);
  });
});
describe("Ce qui part tout seul : chaque règle une seule fois, sans écriture", () => {
  const r = code("src/app/moi/argent/en-place.ts");
  it("range les règles par règle : épargnes avec leur mandat, versement de la provision, coupons", () => {
    expect(r).toMatch(/listMandats/);
    expect(r).toMatch(/source === "virement"/);
    expect(r).toMatch(/source === "encaissements"/);
    expect(r, "l'épargne et son mandat ne sont plus une seule rangée").toMatch(/m\.objet === "instruction" && m\.standingId === x\.id/);
    expect(r, "le versement mensuel de la provision n'a plus sa rangée").toMatch(/y\.objet === "provision"/);
  });
  it("la rangée dit son geste (« Signer le mandat ») au lieu de le cacher derrière un tap, et ne s'imbrique pas dans un lien", () => {
    expect(r).toContain('t("Signer le mandat")');
    const a = code("src/app/moi/argent/page.tsx");
    expect(a).toMatch(/l\.geste && \(/);
    expect(a, "un lien dans un lien").not.toMatch(/<Link[^>]*className=\{styles\.corps\}[^>]*>[\s\S]*<Link[\s\S]*<\/Link>[\s\S]*<\/Link>\s*\{l\.geste/);
  });
  it("n'écrit rien : aucune action serveur, aucun audit", () => {
    expect(r).not.toMatch(/"use server"|audit\(|\.insert|\.upsert|\.update\(/);
  });
});

/** MON ARGENT EN TROIS CHAPITRES (17 novembre 2026, planche « Signer et suivre », 1A) : un titre à plat et une phrase par chapitre, et le suivi trouve enfin une place nommée. */
describe("Mon argent : trois chapitres identifiés", () => {
  const a = code("src/app/moi/argent/page.tsx");
  it("porte « Mon solde », « Ce qui part tout seul » et « Suivre mon argent », chacun avec sa phrase", () => {
    for (const titre of ["Mon solde", "Ce qui part tout seul", "Suivre mon argent"]) expect(a, titre).toMatch(new RegExp(`<h2 className=\\{styles\\.titre\\}>\\{t\\("${titre}"\\)\\}</h2>`));
    expect(a.match(/className=\{styles\.promesse\}/g) ?? []).toHaveLength(3);
  });
  it("le suivi porte ses quatre portes : ordres (avec leurs comptes), rendement (avec ses chiffres), mouvements, coûts", () => {
    for (const href of ["/moi/ordres", "/moi/performance", "/moi/documents/argent", "/moi/tarifs"]) expect(a, href).toContain(`href: "${href}"`);
    expect(a, "le rendement doit se lire du même calcul que sa page").toContain("buildPerformance(mes, offers, cash)");
    expect(a, "un ordre à signer doit se voir sur la tuile").toMatch(/attend: aSigner \? t\("à signer"\) : undefined/);
  });
});
