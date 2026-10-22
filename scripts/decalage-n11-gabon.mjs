/**
 * LE BLOC DECALE DU BULLETIN N°11, ET QUELLE COLONNE A BOUGE.
 *
 * Huit rangees du tableau des obligations gabonaises, arrete au
 * 30 septembre 2020, portent un code que les neuf autres bulletins
 * attribuent a une AUTRE echeance. Et les codes forment une chaine :
 * 085 → 093 → 101 → 119 → 127 → K017.
 *
 * LA QUESTION N EST PAS « Y A-T-IL UN DECALAGE » MAIS « QU EST-CE QUI A
 * GLISSE ». Deux lectures s opposent et ne se reparent pas pareil :
 *
 *   LE CODE A GLISSE. La rangee garde ses dates et ses montants, et
 *   recoit le code de la voisine. Alors l echeance fait foi.
 *
 *   TOUT LE RESTE A GLISSE. Le code reste a sa place et ce sont les
 *   dates et les montants qui montent d un cran. Alors le code fait foi.
 *
 * ON NE TRANCHE PAS PAR LA VARIANCE : « titres » et « encours » changent
 * LEGITIMEMENT d un trimestre a l autre, parce qu une ligne s abonde et
 * s amortit. Deux de mes mesures s y sont trompees aujourd hui.
 *
 * ON TRANCHE EN DEMANDANT, POUR CHAQUE RANGEE DU N°11 : ses montants
 * ressemblent-ils a ceux que les autres bulletins donnent A SON
 * ECHEANCE, ou a ceux qu ils donnent AU CODE QU ELLE PORTE ?
 *
 *   npx tsx --conditions=react-server scripts/decalage-n11-gabon.mjs
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
  const { data, error } = await sb.from("beac_encours_lignes").select("arrete,pays,isin,isin_imprime,instrument,emis_le,echeance_le,tenor,titres,faciale,encours").range(de, de + 999);
  if (error) throw new Error(error.message);
  lignes.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
for (const r of lignes) r.code = r.isin;

const ARRETE = "2020-09-30";
const bloc = lignes
  .filter((r) => r.arrete === ARRETE && r.pays === "Gabon" && r.instrument === "OTA")
  .sort((a, b) => String(a.echeance_le).localeCompare(String(b.echeance_le)));

dire(`=== LE TABLEAU DES OBLIGATIONS GABONAISES AU ${ARRETE} (bulletin n°11) ===`);
dire(`   ${bloc.length} rangee(s)\n`);
dire(`   ${"échéance".padEnd(12)} ${"code porté".padEnd(14)} ${"émis".padEnd(12)} ${"titres".padStart(9)} ${"encours".padStart(14)}`);
for (const r of bloc) dire(`   ${String(r.echeance_le).padEnd(12)} ${String(r.code).padEnd(14)} ${String(r.emis_le).padEnd(12)} ${String(r.titres ?? "—").padStart(9)} ${String(r.encours ?? "—").padStart(14)}`);

/** Ce que les AUTRES bulletins disent d'une échéance, ou d'un code. */
const ailleurs = lignes.filter((r) => r.arrete !== ARRETE && r.pays === "Gabon");
const parEcheance = (e) => ailleurs.filter((r) => r.echeance_le === e);
const parCode = (c) => ailleurs.filter((r) => r.code === c);

dire(`\n=== POUR CHAQUE RANGÉE : SES MONTANTS SUIVENT-ILS SON ÉCHÉANCE, OU LE CODE QU'ELLE PORTE ? ===`);
let suitSonEcheance = 0;
let suitSonCode = 0;
let indecis = 0;
for (const r of bloc) {
  const parE = parEcheance(r.echeance_le);
  const parC = parCode(r.code);
  /* « Ressembler » veut dire porter le meme nombre de titres et le meme
     nominal : l encours en decoule, et il bouge quand la ligne s abonde. */
  const commeE = parE.some((x) => x.titres === r.titres && x.faciale === r.faciale);
  const commeC = parC.some((x) => x.titres === r.titres && x.faciale === r.faciale);
  const memeEcheanceQueLeCode = parC.length ? parC.every((x) => x.echeance_le === r.echeance_le) : null;
  let verdict;
  if (commeE && !commeC) { verdict = "SES MONTANTS SUIVENT SON ÉCHÉANCE"; suitSonEcheance += 1; }
  else if (commeC && !commeE) { verdict = "ses montants suivent son code"; suitSonCode += 1; }
  else if (commeE && commeC) { verdict = "les deux, indécis"; indecis += 1; }
  else { verdict = "ni l'un ni l'autre"; indecis += 1; }
  dire(`   éch ${r.echeance_le} · « ${r.code} » · ${String(r.titres ?? "—").padStart(9)} × ${r.faciale}`);
  dire(`      ailleurs, cette échéance : ${parE.map((x) => `${x.code} ${x.titres ?? "—"}×${x.faciale}`).join(" | ") || "nulle part"}`);
  dire(`      ailleurs, ce code       : ${parC.map((x) => `éch ${x.echeance_le} ${x.titres ?? "—"}×${x.faciale}`).join(" | ") || "nulle part"}`);
  dire(`      → ${verdict}${memeEcheanceQueLeCode === false ? " · et ailleurs ce code porte une AUTRE échéance" : ""}`);
}

dire(`\n=== VERDICT ===`);
dire(`   ${suitSonEcheance} rangee(s) dont les montants suivent L ECHEANCE`);
dire(`   ${suitSonCode} rangee(s) dont les montants suivent LE CODE`);
dire(`   ${indecis} indecise(s)`);
dire(`   ${suitSonEcheance > suitSonCode
  ? "C EST LE CODE QUI A GLISSE : la rangee garde ses dates et ses montants, et recoit le code d une voisine. L ECHEANCE FAIT FOI."
  : suitSonCode > suitSonEcheance
    ? "C EST LE RESTE QUI A GLISSE : le code reste en place. LE CODE FAIT FOI."
    : "indecis : on ne tranche pas."}`);

dire(`\n=== LA CHAÎNE DES CODES ===`);
const majorite = new Map();
for (const r of ailleurs) {
  const v = majorite.get(r.echeance_le) ?? new Map();
  v.set(r.code, (v.get(r.code) ?? 0) + 1);
  majorite.set(r.echeance_le, v);
}
for (const r of bloc) {
  const v = majorite.get(r.echeance_le);
  const tri = v ? [...v].sort((a, b) => b[1] - a[1]) : [];
  const attendu = tri[0]?.[0];
  if (!attendu || attendu === r.code) continue;
  /* A quelle echeance le code porte appartient-il, selon les autres ? */
  const ou = [...majorite].filter(([, vv]) => [...vv.keys()].includes(r.code)).map(([e]) => e);
  dire(`   éch ${r.echeance_le} porte « ${r.code} » · la majorité dit « ${attendu} » (${tri[0][1]} voix) · ailleurs « ${r.code} » appartient à ${ou.join(" · ") || "aucune échéance"}`);
}
