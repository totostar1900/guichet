/**
 * LA BEAC PUBLIE-T-ELLE QUOI QUE CE SOIT D AVANT JUIN 2019 ?
 *
 * La question vient de l abondement gabonais du 12 juin 2019, dont
 * l etiquette implique une ligne nee a une seance du 27 mars 2019.
 *
 * TROIS ERREURS DE METHODE DEJA COMMISES SUR CETTE SEULE QUESTION, et
 * chacune a produit un chiffre faux presente avec aplomb :
 *
 *   UN HEREDOC a mange un antislash sur deux, « \\d » est devenu « \d »,
 *   et dans un gabarit « \d » vaut « d ». La regexp ne reconnaissait plus
 *   une date et a repondu « zero piece ».
 *
 *   MON PROPRE LECTEUR DE LIGNES ne voyait que les <tr> bien formes,
 *   exactement l angle mort que la maison avait mesure le 15 octobre :
 *   quinze pieces de 2019 dorment dans une liste « DOCUMENTS » hors du
 *   tableau, dont cinq resultats du Gabon et du Congo. C est de la
 *   qu viennent nos pieces de juin 2019.
 *
 *   UNE SEULE PAGE INTERROGEE quand la maison en lit neuf.
 *
 * D OU CE SCRIPT : le lecteur de la MAISON, sur TOUTES les pages, et un
 * controle prealable qui refuse de compter si le lecteur de dates rate
 * une date ecrite a la main ici.
 *
 *   npx tsx --conditions=react-server scripts/mars-2019-chez-la-beac.mjs
 */
import fs from "node:fs";
const dire = (s) => fs.writeSync(1, `${s}\n`);
const { parseBeacRows, readBeacDoc } = await import("../src/lib/market/beac.ts");

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

/** La date qu un titre ou une adresse porte, dans les trois langues. */
function dateDe(texte) {
  /* Une adresse de la BEAC porte parfois un « % » nu, que decodeURIComponent
     refuse. Un titre illisible ne doit pas arreter le compte. */
  let brut = String(texte);
  try { brut = decodeURIComponent(brut); } catch { /* on garde le brut */ }
  const t = brut.replace(/[_]+/g, " ");
  const a = t.match(new RegExp(String.raw`(\d{1,2})\s*(?:er|st|nd|rd|th)?\s+(?:of\s+|de\s+)?(${MOIS})\s+(?:de\s+)?(\d{4})`, "i"));
  if (a) return iso(a[3], N[a[2].toLowerCase()], a[1]);
  const b = t.match(new RegExp(String.raw`(${MOIS})\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s+(\d{4})`, "i"));
  if (b) return iso(b[3], N[b[1].toLowerCase()], b[2]);
  /* L espace est un separateur, parce que les soulignes en deviennent un :
     « Communiqué_des_résultats_BTA-_du_Gabon_17_07_2019.pdf ». Le controle
     prealable l a dit, je ne l avais pas vu. */
  const c = t.match(/(\d{1,2})[/.\-_\s](\d{1,2})[/.\-_\s](\d{4})/);
  if (c && Number(c[2]) >= 1 && Number(c[2]) <= 12) return iso(c[3], Number(c[2]), c[1]);
  return undefined;
}

const ESSAIS = [
  ["Communiqué des résultats d'adjudication des BTA du 18 septembre 2019 - Gabon", "2019-09-18"],
  ["Communiqué d'annonce d'émission des BTA du 04 décembre 2019 - Gabon", "2019-12-04"],
  ["Communiqué d'annonce de BTA du 1er août 2020 - Tchad", "2020-08-01"],
  ["Announcement issuance of Fungible Treasury Bills of Cameroon - 04th December 2019 session", "2019-12-04"],
  ["Aviso de comunicado de la emision de Bonos del tesoro del 16 de octubre 2019", "2019-10-16"],
  ["Communiqué des résultats d'adjudication des BTA du 14-08-2019 - Gabon", "2019-08-14"],
  ["Communiqué-des-résultats-BTA-Gabon_05-06-2019.pdf", "2019-06-05"],
  ["Communiqué_des_résultats_BTA-_du_Gabon_17_07_2019.pdf", "2019-07-17"],
  ["Communiqué des résultats d'adjudication des BTA du 27 mars 2019 - Gabon", "2019-03-27"],
];
dire(`=== LE LECTEUR DE DATES RETROUVE-T-IL DES DATES CONNUES ? ===`);
let rates = 0;
for (const [phrase, attendu] of ESSAIS) {
  const vu = dateDe(phrase);
  if (vu !== attendu) rates += 1;
  dire(`   ${vu === attendu ? "ok  " : "RATE"} ${attendu} · lu ${vu ?? "rien"} · ${phrase.slice(0, 58)}`);
}
if (rates) { dire(`\n   ${rates} rate(s) : on s arrete.`); process.exit(1); }
dire(`   les ${ESSAIS.length} essais passent.\n`);

const PAGES = [
  "https://www.beac.int/annonces-et-communiques/",
  "https://www.beac.int/m-des-titres-publics/annonces-et-communiques/",
  "https://www.beac.int/m-des-titres-publics/avis-et-communiques-du-marche-des-titres-publics/",
  "https://www.beac.int/m-des-titres-publics/bulletins-marche-titres-publics/",
  "https://www.beac.int/m-des-titres-publics/statistiques-mensuelles-marche-valeurs-tresor/",
  "https://www.beac.int/m-des-titres-publics/calendrier-trimestriel-demission-titres-publics-etats-de-cemac/",
  "https://www.beac.int/m-des-titres-publics/programme-annuel-emissions-de-titres-publics-etats-de-cemac/",
  "https://www.beac.int/economie-stats/statistiques-titres-publics/",
  "https://www.beac.int/m-des-titres-publics/",
];

const vues = new Map();
for (const url of PAGES) {
  let html = null;
  for (let essai = 1; essai <= 2 && !html; essai++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0; +https://guichet.purposecapital.africa)" }, signal: AbortSignal.timeout(90_000) });
      if (res.ok) html = await res.text();
      else dire(`   ${res.status} · ${url}`);
    } catch (e) { dire(`   injoignable (essai ${essai}) · ${url} · ${String(e.message).slice(0, 40)}`); }
  }
  if (!html) continue;
  const rows = parseBeacRows(html);
  let neuves = 0;
  for (const d of rows) {
    const cle = d.url;
    if (vues.has(cle)) continue;
    vues.set(cle, { ...d, on: dateDe(d.title) ?? dateDe(d.url), vueSur: url });
    neuves += 1;
  }
  dire(`   ${String(rows.length).padStart(4)} ligne(s) · ${String(neuves).padStart(4)} inedite(s) · ${url}`);
}

const tout = [...vues.values()];
dire(`\n${tout.length} piece(s) distinctes · ${tout.filter((d) => d.on).length} datees\n`);

dire(`=== PAR ANNEE DE SEANCE ===`);
const parAn = {};
for (const d of tout.filter((d) => d.on)) parAn[d.on.slice(0, 4)] = (parAn[d.on.slice(0, 4)] ?? 0) + 1;
for (const [a, n] of Object.entries(parAn).sort()) dire(`   ${a}  ${String(n).padStart(4)}`);

dire(`\n=== LES PIECES DE 2019, PAR MOIS ===`);
const parMois = {};
for (const d of tout.filter((d) => String(d.on ?? "").startsWith("2019"))) parMois[d.on.slice(0, 7)] = (parMois[d.on.slice(0, 7)] ?? 0) + 1;
for (const [m, n] of Object.entries(parMois).sort()) dire(`   ${m}  ${String(n).padStart(3)}`);

dire(`\n=== LES VINGT PLUS ANCIENNES PIECES, TOUTES PAGES CONFONDUES ===`);
for (const d of tout.filter((d) => d.on).sort((a, b) => a.on.localeCompare(b.on)).slice(0, 20)) {
  const a = readBeacDoc(d);
  dire(`   ${d.on} ${String(a.country ?? d.country ?? "—").padEnd(14)} ${String(a.kind).padEnd(10)} ${d.title.slice(0, 62)}`);
}

dire(`\n=== UNE PIECE DE SEANCE ANTERIEURE AU 5 JUIN 2019 ? ===`);
const avant = tout.filter((d) => d.on && d.on < "2019-06-05");
dire(`   ${avant.length} piece(s)`);
for (const d of avant.sort((a, b) => a.on.localeCompare(b.on))) dire(`   ${d.on} ${d.title.slice(0, 70)}\n      ${decodeURIComponent(d.url)}`);

dire(`\n=== LE MOT « MARS 2019 » OU UNE DATE DE MARS 2019 N IMPORTE OU ===`);
for (const d of tout) {
  const t = `${d.title} ${decodeURIComponent(d.url)}`;
  if (/mars\s*2019|march\s*2019|marzo\s*(de\s*)?2019|[-_/.]0?3[-_/.]2019|2019[-_/.]0?3[-_/.]/i.test(t)) dire(`   ${d.on ?? "—"} ${d.title.slice(0, 66)}`);
}
