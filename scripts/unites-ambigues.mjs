/**
 * LES LIGNES DONT L UNITE EST DOUTEUSE, ET LA PIECE QUI LES TRANCHE.
 *
 * Un montant servi se compte en milliards dans cette zone. Une ligne dont
 * l ordre de grandeur s ecarte de trois crans de celui de son pays n est pas
 * une petite adjudication : c est une unite, ou une coquille. On les sort
 * toutes, avec l adresse du communique publie et le lien vers la copie que
 * nous gardons, pour que quelqu un puisse ouvrir et trancher.
 *
 * ON NE CORRIGE RIEN ICI. Le script lit, compare et imprime.
 *
 *   npx tsx --conditions=react-server scripts/unites-ambigues.mjs [--md]
 */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { tout } = await import("./_journal.mjs");
const { lienBibliotheque } = await import("../src/lib/intake/bibliotheque.ts");
const { storageKey } = await import("../src/lib/intake/cle.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const md = process.argv.includes("--md");

const nos = await tout(sb, "auction_results", "code_emission, country, instrument, tenor, session_on, announced, bid, served, rate_avg, coverage, source_url, source_title, file_key");
const index = new Map((await tout(sb, "library_items", "file_key, library_path")).map((x) => [x.file_key, x.library_path]));

/** L ordre de grandeur mediane d un pays, sur ses lignes servies. */
const ordres = new Map();
for (const n of nos) {
  const s = Number(n.served ?? 0);
  if (s <= 0) continue;
  const o = Math.floor(Math.log10(s));
  ordres.set(n.country, [...(ordres.get(n.country) ?? []), o]);
}
const mediane = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
/* LA REFERENCE EST LA ZONE, PAS LE PAYS : si TOUTES les lignes d un pays sont
   decalees, sa propre mediane l est aussi et ne peut pas le denoncer. */
const toutesLesOrdres = [...ordres.values()].flat();
const refZone = mediane(toutesLesOrdres);

dire(`=== L ORDRE DE GRANDEUR DU MONTANT SERVI ===`);
dire(`   reference de la zone : 10^${refZone}\n`);
for (const [p, v] of [...ordres].sort()) {
  const m = mediane(v);
  dire(`   ${String(p).padEnd(12)} mediane 10^${m}  sur ${String(v.length).padStart(3)} ligne(s)${m <= refZone - 2 ? "   <= SUSPECT" : ""}`);
}

/**
 * UNE UNITE DECALE LES DEUX MONTANTS, UNE MAUVAISE SEANCE N EN DECALE QU UN.
 *
 * Le Congo a servi 0,25 milliard sur 10 annonces le 15 septembre 2026 : c est
 * une seance qui n a pas trouve preneur, pas une unite. Le signe qui separe
 * les deux est l ANNONCE : un Tresor n annonce pas neuf millions, et quand
 * l annonce est a l echelle de la zone, le petit montant servi est un fait de
 * marche. On ne melange donc pas les deux listes.
 */
const petit = (v) => v != null && Number(v) > 0 && Math.floor(Math.log10(Number(v))) <= refZone - 2;
const suspectes = nos.filter((n) => petit(n.served) && petit(n.announced));
const malServies = nos.filter((n) => petit(n.served) && !petit(n.announced));
dire(`\n=== ${suspectes.length} LIGNE(S) A ECLAIRCIR : l annonce ET le servi sont hors d echelle ===\n`);

const lien = (n) => {
  const chemin = n.file_key ? index.get(storageKey(n.file_key)) : undefined;
  return chemin ? lienBibliotheque(chemin) : undefined;
};
const mds = (v) => (v == null ? "—" : `${(Number(v) / 1e9).toFixed(3)}`);

if (md) {
  dire(`| Pays | Séance | Code | Durée | Annoncé (Mds) | Servi (Mds) | Taux | Communiqué publié | Notre copie |`);
  dire(`|---|---|---|---|---|---|---|---|---|`);
  for (const n of suspectes.sort((a, b) => String(a.session_on).localeCompare(String(b.session_on)))) {
    const l = lien(n);
    dire(
      `| ${n.country} | ${String(n.session_on).slice(0, 10)} | ${n.code_emission ?? "—"} | ${n.tenor ?? "—"} | ${mds(n.announced)} | ${mds(n.served)} | ${n.rate_avg ?? "—"} % | ${n.source_url ? `[BEAC](${n.source_url})` : "—"} | ${l ? `[copie](${l})` : "—"} |`,
    );
  }
} else {
  for (const n of suspectes.sort((a, b) => String(a.session_on).localeCompare(String(b.session_on)))) {
    dire(`   ${String(n.session_on).slice(0, 10)}  ${String(n.country).padEnd(12)} ${String(n.code_emission ?? "—").padEnd(14)} ${String(n.tenor ?? "—").padEnd(12)} annonce ${mds(n.announced).padStart(8)}  servi ${mds(n.served).padStart(8)}  taux ${String(n.rate_avg ?? "—").padStart(5)} %`);
    dire(`      ${String(n.source_title ?? "").slice(0, 110)}`);
    dire(`      publie : ${n.source_url ?? "(aucune adresse)"}`);
    const l = lien(n);
    dire(`      copie  : ${l ?? "(pas de copie indexee)"}`);
  }
}

dire(`\n=== ${malServies.length} LIGNE(S) QUI NE SONT PAS UN PROBLEME D UNITE ===`);
dire(`   (l annonce est a l echelle de la zone : la seance a simplement ete mal servie)`);
for (const n of malServies.sort((a, b) => String(a.session_on).localeCompare(String(b.session_on)))) {
  dire(`   ${String(n.session_on).slice(0, 10)}  ${String(n.country).padEnd(12)} ${String(n.code_emission ?? "—").padEnd(14)} annonce ${mds(n.announced).padStart(8)} Mds  servi ${mds(n.served).padStart(8)} Mds`);
}
