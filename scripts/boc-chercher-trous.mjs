/**
 * CHERCHER LES BULLETINS MANQUANTS, JOUR PAR JOUR.
 *
 * Le numéro de série dit combien il en manque, pas quand. L'adresse d'un BOC
 * se déduit en revanche de sa date : on essaie donc chaque jour entre les deux
 * séances qui encadrent le trou, et la source répond elle-même. Vingt trous,
 * quelques dizaines d'essais, aucune supposition.
 *
 * ON NE TESTE PAS LE WEEK-END, et c'est la seule règle qu'on s'autorise :
 * aucune des 814 séances connues ne tombe un samedi ou un dimanche.
 *
 * LA BVMAC RANGE SELON LE MOIS DU TÉLÉVERSEMENT, PAS CELUI DE LA SÉANCE, et
 * elle suffixe quand elle reprend une pièce. Trois bulletins sur vingt sont
 * sortis à l'adresse canonique : on essaie donc aussi les trois mois suivants
 * et les suffixes que le site emploie.
 *
 *   npx tsx --conditions=react-server scripts/boc-chercher-trous.mjs [--prendre]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const prendre = process.argv.includes("--prendre");

const lignes = [];
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from("market_bulletins").select("session_date, number").order("session_date").range(de, de + 999);
  lignes.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
const connues = new Set(lignes.map((b) => b.session_date));
const numerotes = lignes.filter((b) => b.number).sort((a, b) => a.number - b.number);
const vus = new Set(numerotes.map((b) => b.number));

const aEssayer = new Set();
for (let n = numerotes[0].number; n <= numerotes[numerotes.length - 1].number; n++) {
  if (vus.has(n)) continue;
  const avant = numerotes.filter((x) => x.number < n).pop();
  const apres = numerotes.find((x) => x.number > n);
  if (!avant || !apres) continue;
  for (let t = Date.parse(`${avant.session_date}T12:00:00Z`) + 86400000; t < Date.parse(`${apres.session_date}T12:00:00Z`); t += 86400000) {
    const d = new Date(t);
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
    const iso = d.toISOString().slice(0, 10);
    if (!connues.has(iso)) aEssayer.add(iso);
  }
}
const dates = [...aEssayer].sort();
dire(`${dates.length} jour(s) à essayer, ${vus.size ? numerotes[numerotes.length - 1].number - numerotes[0].number + 1 - vus.size : 0} numéro(s) manquant(s)\n`);

function adresses(s) {
  const [y, m, d] = s.split("-");
  const out = [];
  for (let k = 0; k < 4; k++) {
    const t = new Date(Date.UTC(Number(y), Number(m) - 1 + k, 1));
    const an = t.getUTCFullYear();
    const mo = String(t.getUTCMonth() + 1).padStart(2, "0");
    for (const suffixe of ["", "-1", "-2", "_1"]) {
      out.push(`https://www.bvm-ac.org/wp-content/uploads/${an}/${mo}/BOC-${y}${m}${d}${suffixe}.pdf`);
    }
  }
  return out;
}

const trouves = [];
for (const s of dates) {
  for (const a of adresses(s)) {
    let res;
    try {
      res = await fetch(a, { headers: { "user-agent": "Guichet/1.0 (Purpose Capital; market data ingestion)" }, method: "HEAD" });
    } catch {
      continue;
    }
    if (res.ok) {
      trouves.push({ seance: s, url: a });
      dire(`   ${s}  TROUVÉ  ${res.headers.get("content-length") ?? "?"} octets  ${a.replace(/.*uploads/, "…")}`);
      break;
    }
    await new Promise((r) => setTimeout(r, 120));
  }
}

dire(`\n${trouves.length} bulletin(s) retrouvé(s) sur ${dates.length} essai(s)`);
if (trouves.length) dire(`   ${trouves.map((t) => t.seance).join(" ")}`);

if (prendre && trouves.length) {
  const { ingestBoc } = await import("../src/lib/market/boc.ts");
  dire(`\n=== INGESTION ===`);
  for (const { seance } of trouves) {
    try {
      const r = await ingestBoc({ sessionDate: seance, by: "desk" });
      dire(`   ${seance}  ${r.error ? `ÉCHEC : ${r.error}` : `ok · ${r.created?.length ?? 0} créée(s)`}`);
    } catch (e) {
      dire(`   ${seance}  ÉCHEC : ${e.message}`);
    }
  }
} else if (trouves.length) {
  dire(`\nEssai à blanc. Relancer avec --prendre pour ingérer.`);
}
