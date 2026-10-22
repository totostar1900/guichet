/**
 * REMETTRE À SA FAMILLE CE QUE LE GENRE DE LA PAGE AVAIT ÉGARÉ.
 *
 * Quinze communiqués de 2019 dorment sous « Statistiques mensuelles » parce
 * qu'ils étaient servis par la colonne de droite de cette page. La règle est
 * corrigée ; il reste à déplacer ce qui est déjà rangé, sans quoi le ramasseur
 * les retéléchargerait et nous en aurions deux copies.
 *
 * ON DIT CE QU'ON VA FAIRE AVANT DE LE FAIRE, et on ne déplace que ce qui
 * change de place. Une pièce dont l'ancien et le nouveau chemin coïncident est
 * laissée tranquille, et une pièce dont la destination est déjà occupée n'est
 * pas écrasée : elle est nommée, et on s'arrête dessus.
 *
 *   npx tsx --conditions=react-server scripts/ranger-a-la-bonne-famille.mjs [--deplacer]
 */
import fs from "node:fs";
import path from "node:path";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const { cheminBeac, marquesDeCollision, avecMarque } = await import("../src/lib/intake/bibliotheque.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const BIBLIO = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet";
const deplacer = process.argv.includes("--deplacer");

/* ANCIENNE RÈGLE, reproduite ici telle qu'elle était : c'est la seule façon de
   savoir où une pièce A ÉTÉ rangée, le code ne le disant plus. */
const { nomDeFichier, DOSSIERS } = await import("../src/lib/intake/bibliotheque.ts");
const PAYS_DOSSIER = { Cameroun: "Cameroun", Gabon: "Gabon", Congo: "Congo", Tchad: "Tchad", "Guinée éq.": "Guinee equatoriale", "Guinée équatoriale": "Guinee equatoriale", RCA: "RCA" };
function cheminAncien(o) {
  const an = (o.seance ?? "").slice(0, 4) || (o.titre?.match(/\b(20\d{2})\b/) ?? [])[1] || "sans date";
  const pays = (o.pays && PAYS_DOSSIER[o.pays]) || "Zone";
  if (o.genre === "calendrier") return `${DOSSIERS.beacCalendriers}/${pays}/${an} ${nomDeFichier(o.titre)}.pdf`;
  if (o.genre === "annonce" || o.genre === "resultats") {
    const racine = o.genre === "annonce" ? DOSSIERS.beacAnnonces : DOSSIERS.beacResultats;
    const quoi = [o.instrument, o.tenor].filter(Boolean).join(" ");
    return `${racine}/${pays}/${an}/${`${o.seance ?? an} ${nomDeFichier(quoi)} - ${o.genre}.pdf`.replace(/\s+/g, " ")}`;
  }
  if (/tableau\s+(de\s+bord|hebdomadaire)/i.test(o.titre ?? "")) return `${DOSSIERS.beacTableaux}/${an}/${nomDeFichier(o.titre)}.pdf`;
  if (o.genre === "statistiques") return `${DOSSIERS.beacStatistiques}/${an}/${nomDeFichier(o.titre)}.pdf`;
  if (o.genre === "bulletin") return `${DOSSIERS.beacBulletins}/${an}/${nomDeFichier(o.titre)}.pdf`;
  if (o.genre === "courbe") return `${DOSSIERS.beacCourbes}/${an}/${nomDeFichier(o.titre)}.pdf`;
  if (o.genre === "programme") return `${DOSSIERS.beacProgrammes}/${pays}/${an} ${nomDeFichier(o.titre)}.pdf`;
  return `${DOSSIERS.beacAutres}/${an}/${nomDeFichier(o.titre)}.pdf`;
}

/* LE MEME LOT DE REFERENCE QUE L AUDIT : une marque calculee sur un autre
   ensemble designe un autre fichier. */
const { lotDuJournal, placesInscrites, anciennetePar, empreintesDeLInventaire } = await import("./_journal.mjs");
const pieces = await lotDuJournal(sb);
dire(`${pieces.length} pièce(s) au journal`);

const age = anciennetePar(await placesInscrites(sb, pieces), cheminBeac, BIBLIO, empreintesDeLInventaire(BIBLIO));
const mA = marquesDeCollision(pieces, cheminAncien, age);
const mN = marquesDeCollision(pieces, cheminBeac, age);
const bouges = [];
for (const p of pieces) {
  const a = avecMarque(cheminAncien(p), mA.get(p.url));
  const n = avecMarque(cheminBeac(p), mN.get(p.url));
  if (a === n) continue;
  bouges.push({ p, a, n, la: fs.existsSync(`${BIBLIO}/${a}`) });
}
dire(`${bouges.length} pièce(s) changent de place, dont ${bouges.filter((b) => b.la).length} sont sur le disque\n`);

const parFamille = new Map();
for (const b of bouges.filter((x) => x.la)) {
  const f = `${b.a.split("/")[1]}  →  ${b.n.split("/")[1]}`;
  parFamille.set(f, (parFamille.get(f) ?? 0) + 1);
}
for (const [f, n] of [...parFamille].sort((x, y) => y[1] - x[1])) dire(`   ${String(n).padStart(4)}  ${f}`);

dire(``);
for (const b of bouges.filter((x) => x.la).slice(0, 20)) dire(`   ${b.n.replace("1. Donnees de marche/1. BEAC - Marche des titres publics/", "…/").slice(0, 150)}`);

if (!deplacer) {
  dire(`\nEssai à blanc. Relancer avec --deplacer.`);
  process.exit(0);
}

let faits = 0;
let occupes = 0;
for (const b of bouges.filter((x) => x.la)) {
  const dst = `${BIBLIO}/${b.n}`;
  if (fs.existsSync(dst)) {
    occupes++;
    dire(`   DÉJÀ OCCUPÉ ${b.n.slice(-90)}`);
    continue;
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.renameSync(`${BIBLIO}/${b.a}`, dst);
  faits++;
}
dire(`\n=== ${faits} déplacée(s), ${occupes} destination(s) déjà occupée(s) ===`);
