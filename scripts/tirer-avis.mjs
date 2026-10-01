/**
 * Sortir l'avis d'annonce d'une séance du dépôt privé, pour le lire soi-même.
 *
 * Même chose que tirer-piece.mjs, de l'autre côté : les avis vivent dans leur
 * propre table et leur clef se replie comme les autres.
 *
 *   node scripts/tirer-avis.mjs <id d'avis> [<id> …]
 */
import fs from "node:fs";
import path from "node:path";
import { storageKey } from "../src/lib/intake/cle.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");
const h = { apikey: K, Authorization: `Bearer ${K}` };

/**
 * La clef d'un fichier au dépôt vient de « src/lib/intake/cle.ts », importée et
 * non recopiée.
 *
 * Elle a longtemps été recopiée ici, parce que son module portait
 * « server-only » et refusait de se charger hors de Next. Une copie libre
 * dérive : celle de ce script ne remplaçait que les caractères non ASCII, là où
 * l'originale écrase aussi les espaces et les points. Dix-sept avis de Guinée
 * équatoriale sont partis sous une clef que l'application n'aurait jamais lue,
 * et le balayage du 2026-10-02 en a retrouvé le résidu : sept pièces illisibles
 * et vingt-deux doublons. La barrière a été retirée le même jour.
 */

const out = "C:/Users/Nitch/AppData/Local/Temp/claude/C--Users-Nitch-OneDrive---PURPOSE-CAPITAL-MyChamaProject/019a269f-b7b0-4c63-adce-cddb7ad5ce48/scratchpad/avis";
fs.mkdirSync(out, { recursive: true });

for (const id of process.argv.slice(2)) {
  const [r] = await fetch(`${U}/rest/v1/emission_notices?select=id,country,tenor,session_on,file_key,source_url&id=eq.${id}`, { headers: h }).then((x) => x.json());
  if (!r) {
    console.log(`${id} : avis introuvable`);
    continue;
  }
  let bytes;
  if (r.file_key) {
    const res = await fetch(`${U}/storage/v1/object/sources/${storageKey(r.file_key)}`, { headers: h });
    if (res.ok) bytes = Buffer.from(await res.arrayBuffer());
  }
  // À défaut du dépôt, la BEAC elle-même : on veut la pièce, pas sa copie.
  if (!bytes) {
    const res = await fetch(r.source_url, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0)" } });
    if (!res.ok) {
      console.log(`${id} : ni dépôt ni BEAC (${res.status})`);
      continue;
    }
    bytes = Buffer.from(await res.arrayBuffer());
  }
  const nom = `avis-${r.session_on}-${r.country}-${String(r.tenor ?? "").replace(/\s+/g, "")}`;
  fs.writeFileSync(path.join(out, `${nom}.pdf`), bytes);
  console.log(`${nom} · ${bytes.length} octets`);
}
