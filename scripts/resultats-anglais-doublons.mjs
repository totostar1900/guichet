/**
 * LES « AUCTION RESULTS COMMUNIQUE » SONT-ILS DES SÉANCES QUE NOUS AVONS DÉJÀ ?
 *
 * Trente communiqués de résultats camerounais en anglais ne nomment pas leur
 * instrument : « Auction results communique of the Republic of Cameroon - 21st
 * March 2022 session ». Impossible de les déposer sur le seul titre.
 *
 * MAIS LA QUESTION N'EST PAS « SAIT-ON LES CLASSER », C'EST « MANQUE-T-IL
 * QUELQUE CHOSE ». Si la séance du 21 mars 2022 est déjà en base par son
 * communiqué français, la pièce anglaise est une seconde impression du même
 * acte et nous n'avons rien perdu. On compare donc date par date.
 *
 *   npx tsx --conditions=react-server scripts/resultats-anglais-doublons.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const { BEAC_ANNONCES, parseBeacRows, readBeacDoc } = await import("../src/lib/market/beac.ts");
const { tout } = await import("./_journal.mjs");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const html = await fetch(BEAC_ANNONCES, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0)" } }).then((r) => r.text());
const lus = parseBeacRows(html).map(readBeacDoc);
const orphelines = lus.filter((a) => (a.kind === "resultats" || a.kind === "annonce") && a.on && a.country && !a.instrument);

const enBase = await tout(sb, "auction_results", "country, session_on, instrument, tenor");
const avis = await tout(sb, "emission_notices", "country, session_on, instrument");
const seances = new Set(enBase.map((x) => `${x.country}|${x.session_on}`));
const seancesAvis = new Set(avis.map((x) => `${x.country}|${x.session_on}`));

let couvertes = 0;
let nues = 0;
for (const a of orphelines) {
  const clef = `${a.country}|${a.on}`;
  const ici = enBase.filter((x) => `${x.country}|${x.session_on}` === clef);
  if (seances.has(clef)) {
    couvertes++;
    dire(`   DÉJÀ LÀ   ${a.on} ${a.country} · ${ici.map((x) => `${x.instrument} ${x.tenor}`).join(", ")}`);
  } else {
    nues++;
    dire(`   MANQUE    ${a.on} ${a.country} ${seancesAvis.has(clef) ? "(un avis existe pour ce jour)" : "(rien ce jour-là)"}   ${a.doc.title.slice(0, 70)}`);
  }
}
dire(`\n=== ${couvertes} séance(s) déjà en base · ${nues} absente(s) de la base ===`);
