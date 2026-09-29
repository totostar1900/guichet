/**
 * Les lignes congolaises à deux ans, et ce que leurs échéances racontent.
 *
 * Une séance « 2 ans » dont l'échéance tombe dans onze mois est un abondement,
 * ou une échéance mal lue. Le premier cas se prouve : la même ligne doit
 * apparaître plus tôt, à sa création. Le second se voit à l'écart entre la date
 * de séance et l'échéance, comparé à la durée annoncée.
 *
 *   npx tsx scripts/lignes-congo.mjs [pays]
 */
import fs from "node:fs";
import { auctionYield, vieRestante } from "../src/lib/market/yield.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const rows = (
  await fetch(`${v("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: v("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${v("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).then((r) => r.json())
).map(toAuctionResult);

const pays = process.argv[2] ?? "Congo";
const siennes = rows.filter((r) => r.country === pays && r.instrument === "OTA").sort((a, b) => a.sessionOn.localeCompare(b.sessionOn));
console.log(`${siennes.length} séances OTA ${pays}\n`);
console.log(`${"séance".padEnd(12)}${"durée".padEnd(9)}${"code".padEnd(16)}${"échéance".padEnd(12)}${"vie".padStart(7)}${"coupon".padStart(8)}${"prix".padStart(8)}${"rdt".padStart(9)}   ce que ça dit`);
for (const r of siennes) {
  const vie = vieRestante(r);
  const y = auctionYield(r);
  /* Un abondement : la vie restante est nettement plus courte que l'étiquette. */
  const annonce = /(\d+)\s*an/.exec(r.tenor ?? "")?.[1];
  const abonde = vie && annonce && vie.years < Number(annonce) * 0.9;
  console.log(
    `${r.sessionOn.padEnd(12)}${String(r.tenor).padEnd(9)}${String(r.codeEmission ?? "—").padEnd(16)}${String(r.maturityOn ?? "—").padEnd(12)}${(vie ? vie.years.toFixed(2) : "—").padStart(7)}${String(r.couponRate ?? "—").padStart(8)}${String(r.priceAvg ?? r.priceLimit ?? "—").padStart(8)}${(y ? `${y.pct.toFixed(2)}%` : "—").padStart(9)}   ${abonde ? "ABONDEMENT" : ""}`,
  );
}

/* Un abondement se prouve : la ligne doit exister avant. On cherche le code, en
   tolérant un caractère de trop, que la transcription ajoute parfois. */
console.log(`\nLES CODES QUI REVIENNENT (une ligne abondée paraît plusieurs fois)\n`);
const noyau = (c) => c?.trim().toUpperCase().replace(/^([A-Z]{2}[0-9][0-9A-Z])0*/, "$1").replace(/\/.*$/, "");
const par = new Map();
for (const r of rows.filter((x) => x.country === pays)) {
  const k = noyau(r.codeEmission);
  if (!k) continue;
  par.set(k, [...(par.get(k) ?? []), r]);
}
for (const [k, l] of [...par.entries()].filter(([, l]) => l.length > 1).sort((a, b) => b[1].length - a[1].length))
  console.log(`   ${k.padEnd(14)} ×${l.length} : ${l.map((r) => `${r.sessionOn} (${r.codeEmission}, éch. ${r.maturityOn ?? "—"})`).join(" · ")}`);
