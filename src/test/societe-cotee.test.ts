import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { VOLETS_SOCIETE } from "@/lib/ui/volets-societe";

const lire = (p: string) => readFileSync(`${__dirname}/../../${p}`, "utf8");
const sans = (p: string) => lire(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const PAGE = "src/app/societes/[mnemo]/SocieteBody.tsx";
const FICHE = "src/app/offres/[id]/FicheAction.tsx";

/**
 * LA PAGE D'UNE SOCIÉTÉ COTÉE ET LA FICHE DE SON ACTION (6 novembre 2026, planche « 1A · 2B · 3C avec tout l'actionnariat »).
 *
 * Un seul cours (la dernière clôture, datée) ; la page de la société reçoit tout ce que la fiche montre et qu'elle n'avait pas, en quatre volets sur téléphone ; la fiche de l'action
 * garde son onglet Émetteur entier, tous les actionnaires compris. Rien de ce que la page avait n'est retiré.
 */
describe("la page d'une société cotée", () => {
  it("quatre volets : Marché · Comptes · Ratios · Société", () => {
    expect(VOLETS_SOCIETE.map(([k]) => k)).toEqual(["marche", "comptes", "ratios", "societe"]);
    expect(VOLETS_SOCIETE.map(([, l]) => l)).toEqual(["Marché", "Comptes", "Ratios", "Société"]);
    const css = lire("src/components/mobile/FichePanes.module.css");
    for (const k of ["marche", "comptes", "ratios", "societe"]) expect(css, `le volet « ${k} » ne se masque plus sur téléphone`).toContain(`.panes[data-show="${k}"] [data-pane]:not([data-pane="${k}"])`);
    expect(lire("src/components/mobile/FichePanes.tsx"), "le volet de départ n'est plus réglable").toMatch(/useState\(depart\)/);
  });

  it("les volets ne paraissent que chez le client ; le desk garde la page d'avant", () => {
    const s = sans(PAGE);
    expect(s).toMatch(/const client = !desk;/);
    expect(s, "la page rend les volets sans passer par le client").toMatch(/client \? \(\s*<FichePanes depart="marche">\s*<FicheSegments volets=\{VOLETS_SOCIETE\}/);
    expect(s, "le desk a reçu un ajout").not.toMatch(/desk && .*SeancesDeLAction/);
  });

  it("chaque panneau de la page est rangé dans son volet, et les ajouts ont le leur", () => {
    const s = sans(PAGE);
    const rangement: [RegExp, string][] = [
      [/\{\.\.\.pane\("marche"\)\}>\s*<div className=\{styles\.panelH\}>/, "le cours"],
      [/\{\.\.\.pane\("comptes"\)\}>\s*<h2>\s*\{a\.latest\.revenueLabel\}/, "le chiffre d'affaires"],
      [/\{\.\.\.pane\("comptes"\)\}>\s*<h2>\s*\{t\("Fonds propres"\)\}/, "les fonds propres"],
      [/\{\.\.\.pane\("comptes"\)\}>\s*<h2>\s*\{t\("Chiffres clés certifiés"\)\}/, "les chiffres certifiés"],
      [/\{\.\.\.pane\("comptes"\)\}>\s*<h2>\{t\("Ce que disent les chiffres"\)\}/, "ce que disent les chiffres"],
      [/\{\.\.\.pane\("ratios"\)\}>\s*<h2>\s*\{t\("Ratios, et comment les lire"\)\}/, "les ratios"],
      [/\{\.\.\.pane\("societe"\)\}>\s*<h2>\s*\{t\("Actionnariat"\)\}/, "l'actionnariat"],
      [/\{\.\.\.pane\("societe"\)\}>\s*<h2>\{t\("Documents publiés"\)/, "les documents"],
      [/<div \{\.\.\.pane\("societe"\)\}[^>]*>\s*<RelatedNews kind="company"/, "les actualités"],
    ];
    for (const [re, nom] of rangement) expect(s, `« ${nom} » n'est plus dans son volet`).toMatch(re);
    expect(s, "les séances et la cotation ont quitté le volet Marché").toMatch(/data-pane="marche">\s*<h2>\s*\{t\("Séances et cotation"\)\}[\s\S]*?<SeancesDeLAction quotes=\{seancesDesc\} \/>/);
    expect(s, "la marge et la rentabilité ont quitté la page").toMatch(/client && rapportsLisibles && \([\s\S]*?\{t\("Marge et rentabilité"\)\}/);
    expect(s, "le dividende par action a quitté la page").toMatch(/client && dernierDiv && \([\s\S]*?\{t\("Dividende par action"\)\}/);
    expect(s, "les courbes de la valorisation ne sont plus dans le volet Ratios").toMatch(/<GraphesDeValorisation serie=\{valorisation\} resultatAuDessusDuChiffreDAffaires=\{resultatAuDessus\} pane="ratios" panneau=\{styles\.panel\} \/>/);
    expect(s, "ses lignes à Guichet ont quitté la page").toMatch(/client && listedLine && autresLignes\.length > 0 && \([\s\S]*?\{t\("Ses lignes à Guichet"\)\}[\s\S]*?lignesSeulement sansRepere \/>/);
    expect(s, "la part des fonds propres n'est plus dessinée avec le bilan").toMatch(/lignes=\{\[\{ nom: t\("Part des fonds propres"\)/);
  });

  it("« Acheter l'action » demeure, « Voir la fiche complète » s'ajoute chez le client, le rapport suit la période", () => {
    const s = sans(PAGE);
    expect(s, "« Acheter l'action » a disparu").toMatch(/\{t\("Acheter l'action"\)\}/);
    expect(s, "« Voir la fiche complète » n'est plus chez le client").toMatch(/client && listedLine && \(\s*<Link className="btn" href=\{`\/offres\/\$\{listedLine\.id\}`\}>\s*\{t\("Voir la fiche complète"\)\}/);
    expect(s, "le rapport PDF ne suit plus la période").toMatch(/\/rapport\?p=\$\{p\}/);
  });

  it("la légende du rendement lit le dividende des comptes quand le bulletin n'en a pas", () => {
    const s = sans(PAGE);
    expect(s, "la légende ne lit plus le dividende des comptes").toMatch(/dernierDiv \? `\$\{fmt\(dernierDiv\.dividendPerShare as number\)\} FCFA \$\{t\("brut"\)\} · \$\{t\("exercice \{y\}"/);
    expect(s, "la légende fausse est revenue sous le rendement").toMatch(/<small>\{legendeRendement\}<\/small>/);
  });

  it("un seul cours : la fiche de l'action lit la dernière clôture publiée, datée, et le rendement sur ce cours", () => {
    const f = sans(FICHE);
    expect(f, "la fiche ne choisit plus la clôture la plus récente").toMatch(/const cloture = quotes\[0\] && \(!o\.lastPriceOn \|\| quotes\[0\]\.sessionDate >= o\.lastPriceOn\) \? quotes\[0\] : undefined;/);
    expect(f, "le cours de la fiche n'est plus la clôture datée").toMatch(/etiquette=\{coursLe \? t\("Cours · clôture \{d\}"/);
    expect(f, "le rendement n'est plus calculé sur la clôture").toMatch(/const rendementRef = cloture \? rendementDividendePct\(dividendeAffiche, cloture\.close\) : null;/);
  });

  it("les séances n'ont qu'une définition, et le dernier échange dit son prix", () => {
    expect(sans(FICHE), "la fiche refait ses séances").toMatch(/<SeancesDeLAction quotes=\{quotes\} \/>/);
    expect(sans(PAGE)).toMatch(/<SeancesDeLAction quotes=\{seancesDesc\} \/>/);
    expect(sans("src/app/offres/[id]/SeancesDeLAction.tsx"), "le dernier échange ne dit plus son prix").toMatch(/t\("à \{p\} FCFA", \{ p: fmt\(Math\.round\(tradee\.valueTraded \/ tradee\.volumeTraded\)\) \}\)/);
  });

  it("la fiche de l'action garde tous ses actionnaires et la page de la société aussi", () => {
    expect(sans(FICHE), "la fiche n'affiche plus tous les actionnaires").toMatch(/actionnariatTotal\(company\.coreShareholders, t\("Flottant et autres"\)\)\.map\(/);
    expect(sans("src/components/Charts.tsx"), "la barre ne complète plus à 100 %").toMatch(/actionnariatTotal\(parts, tr\("Flottant et autres"\)\)/);
    expect(sans(PAGE), "la page n'affiche plus la barre des actionnaires").toMatch(/<ShareBar parts=\{c\.coreShareholders\} \/>/);
  });

  it("sa liste de lignes ne porte « cette fiche » sur aucune ligne", () => {
    expect(sans("src/app/offres/[id]/IssuerCard.tsx")).toMatch(/issuerLadder\(\[\{ o, s: summarize\(o, new Date\(\)\) \}, \.\.\.others\], name, sansRepere \? "" : o\.id\)/);
  });

  it("l'actionnariat montré fait toujours 100 %, pour chaque société", async () => {
    const { COMPANIES } = await import("@/data/companies");
    const { actionnariatTotal } = await import("@/lib/domain/actionnariat");
    for (const c of COMPANIES) {
      const somme = actionnariatTotal(c.coreShareholders, "Flottant et autres").reduce((s, p) => s + p.pct, 0);
      expect(Math.abs(somme - 100) < 0.06, `${c.mnemo} : ${somme} %`).toBe(true);
    }
  });

  it("le graphe annuel écrit lui-même l'espace des milliers (sinon l'hydratation échoue sur un dividende > 1 000)", () => {
    expect(sans("src/components/GrapheComptes.tsx")).toMatch(/const nombre = \(v: number\) => v\.toLocaleString\("fr-FR", \{ maximumFractionDigits: 2 \}\)\.replace\(\/\[\\u202f\\u00a0\]\/g, "\\u00a0"\);/);
  });
});
