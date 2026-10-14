/**
 * LIRE LES RAPPORTS HEBDOMADAIRES, ET LES RANGER.
 *
 * 87 pièces dormaient parmi 355 « autres communiqués », jamais ouvertes parce
 * que ce sont des scans. Elles portent le RÉALISÉ là où le tableau de bord ne
 * donne que le prévu, et pour chaque émission ce qu'un communiqué de
 * résultats porte : participation, souscription, taux ou prix moyen pondéré,
 * marginal, minimum, maximum.
 *
 * LE RAPPORT CORRIGE LE TABLEAU DE BORD, IL NE LE DOUBLE PAS. La clef
 * d'unicité ne contient plus ni la pièce ni le montant : une opération est
 * identifiée par ce qu'elle EST, une ligne, un acte, un jour, un pays. Le
 * rapport remplit donc les colonnes du réalisé sur la ligne que le tableau de
 * bord avait posée, et en crée une quand elle manquait.
 *
 * ON COMMENCE PAR UNE SEULE, TOUJOURS : quatre-vingt-sept lectures facturées
 * sur un prompt non éprouvé, c'est la dépense doublée et le résultat à
 * refaire.
 *
 *   npx tsx --conditions=react-server scripts/lire-rapports-hebdo.mjs --une
 *   npx tsx --conditions=react-server scripts/lire-rapports-hebdo.mjs --ecrire [n]
 */
import fs from "node:fs";
import path from "node:path";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { createClient } = await import("@supabase/supabase-js");
const { lireRapportHebdomadaire, invraisemblances } = await import("../src/lib/market/rapport-hebdomadaire.ts");
const { nomDeFichier } = await import("../src/lib/intake/bibliotheque.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const BEAC = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet/1. Donnees de marche/1. BEAC - Marche des titres publics";
const uneSeule = process.argv.includes("--une");
const ecrire = process.argv.includes("--ecrire");
const combien = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 999);
const MARQUE = /\s\[[0-9a-f]{6}\]$/;

const obs = [];
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from("beac_observations").select("url, titre").range(de, de + 999);
  obs.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
/* Le rapport des VALEURS DU TRESOR, pas celui du marche financier unifie :
   le second est le registre des transactions de la cote, un autre objet. */
const EST_RAPPORT = (t) => /rapport\s+hebdomadaire/i.test(t ?? "") && /valeurs\s+du\s+tr[ée]sor/i.test(t ?? "");
const parNom = new Map();
for (const o of obs) if (EST_RAPPORT(o.titre)) parNom.set(nomDeFichier(o.titre), o);
dire(`${parNom.size} rapport(s) au journal`);

function trouver(d) {
  if (!fs.existsSync(d)) return [];
  const out = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = `${d}/${e.name}`;
    if (e.isDirectory()) out.push(...trouver(p));
    else if (/rapport/i.test(e.name) && /valeurs/i.test(e.name) && e.name.toLowerCase().endsWith(".pdf")) out.push(p);
  }
  return out;
}
const pieces = trouver(BEAC).sort();
dire(`${pieces.length} rapport(s) sur le disque\n`);

const lot = uneSeule ? pieces.slice(-1) : pieces.slice(0, combien);
let lues = 0, lignes = 0, ecrites = 0, refus = 0;
const remarques = [];

for (const p of lot) {
  const journal = parNom.get(path.basename(p, ".pdf").replace(MARQUE, ""));
  if (!journal) {
    dire(`   SANS ADRESSE  ${path.basename(p).slice(0, 72)}`);
    refus++;
    continue;
  }
  let r;
  try {
    r = await lireRapportHebdomadaire(fs.readFileSync(p).toString("base64"));
  } catch (e) {
    dire(`   ÉCHEC  ${path.basename(p).slice(0, 60)} : ${e.message}`);
    refus++;
    continue;
  }
  lues++;
  lignes += r.lignes.length;
  dire(`   ${path.basename(p).slice(0, 58).padEnd(58)} ${String(r.lignes.length).padStart(3)} ligne(s)  ${r.semaineDu ?? "?"} → ${r.semaineAu ?? "?"}${r.remarques.length ? `  · ${r.remarques.length} remarque(s)` : ""}`);
  for (const x of r.remarques) remarques.push(`${path.basename(p).slice(0, 36)} : ${x}`);

  if (uneSeule) {
    dire(`\n=== LES ${r.lignes.length} LIGNES ===`);
    const f = (n) => (n == null ? "—" : n.toLocaleString("fr-FR"));
    for (const l of r.lignes) {
      dire(
        `   ${l.pays.padEnd(13)} ${String(l.instrument ?? "").padEnd(4)} ${l.operation.padEnd(18)} prévu ${f(l.montantPrevu).padStart(16)} · réalisé ${f(l.montantRealise).padStart(16)} · souscr. ${l.tauxSouscription ?? "—"} · moyen ${l.tauxPrixMoyen ?? "—"}${l.observations ? ` · ${l.observations.slice(0, 40)}` : ""}`,
      );
    }
    dire(`\nmodèle : ${r.modele}`);
    for (const x of r.remarques) dire(`   remarque : ${x}`);
    dire(`\nEssai : rien n'a été écrit.`);
    process.exit(0);
  }

  if (ecrire) {
    const bonnes = r.lignes.filter((l) => invraisemblances(l).length === 0 && l.codeEnchere && l.operationOn !== null);
    const rows = bonnes.map((l) => ({
      source_url: journal.url,
      source_rapport_url: journal.url,
      source_title: path.basename(p, ".pdf"),
      semaine_du: r.semaineDu, semaine_au: r.semaineAu,
      pays: l.pays, instrument: l.instrument, tenor: l.tenor,
      code_enchere: l.codeEnchere, code_emission: l.codeEmission,
      coupon_rate: l.couponRate, maturity_on: l.maturityOn,
      operation: l.operation,
      montant: l.montantPrevu, montant_realise: l.montantRealise,
      taux_participation: l.tauxParticipation, taux_souscription: l.tauxSouscription,
      taux_prix_moyen: l.tauxPrixMoyen, taux_prix_marginal: l.tauxPrixMarginal,
      taux_prix_min: l.tauxPrixMin, taux_prix_max: l.tauxPrixMax,
      observations: l.observations,
      /* La date d operation n est pas dans ce rapport : la semaine la borne,
         et la ligne se rattache par son code. On pose le premier jour de la
         semaine plutot que de laisser vide, et la clef reste unique. */
      operation_on: r.semaineDu,
      read_at: new Date().toISOString(), read_model: r.modele,
    }));
    if (rows.length) {
      const { error } = await sb.from("treasury_operations").upsert(rows, { onConflict: "code_enchere,operation,operation_on,pays" });
      if (error) dire(`      écriture : ${error.message}`);
      else ecrites += rows.length;
    }
  }
}

dire(`\n=== ${lues} rapport(s) lu(s), ${lignes} ligne(s), ${ecrites} écrite(s), ${refus} refus ===`);
if (remarques.length) {
  dire(`\n${remarques.length} remarque(s) :`);
  for (const x of remarques.slice(0, 25)) dire(`   ${x}`);
}
if (!ecrire && !uneSeule) dire(`\nRien n'a été écrit. Relancer avec --ecrire.`);
