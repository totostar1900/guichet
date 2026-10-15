/**
 * LIRE LES STATISTIQUES MENSUELLES, ET POSER L'ENCOURS OFFICIEL EN BASE.
 *
 * Trente-deux numéros depuis septembre 2021, tous avec une couche texte :
 * aucun modèle, aucun jeton. Chaque chiffre cite sa pièce, rangée dans la
 * bibliothèque, et le desk en servira le lien.
 *
 *   npx tsx --conditions=react-server scripts/lire-statistiques-mensuelles.mjs [--ecrire]
 */
import fs from "node:fs";
import path from "node:path";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const { rangeesDuPdf } = await import("../src/lib/market/boc-geometrie.ts");
const { lireStatistiqueMensuelle } = await import("../src/lib/market/statistique-mensuelle.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const BIBLIO = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet";
const RACINE = `${BIBLIO}/1. Donnees de marche/1. BEAC - Marche des titres publics/Statistiques mensuelles`;
const ecrire = process.argv.includes("--ecrire");

const parChemin = new Map();
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from("library_items").select("file_key, library_path").range(de, de + 999);
  for (const x of data ?? []) parChemin.set(x.library_path, x.file_key);
  if ((data ?? []).length < 1000) break;
}

const fichiers = fs
  .readdirSync(RACINE)
  .flatMap((an) => (fs.statSync(`${RACINE}/${an}`).isDirectory() ? fs.readdirSync(`${RACINE}/${an}`).map((f) => `${RACINE}/${an}/${f}`) : []))
  .filter((f) => /tatistiques/i.test(path.basename(f)))
  .sort();
dire(`${fichiers.length} statistique(s) mensuelle(s)\n`);

const lignes = [];
const couts = [];
let muettes = 0;
for (const f of fichiers) {
  const titre = path.basename(f, ".pdf");
  let r;
  try {
    const rangees = await rangeesDuPdf(new Uint8Array(fs.readFileSync(f)));
    r = lireStatistiqueMensuelle(rangees, titre);
  } catch (e) {
    muettes++;
    dire(`   ILLISIBLE  ${titre.slice(0, 70)} : ${String(e.message).slice(0, 60)}`);
    continue;
  }
  if (!r.mois) {
    muettes++;
    dire(`   SANS MOIS  ${titre.slice(0, 70)}`);
    continue;
  }
  const relatif = path.relative(BIBLIO, f).replace(/\\/g, "/");
  const source = { source_titre: titre, source_chemin: relatif, file_key: parChemin.get(relatif) ?? null };
  dire(
    `   ${r.mois}  n°${String(r.numero ?? "?").padStart(2)}  ${String(r.encours.length).padStart(2)} relevé(s) · total ${r.total != null ? (r.total / 1000).toFixed(1) + " Mds" : "—"} · ${r.couts.length} coût(s)${r.reserves.length ? `  ← ${r.reserves[0].slice(0, 70)}` : ""}`,
  );
  const note = r.reserves.length ? r.reserves.join(" · ") : null;
  /* UNE PIECE PORTE HUIT MOIS, PAS UN. La colonne la plus recente est son
     propre mois, les autres sont l historique qu elle rappelle. */
  for (const e of r.encours) lignes.push({ mois: `${e.mois}-01`, pays: e.pays, encours: e.montant, numero: r.numero ?? null, ...source, reserves: note });
  if (r.total != null) lignes.push({ mois: `${r.mois}-01`, pays: "CEMAC", encours: r.total, numero: r.numero ?? null, ...source, reserves: note });
  for (const c of r.couts) couts.push({ mois: `${r.mois}-01`, pays: c.pays, instrument: c.instrument, taux: c.taux, ...source });
}

/**
 * DEUX NUMEROS RAPPELLENT LE MEME MOIS, ET C EST UNE VERIFICATION.
 *
 * Chaque piece reprend l historique : juin 2026 figure dans le numero 59 comme
 * dans le numero 60. Si les deux disent la meme chose, la lecture tient ; si
 * elles different, c est que la BEAC a revise sa serie, et le plus recent fait
 * foi. Dans les deux cas on le dit.
 */
const parPoint = new Map();
const revisions = [];
for (const l of lignes) {
  const clef = `${l.mois}|${l.pays}`;
  const avant = parPoint.get(clef);
  if (!avant) {
    parPoint.set(clef, l);
    continue;
  }
  if (Math.abs(avant.encours - l.encours) > 1) revisions.push({ clef, a: avant, b: l });
  if ((l.numero ?? 0) > (avant.numero ?? 0)) parPoint.set(clef, l);
}
dire(`\n=== LE MEME MOIS DANS DEUX NUMEROS ===`);
dire(`   ${lignes.length - parPoint.size} releve(s) publies deux fois`);
dire(`   ${revisions.length} revision(s) : la BEAC a change son chiffre`);
for (const r of revisions.slice(0, 10)) dire(`      ${r.clef}  n°${r.a.numero} disait ${(r.a.encours / 1000).toFixed(1)} Mds, n°${r.b.numero} dit ${(r.b.encours / 1000).toFixed(1)} Mds`);
lignes.length = 0;
lignes.push(...parPoint.values());

dire(`\n=== ${lignes.length} ligne(s) d'encours · ${couts.length} coût(s) · ${muettes} pièce(s) muette(s) ===`);
const mois = [...new Set(lignes.map((l) => l.mois))].sort();
dire(`${mois.length} mois, de ${mois[0]} à ${mois[mois.length - 1]}`);

const derniers = lignes.filter((l) => l.mois === mois[mois.length - 1]).sort((a, b) => b.encours - a.encours);
dire(`\n=== L'ENCOURS OFFICIEL AU ${mois[mois.length - 1]} (milliards de FCFA) ===`);
for (const d of derniers) dire(`   ${d.pays.padEnd(14)} ${(d.encours / 1000).toFixed(1).padStart(10)}`);

const sansLien = lignes.filter((l) => !l.file_key).length;
if (sansLien) dire(`\n${sansLien} ligne(s) dont la pièce n'est pas indexée : le desk n'aura pas de lien`);

if (!ecrire) {
  dire(`\nEssai à blanc. Relancer avec --ecrire.`);
  process.exit(0);
}

for (let i = 0; i < lignes.length; i += 500) {
  const { error } = await sb.from("beac_encours_officiel").upsert(lignes.slice(i, i + 500), { onConflict: "mois,pays" });
  if (error) throw new Error(`encours : ${error.message}`);
}
for (let i = 0; i < couts.length; i += 500) {
  const { error } = await sb.from("beac_cout_ressources").upsert(couts.slice(i, i + 500), { onConflict: "mois,pays,instrument" });
  if (error) throw new Error(`coût : ${error.message}`);
}
const { count: a } = await sb.from("beac_encours_officiel").select("mois", { count: "exact", head: true });
const { count: b } = await sb.from("beac_cout_ressources").select("mois", { count: "exact", head: true });
dire(`\n${a} ligne(s) d'encours et ${b} coût(s) en base.`);
