/**
 * LA RÉCONCILIATION DE L'ENCOURS, SUR LES 808 SÉANCES.
 *
 * Un module qui boucle sur six cas écrits à la main n'a rien prouvé. On lui
 * donne la série entière, séance après séance, et on regarde trois choses :
 * si la somme boucle partout, combien de francs les TROUS déplacent, et ce
 * que la dette a réellement fait quand on retire les trous.
 *
 *   npx tsx --conditions=react-server scripts/mouvements-mesure.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { createClient } = await import("@supabase/supabase-js");
const { expliquerLeMouvement, parCause } = await import("../src/lib/market/mouvements.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const brut = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("debt_outstandings").select("*").order("session_date").order("isin").range(de, de + 999);
  if (error) throw new Error(error.message);
  brut.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
dire(`${brut.length} relevés lus\n`);

const echeanceDe = (l) => {
  if (!l.first_listed_on || l.maturity_years == null) return undefined;
  const d = new Date(`${l.first_listed_on}T12:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + Number(l.maturity_years));
  return d.toISOString().slice(0, 10);
};
const enLigne = (l) => ({
  isin: l.isin,
  units: Number(l.units),
  nominal: Number(l.nominal_remaining),
  coursPct: Number(l.price_pct),
  encours: Number(l.outstanding),
  echeance: echeanceDe(l),
});

const parSeance = new Map();
for (const l of brut) {
  const s = parSeance.get(l.session_date) ?? [];
  s.push(enLigne(l));
  parSeance.set(l.session_date, s);
}
const seances = [...parSeance.keys()].sort();
/* LA DERNIÈRE SÉANCE OÙ CHAQUE LIGNE PARAÎT : c est elle qui dit si une
   disparition est une sortie ou un trou, et elle ne se discute pas. */
const derniereVue = new Map();
for (const l of brut) if (!derniereVue.has(l.isin) || l.session_date > derniereVue.get(l.isin)) derniereVue.set(l.isin, l.session_date);

const cumul = { entree: 0, retour: 0, sortie: 0, echeance: 0, amortissement: 0, abondement: 0, revalorisation: 0, trou: 0 };
/* La PREMIÈRE séance où chaque ligne paraît : une réapparition après elle
   n est pas une émission. */
const premiereVue = new Map();
for (const l of brut) if (!premiereVue.has(l.isin) || l.session_date < premiereVue.get(l.isin)) premiereVue.set(l.isin, l.session_date);
let residuMax = 0, seancesAvecTrou = 0, nbTrous = 0, seancesAvecResidu = 0;
const grosTrous = [];

for (let i = 1; i < seances.length; i++) {
  const r = expliquerLeMouvement(parSeance.get(seances[i - 1]), parSeance.get(seances[i]), seances[i], (isin) => derniereVue.get(isin) > seances[i], (isin) => premiereVue.get(isin) < seances[i - 1]);
  const c = parCause(r);
  for (const k of Object.keys(cumul)) cumul[k] += c[k];
  /* LE RÉSIDU EST LE CONTRÔLE : il doit être nul par construction. Un franc
     de reste est de l'arrondi, mille francs sont une erreur de modèle. */
  if (Math.abs(r.residu) > 1) {
    seancesAvecResidu++;
    residuMax = Math.max(residuMax, Math.abs(r.residu));
  }
  if (r.trous.length) {
    seancesAvecTrou++;
    nbTrous += r.trous.length;
    const poids = r.trous.reduce((a, t) => a + Math.abs(t.montant), 0);
    if (grosTrous.length < 8 || poids > grosTrous[grosTrous.length - 1].poids) {
      grosTrous.push({ seance: seances[i], n: r.trous.length, poids, isins: r.trous.map((t) => t.isin).join(", ") });
      grosTrous.sort((a, b) => b.poids - a.poids);
      grosTrous.length = Math.min(grosTrous.length, 8);
    }
  }
}

const mds = (n) => (n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
dire(`=== LE CONTRÔLE ===`);
dire(`   séances enchaînées            ${seances.length - 1}`);
dire(`   séances dont la somme ne boucle pas   ${seancesAvecResidu}`);
dire(`   résidu maximal                ${Math.round(residuMax).toLocaleString("fr-FR")} franc(s)\n`);

dire(`=== CE QUI A FAIT BOUGER L'ENCOURS, CUMULÉ SUR TROIS ANS ET DEMI ===`);
for (const [k, v] of Object.entries(cumul)) dire(`   ${k.padEnd(16)} ${mds(v).padStart(10)} Mds`);
const vrai = cumul.entree + cumul.echeance + cumul.amortissement + cumul.abondement + cumul.revalorisation;
/* LE TROU ET LE RETOUR NE SE COMPENSENT PAS, et leur écart dit quelque chose :
   une ligne absente six mois s amortit quand même et revient plus basse. Cet
   amortissement-là n apparaît dans aucune cause, il est caché dans l écart.
   C est la part de l histoire que les trous ont mangée, et elle se chiffre. */
const cache = cumul.trou + cumul.retour;
dire(`
   somme des causes nommées            ${mds(vrai)} Mds  (hors trou et retour)`);
dire(`   amortissement CACHÉ dans les trous  ${mds(cache)} Mds`);
dire(`   variation observée                  ${mds(vrai + cache)} Mds`);
dire(`   premier encours ${mds(parSeance.get(seances[0]).reduce((a,l)=>a+l.encours,0))} → dernier ${mds(parSeance.get(seances[seances.length-1]).reduce((a,l)=>a+l.encours,0))} Mds\n`);

dire(`=== LES TROUS ===`);
dire(`   ${nbTrous} disparition(s) injustifiée(s) sur ${seancesAvecTrou} séance(s)\n`);
for (const t of grosTrous) dire(`   ${t.seance}  ${String(t.n).padStart(2)} ligne(s)  ${mds(t.poids).padStart(8)} Mds  ${t.isins.slice(0, 90)}`);
