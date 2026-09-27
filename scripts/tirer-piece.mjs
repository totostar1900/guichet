/**
 * Sortir la pièce d'une séance du dépôt privé, et la rendre lisible.
 *
 * La clef rangée en base et la clef de l'objet stocké ne sont pas la même
 * chaîne : storageKey() replie les accents avant d'écrire. On demande donc
 * l'objet sous la forme repliée, et on retombe sur la clef brute si le dépôt
 * ne connaît pas la première.
 *
 *   node scripts/tirer-piece.mjs <id de séance> [<id> …]
 */
import fs from "node:fs";
import path from "node:path";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");
const h = { apikey: K, Authorization: `Bearer ${K}` };

/** Le repli d'accents de storageKey(). */
const replie = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "-");

const out = "C:/Users/Nitch/AppData/Local/Temp/claude/C--Users-Nitch-OneDrive---PURPOSE-CAPITAL-MyChamaProject/019a269f-b7b0-4c63-adce-cddb7ad5ce48/scratchpad/verif";
fs.mkdirSync(out, { recursive: true });

for (const id of process.argv.slice(2)) {
  const [r] = await fetch(`${U}/rest/v1/auction_results?select=id,country,tenor,session_on,file_key&id=eq.${id}`, { headers: h }).then((x) => x.json());
  if (!r?.file_key) {
    console.log(`${id} : aucune pièce`);
    continue;
  }
  let res = await fetch(`${U}/storage/v1/object/sources/${replie(r.file_key)}`, { headers: h });
  if (!res.ok) res = await fetch(`${U}/storage/v1/object/sources/${r.file_key}`, { headers: h });
  if (!res.ok) {
    console.log(`${id} : dépôt ${res.status} pour ${r.file_key}`);
    continue;
  }
  const nom = `${r.session_on}-${r.country}-${String(r.tenor).replace(/\s+/g, "")}`;
  const pdf = path.join(out, `${nom}.pdf`);
  fs.writeFileSync(pdf, Buffer.from(await res.arrayBuffer()));
  // Le rendu se fait à part : les avertissements de police de pdf.js débordent
  // le tampon d'un execFileSync et font échouer un téléchargement qui a réussi.
  console.log(`${nom} · ${fs.statSync(pdf).size} octets`);
}
