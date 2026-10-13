/**
 * CE QU'UNE RELECTURE RENDRAIT SUR LES SÉANCES TROUÉES. ESSAI À BLANC.
 *
 * La tentation est de relancer la lecture sur les 35 séances et d'espérer.
 * Elle a déjà coûté deux heures et demie cette semaine pour rien : le
 * lecteur d'encours n'a pas bougé depuis que ces trous se sont formés, donc
 * il n'y a aucune raison a priori qu'il lise mieux aujourd'hui.
 *
 * ON MESURE DONC AVANT D'ÉCRIRE : on refait tourner la lecture géométrique
 * sur la pièce gardée et on compare ce qu'elle rend à ce que la base porte.
 * Rien n'est écrit. Si l'essai rend zéro, le problème n'est pas le lecteur
 * et une relecture serait du temps perdu.
 *
 *   npx tsx --conditions=react-server scripts/trous-essai.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { createClient } = await import("@supabase/supabase-js");
const { rangeesDuPdf, encoursGeometriques } = await import("../src/lib/market/boc-geometrie.ts");
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

/* Les trous : une ligne attendue entre sa première et sa dernière apparition
   et absente d'une séance intermédiaire. */
const bornes = new Map();
for (const l of brut) {
  const b = bornes.get(l.isin) ?? { d1: l.session_date, d2: l.session_date };
  if (l.session_date < b.d1) b.d1 = l.session_date;
  if (l.session_date > b.d2) b.d2 = l.session_date;
  bornes.set(l.isin, b);
}
const presentes = new Set(brut.map((l) => `${l.isin}|${l.session_date}`));
const seances = [...new Set(brut.map((l) => l.session_date))].sort();
const manquantesPar = new Map();
for (const [isin, b] of bornes) {
  for (const s of seances) {
    if (s < b.d1 || s > b.d2 || presentes.has(`${isin}|${s}`)) continue;
    manquantesPar.set(s, [...(manquantesPar.get(s) ?? []), isin]);
  }
}
const trouees = [...manquantesPar.entries()].sort((a, b) => b[1].length - a[1].length);
dire(`${trouees.length} séance(s) trouée(s), ${[...manquantesPar.values()].reduce((a, x) => a + x.length, 0)} ligne(s) manquante(s)\n`);

const bulletins = new Map((await repo().listBulletins(3000)).map((b) => [b.sessionDate, b]));

let lues = 0, rendues = 0, toujoursManquantes = 0, sansPiece = 0;
const details = [];
for (const [seance, manquantes] of trouees) {
  const b = bulletins.get(seance);
  if (!b?.fileKey) { sansPiece++; continue; }
  let geo = [];
  try {
    geo = encoursGeometriques(await rangeesDuPdf(await readSource(b.fileKey)));
  } catch (e) {
    details.push(`${seance}  pièce illisible : ${e.message}`);
    continue;
  }
  lues++;
  const rendusIci = manquantes.filter((isin) => geo.some((g) => g.isin === isin));
  rendues += rendusIci.length;
  toujoursManquantes += manquantes.length - rendusIci.length;
  details.push(`${seance}  ${String(manquantes.length).padStart(2)} manquante(s) · la lecture en rend ${String(rendusIci.length).padStart(2)} · elle lit ${String(geo.length).padStart(2)} ligne(s) au total`);
  if (lues % 10 === 0) dire(`   ${lues}/${trouees.length} séances essayées · ${rendues} ligne(s) retrouvée(s)`);
}

dire(`\nséances essayées        ${lues}`);
dire(`séances sans pièce      ${sansPiece}`);
dire(`LIGNES RETROUVÉES       ${rendues}`);
dire(`lignes toujours absentes ${toujoursManquantes}\n`);
for (const d of details) dire(`   ${d}`);
