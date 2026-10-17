/**
 * LE RESTE D ARRONDI DES ONZE GABONAISES.
 *
 * Apres avoir rendu le prix moyen pied de coupon, quatre seances restent
 * hors de l ordre, d un cheveu : de douze a vingt-six MILLIEMES au-dessus
 * du maximum propose. L ecart vient de la convention de decompte des jours
 * du coupon couru, que le Tresor n imprime pas et que nous avons supposee
 * en exact/365.
 *
 * TROIS SONT EXACTES PAR ARITHMETIQUE, pas par estimation. Leur prix limite
 * EGALE leur prix maximum : il n y a donc eu qu un seul prix servi, et la
 * moyenne ponderee d un seul prix est ce prix. On l ecrit tel quel.
 *
 *   GA2A00000183   limite 92,5 = max 92,5
 *   GA2K00000041   limite 91,5 = max 91,5
 *   GA2J00000325   limite 91   = max 91
 *
 * LA QUATRIEME EST BORNEE, pas devinee. GA2B00000158 sert de 90 a 91 et
 * notre calcul donne 91,012 : la moyenne ne PEUT pas depasser le plus haut
 * servi, et l excedent de douze milliemes tient au decompte des jours. On
 * la ramene au maximum, en le disant.
 *
 * Dans les deux cas on n invente rien : on applique une borne que la piece
 * elle-meme impose.
 *
 *   npx tsx --conditions=react-server scripts/corriger-prix-sale-arrondi.mjs [--ecrire]
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
const fr = (v) => Number(v).toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const toutes = await repo().listAuctionResults({ limit: 2000 });
/* On ne vise QUE les lignes deja corrigees, reconnues a leur note : une
   autre seance au-dessus de son maximum n aurait pas la meme cause. */
const vise = toutes.filter(
  (r) => r.instrument === "OTA" && r.correction?.includes("pied de coupon") && r.priceMax != null && r.priceAvg != null && r.priceAvg > r.priceMax,
);
dire(`${vise.length} seance(s) encore au-dessus de leur maximum\n`);

let n = 0;
for (const r of vise) {
  const exact = Number(r.priceLimit) === Number(r.priceMax);
  const cible = Number(r.priceMax);
  const ecart = Number(r.priceAvg) - cible;
  const pourquoi = exact
    ? `Prix limite et prix maximum sont le même nombre, ${r.priceMax} % : il n'y a eu qu'un seul prix servi, et la moyenne pondérée d'un seul prix est ce prix. Les ${fr(ecart * 1000)} millièmes d'écart de notre calcul viennent de la convention de décompte des jours du coupon couru, que le Trésor n'imprime pas.`
    : `La moyenne pondérée ne peut pas dépasser le plus haut prix servi, ${r.priceMax} %. L'excédent de ${fr(ecart * 1000)} millièmes tient à la convention de décompte des jours du coupon couru, supposée en exact/365 faute que le Trésor l'imprime. La valeur est ramenée à cette borne, que la pièce impose.`;

  dire(`   ${r.sessionOn} ${String(r.codeEmission).padEnd(14)} ${fr(r.priceAvg)} → ${fr(cible)}   ${exact ? "exact (limite = max)" : "borne au maximum"}`);
  if (!ecrire) continue;

  const { error } = await sb
    .from("auction_results")
    .update({ price_avg: cible, correction: `${r.correction}\n\n${pourquoi}`, updated_at: new Date().toISOString() })
    .eq("id", r.id);
  if (error) dire(`      ERREUR : ${error.message}`);
  else n++;
}

dire(ecrire ? `\n=== ${n} ligne(s) ajustee(s) ===` : `\nEssai a blanc. Relancer avec --ecrire.`);
