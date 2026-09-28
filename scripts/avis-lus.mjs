/**
 * Ce que les avis d'annonce ont donné, une fois lus.
 *
 * L'intérêt n'est pas le décompte mais ce que les mentions révèlent : les six
 * Trésors écrivent-ils la même chose sous « Remboursement », et à quelle valeur
 * nominale émettent-ils ? Ce sont les deux hypothèses sur lesquelles tout le
 * calcul de rendement repose, et qui étaient jusqu'ici supposées.
 *
 *   node scripts/avis-lus.mjs
 */
import fs from "node:fs";
import { toEmissionNotice, toAuctionResult } from "../src/lib/data/supabase.ts";
import { emissionLines, rembourseInFine, completerDepuisAvis } from "../src/lib/market/emission-notices.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");
const h = { apikey: K, Authorization: `Bearer ${K}` };

const avis = (await fetch(`${U}/rest/v1/emission_notices?select=*&limit=3000`, { headers: h }).then((r) => r.json())).map(toEmissionNotice);
const lus = avis.filter((x) => x.readAt);
console.log(`${avis.length} avis ramassés · ${lus.length} lus\n`);

const par = (f) => {
  const m = new Map();
  for (const x of lus) {
    const k = f(x);
    if (k == null) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

console.log(`ce que les avis lus portent :`);
console.log(`   ${lus.filter((x) => x.codeEmission).length} un code d'émission`);
console.log(`   ${lus.filter((x) => x.couponRate != null).length} un taux facial`);
console.log(`   ${lus.filter((x) => x.maturityOn).length} une échéance`);
console.log(`   ${lus.filter((x) => x.redemption).length} une mention de remboursement`);

console.log(`\nla mention « Remboursement », telle qu'imprimée :`);
for (const [m, n] of par((x) => x.redemption?.trim())) {
  const fine = rembourseInFine(m);
  console.log(`   ${String(n).padStart(4)} × « ${m} »${fine === false ? "   ← autre chose qu'un in fine" : ""}`);
}

console.log(`\npar Trésor, la part qui dit in fine :`);
const pays = [...new Set(lus.map((x) => x.country))].sort();
for (const p of pays) {
  const l = lus.filter((x) => x.country === p && x.redemption);
  const f = l.filter((x) => rembourseInFine(x.redemption));
  console.log(`   ${p.padEnd(12)} ${String(f.length).padStart(3)}/${String(l.length).padEnd(3)} · ${lus.filter((x) => x.country === p).length} avis lus`);
}

console.log(`\nla valeur nominale unitaire :`);
for (const [m, n] of par((x) => x.nominalUnit)) console.log(`   ${String(n).padStart(4)} × ${Number(m).toLocaleString("fr-FR")} F`);

// Et l'usage : combien de séances sans coupon un avis peut-il sauver ?
const lignes = emissionLines(lus, { confirmedOnly: false });
console.log(`\n${lignes.length} lignes d'emprunt distinctes · ${lignes.filter((l) => l.desaccords.length).length} portent un désaccord entre deux avis`);
for (const l of lignes.filter((x) => x.desaccords.length).slice(0, 5)) {
  console.log(`   ${l.codeEmission} ${l.country} : ${l.desaccords.map((d) => `${d.champ} ${d.valeurs.join(" contre ")}`).join(", ")}`);
}

const seances = (await fetch(`${U}/rest/v1/auction_results?select=*&limit=2000`, { headers: h }).then((r) => r.json())).map(toAuctionResult);
const sauvables = seances.filter((r) => r.instrument === "OTA" && r.couponRate == null && r.yieldAvg == null && completerDepuisAvis(r, lignes)?.couponRate != null);
console.log(`\n${sauvables.length} séances sans coupon qu'un avis peut compléter :`);
for (const r of sauvables.slice(0, 12)) {
  const c = completerDepuisAvis(r, lignes);
  console.log(`   ${r.sessionOn} ${r.country.padEnd(11)} ${String(r.tenor).padEnd(9)} ${r.codeEmission} · coupon ${c.couponRate} · éch ${c.maturityOn ?? "—"}${r.confirmedBy ? " · relue" : ""}`);
}
if (sauvables.length > 12) console.log(`   … et ${sauvables.length - 12} autres`);
