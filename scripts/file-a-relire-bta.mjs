/**
 * La file des BTA à relire, et ce que les confirmer changerait.
 *
 * Confirmer n'est pas un geste anodin : à partir de là, le taux fonde les
 * indications du desk. Trois questions avant d'y toucher.
 *
 *   - Combien sont recevables ? confirmable() exige un code d'émission et au
 *     moins un chiffre. Une séance qui n'en a pas sera refusée par l'action.
 *   - Combien donneraient un rendement ? Une fourchette passe la recevabilité
 *     et ne donne aucun point de courbe : on signerait pour rien.
 *   - Combien de points de courbe à la clef ? C'est la seule raison de le faire.
 *
 *   npx tsx scripts/file-a-relire-bta.mjs
 */
import fs from "node:fs";
import { confirmable, fourchette } from "../src/lib/market/auction-results.ts";
import { auctionYield, yieldMissing } from "../src/lib/market/yield.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const rows = (
  await fetch(`${v("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: v("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${v("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).then((r) => r.json())
).map(toAuctionResult);

const attente = rows.filter((r) => !r.confirmedBy && r.instrument === "BTA");
console.log(`${rows.filter((r) => !r.confirmedBy).length} séances en attente, dont ${attente.length} BTA\n`);

const ligne = (r) => `${r.country}|${r.maturityOn ?? r.tenor}`;
console.log(`${"Trésor".padEnd(12)}${"BTA en attente".padStart(15)}${"recevables".padStart(12)}${"avec rendement".padStart(16)}${"sans code".padStart(11)}${"points gagnés".padStart(14)}`);

let totalGain = 0;
for (const p of [...new Set(attente.map((r) => r.country))].sort()) {
  const siennes = attente.filter((r) => r.country === p);
  const recevables = siennes.filter((r) => !confirmable(r) && r.codeEmission);
  const avecRdt = recevables.filter((r) => auctionYield(r));
  const sansCode = siennes.filter((r) => !r.codeEmission).length;
  const avant = new Set(rows.filter((r) => r.country === p && r.confirmedBy && auctionYield(r)).map(ligne));
  const apres = new Set([...avant, ...avecRdt.map(ligne)]);
  totalGain += apres.size - avant.size;
  console.log(
    `${p.padEnd(12)}${String(siennes.length).padStart(15)}${String(recevables.length).padStart(12)}${String(avecRdt.length).padStart(16)}${String(sansCode).padStart(11)}${`+${apres.size - avant.size}`.padStart(14)}`,
  );
}
console.log(`\n${totalGain} point(s) de courbe à gagner sur les BTA.`);

/* Ce qui serait signé sans rien produire : une signature pour rien se regarde. */
console.log(`\nce qui resterait muet même signé :`);
const muettes = {};
for (const r of attente.filter((x) => !auctionYield(x))) {
  const f = fourchette(r);
  const k = `${r.country} · ${yieldMissing(r) ?? "—"}${f ? " (une fourchette est publiée)" : ""}`;
  muettes[k] = (muettes[k] ?? 0) + 1;
}
for (const [k, n] of Object.entries(muettes).sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(3)} ${k}`);

/* Ce que l'action refuserait, et pourquoi : elle exige un code et un chiffre. */
console.log(`\nce que l'action refuserait :`);
const refus = {};
for (const r of attente) {
  const m = confirmable(r) ?? (!r.codeEmission ? "code d'émission absent" : null);
  if (m) refus[`${r.country} · ${m}`] = (refus[`${r.country} · ${m}`] ?? 0) + 1;
}
const nRefus = Object.values(refus).reduce((a, b) => a + b, 0);
for (const [k, n] of Object.entries(refus).sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(3)} ${k}`);
console.log(`   ${nRefus} refus sur ${attente.length}`);
