/**
 * LA PORTEE REELLE DU PRIX SALE : combien de seances le portent SANS SE TRAHIR ?
 *
 * Le test « prix moyen superieur au prix maximum propose » n a trouve que
 * onze seances, toutes gabonaises, et l hypothese du coupon couru les
 * explique toutes les onze. Mais ce test ne voit le defaut QUE quand le
 * coupon couru est assez gros pour faire deborder du maximum. Un couru de
 * deux points sur une fourchette large passe inapercu : meme faute, muette.
 *
 * LE SIGNE PLUS FIN. Le prix limite est le PLUS BAS servi, donc le prix
 * moyen pondere ne peut PAS lui etre superieur : la moyenne des prix servis
 * est au plus le plus haut d entre eux, mais elle ne peut depasser le
 * maximum propose, et surtout elle devrait rester dans la fourchette. Un
 * moyen au-dessus du limite est donc deja suspect, bien avant qu il
 * depasse le maximum.
 *
 * On compte, par pays, combien de seances sont dans ce cas, et parmi elles
 * combien s expliquent par le coupon couru.
 *
 *   npx tsx --conditions=react-server scripts/prix-sale-portee.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

function dernierCoupon(seance, echeance) {
  if (!echeance) return null;
  const s = new Date(seance + "T00:00:00Z");
  const e = new Date(echeance + "T00:00:00Z");
  const d = new Date(Date.UTC(s.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
  if (d > s) d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

const toutes = await repo().listAuctionResults({ limit: 2000 });
const otas = toutes.filter((r) => r.instrument === "OTA" && r.priceAvg != null && r.priceLimit != null);

const parPays = new Map();
const muettes = [];
for (const r of otas) {
  const c = parPays.get(r.country) ?? { n: 0, auDessus: 0, explique: 0, horsMax: 0 };
  c.n += 1;
  const auDessus = Number(r.priceAvg) > Number(r.priceLimit) + 0.01;
  if (auDessus) c.auDessus += 1;
  if (r.priceMax != null && Number(r.priceAvg) > Number(r.priceMax)) c.horsMax += 1;

  if (auDessus && r.couponRate != null && r.maturityOn) {
    const dc = dernierCoupon(r.sessionOn, r.maturityOn);
    const j = dc ? Math.round((Date.parse(r.sessionOn) - Date.parse(dc)) / 86400000) : null;
    const couru = j != null ? (Number(r.couponRate) * j) / 365 : null;
    /* « Explique » veut dire : en retirant le couru, le moyen revient au
       niveau du limite, a un point et demi pres. C est serre, et c est
       voulu : une explication qui accepte trois points accepterait tout. */
    if (couru != null && Math.abs(Number(r.priceAvg) - couru - Number(r.priceLimit)) < 1.5) {
      c.explique += 1;
      if (r.priceMax == null || Number(r.priceAvg) <= Number(r.priceMax)) muettes.push({ r, couru });
    }
  }
  parPays.set(r.country, c);
}

dire(`${otas.length} obligations avec un prix moyen et un prix limite\n`);
dire(`   ${"pays".padEnd(13)} ${"OTA".padStart(4)} ${"moyen > limite".padStart(15)} ${"dont hors maximum".padStart(18)} ${"explique par le couru".padStart(22)}`);
for (const [p, c] of [...parPays].sort((a, b) => b[1].auDessus - a[1].auDessus)) {
  dire(`   ${p.padEnd(13)} ${String(c.n).padStart(4)} ${String(c.auDessus).padStart(15)} ${String(c.horsMax).padStart(18)} ${String(c.explique).padStart(22)}`);
}

dire(`\n=== LES MUETTES : meme faute, mais sans depasser le maximum (${muettes.length}) ===`);
for (const { r, couru } of muettes.slice(0, 20)) {
  dire(
    `   ${r.sessionOn} ${String(r.country).padEnd(12)} ${String(r.codeEmission ?? "—").padEnd(14)} ` +
      `moyen ${Number(r.priceAvg).toFixed(3)} · couru ${couru.toFixed(3)} · pied ${(Number(r.priceAvg) - couru).toFixed(3)} · limite ${r.priceLimit} · max ${r.priceMax ?? "—"}`,
  );
}
if (muettes.length > 20) dire(`   … et ${muettes.length - 20} autres`);
