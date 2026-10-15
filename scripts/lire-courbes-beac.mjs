/**
 * LIRE LES 277 COURBES DE LA BEAC, ET N'ÉCRIRE QUE CE QUI SE LIT.
 *
 * Onze années de courbes mensuelles par pays dorment dans la bibliothèque.
 * Cinquante-quatre pièces sont vectorielles et se lisent au point près ; les
 * autres sont des scans, et un point relevé à l'œil sur une image serait une
 * précision inventée. ON LES COMPTE, ON NE LES DEVINE PAS.
 *
 * Aucun modèle, aucun jeton : tout est dans le flux du document.
 *
 *   npx tsx --conditions=react-server scripts/lire-courbes-beac.mjs [--ecrire]
 */
import fs from "node:fs";
import path from "node:path";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const { courbesDuPdf } = await import("../src/lib/market/courbe-beac.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const RACINE = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet/1. Donnees de marche/1. BEAC - Marche des titres publics/Courbes de rendement BEAC";
const BIBLIO = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet";
const ecrire = process.argv.includes("--ecrire");

/* L'adresse de la pièce, pour que chaque chiffre cite sa source. */
const parChemin = new Map();
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from("library_items").select("file_key, library_path").range(de, de + 999);
  for (const x of data ?? []) parChemin.set(x.library_path, x.file_key);
  if ((data ?? []).length < 1000) break;
}

const fichiers = fs.readdirSync(RACINE).flatMap((an) => fs.readdirSync(`${RACINE}/${an}`).map((f) => `${RACINE}/${an}/${f}`));
dire(`${fichiers.length} pièce(s)\n`);

const lignes = [];
const etats = new Map();
const muettes = new Map();
let compares = 0;
let pireEcart = 0;
let pirePiece = "";
const sansMois = [];
for (const f of fichiers) {
  const titre = path.basename(f, ".pdf");
  let r;
  try {
    r = await courbesDuPdf(new Uint8Array(fs.readFileSync(f)), titre);
  } catch (e) {
    etats.set("plantée", (etats.get("plantée") ?? 0) + 1);
    dire(`   PLANTÉE  ${titre.slice(0, 80)} : ${String(e.message).slice(0, 70)}`);
    continue;
  }
  compares += r.controle.compares;
  if (r.controle.ecartMax > pireEcart) {
    pireEcart = r.controle.ecartMax;
    pirePiece = titre;
  }
  const etat = r.points.length ? "lue" : r.reserves.length ? "muette" : "vide";
  etats.set(etat, (etats.get(etat) ?? 0) + 1);
  if (!r.points.length) {
    if (muettes.size < 14) muettes.set(titre, r.reserves.join(" | ") || "(aucune réserve, aucun point)");
    continue;
  }
  if (!r.mois) {
    sansMois.push(titre);
    continue;
  }
  const relatif = path.relative(BIBLIO, f).replace(/\\/g, "/");
  for (const p of r.points) {
    lignes.push({
      mois: `${r.mois}-01`,
      pays: p.pays,
      tenor: p.tenor,
      annees: p.annees,
      taux: p.taux,
      source_titre: titre,
      source_chemin: relatif,
      file_key: parChemin.get(relatif) ?? null,
      reserves: r.reserves.length ? r.reserves.join(" · ") : null,
    });
  }
}

dire(`\n=== CE QUE LES PIÈCES RENDENT ===`);
for (const [e, n] of [...etats].sort((a, b) => b[1] - a[1])) dire(`   ${e.padEnd(10)} ${n}`);
dire(`\n${lignes.length} point(s) de courbe`);
/* LE DOCUMENT CONTRE LUI-MEME. La ou la feuille imprime le chiffre ET trace la
   courbe, deux lectures independantes disent la meme chose, ou ne la disent
   pas. C est la seule verification que la source nous offre d elle-meme. */
dire(`\n=== LE DOCUMENT CONTRE LUI-MEME ===`);
dire(`   ${compares} point(s) lus DEUX FOIS, par le trace et par le chiffre imprime`);
dire(`   ecart maximum : ${pireEcart.toFixed(2)} point(s) de pourcentage${pirePiece ? `   (${pirePiece.slice(0, 60)})` : ""}`);

dire(`\n=== POURQUOI LES MUETTES SE TAISENT ===`);
for (const [t, r] of muettes) dire(`   ${t.slice(0, 58).padEnd(58)} ${r.slice(0, 110)}`);
if (sansMois.length) dire(`${sansMois.length} pièce(s) lues mais sans mois dans le titre, écartées :\n   ${sansMois.slice(0, 6).join("\n   ")}`);

const parPays = new Map();
for (const l of lignes) parPays.set(l.pays, (parPays.get(l.pays) ?? 0) + 1);
dire(`\n=== PAR PAYS ===`);
for (const [p, n] of [...parPays].sort((a, b) => b[1] - a[1])) dire(`   ${p.padEnd(14)} ${n}`);

/* CE QU'UNE COURBE PEUT DIRE, ET CE QU'ELLE NE PEUT PAS. Un Trésor de la zone
   ne s'est jamais financé sous 1 % ni au-dessus de 20 % : au-delà, c'est une
   échelle mal posée, pas un marché. Le compte sort avant l'écriture. */
dire(`\n=== L'ÉTENDUE DES TAUX, PAR PAYS ===`);
for (const p of [...new Set(lignes.map((l) => l.pays))].sort()) {
  const t = lignes.filter((l) => l.pays === p).map((l) => l.taux);
  dire(`   ${p.padEnd(12)} de ${Math.min(...t).toFixed(2)} % à ${Math.max(...t).toFixed(2)} %   (${t.length} points)`);
}
const aberrants = lignes.filter((l) => l.taux < 1 || l.taux > 20);
dire(`   ${aberrants.length} point(s) hors de [1 %, 20 %]`);
for (const a of aberrants.slice(0, 10)) dire(`      ${a.mois} ${a.pays} ${a.tenor} ${a.taux} %   ${a.source_titre.slice(0, 60)}`);

/**
 * DEUX FEUILLES POUR LE MEME MOIS : LA FEUILLE DU PAYS ET CELLE DE LA ZONE.
 *
 * La BEAC publie, le meme mois, une feuille par Tresor ET une feuille CEMAC qui
 * reporte les trois courbes. Le meme point y figure donc deux fois, et c est une
 * occasion de verification plutot qu une gene : s ils different, l une des deux
 * lectures est fausse et il faut le savoir.
 *
 * ON GARDE CELLE DU PAYS. Elle imprime ses chiffres a cote de ses points, la
 * feuille de zone presque jamais.
 */
const parPoint = new Map();
const desaccords = [];
for (const l of lignes) {
  const clef = `${l.mois}|${l.pays}|${l.tenor}`;
  const avant = parPoint.get(clef);
  if (!avant) {
    parPoint.set(clef, l);
    continue;
  }
  const duPays = (x) => !/cemac/i.test(x.source_titre);
  if (Math.abs(avant.taux - l.taux) > 0.05) {
    desaccords.push({ clef, a: avant, b: l });
    /* LE DESACCORD VOYAGE AVEC LE POINT. Deux feuilles du meme mois qui ne
       disent pas la meme chose : on en garde une, mais celui qui lira ce
       chiffre doit savoir qu une autre piece en donne un autre. */
    const autre = `une autre feuille du meme mois donne ${(duPays(avant) && !duPays(l) ? l : avant).taux} %`;
    avant.reserves = avant.reserves ? `${avant.reserves} · ${autre}` : autre;
    l.reserves = l.reserves ? `${l.reserves} · ${autre}` : autre;
  }
  if (!duPays(avant) && duPays(l)) parPoint.set(clef, l);
}
dire(`
=== LES MEMES POINTS SUR DEUX FEUILLES ===`);
dire(`   ${lignes.length - parPoint.size} point(s) publies deux fois, par la feuille du pays et par celle de la zone`);
dire(`   ${desaccords.length} desaccord(s) de plus de cinq centiemes`);
for (const d of desaccords.slice(0, 8)) dire(`      ${d.clef}  ${d.a.taux} % (${d.a.source_titre.slice(0, 40)})  contre  ${d.b.taux} % (${d.b.source_titre.slice(0, 40)})`);
lignes.length = 0;
lignes.push(...parPoint.values());

const mois = [...new Set(lignes.map((l) => l.mois))].sort();
dire(`\n${mois.length} mois couverts, de ${mois[0]} à ${mois[mois.length - 1]}`);
const sansLien = lignes.filter((l) => !l.file_key).length;
if (sansLien) dire(`${sansLien} point(s) dont la pièce n'est pas indexée : le desk n'aura pas de lien`);

if (!ecrire) {
  dire(`\nEssai à blanc. Relancer avec --ecrire.`);
  process.exit(0);
}

for (let i = 0; i < lignes.length; i += 500) {
  const { error } = await sb.from("beac_yield_curves").upsert(lignes.slice(i, i + 500), { onConflict: "mois,pays,tenor" });
  if (error) throw new Error(error.message);
  dire(`   ${Math.min(i + 500, lignes.length)}/${lignes.length} écrit(s)`);
}
const { count } = await sb.from("beac_yield_curves").select("mois", { count: "exact", head: true });
dire(`\n${count} ligne(s) dans beac_yield_curves.`);
