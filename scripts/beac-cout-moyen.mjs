/**
 * Notre coût moyen des ressources contre celui que la BEAC publie.
 *
 * Les statistiques mensuelles de la BEAC annoncent « le coût moyen des
 * ressources » de la zone : 8,29 % en juin 2026, 8,53 % à fin juillet. C'est le
 * seul chiffre qu'elle publie qui soit directement comparable à ce que nous
 * calculons, et donc le seul contrôle externe dont nous disposions.
 *
 * Un écart ne dira pas qui a tort : leur périmètre est l'encours de tous les
 * Trésors, le nôtre les séances que nous avons relues. Mais un écart de
 * plusieurs points appellerait une explication, et un écart de quelques
 * dizaines de points de base vaudrait validation.
 *
 *   npx tsx scripts/beac-cout-moyen.mjs [AAAA-MM]
 */
import fs from "node:fs";
import { auctionYield } from "../src/lib/market/yield.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const rows = (
  await fetch(`${v("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: v("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${v("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).then((r) => r.json())
).map(toAuctionResult);

/** Les mois que la BEAC a publiés, et ce qu'elle y annonce. */
const BEAC = { "2026-06": 8.29, "2026-07": 8.53 };
const mois = process.argv[2];
const fenetres = mois ? [mois] : Object.keys(BEAC);

const moyenne = (l, poids) => {
  const p = l.reduce((n, x) => n + (poids(x) ?? 0), 0);
  if (!p) return undefined;
  return l.reduce((n, x) => n + (auctionYield(x)?.pct ?? 0) * (poids(x) ?? 0), 0) / p;
};

for (const m of fenetres) {
  const siennes = rows.filter((r) => r.sessionOn.startsWith(m) && auctionYield(r));
  const relues = siennes.filter((r) => r.confirmedBy);
  const servi = (r) => r.served ?? r.amountServed ?? r.announced ?? undefined;
  console.log(`\n${m} · ${siennes.length} séance(s) au dépôt, ${relues.length} relue(s)`);
  const nonPond = siennes.length ? siennes.reduce((n, r) => n + auctionYield(r).pct, 0) / siennes.length : undefined;
  const pond = moyenne(siennes, servi);
  const pondRelues = moyenne(relues, servi);
  const dit = (x) => (x == null ? "—" : `${x.toFixed(2)} %`);
  console.log(`   moyenne simple, toutes séances          ${dit(nonPond)}`);
  console.log(`   moyenne pondérée par le montant servi   ${dit(pond)}`);
  console.log(`   la même, séances relues seulement       ${dit(pondRelues)}`);
  if (BEAC[m] != null) {
    console.log(`   BEAC, coût moyen des ressources         ${BEAC[m].toFixed(2)} %`);
    if (pond != null) console.log(`   écart sur la pondérée                   ${Math.round((pond - BEAC[m]) * 100)} pb`);
  }
  /* Le détail par instrument : le coût moyen de la BEAC mêle bons et obligations. */
  for (const inst of ["BTA", "OTA"]) {
    const l = siennes.filter((r) => r.instrument === inst);
    if (l.length) console.log(`   dont ${inst} : ${l.length} séance(s), ${dit(moyenne(l, servi))}`);
  }
}
