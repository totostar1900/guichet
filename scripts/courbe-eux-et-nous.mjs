/**
 * LEUR COURBE ET LA NÔTRE, CÔTE À CÔTE.
 *
 * La BEAC calcule une courbe mensuelle par pays ; nous en calculons une à
 * partir des adjudications que nous avons lues. CE NE SONT PAS LES MÊMES
 * OBJETS, et c'est précisément pourquoi il faut les poser l'une à côté de
 * l'autre au lieu de les soustraire :
 *
 *   la leur sort d'un calcul dont la méthode n'est pas publiée avec le
 *   graphique, sur un périmètre qu'elle ne détaille pas ;
 *   la nôtre sort des séances elles-mêmes, taux servi par taux servi, et ne
 *   dit rien là où il n'y a pas eu de séance.
 *
 * UN ÉCART N'EST PAS UNE ERREUR. Il peut dire que la BEAC lisse, qu'elle
 * compte le secondaire, ou que nous n'avons pas la séance. Ce qui serait
 * grave, ce serait un écart QUI CHANGE DE SIGNE AU HASARD : là, l'un des deux
 * lecteurs se tromperait.
 *
 *   npx tsx --conditions=react-server scripts/courbe-eux-et-nous.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const { tout } = await import("./_journal.mjs");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const eux = await tout(sb, "beac_yield_curves", "mois, pays, tenor, annees, taux");
dire(`${eux.length} point(s) de la BEAC`);

/* LA NÔTRE : le taux servi d'une séance, ramené à son mois et à sa durée.
   Un bon s'adjuge à un taux, une obligation à un prix : seul le taux moyen
   pondéré d'un BTA se compare directement à un point de courbe, et le
   rendement d'une OTA quand nous l'avons calculé. */
const nous = await tout(sb, "auction_results", "country, session_on, instrument, tenor, rate_avg, yield_avg");
dire(`${nous.length} séance(s) chez nous`);

const ANNEES = (t) => {
  const m = String(t ?? "")
    .toLowerCase()
    .match(/^(\d+(?:[,.]\d+)?)\s*(semaines?|mois|ans?)$/);
  if (!m) return undefined;
  const n = Number(m[1].replace(",", "."));
  return m[2].startsWith("semaine") ? n / 52 : m[2] === "mois" ? n / 12 : n;
};

/* La leur, rangée par mois, pays et durée en années. */
const leur = new Map();
for (const p of eux) leur.set(`${String(p.mois).slice(0, 7)}|${p.pays}|${Number(p.annees).toFixed(2)}`, Number(p.taux));

/** La durée de la courbe la plus proche de celle d'une séance. */
const duréesDispo = [...new Set(eux.map((p) => Number(p.annees)))].sort((a, b) => a - b);

const couples = [];
for (const s of nous) {
  const taux = s.rate_avg ?? s.yield_avg;
  if (taux == null) continue;
  const a = ANNEES(s.tenor);
  if (a == null) continue;
  const mois = String(s.session_on).slice(0, 7);
  /* On ne rapproche que d'une durée VOISINE, pas de n'importe laquelle : un
     bon à 13 semaines ne se compare pas à un point de 1 an. */
  const proche = duréesDispo.reduce((best, x) => (Math.abs(x - a) < Math.abs(best - a) ? x : best), duréesDispo[0]);
  if (Math.abs(proche - a) > Math.max(0.1, a * 0.15)) continue;
  const v = leur.get(`${mois}|${s.country}|${proche.toFixed(2)}`);
  if (v == null) continue;
  couples.push({ mois, pays: s.country, instrument: s.instrument, tenor: s.tenor, annees: a, nous: Number(taux), beac: v, ecart: Number(taux) - v });
}

dire(`\n=== ${couples.length} SÉANCE(S) ONT UN POINT DE COURBE LE MÊME MOIS, MÊME PAYS, MÊME DURÉE ===`);
if (!couples.length) {
  dire(`   aucun rapprochement : les deux sources ne se recouvrent pas encore`);
  process.exit(0);
}

const med = (xs) => {
  const t = [...xs].sort((a, b) => a - b);
  return t.length % 2 ? t[(t.length - 1) / 2] : (t[t.length / 2 - 1] + t[t.length / 2]) / 2;
};

for (const p of [...new Set(couples.map((c) => c.pays))].sort()) {
  const ici = couples.filter((c) => c.pays === p);
  const e = ici.map((c) => c.ecart);
  const plus = e.filter((x) => x > 0.05).length;
  const moins = e.filter((x) => x < -0.05).length;
  dire(`\n   ${p}  ${ici.length} rapprochement(s)`);
  dire(`      écart médian          ${med(e) >= 0 ? "+" : ""}${med(e).toFixed(2)} point(s)`);
  dire(`      nous au-dessus d'eux  ${plus}`);
  dire(`      nous au-dessous       ${moins}`);
  dire(`      à cinq centièmes près ${ici.length - plus - moins}`);
}

dire(`\n=== LES DIX PLUS GRANDS ÉCARTS ===`);
for (const c of [...couples].sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart)).slice(0, 10)) {
  dire(`   ${c.mois} ${String(c.pays).padEnd(12)} ${c.instrument} ${String(c.tenor).padEnd(12)} nous ${c.nous.toFixed(2)} %   BEAC ${c.beac.toFixed(2)} %   écart ${c.ecart >= 0 ? "+" : ""}${c.ecart.toFixed(2)}`);
}

const tous = couples.map((c) => c.ecart);
dire(`\n=== L'ENSEMBLE ===`);
dire(`   écart médian ${med(tous) >= 0 ? "+" : ""}${med(tous).toFixed(2)} point(s) · ${tous.filter((x) => x > 0.05).length} au-dessus · ${tous.filter((x) => x < -0.05).length} au-dessous`);
dire(`\n   UN ÉCART MÉDIAN STABLE ET DE MÊME SIGNE EST UNE DIFFÉRENCE DE MÉTHODE.`);
dire(`   Un écart qui change de signe au hasard serait une erreur de lecture,`);
dire(`   chez eux ou chez nous.`);
