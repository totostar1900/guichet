/**
 * D OU VIENNENT LES OCTETS, ET COMBIEN DE TEMPS ILS COUTENT.
 *
 * Dix lectures sur vingt-deux ont echoue le 17 octobre 2026 en « fetch
 * failed » et « Object not found ». J ai dit trop vite que le lecteur
 * retombait sur le reseau de la BEAC : la chaine de `readSource` est depot
 * puis bibliotheque, jamais le reseau. L erreur vient donc d ailleurs, et
 * cette sonde dit d ou.
 *
 * Elle mesure les deux etages separement, sur des seances tirees au hasard.
 *
 *   npx tsx --conditions=react-server scripts/sonde-lecture-source.mjs [n]
 */
import fs from "node:fs";
import path from "node:path";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { repo } = await import("../src/lib/data/index.ts");
const { storageKey } = await import("../src/lib/intake/cle.ts");
const { BIBLIOTHEQUE_DISQUE } = await import("../src/lib/intake/bibliotheque.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

dire(`BIBLIOTHEQUE_DISQUE = ${BIBLIOTHEQUE_DISQUE || "(vide)"}\n`);

const combien = Number(process.argv[2] ?? 10);
const tous = (await repo().listBulletins(3000)).filter((b) => b.fileKey);
const pas = Math.max(1, Math.floor(tous.length / combien));
const choisis = tous.filter((_, i) => i % pas === 0).slice(0, combien);

let depot = 0, biblio = 0, perdus = 0;
for (const b of choisis) {
  const clef = storageKey(b.fileKey);
  const t0 = Date.now();
  let ou = "", ms = 0, taille = 0;

  const { data, error } = await sb.storage.from("sources").download(clef);
  if (data) {
    ou = "depot"; depot += 1; taille = (await data.arrayBuffer()).byteLength; ms = Date.now() - t0;
  } else {
    const msDepot = Date.now() - t0;
    const t1 = Date.now();
    const { data: place } = await sb.from("library_items").select("library_path").eq("file_key", clef).maybeSingle();
    if (place?.library_path && BIBLIOTHEQUE_DISQUE) {
      try {
        const buf = await fs.promises.readFile(path.join(BIBLIOTHEQUE_DISQUE, place.library_path));
        ou = `biblio (depot refuse en ${msDepot} ms : ${String(error?.message).slice(0, 28)})`;
        biblio += 1; taille = buf.byteLength; ms = Date.now() - t1;
      } catch (e) {
        ou = `PERDU sur disque : ${String(e.message).slice(0, 50)}`; perdus += 1;
      }
    } else {
      ou = `PERDU : ni depot ni bibliotheque (${String(error?.message).slice(0, 40)})`; perdus += 1;
    }
  }
  dire(`   ${b.sessionDate}  ${String(ms).padStart(5)} ms  ${String(Math.round(taille / 1024)).padStart(5)} Ko  ${ou}`);
}

dire(`\n=== ${depot} au depot · ${biblio} en bibliotheque · ${perdus} perdu(s) sur ${choisis.length} ===`);
