/**
 * CE QUE LA PAGE DE LA BEAC CONTIENT VRAIMENT, LIGNE PAR LIGNE.
 *
 * « 249 pièces sur environ mille » était faux par raccourci : les mille lignes
 * ne sont pas mille résultats. Avant de ramasser, on compte ce qu'il y a.
 *
 * LA QUESTION QUI DÉCIDE DE TOUT : peut-on reconstituer un encours à partir de
 * ce que la BEAC publie ? Il y faut le montant SERVI, qui n'est que dans le
 * communiqué de RÉSULTATS. Une annonce ne dit que ce que le Trésor espérait.
 * Le rapport entre les deux familles est donc la mesure, et pas le total.
 *
 *   node scripts/beac-inventaire.mjs
 */
const URL = "https://www.beac.int/annonces-et-communiques/";
const html = await fetch(URL, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0)" } }).then((r) => r.text());

const lignes = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => {
  const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => c[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim());
  return { cells, texte: cells.join(" "), lien: m[1].match(/href="([^"]+)"/i)?.[1] };
}).filter((l) => l.texte && !/^Titre du document/i.test(l.texte));

console.log(`page de ${html.length} octets · ${lignes.length} lignes utiles`);

/* L ordre compte : « résultats » se teste avant « annonce », parce qu un
   communiqué de résultats cite l annonce qu il solde. */
const EST_RESULTAT = /communiqu[ée]\s*d?e?s?\s+r[ée]sultats?|r[ée]sultats?\s+d.?\s*adjudication/i;
const EST_ANNONCE = /annonce|adjudication/i;
const MOIS = { janvier: 1, "février": 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, "août": 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, "décembre": 12, decembre: 12 };
const dateDe = (t) => { const m = t.match(/(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(\d{4})/i); return m ? `${m[3]}-${String(MOIS[m[2].toLowerCase()]).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}` : undefined; };
/* Le pays est une COLONNE du tableau, pas une devinette sur le titre. */
const paysDe = (l) => l.cells.find((c) => /^(Cameroun|Congo|Gabon|Tchad|Centrafrique|RCA|Guinée Equa\w*|Guinee)/i.test(c)) ?? "?";

const res = [], ann = [], autre = [];
for (const l of lignes) (EST_RESULTAT.test(l.texte) ? res : EST_ANNONCE.test(l.texte) ? ann : autre).push(l);
console.log(`\n   résultats d'adjudication  ${String(res.length).padStart(4)}`);
console.log(`   annonces d'émission       ${String(ann.length).padStart(4)}`);
console.log(`   autre                     ${String(autre.length).padStart(4)}`);

const matrice = new Map();
for (const [fam, xs] of [["res", res], ["ann", ann]]) for (const l of xs) {
  const an = dateDe(l.texte)?.slice(0, 4) ?? "?";
  const k = `${paysDe(l)}|${an}`;
  const v = matrice.get(k) ?? { res: 0, ann: 0 };
  v[fam]++; matrice.set(k, v);
}
console.log(`\n=== ANNONCÉES CONTRE PUBLIÉES, PAR PAYS ET PAR ANNÉE ===`);
console.log(`   pays            année   annonces   résultats   part publiée`);
const pays = [...new Set([...matrice.keys()].map((k) => k.split("|")[0]))].sort();
const ans = [...new Set([...matrice.keys()].map((k) => k.split("|")[1]))].sort();
let tA = 0, tR = 0;
for (const p of pays) for (const a of ans) {
  const v = matrice.get(`${p}|${a}`); if (!v) continue;
  tA += v.ann; tR += v.res;
  console.log(`   ${p.padEnd(16)} ${a}   ${String(v.ann).padStart(6)}   ${String(v.res).padStart(9)}   ${v.ann ? `${Math.round((100 * v.res) / v.ann)} %` : "-"}`);
}
console.log(`   ${"TOUS".padEnd(16)} ----   ${String(tA).padStart(6)}   ${String(tR).padStart(9)}   ${Math.round((100 * tR) / tA)} %`);

console.log(`\n=== CE QUI N'EST NI L'UN NI L'AUTRE ===`);
for (const r of autre.slice(0, 12)) console.log(`   ${r.texte.slice(0, 120)}`);
