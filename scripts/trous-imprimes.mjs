/**
 * CE QUE LA PIÈCE IMPRIME, CONTRE CE QUE NOUS AVONS ÉCRIT.
 *
 * L'essai à blanc a rendu zéro ligne retrouvée sur 547 séances et j'ai failli
 * en conclure que les trous étaient dans le document. LA MESURE ÉTAIT
 * CIRCULAIRE : elle comparait le constructeur à une base que ce même
 * constructeur avait écrite. Deux lectures d'accord ne prouvent rien quand
 * c'est la même lecture.
 *
 * ON COMPTE DONC SANS LE CONSTRUCTEUR. Une rangée d'encours porte un ISIN ET
 * un mot de la colonne « amortissement », dont le vocabulaire est fermé
 * (constant, in fine, différé) et qui ne paraît dans aucun autre tableau. On
 * relève les ISIN DISTINCTS ainsi marqués, parce qu'un tableau du bulletin
 * peut paraître plusieurs fois, et on les compare à la base.
 *
 * CETTE MESURE EST UN PLANCHER, et c'est le bon sens de l'erreur : une rangée
 * coupée en deux hauteurs met l'ISIN en haut et l'amortissement en bas, donc
 * elle n'est pas comptée. Ce qu'on trouve est donc au moins ce qu'il y a.
 *
 *   npx tsx --conditions=react-server scripts/trous-imprimes.mjs [n]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }

const { createClient } = await import("@supabase/supabase-js");
const { rangeesDuPdf } = await import("../src/lib/market/boc-geometrie.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const brut = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("debt_outstandings").select("isin, session_date").order("session_date").order("isin").range(de, de + 999);
  if (error) throw new Error(error.message);
  brut.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
const parSeance = new Map();
for (const l of brut) parSeance.set(l.session_date, new Set([...(parSeance.get(l.session_date) ?? []), l.isin]));

const bornes = new Map();
for (const l of brut) {
  const b = bornes.get(l.isin) ?? { d1: l.session_date, d2: l.session_date };
  if (l.session_date < b.d1) b.d1 = l.session_date;
  if (l.session_date > b.d2) b.d2 = l.session_date;
  bornes.set(l.isin, b);
}
const seances = [...parSeance.keys()].sort();
const manquantesPar = new Map();
for (const [isin, b] of bornes) for (const s of seances) {
  if (s < b.d1 || s > b.d2 || parSeance.get(s).has(isin)) continue;
  manquantesPar.set(s, [...(manquantesPar.get(s) ?? []), isin]);
}

const combien = Number(process.argv[2] ?? 40);
const trouees = [...manquantesPar.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, combien);
const bulletins = new Map((await repo().listBulletins(3000)).map((b) => [b.sessionDate, b]));

const AMORTI = /\b(CONSTANT|IN\s*-?\s*FINE|DIFFERE|DIFFÉRÉ)\b/i;
const ISIN = /\b([A-Z]{2}\d{10})\b/g;

let pieces = 0, perduesEnTout = 0, absentesEnTout = 0, parfaites = 0;
const parIsin = new Map();
dire(`séance      imprimées  écrites  manquantes  ·  dont imprimées et perdues`);

for (const [seance, manquantes] of trouees) {
  const b = bulletins.get(seance);
  if (!b?.fileKey) continue;
  let rangees;
  try { rangees = await rangeesDuPdf(await readSource(b.fileKey)); } catch { continue; }
  pieces++;
  const imprimes = new Set();
  for (const r of rangees) {
    const t = r.cellules.map((c) => c.texte).join(" ");
    if (!AMORTI.test(t)) continue;
    for (const m of t.matchAll(ISIN)) imprimes.add(m[1]);
  }
  const ecrites = parSeance.get(seance);
  /* LES DEUX POPULATIONS, ET IL FAUT LES SÉPARER : une ligne attendue que la
     pièce imprime est une perte de lecture, une ligne attendue qu'elle
     n'imprime pas est un trou de publication. */
  const perdues = manquantes.filter((i) => imprimes.has(i));
  const absentes = manquantes.filter((i) => !imprimes.has(i));
  perduesEnTout += perdues.length;
  absentesEnTout += absentes.length;
  if (!perdues.length) parfaites++;
  for (const i of perdues) parIsin.set(i, (parIsin.get(i) ?? 0) + 1);
  dire(`${seance}  ${String(imprimes.size).padStart(6)}  ${String(ecrites.size).padStart(7)}  ${String(manquantes.length).padStart(10)}  ·  ${String(perdues.length).padStart(3)}${perdues.length ? "  " + perdues.slice(0, 4).join(" ") : ""}`);
}

dire(`\n=== SUR ${pieces} PIÈCES, LES SÉANCES LES PLUS TROUÉES ===`);
dire(`   lignes attendues QUE LA PIÈCE IMPRIME  ${perduesEnTout}   notre lecteur les perd`);
dire(`   lignes attendues QUE LA PIÈCE N'A PAS  ${absentesEnTout}   la BVMAC ne les a pas publiées`);
dire(`   pièces sans aucune perte de lecture    ${parfaites} sur ${pieces}`);
if (parIsin.size) {
  dire(`\n   les lignes perdues, par ISIN :`);
  for (const [i, n] of [...parIsin.entries()].sort((a, b) => b[1] - a[1])) dire(`      ${i}  ${n} séance(s)`);
}
