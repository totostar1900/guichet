/**
 * LES ONZE GABONAISES : RENDRE LE PRIX MOYEN PIED DE COUPON.
 *
 * Le Tresor gabonais imprime son prix moyen pondere COUPON COMPRIS pendant
 * que les bornes des soumissions sont PIED DE COUPON. Sur onze seances le
 * coupon couru est assez gros pour que le moyen depasse le maximum propose,
 * ce qui est impossible et trahit la convention.
 *
 * Decision de Georges le 17 octobre 2026 : corriger ces onze, qui sont
 * prouvees, et ne pas toucher aux dix-neuf autres seances gabonaises, ou la
 * meme faute est probable mais indiscernable.
 *
 * ON NE SE FIE PAS A UNE LISTE. Le script retrouve lui-meme les seances par
 * leur signature, et refuse d ecrire si la verification ne tombe pas :
 *
 *   le prix moyen depasse le prix maximum propose, ce qui est impossible ;
 *   en retranchant le coupon couru, il revient DANS la fourchette.
 *
 * Une seance qui remplit la premiere condition sans la seconde n est pas
 * comprise, et on n y touche pas.
 *
 * LE COUPON COURU se compte depuis le dernier anniversaire de coupon, lui
 * meme deduit de l echeance : une obligation paie au meme jour de l annee
 * que son remboursement.
 *
 * LA LIGNE REPART A RELIRE. Sa valeur change apres sa signature, et une
 * signature couvre un chiffre, pas une ligne.
 *
 *   npx tsx --conditions=react-server scripts/corriger-prix-sale-gabon.mjs [--ecrire]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ecrire = process.argv.includes("--ecrire");

function dernierCoupon(seance, echeance) {
  const s = new Date(seance + "T00:00:00Z");
  const e = new Date(echeance + "T00:00:00Z");
  const d = new Date(Date.UTC(s.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
  if (d > s) d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.toISOString().slice(0, 10);
}
const fr = (v, n = 3) => Number(v).toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n });

const toutes = await repo().listAuctionResults({ limit: 2000 });
const vise = toutes.filter(
  (r) => r.instrument === "OTA" && r.priceMin != null && r.priceMax != null && r.priceAvg != null && r.priceAvg > r.priceMax,
);
dire(`${vise.length} seance(s) portent la signature\n`);

const retenues = [];
for (const r of vise) {
  if (r.couponRate == null || !r.maturityOn) { dire(`   ${r.sessionOn} ${r.codeEmission} : echeance ou coupon manquant, laissee`); continue; }
  const dc = dernierCoupon(r.sessionOn, r.maturityOn);
  const jours = Math.round((Date.parse(r.sessionOn) - Date.parse(dc)) / 86400000);
  const couru = (Number(r.couponRate) * jours) / 365;
  const pied = Math.round((Number(r.priceAvg) - couru) * 1000) / 1000;
  if (!(pied >= Number(r.priceMin) - 0.05 && pied <= Number(r.priceMax) + 0.05)) {
    dire(`   ${r.sessionOn} ${r.codeEmission} : pied ${fr(pied)} hors de [${r.priceMin} ; ${r.priceMax}], NON COMPRISE, laissee`);
    continue;
  }
  retenues.push({ r, dc, jours, couru, pied });
  dire(`   ${r.sessionOn} ${String(r.codeEmission).padEnd(14)} ${fr(r.priceAvg)} → ${fr(pied)}   couru ${fr(couru)} sur ${String(jours).padStart(3)} j depuis le ${dc}`);
}

dire(`\n=== ${retenues.length} retenue(s), ${vise.length - retenues.length} laissee(s) ===`);
if (!ecrire) { dire("\nEssai a blanc. Relancer avec --ecrire."); process.exit(0); }

let n = 0;
for (const { r, dc, jours, couru, pied } of retenues) {
  const note =
    `Prix moyen pondéré rendu pied de coupon. Le Trésor gabonais l'imprime COUPON COMPRIS, ${fr(r.priceAvg)} %, ` +
    `alors que ses bornes de soumission sont pied de coupon, de ${r.priceMin} % à ${r.priceMax} % : un prix moyen au-dessus du plus haut proposé est impossible. ` +
    `Coupon couru de ${fr(couru)} points, soit ${r.couponRate} % sur ${jours} jours depuis le ${dc}, dernier anniversaire déduit de l'échéance du ${r.maturityOn}. ` +
    `Reste ${fr(pied)} %, qui retombe dans la fourchette. Vérifié sur les onze séances gabonaises portant cette signature, onze sur onze. ` +
    `Les autres séances gabonaises, où la même convention est probable mais indiscernable, n'ont pas été touchées.`;
  const { error } = await sb
    .from("auction_results")
    .update({ price_avg: pied, correction: note, confirmed_by: null, confirmed_at: null, updated_at: new Date().toISOString() })
    .eq("id", r.id);
  if (error) dire(`   ERREUR ${r.codeEmission} : ${error.message}`);
  else n++;
}
dire(`\n=== ${n} ligne(s) corrigee(s) et rouverte(s) ===`);
