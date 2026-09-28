/**
 * Refaire, hors requête, ce que la page d'analyses calcule avant de rendre.
 *
 * La page est « force-dynamic » : elle n'est jamais rendue à la construction,
 * si bien qu'un « next build » vert ne prouve rien sur elle. Et elle est
 * derrière l'authentification du desk, que je n'ai pas. Cette sonde rejoue donc
 * la même chaîne de calcul sur les mêmes données, étape par étape, et dit
 * laquelle casse.
 *
 * Si tout passe ici, la panne est dans le rendu et non dans les données, ce qui
 * est déjà une moitié de réponse.
 *
 *   node scripts/sonde-analyses.mjs
 */
import fs from "node:fs";
import { abonde, buildCurve, horizon, MIN_POINTS, serie, spreads } from "../src/lib/market/curve.ts";
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

/** Un « t » de secours : la sonde ne charge pas le dictionnaire du serveur. */
const t = (s, p) => (p ? Object.entries(p).reduce((x, [k, val]) => x.split(`{${k}}`).join(String(val)), s) : s);

const etape = async (nom, f) => {
  try {
    const out = await f();
    console.log(`✓ ${nom}`);
    return out;
  } catch (e) {
    console.log(`✗ ${nom}`);
    console.log(`   ${e instanceof Error ? e.message : String(e)}`);
    if (e instanceof Error && e.stack) console.log(e.stack.split("\n").slice(1, 4).join("\n"));
    process.exitCode = 1;
    return undefined;
  }
};

const AN = 365;
const seances = (await fetch(`${U}/rest/v1/auction_results?select=*&limit=1000`, { headers: h }).then((r) => r.json())).map(toAuctionResult);
const relues = seances.filter((s) => s.confirmedBy);
console.log(`${seances.length} séances · ${relues.length} relues\n`);

const courbe = await etape("buildCurve", () => buildCurve(seances, { windowDays: AN }));
const tracables = await etape("tracables", () => courbe.countries.filter((c) => c.points.length >= MIN_POINTS));
await etape("pressureByYear", () => pressureByYear(relues));
await etape("programByYear", () => programByYear(relues));
await etape("cribler", () => cribler(seances));

await etape("suivies (reprix)", () => {
  const suivies = [...new Map(relues.map((r) => [`${r.country}|${r.tenor}`, r])).values()]
    .map((r) => ({ pays: r.country, tenor: r.tenor, pts: serie(seances, r.country, r.tenor) }))
    .filter((x) => x.pts.length >= 4)
    .sort((a, b) => b.pts.length - a.pts.length)
    .slice(0, 3);
  // Le nom porté au bout de la ligne, ajouté avec les tracés interrogeables.
  return suivies.map((x) => `${x.pays} ${x.tenor.replace(" semaines", " sem.")}`);
});

const pourLaCourbe = await etape("pourLaCourbe", () =>
  tracables.map((c) => ({
    pays: c.country,
    plusVieux: c.oldestDays,
    derniere: c.latest,
    points: c.points.map((p) => {
      const hz = horizon(p.years);
      return {
        id: p.from.id,
        annees: p.years,
        mot: `${hz.n.toLocaleString("fr-FR")} ${t(hz.unit)}`,
        pct: p.yield.pct,
        origine: p.yield.origin,
        hypotheses: p.yield.assumptions.map((a) => t(a.key, a.params)),
        etiquette: p.tenor,
        abondement: abonde(p),
        mince: p.thin,
        on: p.from.sessionOn,
        code: p.from.codeEmission,
      };
    }),
  })),
);

await etape("isoles", () => courbe.countries.filter((c) => c.points.length < MIN_POINTS).map((c) => `${c.country} (${c.points[0].tenor})`));

await etape("ecarts", () => {
  const reference = tracables[0]?.country;
  if (!reference) return [];
  return tracables.slice(1).flatMap((c) =>
    spreads(courbe, c.country, reference).map((e) => {
      const hz = horizon(e.years);
      return { contre: c.country, tenor: e.tenor, horizon: `${hz.n.toLocaleString("fr-FR")} ${t(hz.unit)}`, bp: e.bp, apart: e.apart };
    }),
  );
});

/* Le secondaire : c'est lui qui alimente liquidité, fraîcheur et pont. */
await etape("liquidité / fraîcheur / pont", async () => {
  const deuxAns = new Date();
  deuxAns.setFullYear(deuxAns.getFullYear() - 2);
  const bulletins = await fetch(`${U}/rest/v1/bulletins?select=*&limit=1000`, { headers: h }).then((r) => r.json()).catch(() => []);
  const liq = liquidity([], []);
  const frais = liq ? freshness(liq) : undefined;
  const ponts = liq ? bridge(seances, liq.lines) : [];
  return { bulletins: bulletins.length, liq: Boolean(liq), frais: Boolean(frais), ponts: ponts.length };
});

console.log(`\n${pourLaCourbe ? pourLaCourbe.reduce((n, c) => n + c.points.length, 0) : 0} points de courbe préparés`);
console.log(process.exitCode ? "\nUne étape a cassé : la panne est dans les données." : "\nToutes les étapes passent : la panne est dans le rendu, pas dans les données.");
