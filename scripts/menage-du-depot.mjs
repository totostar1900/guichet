/**
 * FAIRE DE LA PLACE DANS LE DEPOT, SANS PERDRE UNE PIECE.
 *
 * Regle de la maison : les documents physiques vivent dans la bibliotheque
 * partagee, et le desk n en garde que le lien. Le depot Supabase cessait
 * d etre une archive pour devenir une seconde copie que personne ne
 * regardait, et il coute son plafond.
 *
 * QUATRE CONDITIONS POUR QU UNE PIECE QUITTE LE DEPOT, et il les faut toutes :
 *
 *   1. ELLE EST INSCRITE a une place de la bibliotheque (`library_items`) ;
 *   2. LE FICHIER Y EST, sur le disque synchronise ;
 *   3. IL PESE LE MEME POIDS que l objet du depot, a l octet pres. Un index
 *      qui pointe sur un autre fichier est pire qu un index absent, et c est
 *      le seul controle qui ne coute pas de telecharger ;
 *   4. ELLE A DEJA ETE LUE. Le cron de nuit lit les octets DEPUIS LE DEPOT
 *      pour les donner au modele, et Vercel n a pas de disque : enlever les
 *      octets d une piece pas encore lue empecherait de la lire.
 *
 * LES PIECES DES CLIENTS NE SORTENT PAS, et ce n est pas une distraction : un
 * lien SharePoint s ouvre pour qui a un compte de la maison, bon perimetre
 * pour un communique de la BEAC, mauvais pour une piece d identite.
 *
 *   npx tsx --conditions=react-server scripts/menage-du-depot.mjs [--supprimer] [--max=N]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { tout } = await import("./_journal.mjs");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const BIBLIO = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet";
const supprimer = process.argv.includes("--supprimer");
const max = Number((process.argv.find((a) => a.startsWith("--max=")) ?? "--max=100000").slice(6));
const mo = (n) => (n / 1024 / 1024).toFixed(1);

/** LES DOSSIERS QUI PEUVENT SORTIR. Les autres restent, nommement. */
const DOSSIERS = ["beac", "issuers"];

/**
 * Tous les objets d un dossier, SOUS-DOSSIERS COMPRIS.
 *
 * Les documents d emetteurs vivent sous « issuers/<mnemo>/ » : une liste a
 * plat n en voyait aucun, et le menage annonçait 403 Mo la ou il y en a 491.
 * Une entree sans metadonnees est un dossier, et c est a cela qu on la
 * reconnait.
 */
async function objets(dossier) {
  const out = [];
  for (let de = 0; ; de += 100) {
    const { data, error } = await sb.storage.from("sources").list(dossier, { limit: 100, offset: de });
    if (error) throw new Error(`${dossier} : ${error.message}`);
    for (const o of data ?? []) {
      if (!o.metadata) out.push(...(await objets(`${dossier}/${o.name}`)));
      else out.push({ nom: `${dossier}/${o.name}`, octets: o.metadata.size ?? 0 });
    }
    if ((data ?? []).length < 100) break;
  }
  return out;
}

const index = new Map((await tout(sb, "library_items", "file_key, library_path, bytes")).map((x) => [x.file_key, x]));

/** Ce que chaque piece a deja rendu : une piece non lue garde ses octets. */
const lues = new Map();
for (const [table, cle] of [
  ["auction_results", "read_at"],
  ["emission_notices", "read_at"],
  ["issuer_documents", null],
  ["issuer_financials", null],
]) {
  const cols = cle ? `file_key, ${cle}` : "file_key";
  for (const r of await tout(sb, table, cols).catch(() => [])) {
    if (!r.file_key) continue;
    const dejaLue = cle ? r[cle] != null : true;
    lues.set(r.file_key, (lues.get(r.file_key) ?? false) || dejaLue);
  }
}

const tousLesObjets = [];
for (const d of DOSSIERS) tousLesObjets.push(...(await objets(d)));
dire(`${tousLesObjets.length} objet(s) dans ${DOSSIERS.join(" et ")} · ${mo(tousLesObjets.reduce((s, o) => s + o.octets, 0))} Mo\n`);

const aSortir = [];
const restees = [];
const motifs = new Map();
for (const o of tousLesObjets) {
  const inscrite = index.get(o.nom);
  let motif;
  if (!inscrite) motif = "pas de place inscrite";
  else if (!fs.existsSync(`${BIBLIO}/${inscrite.library_path}`)) motif = "la place inscrite est vide";
  else if (Number(inscrite.bytes) !== Number(o.octets)) motif = `poids différent (dépôt ${o.octets}, bibliothèque ${inscrite.bytes})`;
  else if (lues.has(o.nom) && !lues.get(o.nom)) motif = "pas encore lue : le cron a besoin de ses octets";
  if (motif) {
    motifs.set(motif.split(" (")[0], (motifs.get(motif.split(" (")[0]) ?? 0) + 1);
    restees.push({ o, motif });
    continue;
  }
  aSortir.push(o);
}
dire(`=== ${aSortir.length} piece(s) peuvent sortir · ${mo(aSortir.reduce((s, o) => s + o.octets, 0))} Mo ===`);
dire(`=== ${tousLesObjets.length - aSortir.length} restent ===`);
for (const [m, n] of [...motifs].sort((a, b) => b[1] - a[1])) dire(`   ${String(n).padStart(4)}  ${m}`);
dire("");
for (const r of restees) dire(`   ${r.motif.padEnd(52)} ${r.o.nom.slice(-78)}`);

if (!supprimer) {
  dire(`\nEssai a blanc. Relancer avec --supprimer.`);
  process.exit(0);
}
let sortis = 0;
let octets = 0;
const lot = aSortir.slice(0, max);
for (let i = 0; i < lot.length; i += 50) {
  const paquet = lot.slice(i, i + 50);
  const { error } = await sb.storage.from("sources").remove(paquet.map((o) => o.nom));
  if (error) {
    dire(`   ERREUR : ${error.message}`);
    break;
  }
  sortis += paquet.length;
  octets += paquet.reduce((s, o) => s + o.octets, 0);
  dire(`   ${sortis}/${lot.length} · ${mo(octets)} Mo liberes`);
}
dire(`\n=== ${sortis} piece(s) sortie(s) du depot, ${mo(octets)} Mo liberes ===`);
dire(`   Les documents restent dans la bibliotheque, et le desk y renvoie par un lien.`);
