/**
 * LA RELECTURE : le pipeline d'aujourd'hui contre ce que la base contient.
 *
 * Ce n'est PAS une régression, et la distinction a déjà coûté deux jours. Une
 * régression compare DEUX LECTEURS sur le MÊME TEXTE. Une relecture compare le
 * lecteur courant à ce qui est écrit en base, et elle répond à « que gagne-t-on
 * à réécrire ». C'est la seconde question qu'on pose ici.
 *
 * Il n'écrit rien. Il dit seulement ce qui changerait.
 *
 *   npx tsx --conditions=react-server scripts/encours-relecture.mjs [--tout] [séance…]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc } = await import("../src/lib/market/boc.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");
const { rangeesDuPdf, encoursGeometriques } = await import("../src/lib/market/boc-geometrie.ts");

const dire = (s) => fs.writeSync(1, `${s}\n`);
const r = repo();
const tous = await r.listBulletins(2000);
const demandees = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const cibles = process.argv.includes("--tout") ? tous.map((b) => b.sessionDate).sort() : demandees;

/** Les champs dont un changement compte, et leur nom en clair. */
const CHAMPS = ["issuer", "designation", "mnemo", "units", "nominalRemaining", "pricePct", "outstanding", "amountRaised", "couponRate", "amortisation", "periodicity", "previousCouponOn", "nextCouponOn"];

const compte = { seances: 0, inchangees: 0, touchees: 0, gagnees: 0, perdues: 0, modifiees: 0 };
const parChamp = new Map();
const exemples = [];
const debut = Date.now();

for (const [i, jour] of cibles.entries()) {
  const b = tous.find((x) => x.sessionDate === jour);
  if (!b) continue;
  let neuf;
  try {
    const bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(jour))?.bytes;
    if (!bytes) continue;
    neuf = encoursGeometriques(await rangeesDuPdf(Uint8Array.from(bytes)));
  } catch (e) {
    dire(`  ${jour} : ${e.message}`);
    continue;
  }
  const ancien = await r.encoursDette(jour);
  compte.seances += 1;

  const parIsinA = new Map(ancien.map((l) => [l.isin, l]));
  const parIsinN = new Map(neuf.map((l) => [l.isin, l]));
  let bouge = false;

  for (const [isin, n] of parIsinN) {
    const a = parIsinA.get(isin);
    if (!a) {
      compte.gagnees += 1;
      bouge = true;
      continue;
    }
    const diff = CHAMPS.filter((c) => String(a[c] ?? "") !== String(n[c] ?? ""));
    if (diff.length === 0) continue;
    compte.modifiees += 1;
    bouge = true;
    for (const c of diff) parChamp.set(c, (parChamp.get(c) ?? 0) + 1);
    if (exemples.length < 12) exemples.push(`${jour} ${isin} ${diff.map((c) => `${c} : ${a[c]} → ${n[c]}`).join(" · ")}`);
  }
  for (const isin of parIsinA.keys()) {
    if (!parIsinN.has(isin)) {
      compte.perdues += 1;
      bouge = true;
      if (exemples.length < 12) exemples.push(`${jour} ${isin} PERDUE`);
    }
  }
  if (bouge) compte.touchees += 1;
  else compte.inchangees += 1;

  if ((i + 1) % 25 === 0) {
    const par = (Date.now() - debut) / (i + 1);
    dire(`  ${i + 1}/${cibles.length} · ${compte.touchees} séances touchées · ${compte.modifiees} lignes modifiées, +${compte.gagnees} / -${compte.perdues} · reste ~${Math.round((par * (cibles.length - i - 1)) / 60000)} min`);
  }
}

dire(`\n=== RELECTURE : ${compte.seances} séances lues ===`);
dire(`  inchangées        ${compte.inchangees}`);
dire(`  touchées          ${compte.touchees}`);
dire(`  lignes modifiées  ${compte.modifiees}`);
dire(`  lignes gagnées    ${compte.gagnees}`);
dire(`  LIGNES PERDUES    ${compte.perdues}   ${compte.perdues ? "<<< une perte n est jamais acceptable sans explication" : "aucune"}`);
dire(`\n  par champ :`);
for (const [c, n] of [...parChamp].sort((a, b) => b[1] - a[1])) dire(`    ${c.padEnd(20)} ${n}`);
dire(`\n  échantillon :`);
for (const e of exemples) dire(`    ${e}`);
