/**
 * L APE CONGO DU 29 MAI 2027 : QUEL CHAMP EST FAUX ?
 *
 * L offre se contredit : son titre et son champ « operation » disent
 * ABONDEMENT, son « lastCouponOn » vaut null, c est-a-dire « ligne neuve,
 * pas de coupon couru ». Les deux ne peuvent pas etre vrais, et s en
 * affranchir gonfle le rendement montre au client a 16,76 % quand le
 * marche congolais comparable paie 7,60 %.
 *
 * TROIS CHAMPS POURRAIENT ETRE EN CAUSE : le coupon couru, le prix, ou
 * l echeance. On ne choisit pas : on va voir ce que les PIECES disent,
 * c est-a-dire l avis d emission et le resultat d adjudication de cette
 * ligne, s ils existent.
 *
 *   npx tsx --conditions=react-server scripts/ape-congo-source.mjs
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
const dire = (s) => fs.writeSync(1, `${s}\n`);

const ISIN = "CG2A00000668";
const o = (await repo().listOffers()).find((x) => x.isin === ISIN);
if (!o) {
  dire("offre introuvable");
  process.exit(0);
}

dire(`=== CE QUE L OFFRE PORTE ===`);
dire(`   ${o.title}`);
dire(`   statut ${o.status} · operation ${o.operation} · masquee ${o.hidden ? "oui" : "non"}`);
dire(`   ouverture ${o.opensAt} · limite ${o.deadlineAt} · reglement ${o.settleOn}`);
dire(`   prix ${o.pricePct} · coupon ${o.couponRate} % · echeance ${o.maturityOn}`);
dire(`   lastCouponOn ${o.lastCouponOn === null ? "NULL (ligne neuve)" : (o.lastCouponOn ?? "absent")}`);
dire(`   nominal ${o.nominal} · volume ${o.sizeLabel ?? "—"}`);
dire(`   source ${o.documents?.length ?? 0} document(s)`);
for (const d of o.documents ?? []) dire(`      ${d.label ?? d.kind ?? "?"} · ${d.url ?? d.fileKey ?? ""}`);

/* ---- L AVIS D EMISSION DE CETTE LIGNE ---- */
const avis = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("emission_notices").select("*").range(de, de + 999);
  if (error) throw new Error(error.message);
  avis.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
const siens = avis.filter((a) => a.code_emission === ISIN);
dire(`\n=== ${siens.length} AVIS D EMISSION POUR CE CODE ===`);
for (const a of siens.sort((x, y) => String(x.session_on).localeCompare(String(y.session_on)))) {
  dire(`   seance ${a.session_on} · ${a.tenor ?? "—"} · echeance ${a.maturity_on ?? "—"} · reglement ${a.settle_on ?? "—"} · coupon ${a.coupon_rate ?? "—"} · remboursement ${a.redemption ?? "—"}`);
  dire(`      ${a.source_title}`);
}

/* ---- LES ADJUDICATIONS DE CETTE LIGNE ---- */
const res = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => r.codeEmission === ISIN);
dire(`\n=== ${res.length} RESULTAT(S) D ADJUDICATION POUR CE CODE ===`);
for (const r of res.sort((a, b) => a.sessionOn.localeCompare(b.sessionOn))) {
  dire(`   seance ${r.sessionOn} · ${r.tenor} · echeance ${r.maturityOn ?? "—"} · coupon ${r.couponRate ?? "—"} · prix ${r.priceMin ?? "—"}/${r.priceLimit ?? "—"}/${r.priceAvg ?? "—"}/${r.priceMax ?? "—"}`);
  dire(`      ${r.sourceUrl}`);
}

/* ---- CE QUE LE COUPON COURU VAUDRAIT ---- */
dire(`\n=== SI C EST BIEN UN ABONDEMENT ===`);
if (o.maturityOn && o.couponRate != null) {
  const e = new Date(o.maturityOn + "T00:00:00Z");
  const s = new Date(o.settleOn + "T00:00:00Z");
  const d = new Date(Date.UTC(s.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
  if (d > s) d.setUTCFullYear(d.getUTCFullYear() - 1);
  const dernier = d.toISOString().slice(0, 10);
  const j = Math.round((Date.parse(o.settleOn) - Date.parse(dernier)) / 86_400_000);
  dire(`   dernier anniversaire de coupon avant le reglement : ${dernier}`);
  dire(`   soit ${j} jours de couru, ${((o.couponRate * j) / 365).toFixed(3)} points de nominal`);
  dire(`   c est la valeur que « lastCouponOn » devrait porter si l abondement est reel.`);
}
