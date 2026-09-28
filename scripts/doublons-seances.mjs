/**
 * Deux lignes pour une même séance : doublon, ou deux lignes distinctes ?
 *
 * Le Congo adjuge volontiers plusieurs lignes le même jour à la même durée,
 * chacune avec son code d'émission : deux enregistrements ne sont donc pas une
 * anomalie en soi. Ils le deviennent si le code est le même, ou absent des deux.
 *
 *   npx tsx scripts/doublons-seances.mjs
 */
import fs from "node:fs";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const rows = (
  await fetch(`${v("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: v("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${v("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).then((r) => r.json())
).map(toAuctionResult);

const par = new Map();
for (const r of rows) {
  const k = `${r.country}|${r.sessionOn}|${r.instrument}|${r.tenor}`;
  par.set(k, [...(par.get(k) ?? []), r]);
}

const suspects = [...par.entries()].filter(([, l]) => l.length > 1);
console.log(`${suspects.length} groupe(s) de séances qui partagent pays, date, instrument et durée\n`);

let vrais = 0;
for (const [k, l] of suspects) {
  const codes = l.map((r) => r.codeEmission ?? null);
  const distincts = new Set(codes.filter(Boolean));
  /* Des codes tous distincts et tous présents : ce sont bien des lignes différentes. */
  const legitime = distincts.size === l.length;
  if (!legitime) vrais += 1;
  console.log(`${legitime ? "  " : "!!"} ${k}  ×${l.length}${legitime ? "  (codes distincts : lignes différentes)" : "  DOUBLON PROBABLE"}`);
  for (const r of l) {
    const ch = r.instrument === "BTA" ? `taux moyen ${r.rateAvg ?? "—"} / limite ${r.rateLimit ?? "—"}` : `prix moyen ${r.priceAvg ?? "—"} / limite ${r.priceLimit ?? "—"}`;
    console.log(
      `      ${(r.codeEmission ?? "SANS CODE").padEnd(20)} ${ch.padEnd(40)} servi ${String(r.served ?? "—").padStart(12)} · ${r.confirmedBy ? `relue par ${r.confirmedBy}` : "en attente"}`,
    );
    console.log(`      ${r.id}  ${r.sourceUrl?.slice(-72) ?? "—"}`);
  }
}
console.log(`\n${vrais} groupe(s) sans codes distincts : ce sont ceux qu'il faut regarder.`);
