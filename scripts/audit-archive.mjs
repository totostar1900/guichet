/**
 * TOUT CE QUE NOUS AVONS LU EST-IL ARCHIVE ?
 *
 * Un document lu sans etre garde n est pas une source, c est un souvenir : la
 * mesure qui en sort ne se verifie plus. Ce controle part des TABLES, non du
 * disque : pour chaque ligne qui cite une piece, la piece existe-t-elle ?
 *
 *   npx tsx --conditions=react-server scripts/audit-archive.mjs
 */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const { avecMarque, cheminBeac, marquesDeCollision, nomDeFichier } = await import("../src/lib/intake/bibliotheque.ts");
const { storageKey } = await import("../src/lib/intake/cle.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const BIBLIO = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet";

async function tout(t, c) { const o = []; for (let de = 0; ; de += 1000) { const { data, error } = await sb.from(t).select(c).range(de, de + 999); if (error) { dire(`   ${t} : ${error.message}`); break; } o.push(...(data ?? [])); if ((data ?? []).length < 1000) break; } return o; }

/* 1 - les pieces citees par une clef de depot, via l index de bibliotheque */
const index = new Map((await tout("library_items", "file_key, library_path")).map((x) => [x.file_key, x.library_path]));
dire(`=== LES PIECES CITEES PAR UNE CLEF DE DEPOT ===`);
for (const [table, col] of [["market_bulletins", "file_key"], ["auction_results", "file_key"], ["emission_notices", "file_key"], ["issuer_documents", "file_key"]]) {
  const lignes = (await tout(table, col)).filter((r) => r[col]);
  let absentes = 0, sansIndex = 0;
  for (const r of lignes) {
    const chemin = index.get(storageKey(r[col]));
    if (!chemin) { sansIndex++; continue; }
    if (!fs.existsSync(`${BIBLIO}/${chemin}`)) absentes++;
  }
  dire(`   ${table.padEnd(20)} ${String(lignes.length).padStart(5)} citee(s) · ${sansIndex} sans place connue · ${absentes} ABSENTES du disque`);
}

/* 2 - les pieces du journal BEAC, par la regle de rangement */
const obs = await tout("beac_observations", "url, titre, genre, pays, instrument, tenor, seance, present");
const vus = new Map(); for (const o of obs) if (!vus.has(o.url)) vus.set(o.url, o);
const lot = [...vus.values()].filter((o) => o.present);
const marques = marquesDeCollision(lot, cheminBeac);
let ok = 0; const manquent = [];
for (const o of lot) {
  const c = `${BIBLIO}/${avecMarque(cheminBeac(o), marques.get(o.url))}`;
  if (fs.existsSync(c)) ok++; else manquent.push(o);
}
dire(`\n=== LE JOURNAL BEAC ===`);
dire(`   ${lot.length} piece(s) au journal · ${ok} sur le disque · ${manquent.length} ABSENTES`);
const parGenre = new Map();
for (const o of manquent) parGenre.set(o.genre ?? "?", (parGenre.get(o.genre ?? "?") ?? 0) + 1);
for (const [g, n] of [...parGenre.entries()].sort((a, b) => b[1] - a[1])) dire(`      ${String(g).padEnd(14)} ${n}`);
for (const o of manquent.slice(0, 5)) dire(`      ${String(o.titre).slice(0, 90)}`);

/* 3 - ce que la bibliotheque porte en tout */
function compter(d) { if (!fs.existsSync(d)) return 0; let n = 0; for (const e of fs.readdirSync(d, { withFileTypes: true })) n += e.isDirectory() ? compter(`${d}/${e.name}`) : 1; return n; }
dire(`\n=== LA BIBLIOTHEQUE ===`);
const R = `${BIBLIO}/1. Donnees de marche`;
for (const d of fs.readdirSync(R, { withFileTypes: true }).filter((e) => e.isDirectory())) dire(`   ${d.name.padEnd(42)} ${String(compter(`${R}/${d.name}`)).padStart(5)} fichier(s)`);
dire(`   ${"TOTAL".padEnd(42)} ${String(compter(R)).padStart(5)}`);
