/**
 * LES DONNEES DE LA MAQUETTE « ENCOURS TRIMESTRIEL ».
 *
 * Chiffres REELS, lus dans beac_encours_lignes : 1 858 lignes, 11 arretes,
 * six Tresors, du 31 decembre 2019 au 30 juin 2022, tirees du bulletin
 * trimestriel de la BEAC.
 *
 * UNE MAQUETTE SUR DE FAUSSES DONNEES MENT DEUX FOIS : sur ce que la page
 * montrera, et sur ce qu il y a a montrer. Celle-ci se dessine sur le vrai.
 *
 *   npx tsx --conditions=react-server scripts/maquette-donnees-encours-trimestriel.mjs
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

async function toutes(table, colonnes) {
  const out = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from(table).select(colonnes).range(de, de + 999);
    if (error) throw new Error(`${table} : ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) return out;
  }
}

const lignes = await toutes("beac_encours_lignes", "arrete, pays, isin, instrument, emis_le, echeance_le, tenor, titres, faciale, encours, source_titre");
dire(`${lignes.length} lignes lues`);

const arretes = [...new Set(lignes.map((l) => l.arrete))].sort();
const pays = [...new Set(lignes.map((l) => l.pays))].sort();
const n = (v) => Number(v ?? 0);

/* L arc : total par arrete, et le nombre de Tresors qui le composent. Les
   deux vont ENSEMBLE, sans quoi la montee du debut se lirait comme une
   emission alors qu elle est une couverture qui s elargit. */
const arc = arretes.map((a) => {
  const d = lignes.filter((l) => l.arrete === a);
  return {
    arrete: a,
    total: d.reduce((s, l) => s + n(l.encours), 0),
    lignes: d.length,
    tresors: new Set(d.map((l) => l.pays)).size,
    bta: d.filter((l) => l.instrument === "BTA").reduce((s, l) => s + n(l.encours), 0),
    ota: d.filter((l) => l.instrument === "OTA").reduce((s, l) => s + n(l.encours), 0),
  };
});

/* Par Tresor : une serie par pays, vide la ou il n est pas au bulletin. */
const parPays = pays.map((p) => ({
  pays: p,
  points: arretes.map((a) => {
    const d = lignes.filter((l) => l.arrete === a && l.pays === p);
    return d.length ? d.reduce((s, l) => s + n(l.encours), 0) : null;
  }),
}));

/* Le profil d echeances au dernier arrete : ce que les Tresors devaient
   rembourser, et quand, vu du 30 juin 2022. */
const dernier = arretes[arretes.length - 1];
const ausDernier = lignes.filter((l) => l.arrete === dernier);
const bornes = [0, 0.25, 0.5, 1, 2, 3, 5, 7, 99];
const etiquettes = ["moins de 3 mois", "3 a 6 mois", "6 a 12 mois", "1 a 2 ans", "2 a 3 ans", "3 a 5 ans", "5 a 7 ans", "plus de 7 ans"];
const profil = etiquettes.map((e, i) => ({ tranche: e, capital: 0, lignes: 0, apres: 0 }));
let sansEcheance = 0;
for (const l of ausDernier) {
  if (!l.echeance_le) { sansEcheance += 1; continue; }
  const ans = (Date.parse(l.echeance_le) - Date.parse(dernier)) / (365.25 * 86400000);
  if (ans < 0) { profil[0].apres += n(l.encours); continue; }
  const k = bornes.findIndex((b, i) => i > 0 && ans <= b) - 1;
  const j = k < 0 ? profil.length - 1 : k;
  profil[j].capital += n(l.encours);
  profil[j].lignes += 1;
}

/* Les plus grosses lignes du dernier arrete, pour que la table ait un
   echantillon vrai plutot qu un lorem. */
const grosses = [...ausDernier]
  .sort((a, b) => n(b.encours) - n(a.encours))
  .slice(0, 14)
  .map((l) => ({
    pays: l.pays, isin: l.isin, instrument: l.instrument, tenor: l.tenor,
    emis: l.emis_le, echeance: l.echeance_le, titres: n(l.titres), faciale: n(l.faciale), encours: n(l.encours),
  }));

/* CE QUI NE SE JOINT PAS. Le BOC decrit la cote, ce bulletin l adjudication,
   et les deux populations sont DISJOINTES : aucun ISIN en commun. La page
   doit le dire avant de montrer quoi que ce soit. */
const isinsBulletin = new Set(lignes.map((l) => l.isin));
const boc = await toutes("debt_outstandings", "isin, session_date");
const isinsBoc = new Set(boc.map((b) => b.isin));
const communs = [...isinsBulletin].filter((i) => isinsBoc.has(i));
const seancesBoc = [...new Set(boc.map((b) => b.session_date))].sort();

/* Les douze lignes dont l echeance precede l arrete : une anomalie a dire,
   pas a masquer. */
const echues = lignes.filter((l) => l.echeance_le && l.echeance_le < l.arrete).length;

/* POURQUOI LA SERIE COMMENCE ET FINIT LA OU ELLE FINIT, et c est la premiere
   question qu on pose en la voyant. Le journal porte seize bulletins, n°1 a
   n°18, deux manquants. Les six plus anciens, de mars 2018 a septembre 2019,
   ne portent AUCUN tableau d encours : le registre n existait pas encore. Et
   le n°18 de juin 2022 est le dernier que la BEAC ait publie. La serie est
   donc fermee aux DEUX bouts par la source, pas par notre lecture. */
const { data: pieces } = await sb
  .from("beac_observations")
  .select("titre")
  .eq("genre", "bulletin")
  .ilike("titre", "%trimestriel du marché des titres publics%");
const numero = (t) => Number((String(t).match(/n°\s*(\d+)/) ?? [])[1] ?? 0);
const numeros = [...new Set((pieces ?? []).map((p) => numero(p.titre)).filter(Boolean))].sort((a, b) => a - b);
const avecTable = [...new Set(lignes.map((l) => numero(l.source_titre)))].sort((a, b) => a - b);
const sansTable = numeros.filter((x) => !avecTable.includes(x));
const absents = [];
for (let i = 1; i <= Math.max(...numeros); i++) if (!numeros.includes(i)) absents.push(i);

const donnees = {
  bulletins: numeros.length,
  bulletinsAvecTable: avecTable.length,
  bulletinsSansTable: sansTable,
  bulletinsAbsents: absents,
  dernierNumero: Math.max(...numeros),
  mesureLe: new Date().toISOString().slice(0, 10),
  total: lignes.length,
  arretes,
  pays,
  arc,
  parPays,
  dernier,
  profil,
  sansEcheance,
  grosses,
  isins: isinsBulletin.size,
  isinsBoc: isinsBoc.size,
  communs: communs.length,
  bocDe: seancesBoc[0],
  bocA: seancesBoc[seancesBoc.length - 1],
  echues,
  source: lignes[0]?.source_titre ?? "",
};

fs.writeFileSync("C:/dev/guichet/public/maquette/encours-trimestriel-donnees.js", `window.DONNEES = ${JSON.stringify(donnees, null, 1)};\n`, "utf8");
dire(`ecrit · ${arc.length} arretes · ${pays.length} pays · ${donnees.isins} isin, ${donnees.communs} en commun avec le BOC`);
dire(`bulletins : ${numeros.length} au journal, ${avecTable.length} avec table, sans table ${sansTable.join(',')}, absents ${absents.join(',')}`);
dire(`arc : ${arc.map((a) => Math.round(a.total / 1e9)).join(" → ")} Mds`);
dire(`profil au ${dernier} : ${profil.map((p) => `${p.tranche} ${Math.round(p.capital / 1e9)}`).join(" · ")}`);
