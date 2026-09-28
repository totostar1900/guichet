/**
 * Les chiffres réels dont la maquette a besoin, pour ses douze sections.
 *
 * Une maquette sur des nombres inventés ment sur la densité : on découvre à
 * l'intégration que huit points tiennent mal là où trois tenaient bien, ou
 * qu'un libellé passe à la ligne. Et quand la question posée est « combien de
 * place le commentaire prend-il à côté de chaque section », la densité est
 * précisément ce qu'on regarde.
 *
 *   node scripts/donnees-maquette.mjs > .../donnees.json
 */
import fs from "node:fs";
import { buildCurve, horizon, abonde, spreads, serie, MIN_POINTS } from "../src/lib/market/curve.ts";
import { cribler } from "../src/lib/market/anomalies.ts";
import { pressureByYear, programByYear } from "../src/lib/market/auction-stats.ts";
import { liquidity, freshness } from "../src/lib/market/liquidity.ts";
import { bridge } from "../src/lib/market/bridge.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");
const h = { apikey: K, Authorization: `Bearer ${K}` };
const get = (t, q = "") => fetch(`${U}/rest/v1/${t}?select=*${q}`, { headers: h }).then((r) => r.json()).catch(() => []);

const rows = (await get("auction_results", "&limit=2000")).map(toAuctionResult);
const relues = rows.filter((s) => s.confirmedBy);
const courbe = buildCurve(rows, { windowDays: 365 });
const tracables = courbe.countries.filter((c) => c.points.length >= MIN_POINTS);
const mot = (y) => {
  const { n, unit } = horizon(y);
  return `${n.toLocaleString("fr-FR")} ${unit}`;
};
const dire = (q) => Object.entries(q.params ?? {}).reduce((s, [k, x]) => s.split(`{${k}}`).join(String(x)), q.key);

/** La liquidité demande les cotations du secondaire, qui vivent ailleurs. */
let liq, frais, ponts;
try {
  const [activite, cotes] = await Promise.all([get("quote_activity", "&limit=5000"), get("latest_quotes", "&limit=2000")]);
  liq = liquidity(activite, cotes);
  frais = liq ? freshness(liq) : undefined;
  ponts = liq ? bridge(rows, liq.lines) : [];
} catch {
  // Le secondaire n'est pas indispensable à ce que la maquette montre : elle
  // dira « à brancher » plutôt que d'inventer un chiffre.
}

const out = {
  bandeau: {
    seances: rows.length,
    relues: relues.length,
    tresorsTraces: tracables.length,
    points: courbe.countries.reduce((n, c) => n + c.points.length, 0),
    sansRendement: courbe.gaps.length,
    plusAncien: courbe.countries.length ? Math.max(...courbe.countries.map((c) => c.oldestDays)) : 0,
    lignesSeances: liq?.lineSessions ?? null,
  },
  courbe: {
    on: courbe.on,
    fenetre: courbe.windowDays,
    considerees: courbe.considered,
    pays: courbe.countries.map((c) => ({
      pays: c.country,
      plusVieux: c.oldestDays,
      derniere: c.latest,
      points: c.points.map((p) => ({
        annees: Number(p.years.toFixed(3)),
        mot: mot(p.years),
        pct: Number(p.yield.pct.toFixed(3)),
        origine: p.yield.origin,
        hypotheses: p.yield.assumptions.map((a) => dire(a)),
        etiquette: p.tenor,
        abondement: abonde(p),
        mince: p.thin,
        on: p.from.sessionOn,
        code: p.from.codeEmission ?? null,
      })),
    })),
    trous: courbe.gaps.map((g) => ({ pays: g.country, instrument: g.instrument, tenor: g.tenor, on: g.on, pourquoi: g.why, cite: g.cite ?? null, publie: g.publie ?? null })),
  },
  ecarts: (() => {
    const ref = tracables[0]?.country;
    if (!ref) return { ref: null, lignes: [] };
    return {
      ref,
      lignes: tracables.slice(1).flatMap((c) => spreads(courbe, c.country, ref).map((e) => ({ contre: c.country, tenor: e.tenor, annees: Number(e.years.toFixed(2)), bp: e.bp, ecartJours: e.apart }))),
    };
  })(),
  reprix: (() => {
    const cles = [["Cameroun", "52 semaines"], ["Congo", "52 semaines"], ["Cameroun", "3 ans"], ["Congo", "3 ans"]];
    return cles.map(([p, t]) => ({ pays: p, tenor: t, points: serie(rows, p, t).map((x) => ({ on: x.on, pct: Number(x.pct.toFixed(3)), mince: x.thin, origine: x.origin })) })).filter((s) => s.points.length > 1);
  })(),
  pression: pressureByYear(relues),
  programme: programByYear(relues),
  liquidite: liq ? { lineSessions: liq.lineSessions, traded: liq.traded, share: liq.share, value: liq.value, mutes: liq.muteSessions ?? null, lignes: (liq.lines ?? []).slice(0, 8) } : null,
  fraicheur: frais ?? null,
  ponts: (ponts ?? []).slice(0, 8),
  anomalies: (() => {
    const { restent, vues } = cribler(rows);
    return { vues, restent: restent.map((a) => ({ quand: a.quand, pays: a.pays, instrument: a.instrument, tenor: a.tenor, quoi: dire(a.quoi), verifier: a.verifier, gravite: a.gravite })) };
  })(),
};

console.log(JSON.stringify(out));
