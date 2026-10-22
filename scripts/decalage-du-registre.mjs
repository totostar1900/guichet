/**
 * LE DECALAGE D UNE RANGEE DANS LA COLONNE DES CODES.
 *
 * Des lignes du registre portent, selon le bulletin, le code de leur
 * VOISINE : chez le Gabon 085 puis 093, 093 puis 101, 101 puis 119.
 *
 * TROIS QUESTIONS, ET AUCUNE NE SE DEVINE.
 *
 *   QUELLE COLONNE A GLISSE ? Si les dates et les montants d une ligne
 *   sont identiques dans six bulletins et que seul le code change, c est
 *   le CODE qui bouge, et les dates font foi.
 *
 *   UNE RANGEE OU UN TABLEAU ? Si un seul bulletin decale UNE ligne,
 *   c est un accident. Si toutes les lignes d un tableau portent le code
 *   de la suivante, c est une colonne entiere qui a glisse, et le degat
 *   est bien plus grand que ce qu on voit : on ne detecte que les lignes
 *   qu UN AUTRE bulletin ecrit proprement.
 *
 *   DANS QUEL SENS ? « Le code de la suivante » et « le code de la
 *   precedente » ne se reparent pas pareil, et l ordre du tableau est
 *   celui de l echeance.
 *
 * LA MAJORITE FAIT FOI, et on dit de combien. Un bulletin qui parle seul
 * contre cinq est une faute de lecture, pas un desaccord.
 *
 *   npx tsx --conditions=react-server scripts/decalage-du-registre.mjs
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

const lignes = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("beac_encours_lignes").select("id,arrete,pays,isin,isin_imprime,instrument,emis_le,echeance_le,tenor,titres,faciale,encours,source_titre").range(de, de + 999);
  if (error) throw new Error(error.message);
  lignes.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
dire(`${lignes.length} lignes · ${new Set(lignes.map((r) => r.arrete)).size} arretes\n`);

/* L ECHEANCE EST LA CLEF STABLE : la colonne d emission porte tantot la
   seance tantot le reglement, celle de l echeance ne bouge pas. */
const cle = (r) => `${r.pays}|${r.echeance_le}`;

/* ON COMPARE DES CODES NORMALISES. Sinon « CG13000000094 » et
   « CG1300000094 » passent pour deux codes concurrents alors que c est
   le meme, ecrit une fois avec un zero de trop : la majorite irait au
   code malade et inventerait un desaccord. */
const BIEN_FORME = /^[A-Z]{2}[0-9][0-9A-Z]\d{8}$/;
function normal(code) {
  const c = String(code ?? "").trim();
  if (!c || BIEN_FORME.test(c)) return c;
  const nu = c.split(/\s+/)[0].replace(/\/.*$/, "");
  if (BIEN_FORME.test(nu)) return nu;
  const m = nu.match(/^([A-Z]{2}[0-9][0-9A-Z])(\d+)$/);
  if (!m) return c;
  const [, p, ch] = m;
  if (ch.length === 9 && ch[0] === "0") return p + ch.slice(1);
  if (ch.length === 7) return `${p}0${ch}`;
  return c;
}
for (const r of lignes) r.code = normal(r.isin_imprime ?? r.isin);

/* CE QUE LA MAJORITE DES BULLETINS DIT DU CODE DE CHAQUE LIGNE. */
const voix = new Map();
for (const r of lignes) {
  if (!r.code) continue;
  const v = voix.get(cle(r)) ?? new Map();
  v.set(r.code, (v.get(r.code) ?? 0) + 1);
  voix.set(cle(r), v);
}
const majorite = new Map();
for (const [k, v] of voix) {
  const tri = [...v].sort((a, b) => b[1] - a[1]);
  /* Une majorite de un contre un ne tranche pas. */
  majorite.set(k, tri.length === 1 || tri[0][1] > tri[1][1] ? { code: tri[0][0], pour: tri[0][1], contre: tri.slice(1).reduce((a, [, n]) => a + n, 0) } : null);
}

dire(`=== QUELLE COLONNE A GLISSE ? ===`);
/* Pour chaque ligne dont le code varie, les dates et montants varient-ils aussi ? */
let codeSeul = 0;
let toutVarie = 0;
for (const [k, v] of voix) {
  if (v.size < 2) continue;
  const rs = lignes.filter((r) => cle(r) === k);
  const chiffres = new Set(rs.map((r) => `${r.emis_le}|${r.titres}|${r.faciale}|${r.encours}`));
  if (chiffres.size === 1) codeSeul += 1; else toutVarie += 1;
}
dire(`   ${codeSeul} ligne(s) où SEUL le code varie : les dates et les montants sont identiques`);
dire(`   ${toutVarie} ligne(s) où les chiffres varient aussi`);
dire(`   ${codeSeul > toutVarie ? "LE CODE EST LA COLONNE QUI BOUGE : les dates font foi." : "les chiffres bougent aussi, le diagnostic n'est pas celui-là."}\n`);

dire(`=== OÙ SONT LES DÉSACCORDS, PAR ARRÊTÉ ===`);
const parArrete = new Map();
for (const r of lignes) {
  if (!r.code) continue;
  const m = majorite.get(cle(r));
  const g = parArrete.get(r.arrete) ?? { total: 0, contre: 0, nonTranche: 0, titre: r.source_titre };
  g.total += 1;
  if (!m) g.nonTranche += 1;
  else if (m.code !== r.code) g.contre += 1;
  parArrete.set(r.arrete, g);
}
for (const [a, g] of [...parArrete].sort())
  dire(`   ${a}  ${String(g.total).padStart(4)} ligne(s) · ${String(g.contre).padStart(3)} contre la majorité · ${String(g.nonTranche).padStart(3)} non tranchées · ${String(g.titre).replace(/^Bulletin trimestriel.*?: /, "")}`);

dire(`\n=== LE DÉSACCORD EST-IL « LE CODE DE LA LIGNE VOISINE » ? ===`);
/* Dans chaque bulletin, les lignes d un pays rangees par echeance :
   l ordre du tableau. Un decalage d une rangee se lit alors comme
   « cette ligne porte le code majoritaire de sa voisine ». */
const groupes = new Map();
for (const r of lignes) {
  const k = `${r.arrete}|${r.pays}`;
  const v = groupes.get(k) ?? [];
  v.push(r);
  groupes.set(k, v);
}
const signatures = { suivante: [], precedente: [], autre: [] };
for (const [k, rs] of groupes) {
  rs.sort((a, b) => String(a.echeance_le).localeCompare(String(b.echeance_le)));
  for (let i = 0; i < rs.length; i++) {
    const r = rs[i];
    const m = majorite.get(cle(r));
    if (!m || !r.code || m.code === r.code) continue;
    const suiv = rs[i + 1] ? majorite.get(cle(rs[i + 1])) : null;
    const prec = rs[i - 1] ? majorite.get(cle(rs[i - 1])) : null;
    const quoi = { k, r, attendu: m.code, pour: m.pour, contre: m.contre };
    if (suiv?.code === r.code) signatures.suivante.push(quoi);
    else if (prec?.code === r.code) signatures.precedente.push(quoi);
    else signatures.autre.push(quoi);
  }
}
dire(`   ${signatures.suivante.length} porte(nt) le code de la ligne SUIVANTE (échéance d'après)`);
dire(`   ${signatures.precedente.length} porte(nt) le code de la ligne PRÉCÉDENTE`);
dire(`   ${signatures.autre.length} ne correspond(ent) à aucune voisine immédiate`);

for (const [nom, xs] of [["SUIVANTE", signatures.suivante], ["PRÉCÉDENTE", signatures.precedente], ["AUCUNE VOISINE", signatures.autre]]) {
  if (!xs.length) continue;
  dire(`\n   --- ${nom} ---`);
  for (const x of xs.slice(0, 18))
    dire(`      ${x.k} éch ${x.r.echeance_le} · porte « ${x.r.code} » · la majorité dit « ${x.attendu} » (${x.pour} contre ${x.contre})`);
  if (xs.length > 18) dire(`      … et ${xs.length - 18} autre(s)`);
}

dire(`\n=== UN TABLEAU ENTIER A-T-IL GLISSÉ ? ===`);
/* Si un (arrete, pays) porte PLUSIEURS desaccords tous de meme sens,
   c est la colonne qui a glisse, pas une rangee. Et alors le degat
   depasse ce qu on voit : on ne detecte que les lignes qu un AUTRE
   bulletin ecrit proprement. */
const parGroupe = new Map();
for (const [sens, xs] of [["suivante", signatures.suivante], ["precedente", signatures.precedente], ["autre", signatures.autre]])
  for (const x of xs) {
    const g = parGroupe.get(x.k) ?? { suivante: 0, precedente: 0, autre: 0, total: groupes.get(x.k).length };
    g[sens] += 1;
    parGroupe.set(x.k, g);
  }
for (const [k, g] of [...parGroupe].sort((a, b) => (b[1].suivante + b[1].precedente + b[1].autre) - (a[1].suivante + a[1].precedente + a[1].autre))) {
  const n = g.suivante + g.precedente + g.autre;
  dire(`   ${k.padEnd(26)} ${String(n).padStart(3)} désaccord(s) sur ${String(g.total).padStart(3)} ligne(s) · suivante ${g.suivante} · précédente ${g.precedente} · autre ${g.autre}`);
}
