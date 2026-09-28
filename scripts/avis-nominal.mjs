/**
 * Deux valeurs nominales dans la zone, et pourquoi c'est important.
 *
 * Toute conversion d'un prix imprimé en francs vers un pourcentage du nominal
 * passe par VN_OTA = 10 000. Si une partie de la zone émet à un million, cette
 * constante est fausse là où elle sert, et un prix de 990 000 F deviendrait
 * 9 900 % au lieu de 99 %.
 *
 * Et le rapprochement entre un avis et une séance se fait par le code
 * d'émission : encore faut-il que les deux tables en portent un.
 *
 *   node scripts/avis-nominal.mjs
 */
import fs from "node:fs";
import { toEmissionNotice, toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");
const h = { apikey: K, Authorization: `Bearer ${K}` };

const lus = (await fetch(`${U}/rest/v1/emission_notices?select=*&read_at=not.is.null&limit=3000`, { headers: h }).then((r) => r.json())).map(toEmissionNotice);

console.log(`la valeur nominale, par Trésor et par instrument :\n`);
const cle = (x) => `${x.country}|${x.instrument}`;
const m = new Map();
for (const x of lus) {
  if (x.nominalUnit == null) continue;
  const k = cle(x);
  m.set(k, { ...(m.get(k) ?? {}), [x.nominalUnit]: ((m.get(k) ?? {})[x.nominalUnit] ?? 0) + 1 });
}
for (const [k, v] of [...m.entries()].sort()) {
  const [pays, instr] = k.split("|");
  const parts = Object.entries(v).map(([n, c]) => `${c} × ${Number(n).toLocaleString("fr-FR")} F`);
  console.log(`   ${pays.padEnd(12)} ${instr}  ${parts.join(" · ")}`);
}

const seances = (await fetch(`${U}/rest/v1/auction_results?select=*&limit=2000`, { headers: h }).then((r) => r.json())).map(toAuctionResult);
const avecCode = seances.filter((r) => r.codeEmission);
console.log(`\n${seances.length} séances · ${avecCode.length} portent un code d'émission`);

const codesAvis = new Set(lus.map((x) => x.codeEmission).filter(Boolean));
const codesSeances = new Set(avecCode.map((r) => r.codeEmission.trim()));
const communs = [...codesSeances].filter((c) => codesAvis.has(c));
console.log(`${codesAvis.size} codes vus sur les avis · ${codesSeances.size} sur les séances · ${communs.length} communs`);

// Sans recouvrement, rien ne se complète : il faut savoir si c'est la lecture,
// la fenêtre de la BEAC, ou une différence d'écriture du code.
if (communs.length < 5) {
  console.log(`\nquelques codes de chaque côté, pour voir s'ils s'écrivent pareil :`);
  console.log(`   avis     : ${[...codesAvis].slice(0, 6).join(", ")}`);
  console.log(`   séances  : ${[...codesSeances].slice(0, 6).join(", ")}`);
}

const sansCoupon = seances.filter((r) => r.instrument === "OTA" && r.couponRate == null && r.yieldAvg == null);
console.log(`\n${sansCoupon.length} séances d'obligation sans coupon ni rendement imprimé`);
console.log(`   dont ${sansCoupon.filter((r) => r.codeEmission).length} avec un code d'émission`);
console.log(`   dont ${sansCoupon.filter((r) => r.codeEmission && codesAvis.has(r.codeEmission.trim())).length} dont le code figure sur un avis lu`);
