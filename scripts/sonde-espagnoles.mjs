/**
 * LES PIÈCES ESPAGNOLES : QUE DIT LE LECTEUR D'AUJOURD'HUI, ET SONT-ELLES DÉPOSÉES ?
 *
 * Sonde jetable. Le 16 octobre 2026 j'ai annoncé « 27 séances guinéennes à
 * gagner » en comptant des pièces dont la colonne `seance` est vide, puis le
 * contrôle réparé du plan n'en a trouvé que six. Une des deux mesures est
 * fausse : celle-ci tranche en faisant relire chaque titre.
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const { readBeacDoc } = await import("../src/lib/market/beac.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

async function toutes(table, colonnes) {
  const out = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from(table).select(colonnes).range(de, de + 999);
    if (error) throw new Error(`${table} : ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) return out;
  }
}

const vues = await toutes("beac_observations", "url, titre, pays, seance, genre");
const seances = await toutes("auction_results", "country, session_on");
const deposees = new Set(seances.map((s) => `${s.country}|${s.session_on}`));

let resultats = 0;
let genreAutre = 0;
let sansDate = 0;
const couples = new Map(); // clef -> { genres:Set, titres:[] }

for (const v of vues) {
  const lu = readBeacDoc({ url: v.url ?? "", title: v.titre ?? "", country: v.pays ?? "", year: "" });
  if (lu.kind !== "resultats") continue;
  resultats += 1;
  if (v.genre !== "resultats") genreAutre += 1;
  /* LE TITRE FAIT FOI, PAS LA COLONNE. Règle posée en c21e39e, après onze
     avis d'émission rangés sous le mauvais Trésor. La colonne garde
     l'attribution d'avant la règle : la préférer ici fabriquait cinq
     séances fantômes dans un pays qui ne les a pas tenues. */
  const pays = lu.country ?? v.pays;
  const le = v.seance ?? lu.on;
  if (!pays || !le) {
    sansDate += 1;
    dire(`SANS DATE  [${v.genre}] ${v.titre}`);
    continue;
  }
  const clef = `${pays}|${String(le).slice(0, 10)}`;
  if (!couples.has(clef)) couples.set(clef, { genres: new Set(), titres: [] });
  couples.get(clef).genres.add(v.genre);
  couples.get(clef).titres.push(v.titre);
}

const manquants = [...couples.entries()].filter(([c]) => !deposees.has(c));

dire("");
dire(`pieces que le lecteur appelle « resultats » : ${resultats}`);
dire(`  dont rangees en base sous un autre genre  : ${genreAutre}`);
dire(`  dont ni pays ni date lisibles             : ${sansDate}`);
dire(`couples (pays, seance) distincts            : ${couples.size}`);
dire(`  deposes                                   : ${couples.size - manquants.length}`);
dire(`  MANQUANTS                                 : ${manquants.length}`);
dire("");
for (const [c, info] of manquants) {
  dire(`  ${c}   genres=${[...info.genres].join("/")}   ${info.titres[0]}`);
}

/* Et le revers : des seances deposees qu'aucune piece de resultats n'annonce. */
const annonces = new Set(couples.keys());
const orphelines = [...deposees].filter((d) => !annonces.has(d));
dire("");
dire(`seances deposees qu'aucune piece « resultats » n'annonce : ${orphelines.length}`);
for (const o of orphelines.slice(0, 15)) dire(`  ${o}`);
