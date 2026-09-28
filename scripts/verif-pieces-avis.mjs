/**
 * Les pièces des avis sont-elles là où l'application ira les chercher ?
 *
 * Le dépôt range un objet sous storageKey(file_key), qui replie les accents et
 * écrase toute suite de caractères hors [a-zA-Z0-9._-/] en UN seul tiret. Le
 * script de reprise avait sa propre version du repli, qui ne remplaçait que les
 * caractères non ASCII, un par un. Deux implémentations du même repli sont une
 * occasion de divergence, et celle-ci en était une : sur « Guinée éq. », sur
 * tout nom de fichier contenant une espace, les deux chaînes ne tombaient pas au
 * même endroit. La pièce était bien déposée, et la route de lecture ne l'aurait
 * jamais trouvée : la file serait restée pleine sans que rien n'échoue.
 *
 * Ce script recalcule la clef avec la règle de l'application, demande l'objet au
 * dépôt, et dit lesquels manquent.
 *
 *   node scripts/verif-pieces-avis.mjs           vérifie
 *   node scripts/verif-pieces-avis.mjs --reparer redépose les manquants
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");
const h = { apikey: K, Authorization: `Bearer ${K}` };

/**
 * La règle de storageKey(), recopiée au caractère près.
 *
 * Elle est recopiée et non importée parce que son module porte « server-only »
 * et refuse de se charger hors de Next. Le cliquet src/test/storage-key.test.ts
 * compare les deux, pour que cette copie ne dérive pas de son original.
 */
const storageKey = (key) =>
  key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._\-/]+/g, "-");

const reparer = process.argv.includes("--reparer");

const avis = await fetch(`${U}/rest/v1/emission_notices?select=id,session_on,country,tenor,file_key,source_url&limit=3000`, { headers: h }).then((r) => r.json());
const avecPiece = avis.filter((x) => x.file_key);
console.log(`${avis.length} avis · ${avecPiece.length} portent une clef de pièce\n`);

const manquants = [];
for (const x of avecPiece) {
  const res = await fetch(`${U}/storage/v1/object/info/sources/${storageKey(x.file_key)}`, { headers: h });
  if (!res.ok) manquants.push(x);
}

console.log(`${avecPiece.length - manquants.length} pièces trouvées là où l'application les cherchera`);
if (!manquants.length) process.exit(0);

console.log(`${manquants.length} introuvables :`);
for (const x of manquants.slice(0, 10)) console.log(`   ${x.session_on} ${x.country} ${x.tenor ?? ""} · ${x.file_key}`);
if (manquants.length > 10) console.log(`   … et ${manquants.length - 10} autres`);

if (!reparer) {
  console.log(`\nPour redéposer : node scripts/verif-pieces-avis.mjs --reparer`);
  process.exit(0);
}

let repares = 0;
for (const x of manquants) {
  const pdf = await fetch(x.source_url, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0)" } }).catch(() => null);
  if (!pdf?.ok) {
    console.log(`✗ ${x.session_on} ${x.country} : la BEAC répond ${pdf?.status ?? "rien"}`);
    continue;
  }
  const up = await fetch(`${U}/storage/v1/object/sources/${storageKey(x.file_key)}`, {
    method: "POST",
    headers: { ...h, "Content-Type": "application/pdf", "x-upsert": "true" },
    body: Buffer.from(await pdf.arrayBuffer()),
  });
  if (up.ok) repares += 1;
  else console.log(`✗ ${x.session_on} ${x.country} : dépôt ${up.status}`);
}
console.log(`\n${repares} pièces redéposées sous la clef de l'application`);
