/**
 * CE QUE LA RELECTURE DES SÉANCES EN ATTENTE RENDRAIT, SANS RIEN ÉCRIRE.
 *
 * La question posée le 11 octobre 2026 : les deux cent douze séances en
 * attente changeraient-elles quelque chose si on les relisait ? Une nuit de
 * relectures l'a déjà dit une fois pour rien (six passes, 360 relectures,
 * zéro cours gagné le 6 octobre). L'essai à blanc répond sans toucher la
 * base : on reprend le PDF, on le repasse au lecteur D'AUJOURD'HUI, et on
 * compare son résultat à ce qui est enregistré.
 *
 * Le rapport de /desk/bulletins/[seance] fait cela pour UNE séance. Ici c'est
 * la même mesure sur toute la file, et avec la complétion géométrique que le
 * rapport de page n'appelle pas : c'est elle qui a rattrapé 650 lignes le
 * 6 octobre, donc l'omettre sous-estimerait le gain.
 *
 * RIEN N'EST ÉCRIT : ni cotation, ni VL, ni statut, ni date de lecture.
 *
 *   npx tsx scripts/essai-a-blanc-boc.mjs [combien] [--depuis AAAA-MM-JJ]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText } = await import("../src/lib/market/boc.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { parseBoc } = await import("../src/lib/market/boc-parse.ts");
const { completerObligations } = await import("../src/lib/market/boc-geometrie.ts");
const { repo } = await import("../src/lib/data/index.ts");

/* Le dernier nominal non nul de chaque obligation avant une séance : la
   seconde identité du lecteur, recopiée ici pour que l'essai juge exactement
   ce que l'ingestion fera. */
const cacheHist = new Map();
async function nominauxDeReference(avant) {
  const out = new Map();
  for (const q of await repo().latestQuotes().catch(() => [])) {
    if (q.instrument !== "obligation") continue;
    if (q.sessionDate < avant && q.nominalRemaining > 0) {
      out.set(q.isin, q.nominalRemaining);
      continue;
    }
    if (!cacheHist.has(q.isin)) cacheHist.set(q.isin, await repo().listQuotes(q.isin, 2000).catch(() => []));
    const ref = cacheHist.get(q.isin).filter((x) => x.sessionDate < avant && x.nominalRemaining > 0).sort((x, y) => y.sessionDate.localeCompare(x.sessionDate))[0];
    if (ref) out.set(q.isin, ref.nominalRemaining);
  }
  return out;
}

const combien = Number(process.argv[2]) || 1e9;
const depuis = process.argv.includes("--depuis") ? process.argv[process.argv.indexOf("--depuis") + 1] : undefined;

const r = repo();
const tous = await r.listBulletins(2000);
const attente = tous
  .filter((b) => b.status !== "ok" || !b.counts?.equities)
  .filter((b) => !depuis || b.sessionDate >= depuis)
  .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));

console.log(`${tous.length} séances en base · ${attente.length} en attente${depuis ? ` depuis ${depuis}` : ""} · essai sur ${Math.min(combien, attente.length)}\n`);

const lot = attente.slice(0, combien);
/* « bloque » n'est pas « gagne ». Quand parseBoc ne reconnaît pas l'en-tête,
   ingestBoc écrit un échec à zéro cours et JETTE tout ce qui a été lu, même
   six actions et neuf obligations bien formées. Ces séances-là ont des lignes
   à gagner et ne les gagneraient pas : les compter avec les autres aurait
   annoncé un gain que la relecture n'apporte pas. */
const bilan = { lu: 0, injoignable: 0, gagne: [], bloque: [], perd: [], egal: 0, panne: [] };

for (const b of lot) {
  let bytes;
  let d_ou = "";
  try {
    if (b.fileKey) {
      bytes = await readSource(b.fileKey);
      d_ou = "copie";
    }
  } catch {
    bytes = undefined;
  }
  if (!bytes) {
    try {
      const got = await fetchBoc(b.sessionDate);
      if (got) {
        bytes = got.bytes;
        d_ou = "bourse";
      }
    } catch (e) {
      bilan.panne.push(`${b.sessionDate} : ${e.message}`);
      continue;
    }
  }
  if (!bytes) {
    bilan.injoignable += 1;
    continue;
  }

  try {
    /* AVEC LES NOMINAUX DE RÉFÉRENCE, comme l'ingestion les fournit : sans
       eux l'essai jugerait un autre lecteur que celui qui tourne, et c'est
       la seule façon de rendre un essai à blanc menteur. */
    const parsed = parseBoc(await pdfText(bytes), await nominauxDeReference(b.sessionDate));
    const rattrapees = await completerObligations(parsed, bytes);
    bilan.lu += 1;
    const av = { a: b.counts?.equities ?? 0, o: b.counts?.bonds ?? 0, f: b.counts?.funds ?? 0 };
    const ap = { a: parsed.equities.length, o: parsed.bonds.length, f: parsed.funds.length };
    const delta = ap.a - av.a + (ap.o - av.o) + (ap.f - av.f);
    const ligne = `${b.sessionDate} ${d_ou.padEnd(7)} actions ${av.a}→${ap.a} · obligations ${av.o}→${ap.o} · OPCVM ${av.f}→${ap.f}${rattrapees.length ? ` · géométrie +${rattrapees.length}` : ""}${parsed.bulletinNo ? "" : " · EN-TÊTE NON RECONNU"}`;
    const mieux = ap.a > av.a || ap.o > av.o || ap.f > av.f;
    if (mieux && !parsed.bulletinNo) bilan.bloque.push(ligne);
    else if (mieux) bilan.gagne.push(ligne);
    else if (delta < 0) bilan.perd.push(ligne);
    else bilan.egal += 1;
    process.stdout.write(`\r${bilan.lu + bilan.injoignable + bilan.panne.length}/${lot.length}   `);
  } catch (e) {
    bilan.panne.push(`${b.sessionDate} : ${e.message}`);
  }
}

console.log(`\n\n=== CE QUE LA RELECTURE RENDRAIT (${lot.length} séances reprises) ===\n`);
console.log(`   ${String(bilan.gagne.length).padStart(4)} séances gagneraient des lignes`);
console.log(`   ${String(bilan.bloque.length).padStart(4)} séances en lisent, mais l'en-tête non reconnu fait tout jeter`);
console.log(`   ${String(bilan.egal).padStart(4)} séances rendraient exactement la même chose`);
console.log(`   ${String(bilan.perd.length).padStart(4)} séances en rendraient MOINS (le lecteur a régressé, ou le PDF servi a changé)`);
console.log(`   ${String(bilan.injoignable).padStart(4)} documents introuvables`);
console.log(`   ${String(bilan.panne.length).padStart(4)} lectures impossibles`);

if (bilan.gagne.length) console.log(`\nles séances à gagner :\n${bilan.gagne.map((l) => `   ${l}`).join("\n")}`);
if (bilan.bloque.length) console.log(`\ncelles que l'en-tête bloque :\n${bilan.bloque.map((l) => `   ${l}`).join("\n")}`);
if (bilan.perd.length) console.log(`\ncelles qui perdraient :\n${bilan.perd.map((l) => `   ${l}`).join("\n")}`);
if (bilan.panne.length) console.log(`\nles pannes :\n${bilan.panne.map((l) => `   ${l}`).join("\n")}`);
