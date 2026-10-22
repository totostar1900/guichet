/**
 * NOTRE ENCOURS ET CELUI DE LA BEAC, POSÉS CÔTE À CÔTE.
 *
 * LA SOUSTRACTION SERAIT UNE FAUTE. Ces chiffres ne mesurent pas la même
 * chose, et l'écart n'est donc pas une erreur à corriger mais une définition à
 * énoncer :
 *
 *   LA BEAC compte tout l'encours des valeurs du Trésor de la zone, quelle que
 *   soit la façon dont il a été placé, et elle ne publie ni le détail des
 *   séances ni la méthode.
 *
 *   NOUS comptons ce que nous avons vu adjuger, communiqué par communiqué,
 *   moins ce qui est arrivé à échéance. Nous ne voyons donc ni les
 *   syndications, ni les placements privés, ni les lignes anciennes dont le
 *   communiqué n'est plus en ligne.
 *
 * CE QUE LE RAPPROCHEMENT DIT VRAIMENT, c'est QUELLE PART DU MARCHÉ NOS PIÈCES
 * COUVRENT. Une part stable d'un pays à l'autre voudrait dire que nous
 * manquons la même chose partout ; une part qui s'effondre sur un Trésor dit
 * où chercher.
 *
 *   npx tsx --conditions=react-server scripts/rapprochement-encours.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const { tout } = await import("./_journal.mjs");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const officiel = await tout(sb, "beac_encours_officiel", "mois, pays, encours, source_titre");
const dernier = [...new Set(officiel.map((x) => String(x.mois)))].sort().pop();
const eux = officiel.filter((x) => String(x.mois) === dernier);
dire(`L'ENCOURS OFFICIEL AU ${dernier}, lu dans « ${eux[0]?.source_titre?.slice(0, 60) ?? "?"} »\n`);

/* LA NÔTRE : les lignes adjugées non encore échues, au nominal servi.
   On prend le montant retenu de chaque séance, pas le montant annoncé : un
   Trésor sert souvent moins qu'il n'annonce, et compter l'annonce gonflerait
   l'encours de tout ce qui n'a pas trouvé preneur. */
const seances = await tout(sb, "auction_results", "country, instrument, tenor, session_on, maturity_on, served, announced");
const auj = dernier;
let avecMontant = 0;
const nous = new Map();
for (const s of seances) {
  const montant = s.served != null ? Number(s.served) : null;
  if (montant == null) continue;
  avecMontant++;
  /* Une ligne échue ne fait plus partie de l'encours. Sans échéance connue,
     on ne devine pas : la séance compte, et la réserve le dira. */
  if (s.maturity_on && String(s.maturity_on) <= auj) continue;
  nous.set(s.country, (nous.get(s.country) ?? 0) + Number(montant));
}
dire(`${avecMontant} séance(s) sur ${seances.length} portent un montant servi\n`);

/**
 * NOTRE SECONDE SOURCE, ET ELLE COUVRE BIEN PLUS DE SEANCES.
 *
 * Les 249 communiques de resultats ne sont qu une partie de ce qui s est tenu :
 * le RAPPORT HEBDOMADAIRE de la BEAC porte TOUTES les operations de la semaine,
 * emissions et remboursements, avec leur montant realise. Mille dix-sept lignes
 * en sont sorties, et ignorer cette source ferait croire notre couverture bien
 * plus mince qu elle n est.
 *
 * ON ADDITIONNE LES EMISSIONS ET ON RETRANCHE LES REMBOURSEMENTS, ce qui est la
 * definition meme d un encours : ce qui a ete leve et pas encore rendu. La
 * periode commence ou commencent les rapports, pas a l origine du marche : ce
 * total n est donc pas un encours, c est la PART DE L ENCOURS QUE NOS PIECES
 * EXPLIQUENT.
 */
const ops = await tout(sb, "treasury_operations", "pays, operation, montant, montant_realise, operation_on, semaine_du");
const flux = new Map();
let emissions = 0;
let remboursements = 0;
for (const o of ops) {
  const m = o.montant_realise != null ? Number(o.montant_realise) : null;
  if (m == null) continue;
  if (o.operation === "emission" || o.operation === "abondement") {
    flux.set(o.pays, (flux.get(o.pays) ?? 0) + m);
    emissions++;
  } else if (o.operation === "remboursement") {
    flux.set(o.pays, (flux.get(o.pays) ?? 0) - m);
    remboursements++;
  }
}
const jours = ops.map((o) => String(o.operation_on ?? o.semaine_du)).filter(Boolean).sort();
dire(`${emissions} emission(s) et ${remboursements} remboursement(s) chiffres dans les rapports hebdomadaires, du ${jours[0] ?? "?"} au ${jours[jours.length - 1] ?? "?"}
`);

const PAYS = ["Cameroun", "Congo", "Gabon", "Tchad", "RCA", "Guinée éq."];
dire(`${"".padEnd(14)} ${"BEAC".padStart(12)} ${"COMMUNIQUES".padStart(12)} ${"part".padStart(7)} ${"RAPPORTS".padStart(12)} ${"part".padStart(7)}`);
dire(`${"".padEnd(14)} ${"(Mds)".padStart(12)} ${"(Mds)".padStart(12)} ${"".padStart(7)} ${"(Mds, net)".padStart(12)}`);
let totalEux = 0;
let totalNous = 0;
let totalHebdo = 0;
for (const p of PAYS) {
  const e = Number(eux.find((x) => x.pays === p)?.encours ?? 0) / 1000;
  const n = (nous.get(p) ?? 0) / 1e9;
  totalEux += e;
  totalNous += n;
  const h = (flux.get(p) ?? 0) / 1e9;
  totalHebdo += h;
  dire(`${p.padEnd(14)} ${e.toFixed(1).padStart(12)} ${n.toFixed(1).padStart(12)} ${e ? `${((100 * n) / e).toFixed(0)} %`.padStart(7) : "—".padStart(7)} ${h.toFixed(1).padStart(12)} ${e ? `${((100 * h) / e).toFixed(0)} %`.padStart(7) : "—".padStart(7)}`);
}
const cemac = Number(eux.find((x) => x.pays === "CEMAC")?.encours ?? 0) / 1000;
dire(`${"-".repeat(70)}`);
dire(`${"Total".padEnd(14)} ${cemac.toFixed(1).padStart(12)} ${totalNous.toFixed(1).padStart(12)} ${cemac ? `${((100 * totalNous) / cemac).toFixed(0)} %`.padStart(7) : ""} ${totalHebdo.toFixed(1).padStart(12)} ${cemac ? `${((100 * totalHebdo) / cemac).toFixed(0)} %`.padStart(7) : ""}`);
if (Math.abs(cemac - totalEux) > 0.2) dire(`\n   (le total imprimé et la somme des pays diffèrent de ${(cemac - totalEux).toFixed(1)} Mds)`);

dire(`\n=== CE QUE LA PART NE DIT PAS ===`);
dire(`   Elle ne dit pas que la BEAC a raison et nous tort, ni l'inverse.`);
dire(`   Elle dit quelle fraction de l'encours de chaque Trésor est couverte`);
dire(`   par un communiqué d'adjudication que nous avons lu ET chiffré.`);
dire(`\n   Trois choses en sortent par construction :`);
dire(`   · les syndications et placements privés, qui ne passent pas par une adjudication ;`);
dire(`   · les séances dont le communiqué n'est plus en ligne chez la BEAC ;`);
dire(`   · les séances dont le montant servi n'a pas encore été relu chez nous.`);
