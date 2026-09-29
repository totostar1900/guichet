/**
 * Ce que les séances à zéro coûtent aux analyses, mesuré.
 *
 * Deux questions, et elles n'ont pas la même réponse.
 *
 *   LA COURBE : une séance qui n'a rien servi n'a pas de prix d'exécution. Si
 *   elle en porte un quand même, c'est le taux DEMANDÉ par le marché, que le
 *   Trésor a refusé. Le tracer revient à publier un prix que personne n'a payé.
 *
 *   LA PRESSION : une adjudication déserte est un fait, et l'écarter de la
 *   moyenne de couverture embellirait l'année. Ces deux-là ne se traitent pas
 *   pareil, et c'est tout l'enjeu.
 *
 *   npx tsx scripts/impact-zeros.mjs
 */
import fs from "node:fs";
import { auctionYield, vieRestante } from "../src/lib/market/yield.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";
import { buildCurve, horizon, MIN_POINTS } from "../src/lib/market/curve.ts";
import { pressureByYear } from "../src/lib/market/auction-stats.ts";
import { derniereParDuree, poids } from "../src/lib/market/lecture-b.ts";
import { abouti, ajuster } from "../src/lib/market/nelson-siegel.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const rows = (
  await fetch(`${v("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: v("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${v("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).then((r) => r.json())
).map(toAuctionResult);

const rienServi = (r) => r.served === 0;
const sans = rows.filter((r) => !rienServi(r));
const n = (x) => (x == null ? "—" : x.toFixed(2));

/* ── La courbe ──────────────────────────────────────────────────────────── */
console.log("LA COURBE, Congo, avec et sans les séances servies à zéro\n");
console.log("profondeur   points  λ      3 mois  1 an    3 ans   écart");
for (const jours of [365, 730, 1825]) {
  for (const [nom, jeu] of [["avec", rows], ["sans", sans]]) {
    const c = buildCurve(jeu, { windowDays: jours });
    const congo = c.countries.find((x) => x.country === "Congo");
    if (!congo || congo.points.length < MIN_POINTS) {
      console.log(`${String(jours).padStart(5)} j ${nom.padEnd(6)}  ${String(congo?.points.length ?? 0).padStart(5)}   pas de courbe`);
      continue;
    }
    const obs = derniereParDuree(
      congo.points.map((p) => {
        const h = horizon(p.years);
        return { annees: p.years, pct: p.yield.pct, mot: `${h.n} ${h.unit}`, age: p.ageDays, mince: p.thin };
      }),
    ).map((q) => ({ annees: q.annees, pct: q.pct, poids: poids(q, { demiVieJours: 180, minces: "sous-ponderer" }) }));
    const f = ajuster(obs);
    console.log(
      `${String(jours).padStart(5)} j ${nom.padEnd(6)}  ${String(congo.points.length).padStart(5)}`,
      abouti(f)
        ? `  ${n(f.lambda).padStart(5)}  ${n(f.taux(0.25)).padStart(6)}  ${n(f.taux(1)).padStart(6)}  ${n(f.taux(3)).padStart(6)}  ${Math.round(f.rmsePb)} pb`
        : `  ${f.refus}`,
    );
  }
  console.log("");
}

/* ── La pression ────────────────────────────────────────────────────────── */
console.log("LA PRESSION DE LA DEMANDE, avec et sans\n");
console.log("année  séances  couverture avec  couverture sans  écart");
const avec = pressureByYear(rows.filter((r) => r.confirmedBy));
const apres = pressureByYear(sans.filter((r) => r.confirmedBy));
for (const a of avec) {
  const b = apres.find((x) => x.year === a.year);
  const ecart = b ? b.coverage - a.coverage : null;
  console.log(
    String(a.year).padStart(5),
    String(a.n).padStart(8),
    n(a.coverage).padStart(16),
    (b ? n(b.coverage) : "—").padStart(17),
    (ecart == null ? "" : `${ecart >= 0 ? "+" : ""}${n(ecart)}`).padStart(7),
    b && b.n !== a.n ? `  (${a.n - b.n} séance(s) retirée(s))` : "",
  );
}

/* ── Le point litigieux ─────────────────────────────────────────────────── */
const litige = rows.filter((r) => rienServi(r) && auctionYield(r) && vieRestante(r));
console.log(`\nLE POINT QUI SE PUBLIE SANS AVOIR ÉTÉ PAYÉ : ${litige.length}`);
for (const r of litige) {
  const y = auctionYield(r);
  console.log(`  ${r.codeEmission} · ${r.country} ${r.instrument} ${r.tenor} · séance du ${r.sessionOn}`);
  console.log(`  annoncé ${(r.announced / 1e9).toFixed(1)} Md, soumis ${(r.bid / 1e6).toFixed(0)} M, SERVI ${r.served}`);
  console.log(`  et pourtant un rendement de ${y.pct.toFixed(3)} % (${y.origin}), tiré du taux moyen de ${r.rateAvg} %`);
}
