/**
 * RENDRE LA CITATION A LA PIECE FRANCAISE, PARTOUT OU ELLE EXISTE.
 *
 * Regle arretee par Georges le 16 octobre 2026 sur la seance guineenne du
 * 5 fevrier : quand deux pieces decrivent la meme seance et divergent, LE
 * FRANCAIS FAIT FOI. La traduction reste un temoin, elle ne devient pas la
 * source.
 *
 * POURQUOI MAINTENANT. La campagne de depot du meme jour a relu quarante
 * communiques jamais cites, qui etaient en fait les traductions de seances
 * deja connues, et son upsert a remplace l'adresse citee par celle de la
 * traduction. Trente lignes sur trente-neuf citaient donc une piece anglaise
 * ou espagnole au lieu de la francaise. Le chiffre n'avait pas forcement
 * bouge ; LA PIECE QUE LE DESK OUVRE EN CLIQUANT, SI.
 *
 * L'EXCEPTION EST REELLE ET IL FAUT LA GARDER : la seance camerounaise du
 * 24 juin 2020 n'a QUE sa version anglaise. Citer une piece francaise
 * inexistante serait pire que citer une traduction. On ne change donc une
 * citation que si la piece francaise existe au journal.
 *
 *   npx tsx --conditions=react-server scripts/citer-la-piece-francaise-v2.mjs [--ecrire]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { storageKey } = await import("../src/lib/intake/cle.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ecrire = process.argv.includes("--ecrire");

async function toutes(table, colonnes, filtrer = (q) => q) {
  const out = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await filtrer(sb.from(table).select(colonnes)).range(de, de + 999);
    if (error) throw new Error(`${table} : ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) return out;
  }
}

/* « Communiqué des résultats » est francais ; « Comunicado de resultados »,
   « Communicado », « Auction results communique » ne le sont pas. Le motif
   exige la suite « des résultats », que seules les pieces francaises
   portent. */
const estFrancaise = (t) => /communiqu[eé]\s+des\s+r[ée]sultats/i.test(String(t ?? ""));
const absolue = (u) => (u.startsWith("http") ? u : `https://www.beac.int${u}`);
const clefDe = (url) => storageKey(`beac/${decodeURIComponent(String(url).split("/").pop() ?? "")}`);

const vues = await toutes("beac_observations", "url, titre, pays, seance, genre");
const lignes = await toutes("auction_results", "id, country, session_on, code_emission, source_url, source_title");

/* La piece francaise d'une seance, s'il y en a une. */
const francaises = new Map();
for (const v of vues) {
  if (v.genre !== "resultats" || !v.pays || !v.seance || !estFrancaise(v.titre)) continue;
  const clef = `${v.pays}|${v.seance}`;
  if (!francaises.has(clef)) francaises.set(clef, v);
}

let aChanger = 0;
let dejaBien = 0;
let sansFrancaise = 0;
const gestes = [];
for (const l of lignes) {
  if (estFrancaise(l.source_title)) { dejaBien++; continue; }
  const fr = francaises.get(`${l.country}|${l.session_on}`);
  if (!fr) { sansFrancaise++; continue; }
  aChanger++;
  gestes.push({ l, fr });
  dire(`   ${l.session_on} ${String(l.country).padEnd(12)} ${l.code_emission ?? "—"}`);
  dire(`      de  ${String(l.source_title ?? "—").slice(0, 78)}`);
  dire(`      a   ${fr.titre.slice(0, 78)}`);
}

dire(`\n=== ${aChanger} citation(s) a rendre · ${dejaBien} deja francaise(s) · ${sansFrancaise} sans piece francaise ===`);
if (!ecrire) { dire("\nEssai a blanc. Relancer avec --ecrire."); process.exit(0); }

let n = 0;
for (const { l, fr } of gestes) {
  const { error } = await sb
    .from("auction_results")
    .update({ source_url: absolue(fr.url), source_title: fr.titre, file_key: clefDe(fr.url), updated_at: new Date().toISOString() })
    .eq("id", l.id);
  if (error) dire(`   ERREUR ${l.code_emission} : ${error.message}`);
  else n++;
}
dire(`\n=== ${n} citation(s) rendue(s) a la piece francaise ===`);
