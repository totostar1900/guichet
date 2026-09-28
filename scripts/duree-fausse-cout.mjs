/**
 * Ce qu'une durée fausse coûte, sur les deux séances les plus sûres.
 *
 * Deux témoins indépendants contredisent la durée enregistrée sur ces deux
 * séances : le nom du communiqué et le préfixe du code d'émission disent tous
 * deux treize semaines là où la ligne dit vingt-six.
 *
 * Une durée fausse frappe deux fois. Le point se pose à la mauvaise abscisse,
 * et le taux précompté se convertit en rendement actuariel sur le mauvais
 * nombre de jours. La seconde erreur est invisible : le chiffre reste plausible.
 *
 *   npx tsx scripts/duree-fausse-cout.mjs
 */
import fs from "node:fs";
import { auctionYield, tenorYears } from "../src/lib/market/yield.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const rows = (
  await fetch(`${v("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: v("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${v("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).then((r) => r.json())
).map(toAuctionResult);

const SUSPECTES = [
  { code: "GA1100001807", devrait: "13 semaines" },
  { code: "CG11000001078", devrait: "13 semaines" },
];

for (const s of SUSPECTES) {
  const r = rows.find((x) => x.codeEmission === s.code);
  if (!r) {
    console.log(`${s.code} introuvable`);
    continue;
  }
  const avant = auctionYield(r);
  const apres = auctionYield({ ...r, tenor: s.devrait, maturityOn: undefined });
  console.log(`${r.country} · ${r.sessionOn} · ${r.codeEmission}`);
  console.log(`   enregistré « ${r.tenor} » (${tenorYears(r.tenor)?.toFixed(3)} an) · la pièce et le code disent « ${s.devrait} » (${tenorYears(s.devrait)?.toFixed(3)} an)`);
  console.log(`   échéance imprimée : ${r.maturityOn ?? "aucune"}`);
  console.log(`   taux précompté servi : moyen ${r.rateAvg ?? "—"} · limite ${r.rateLimit ?? "—"}`);
  console.log(`   rendement publié     : ${avant ? `${avant.pct.toFixed(3)} % (${avant.origin})` : "aucun"}`);
  console.log(`   rendement à 13 sem.  : ${apres ? `${apres.pct.toFixed(3)} %` : "aucun"}`);
  if (avant && apres) console.log(`   écart : ${Math.round((apres.pct - avant.pct) * 100)} points de base\n`);
  else console.log("");
}
