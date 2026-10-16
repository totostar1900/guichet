/**
 * CE QUI RESTE AU CONTROLE DU LOT 3 : les deux a deposer, et les huit muettes.
 *
 * Sonde de lecture seule. Le controle du plan dit « 247 sur 249 · 2 a deposer
 * · 8 pieces sans pays ni date » ; il ne dit pas LESQUELLES, et un reste
 * qu'on ne nomme pas ne se ferme jamais.
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { readBeacDoc } = await import("../src/lib/market/beac.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

async function toutes(table, colonnes) {
  const out = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from(table).select(colonnes).range(de, de + 999);
    if (error) throw new Error(`${table} : ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) return out;
  }
}

const vues = await toutes("beac_observations", "url, titre, pays, seance, instrument, genre");
const seances = await toutes("auction_results", "country, session_on, instrument");
const parJour = new Set(seances.map((s) => `${s.country}|${s.session_on}`));
const parLigne = new Set(seances.map((s) => `${s.country}|${s.session_on}|${s.instrument}`));

const manquantes = new Map();
const muettes = new Map();
for (const v of vues) {
  const lu = readBeacDoc({ url: v.url ?? "", title: v.titre ?? "", country: v.pays ?? "", year: "" });
  if (lu.kind !== "resultats") continue;
  const pays = lu.country ?? v.pays;
  const le = v.seance ?? lu.on;
  if (!pays || !le) {
    if (!muettes.has(v.url)) muettes.set(v.url, { titre: v.titre, pays, le, url: v.url });
    continue;
  }
  const jour = `${pays}|${String(le).slice(0, 10)}`;
  const quoi = v.instrument ?? lu.instrument;
  const absente = quoi ? !parLigne.has(`${jour}|${quoi}`) : !parJour.has(jour);
  if (absente) {
    const clef = quoi ? `${jour}|${quoi}` : jour;
    if (!manquantes.has(clef)) manquantes.set(clef, { clef, titre: v.titre, url: v.url });
  }
}

dire(`=== ${manquantes.size} LIGNE(S) ANNONCEE(S) ET NON DEPOSEE(S) ===`);
for (const m of manquantes.values()) {
  dire(`   ${m.clef}`);
  dire(`      ${m.titre}`);
  dire(`      ${m.url}`);
}

dire(`\n=== ${muettes.size} PIECE(S) SANS PAYS NI DATE LISIBLES ===`);
for (const m of muettes.values()) {
  dire(`   pays=${m.pays ?? "—"}  date=${m.le ?? "—"}`);
  dire(`      ${m.titre}`);
  dire(`      ${m.url}`);
}
