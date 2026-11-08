import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { debutDePeriode, periodeOuDefaut } from "@/app/indice/Periode";

/**
 * « SUR LA PÉRIODE » (8 novembre 2026, option A de « l'indice et la note ») : la page de l'indice montre les graphes et tableaux de la note, sur la période choisie, par le même calcul.
 */
const lire = (f: string) => readFileSync(`${process.cwd()}/${f}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const BODY = lire("src/app/indice/IndiceBody.tsx");
const PERIODE = lire("src/app/indice/Periode.tsx");
const QUARTER = lire("src/lib/market/index-quarter.ts");

describe("la période se lit dans l'adresse", () => {
  it("cinq périodes comme le graphe, douze mois par défaut, une valeur inconnue retombe sur le défaut", () => {
    expect(periodeOuDefaut()).toBe("12m");
    expect(periodeOuDefaut("all")).toBe("all");
    expect(periodeOuDefaut("ytd")).toBe("ytd");
    expect(periodeOuDefaut("tout")).toBe("12m");
  });
  it("le début de la période part de la dernière séance lue", () => {
    expect(debutDePeriode("ytd", "2026-09-30")).toBe("2026-01-01");
    expect(debutDePeriode("1m", "2026-09-30")).toBe("2026-08-31");
    expect(debutDePeriode("12m", "2026-09-30")).toBe("2025-09-30");
  });
});

describe("une seule lecture, deux endroits", () => {
  it("la page de l'indice rend la section avec les figures de la note", () => {
    expect(BODY).toMatch(/<Periode vue=\{vue\}/);
    expect(BODY, "les blocs sont dans le panneau du graphe, pas dans une section à part").toMatch(/<IndiceGraphe[\s\S]*?<Periode vue=\{vue\}[\s\S]*?<\/IndiceGraphe>\s*<\/section>/);
    expect(BODY, "la page n'a plus de sommaire « Sur cette page »").not.toMatch(/Sommaire|Sur cette page/);
    expect(PERIODE).toMatch(/from "\.\/note\/\[trimestre\]\/Figures"/);
    expect(PERIODE, "la comparaison base 100 fait double emploi avec la vue « Sociétés en base 100 » du graphe").not.toMatch(/Comparaison/);
    expect(PERIODE).toMatch(/<ContribBars /);
  });
  it("la note n'a pas sa propre copie du calcul : elle lit celui de la période", () => {
    expect(QUARTER).toMatch(/lignesDeLaPeriode\(d, quarter\.from, quarter\.to\)/);
    expect(QUARTER).toMatch(/statsDeSeance\(inQ\)/);
    expect(QUARTER, "la note recalcule la part de la finance").not.toMatch(/const FINANCE =/);
  });
  it("la page ne recopie pas le commentaire : elle renvoie à la note", () => {
    expect(PERIODE).toMatch(/quarterNoteHref/);
    expect(PERIODE).not.toMatch(/ne dit pas|ne mesure pas/);
  });
  it("les quatre tuiles (repli maximal…) suivent tout de suite la contribution de chaque société", () => {
    const contrib = PERIODE.indexOf("<ContribBars");
    const tuiles = PERIODE.indexOf("<dl className={styles.stats}>");
    const societes = PERIODE.indexOf("<Societes ");
    expect(contrib).toBeGreaterThan(0);
    expect(tuiles, "les tuiles ne suivent plus la contribution").toBeGreaterThan(contrib);
    expect(tuiles, "les tuiles sont passées après le tableau des sociétés").toBeLessThan(societes);
  });
  it("la période du graphe est dans l'adresse, et les liens du tableau des séances la gardent", () => {
    expect(BODY).toMatch(/if \(periode !== "12m"\) u\.set\("periode", periode\)/);
    expect(lire("src/app/indice/IndiceGraphe.tsx")).toMatch(/q\.set\("periode", k\)/);
  });
  it("le tableau des séances n'est plus au Guichet : il reste au Desk", () => {
    expect(BODY).toMatch(/\{desk && \(\s*<section className="panel" id="seances">/);
    expect(BODY, "le tableau « Composition » est remplacé par les graphiques des sociétés").not.toMatch(/id="composition"/);
  });
  it("le graphe s'ouvre sur la vue Cours + volumes, avec ses dates et un sélecteur de largeur fixe", () => {
    expect(BODY).toMatch(/vueInitiale="volumes"/);
    const chart = lire("src/components/IndexChart.tsx");
    expect(chart, "le sélecteur de société doit garder sa largeur").toMatch(/compact\s+fixe\s+cherchable=\{false\}\s+label=\{view === "volumes"/);
    expect(chart, "le cours compare toutes les sociétés, indice compris, par des pastilles").toMatch(/aria-label=\{t\("Comparer"\)\}/);
    expect(chart, "cinq dates sur un téléphone").toMatch(/W < 480 \? 4 : W < 760 \? 5 : 7/);
    expect(chart).toMatch(/reperesSansChevauchement\(xs, mots, CAR, 3\)/);
    expect(lire("src/components/market/IndiceEtNegoce.tsx"), "les mois de l'axe des volumes se touchaient à 390 px").toMatch(/reperesSansChevauchement\(tous\.map/);
  });
});

describe("les chiffres de la page se retrouvent entre le graphe et les blocs (8 novembre 2026)", () => {
  const PERIOD = lire("src/lib/market/index-period.ts");
  it("la contribution est le poids du DÉBUT de période × la variation, comme la vue Contributions du graphe", () => {
    expect(PERIOD).toMatch(/points: \(poidsDeDepart \/ 100\) \* move/);
    expect(PERIOD, "le poids d'aujourd'hui ne doit plus servir à la contribution").not.toMatch(/points: \(w\.weightTotal/);
    expect(PERIOD, "même nombre de titres que le graphe : le dernier lu").toMatch(/sharesTotal/);
  });
  it("la page part, comme le graphe, du cours de la première séance de la période", () => {
    expect(PERIOD).toMatch(/lignesDeLaPeriode\(d, from, to, "premiere"\)/);
    expect(PERIOD).toMatch(/base === "premiere"/);
  });
});

describe("la rangée des sélecteurs ne bouge pas d'une vue à l'autre", () => {
  const CHART = lire("src/components/IndexChart.tsx");
  const CSS = readFileSync(`${process.cwd()}/src/components/IndexChart.module.css`, "utf8");
  it("société d'abord, tracé ensuite, « base 100 » en dernier, dans une rangée à hauteur réservée", () => {
    const rangee = CHART.indexOf("styles.selecteurs");
    expect(rangee).toBeGreaterThan(0);
    const soc = CHART.indexOf("fixe", rangee);
    const trace = CHART.indexOf('label={t("Tracé")}', rangee);
    expect(CHART.slice(CHART.indexOf("<Select compact", rangee), trace), "le sélecteur de tracé doit aussi garder sa largeur").toMatch(/compact fixe/);
    const base = CHART.indexOf('t("base 100")', rangee);
    expect(soc).toBeGreaterThan(rangee);
    expect(trace).toBeGreaterThan(soc);
    expect(base).toBeGreaterThan(trace);
    expect(CSS).toMatch(/\.selecteurs \{[^}]*min-height: var\(--ctrl-h\)/);
  });
  it("la grille du graphe a sa colonne nommée : la barre de dates ne sort plus du panneau sur un petit téléphone", () => {
    expect(CSS).toMatch(/\.wrap \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
  });
  it("le glissement du doigt est réclamé par chaque dessin d'un bloc de plusieurs dessins (Cours + volumes)", () => {
    expect(readFileSync(`${process.cwd()}/src/components/charts/tracker.module.css`, "utf8")).toMatch(/div\.track svg \{\s*touch-action: none;/);
  });
});

describe("les sociétés comparées en graphiques, à la place des deux tableaux (8 novembre 2026, 4A)", () => {
  const SOC = lire("src/app/indice/Societes.tsx");
  it("trois dessins dans la boîte de la maison : poids, paire cours / part des échanges, montant moyen", () => {
    expect(SOC).toMatch(/const W = GRAPHE_L/);
    expect(SOC.match(/<svg viewBox/g)?.length, "deux dessins ici, le troisième est dans Profondeur").toBe(2);
    expect(lire("src/app/indice/Profondeur.tsx")).toMatch(/<svg viewBox/);
    expect(SOC, "aucun corps de texte en dur").not.toMatch(/fontSize=\{\d/);
    expect(SOC).toMatch(/Cours \(%\)/);
    expect(SOC).toMatch(/Part des échanges \(%\)/);
    expect(SOC, "les deux graphiques côte à côte partagent les mêmes noms de sociétés (un seul axe vertical)").toMatch(/<Noms lignes=\{societes\} x=\{LAB\} \/>/);
  });
  it("les chiffres exacts restent, repliés, et le tableau des sociétés n'est plus à l'écran", () => {
    expect(SOC).toMatch(/<details className=\{styles\.chiffres\}>/);
    expect(PERIODE, "l'ancien tableau a disparu").not.toMatch(/Les sociétés de la cote sur la période/);
  });
  it("le poids, les secteurs, les pays et la finance suivent la période (poids de fin), la rotation aussi", () => {
    const P = lire("src/lib/market/index-period.ts");
    expect(P).toMatch(/repartitionDebutFin\(societes, \(s\) => s\.sector\)/);
    expect(P).toMatch(/repartitionDebutFin\(societes, \(s\) => s\.country\)/);
    expect(P).toMatch(/partDeLaFinance\(lines, poidsFin\)/);
    expect(P).toMatch(/rotation: sFl \? \(sA \/ sFl\) \* 100/);
  });
});

describe("la barre de période collante et la comparaison de toutes les sociétés (8 novembre 2026)", () => {
  const GRAPHE = lire("src/app/indice/IndiceGraphe.tsx");
  const CSS = readFileSync(`${process.cwd()}/src/app/indice/graphe.module.css`, "utf8");
  const PAGECSS = readFileSync(`${process.cwd()}/src/app/indice/page.module.css`, "utf8");
  it("la période est une liste (presets + plage personnalisée) qui colle sous la barre du haut, avec son propre fond", () => {
    expect(GRAPHE).toMatch(/value: "plage", label: t\("Plage personnalisée…"\)/);
    expect(CSS).toMatch(/\.barre \{[^}]*position: sticky;[^}]*top: var\(--barre-collante, 0px\)/);
    expect(CSS).toMatch(/background: var\(--surface\)/);
  });
  it("le panneau ne rogne plus la barre : « clip » et non « hidden »", () => {
    expect(PAGECSS).toMatch(/\.courbe \{\s*overflow: clip;/);
  });
  it("une plage libre passe dans l'adresse (du, au) une demi-seconde après le dernier geste, une preset tout de suite", () => {
    expect(GRAPHE).toMatch(/q\.set\("du", dates\[z\[0\]\]/);
    expect(GRAPHE).toMatch(/\}, 500\)/);
    expect(GRAPHE).toMatch(/q\.delete\("du"\)/);
  });
  it("le graphe n'écrit plus ses boutons de période quand la page le pilote", () => {
    const chart = lire("src/components/IndexChart.tsx");
    expect(chart).toMatch(/\{!commande && \(\s*<div className=\{styles\.bar\}>\s*<div className=\{styles\.pills\}/);
    expect(chart, "la barre de dates est dans la bande collante, plus dans le graphe").toMatch(/\{!commande && <BarreDePlage/);
  });
  it("toutes les sociétés, l'indice compris, sur un seul axe en base 100, avec une couleur par société", () => {
    const chart = lire("src/components/IndexChart.tsx");
    expect(chart).toMatch(/Toutes/);
    expect(chart).toMatch(/const couleursDe = \(overlays: OverlaySeries\[\]\) => overlays\.map\(\(o\) => o\.mnemo\)\.sort\(\)/);
    expect(chart).toMatch(/const showBase = rebase \|\| ovs\.length > 0/);
    const css = readFileSync(`${process.cwd()}/src/app/globals.css`, "utf8");
    for (let i = 1; i <= 8; i++) expect(css, `la teinte --co-${i}`).toMatch(new RegExp(`--co-${i}: #`));
  });
});

describe("la maquette appliquée sans perdre aucune information (8 novembre 2026)", () => {
  const SOC = lire("src/app/indice/Societes.tsx");
  const CHART = lire("src/components/IndexChart.tsx");
  const CSS = readFileSync(`${process.cwd()}/src/components/IndexChart.module.css`, "utf8");
  const GCSS = readFileSync(`${process.cwd()}/src/app/indice/graphe.module.css`, "utf8");
  it("« Voir les chiffres » reprend chaque colonne des deux anciens tableaux (sociétés, composition)", () => {
    for (const col of ["Société", "Activité", "Pays", "Cours", "Rendement", "Capital global", "Flottant coté", "Liquidité 3 mois", "Dernier dividende", "Échangé", "Transactions", "Séances avec échange"]) {
      expect(SOC, `la colonne « ${col} » a disparu`).toContain(`("${col}")`);
    }
    expect(SOC, "la ligne « Ensemble » (capital, flottant, part flottante) a disparu").toMatch(/t\("flottant : \{p\} du capital global"/);
    expect(SOC, "les définitions du capital global et du flottant coté ont disparu").toMatch(/toutes les actions de la société × le cours[\s\S]*seulement les titres en mains du public/);
  });
  it("le poids garde tout : barre de fin, trait du début, flottant", () => {
    expect(SOC).toMatch(/var\(--chart-in\)/);
    expect(SOC).toMatch(/poidsFlottantFin/);
    expect(SOC).toMatch(/poidsDebut/);
  });
  it("1B : une ligne ; 2C : le tracé et « base 100 » derrière un bouton Réglages sur la rangée ; 3A : fondu au bord des pastilles", () => {
    expect(GCSS, "la ligne de la bande ne passe pas à la ligne").toMatch(/\.ligne \{[^}]*flex-wrap: nowrap/);
    expect(GCSS).toMatch(/--sel-fixe: 9\.8rem/);
    expect(CHART).toMatch(/className=\{styles\.reglagesBtn\}/);
    expect(CHART).toMatch(/lineView && reglagesOuverts && \(\s*<div className=\{styles\.reglages\}>/);
    expect(CSS).toMatch(/\.puces \{[^}]*mask-image: linear-gradient/);
    expect(CSS, "la rangée ne réserve plus deux lignes").not.toMatch(/\.selecteurs \{[^}]*calc\(var\(--ctrl-h\) \* 2/);
  });
});

describe("switch, repères colorés, secteur et pays aux dates, bande à deux lignes, pays (8 novembre 2026)", () => {
  const PROF = lire("src/app/indice/Profondeur.tsx");
  const GCSS = readFileSync(`${process.cwd()}/src/app/indice/graphe.module.css`, "utf8");
  const SOC = lire("src/app/indice/Societes.tsx");
  const PER = lire("src/app/indice/Periode.tsx");
  const GRAPHE = lire("src/app/indice/IndiceGraphe.tsx");
  const CHART = lire("src/components/IndexChart.tsx");
  it("le graphique de profondeur a son commutateur : montant moyen (défaut), montant échangé, transactions", () => {
    expect(PROF).toMatch(/useState<Mode>\("moyen"\)/);
    expect(PROF).toMatch(/\["moyen", l\.moyen\][\s\S]*\["total", l\.total\][\s\S]*\["trans", l\.trans\]/);
    expect(PROF).toMatch(/aria-pressed=\{mode === k\}/);
  });
  it("le début est un trait de la teinte --repere, cerné du fond : sur les graphiques et sur les secteurs et pays", () => {
    expect(SOC).toMatch(/stroke="var\(--repere\)"/);
    expect(SOC).toMatch(/stroke="var\(--surface\)"/);
    expect(SOC, "plus de trait de début à l'encre").not.toMatch(/stroke="var\(--ink\)" strokeWidth=\{2\}/);
    expect(readFileSync(`${process.cwd()}/src/app/indice/periode.module.css`, "utf8")).toMatch(/background: var\(--repere\)/);
  });
  it("secteur et pays suivent les dates : poids de début et de fin, en barre et en trait", () => {
    expect(PER).toMatch(/r\.fin/);
    expect(PER).toMatch(/r\.debut/);
    expect(PER).toMatch(/financeDebut/);
  });
  it("la bande collante tient sur deux lignes : la liste, puis la barre à deux poignées ; les dates sur demande", () => {
    expect(GRAPHE).toMatch(/<BarreDePlage[\s\S]*?partie="barre"/);
    expect(GRAPHE).toMatch(/\{champs && <BarreDePlage[\s\S]*?partie="champs"/);
    expect(GRAPHE).toMatch(/className=\{styles\.ligne\}/);
    expect(GCSS, "la bande a sa colonne nommée : la barre ne sort plus du panneau").toMatch(/\.barre \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
  });
  it("la vue du cours sélectionne des pays : une pastille par pays, toutes ses sociétés d'un coup (pas de sous-indice maison)", () => {
    expect(CHART).toMatch(/const basculerPays = /);
    expect(CHART).toMatch(/data-pays/);
    expect(CHART).toMatch(/country\?: string/);
    expect(lire("src/app/indice/IndiceBody.tsx")).toMatch(/country: companies\.find/);
  });
});

