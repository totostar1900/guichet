/**
 * LE MODULE D'AMORTISSEMENT, CONFRONTÉ AUX TRENTE ET UNE LIGNES RÉELLES.
 *
 * Un module qui passe ses tests sur six séries choisies n'a rien prouvé :
 * les tests gardent ce qu'on a compris, la mesure dit ce qu'on a manqué. On
 * lui donne donc toute la cote et on regarde combien de lignes rendent un
 * pas, combien restent muettes, et si une seule rend un pas aberrant.
 *
 *   npx tsx --conditions=react-server scripts/amortissement-mesure.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { createClient } = await import("@supabase/supabase-js");
const { lireAmortissement, echeancierDe } = await import("../src/lib/market/amortissement.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

/* La pagination : le client plafonne à mille lignes en silence. */
const lignes = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("debt_outstandings").select("*").order("session_date").order("isin").range(de, de + 999);
  if (error) throw new Error(error.message);
  lignes.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
const derniere = lignes.reduce((a, l) => (l.session_date > a ? l.session_date : a), "");
const vivantes = lignes.filter((l) => l.session_date === derniere);
dire(`${lignes.length} relevés · séance ${derniere} · ${vivantes.length} lignes vivantes\n`);

/* LES QUATRE RANGÉES DÉCALÉES SONT ÉCARTÉES DE LA LECTURE DU PAS, et c'est
   le garde d'hier qui les désigne : une rangée dont les titres sont ceux
   d'une voisine porte aussi son nominal, et elle insérerait un faux palier. */
const titresHabituels = new Map();
for (const l of lignes) {
  const c = titresHabituels.get(l.isin) ?? new Map();
  c.set(l.units, (c.get(l.units) ?? 0) + 1);
  titresHabituels.set(l.isin, c);
}
const majoritaires = new Map([...titresHabituels].map(([isin, c]) => [isin, [...c].sort((a, b) => b[1] - a[1])[0][0]]));
const propres = lignes.filter((l) => l.units === majoritaires.get(l.isin));
dire(`${lignes.length - propres.length} rangée(s) décalée(s) écartée(s) de la lecture du pas\n`);

let mesures = 0, supposes = 0, aberrants = 0;
const tranchesVues = new Map();
const table = [];
for (const v of vivantes) {
  const histo = propres.filter((l) => l.isin === v.isin);
  const paliers = [...new Map(histo.map((l) => [Number(l.nominal_remaining), { nominal: Number(l.nominal_remaining), depuis: l.session_date }])).values()]
    .sort((a, b) => a.depuis.localeCompare(b.depuis));
  const origine = Number(v.amount_raised) / Number(v.units);
  const a = lireAmortissement(paliers, origine, Number(v.nominal_remaining));
  if (a.source === "mesure") mesures++; else supposes++;
  aberrants += a.aberrants.length;
  if (a.tranches) tranchesVues.set(a.tranches, (tranchesVues.get(a.tranches) ?? 0) + 1);
  table.push({ v, a, origine });
}

dire(`pas MESURÉ    ${mesures} ligne(s)`);
dire(`pas SUPPOSÉ   ${supposes} ligne(s) (aucun palier n'a encore bougé)`);
dire(`paliers aberrants désignés : ${aberrants}`);
dire(`nombres de tranches rencontrés : ${[...tranchesVues].sort((a,b)=>a[0]-b[0]).map(([t,n])=>`${t} tranches ×${n}`).join(" · ")}\n`);

dire(`${"ISIN".padEnd(14)}${"mnémo".padEnd(8)}${"ans".padStart(4)}${"pér".padStart(6)}${"nominal".padStart(11)}${"pas".padStart(10)}${"tr.".padStart(5)}${"rest.".padStart(7)}  source`);
for (const { v, a, origine } of table.sort((x, y) => (x.a.source === y.a.source ? 0 : x.a.source === "mesure" ? -1 : 1))) {
  dire(
    `${v.isin.padEnd(14)}${(v.mnemo ?? "").padEnd(8)}${String(v.maturity_years ?? "").padStart(4)}${(v.periodicity ?? "").padStart(6)}` +
      `${Math.round(origine).toLocaleString("fr-FR").padStart(11)}${(a.pas ? Math.round(a.pas).toLocaleString("fr-FR") : "—").padStart(10)}` +
      `${String(a.tranches ?? "—").padStart(5)}${String(a.restantes ?? "—").padStart(7)}  ${a.source}${a.aberrants.length ? `  ⚠ ${a.aberrants.length} palier(s) aberrant(s)` : ""}`,
  );
}

/* L'ÉCHÉANCIER COMPLET, et le contrôle qui le garde : la somme des capitaux
   d'une ligne doit rendre son encours, au franc près. */
let total = 0, ecartMax = 0;
for (const { v, a } of table) {
  const e = echeancierDe({
    isin: v.isin, tauxPct: Number(v.coupon_rate), encours: Number(v.outstanding),
    amortissement: v.amortisation, periodicite: v.periodicity,
    prochainCoupon: v.next_coupon_on, echeance: new Date(Date.UTC(new Date(v.first_listed_on).getUTCFullYear() + Number(v.maturity_years), new Date(v.first_listed_on).getUTCMonth(), new Date(v.first_listed_on).getUTCDate())).toISOString().slice(0, 10),
    tranchesRestantes: a.restantes,
  });
  const somme = e.reduce((s, t) => s + t.capital, 0);
  ecartMax = Math.max(ecartMax, Math.abs(somme - Number(v.outstanding)));
  total += e.reduce((s, t) => s + t.capital + t.coupon, 0);
}
dire(`\nservice total à venir : ${(total/1e9).toLocaleString("fr-FR",{maximumFractionDigits:1})} Mds`);
dire(`écart maximal entre la somme des capitaux d'une ligne et son encours : ${Math.round(ecartMax)} franc(s)`);
