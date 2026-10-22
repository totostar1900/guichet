/**
 * LES DEUX DÉCOUPES SUR LE MÊME TEXTE.
 *
 * C'est le seul instrument qui répond à « la nouvelle grille lit-elle mieux ».
 * Comparer le lecteur à la BASE répondrait à une autre question (la relecture)
 * et confondrait un vieux défaut écrit avec un défaut de lecture d'aujourd'hui.
 * Les deux ont été inversés deux jours de suite en octobre ; on ne recommence
 * pas. Ici : une seule lecture du PDF, deux découpes, zéro écriture.
 *
 *   npx tsx --conditions=react-server scripts/encours-regression.mjs [pas]
 */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { rangeesDuPdf, encoursGeometriques } = await import("../src/lib/market/boc-geometrie.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const pas = Number(process.argv[2] ?? 1);
const tous = (await repo().listBulletins(3000)).filter((b) => b.fileKey).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
const choisis = tous.filter((_, i) => i % pas === 0);
dire(`${choisis.length} séance(s) sur ${tous.length}\n`);

const clef = (e) => `${e.isin}|${e.units}|${e.nominalRemaining ?? e.nominal}|${e.outstanding}`;
let faites = 0, gagnees = 0, perdues = 0, changees = 0, inchangees = 0;
const detail = [];

for (const b of choisis) {
  let rangees;
  try { rangees = await rangeesDuPdf(await readSource(b.fileKey)); } catch { continue; }
  const avant = encoursGeometriques(rangees, undefined, true);
  const apres = encoursGeometriques(rangees, undefined, false);
  faites++;
  const a = new Map(avant.map((e) => [e.isin, e])), b2 = new Map(apres.map((e) => [e.isin, e]));
  const g = [...b2.keys()].filter((i) => !a.has(i));
  const p = [...a.keys()].filter((i) => !b2.has(i));
  const c = [...b2.keys()].filter((i) => a.has(i) && clef(a.get(i)) !== clef(b2.get(i)));
  gagnees += g.length; perdues += p.length; changees += c.length;
  if (!g.length && !p.length && !c.length) inchangees++;
  else detail.push(`${b.sessionDate}  ${avant.length} → ${apres.length}  ${g.length ? `+${g.length}` : ""}${p.length ? ` PERDUES ${p.join(" ")}` : ""}${c.length ? ` CHANGÉES ${c.slice(0, 3).join(" ")}` : ""}`);
  if (faites % 50 === 0) dire(`   ${faites}/${choisis.length} · +${gagnees} −${perdues} ~${changees}`);
}

dire(`\n=== LES DEUX DÉCOUPES, MÊME TEXTE, ${faites} SÉANCES ===`);
dire(`   LIGNES GAGNÉES    ${gagnees}`);
dire(`   lignes perdues    ${perdues}`);
dire(`   lignes changées   ${changees}`);
dire(`   séances inchangées ${inchangees}\n`);
for (const d of detail.slice(0, 60)) dire(`   ${d}`);
if (detail.length > 60) dire(`   … et ${detail.length - 60} autre(s)`);
