import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * UNE PAGE, UN NOM (17 novembre 2026, planche « Signer et suivre », 2A).
 *
 * La page des ordres s'appelait « Mes intentions », « Mes ordres », « Mes ordres et intentions » et « Mes ordres en cours » selon la porte ; celle du rendement « Analyse », « Ma rentabilité »,
 * « Analyse de votre portefeuille » et « L'analyse de votre portefeuille ». Une porte qui n'a pas le nom de la page qu'elle ouvre coûte un essai au client.
 */
const lire = (f: string) => readFileSync(f, "utf8");
const code = (dir: string): [string, string][] => {
  const out: [string, string][] = [];
  const marche = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) {
        if (e.name === "i18n" || e.name === "docs") continue;
        marche(p);
      } else if (/\.(ts|tsx)$/.test(e.name)) out.push([p, lire(p)]);
    }
  };
  marche(dir);
  return out;
};
const fichiers = [...code("src/app"), ...code("src/components"), ...code("src/lib")];

describe("les ordres : « Mes ordres » partout", () => {
  it("aucune porte n'emploie plus l'ancien nom de la page des ordres", () => {
    const fautifs = fichiers.filter(([, s]) => /"Mes ordres en cours"|"Mes ordres et intentions"|t\("Mes ordres en cours"\)/.test(s)).map(([p]) => p);
    expect(fautifs).toEqual([]);
    const o = lire("src/app/moi/ordres/page.tsx");
    expect(o).toMatch(/titre=\{t\("Mes ordres"\)\}/);
    expect(o, "le titre de la page est redevenu « Mes intentions »").not.toMatch(/titre=\{t\("Mes intentions"\)\}/);
  });
  it("la page range À signer, En cours, Terminés ; une seule balise principale", () => {
    const o = lire("src/app/moi/ordres/page.tsx");
    for (const h of ["À signer", "En cours", "Terminés"]) expect(o, h).toMatch(new RegExp(`<h2>\\{t\\("${h}"\\)\\}</h2>`));
    expect(o, "la page porte une seconde balise main : le gabarit en a déjà une").not.toMatch(/<main\b/);
  });
  it("les phrases de suite ne parlent plus du parcours d'avant (bulletin à signer, appel de fonds)", () => {
    const o = lire("src/app/moi/ordres/page.tsx");
    expect(o).toMatch(/const suiteDe = \(i: Intent\)/);
    expect(o).toMatch(/Il reste à signer votre ordre : votre code suffit\./);
    /* Un rachat à signer lit « il reste à signer », et signé « rien à virer » : il ne parle plus de souscription ni de virement (mesuré le 17 novembre 2026 sur « i-023 »). */
    expect(o).toMatch(/i\.type === "rachat" \|\| i\.type === "vente" \|\| i\.type === "cession"\) return "Signé : rien à virer/);
  });
});

describe("le rendement : « Ce que mon épargne a rapporté » partout", () => {
  it("aucune porte n'emploie plus un ancien nom de la page du rendement", () => {
    const anciens = /"Ma rentabilité"|"Analyse de votre portefeuille"|"L'analyse de votre portefeuille"/;
    const fautifs = fichiers.filter(([, s]) => anciens.test(s)).map(([p]) => p);
    expect(fautifs).toEqual([]);
    const perf = lire("src/app/moi/performance/page.tsx");
    expect(perf.match(/titre=\{t\("Ce que mon épargne a rapporté"\)\}/g) ?? []).toHaveLength(2);
    expect(lire("src/lib/nav-groups.ts")).toMatch(/key: "performance", href: "\/moi\/performance", label: "Mon rendement"/);
  });
});
