/**
 * LA DÉCOUPE SE TRANCHE-T-ELLE AVEC CE QUE LA VEILLE SAIT ?
 *
 * Hypothèse du 11 octobre 2026 : quand le lecteur renonce à couper « prix /
 * nominal » (famille I) ou toute une ligne (famille H), il lui manque un
 * nombre qu'il a pourtant en base. Le prix attendu de la ligne est
 * pct × nominal / 100 pris à la SÉANCE DE LA VEILLE, et les deux cas du
 * dépôt tombent au centime :
 *
 *   CG0000020238  « 3 166,670,000 »  95,000 % de 3 333,333  →  3 166,67
 *   GA0000020248  « 2 487,500,000 »  99,500 % de 2 500,000  →  2 487,50
 *
 * Mais ces chaînes sont des GROUPES CAPTURÉS, pas la ligne du PDF. Avant
 * d'écrire une ligne de lecteur, il faut le texte brut, et seule une
 * relecture le rend. Ce script le rend, sans rien écrire.
 *
 *   npx tsx scripts/decoupe-contre-veille.mjs [combien]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText } = await import("../src/lib/market/boc.ts");
const { parseBoc } = await import("../src/lib/market/boc-parse.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { enAttente } = await import("../src/lib/market/remarques.ts");
const { repo } = await import("../src/lib/data/index.ts");

const r = repo();
const combien = Number(process.argv[2]) || 12;

/* Les séances dont une remarque porte sur une découpe : I (prix / nominal
   ambigus) et H (ligne entière non reconnue). Ce sont les deux familles que
   l'hypothèse prétend servir. */
const CIBLES = /^Obligation ([A-Z]{2}\d{10}) : (ligne de cours non reconnue|prix \/ nominal ambigus)/;
const tous = await r.listBulletins(2000);
const lot = tous
  .filter(enAttente)
  .filter((b) => [...(b.warnings ?? []), ...(b.anomalies ?? [])].some((w) => CIBLES.test(w)))
  .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
  .slice(0, combien);

console.log(`${lot.length} séances reprises, sur ${tous.filter(enAttente).length} en attente\n`);

let avec = 0;
let sans = 0;
const parLigne = {};

for (const b of lot) {
  let bytes;
  try {
    bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
  } catch {
    bytes = undefined;
  }
  if (!bytes) {
    console.log(`${b.sessionDate} : document injoignable`);
    continue;
  }

  /* LA DERNIÈRE LECTURE DE LA LIGNE, ET NON LA SÉANCE PRÉCÉDENTE.
     La première version prenait la veille du calendrier, et quatre cas sur
     neuf répondaient « pas de veille » : quand une ligne échoue un jour, elle
     n'a plus de référence le lendemain, donc elle échoue encore, et la panne
     se propage toute seule. Une ligne se réfère à SA propre dernière lecture,
     quelle que soit sa date : c'est ce qui casse la cascade. */
  const veille = new Map();

  let parsed;
  try {
    parsed = parseBoc(await pdfText(bytes));
  } catch (e) {
    console.log(`${b.sessionDate} : lecture impossible (${e.message})`);
    continue;
  }

  for (const n of parsed.notes) {
    const m = n.message.match(CIBLES);
    if (!m || !n.brut) continue;
    const isin = m[1];
    if (!veille.has(isin)) {
      const hist = await r.listQuotes(isin, 2000).catch(() => []);
      veille.set(isin, hist.filter((x) => x.sessionDate < b.sessionDate).sort((x, y) => y.sessionDate.localeCompare(x.sessionDate))[0]);
    }
    const q = veille.get(isin);
    /* Le pourcentage de la veille est son « close », et le nominal son
       « nominalRemaining ». J avais écrit previousPct, qui n existe pas, et le
       script répondait « pas de veille » partout : une absence fabriquée. */
    const attendu = q && q.close != null && q.nominalRemaining != null ? (q.close * q.nominalRemaining) / 100 : undefined;
    /* Le prix attendu se cherche DANS le texte brut, sous la forme que le
       bulletin imprime : espace fine pour les milliers, virgule décimale. */
    const formes = attendu === undefined ? [] : [attendu.toFixed(2), attendu.toFixed(3), Math.round(attendu).toString()].map((s) => s.replace(".", ",")).flatMap((s) => [s, s.replace(/(\d)(?=(\d{3})+,)/g, "$1 ")]);
    const trouve = formes.find((f) => n.brut.replace(/\u202f|\u00a0/g, " ").includes(f));
    (parLigne[isin] ??= { vus: 0, trouves: 0 }).vus += 1;
    if (trouve) {
      avec += 1;
      parLigne[isin].trouves += 1;
    } else sans += 1;
    console.log(
      `${b.sessionDate} ${isin} ${trouve ? "TROUVÉ" : "non   "} attendu ${attendu === undefined ? "— (pas de veille)" : attendu.toFixed(2)}${trouve ? ` sous « ${trouve} »` : ""}`,
    );
    if (!trouve) console.log(`    brut : ${n.brut.slice(0, 200)}`);
  }
}

console.log(`\n${avec} découpes que le prix de la veille désigne · ${sans} non\n`);
for (const [isin, v] of Object.entries(parLigne).sort((a, b) => b[1].vus - a[1].vus)) console.log(`   ${isin}  ${v.trouves}/${v.vus}`);
