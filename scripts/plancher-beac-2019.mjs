/**
 * OU COMMENCE EXACTEMENT CE QUE LA BEAC PUBLIE ?
 *
 * La question vient de l abondement gabonais du 12 juin 2019, qui implique
 * une ligne nee le 27 mars 2019. Notre collecte ne porte rien de gabonais
 * avant le 5 juin. DEUX TROUS POSSIBLES, ET CE NE SONT PAS LES MEMES :
 * la BEAC publie la piece et nous l avons manquee, ou elle ne la publie
 * pas. Le premier se repare, le second se declare.
 *
 * ECRIT AVEC L OUTIL WRITE ET NON UN HEREDOC. La premiere version de ce
 * script est passee par un heredoc, qui a mange un antislash sur deux :
 * « \\d » est devenu « \d », et dans un GABARIT de modele « \d » vaut « d ».
 * La regexp cherchait donc « d{1,2} » et « s+ », elle ne reconnaissait plus
 * une date, et elle a declare « zero piece avant juin 2019 » avec aplomb.
 * Une panne muette de plus, dans la famille la plus couteuse de la maison.
 *
 * D OU LE CONTROLE PREALABLE : le lecteur de dates doit d abord retrouver
 * des dates ECRITES A LA MAIN ICI. Un lecteur qui echoue sur celles-la ne
 * prouve rien sur les autres, et on s arrete.
 *
 *   npx tsx --conditions=react-server scripts/plancher-beac-2019.mjs
 */
import fs from "node:fs";
const dire = (s) => fs.writeSync(1, `${s}\n`);

const N = {
  janvier: 1, "février": 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7,
  "août": 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, "décembre": 12, decembre: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8,
  september: 9, october: 10, november: 11, december: 12,
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8,
  septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};
const MOIS = Object.keys(N).join("|");
const iso = (a, m, j) => `${a}-${String(m).padStart(2, "0")}-${String(Number(j)).padStart(2, "0")}`;

/** La date de seance que le titre porte, dans les trois langues de la zone. */
function dateDe(titre) {
  const t = String(titre);
  // « 18 septembre 2019 », « 1er juin 2020 », « 04th December 2019 », « 16 de octubre 2019 »
  const a = t.match(new RegExp(String.raw`(\d{1,2})\s*(?:er|st|nd|rd|th)?\s+(?:of\s+|de\s+)?(${MOIS})\s+(?:de\s+)?(\d{4})`, "i"));
  if (a) return iso(a[3], N[a[2].toLowerCase()], a[1]);
  // « September 18, 2019 »
  const b = t.match(new RegExp(String.raw`(${MOIS})\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s+(\d{4})`, "i"));
  if (b) return iso(b[3], N[b[1].toLowerCase()], b[2]);
  // « 14-08-2019 », « 14/08/2019 »
  const c = t.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (c) return iso(c[3], Number(c[2]), c[1]);
  return undefined;
}

/* LE CONTROLE PREALABLE. Si le lecteur rate une seule de ces phrases, il
   n est pas en etat de compter quoi que ce soit, et on s arrete. */
const ESSAIS = [
  ["Communiqué des résultats d'adjudication des BTA du 18 septembre 2019 - République du Gabon", "2019-09-18"],
  ["Communiqué d'annonce d'émission des BTA du 04 décembre 2019 - République du Gabon", "2019-12-04"],
  ["Communiqué d'annonce d'émission de BTA du 1er août 2020 - République du Tchad", "2020-08-01"],
  ["Announcement issuance of Fungible Treasury Bills of the Republic of Cameroon - 04th December 2019 session", "2019-12-04"],
  ["Aviso de comunicado de la emision de Bonos del tesoro del 16 de octubre 2019", "2019-10-16"],
  ["Communiqué des résultats d'adjudication des BTA du 14-08-2019 - République du Gabon", "2019-08-14"],
  ["Communiqué des résultats d'adjudication des BTA du 27 mars 2019 - République du Gabon", "2019-03-27"],
];
dire(`=== LE LECTEUR DE DATES RETROUVE-T-IL DES DATES CONNUES ? ===`);
let rates = 0;
for (const [phrase, attendu] of ESSAIS) {
  const vu = dateDe(phrase);
  if (vu !== attendu) rates += 1;
  dire(`   ${vu === attendu ? "ok  " : "RATE"} attendu ${attendu} · lu ${vu ?? "rien"} · ${phrase.slice(0, 62)}`);
}
if (rates) {
  dire(`\n   ${rates} essai(s) rate(s) : le lecteur n est pas en etat de compter. On s arrete.`);
  process.exit(1);
}
dire(`   les ${ESSAIS.length} essais passent.\n`);

const res = await fetch("https://www.beac.int/annonces-et-communiques/", {
  headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0; +https://guichet.purposecapital.africa)" },
  signal: AbortSignal.timeout(90_000),
});
const html = await res.text();
dire(`index : ${res.status} · ${html.length} octets`);

const lignes = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  .map((m) => {
    const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
      c[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&#8217;|&rsquo;/g, "'").replace(/\s+/g, " ").trim(),
    );
    return { titre: cells[0] ?? "", taille: cells[1] ?? "", pays: cells[2] ?? "", annee: cells[3] ?? "", lien: m[1].match(/href="([^"]+)"/i)?.[1] };
  })
  .filter((l) => l.titre && l.titre !== "Titre du document")
  .map((l) => ({ ...l, on: dateDe(l.titre) }));
dire(`${lignes.length} lignes de document · ${lignes.filter((l) => l.on).length} avec une date lue\n`);

dire(`=== CE QUE LA COLONNE « ANNEE » DE L INDEX ANNONCE ===`);
const parAnnee = {};
for (const l of lignes) parAnnee[l.annee || "(vide)"] = (parAnnee[l.annee || "(vide)"] ?? 0) + 1;
for (const [a, n] of Object.entries(parAnnee).sort()) dire(`   ${a.padEnd(8)} ${String(n).padStart(4)}`);

dire(`\n=== LES PIECES DE 2019, PAR MOIS DE SEANCE ===`);
const parMois = {};
for (const l of lignes.filter((l) => String(l.on ?? "").startsWith("2019"))) parMois[l.on.slice(0, 7)] = (parMois[l.on.slice(0, 7)] ?? 0) + 1;
for (const [m, n] of Object.entries(parMois).sort()) dire(`   ${m}  ${String(n).padStart(3)}`);
const illisibles2019 = lignes.filter((l) => l.annee === "2019" && !l.on);
dire(`   date illisible : ${illisibles2019.length}`);
for (const l of illisibles2019) dire(`      ${String(l.pays).padEnd(20)} ${l.titre.slice(0, 84)}`);

dire(`\n=== LES QUINZE PLUS ANCIENNES PIECES DE TOUT L INDEX ===`);
for (const l of lignes.filter((l) => l.on).sort((a, b) => a.on.localeCompare(b.on)).slice(0, 15))
  dire(`   ${l.on} ${String(l.pays).padEnd(20)} ${l.titre.slice(0, 72)}`);

dire(`\n=== UNE PIECE DE JANVIER A MAI 2019 ? ===`);
const tot = lignes.filter((l) => l.on && l.on >= "2019-01-01" && l.on < "2019-06-01");
dire(`   ${tot.length} piece(s)`);
for (const l of tot.sort((a, b) => a.on.localeCompare(b.on))) dire(`   ${l.on} ${String(l.pays).padEnd(20)} ${l.titre.slice(0, 72)}`);

/* L INDEX EST-IL PAGINE ? Notre base tient des pieces du 5 juin 2019 ; si
   la page n en montre aucune, soit elle a une suite, soit elle a maigri. */
dire(`\n=== L INDEX A-T-IL UNE SUITE ? ===`);
const pagination = [...html.matchAll(/<a[^>]+href="([^"]*(?:page|paged|offset|p=)[^"]*)"[^>]*>([\s\S]{0,40}?)<\/a>/gi)]
  .map((m) => `${m[1]} · « ${m[2].replace(/<[^>]+>/g, "").trim()} »`);
dire(`   liens ressemblant a une pagination : ${pagination.length}`);
for (const p of [...new Set(pagination)].slice(0, 12)) dire(`      ${p}`);
for (const mot of ["load-more", "charger", "voir plus", "show more", "data-page", "ajax", "wp-json", "admin-ajax", "DataTable", "dataTable"]) {
  const n = (html.match(new RegExp(mot.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), "gi")) ?? []).length;
  if (n) dire(`      « ${mot} » apparait ${n} fois dans la page`);
}

dire(`\n=== CE QUE NOTRE BASE TIENT ET QUE L INDEX NE MONTRE PLUS ===`);
dire(`   notre plus ancienne piece : 2019-06-05 (Gabon et Congo)`);
const plusVieille = lignes.filter((l) => l.on).sort((a, b) => a.on.localeCompare(b.on))[0];
dire(`   la plus ancienne de l index : ${plusVieille?.on ?? "—"}`);
dire(`   ${plusVieille && plusVieille.on > "2019-06-05" ? "L INDEX A MAIGRI, ou il a une suite : notre base porte plus ancien que lui." : "L index remonte au moins aussi loin que nous."}`);
