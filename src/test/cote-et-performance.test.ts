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
    expect(b, "« Voir toutes les lignes » a disparu").toMatch(/t\("Voir toutes les lignes"\)/);
    expect(b, "le bouton écrit de nouveau un nombre de lignes").not.toMatch(/t\("Voir les \{n\} lignes"/);
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
    expect(g, "six tuiles ou moins ne tiennent plus sur une seule rangée").toMatch(/items\.length <= 6 \? Math\.max\(items\.length, 1\) : 3/);
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
    expect(b, "le « i » a quitté la barre du haut").toMatch(/\{BRIEF_DE_LA_PAGE\[chemin\] && <EnBrefInstruments page=\{BRIEF_DE_LA_PAGE\[chemin\]\} className=\{`\$\{styles\.ic\} \$\{styles\.info\}`\} \/>\}/);
    expect(b, "une des trois pages n'a plus son brief dans la barre").toMatch(/"\/titres": "titres", "\/fonds": "fonds", "\/calendrier": "adjudications"/);
  });

  it("le « i » ouvre une seule feuille à trois onglets, avec le tableau en un coup d'œil, et sans lien vers une page", () => {
    const e = lire("src/components/EnBrefInstruments.tsx");
    expect(e, "les trois onglets ne sont plus dans la feuille").toMatch(/tabs=\{ordre\.map\(/);
    expect(e, "la feuille ne s'ouvre plus sur l'onglet de la page courante").toMatch(/setOnglet\(page\);/);
    expect(e, "le tableau « en un coup d'œil » a disparu").toMatch(/aria-label=\{t\("En un coup d'œil"\)\}/);
    for (const k of ["Prix", "Délai", "Rendement"]) expect(e, `la ligne « ${k} » a disparu du tableau`).toMatch(new RegExp(`quoi: "${k}"`));
    /* Les onglets ne mènent nulle part pour changer de page (choix 2A). Un seul lien existe, depuis le 6 novembre 2026 : « Risques et limites », demandé pour l'onglet Titres. */
    const code = e.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(code, "un onglet change de page : il ne devait que lire (choix 2A)").not.toMatch(/router\./);
    expect([...code.matchAll(/<Link\b[^>]*href="([^"]+)"/g)].map((m) => m[1]), "la feuille a un lien de trop (ou plus celui des risques)").toEqual(["/info/risques#risques"]);
    for (const f of ["src/components/MarketToggles.tsx", "src/app/fonds/FondsBody.tsx", "src/app/calendrier/page.tsx"]) expect(lire(f), `${f} ouvre de nouveau un « en bref » à une seule page`).toMatch(/<EnBrefInstruments page="/);
  });

  it("retouches du 5 novembre 2026 : aucun compte de lignes, flèche partout, une seule fenêtre Affichage, filtre centré", () => {
    const ob = lire("src/components/OfferBrowser.tsx");
    const sc = lire("src/components/SectionChips.tsx");
    const fb = lire("src/app/fonds/FundsBrowser.tsx");
    // 6 · aucun nombre de lignes
    expect(sc, "une tuile dit de nouveau son nombre de lignes").not.toMatch(/\{n\} lignes|1 ligne/);
    expect(lire("src/components/PastillesPays.tsx"), "une pastille de pays écrit de nouveau son nombre").not.toMatch(/<b>\{x\.n\}<\/b>/);
    expect(ob, "le nuage dit de nouveau « sous 100 % » avec un nombre").not.toMatch(/resumeNuage\.decotees/);
    expect(ob, "le nuage dit de nouveau son nombre de lignes").not.toMatch(/resumeNuage\.n\}<\/b>/);
    expect(lire("src/components/market/TeteGroupe.tsx"), "le sommaire d'un groupe écrit de nouveau un nombre").not.toMatch(/\{g\.n\}/);
    expect(fb, "la bande des fonds dit de nouveau « N fonds mesurables »").not.toMatch(/fonds mesurables/);
    // 13 · pas de tuile Rachats sans rachat
    expect(sc, "la tuile Rachats reparaît sans ligne").toMatch(/s !== "rachats" \|\| \(counts\[s\] \?\? 0\) > 0/);
    // 5 · le texte du bas de la page des adjudications est parti
    expect(lire("src/app/calendrier/page.tsx"), "le texte du bas des adjudications est revenu").not.toMatch(/styles\.note/);
    // 3 · une seule fenêtre Affichage
    const af = lire("src/components/Affichage.tsx");
    expect(af, "« Affichage » rouvre une seconde fenêtre pour les cartes").not.toMatch(/CardDisplaySheet/);
    expect(af, "la distinction entre les cartes a quitté la fenêtre Affichage").toMatch(/<DistinctionChoix \/>/);
    // 9 et 11 · filtre centré, et sur Fonds aussi
    expect(ob, "la fenêtre Filtrer de Titres n'est plus centrée").toMatch(/title=\{t\(trie \? "Filtrer et trier" : "Filtrer"\)\} centre>/);
    expect(fb, "Fonds n'a plus son bouton Filtrer").toMatch(/className=\{styles\.filtrer\}/);
    // 2 · plier / déplier tout, sur les trois pages
    expect(ob, "Titres et Adjudications n'ont plus le chevron plier/déplier tout").toMatch(/<FoldAll group=\{repli\.group\}/);
    expect(fb, "Fonds n'a plus le chevron plier/déplier tout").toMatch(/<FoldAll group="blocs"/);
    expect(lire("src/components/market/TeteGroupe.tsx"), "un groupe ne se replie plus").toMatch(/onClick=\{onBascule\}/);
    // 4 · drapeaux
    expect(ob, "l'en-tête d'un groupe d'émetteur n'a plus son drapeau").toMatch(/<Drapeau pays=\{g\.zone\}/);
    expect(fb, "un drapeau est revenu sur les fonds (retiré le 6 novembre 2026)").not.toMatch(/<Drapeau/);
    expect(lire("src/components/market/TeteGroupe.tsx"), "le titre d'un groupe n'a plus le drapeau de son émetteur").toMatch(/<Drapeau pays=\{pays\}/);
    // 1 · même hauteur que la pastille de famille
    const g = lire("src/app/globals.css");
    expect(g, "la pastille de pays n'a plus la hauteur de la pastille de famille").toMatch(/\.cc \{[^}]*min-height: 19px/);
    expect(g, "la pastille de famille n'a plus la hauteur de celle du pays").toMatch(/\.fam \{[^}]*min-height: 19px/);
    // 7 · le pays choisi se lit sur sa pastille, pas dans une puce dessous
    expect(ob, "une puce « pays » reparaît sous les pastilles des États").toMatch(/c\.key === "pays" && lieu === "cote" && sectionChoisie === "etats"/);
    expect(lire("src/components/PastillesPays.module.css"), "le pays choisi n'est plus en fond plein").toMatch(/\.rangee button\.on \{[^}]*background: var\(--fill\)/);
    // 10 · la rangée d'icônes de Fonds commence à la même hauteur que celle de Titres
    expect(lire("src/app/fonds/page.module.css"), "la rangée d'icônes de Fonds a repris une marge en haut").toMatch(/\.tools \{[^}]*padding: 0 var\(--marge-page\) 0;/);
  });

  it("la tuile compacte porte le drapeau, le dos des cartes porte l'icône de retournement, et les tuiles tiennent sur une rangée", () => {
    const oc = lire("src/components/OfferCard.tsx");
    expect(oc, "la ligne compacte n'a plus le drapeau de son pays").toMatch(/<b className=\{styles\.cCode\}>\{issuerZone\(o\) !== "CEMAC" && <Drapeau pays=\{o\.country\}/);
    expect(oc, "le dos d'une carte n'a plus son icône de retournement sous le « ··· »").toMatch(/<\/button>\s*\{\/\*[^*]*\*\/\}\s*<button type="button" className=\{styles\.flipBtn\} onClick=\{\(\) => turn\.current\?\.\(\)\}/);
    const fc = lire("src/app/fonds/FundCard.tsx");
    expect(fc, "le dos d'un fonds n'a plus son icône de retournement").toMatch(/className=\{styles\.flipBtn\} onClick=\{\(\) => turn\.current\?\.\(\)\}/);
    expect(fc, "un drapeau est revenu sur la carte d'un fonds (retiré le 6 novembre 2026)").not.toMatch(/<Drapeau/);
  });

  it("le bouton Filtrer est blanc sans filtre et doré avec (Titres, Adjudications, Fonds)", () => {
    expect(lire("src/components/OfferBrowser.tsx"), "le bouton Filtrer de Titres n'annonce plus s'il y a un filtre").toMatch(/className=\{styles\.sheetBtn\} data-actif=\{filterCount > 0 \? "oui" : undefined\}/);
    expect(lire("src/app/fonds/FundsBrowser.tsx"), "le bouton Filtrer de Fonds n'annonce plus s'il y a un filtre").toMatch(/className=\{styles\.filtrer\} data-actif=\{manager \|\| depositary \? "oui" : undefined\}/);
    const oc = lire("src/components/OfferBrowser.module.css");
    expect(oc, "le bouton Filtrer de Titres est de nouveau doré sans filtre").not.toMatch(/\.sheetBtn \{[^}]*background: var\(--gold-soft\)/);
    expect(oc, "le bouton Filtrer de Titres ne se dore plus avec un filtre").toMatch(/\.sheetBtn\[data-actif="oui"\] \{[^}]*background: var\(--gold-soft\)/);
    const fc = lire("src/app/fonds/page.module.css");
    expect(fc, "le bouton Filtrer de Fonds est de nouveau doré sans filtre").not.toMatch(/\.filtrer \{[^}]*background: var\(--gold-soft\)/);
    expect(fc, "le bouton Filtrer de Fonds ne se dore plus avec un filtre").toMatch(/\.filtrer\[data-actif="oui"\] \{[^}]*background: var\(--gold-soft\)/);
  });

  it("suivi partagé, retournement du dos, hauteur naturelle, cases moins arrondies, densité visible, pas d'acheteur / vendeur vide", () => {
    const sw = lire("src/components/mobile/SwipeActions.tsx");
    const lm = lire("src/components/mobile/LineMenu.tsx");
    expect(sw, "le glissement n'a plus l'état de suivi partagé").toMatch(/const \[on, setOn\] = useSuivi\(id, suivi\)/);
    expect(lm, "le menu « ··· » n'a plus l'état de suivi partagé").toMatch(/const \[on, setOn\] = useSuivi\(line\.id, watching\)/);
    expect(lm, "le menu « ··· » n'envoie plus la cadence du suivi").toMatch(/toggleWatch\(line\.id, next, cadence\)/);
    expect(lire("src/components/OfferCard.tsx"), "la cloche ne lit plus l'état partagé").toMatch(/const \[suiviEtat\] = useSuivi\(o\.id, suivi\)/);
    expect(sw, "le bouton du dos ne ramène plus à la face").toMatch(/if \(st\.angle > 0\) \{\s*close\(\);\s*return;/);
    expect(sw, "la face avant garde de nouveau une hauteur figée en pixels").toMatch(/el\.style\.height = turned && h \? `\$\{h\}px` : "";/);
    expect(lire("src/components/mobile/SwipeActions.module.css"), "le dos est de nouveau étiré à la hauteur de la face").not.toMatch(/\.back \{[^}]*inset: 0;/);
    expect(lire("src/components/OfferCard.tsx"), "changer de densité ne remet plus la carte à zéro").toMatch(/key="pleine"[\s\S]*key="compacte"/);
    expect(lire("src/components/Affichage.module.css"), "les cases d'Affichage sont de nouveau en pilule").not.toMatch(/border-radius: 999px/);
    expect(lire("src/components/Density.module.css"), "les cases de distinction sont de nouveau en pilule").not.toMatch(/\.chip \{[^}]*border-radius: 999px/);
    expect(lire("src/components/OfferBrowser.module.css"), "les cases du filtre sont de nouveau en pilule").not.toMatch(/\.chipBtn \{[^}]*border-radius: 999px/);
    expect(lire("src/components/Density.tsx"), "le choix de densité n'a plus ses deux grosses cases").toMatch(/className=\{styles\.densChoix\}/);
    expect(lire("src/lib/domain/summary.ts"), "la case « Acheteur / vendeur » est revenue sur la face d'une action").not.toMatch(/\["Acheteur \/ vendeur"/);
  });

  it("série du 6 novembre 2026 : dos = carte détaillée en compact, pas de dos en détaillé, suivi lu du serveur, sans drapeau sur les fonds", () => {
    const oc = lire("src/components/OfferCard.tsx");
    // vue détaillée : une SwipeActions sans dos, donc ni chevron à gauche ni icône de retournement
    const pleine = oc.slice(oc.indexOf('key="pleine"'), oc.indexOf("</SwipeActions>", oc.indexOf('key="pleine"')));
    expect(pleine, "la vue détaillée a de nouveau un dos").not.toMatch(/back=|backHead=|turnRef=/);
    expect(oc.slice(0, oc.indexOf('key="compacte"')), "la carte détaillée porte de nouveau un bouton de retournement").not.toMatch(/styles\.flipBtn[^}]*>\s*<Turn/);
    // vue compacte : le dos EST la carte détaillée
    expect(oc, "le dos d'une carte compacte n'est plus la carte détaillée").toMatch(/back=\{<div className=\{styles\.dos\}>\{corps\(true\)\}<\/div>\}/);
    expect(oc, "l'ancien dos chiffré est revenu").not.toMatch(/CardBack|backFacts/);
    // suivi : le serveur sert de départ à tout menu et à tout glissement
    const su = lire("src/lib/ui/suivi.ts");
    expect(su, "le suivi ne lit plus les lignes suivies du serveur").toMatch(/departExplicite \?\? Boolean\(serveur\?\.has\(id\)\)/);
    expect(lire("src/components/OfferBrowser.tsx"), "la liste ne pose plus les suivis du serveur").toMatch(/<SuivisContext\.Provider value=\{armees\}>/);
    expect(lire("src/app/fonds/FundsBrowser.tsx"), "les fonds ne posent plus les suivis du serveur").toMatch(/<SuivisContext\.Provider value=\{armees\}>/);
    expect(lire("src/app/fonds/FondsBody.tsx"), "les fonds suivis ne sont plus lus").toMatch(/listWatches\(session\.userId\)/);
    // bulle : la même pour le menu et le glissement
    const t = lire("src/components/mobile/LineMenu.module.css");
    expect(t, "la bulle du menu n'est plus celle du glissement").toMatch(/\.toast \{[^}]*background: var\(--gold-soft\)/);
    // fenêtre centrée : se ferme d'un geste vers le bas
    expect(lire("src/components/mobile/Sheet.tsx"), "la fenêtre centrée ne se ferme plus au geste").toMatch(/centre \? `translate\(-50%, calc\(-50% \+ \$\{drag\.current\.dy\}px\)\)`/);
    expect(lire("src/components/mobile/Sheet.tsx"), "la fenêtre centrée ignore de nouveau le geste").not.toMatch(/if \(centre\) return;/);
  });

  it("série du 6 novembre 2026 : recherche, tuiles, « i », contact", () => {
    expect(lire("src/components/OfferBrowser.tsx"), "le champ de Titres n'écrit plus « Recherche »").toMatch(/placeholder=\{t\("Recherche"\)\}/);
    const fb = lire("src/app/fonds/FundsBrowser.tsx");
    expect(fb, "le champ de Fonds n'écrit plus « Recherche »").toMatch(/placeholder=\{t\("Recherche"\)\}/);
    expect(fb, "le champ de Fonds a perdu sa loupe").toMatch(/className=\{styles\.loupe\}/);
    expect(lire("src/components/GrilleDInstruments.module.css"), "six tuiles n'ont plus la police réduite ni la grille élargie").toMatch(/\[data-serre="oui"\] \.tuile \{[^}]*font-size: 0\.6rem/);
    expect(lire("src/components/mobile/BarreDuHaut.module.css"), "le « i » n'est plus à part").toMatch(/\.info \{[^}]*color: #8db6ff/);
    const cc = lire("src/app/moi/contact/ConseillerCard.tsx");
    expect(cc, "la phrase WhatsApp est revenue").not.toMatch(/Écrivez sur WhatsApp, appelez/);
    expect(cc, "l'e-mail n'est plus un vrai bouton").toMatch(/<a className="btn" href=\{`mailto:/);
    expect(lire("src/components/mobile/BarreDuHaut.tsx"), "« Nous contacter » a quitté le menu").toMatch(/href="\/moi\/contact"[^>]*>\s*<Trace d=\{ICONE\.contact\}/);
  });

  it("le prix d'une action est en avant avec sa variation sur trois mois, la période écrite ; avertissement et risques ; titre sans « action cotée »", () => {
    const oc = lire("src/components/OfferCard.tsx");
    expect(oc, "la variation n'écrit plus sa période").toMatch(/\{court \? t\("3 mois"\) : t\("sur 3 mois"\)\}/);
    expect(oc, "la carte détaillée d'une action n'a plus le prix en avant").toMatch(/estAction && prix \? \(\s*<div className=\{styles\.bigAction\}>/);
    expect(oc, "la grille d'une action redit de nouveau le cours ou le ticket").toMatch(/const faitsAction = /);
    expect(oc, "la tuile compacte d'une action n'a plus le prix en avant").toMatch(/estAction && prix \? \(\s*<>\s*<b>\s*\{prix\.nombre\}/);
    const css = lire("src/components/OfferCard.module.css");
    expect(css, "le prix d'une action n'est plus à l'encre").toMatch(/\.prix \{[^}]*color: var\(--ink\)/);
    expect(lire("src/lib/domain/carte-compacte.ts"), "le titre porte de nouveau « action cotée »").toMatch(/replace\(\/\\s\*:\\s\*action cotée\\s\*\$\/i, ""\)/);
    expect(lire("src/components/OfferBrowser.tsx"), "le tri par variation a disparu").toMatch(/case "variation":/);
    const i = lire("src/components/EnBrefInstruments.tsx");
    expect(i, "le « i » n'a plus ses risques pour l'onglet Titres").toMatch(/onglet === "titres" && <VariationEtRisques \/>/);
    expect(i, "la liquidité n'est plus nommée dans le « i »").toMatch(/<b>\{t\("Liquidité\."\)\}<\/b>/);
    expect(lire("src/app/TitresBody.tsx"), "la mise en garde a quitté le pied de la page Titres").toMatch(/performances passées, mesurées sur trois mois/);
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
    const d0 = c.indexOf("styles.compact");
    const compact = c.slice(d0, c.indexOf("</article>", d0));
    expect(compact.indexOf("<MiniCourbe"), "le graphe n'est plus au milieu de la tuile compacte").toBeGreaterThan(compact.indexOf("styles.cId"));
    expect(compact.indexOf("<MiniCourbe"), "le graphe n'est plus avant le chiffre").toBeLessThan(compact.indexOf("styles.cNum"));
    expect(compact, "« Dividende » n'est plus abrégé en « Div. »").toMatch(/<Montant etiquette=\{t\("Div\."\)\}/);
    expect(compact, "le cours n'a plus son « FCFA » réduit").toMatch(/<Montant etiquette=\{t\("cours"\)\}/);
    expect(c, "le « FCFA » n'est plus réduit").toMatch(/<i className=\{styles\.fcfa\}>FCFA<\/i>/);
    expect(lire("src/app/TitresBody.tsx"), "les graphes ne sont plus lus en une seule requête pour toute la cote").toMatch(/performanceSur\(\)/);
  });
});

