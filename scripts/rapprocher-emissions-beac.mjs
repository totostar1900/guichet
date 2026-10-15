/**
 * LE BULLETIN TRIMESTRIEL CONTRE NOS COMMUNIQUES.
 *
 * Les deux sources decrivent les memes seances : la BEAC par son tableau des
 * emissions, nous par les communiques de resultats que nous avons lus.
 *
 * CE SCRIPT N ECRIT RIEN. Un accord ne prouve pas grand chose ; un desaccord
 * designe une seance a verifier, et c est tout ce qu on lui demande. Le
 * lecteur des tableaux d emissions ne retient qu un quart des colonnes (voir
 * `bulletin-trimestriel.ts`), ce qui suffit a un controle mais pas a une
 * source : on ne depose aucun de ces chiffres.
 *
 *   npx tsx --conditions=react-server scripts/rapprocher-emissions-beac.mjs
 */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { lotDuJournal, placesInscrites, tout } = await import("./_journal.mjs");
const { emissionsDuPdf, numeroDuBulletin } = await import("../src/lib/market/bulletin-trimestriel.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const BIBLIO = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet";

const lot = await lotDuJournal(sb);
const places = await placesInscrites(sb, lot);
const bulletins = lot.filter((o) => o.genre === "bulletin").sort((a, b) => (numeroDuBulletin(a.titre ?? "") ?? 0) - (numeroDuBulletin(b.titre ?? "") ?? 0));
const leurs = [];
for (const b of bulletins) {
  const rel = places.get(b.url);
  if (!rel) continue;
  const r = await emissionsDuPdf(new Uint8Array(fs.readFileSync(`${BIBLIO}/${rel}`)), b.titre ?? "");
  for (const e of r.emissions) leurs.push({ ...e, numero: r.numero });
}
const nos = await tout(sb, "auction_results", "code_emission, country, instrument, tenor, session_on, announced, served, rate_avg, coverage, source_title");
dire(`${leurs.length} adjudication(s) retenues dans les bulletins · ${nos.length} communique(s) chez nous\n`);

/**
 * UNE UNITE SE MESURE SUR UN ORDRE DE GRANDEUR, PAS SUR UNE LIGNE.
 *
 * Un montant servi se compte en milliards dans cette zone. Si les lignes d un
 * pays se tiennent toutes mille fois sous celles des autres, ce n est pas une
 * petite adjudication, c est une unite.
 */
dire(`=== L ORDRE DE GRANDEUR DU MONTANT SERVI, PAR PAYS ===`);
const parPays = new Map();
for (const n of nos) {
  if (n.served == null || Number(n.served) <= 0) continue;
  const o = Math.floor(Math.log10(Number(n.served)));
  if (!parPays.has(n.country)) parPays.set(n.country, new Map());
  parPays.get(n.country).set(o, (parPays.get(n.country).get(o) ?? 0) + 1);
}
for (const [p, m] of [...parPays].sort()) {
  const ordres = [...m].sort((a, b) => a[0] - b[0]);
  const median = ordres.reduce((s, [o, n]) => s + o * n, 0) / ordres.reduce((s, [, n]) => s + n, 0);
  dire(`   ${String(p).padEnd(12)} ${ordres.map(([o, n]) => `10^${o}:${n}`).join("  ").padEnd(42)} moyenne 10^${median.toFixed(1)}`);
}

const nu = (s) => String(s ?? "").replace(/\/.*$/, "").replace(/\s/g, "").toUpperCase();
const parCode = new Map();
for (const n of nos) if (n.code_emission) parCode.set(nu(n.code_emission), n);
const parDate = new Map();
for (const n of nos) {
  if (!n.session_on || !n.country) continue;
  const c = `${n.country}|${String(n.session_on).slice(0, 10)}`;
  parDate.set(c, [...(parDate.get(c) ?? []), n]);
}

let apparies = 0;
let absents = 0;
const desaccords = [];
for (const e of leurs) {
  const d = e.adjugeLe ?? e.emisLe ?? e.regleLe;
  const n = (e.isin ? parCode.get(nu(e.isin)) : undefined) ?? (parDate.get(`${e.pays}|${d}`) ?? [])[0];
  if (!n) {
    absents++;
    continue;
  }
  apparies++;
  if (n.rate_avg != null && e.taux != null && Math.abs(Number(n.rate_avg) - e.taux) > 0.02) {
    desaccords.push({ e, quoi: `taux ${e.taux} % au bulletin contre ${n.rate_avg} % chez nous` });
  }
  if (n.served != null && e.leve != null && Math.abs(Number(n.served) - e.leve) > 1e6) {
    const facteur = e.leve / Number(n.served);
    desaccords.push({ e, quoi: `levé ${(e.leve / 1e9).toFixed(2)} Mds au bulletin contre ${(Number(n.served) / 1e9).toFixed(3)} Mds chez nous${facteur > 900 && facteur < 1100 ? " (facteur mille)" : ""}` });
  }
}
dire(`\n=== ${apparies} seance(s) appariee(s) · ${absents} que nous n avons pas ===`);
dire(`=== ${desaccords.length} DESACCORD(S) ===`);
for (const d of desaccords) dire(`   ${String(d.e.pays).padEnd(11)} ${d.e.adjugeLe ?? d.e.emisLe ?? d.e.regleLe} ${d.e.instrument} ${String(d.e.isin ?? "").padEnd(17)} ${d.quoi}`);
