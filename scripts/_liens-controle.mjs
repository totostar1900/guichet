/** Chaque chiffre nouvellement ecrit cite-t-il une piece ouvrable ? */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const { tout } = await import("./_journal.mjs");
const { lienBibliotheque } = await import("../src/lib/intake/bibliotheque.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const BIBLIO = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet";
const index = new Map((await tout(sb, "library_items", "file_key, library_path")).map((x) => [x.file_key, x.library_path]));
for (const t of ["beac_yield_curves", "beac_encours_officiel", "beac_cout_ressources"]) {
  const lignes = await tout(sb, t, "file_key, source_chemin");
  const sansClef = lignes.filter((x) => !x.file_key).length;
  const horsIndex = lignes.filter((x) => x.file_key && !index.has(x.file_key)).length;
  const absentes = lignes.filter((x) => x.source_chemin && !fs.existsSync(`${BIBLIO}/${x.source_chemin}`)).length;
  dire(`${t.padEnd(24)} ${String(lignes.length).padStart(5)} ligne(s) · ${sansClef} sans clef · ${horsIndex} hors index · ${absentes} dont le fichier manque`);
  const une = lignes.find((x) => x.file_key && index.has(x.file_key));
  if (une) dire(`   exemple de lien : ${lienBibliotheque(index.get(une.file_key)).slice(0, 150)}`);
}
