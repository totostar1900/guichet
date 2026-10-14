/**
 * CE QUE LE DEPOT SUPABASE PORTE, DOSSIER PAR DOSSIER.
 *
 * Avant de deplacer une archive, on mesure : combien d octets, combien de
 * pieces, et surtout QUI LES LIT. Une piece que seul un humain ouvre peut
 * vivre dans OneDrive ; une piece que le robot relit chaque semaine ne le
 * peut pas, parce qu un dossier OneDrive local n est pas atteignable depuis
 * Vercel.
 *
 *   npx tsx --conditions=react-server scripts/stockage-etat.mjs
 */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const mo = (n) => (n / 1024 / 1024).toFixed(1);

const { data: seaux } = await sb.storage.listBuckets();
dire(`${seaux?.length ?? 0} seau(x) : ${(seaux ?? []).map((s) => s.name).join(", ")}\n`);

/* Supabase ne rend pas un total : on descend l arborescence et on additionne. */
async function parcourir(seau, prefixe = "", profondeur = 0) {
  const out = [];
  for (let de = 0; ; de += 100) {
    const { data, error } = await sb.storage.from(seau).list(prefixe, { limit: 100, offset: de });
    if (error) break;
    for (const o of data ?? []) {
      if (o.id === null && profondeur < 4) out.push(...(await parcourir(seau, prefixe ? `${prefixe}/${o.name}` : o.name, profondeur + 1)));
      else if (o.id) out.push({ chemin: prefixe ? `${prefixe}/${o.name}` : o.name, octets: o.metadata?.size ?? 0 });
    }
    if ((data ?? []).length < 100) break;
  }
  return out;
}

let grandTotal = 0;
for (const s of seaux ?? []) {
  const objets = await parcourir(s.name);
  const total = objets.reduce((a, o) => a + o.octets, 0);
  grandTotal += total;
  dire(`=== ${s.name} ===  ${objets.length} objet(s), ${mo(total)} Mo`);
  const parTete = new Map();
  for (const o of objets) {
    const tete = o.chemin.split("/")[0].replace(/\d{4}-\d{2}-\d{2}.*/, "<date>").replace(/[0-9a-f]{8}-.*/, "<id>");
    const v = parTete.get(tete) ?? { n: 0, o: 0 };
    v.n++; v.o += o.octets; parTete.set(tete, v);
  }
  for (const [t, v] of [...parTete.entries()].sort((a, b) => b[1].o - a[1].o).slice(0, 12)) dire(`   ${t.padEnd(44)} ${String(v.n).padStart(5)} · ${mo(v.o).padStart(8)} Mo`);
  dire(``);
}
dire(`TOTAL ${mo(grandTotal)} Mo`);

/* QUI LIT QUOI : les tables qui portent une clef de piece. */
dire(`\n=== LES TABLES QUI DESIGNENT UNE PIECE ===`);
for (const [table, colonne] of [["bulletins", "file_key"], ["auction_results", "file_key"], ["generated_documents", "file_key"], ["client_files", "file_key"], ["emission_notices", "file_key"]]) {
  const { count, error } = await sb.from(table).select(colonne, { count: "exact", head: true }).not(colonne, "is", null);
  dire(`   ${table.padEnd(22)} ${error ? error.message.slice(0, 50) : `${count} ligne(s) avec une piece`}`);
}
