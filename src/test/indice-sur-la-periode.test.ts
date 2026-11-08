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
    expect(BODY, "les blocs sont dans le panneau du graphe, pas dans une section à part").toMatch(/<IndexChart[^>]*lierPeriodeALAdresse[\s\S]*?<Periode vue=\{vue\}[\s\S]*?<\/section>/);
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
    const societes = PERIODE.indexOf('t("Les sociétés de la cote sur la période")');
    expect(contrib).toBeGreaterThan(0);
    expect(tuiles, "les tuiles ne suivent plus la contribution").toBeGreaterThan(contrib);
    expect(tuiles, "les tuiles sont passées après le tableau des sociétés").toBeLessThan(societes);
  });
  it("la période du graphe est dans l'adresse, et les liens du tableau des séances la gardent", () => {
    expect(BODY).toMatch(/if \(periode !== "12m"\) u\.set\("periode", periode\)/);
    expect(lire("src/components/IndexChart.tsx")).toMatch(/q\.set\("periode", k\)/);
  });
  it("le tableau des séances n'est plus au Guichet : il reste au Desk", () => {
    expect(BODY).toMatch(/\{desk && \(\s*<section className="panel" id="seances">/);
    expect(BODY, "la composition reste côté client").toMatch(/id="composition"/);
  });
  it("le graphe s'ouvre sur la vue Cours + volumes, avec ses dates et un sélecteur de largeur fixe", () => {
    expect(BODY).toMatch(/vueInitiale="volumes"/);
    const chart = lire("src/components/IndexChart.tsx");
    expect(chart, "le sélecteur « Comparer à » doit garder sa largeur").toMatch(/compact\s+fixe\s+cherchable=\{false\}\s+label=\{view === "niveau"/);
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

