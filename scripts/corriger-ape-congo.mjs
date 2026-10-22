/**
 * L APE CONGO DU 29 MAI 2027 : DEUX CHAMPS, DEUX DEFAUTS.
 *
 * LE COUPON COURU. L offre porte « operation = abondement » et son titre le
 * dit, mais « lastCouponOn » vaut null, c est-a-dire « ligne neuve, pas de
 * coupon couru ». L avis d emission tranche sans appel : « Communique
 * d annonce OTA 2 ans ABONDEMENT du 22 septembre 2026 », echeance
 * 2027-05-29, reglement 2026-09-24. Une obligation paie son coupon au meme
 * jour de l annee que son remboursement : le dernier anniversaire avant le
 * reglement tombe donc le 29 mai 2026, et l acheteur doit 118 jours de
 * couru. S en affranchir lui offre un coupon qu il n a pas porte, et gonfle
 * le rendement affiche.
 *
 * LA MENTION « INDICATIF ». Aucun resultat d adjudication n existe pour ce
 * code : la seance est du 22 septembre, le jour meme ou la BEAC a cesse de
 * publier. Le prix de 95 est donc une ATTENTE, et il paraissait sans rien
 * qui le dise, c est-a-dire comme un prix ferme. Huit lignes ouvertes sur
 * dix sont dans ce cas ; on repare celle-ci, qui est sous les yeux.
 *
 * ON NE TOUCHE PAS AU PRIX. Rien ne dit qu il soit faux : il est seulement
 * non confirme, et le corriger au juge serait inventer un resultat que le
 * Tresor n a pas publie.
 *
 *   npx tsx --conditions=react-server scripts/corriger-ape-congo.mjs [--ecrire]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { repo } = await import("../src/lib/data/index.ts");
const { bondCalc } = await import("../src/lib/finance.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ecrire = process.argv.includes("--ecrire");

const ISIN = "CG2A00000668";
const o = (await repo().listOffers()).find((x) => x.isin === ISIN);
if (!o) {
  dire("offre introuvable");
  process.exit(1);
}

/* LA VERIFICATION AVANT L ECRITURE. On ne corrige que si la piece confirme
   l abondement : sans elle, changer un champ sur une intuition remplacerait
   une contradiction visible par une valeur fausse et silencieuse. */
const avis = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("emission_notices").select("code_emission,session_on,source_title,maturity_on,settle_on").range(de, de + 999);
  if (error) throw new Error(error.message);
  avis.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
const piece = avis.find((a) => a.code_emission === ISIN && /abondement/i.test(String(a.source_title)));
if (!piece) {
  dire("Aucun avis d emission ne confirme l abondement : on ne touche a rien.");
  process.exit(1);
}
if (piece.maturity_on !== o.maturityOn) {
  dire(`L echeance de l avis (${piece.maturity_on}) ne correspond pas a celle de l offre (${o.maturityOn}) : NON COMPRISE, on ne touche a rien.`);
  process.exit(1);
}
dire(`Piece : ${piece.source_title}`);
dire(`   echeance ${piece.maturity_on} · reglement ${piece.settle_on}\n`);

/* Le dernier anniversaire de coupon avant le reglement, deduit de l echeance. */
const e = new Date(`${o.maturityOn}T00:00:00Z`);
const s = new Date(`${o.settleOn}T00:00:00Z`);
const d = new Date(Date.UTC(s.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
if (d > s) d.setUTCFullYear(d.getUTCFullYear() - 1);
const dernierCoupon = d.toISOString().slice(0, 10);
const jours = Math.round((Date.parse(o.settleOn) - Date.parse(dernierCoupon)) / 86_400_000);

const base = { nominal: o.nominal, couponRate: o.couponRate, settleOn: o.settleOn, maturityOn: o.maturityOn, commissionPct: o.commissionPct };
const avant = bondCalc({ ...base, lastCouponOn: o.lastCouponOn }, 10_000_000, o.pricePct);
const apres = bondCalc({ ...base, lastCouponOn: dernierCoupon }, 10_000_000, o.pricePct);

dire(`=== CE QUE LA CORRECTION DEPLACE ===`);
dire(`   dernier coupon      ${o.lastCouponOn === null ? "null (ligne neuve)" : o.lastCouponOn}  →  ${dernierCoupon}`);
dire(`   couru par titre     ${avant.accruedPerTitle.toFixed(2)} F  →  ${apres.accruedPerTitle.toFixed(2)} F   (${jours} jours)`);
dire(`   decaisse            ${Math.round(avant.outlay).toLocaleString("fr-FR")} F  →  ${Math.round(apres.outlay).toLocaleString("fr-FR")} F`);
dire(`   rendement au client ${avant.irr.toFixed(2)} %  →  ${apres.irr.toFixed(2)} %`);
dire(`   le marche congolais comparable paie 7,60 %.`);
dire(`\n   La mention « indicatif » sera posee : aucun resultat d adjudication n existe`);
dire(`   pour ce code, la seance du 22 septembre n ayant jamais ete publiee.`);

if (!ecrire) {
  dire(`\nEssai a blanc. Relancer avec --ecrire.`);
  process.exit(0);
}

const { error } = await sb
  .from("offers")
  .update({
    last_coupon_on: dernierCoupon,
    price_note: "indicatif — prix à fixer à l'adjudication, résultats non publiés",
    updated_at: new Date().toISOString(),
  })
  .eq("id", o.id);
if (error) {
  dire(`\nERREUR : ${error.message}`);
  process.exit(1);
}
await repo().logEvent({
  kind: "desk",
  html:
    `${o.title} : coupon couru rétabli au ${dernierCoupon} (${jours} jours), l'avis d'émission confirmant l'abondement. ` +
    `Le rendement affiché passe de ${avant.irr.toFixed(2)} % à ${apres.irr.toFixed(2)} %. Prix marqué indicatif, les résultats du 22 septembre n'étant pas publiés.`,
  offerId: o.id,
});
dire(`\n=== corrigee ===`);
