/**
 * OU COMMENCE CE QUE LA BEAC PUBLIE ?
 *
 * Zero piece avant juin 2019 dans notre collecte, six pays et deux
 * familles confondus, et deux Tresors qui commencent le MEME JOUR. Un
 * ramassage qui oublie ne produit pas cette figure : un plancher si.
 *
 * On ne conclut pas sur la forme : on lit l index et on regarde.
 */
import fs from "node:fs";
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ADRESSES = ["https://www.beac.int/annonces-et-communiques/", "https://www.beac.int/m-des-titres-publics/annonces-et-communiques/"];

let html = null;
for (const url of ADRESSES) {
  for (let essai = 1; essai <= 3; essai++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0; +https://guichet.purposecapital.africa)" }, signal: AbortSignal.timeout(90_000) });
      dire(`${url} · essai ${essai} · ${res.status}`);
      if (!res.ok) continue;
      const t = await res.text();
      if (t.length > 10_000) { html = t; break; }
    } catch (e) { dire(`${url} · essai ${essai} · ${String(e.message).slice(0, 60)}`); }
  }
  if (html) break;
}
if (!html) { dire(`\nLA BEAC NE REPOND PAS. On ne sait donc rien de plus, et on ne conclut pas.`); process.exit(2); }

dire(`\npage de ${html.length} octets`);
const lignes = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => {
  const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => c[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim());
  return { cells, texte: cells.join(" "), lien: m[1].match(/href="([^"]+)"/i)?.[1] };
}).filter((l) => l.texte && !/^Titre du document/i.test(l.texte));
dire(`${lignes.length} lignes utiles`);

const MOIS = { janvier: 1, "février": 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, "août": 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, "décembre": 12, decembre: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const NOMS = Object.keys(MOIS).join("|");
const dateDe = (t) => {
  const m = t.match(new RegExp(`(\d{1,2})\s*(?:er)?\s+(?:of\s+|de\s+)?(${NOMS})\s+(?:de\s+)?(\d{4})`, "i"));
  if (m) return `${m[3]}-${String(MOIS[m[2].toLowerCase()]).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
  const n = t.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
  return n ? `${n[3]}-${String(Number(n[2])).padStart(2, "0")}-${String(Number(n[1])).padStart(2, "0")}` : undefined;
};

const datees = lignes.map((l) => ({ ...l, on: dateDe(l.texte) })).filter((l) => l.on && l.on >= "2000-01-01" && l.on <= "2030-12-31");
datees.sort((a, b) => a.on.localeCompare(b.on));
dire(`${datees.length} lignes portant une date lisible\n`);

dire(`=== LES VINGT PLUS ANCIENNES LIGNES DE L INDEX ===`);
for (const l of datees.slice(0, 20)) dire(`   ${l.on} · ${l.texte.slice(0, 96)}`);

const parAn = {};
for (const l of datees) { const a = l.on.slice(0, 4); parAn[a] = (parAn[a] ?? 0) + 1; }
dire(`\n=== LIGNES PAR ANNEE ===`);
for (const [a, n] of Object.entries(parAn).sort()) dire(`   ${a}  ${String(n).padStart(4)}`);

dire(`\n=== TOUTE LIGNE DE L INDEX DATEE AVANT JUIN 2019 ===`);
const vieilles = datees.filter((l) => l.on < "2019-06-01");
dire(`   ${vieilles.length} ligne(s)`);
for (const l of vieilles) dire(`   ${l.on} · ${l.texte.slice(0, 100)}`);

dire(`\n=== UNE LIGNE QUI PARLE DE MARS 2019 ===`);
for (const l of lignes.filter((l) => /mars\s*2019|march\s*2019|marzo\s*(de\s*)?2019/i.test(l.texte))) dire(`   ${l.texte.slice(0, 110)}`);
