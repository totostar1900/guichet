/**
 * NOS 249 COMMUNIQUÉS CONTRE LE LIVRE DES MOUVEMENTS.
 *
 * L'encours adjugé valait 645,6 Mds, reconstitué à partir des communiqués de
 * résultats, avec deux aveux : il ne comptait que les séances publiées, et il
 * supposait le remboursement in fine faute de le connaître.
 *
 * Le tableau de bord hebdomadaire est une SOURCE INDÉPENDANTE sur les mêmes
 * faits : il liste chaque émission, chaque abondement et chaque remboursement,
 * en francs, avec le code d'émission. Il permet donc de mesurer ce qu'un
 * chiffre ne dit jamais de lui-même : DE COMBIEN IL EST FAUX.
 *
 * TROIS QUESTIONS, ET AUCUNE NE SE DÉDUIT DES AUTRES :
 *
 *   une émission du livre a-t-elle son communiqué ? Ce qui manque mesure
 *   l'incomplétude de notre collecte, et non celle de la BEAC.
 *
 *   quand les deux parlent de la même séance, disent-ils le même montant ?
 *   Un écart dénonce une unité, une lecture, ou un abondement compté deux fois.
 *
 *   un titre émis est-il remboursé en une fois ? C'est la seule façon de
 *   remplacer l'hypothèse « in fine » par une mesure.
 *
 * LE LIVRE EST LUI AUSSI TROUÉ : 81 semaines sur les ~230 de la période. On ne
 * compare donc QUE sur les semaines couvertes, et le script le dit.
 *
 *   npx tsx --conditions=react-server scripts/adjudications-recoupement.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const mds = (n) => (n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 });

async function tout(table, colonnes) {
  const out = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from(table).select(colonnes).range(de, de + 999);
    if (error) throw new Error(`${table} : ${error.message}`);
    out.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  return out;
}

const ops = await tout("treasury_operations", "pays, instrument, tenor, code_emission, code_enchere, operation, montant, operation_on, settle_on, semaine_du, semaine_au, coupon_rate, maturity_on");
const comm = await tout("auction_results", "country, instrument, tenor, code_emission, session_on, served, announced, maturity_on, set_aside_reason");

/* LES SEMAINES COUVERTES PAR LE LIVRE : hors d'elles, une absence de
   communiqué ne prouve rien, et une absence d'opération non plus. */
const semaines = [...new Set(ops.map((o) => `${o.semaine_du}|${o.semaine_au}`))].map((k) => k.split("|"));
const couverte = (d) => !!d && semaines.some(([du, au]) => d >= du && d <= au);
dire(`${ops.length} opération(s) du livre sur ${semaines.length} semaine(s)`);
dire(`${comm.length} communiqué(s), dont ${comm.filter((c) => couverte(c.session_on)).length} dans une semaine couverte\n`);

/* ---- 1 · l'émission du livre a-t-elle son communiqué ? ---- */
const parCode = new Map();
for (const c of comm) if (c.code_emission) parCode.set(c.code_emission.trim().toUpperCase(), c);
const parJour = new Map();
for (const c of comm) parJour.set(`${c.country}|${c.instrument}|${c.session_on}`, c);

const levees = ops.filter((o) => o.operation === "emission" || o.operation === "abondement");
let avecCode = 0, avecJour = 0, sans = 0, montantSans = 0;
const manquants = [];
for (const o of levees) {
  const code = o.code_emission?.trim().toUpperCase();
  if (code && parCode.has(code)) { avecCode++; continue; }
  if (parJour.has(`${o.pays}|${o.instrument}|${o.operation_on}`)) { avecJour++; continue; }
  sans++;
  montantSans += Number(o.montant ?? 0);
  manquants.push(o);
}
dire(`=== 1 · LES LEVÉES DU LIVRE, RETROUVÉES DANS NOS COMMUNIQUÉS ===`);
dire(`   levées au livre (émissions et abondements)   ${levees.length} · ${mds(levees.reduce((a, o) => a + Number(o.montant ?? 0), 0))} Mds`);
dire(`   retrouvées par le code d'émission            ${avecCode}`);
dire(`   retrouvées par pays, instrument et date      ${avecJour}`);
dire(`   SANS COMMUNIQUÉ CHEZ NOUS                    ${sans} · ${mds(montantSans)} Mds`);
const parPaysManquant = new Map();
for (const o of manquants) {
  const v = parPaysManquant.get(o.pays) ?? { n: 0, m: 0 };
  v.n++; v.m += Number(o.montant ?? 0); parPaysManquant.set(o.pays, v);
}
for (const [p, v] of [...parPaysManquant.entries()].sort((a, b) => b[1].m - a[1].m)) dire(`      ${p.padEnd(16)} ${String(v.n).padStart(4)} · ${mds(v.m).padStart(8)} Mds`);

/* ---- 2 · quand les deux parlent, disent-ils la même chose ? ---- */
dire(`\n=== 2 · LE MÊME MONTANT DES DEUX CÔTÉS ? ===`);
const compares = [];
for (const o of levees) {
  const code = o.code_emission?.trim().toUpperCase();
  const c = (code && parCode.get(code)) || parJour.get(`${o.pays}|${o.instrument}|${o.operation_on}`);
  if (!c || c.served == null || o.montant == null) continue;
  /* Un abondement n'est pas la séance d'origine : on ne compare que les deux
     montants rattachés à la MÊME date, sinon on oppose deux faits différents. */
  if (c.session_on !== o.operation_on) continue;
  compares.push({ o, c, ecart: Number(o.montant) - Number(c.served) });
}
const justes = compares.filter((x) => Math.abs(x.ecart) <= 1);
dire(`   couples comparables (même date)   ${compares.length}`);
dire(`   montants identiques au franc      ${justes.length}`);
dire(`   montants différents               ${compares.length - justes.length}`);
for (const x of compares.filter((y) => Math.abs(y.ecart) > 1).slice(0, 8)) {
  dire(`      ${x.o.operation_on} ${x.o.pays} ${x.o.instrument} ${x.o.tenor ?? ""} · livre ${mds(x.o.montant)} Mds · communiqué ${mds(x.c.served)} Mds · écart ${mds(x.ecart)} Mds`);
}

/* ---- 3 · un titre est-il remboursé en une fois ? ---- */
dire(`\n=== 3 · LE REMBOURSEMENT EST-IL IN FINE ? ===`);
const remb = new Map();
for (const o of ops.filter((x) => x.operation === "remboursement")) {
  const code = o.code_emission?.trim().toUpperCase();
  if (!code) continue;
  remb.set(code, [...(remb.get(code) ?? []), o]);
}
const leveParCode = new Map();
for (const o of levees) {
  const code = o.code_emission?.trim().toUpperCase();
  if (!code) continue;
  leveParCode.set(code, (leveParCode.get(code) ?? 0) + Number(o.montant ?? 0));
}
let unSeul = 0, plusieurs = 0, soldes = 0;
const echelonnes = [];
for (const [code, xs] of remb) {
  if (xs.length === 1) unSeul++;
  else { plusieurs++; echelonnes.push({ code, n: xs.length, total: xs.reduce((a, x) => a + Number(x.montant ?? 0), 0) }); }
  const leve = leveParCode.get(code);
  const rendu = xs.reduce((a, x) => a + Number(x.montant ?? 0), 0);
  if (leve && Math.abs(leve - rendu) <= 1) soldes++;
}
dire(`   codes remboursés dans les semaines lues   ${remb.size}`);
dire(`   remboursés EN UNE SEULE FOIS              ${unSeul}`);
dire(`   remboursés en plusieurs fois             ${plusieurs}`);
dire(`   dont la somme rendue égale la somme levée ${soldes}   (les deux vues dans la fenêtre)`);
for (const e of echelonnes.sort((a, b) => b.n - a.n).slice(0, 8)) dire(`      ${e.code}  ${e.n} versements · ${mds(e.total)} Mds`);
dire(`\n   ATTENTION : le livre couvre ${semaines.length} semaines sur les ~230 de la période.`);
dire(`   « Une seule fois » peut vouloir dire « une seule fois VUE ».`);
