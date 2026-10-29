/**
 * LE DOCUMENT SE CONTREDIT-IL LUI-MÊME ?
 *
 * L'essai à blanc a rendu zéro ligne, mais il était CIRCULAIRE : la base a été
 * écrite par ce lecteur, donc « il relit ce qu'elle porte » ne prouve que son
 * déterminisme. Et chercher l'ISIN dans le texte ne prouve rien non plus : un
 * titre absent du tableau des encours reste imprimé dans la cote.
 *
 * LE CONTRÔLE QUI NE PEUT PAS MENTIR EST L'ARITHMÉTIQUE DE LA PIÈCE. Le
 * bulletin imprime un « Total des encours » et, au-dessus, des sous-tableaux
 * avec leur propre total. Si le grand total dépasse la somme des sous-totaux
 * imprimés, le bulletin annonce un encours qu'il n'a pas détaillé : la
 * publication est trouée, et c'est le document qui le dit, pas nous.
 *
 * On compte aussi les rangées d'encours sans passer par le constructeur : la
 * colonne « amortissement » ne paraît que là, et son vocabulaire est fermé.
 *
 *   npx tsx --conditions=react-server scripts/trous-par-arithmetique.mjs [n]
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
  const { data, error } = await sb.from("debt_outstandings").select("isin, session_date, outstanding").order("session_date").order("isin").range(de, de + 999);
  if (error) throw new Error(error.message);
  brut.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
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
for (const [isin, b] of bornes) for (const s of seances) {
  if (s < b.d1 || s > b.d2 || presentes.has(`${isin}|${s}`)) continue;
  manquantesPar.set(s, [...(manquantesPar.get(s) ?? []), isin]);
}
const enBase = new Map();
for (const l of brut) enBase.set(l.session_date, (enBase.get(l.session_date) ?? 0) + 1);

const combien = Number(process.argv[2] ?? 40);
const trouees = [...manquantesPar.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, combien);
const bulletins = new Map((await repo().listBulletins(3000)).map((b) => [b.sessionDate, b]));

/* Le vocabulaire fermé de la colonne « amortissement » : il ne paraît que dans
   un tableau d encours, jamais dans la cote. */
const AMORTI = /\b(CONSTANT|IN\s*-?\s*FINE|DIFFERE|DIFFÉRÉ)\b/i;
const nombre = (s) => Number(s.replace(/[^\d]/g, "")) || 0;

let pieces = 0, trouDocumentaire = 0, sommeManque = 0, lecteurPerd = 0;
const mds = (n) => (n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
dire(`séance      imprimées  en base  ·  total annoncé      somme des sous-totaux      écart`);

for (const [seance] of trouees) {
  const b = bulletins.get(seance);
  if (!b?.fileKey) continue;
  let rangees;
  try { rangees = await rangeesDuPdf(await readSource(b.fileKey)); } catch { continue; }
  pieces++;
  const lignes = rangees.map((r) => r.cellules.map((c) => c.texte).join(" "));
  /* CE QUE LA PIÈCE IMPRIME VRAIMENT : une rangée d encours porte un ISIN ET
     un mot d amortissement. Aucun constructeur là-dedans. */
  const imprimees = lignes.filter((t) => AMORTI.test(t) && /\b[A-Z]{2}\d{10}\b/.test(t)).length;
  const base = enBase.get(seance) ?? 0;

  const mTotal = lignes.map((t) => t.match(/Total\s+des\s+encours\s*:?\s*([\d\s  ]+)/i)).find(Boolean);
  const sousTotaux = lignes.map((t) => t.match(/^\s*Total\s*:?\s*\|?\s*([\d][\d\s  ]{6,})/i)).filter(Boolean).map((m) => nombre(m[1]));
  const total = mTotal ? nombre(mTotal[1]) : 0;
  const somme = sousTotaux.reduce((a, x) => a + x, 0);
  const ecart = total - somme;
  if (total && ecart > 1e8) { trouDocumentaire++; sommeManque += ecart; }
  if (imprimees > base) lecteurPerd += imprimees - base;
  dire(`${seance}  ${String(imprimees).padStart(6)}  ${String(base).padStart(7)}  ·  ${mds(total).padStart(9)} Mds  ${mds(somme).padStart(14)} Mds  ${mds(ecart).padStart(9)} Mds${imprimees > base ? "   ← LE LECTEUR EN PERD " + (imprimees - base) : ""}`);
}

dire(`\n=== SUR ${pieces} PIÈCES, LES SÉANCES LES PLUS TROUÉES ===`);
dire(`   pièces où le total annoncé dépasse ses sous-tableaux   ${trouDocumentaire}`);
dire(`   encours annoncé et jamais détaillé, cumulé             ${mds(sommeManque)} Mds`);
dire(`   rangées imprimées que notre lecteur n'a pas écrites    ${lecteurPerd}`);
