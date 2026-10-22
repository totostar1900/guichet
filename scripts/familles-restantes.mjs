/**
 * LES TRENTE QUI N'ONT PAS BOUGÉ : DEUX COPIES, OU DEUX PIÈCES ?
 *
 * Le déplacement a refusé trente pièces parce que leur destination était déjà
 * prise. Refuser était juste : écraser aurait détruit sans qu'on sache quoi.
 * Reste à savoir ce que sont ces deux fichiers. S'ils portent les MÊMES OCTETS,
 * c'est une copie et l'ancienne s'efface ; s'ils diffèrent, ce sont deux pièces
 * et il faut les garder toutes les deux.
 *
 * ON COMPARE LES OCTETS, PAS LES NOMS.
 *
 *   npx tsx --conditions=react-server scripts/familles-restantes.mjs [--effacer]
 */
import fs from "node:fs";
import { createHash } from "node:crypto";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const { cheminBeac, marquesDeCollision, avecMarque, nomDeFichier, DOSSIERS } = await import("../src/lib/intake/bibliotheque.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const BIBLIO = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet";
const effacer = process.argv.includes("--effacer");

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
const { lotDuJournal } = await import("./_journal.mjs");
const pieces = await lotDuJournal(sb);
const mA = marquesDeCollision(pieces, cheminAncien);
const mN = marquesDeCollision(pieces, cheminBeac);
const sha = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");

let memes = 0;
let differents = 0;
for (const p of pieces) {
  const a = avecMarque(cheminAncien(p), mA.get(p.url));
  const n = avecMarque(cheminBeac(p), mN.get(p.url));
  if (a === n) continue;
  if (!fs.existsSync(`${BIBLIO}/${a}`) || !fs.existsSync(`${BIBLIO}/${n}`)) continue;
  const identique = sha(`${BIBLIO}/${a}`) === sha(`${BIBLIO}/${n}`);
  if (identique) {
    memes++;
    if (effacer) fs.unlinkSync(`${BIBLIO}/${a}`);
  } else {
    differents++;
    dire(`   OCTETS DIFFÉRENTS\n      ancien ${a}\n      nouveau ${n}`);
  }
}
dire(`\n${memes} copie(s) à l'identique${effacer ? ", effacée(s)" : " (relancer avec --effacer)"}`);
dire(`${differents} paire(s) dont les octets diffèrent : elles restent toutes les deux`);
