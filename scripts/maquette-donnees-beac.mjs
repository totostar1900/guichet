/**
 * LES CHIFFRES RÉELS DE LA MAQUETTE DU MARCHÉ, SORTIS DE LA BASE.
 *
 * Une maquette sur des chiffres inventés ne montre rien : elle montre une mise
 * en page. Les écarts, les trous et les séries courtes sont justement ce qu'il
 * faut voir avant de coder, parce que ce sont eux qui cassent une disposition.
 *
 * CE QUI SORT D'ICI NOURRIT DES SÉLECTEURS, donc tout est servi en séries
 * complètes par pays et par mois, jamais en instantané : un sélecteur qui n'a
 * qu'un point à montrer n'est pas un sélecteur.
 *
 *   npx tsx --conditions=react-server scripts/maquette-donnees-beac.mjs
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

/**
 * UN PAYS S'ÉCRIT DE DEUX FAÇONS SELON LA TABLE, et c'est un défaut mesuré :
 * « Centrafrique » dans les rapports hebdomadaires, « RCA » dans la statistique
 * mensuelle. Sans ce ramène-à-un, la fiche de la RCA serait vide d'un côté.
 */
const PAYS = ["Cameroun", "Congo", "Gabon", "Tchad", "RCA", "Guinée éq."];
const nommer = (p) => {
  const f = String(p ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/cameroun|cameroon/.test(f)) return "Cameroun";
  if (/congo/.test(f)) return "Congo";
  if (/gabon/.test(f)) return "Gabon";
  if (/tchad|chad/.test(f)) return "Tchad";
  if (/centrafri|rca/.test(f)) return "RCA";
  if (/guinee|guinea|equato/.test(f)) return "Guinée éq.";
  if (/cemac/.test(f)) return "CEMAC";
  return String(p ?? "");
};
const m7 = (d) => String(d ?? "").slice(0, 7);
const trier = (a, b) => a.m.localeCompare(b.m);

const courbes = await tout(sb, "beac_yield_curves", "mois, pays, tenor, annees, taux, source_titre, reserves");
const encours = await tout(sb, "beac_encours_officiel", "mois, pays, encours, numero, source_titre");
const couts = await tout(sb, "beac_cout_ressources", "mois, pays, instrument, taux");
const seances = await tout(sb, "auction_results", "country, instrument, tenor, session_on, maturity_on, served, announced, bid, rate_avg, yield_avg");
const ops = await tout(sb, "treasury_operations", "pays, instrument, tenor, operation, montant, montant_realise, taux_participation, taux_souscription, operation_on, maturity_on");

/* ============ LES COURBES ============ */
/** Toutes les courbes, par mois puis par pays : c'est ce qu'un sélecteur sert. */
const parMoisPays = {};
for (const c of courbes) {
  const k = `${m7(c.mois)}|${nommer(c.pays)}`;
  (parMoisPays[k] ??= []).push({ t: c.tenor, a: Number(c.annees), v: Number(c.taux) });
}
for (const k of Object.keys(parMoisPays)) parMoisPays[k].sort((a, b) => a.a - b.a);

/** Une maturité suivie dans le temps, pour chaque pays. */
const serieMaturite = {};
for (const c of courbes) {
  const a = Number(c.annees);
  const k = `${nommer(c.pays)}|${a}`;
  (serieMaturite[k] ??= []).push({ m: m7(c.mois), v: Number(c.taux) });
}
for (const k of Object.keys(serieMaturite)) serieMaturite[k].sort(trier);

/**
 * LA PENTE : le dix ans moins le un an, mois par mois.
 *
 * C'est le prix du temps, et c'est la mesure qu'un graphique de courbe ne
 * montre pas : une courbe dit l'état d'un mois, la pente dit le mouvement. On
 * ne la calcule QUE si les deux points existent le même mois, sans quoi on
 * comparerait deux dates.
 */
const pente = {};
for (const p of PAYS) {
  const longs = new Map((serieMaturite[`${p}|10`] ?? []).map((x) => [x.m, x.v]));
  const courts = new Map((serieMaturite[`${p}|1`] ?? []).map((x) => [x.m, x.v]));
  const s = [...longs.keys()].filter((m) => courts.has(m)).sort().map((m) => ({ m, v: Number((longs.get(m) - courts.get(m)).toFixed(2)) }));
  if (s.length) pente[p] = s;
}

/* ============ L'ENCOURS ============ */
const serieEncours = {};
for (const e of encours) {
  const p = nommer(e.pays);
  if (p === "CEMAC") continue;
  (serieEncours[p] ??= []).push({ m: m7(e.mois), v: Number(e.encours) / 1000 });
}
for (const p of Object.keys(serieEncours)) serieEncours[p].sort(trier);
/* Le total de zone n'est imprimé que pour le mois de la pièce : ailleurs il se
   refait par la somme des six pays, ce que la ligne « Total » a vérifié. */
const parMoisEnc = new Map();
for (const e of encours) {
  const p = nommer(e.pays);
  if (p === "CEMAC") continue;
  const m = m7(e.mois);
  parMoisEnc.set(m, [...(parMoisEnc.get(m) ?? []), Number(e.encours) / 1000]);
}
serieEncours.CEMAC = [...parMoisEnc.entries()]
  .filter(([, v]) => v.length === 6)
  .map(([m, v]) => ({ m, v: v.reduce((a, b) => a + b, 0) }))
  .sort(trier);

/* ============ LE COÛT DES RESSOURCES ============ */
const serieCout = {};
for (const c of couts) (serieCout[`${nommer(c.pays)}|${c.instrument}`] ??= []).push({ m: m7(c.mois), v: Number(c.taux) });
for (const k of Object.keys(serieCout)) serieCout[k].sort(trier);

/* ============ LE PRÉVU ET LE RÉALISÉ, MOIS PAR MOIS ============ */
/**
 * CE QUE LES TRÉSORS ONT DEMANDÉ CONTRE CE QU'ILS ONT OBTENU.
 *
 * L'écart entre les deux est la mesure la plus directe de la tension du
 * marché, et elle ne se voit nulle part ailleurs : un communiqué de résultats
 * dit ce qui a été servi, il ne dit pas ce qui manquait.
 */
const offre = {};
for (const o of ops) {
  if (o.operation !== "emission" && o.operation !== "abondement") continue;
  const m = m7(o.operation_on);
  if (!/^\d{4}-\d{2}$/.test(m)) continue;
  const k = `${nommer(o.pays)}|${m}`;
  const x = (offre[k] ??= { prevu: 0, realise: 0, n: 0 });
  x.prevu += Number(o.montant ?? 0);
  x.realise += Number(o.montant_realise ?? 0);
  x.n++;
}
const seriePrevuRealise = {};
for (const [k, v] of Object.entries(offre)) {
  const [p, m] = k.split("|");
  (seriePrevuRealise[p] ??= []).push({ m, prevu: v.prevu / 1e9, realise: v.realise / 1e9, n: v.n });
}
for (const p of Object.keys(seriePrevuRealise)) seriePrevuRealise[p].sort(trier);

/* ============ LA DEMANDE : TAUX DE SOUSCRIPTION ============ */
const serieSouscription = {};
for (const o of ops) {
  if (o.taux_souscription == null) continue;
  const m = m7(o.operation_on);
  if (!/^\d{4}-\d{2}$/.test(m)) continue;
  (serieSouscription[`${nommer(o.pays)}|${m}`] ??= []).push(Number(o.taux_souscription));
}
const souscription = {};
for (const [k, v] of Object.entries(serieSouscription)) {
  const [p, m] = k.split("|");
  (souscription[p] ??= []).push({ m, v: Number((v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)), n: v.length });
}
for (const p of Object.keys(souscription)) souscription[p].sort(trier);

/* ============ LE MUR D'ÉCHÉANCES ============ */
/**
 * CE QUI TOMBE, TRIMESTRE PAR TRIMESTRE.
 *
 * Sur les lignes dont nous connaissons l'échéance ET le montant servi. Les
 * trimestres vides sont gardés : un trou dans un mur est une information, et
 * le supprimer ferait croire à un échéancier régulier.
 */
const trimestre = (d) => {
  const an = String(d).slice(0, 4);
  const mo = Number(String(d).slice(5, 7));
  return `${an}-T${Math.floor((mo - 1) / 3) + 1}`;
};
const mur = {};
for (const o of ops) {
  if (!o.maturity_on || o.montant_realise == null) continue;
  if (o.operation !== "emission" && o.operation !== "abondement") continue;
  const k = `${nommer(o.pays)}|${trimestre(o.maturity_on)}`;
  mur[k] = (mur[k] ?? 0) + Number(o.montant_realise) / 1e9;
}
const serieMur = {};
for (const [k, v] of Object.entries(mur)) {
  const [p, t] = k.split("|");
  (serieMur[p] ??= []).push({ m: t, v: Number(v.toFixed(2)) });
}
for (const p of Object.keys(serieMur)) serieMur[p].sort(trier);

/* ============ NOTRE COUVERTURE ============ */
const moisEncours = [...new Set(encours.map((e) => String(e.mois)))].sort();
const auj = moisEncours[moisEncours.length - 1];
const nousStock = {};
const nbSeances = {};
for (const s of seances) {
  const p = nommer(s.country);
  nbSeances[p] = (nbSeances[p] ?? 0) + 1;
  if (s.served == null) continue;
  if (s.maturity_on && String(s.maturity_on) <= auj) continue;
  nousStock[p] = (nousStock[p] ?? 0) + Number(s.served);
}
const flux = {};
for (const o of ops) {
  if (o.montant_realise == null) continue;
  const p = nommer(o.pays);
  const m = Number(o.montant_realise);
  if (o.operation === "emission" || o.operation === "abondement") flux[p] = (flux[p] ?? 0) + m;
  else if (o.operation === "remboursement") flux[p] = (flux[p] ?? 0) - m;
}
const couverture = PAYS.map((p) => ({
  pays: p,
  beac: Number(encours.find((e) => String(e.mois) === auj && nommer(e.pays) === p)?.encours ?? 0) / 1000,
  communiques: (nousStock[p] ?? 0) / 1e9,
  rapports: (flux[p] ?? 0) / 1e9,
  seances: nbSeances[p] ?? 0,
  operations: ops.filter((o) => nommer(o.pays) === p).length,
}));

/* ============ NOS SÉANCES CONTRE LEUR COURBE ============ */
const ANNEES = (t) => {
  const m = String(t ?? "")
    .toLowerCase()
    .match(/^(\d+(?:[,.]\d+)?)\s*(semaines?|mois|ans?)$/);
  if (!m) return undefined;
  const n = Number(m[1].replace(",", "."));
  return m[2].startsWith("semaine") ? n / 52 : m[2] === "mois" ? n / 12 : n;
};
const leur = new Map(courbes.map((c) => [`${m7(c.mois)}|${nommer(c.pays)}|${Number(c.annees).toFixed(2)}`, Number(c.taux)]));
const dispo = [...new Set(courbes.map((c) => Number(c.annees)))].sort((a, b) => a - b);
const nos = [];
for (const s of seances) {
  const taux = s.rate_avg ?? s.yield_avg;
  if (taux == null) continue;
  const a = ANNEES(s.tenor);
  if (a == null) continue;
  const proche = dispo.reduce((best, x) => (Math.abs(x - a) < Math.abs(best - a) ? x : best), dispo[0]);
  if (Math.abs(proche - a) > Math.max(0.1, a * 0.15)) continue;
  const v = leur.get(`${m7(s.session_on)}|${nommer(s.country)}|${proche.toFixed(2)}`);
  if (v == null) continue;
  nos.push({ m: m7(s.session_on), pays: nommer(s.country), instrument: s.instrument, tenor: s.tenor, a, nous: Number(taux), beac: v });
}

/* ============ L'INVENTAIRE, QUI DIT CE QUI MANQUE ============ */
const moisCourbe = [...new Set(courbes.map((c) => m7(c.mois)))].sort();
const moisTous = [...new Set([...moisCourbe, ...Object.values(serieEncours).flat().map((x) => x.m), ...Object.values(souscription).flat().map((x) => x.m)])].sort();

const sortie = {
  pays: PAYS,
  moisCourbe,
  moisTous,
  dernier: moisCourbe[moisCourbe.length - 1],
  maturites: dispo,
  lu: {
    courbes: courbes.length,
    feuilles: new Set(courbes.map((c) => c.source_titre)).size,
    encours: encours.length,
    couts: couts.length,
    seances: seances.length,
    operations: ops.length,
  },
  parMoisPays,
  serieMaturite,
  pente,
  serieEncours,
  serieCout,
  seriePrevuRealise,
  souscription,
  serieMur,
  couverture,
  nos: nos.sort((a, b) => b.m.localeCompare(a.m)),
};
fs.mkdirSync(new URL("../public/maquette", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("../public/maquette/beac-donnees.js", import.meta.url), `window.BEAC = ${JSON.stringify(sortie)};\n`, "utf8");
dire(`${courbes.length} points de courbe · ${encours.length} encours · ${couts.length} coûts · ${ops.length} opérations · ${nos.length} rapprochements`);
dire(`mois couverts : ${moisTous.length}, de ${moisTous[0]} à ${moisTous[moisTous.length - 1]}`);
dire(`pente : ${Object.entries(pente).map(([p, s]) => `${p} ${s.length}`).join(" · ")}`);
dire(`prévu/réalisé : ${Object.entries(seriePrevuRealise).map(([p, s]) => `${p} ${s.length}`).join(" · ")}`);
dire(`souscription : ${Object.entries(souscription).map(([p, s]) => `${p} ${s.length}`).join(" · ")}`);
dire(`mur : ${Object.entries(serieMur).map(([p, s]) => `${p} ${s.length}`).join(" · ")}`);
dire(`écrit dans public/maquette/beac-donnees.js (${Math.round(fs.statSync(new URL("../public/maquette/beac-donnees.js", import.meta.url)).size / 1024)} Ko)`);
