/**
 * LIRE LE REGISTRE DE L ENCOURS DANS LES BULLETINS TRIMESTRIELS.
 *
 * Dix bulletins sur seize portent, pays par pays, la liste des titres en vie
 * a la date d arrete : code ISIN, dates, maturite, nombre de titres, valeur
 * faciale, encours. C est le registre de celui qui le tient, la ou notre
 * encours est reconstitue a partir du bulletin de la cote.
 *
 * Aucun modele, aucun jeton : tout est dans la geometrie du document.
 *
 *   npx tsx --conditions=react-server scripts/lire-bulletins-trimestriels.mjs [--ecrire]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { lotDuJournal, placesInscrites } = await import("./_journal.mjs");
const { encoursDuPdf, numeroDuBulletin } = await import("../src/lib/market/bulletin-trimestriel.ts");
const { storageKey } = await import("../src/lib/intake/cle.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const BIBLIO = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet";
const ecrire = process.argv.includes("--ecrire");

const lot = await lotDuJournal(sb);
const places = await placesInscrites(sb, lot);
const bulletins = lot.filter((o) => o.genre === "bulletin").sort((a, b) => (numeroDuBulletin(a.titre ?? "") ?? 0) - (numeroDuBulletin(b.titre ?? "") ?? 0));

const toutes = [];
const remarques = [];
dire(`${"n°".padStart(4)}  ${"lignes".padStart(7)} ${"sous-tot".padStart(8)}  ${"arretes".padEnd(34)} reserves`);
for (const b of bulletins) {
  const rel = places.get(b.url);
  if (!rel || !fs.existsSync(`${BIBLIO}/${rel}`)) { dire(`   ${b.titre} SANS FICHIER`); continue; }
  const r = await encoursDuPdf(new Uint8Array(fs.readFileSync(`${BIBLIO}/${rel}`)), b.titre ?? "");
  const arretes = [...new Set(r.lignes.map((l) => l.arrete))].sort();
  dire(
    `${String(r.numero ?? "?").padStart(4)}  ${String(r.lignes.length).padStart(7)} ${String(r.sousTotaux.length).padStart(8)}  ${arretes.join(" ").slice(0, 34).padEnd(34)} ${r.reserves.length}`,
  );
  for (const x of r.reserves) remarques.push(`n°${r.numero} : ${x}`);
  for (const l of r.lignes) {
    toutes.push({
      arrete: l.arrete,
      pays: l.pays,
      isin: l.isin,
      instrument: l.instrument ?? null,
      emis_le: l.emisLe ?? null,
      echeance_le: l.echeanceLe ?? null,
      tenor: l.tenor ?? null,
      titres: l.titres ?? null,
      faciale: l.faciale ?? null,
      encours: l.encours,
      source_titre: b.titre,
      source_chemin: rel,
      file_key: storageKey(`beac/${decodeURIComponent(b.url.split("/").pop() ?? "")}`),
    });
  }
}

dire(`\n=== ${toutes.length} LIGNE(S) D ENCOURS ===`);
const parArrete = new Map();
for (const l of toutes) {
  const c = `${l.arrete}`;
  parArrete.set(c, (parArrete.get(c) ?? 0) + l.encours);
}
dire(`\n=== L ENCOURS TOTAL CEMAC, PAR DATE D ARRETE ===`);
for (const [d, n] of [...parArrete].sort()) dire(`   ${d}   ${(n / 1e9).toFixed(1).padStart(9)} Mds`);

dire(`\n=== PAR PAYS, AU DERNIER ARRETE DE CHACUN ===`);
const dernier = new Map();
for (const l of toutes) {
  const avant = dernier.get(l.pays);
  if (!avant || l.arrete > avant) dernier.set(l.pays, l.arrete);
}
for (const [p, d] of [...dernier].sort()) {
  const s = toutes.filter((l) => l.pays === p && l.arrete === d);
  dire(`   ${p.padEnd(12)} ${d}  ${(s.reduce((a, x) => a + x.encours, 0) / 1e9).toFixed(1).padStart(8)} Mds sur ${String(s.length).padStart(4)} ligne(s)`);
}

dire(`\n=== LA SERIE PAR PAYS, EN MILLIARDS ===`);
const datesT = [...new Set(toutes.map((l) => l.arrete))].sort();
const paysT = [...new Set(toutes.map((l) => l.pays))].sort();
dire(`   ${"".padEnd(12)}${datesT.map((d) => d.slice(2).padStart(9)).join("")}`);
for (const p of paysT) {
  const cells = datesT.map((d) => {
    const s = toutes.filter((l) => l.pays === p && l.arrete === d).reduce((a, x) => a + x.encours, 0);
    return (s ? (s / 1e9).toFixed(0) : "·").padStart(9);
  });
  dire(`   ${p.padEnd(12)}${cells.join("")}`);
}
dire(`   ${"CEMAC".padEnd(12)}${datesT.map((d) => (toutes.filter((l) => l.arrete === d).reduce((a, x) => a + x.encours, 0) / 1e9).toFixed(0).padStart(9)).join("")}`);

dire(`\n=== CE QUE LE DOCUMENT REPROCHE A NOTRE LECTURE (${remarques.length}) ===`);
for (const x of remarques.slice(0, 25)) dire(`   ${x}`);

/* Deux lignes de meme ISIN et meme date d emission au meme arrete : la clef
   ne tiendrait pas. On le dit avant d ecrire. */
const vues = new Map();
let doublons = 0;
for (const l of toutes) {
  const c = `${l.arrete}|${l.isin}|${l.emis_le}`;
  if (vues.has(c)) doublons++;
  else vues.set(c, l);
}
dire(`\n   ${doublons} doublon(s) (meme arrete, meme ISIN, meme date d emission)`);

if (!ecrire) {
  dire(`\nEssai a blanc. Relancer avec --ecrire.`);
  process.exit(0);
}
const lignes = [...vues.values()];
for (let i = 0; i < lignes.length; i += 500) {
  const { error } = await sb.from("beac_encours_lignes").upsert(lignes.slice(i, i + 500), { onConflict: "arrete,isin,emis_le" });
  if (error) throw new Error(error.message);
  dire(`   ${Math.min(i + 500, lignes.length)}/${lignes.length} ecrite(s)`);
}
const { count } = await sb.from("beac_encours_lignes").select("arrete", { count: "exact", head: true });
dire(`\n${count} ligne(s) dans beac_encours_lignes.`);
