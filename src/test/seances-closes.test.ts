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
  it("le Marché porte UNE liste : les résultats enrichis de leur ligne, et les lignes closes qu'aucun résultat ne porte", () => {
    const m = code("src/app/marche/adjudications/page.tsx");
    expect(m).toMatch(/toutes\.some\(\(s\) => s\.codeEmission === o\.isin\)/);
    expect(m, "la liste unique n'est plus rendue par ListeDesSeancesCloses").toMatch(/<ListeDesSeancesCloses entrees=\{entrees\} \/>/);
    expect(m, "une ligne sans prix servi est revenue dans la liste des résultats").toMatch(/o\.servedPricePct != null && !\(o\.isin/);
    expect(code("src/components/market/CarteDeSeanceClose.tsx"), "la carte d'une ligne ne lit plus le rendement au prix servi").toMatch(/rendementLigne = e\.type === "ligne" \? displayYield\(e\.o\)\.pct : null/);
    expect(m, "une seconde liste de lignes closes est revenue").not.toMatch(/RangeeDeLigneClose|lignes-closes/);
  });
  it("la liste se cherche, se filtre et se range, et ne montre que ce qu'elle contient", () => {
    const l = code("src/components/market/ListeDesSeancesCloses.tsx");
    expect(l, "la recherche n'ignore plus les accents").toMatch(/fold\(/);
    expect(l, "les Trésors proposés ne viennent plus de la liste").toMatch(/paysPresents = \[\.\.\.new Set\(lignes\.map/);
    expect(l).toMatch(/Plus récentes[\s\S]*Plus anciennes[\s\S]*Rendement, du plus haut/);
    expect(l, "la pagination a disparu").toMatch(/Voir plus de séances/);
  });
  it("la carte close montre les huit chiffres du communiqué, aucun bouton d'ordre, aucune sélection", () => {
    const c = code("src/components/market/CarteDeSeanceClose.tsx");
    for (const k of ["Annoncé / soumissions", "Servi / couverture", "Soumissionnaires / SVT du réseau", "Rendement actuariel", "Prix moyen pondéré", "Taux limite", "Coupon", "Échéance"]) expect(c, `« ${k} » a disparu`).toMatch(new RegExp(`"${k}"`));
    expect(c, "la carte close porte un geste d'ordre").not.toMatch(/Passer un ordre|Déclarer|Souscrire|BoutonsDeLaCarte/);
    expect(c, "la carte close porte une sélection du desk").not.toMatch(/featured|Sélection du desk/);
    expect(c).toMatch(/<BoutonsDeSeanceClose href=\{e\.href\} \/>/);
  });
  it("la liste du Marché lit la même carte, en tuiles pleine largeur, sans panneau", () => {
    const m = code("src/app/marche/adjudications/page.tsx");
    expect(code("src/components/market/ListeDesSeancesCloses.tsx")).toMatch(/<CarteDeSeanceClose key=/);
    expect(m, "le panneau qui rétrécissait les rangées est revenu").not.toMatch(/className="panel" id="seances"/);
  });
  it("toutes les obligations portent leur coupon dans le nom, et tous les bons et obligations un chiffre comparable", () => {
    const c = code("src/components/market/CarteDeSeanceClose.tsx");
    expect(c, "le coupon n'est plus dans le nom d'une obligation").toMatch(/`OTA\$\{coupon != null \? ` \$\{fmtPct\(coupon, 2\)\}` : ""\} · \$\{t\(r\.tenor\)\}`/);
    expect(c, "une obligation n'affiche plus son rendement actuariel").toMatch(/servi && r\.rendement != null\) \[chiffre, legende\] = \[fmtPct\(r\.rendement, 2\), "rendement actuariel"\]/);
    expect(c, "un bon ne dit plus son taux moyen pondéré").toMatch(/servi && bon\) \[chiffre, legende\] = \[fmtPct\(moyen as number, 2\), "taux moyen pondéré"\]/);
    expect(c, "le coupon n'est plus dit dans les détails").toMatch(/faits\.push\(\["Coupon"/);
  });
  it("toute la carte close s'ouvre et se referme, sans doubler le geste du chevron ni des liens", () => {
    const c = code("src/components/market/CarteDeSeanceClose.tsx");
    expect(c).toMatch(/onClick=\{\(ev\) => \{\s*if \(!\(ev\.target as HTMLElement\)\.closest\("button, a"\)\) basculer\(\);/);
  });
  it("le client lit le coupon, l'échéance et le rendement d'une séance, par la projection", () => {
    const a = code("src/lib/market/adjudications-client.ts");
    expect(a).toMatch(/"couponRate",/);
    expect(a).toMatch(/s\.rendementOrigine = y\.origin/);
  });
  it("le « i » d'une séance close dit le calcul du rendement et ce qu'il faut pour lire la carte, sur le chiffre et sur la ligne des détails", () => {
    const c = code("src/components/market/CarteDeSeanceClose.tsx");
    expect(c, "les termes du « i » ont changé").toMatch(/TERMES: TermKey\[\] = \["rendement_de_seance", "taux_moyen_pondere", "taux_limite", "couverture", "svt"\]/);
    expect((c.match(/<Info termes=\{TERMES\}/g) ?? []).length, "le « i » doit paraître près du chiffre et près du rendement des détails").toBe(2);
    expect(c, "la note du bas redit le calcul au lieu du « i »").not.toMatch(/calcul/i);
    expect(c, "l'échéance perd son année").toMatch(/faits\.push\(\["Échéance", fmtDate\(echeance\)\]\)/);
    const g = code("src/lib/glossary.ts");
    for (const k of ["rendement_de_seance", "taux_moyen_pondere", "taux_limite", "couverture"]) expect(g, `le terme ${k} a disparu`).toMatch(new RegExp(`\\n  ${k}: \\{`));
  });
});
