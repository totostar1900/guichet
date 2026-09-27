/**
 * La courbe telle qu'elle sortirait aujourd'hui, en texte.
 *
 * La page du desk demande une session, et une vérification ne devrait pas
 * dépendre d'un écran qu'on n'a pas sous les yeux. Ce script passe les mêmes
 * séances dans le même buildCurve() et imprime ce que le graphique tracerait :
 * la graduation, les points, et ce qui reste au bord.
 *
 *   node scripts/courbe-du-jour.mjs [fenêtre en jours]
 */
import fs from "node:fs";
import { abonde, buildCurve, horizon } from "../src/lib/market/curve.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");

const rows = await fetch(`${U}/rest/v1/auction_results?select=*&limit=2000`, {
  headers: { apikey: K, Authorization: `Bearer ${K}` },
}).then((r) => r.json());

const windowDays = Number(process.argv[2] ?? 180);
const c = buildCurve(rows.map(toAuctionResult), { windowDays });
const mot = (y) => {
  const { n, unit } = horizon(y);
  return `${n.toLocaleString("fr-FR")} ${unit}`;
};

console.log(`Courbe au ${c.on} · fenêtre ${c.windowDays} jours · ${c.considered} séances relues dans la fenêtre\n`);
for (const pays of c.countries) {
  console.log(`${pays.country} · ${pays.points.length} points · le plus ancien à ${pays.oldestDays} jours`);
  for (const p of pays.points) {
    const ecarte = abonde(p);
    const marques = [p.thin ? "mince" : "", p.toVerify ? "à contrôler" : ""].filter(Boolean).join(", ");
    console.log(
      `   ${mot(p.years).padStart(9)}  ${p.yield.pct.toFixed(2).padStart(6)} %  ${p.yield.origin.padEnd(16)} ` +
        `${p.tenor.padEnd(12)}${ecarte ? "abondement" : "          "} ${p.from.sessionOn}${marques ? ` · ${marques}` : ""}`,
    );
  }
  console.log();
}
if (c.gaps.length) console.log(`${c.gaps.length} séances relues sans point : ${[...new Set(c.gaps.map((g) => g.why))].join(" · ")}`);
