/**
 * CE QUE LE PANNEAU DE SANTÉ DIRA, CALCULÉ PAR SON PROPRE CODE.
 *
 * La page du desk demande une vraie session, et le mode démonstration n'a ni
 * dividendes ni capitalisations réelles. On appelle donc EXACTEMENT les
 * fonctions du panneau sur les vraies lignes.
 *
 *   npx tsx --conditions=react-server scripts/sante-indice-essai.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const { tout } = await import("./_journal.mjs");
const { santeIndice, evenementsDeDividende } = await import("../src/lib/market/sante-indice.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const bulletins = await tout(sb, "market_bulletins", "session_date, index_value");
const points = bulletins
  .filter((b) => b.index_value != null && Number(b.index_value) > 0)
  .map((b) => ({ date: String(b.session_date), value: Number(b.index_value) }))
  .sort((a, b) => a.date.localeCompare(b.date));

const q = await tout(sb, "quotes", "isin, mnemo, session_date, instrument, close, variation_pct, volume_traded, trades, shares_total, market_cap_total, market_cap_float, last_dividend, dividend_date, dividend_year");
const actions = q.filter((x) => x.instrument === "action");
const parMnemo = new Map();
for (const x of actions) {
  const h = parMnemo.get(x.mnemo) ?? { mnemo: x.mnemo, quotes: [] };
  h.quotes.push({
    sessionDate: String(x.session_date),
    close: x.close == null ? undefined : Number(x.close),
    variationPct: x.variation_pct == null ? undefined : Number(x.variation_pct),
    volumeTraded: x.volume_traded == null ? undefined : Number(x.volume_traded),
    trades: x.trades == null ? undefined : Number(x.trades),
    sharesTotal: x.shares_total == null ? undefined : Number(x.shares_total),
    marketCapTotal: x.market_cap_total == null ? undefined : Number(x.market_cap_total),
    lastDividend: x.last_dividend == null ? undefined : Number(x.last_dividend),
    dividendDate: x.dividend_date ?? undefined,
    dividendYear: x.dividend_year == null ? undefined : Number(x.dividend_year),
  });
  parMnemo.set(x.mnemo, h);
}
const histoires = [...parMnemo.values()].map((h) => ({ ...h, quotes: h.quotes.sort((a, b) => a.sessionDate.localeCompare(b.sessionDate)) }));
const derniere = [...new Set(actions.map((x) => String(x.session_date)))].sort().pop();
const poids = actions
  .filter((x) => String(x.session_date) === derniere && Number(x.market_cap_total ?? 0) > 0)
  .map((x) => ({
    mnemo: x.mnemo,
    close: Number(x.close ?? 0),
    capTotal: Number(x.market_cap_total ?? 0),
    capFloat: Number(x.market_cap_float ?? 0),
    lastDividend: x.last_dividend == null ? undefined : Number(x.last_dividend),
  }));

for (const p of ["total", "flottant"]) {
  const s = santeIndice(points, poids, histoires, p);
  dire(`\n=== PONDÉRATION : ${p.toUpperCase()} ===`);
  dire(`   concentration    ${s.concentration.nom} ${s.concentration.premier.toFixed(1)} % · trois premiers ${s.concentration.troisPremiers.toFixed(1)} %`);
  dire(`   rendement        ${s.rendement.pct?.toFixed(2) ?? "—"} % sur ${s.rendement.comptees}/${s.rendement.total} valeurs`);
  if (p === "total") {
    dire(`   cotations        ${s.souffle.negociees} négociées sur ${s.souffle.cotations} (${((100 * s.souffle.negociees) / s.souffle.cotations).toFixed(1)} %), ${s.souffle.seances} séances`);
    dire(`   niveaux          ${s.niveaux.distincts} distincts sur ${s.niveaux.points} (${((100 * s.niveaux.distincts) / s.niveaux.points).toFixed(1)} %)`);
    dire(`   repli maximum    ${s.repli.pct.toFixed(2)} % du ${s.repli.sommetLe} au ${s.repli.creuxLe}`);
    dire(`   volatilité       ${s.volatilite?.toFixed(2)} % par mois`);
    dire(`   rendement total  ${s.total.total?.toFixed(2)} % contre ${s.total.prix?.toFixed(2)} % pour le prix, ${s.total.detachements} détachement(s)`);
    dire(`\n   === LES DÉTACHEMENTS LUS ===`);
    for (const e of evenementsDeDividende(histoires).evenements) dire(`      ${e.date} ${e.mnemo.padEnd(7)} ${e.parAction} FCFA par action · ${(e.total / 1e9).toFixed(2)} Mds`);
    dire(`\n   === BÊTA PAR VALEUR ===`);
    for (const b of s.betas) dire(`      ${b.mnemo.padEnd(7)} ${b.beta == null ? "—" : b.beta.toFixed(2).padStart(6)} · ${b.mois} mois comparés, ${b.moisActifs} où elle bouge · ${b.hausses} hausses, ${b.baisses} baisses`);
  }
}
