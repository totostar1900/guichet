/**
 * CITER LA PIECE FRANCAISE QUAND ELLE EXISTE.
 *
 * La BEAC publie la meme seance en francais et en traduction. Les deux sont
 * de vraies pieces et la bibliotheque garde les deux ; mais la ligne n en
 * cite qu une, et c est celle-la qu un lecteur du desk ouvrira. Le desk
 * travaille en francais.
 *
 * LE PIEGE : « Auctions results communique of the Republic of Cameroon »
 * contient le mot « communique ». Reconnaitre le francais par ce mot-la
 * retenait la traduction anglaise. On reconnait donc la TRADUCTION par ses
 * premiers mots, qui eux ne trompent pas.
 *
 *   npx tsx --conditions=react-server scripts/citer-la-piece-francaise.mjs [--ecrire]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { tout, lotDuJournal } = await import("./_journal.mjs");
const { storageKey } = await import("../src/lib/intake/cle.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ecrire = process.argv.includes("--ecrire");

/** Une traduction se reconnait a ses premiers mots, pas a un mot isole. */
const TRADUCTION = /^\s*(auctions?\s+results?|announcement|annoucement|comunicado|communicado|aviso|resultados?|notice)/i;
const absolue = (u) => (u.startsWith("http") ? u : `https://www.beac.int${u}`);
const clefDe = (url) => storageKey(`beac/${decodeURIComponent(String(url).split("/").pop() ?? "")}`);

const nos = await tout(sb, "auction_results", "id, country, session_on, code_emission, tenor, source_title, source_url, file_key");
const traduites = nos.filter((n) => TRADUCTION.test(String(n.source_title ?? "")));
dire(`${nos.length} ligne(s) · ${traduites.length} citent une traduction\n`);

const lot = await lotDuJournal(sb);
let trouvees = 0;
const aFaire = [];
for (const n of traduites) {
  /* La soeur francaise : meme seance, meme pays, genre resultats, et un
     titre qui n est pas une traduction. */
  const soeur = lot.find(
    (o) =>
      o.genre === "resultats" &&
      String(o.seance ?? "").slice(0, 10) === String(n.session_on).slice(0, 10) &&
      o.pays === n.country &&
      !TRADUCTION.test(String(o.titre ?? "")) &&
      absolue(o.url) !== n.source_url,
  );
  if (!soeur) {
    dire(`   ${String(n.session_on).slice(0, 10)} ${String(n.country).padEnd(12)} pas de pièce française : ${String(n.source_title).slice(0, 60)}`);
    continue;
  }
  trouvees++;
  aFaire.push({ n, soeur });
  dire(`   ${String(n.session_on).slice(0, 10)} ${String(n.country).padEnd(12)} ${String(n.source_title).slice(0, 52)}\n        → ${String(soeur.titre).slice(0, 80)}`);
}
dire(`\n=== ${trouvees} ligne(s) à repointer sur leur pièce française ===`);

if (!ecrire) {
  dire(`\nEssai a blanc. Relancer avec --ecrire.`);
  process.exit(0);
}
let n = 0;
for (const x of aFaire) {
  const { error } = await sb
    .from("auction_results")
    .update({ source_url: absolue(x.soeur.url), source_title: x.soeur.titre, file_key: clefDe(x.soeur.url), updated_at: new Date().toISOString() })
    .eq("id", x.n.id);
  if (error) dire(`   ERREUR ${x.n.session_on} : ${error.message}`);
  else n++;
}
dire(`\n=== ${n} ligne(s) repointee(s) ===`);
