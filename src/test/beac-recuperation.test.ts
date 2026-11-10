import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { couvertureDe, estUneListeDeLaBeac, manquantsDuMois, planDeRecuperation, pointsAEcrire, tenorDe } from "@/lib/market/beac-recuperation";
import { archiveBeac } from "@/lib/market/courbe-vue";

const code = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const bulletins = [
  { numero: 120, mois: "2026-07", url: "https://www.beac.int/a.pdf" },
  { numero: 110, mois: "2022-09", url: "https://www.beac.int/b.pdf" },
  { numero: 109, mois: "2022-08", url: "https://www.beac.int/c.pdf" },
  { numero: 90, mois: "2021-01", url: "https://www.beac.int/d.pdf" },
];
const base = [
  { mois: "2022-09-01", pays: "Cameroun" },
  { mois: "2022-09-01", pays: "Congo" },
  { mois: "2022-09-01", pays: "Gabon" },
  { mois: "2022-08-01", pays: "Cameroun" },
];

describe("la récupération des bulletins d'avant 2023", () => {
  it("ne relève que ce qui comble un mois manquant, avant la borne, du plus récent au plus ancien", () => {
    const couv = couvertureDe(base);
    const plan = planDeRecuperation(bulletins, couv, { avant: "2023-01", limite: 5 });
    expect(plan.aTenter.map((b) => b.numero), "septembre 2022 est couvert, juillet 2026 est après la borne").toEqual([109, 90]);
    expect(plan.aTenter[0].pour, "août 2022 n'a que le Cameroun").toEqual(["Congo", "Gabon"]);
    expect(plan).toMatchObject({ avantLaBorne: 3, dejaCouverts: 1, aComblerEnTout: 2, plusAncien: "2021-01", plusRecent: "2026-07" });
  });
  it("respecte la limite d'un tour et dit ce qui reste", () => {
    const plan = planDeRecuperation(bulletins, couvertureDe(base), { avant: "2023-01", limite: 1 });
    expect(plan.aTenter).toHaveLength(1);
    expect(plan.aComblerEnTout - plan.aTenter.length).toBe(1);
  });
  it("n'écrit jamais un point d'un Trésor dont le mois est déjà couvert", () => {
    const couv = couvertureDe(base);
    const releve = { numero: 109, mois: "2022-08", source: "x", series: [{ pays: "Cameroun", points: [{ annees: 1, pct: 5 }] }, { pays: "Congo", points: [{ annees: 0.25, pct: 4 }, { annees: 1.5, pct: 6 }] }] };
    const pts = pointsAEcrire(releve, bulletins[2], couv);
    expect(pts.map((p) => `${p.pays}|${p.tenor}`)).toEqual(["Congo|3 mois", "Congo|1,5 ans"]);
    expect(pts.every((p) => p.mois === "2022-08-01" && p.sourceChemin === "https://www.beac.int/c.pdf")).toBe(true);
    expect(manquantsDuMois(couv, "2022-08")).toEqual(["Congo", "Gabon"]);
  });
  it("écrit les durées comme un axe les écrit", () => {
    expect([tenorDe(0.25), tenorDe(0.5), tenorDe(1), tenorDe(1.5), tenorDe(7)]).toEqual(["3 mois", "6 mois", "1 an", "1,5 ans", "7 ans"]);
  });
  it("n'accepte une autre liste que sur le site de la BEAC", () => {
    expect(estUneListeDeLaBeac("https://www.beac.int/archives/")).toBe(true);
    for (const u of ["http://www.beac.int/x", "https://exemple.com/www.beac.int", "https://beac.int.evil.com/", "javascript:1", "pas une adresse"]) expect(estUneListeDeLaBeac(u), u).toBe(false);
  });
  it("le robot a un diagnostic sans écriture et une récupération qui ne remplace rien", () => {
    const r = code("src/app/api/cron/beac-courbe/route.ts");
    expect(r, "le diagnostic écrit en base").toMatch(/params\.get\("diagnostic"\) !== null\) \{\s*return NextResponse\.json\(\{ ok: true, diagnostic: true/);
    expect(r, "la récupération ne passe plus par l'ajout sans remplacement").toMatch(/r0\.ajouterCourbesBeac\(points, RESERVE_DU_TRACE\)/);
    expect(r, "la récupération écrit par saveBeacCurve (qui remplace)").not.toMatch(/recuperer[\s\S]*saveBeacCurve[\s\S]*async function GET/);
    expect(code("src/lib/data/supabase.ts"), "l'ajout remplace un point existant").toMatch(/onConflict: "mois,pays,tenor", ignoreDuplicates: true/);
  });
});

describe("la courbe de la BEAC par date, au desk", () => {
  const pts = [
    { mois: "2022-08-01", pays: "Cameroun", annees: 1, taux: 5 },
    { mois: "2022-08-01", pays: "Gabon", annees: 1, taux: 6 },
    { mois: "2022-09-01", pays: "Cameroun", annees: 1, taux: 5.5 },
    { mois: "2022-09-01", pays: "Cameroun", annees: 0.25, taux: 4.5 },
  ];
  it("range un relevé par mois, du plus récent au plus ancien, sans prêter la courbe d'un mois à l'autre", () => {
    const a = archiveBeac(pts);
    expect(a.map((r) => r.mois)).toEqual(["2022-09", "2022-08"]);
    expect(a[0].series.map((s) => s.pays), "septembre n'a que le Cameroun").toEqual(["Cameroun"]);
    expect(a[0].series[0].points.map((p) => p.annees), "les points sont rangés par durée").toEqual([0.25, 1]);
    expect(a[1].series.map((s) => s.pays)).toEqual(["Gabon", "Cameroun"].sort());
  });
  it("la figure propose les mois du Trésor affiché et ne juge pas trop vieux un mois choisi", () => {
    const f = code("src/components/market/CourbeFusion.tsx");
    expect(f).toMatch(/moisBeacDispo = useMemo\(\(\) => \(beacArchive \?\? \[\]\)\.filter\(\(r\) => r\.series\.some\(\(s\) => choix === "tous" \|\| s\.pays === choix\)\)/);
    expect(f, "un mois choisi est de nouveau jugé trop vieux").toMatch(/moisBeacEffectif \? 10_000 : 18/);
    expect(f).toMatch(/const moisBeacEffectif = moisBeacDispo\.includes\(moisBeac\) \? moisBeac : ""/);
    expect(code("src/app/desk/analyses/page.tsx"), "la page ne passe plus l'archive à la figure").toMatch(/beacArchive=\{beacArchive\}/);
  });
});
