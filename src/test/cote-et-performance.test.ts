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
    expect(b, "la bande ne filtre plus").toMatch(/<SectionChips[\s\S]*?\bfiltrant\b/);
    expect(b, "« Actions » n'est plus la première pastille").toMatch(/\["actions", "etats", "regionales", "entreprises", "souscription"\]/);
    expect(b, "le sélecteur d'instruments a quitté les adjudications : les trois pages n'ont plus la même forme").not.toMatch(/\{!adj && \(\s*<SectionChips/);
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
    expect(p, "les pastilles n'ont plus le drapeau du pays").toMatch(/<Drapeau pays=\{x\.pays\}/);
    expect(lire("src/components/LineIdentity.tsx"), "le code de pays de chaque ligne n'a plus son drapeau").toMatch(/<Drapeau pays=\{o\.country\}/);
    expect(p, "le code du pays n'est plus écrit : la teinte porterait seule").toMatch(/COUNTRY_CODE\[x\.pays\]/);
    expect(p, "la pastille choisie ne se retouche plus pour tout rendre").toMatch(/ici && selected\.size === 1 \? undefined : x\.pays/);
  });

  it("chaque pastille de section porte l'icône de son émetteur", () => {
    expect(lire("src/components/GrilleDInstruments.tsx"), "les tuiles n'ont plus leur icône").toMatch(/<IconeDeSection section=\{x\.icone\}/);
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

describe("retouches du 4 novembre 2026 sur les titres", () => {
  it("la page Titres n'écrit plus « Obligations, bons du Trésor et actions de la zone CEMAC »", () => {
    expect(lire("src/components/MarketToggles.tsx"), "la phrase de sous-titre est revenue sur la page Titres").not.toContain("Obligations, bons du Trésor et actions de la zone CEMAC");
  });

  it("le nuage « Rendement et durée » est caché sur la section Actions, qui n'a ni rendement à l'échéance ni durée", () => {
    const b = lire("src/components/OfferBrowser.tsx");
    expect(b, "le nuage « Rendement et durée » paraît de nouveau sur les actions").toMatch(/lieu === "cote" && sectionChoisie !== "actions" && \(\s*<BandeauRepliable/);
  });
});

describe("choix de la planche du 4 novembre 2026 : Affichage, grille, drapeaux, graphes", () => {
  it("le doigt suit le tracé librement : les graphes à lecture au toucher réclament le geste", () => {
    const css = lire("src/components/charts/tracker.module.css");
    expect(css, "les tracés laissent de nouveau le navigateur prendre le geste vertical : le surlignement s'arrête dès que le doigt dérive").toMatch(/svg\.track \{\s*touch-action: none;/);
    expect(lire("src/components/IndexChart.tsx"), "le tracé de l'indice n'a plus la classe du suivi").toMatch(/\$\{styles\.svg\} \$\{trackStyles\.track\}/);
  });

  it("« Affichage » : une fenêtre centrée avec trier, grouper, la vue, la densité et « Tout effacer », la même sur Titres et Fonds", () => {
    const a = lire("src/components/Affichage.tsx");
    expect(a, "la fenêtre d'affichage n'est plus centrée").toMatch(/<Sheet[\s\S]*?\bcentre\b/);
    for (const k of ["tri", "groupe", "vue", "densite"]) expect(a, `« ${k} » a quitté la fenêtre d'affichage`).toMatch(new RegExp(`\\b${k}\\b`));
    expect(a, "« Tout effacer » a quitté le pied de la fenêtre").toMatch(/onClick=\{onReset\} disabled=\{!aEffacer\}/);
    expect(lire("src/components/mobile/Sheet.module.css"), "la variante centrée ne l'emporte plus sur la feuille du téléphone").toMatch(/\.sheet\.centre \{[^}]*top: 50%/);
    for (const f of ["src/components/OfferBrowser.tsx", "src/app/fonds/FundsBrowser.tsx"]) expect(lire(f), `${f} n'a plus le bouton « Affichage »`).toMatch(/<Affichage\b/);
  });

  it("le sélecteur d'instruments est la même grille de trois colonnes sur Titres, Fonds et Adjudications, sans nombre sur la tuile", () => {
    const g = lire("src/components/GrilleDInstruments.tsx");
    expect(g, "la tuile écrit de nouveau un nombre de lignes").not.toMatch(/<b>\{/);
    expect(g, "la tuile n'a plus son nom accessible, qui porte le nombre").toMatch(/aria-label=\{x\.accessible\}/);
    expect(lire("src/components/SectionChips.tsx"), "Titres et Adjudications ne passent plus par la grille").toMatch(/<GrilleDInstruments/);
    expect(lire("src/app/fonds/FundsBrowser.tsx"), "Fonds ne passe plus par la grille").toMatch(/<GrilleDInstruments\s+etiquette="Catégorie"/);
    expect(lire("src/components/GrilleDInstruments.module.css"), "la grille n'a plus ses colonnes (trois par défaut)").toMatch(/repeat\(var\(--colonnes, 3\), minmax\(0, 1fr\)\)/);
    expect(g, "quatre tuiles ou moins ne tiennent plus sur une seule rangée").toMatch(/items\.length <= 4 \? Math\.max\(items\.length, 1\) : 3/);
  });

  it("les trois cartes du haut de Trade sont le titre : le grand titre est masqué sur Titres, Fonds et Adjudications", () => {
    for (const f of ["src/components/MarketToggles.tsx", "src/app/fonds/FondsBody.tsx", "src/app/calendrier/page.tsx"]) expect(lire(f), `${f} réécrit le grand titre sous les cartes`).toMatch(/<EnTete [^>]*titreMasque /);
    const o = lire("src/components/market/OngletsMarche.tsx");
    expect(o, "les cartes n'ont plus leur sous-titre").toMatch(/<small>\{t\(p\.tuile\)\}<\/small>/);
    expect(o, "les cartes n'ont plus leur icône").toMatch(/<svg viewBox="0 0 24 24" aria-hidden="true"/);
  });

  it("Retour ne rejoue ni les fiches balayées ni les familles visitées, et le « i » est dans la barre du haut", () => {
    expect(lire("src/components/mobile/SwipePager.tsx"), "le glissement entre fiches empile de nouveau l'historique").toMatch(/router\.replace\(target\)/);
    expect(lire("src/components/mobile/SwipePager.tsx"), "le glissement entre fiches empile de nouveau l'historique").not.toMatch(/router\.push\(target\)/);
    expect(lire("src/components/market/OngletsMarche.tsx"), "changer de famille empile de nouveau l'historique").toMatch(/<Link key=\{p\.key\} href=\{p\.href\} replace /);
    const b = lire("src/components/mobile/BarreDuHaut.tsx");
    expect(b, "le « i » a quitté la barre du haut").toMatch(/\{BRIEF_DE_LA_PAGE\[chemin\] && <EnBrefInstruments page=\{BRIEF_DE_LA_PAGE\[chemin\]\} className=\{styles\.ic\} \/>\}/);
    expect(b, "une des trois pages n'a plus son brief dans la barre").toMatch(/"\/titres": "titres", "\/fonds": "fonds", "\/calendrier": "adjudications"/);
  });

  it("le « i » ouvre une seule feuille à trois onglets, avec le tableau en un coup d'œil, et sans lien vers une page", () => {
    const e = lire("src/components/EnBrefInstruments.tsx");
    expect(e, "les trois onglets ne sont plus dans la feuille").toMatch(/tabs=\{ordre\.map\(/);
    expect(e, "la feuille ne s'ouvre plus sur l'onglet de la page courante").toMatch(/setOnglet\(page\);/);
    expect(e, "le tableau « en un coup d'œil » a disparu").toMatch(/aria-label=\{t\("En un coup d'œil"\)\}/);
    for (const k of ["Prix", "Délai", "Rendement"]) expect(e, `la ligne « ${k} » a disparu du tableau`).toMatch(new RegExp(`quoi: "${k}"`));
    expect(e.replace(/\/\*[\s\S]*?\*\//g, ""), "un onglet mène à une page : il ne devait que lire (choix 2A)").not.toMatch(/<Link\b|href=|router\./);
    for (const f of ["src/components/MarketToggles.tsx", "src/app/fonds/FondsBody.tsx", "src/app/calendrier/page.tsx"]) expect(lire(f), `${f} ouvre de nouveau un « en bref » à une seule page`).toMatch(/<EnBrefInstruments page="/);
  });

  it("chaque Trésor a son drapeau dessiné, et il est sur chaque ligne et sur chaque pastille de pays", () => {
    const d = lire("src/components/Drapeau.tsx");
    for (const p of ["Cameroun", "Gabon", "Congo", "Tchad", "RCA", "Guinée éq."]) expect(d, `le drapeau « ${p} » n'est plus dessiné`).toContain(`case "${p}":`);
    expect(d, "le drapeau n'est plus décoratif : il porterait seul le pays").toMatch(/aria-hidden="true"/);
    expect(lire("src/components/LineIdentity.tsx")).toMatch(/<Drapeau pays=\{o\.country\}/);
  });

  it("les cartes d'actions portent le graphe : à droite du chiffre en avant, au milieu de la tuile compacte, avec « Div. » et « FCFA » réduit", () => {
    const c = lire("src/components/OfferCard.tsx");
    expect(c, "le graphe de la carte complète a quitté le chiffre en avant").toMatch(/<span className=\{styles\.courbe\}>\s*<MiniCourbe serie=\{courbe\.serie\} \/>/);
    const compact = c.slice(c.indexOf("{compact ? ("), c.indexOf(") : (", c.indexOf("{compact ? (")));
    expect(compact.indexOf("<MiniCourbe"), "le graphe n'est plus au milieu de la tuile compacte").toBeGreaterThan(compact.indexOf("styles.cId"));
    expect(compact.indexOf("<MiniCourbe"), "le graphe n'est plus avant le chiffre").toBeLessThan(compact.indexOf("styles.cNum"));
    expect(compact, "« Dividende » n'est plus abrégé en « Div. »").toMatch(/<Montant etiquette=\{t\("Div\."\)\}/);
    expect(compact, "le cours n'a plus son « FCFA » réduit").toMatch(/<Montant etiquette=\{t\("cours"\)\}/);
    expect(c, "le « FCFA » n'est plus réduit").toMatch(/<i className=\{styles\.fcfa\}>FCFA<\/i>/);
    expect(lire("src/app/TitresBody.tsx"), "les graphes ne sont plus lus en une seule requête pour toute la cote").toMatch(/performanceSur\(\)/);
  });
});

