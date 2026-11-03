import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

/**
 * LA COTE ALLÉGÉE, LA PERFORMANCE SUR TROIS MOIS, LE NUAGE LISIBLE (3 novembre 2026).
 *
 * Choix du dirigeant sur la planche : 1A, 2A, 3A, 4 (A et B), 5 (A et B), plus des icônes d'émetteur sur les pastilles
 * de la cote et des pastilles à la couleur des pays pour les États.
 */
describe("la cote : une section à la fois, « Actions » d'abord", () => {
  const b = lire("src/components/OfferBrowser.tsx");

  it("ouvre sur « Actions », sauf recherche ou filtre actif, et « Tout » rend les cinq sections", () => {
    expect(b, "la cote n'ouvre plus sur « Actions »").toMatch(/lieu === "cote" && filterCount0 === 0 && !sp\.get\("q"\)[\s\S]*?\? \("actions" as Section\) : undefined/);
    expect(b, "« Tout » n'est plus exprimé dans l'adresse").toMatch(/sectionParam === "tout" \? undefined/);
    expect(b, "« Tout » ne s'écrit plus dans l'adresse en sortant d'une section").toMatch(/section: k \?\? \(lieu === "cote" \? "tout" : undefined\)/);
  });

  it("la bande des sections filtre sur la cote, « Actions » est la première pastille, et rien ne s'ajoute aux adjudications", () => {
    expect(b, "la bande ne filtre plus sur la cote").toMatch(/filtrant=\{lieu === "cote"\}/);
    expect(b, "« Actions » n'est plus la première pastille").toMatch(/\["actions", "etats", "regionales", "entreprises", "souscription"\]/);
    expect(b, "la bande est revenue sur les adjudications").toMatch(/\{!adj && \(\s*<SectionChips/);
    expect(b, "quand une section est choisie, la cote repasse par les blocs de tous les groupes").toMatch(/sommaire && !featured && !sansGroupe && !sectionChoisie \? \(/);
  });

  it("abrège une section à huit lignes, avec « Voir les N lignes », sauf recherche ou filtre", () => {
    expect(b, "le nombre de lignes montrées n'est plus huit").toMatch(/const LIGNES_VISIBLES = 8;/);
    expect(b, "la section ne s'abrège plus").toMatch(/list\.slice\(0, LIGNES_VISIBLES\)/);
    expect(b, "une recherche ou un filtre abrège de nouveau : on cherche dans tout").toMatch(/const abrege = lieu === "cote" && Boolean\(sectionChoisie\) && !q && filterCount === 0 && deployee !== sectionChoisie;/);
    expect(b, "« Voir les N lignes » a disparu").toMatch(/t\("Voir les \{n\} lignes", \{ n: list\.length \}\)/);
  });

  it("montre les pastilles des Trésors, à leur couleur, sur la section des États seulement", () => {
    expect(b, "les pastilles de pays ne paraissent plus sur les États").toMatch(/lieu === "cote" && sectionChoisie === "etats" && <PastillesPays/);
    const p = lire("src/components/PastillesPays.tsx");
    expect(p, "les pastilles n'ont plus la couleur du pays").toMatch(/background: COUNTRY_COLOR\[x\.pays\]/);
    expect(p, "le code du pays n'est plus écrit : la teinte porterait seule").toMatch(/COUNTRY_CODE\[x\.pays\]/);
    expect(p, "la pastille choisie ne se retouche plus pour tout rendre").toMatch(/ici && selected\.size === 1 \? undefined : x\.pays/);
  });

  it("chaque pastille de section porte l'icône de son émetteur", () => {
    expect(lire("src/components/SectionChips.tsx"), "les pastilles n'ont plus leur icône").toMatch(/<IconeDeSection section=\{s\} \/>/);
    const i = lire("src/components/IconeDeSection.tsx");
    for (const s of ["etats", "regionales", "entreprises", "actions", "souscription"]) expect(i, `la section « ${s} » n'a pas d'icône`).toMatch(new RegExp(`\\n  ${s}: "M`));
  });
});

describe("ce qui performe : trois mois, un graphe par ligne", () => {
  it("la page des sociétés lit la même fenêtre : rangées-liens sur téléphone avec le graphe au milieu, colonne « 3 mois » sur écran large", () => {
    const body = lire("src/app/societes/SocietesBody.tsx");
    expect(body, "la page des sociétés ne lit plus la fenêtre de « Ce qui performe »").toMatch(/performanceSur\(\)/);
    const nav = lire("src/app/societes/CompaniesBrowser.tsx");
    expect(nav, "les rangées de téléphone ont disparu").toMatch(/<ul className=\{styles\.rangees\}>/);
    const rang = nav.slice(nav.indexOf("<Link className={styles.rang}"), nav.indexOf("</Link>", nav.indexOf("<Link className={styles.rang}")));
    expect(rang.indexOf("<MiniCourbe"), "le graphe n'est plus au milieu de la rangée, entre le nom et le cours").toBeGreaterThan(rang.indexOf("styles.qui"));
    expect(rang.indexOf("<MiniCourbe"), "le graphe n'est plus avant le cours").toBeLessThan(rang.indexOf("styles.px"));
    expect(nav, "la colonne « 3 mois » du tableau a disparu").toMatch(/th\("m3", t\("3 mois"\)\)/);
    const css = lire("src/app/societes/page.module.css");
    expect(css, "le tableau n'est plus masqué sur téléphone").toMatch(/\.large \{\s*display: none;/);
  });

  it("le petit graphe est un composant sans état, teinté par le signe, avec le cours de départ en pointillé", () => {
    const m = lire("src/components/MiniCourbe.tsx");
    expect(m, "le graphe n'est plus teinté par le signe").toMatch(/fin > serie\[0\] \? styles\.hausse : fin < serie\[0\] \? styles\.baisse : styles\.stable/);
    expect(m, "le cours de départ n'est plus en pointillé").toMatch(/className=\{styles\.depart\}/);
    expect(m, "le graphe est devenu client").not.toMatch(/"use client"/);
  });
});

describe("le nuage : une teinte par année, des barres de survol, une fiche", () => {
  const g = lire("src/app/sondage/CourbeDesSeances.tsx");
  const nuage = g.slice(g.indexOf("function Nuage"));

  it("n'écrit plus les années sur les points : elles se lisent à la teinte et à la légende", () => {
    expect(nuage, "les étiquettes d'année sont revenues sur les points").not.toMatch(/etiquette\(p\)/);
    expect(nuage, "la teinte par année a disparu").toMatch(/const teinte = \(a: string\) =>/);
    expect(nuage, "la légende des années a disparu").toMatch(/className=\{styles\.legendeAnnees\}/);
  });

  it("trace deux barres jusqu'aux axes pour le point choisi, et ouvre sa fiche", () => {
    expect(nuage.match(/className=\{styles\.guide\}/g)?.length, "les deux barres de survol ne sont plus tracées").toBe(2);
    expect(nuage, "la fiche de la séance a disparu").toMatch(/className=\{styles\.fiche\}/);
    expect(nuage, "le survol ne choisit plus le point").toMatch(/onPointerEnter=\{\(\) => setChoisi\(p\.id\)\}/);
    expect(nuage, "le clavier n'atteint plus les points").toMatch(/tabIndex=\{0\}[\s\S]*onFocus=\{\(\) => setChoisi\(p\.id\)\}/);
  });

  it("ouvre sur la séance la plus récente, pour que le nuage ne s'ouvre pas sans lecture", () => {
    expect(nuage, "le nuage ne s'ouvre plus sur la dernière séance").toMatch(/useState<string>\(points\[points\.length - 1\]\?\.id \?\? ""\)/);
  });
});
