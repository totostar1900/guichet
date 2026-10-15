/**
 * LES CHIFFRES RÉELS DE LA MAQUETTE, SORTIS DE LA BASE.
 *
 * Une maquette sur des chiffres inventés ne montre rien : elle montre une mise
 * en page. Les écarts, les trous et les séries courtes sont justement ce qu'il
 * faut voir avant de coder, parce que ce sont eux qui cassent une disposition.
 *
 *   npx tsx --conditions=react-server scripts/maquette-donnees-beac.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const { tout } = await import("./_journal.mjs");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const courbes = await tout(sb, "beac_yield_curves", "mois, pays, tenor, annees, taux, source_titre");
const encours = await tout(sb, "beac_encours_officiel", "mois, pays, encours, numero, source_titre");
const couts = await tout(sb, "beac_cout_ressources", "mois, pays, instrument, taux");
const seances = await tout(sb, "auction_results", "country, instrument, tenor, session_on, maturity_on, served, rate_avg, yield_avg");
const ops = await tout(sb, "treasury_operations", "pays, operation, montant_realise");

const moisCourbe = [...new Set(courbes.map((c) => String(c.mois).slice(0, 7)))].sort();
const dernier = moisCourbe[moisCourbe.length - 1];

/* La courbe la plus récente, par pays. */
const derniereCourbe = {};
for (const c of courbes.filter((x) => String(x.mois).slice(0, 7) === dernier)) {
  (derniereCourbe[c.pays] ??= []).push({ t: c.tenor, a: Number(c.annees), v: Number(c.taux) });
}
for (const p of Object.keys(derniereCourbe)) derniereCourbe[p].sort((a, b) => a.a - b.a);

/* LE DIX ANS DE CHAQUE PAYS, MOIS PAR MOIS : une série longue dit ce qu'un
   instantané cache, et c'est la maturité la mieux couverte. */
const dixAns = {};
for (const c of courbes.filter((x) => Math.abs(Number(x.annees) - 10) < 0.01)) {
  (dixAns[c.pays] ??= []).push({ m: String(c.mois).slice(0, 7), v: Number(c.taux) });
}
for (const p of Object.keys(dixAns)) dixAns[p].sort((a, b) => a.m.localeCompare(b.m));

/* L'encours officiel, par mois et par pays. */
const serieEncours = {};
for (const e of encours) (serieEncours[e.pays] ??= []).push({ m: String(e.mois).slice(0, 7), v: Number(e.encours) / 1000 });
for (const p of Object.keys(serieEncours)) serieEncours[p].sort((a, b) => a.m.localeCompare(b.m));
/* LE TOTAL DE ZONE N EST IMPRIME QUE POUR LE MOIS DE LA PIECE : pour les sept
   autres colonnes il se refait par la somme des six pays, ce que la ligne
   « Total » de la piece a justement verifie colonne par colonne. */
const SIX = ["Cameroun", "Congo", "Gabon", "Tchad", "RCA", "Guinée éq."];
const parMois = new Map();
for (const e of encours) {
  if (!SIX.includes(e.pays)) continue;
  const m = String(e.mois).slice(0, 7);
  parMois.set(m, [...(parMois.get(m) ?? []), Number(e.encours) / 1000]);
}
serieEncours.CEMAC = [...parMois.entries()]
  .filter(([, v]) => v.length === 6)
  .map(([m, v]) => ({ m, v: v.reduce((a, b) => a + b, 0) }))
  .sort((a, b) => a.m.localeCompare(b.m));

/* Notre couverture, telle que le rapprochement la mesure. */
const moisEncours = [...new Set(encours.map((e) => String(e.mois)))].sort();
const auj = moisEncours[moisEncours.length - 1];
const nous = {};
for (const s of seances) {
  if (s.served == null) continue;
  if (s.maturity_on && String(s.maturity_on) <= auj) continue;
  nous[s.country] = (nous[s.country] ?? 0) + Number(s.served);
}
const flux = {};
for (const o of ops) {
  if (o.montant_realise == null) continue;
  const m = Number(o.montant_realise);
  if (o.operation === "emission" || o.operation === "abondement") flux[o.pays] = (flux[o.pays] ?? 0) + m;
  else if (o.operation === "remboursement") flux[o.pays] = (flux[o.pays] ?? 0) - m;
}

const PAYS = ["Cameroun", "Congo", "Gabon", "Tchad", "RCA", "Guinée éq."];
const couverture = PAYS.map((p) => ({
  pays: p,
  beac: Number(encours.find((e) => String(e.mois) === auj && e.pays === p)?.encours ?? 0) / 1000,
  communiques: (nous[p] ?? 0) / 1e9,
  rapports: (flux[p] ?? 0) / 1e9,
}));

/* Le coût des ressources le plus récent. */
const moisCout = [...new Set(couts.map((c) => String(c.mois)))].sort().pop();
const coutRecent = couts
  .filter((c) => String(c.mois) === moisCout)
  .map((c) => ({ pays: c.pays, instrument: c.instrument, taux: Number(c.taux) }))
  .sort((a, b) => a.instrument.localeCompare(b.instrument) || a.pays.localeCompare(b.pays));

/* Notre propre point de courbe, quand une séance tombe le même mois. */
const ANNEES = (t) => {
  const m = String(t ?? "")
    .toLowerCase()
    .match(/^(\d+(?:[,.]\d+)?)\s*(semaines?|mois|ans?)$/);
  if (!m) return undefined;
  const n = Number(m[1].replace(",", "."));
  return m[2].startsWith("semaine") ? n / 52 : m[2] === "mois" ? n / 12 : n;
};
const leur = new Map(courbes.map((c) => [`${String(c.mois).slice(0, 7)}|${c.pays}|${Number(c.annees).toFixed(2)}`, Number(c.taux)]));
const dispo = [...new Set(courbes.map((c) => Number(c.annees)))].sort((a, b) => a - b);
const nos = [];
for (const s of seances) {
  const taux = s.rate_avg ?? s.yield_avg;
  if (taux == null) continue;
  const a = ANNEES(s.tenor);
  if (a == null) continue;
  const proche = dispo.reduce((best, x) => (Math.abs(x - a) < Math.abs(best - a) ? x : best), dispo[0]);
  if (Math.abs(proche - a) > Math.max(0.1, a * 0.15)) continue;
  const v = leur.get(`${String(s.session_on).slice(0, 7)}|${s.country}|${proche.toFixed(2)}`);
  if (v == null) continue;
  nos.push({ m: String(s.session_on).slice(0, 7), pays: s.country, instrument: s.instrument, tenor: s.tenor, nous: Number(taux), beac: v });
}

const sortie = {
  dernier,
  moisCourbe,
  lu: { courbes: courbes.length, pieces: new Set(courbes.map((c) => c.source_titre)).size, encours: encours.length, couts: couts.length },
  derniereCourbe,
  dixAns,
  serieEncours,
  couverture,
  coutRecent,
  moisCout,
  nos: nos.sort((a, b) => b.m.localeCompare(a.m)),
};
fs.mkdirSync("C:/dev/guichet/public/maquette", { recursive: true });
fs.writeFileSync("C:/dev/guichet/public/maquette/beac.json", JSON.stringify(sortie, null, 1), "utf8");
dire(`${courbes.length} points de courbe · ${encours.length} encours · ${couts.length} coûts · ${nos.length} rapprochements`);
dire(`dernier mois de courbe : ${dernier} · pays : ${Object.keys(derniereCourbe).join(", ")}`);
dire(`séries de 10 ans : ${Object.entries(dixAns).map(([p, s]) => `${p} ${s.length}`).join(" · ")}`);
dire(`écrit dans public/maquette/beac.json`);
