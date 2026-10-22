/**
 * LES 784 TROUS : LA LIGNE EST-ELLE IMPRIMEE CE JOUR-LA, OUI OU NON ?
 *
 * La relecture complete du 16 octobre 2026 a prouve que le lecteur rend
 * exactement ce que la base contient : 270 seances, +0 partout. Le trou ne
 * vient donc pas d un lecteur qui aurait mal vu, puisqu il voit aujourd hui
 * la meme chose qu hier.
 *
 * RESTE DEUX POSSIBILITES, et une seule question les separe : le BOC
 * imprime-t-il la ligne ce jour-la ? Si oui, le lecteur est aveugle a cette
 * rangee et l a toujours ete. Si non, il n y a pas de trou du tout : la
 * BVMAC a cesse de publier la ligne, et c est un fait sur la source qu il
 * faut dire plutot que combler.
 *
 * ON CHERCHE DONC LE SIGNE DANS LE TEXTE BRUT, pas dans ce que le lecteur en
 * fait. Un ISIN est une chaine de douze caracteres : s il est sur la page,
 * il est dans le texte.
 *
 *   npx tsx --conditions=react-server scripts/trous-encours-dans-le-texte.mjs [isin] [n]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { repo } = await import("../src/lib/data/index.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { rangeesDuPdf } = await import("../src/lib/market/boc-geometrie.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const ISIN = process.argv[2] ?? "TD0000020331";
const combien = Number(process.argv[3] ?? 8);

/* Les seances ou cette ligne manque, entre sa premiere et sa derniere vue. */
const { data: vues, error } = await sb.from("debt_outstandings").select("session_date").eq("isin", ISIN).order("session_date");
if (error) throw new Error(error.message);
const presentes = new Set(vues.map((v) => v.session_date));
const a = vues[0].session_date;
const z = vues[vues.length - 1].session_date;

const bulletins = await repo().listBulletins(3000);
const dansLaPlage = bulletins.filter((b) => b.sessionDate >= a && b.sessionDate <= z && b.fileKey).sort((x, y) => x.sessionDate.localeCompare(y.sessionDate));
const trouees = dansLaPlage.filter((b) => !presentes.has(b.sessionDate));
const temoins = dansLaPlage.filter((b) => presentes.has(b.sessionDate));

dire(`${ISIN} : ${presentes.size} presence(s), ${trouees.length} trou(s), du ${a} au ${z}\n`);

/* On etale l echantillon sur toute la plage des trous plutot que de prendre
   les premiers : un bloc de neuf mois et un de quatre doivent tous deux etre
   representes, sans quoi on conclurait sur un seul. */
const pas = Math.max(1, Math.floor(trouees.length / combien));
const echantillon = trouees.filter((_, i) => i % pas === 0).slice(0, combien);

/* Et UN TEMOIN POSITIF, sans quoi un « absent partout » ne prouverait que
   la panne de la sonde elle-meme. */
if (temoins.length) echantillon.unshift(temoins[Math.floor(temoins.length / 2)]);

for (const b of echantillon) {
  const trou = !presentes.has(b.sessionDate);
  try {
    const bytes = await readSource(b.fileKey);
    const rangees = await rangeesDuPdf(Uint8Array.from(bytes));
    const texte = rangees.map((r) => (typeof r === "string" ? r : (r.texte ?? JSON.stringify(r)))).join("\n");
    const imprime = texte.includes(ISIN);
    dire(`   ${b.sessionDate}  ${trou ? "TROU   " : "temoin "}  ISIN dans le texte : ${imprime ? "OUI" : "non"}   (${texte.length} caracteres lus)`);
  } catch (e) {
    dire(`   ${b.sessionDate}  ${trou ? "TROU   " : "temoin "}  lecture impossible : ${String(e.message).slice(0, 60)}`);
  }
}
