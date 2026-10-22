/**
 * RETIRER DU DÉPÔT LES OCTETS QUE LA BIBLIOTHÈQUE PORTE DÉJÀ.
 *
 * C'est le dernier geste de la règle arrêtée le 14 octobre 2026 : les
 * documents physiques vivent dans la bibliothèque partagée, le desk n'en
 * garde que le lien. Le dépôt pesait 1 589 Mo pour un plan à 1 Go, dont
 * 1 099 pour les seuls bulletins.
 *
 * UNE SUPPRESSION NE SE DÉFAIT PAS, ET LE PLAN GRATUIT NE GARANTIT AUCUNE
 * SAUVEGARDE. Trois gardes, donc, et aucun n'est décoratif :
 *
 *   LA PIÈCE EST INDEXÉE. Sans ligne dans `library_items`, on ne sait pas où
 *   elle vit, et la retirer revient à la perdre.
 *
 *   LE FICHIER EXISTE ENCORE SUR LE DISQUE, ET N'A PAS CHANGÉ. On recalcule
 *   son empreinte et on la compare à celle qu'on a écrite à l'indexation. Un
 *   fichier qu'un collègue a remplacé entre-temps n'est plus celui qui a été
 *   lu, et le lien mènerait ailleurs que la base.
 *
 *   LE LIEN EST FORMÉ. On ne retire pas des octets pour les remplacer par
 *   une adresse qu'on n'a pas su écrire.
 *
 * ON NE TOUCHE QU'À CE QU'ON NOMME. Les pièces des clients, leur courrier et
 * les documents produits ne sont pas dans la bibliothèque, par décision : ils
 * ne peuvent donc pas être retirés ici, et le préfixe est exigé en argument
 * plutôt que déduit, pour qu'aucun appel distrait n'emporte tout.
 *
 *   npx tsx --conditions=react-server scripts/vider-le-depot.mjs boc
 *   npx tsx --conditions=react-server scripts/vider-le-depot.mjs boc --vider
 */
import fs from "node:fs";
import { createHash } from "node:crypto";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { createClient } = await import("@supabase/supabase-js");
const { lienBibliotheque } = await import("../src/lib/intake/bibliotheque.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const RACINE = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet";
const prefixe = process.argv[2];
const vider = process.argv.includes("--vider");
if (!prefixe || prefixe.startsWith("--")) {
  dire("usage : vider-le-depot.mjs <prefixe> [--vider]   par exemple « boc »");
  process.exit(1);
}

const index = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("library_items").select("*").like("file_key", `${prefixe}/%`).eq("au_depot", true).range(de, de + 999);
  if (error) throw new Error(error.message);
  index.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
dire(`${index.length} pièce(s) indexée(s) sous « ${prefixe}/ » et encore au dépôt\n`);

const bons = [];
const refus = [];
for (const r of index) {
  const chemin = `${RACINE}/${r.library_path}`;
  if (!fs.existsSync(chemin)) {
    refus.push({ r, pourquoi: "absente du disque" });
    continue;
  }
  const sha = createHash("sha256").update(fs.readFileSync(chemin)).digest("hex");
  if (r.sha256 && sha !== r.sha256) {
    refus.push({ r, pourquoi: `empreinte différente : ${sha.slice(0, 12)} contre ${String(r.sha256).slice(0, 12)}` });
    continue;
  }
  if (!lienBibliotheque(r.library_path).startsWith("https://")) {
    refus.push({ r, pourquoi: "lien mal formé" });
    continue;
  }
  bons.push(r);
}

const mo = (n) => (n / 1024 / 1024).toFixed(0);
dire(`=== LE CONTRÔLE ===`);
dire(`   pièces vérifiées sur le disque, empreinte comprise   ${bons.length}`);
dire(`   pièces REFUSÉES                                      ${refus.length}`);
for (const x of refus.slice(0, 10)) dire(`      ${x.r.file_key} : ${x.pourquoi}`);
dire(`   octets qui partiraient du dépôt                      ${mo(bons.reduce((a, r) => a + Number(r.bytes ?? 0), 0))} Mo`);

if (!vider) {
  dire(`\nEssai à blanc. Relancer avec --vider pour retirer du dépôt.`);
  process.exit(0);
}
if (!bons.length) {
  dire(`\nRien à retirer.`);
  process.exit(0);
}

let partis = 0;
for (let i = 0; i < bons.length; i += 50) {
  const paquet = bons.slice(i, i + 50);
  const { error } = await sb.storage.from("sources").remove(paquet.map((r) => r.file_key));
  if (error) {
    dire(`   ${error.message}`);
    break;
  }
  /* `au_depot` passe à faux DANS LE MÊME TEMPS : une pièce retirée que l'index
     croit encore au dépôt ferait tenter une lecture vouée à l'échec, au lieu
     de servir le lien tout de suite. */
  const { error: e2 } = await sb.from("library_items").update({ au_depot: false }).in("file_key", paquet.map((r) => r.file_key));
  if (e2) dire(`   index : ${e2.message}`);
  partis += paquet.length;
  dire(`   ${partis}/${bons.length} retirée(s)`);
}

dire(`\n=== ${partis} pièce(s) retirée(s), ${mo(bons.slice(0, partis).reduce((a, r) => a + Number(r.bytes ?? 0), 0))} Mo ===`);
dire(`La bibliothèque fait foi : ${lienBibliotheque(bons[0].library_path)}`);
