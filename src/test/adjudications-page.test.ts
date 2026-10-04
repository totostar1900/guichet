import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EN_ALL } from "@/i18n/core";

/**
 * LA PAGE DES ADJUDICATIONS N'EST PAS UNE COTE.
 *
 * Elle empruntait sa liste à la page des titres, et ses commandes avec : une
 * recherche, un tri, trois vues, un groupement en case à cocher, un compte de
 * lignes. Sur trente-cinq lignes cotées cela se tient ; sur huit séances
 * d'emprunt d'État, toutes de la même famille, chacune de ces commandes
 * demande un geste pour un résultat que le regard donne déjà.
 *
 * Ce qui est tenu ici :
 *
 *  1. la page ne porte plus trois listes du même objet — l'annonce, la ligne,
 *     le dépouillement — mais une seule, celle sur laquelle on peut agir ;
 *  2. ce qui est permanent est derrière « En bref », y compris ce que
 *     personne n'avait écrit : le déroulé d'une séance, et le fait que le
 *     prix affiché est une PROPOSITION du desk, sur laquelle le client peut
 *     en dire une autre ;
 *  3. la barre et la feuille ne gardent que ce qui a un sens ici, et la
 *     durée y entre en jauge ;
 *  4. les groupes portent le titre-sommaire des fonds, une seule fois ;
 *  5. une alerte armée se voit sur la carte.
 */
/**
 * LES COMMENTAIRES CITENT CE QUI A ÉTÉ RETIRÉ : on les enlève avant de
 * chercher, sinon l'épreuve se prend elle-même au piège. Quatrième fois dans
 * cette série : le fichier explique pourquoi « À venir » est parti, donc le
 * mot y figure encore, et le test tombait sur sa propre explication.
 */
const sansNotes = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const PAGE = sansNotes(readFileSync("src/app/calendrier/page.tsx", "utf8"));
const BREF = readFileSync("src/app/calendrier/EnBref.tsx", "utf8");
const BROWSER = readFileSync("src/components/OfferBrowser.tsx", "utf8");
const CARTE = readFileSync("src/components/OfferCard.tsx", "utf8");
const CSS = readFileSync("src/app/calendrier/page.module.css", "utf8");

describe("la page des adjudications", () => {
  it("ne tient plus qu'une liste, celle sur laquelle on peut agir", () => {
    /* « À venir » et « Dernières séances annoncées » étaient deux listes
       qu'on ne pouvait que lire, autour de celle qui compte. */
    expect(PAGE, "une liste de communiqués est revenue").not.toMatch(/À venir|Dernières séances annoncées/);
    expect(PAGE, "la page ne montre plus les lignes des séances").toMatch(/<OfferBrowser[\s\S]*lieu="adjudications"/);
    /* LA SOURCE NE DOIT PAS PARTIR AVEC LES BLOCS : chaque séance citait son
       communiqué, et « rien n'y est de nous » ne reste vrai que si la porte
       de la BEAC est ouverte quelque part. */
    expect(BREF, "le lien vers les annonces de la BEAC a disparu avec les blocs retirés").toMatch(/BEAC_ANNONCES/);
  });

  it("dit dans « En bref » ce que le prix veut dire", () => {
    /* À l'adjudication on ne paie pas un cours, on PROPOSE un prix. Celui
       que nous affichons vient du desk ; qui l'ignore croit la ligne à
       prendre ou à laisser. */
    expect(BREF, "la page ne dit plus que le prix vient de nous").toMatch(/Purpose Capital compte présenter à la séance/);
    expect(BREF, "la page ne dit plus que le client peut en proposer un autre").toMatch(/Vous pouvez proposer le vôtre/);
    // Le déroulé : quatre moments, dans l'ordre, chacun traduit.
    const etapes = [...BREF.matchAll(/^\s*\["([^"]+)", "([^"]+)"\],$/gm)].flatMap((m) => [m[1], m[2]]);
    expect(etapes.length, "le déroulé d'une séance a disparu").toBe(8);
    for (const k of etapes) expect(EN_ALL[k], `« ${k.slice(0, 40)}… » : sans anglais`).toBeTruthy();
  });

  it("ne garde dans sa barre et sa feuille que ce qui a un sens ici", () => {
    /* Le compte, la recherche et le tri partent ; la durée arrive. Chacune
       de ces quatre règles est accrochée à « adj », et non retirée pour tout
       le monde : la cote, elle, en a besoin. */
    /* « sommaire » dit « cette liste range ses blocs sous un titre figé » et
       vaut pour la cote comme pour les adjudications ; « adj » ne garde que
       ce qui tient au lieu. Le compte part des deux. */
    expect(BROWSER, "le compte des lignes est revenu").toMatch(/\{!sommaire && \(\s*<span>\s*<b>\{rows\.length\}<\/b>/);
    expect(BROWSER, "la recherche est revenue dans la barre des adjudications").toMatch(/\{!adj && \(\s*<label className=\{styles\.search\}>/);
    expect(BROWSER, "le tri est revenu dans la barre des adjudications").toMatch(/\{!adj && \(\s*<label className=\{styles\.sortSel\}>/);
    expect(BROWSER, "la feuille promet encore un tri qu'elle ne porte pas").toMatch(/title=\{t\(trie \? "Filtrer et trier" : "Filtrer"\)\}/);
    expect(BROWSER, "la durée en jauge a quitté la feuille des adjudications").toMatch(/<DureeGauge values=\{durees\}/);
    /* Les barres de la jauge montrent TOUTES les lignes du lieu : sur les
       lignes filtrées, la jauge se viderait à mesure qu'on s'en sert. */
    expect(BROWSER, "la jauge se dessine sur les lignes déjà filtrées").toMatch(/const durees = useMemo\(\(\) => offers\.map/);
  });

  it("groupe par type ou par émetteur, avec un seul titre par groupe", () => {
    expect(BROWSER, "les deux rangements ont disparu").toMatch(/const GROUPEMENTS: \[string, string\]\[\][\s\S]*?\["type", "Type"\],\s*\["emetteur", "Émetteur"\],/);
    expect(BROWSER, "le choix du rangement a disparu de la barre").toMatch(/<Dropdown label="Grouper" single items=\{GROUPEMENTS\}/);
    /* UNE SECTION VIDE RESTE, AVEC SON ZÉRO : « En souscription 0 » dit
       qu'aucune émission n'est ouverte, ce qu'une section absente ne dit
       pas. Les émetteurs, eux, n'existent que par leurs lignes. */
    expect(BROWSER, "les sections vides ont disparu de la cote").not.toMatch(/groupBySection\(list, lieu\)\s*\.filter/);
    /* LES NOMS COURTS NE VALENT QUE POUR LES ÉMETTEURS : les libellés de
       section sont déjà courts et déjà choisis, et les dégraisser les abîme
       — « Open for subscription » devenait « Open for ». */
    expect(BROWSER, "les libellés de section repassent au dégraissage").toMatch(/const brefs = parEmetteur \? nomsCourts/);
    expect(BROWSER, "les groupes ne portent plus le titre-sommaire des fonds").toMatch(/<TeteGroupe id=\{`sec-\$\{b\.clef\}`\}/);
    /* DEUX TITRES PAR GROUPE : le bloc posait le sien, et « renderUn »
       regroupait à son tour, vingt pixels plus bas. Vu à l'écran. */
    /* QUATRE ENDROITS, et il faut les quatre : la liste, puis les trois du
       rendu en cartes — le découpage, la tête et le corps. En réparer trois
       laisse la tête en double, ce qu'un seul « toMatch » ne voyait pas. */
    expect([...BROWSER.matchAll(/grouped && !featured && !deja/g)].length, "« renderUn » regroupe de nouveau sous un bloc qui a déjà son titre").toBe(4);
    expect(BROWSER, "un regroupement a repris sans tenir compte du bloc qui l'appelle").not.toMatch(/grouped && !featured \?/);
    // La bande des sections ne paraît plus : le titre est le sommaire.
    expect(BROWSER, "la bande des sections est revenue au-dessus des titres").toMatch(/\{!sommaire && <SectionChips/);
  });

  it("met le filtre, le rangement et le resserrement sur une seule ligne", () => {
    /* Trois commandes d'une même famille sur trois lignes : « Filtrer » seule
       en haut, « Grouper » et les densités soixante pixels plus bas. Mesuré
       après : 14, 98 et 240 px, tous à la même ordonnée.
       L'ordre suit celui des décisions — ce qu'on retire, comment on range,
       comment on lit — donc le bouton du filtre vient en premier. */
    /* LA FENÊTRE DOIT ÊTRE LA BONNE : d'abord bornée par un repère qui
       n'existait pas, elle couvrait le fichier entier et trouvait les trois
       commandes n'importe où — trois sabotages sur trois sont passés sans
       la faire tomber. Elle s'arrête maintenant à la rangée des filtres,
       qui suit immédiatement. */
    const ouvre = BROWSER.indexOf("<div className={styles.toolbar}");
    const ferme = BROWSER.indexOf("<div className={styles.filters}", ouvre);
    expect(ouvre, "la barre d'outils est introuvable").toBeGreaterThan(-1);
    expect(ferme, "la rangée des filtres est introuvable : la fenêtre ne borne plus rien").toBeGreaterThan(ouvre);
    const barre = BROWSER.slice(ouvre, ferme);
    /* Les trois repères sont pris AVEC leur condition : « label="Grouper" »
       tout seul reste écrit même derrière un « false && », et le sabotage
       passait. Et « styles.sheetBtn » sans accolade attrape aussi un
       « styles.sheetBtnX » : la borne doit être close. */
    const filtre = barre.indexOf("className={styles.sheetBtn}");
    const grouper = barre.indexOf('{sommaire && (\n            <Dropdown label="Grouper"');
    const densite = barre.indexOf('{sommaire && view === "cards" && !desk && <DensitySwitch />}');
    /* TOUT EFFACER FERME LA LIGNE : il défait ce qu'elle pose, donc il vient
       après. À 412 px les quatre ne tiennent pas ensemble — mesuré, le
       quatrième allait de 373 à 431 — et la rangée se casse plutôt que de
       déborder : les trois que le lecteur a nommés restent ensemble. */
    expect(barre, "« Tout effacer » a quitté la ligne des commandes").toMatch(/styles\.clearAll/);
    expect(barre.indexOf("styles.clearAll"), "il doit fermer la ligne, pas l'ouvrir").toBeGreaterThan(densite);
    for (const [quoi, i] of [["le filtre", filtre], ["le rangement", grouper], ["le resserrement", densite]] as const) {
      expect(i, `${quoi} a quitté la ligne des commandes`).toBeGreaterThan(-1);
    }
    expect(filtre, "le filtre doit venir en premier").toBeLessThan(grouper);
    expect(grouper, "le resserrement doit suivre le rangement").toBeLessThan(densite);
  });

  it("laisse lire la valeur choisie d'une liste déroulante", () => {
    /* Mesuré le 5 octobre 2026 : « Grouper · Émetteur » choisi, la valeur
       sortait en rgb(234, 239, 246) sur rgb(234, 239, 246) — CONTRASTE 1,00.
       « .meta b », une règle de la page autour, donnait sa couleur à un « b »
       qui n'en déclarait pas, et une déclaration explicite bat l'héritage
       quelle que soit la spécificité. Après : 13,61. */
    const DD = readFileSync("src/components/market/Dropdown.module.css", "utf8");
    expect(DD, "la valeur choisie reprend la couleur d'une règle voisine").toMatch(/\.dd \.ddBtn b \{[^}]*color: inherit;/);
    expect(DD, "le voile blanc du badge ne voile rien sur un fond clair").toMatch(/\.dd \.ddOn b \{/);
  });

  it("montre une cloche quand une alerte est armée", () => {
    /* On arme une alerte en tirant la carte ; le mot passe une seconde et
       demie, et rien ensuite ne distingue la ligne. La cloche est AVANT la
       pastille d'état : l'alerte appartient au lecteur, l'état au marché. */
    expect(CARTE, "la cloche a disparu de la carte").toMatch(/function Cloche\(\)/);
    const etats = [...CARTE.matchAll(/<span className=\{styles\.etat\}>\s*\{suivi && <Cloche \/>\}\s*<span className=\{`pill/g)].length;
    expect(etats, "la cloche doit précéder la pastille, sur les deux faces de la carte").toBe(2);
    expect(BROWSER, "la carte ne sait plus si une alerte est armée").toMatch(/suivi=\{armees\.has\(o\.id\)\}/);
    expect(PAGE, "la page ne lit plus les alertes du lecteur").toMatch(/listWatches\(session\.userId\)/);
  });

  it("laisse ses cartes à la largeur des autres pages", () => {
    /* Mesuré à 412 px : une carte d'adjudication allait de 30 à 382 — 352 px
       — quand une carte de fonds va de 14 à 398, soit 384. La page portait
       « max-width: 880px » et seize pixels de rembourrage, hérités du temps
       où elle n'était qu'un calendrier de dates. */
    expect(CSS, "la page se rétrécit de nouveau au milieu").not.toMatch(/\.page \{[^}]*max-width/);
    expect(CSS, "la page ajoute de nouveau sa propre gouttière").not.toMatch(/\.page \{[^}]*padding: var\(--s-7\)/);
  });
});
