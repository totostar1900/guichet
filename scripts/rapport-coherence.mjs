/**
 * LE RAPPORT SE RÉCONCILIE-T-IL AVEC LUI-MÊME ?
 *
 * Georges a ouvert le classeur et y a trouvé quatre incohérences que les
 * totaux seuls ne montraient pas. Ce script les chiffre, pour que la
 * discussion porte sur des nombres et pas sur des impressions.
 *
 *   npx tsx --conditions=react-server scripts/rapport-coherence.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { construireRapport } = await import("../src/lib/market/rapport-fournisseur.ts");
const { classer } = await import("../src/lib/market/remarques.ts");
const { repo } = await import("../src/lib/data/index.ts");

const dire = (s) => fs.writeSync(1, `${s}\n`);

const bulletins = await repo().listBulletins(3000);
const dates = bulletins.map((b) => b.sessionDate).sort();
const r = construireRapport(bulletins, dates[0], dates[dates.length - 1]);

const somme = (xs, k) => xs.reduce((a, x) => a + x[k], 0);
const verdict = (a, b) => (a === b ? "ok " : "NON");

dire(`=== COHÉRENCE DU RAPPORT · ${r.du} → ${r.au} ===\n`);
dire(`   remarques annoncées : ${r.remarques}\n`);

const parSort = somme(r.parSort, "remarques");
const parFamille = somme(r.parFamille, "remarques");
dire(`   ${verdict(parSort, r.remarques)} somme des devenirs   ${parSort}`);
dire(`   ${verdict(parFamille, r.remarques)} somme des familles   ${parFamille}   (écart ${r.remarques - parFamille})`);

/* QUELLES REMARQUES N'ENTRENT DANS AUCUNE FAMILLE. C'est l'écart ci-dessus,
   et il faut pouvoir le nommer, pas seulement le constater. */
const toutes = [...r.corrections, ...r.ecartees, ...r.perdues, ...r.publication];
const vues = new Map();
for (const l of toutes) vues.set(`${l.seance}|${l.message}`, l);

dire(`\n   LES FEUILLES DE LIGNES`);
dire(`      feuille 1 publication : ${r.publication.length}`);
dire(`      feuille 3 corrigé     : ${r.corrections.length}`);
dire(`      feuille 4 écarté      : ${r.ecartees.length}`);
dire(`      feuille 5 non lu      : ${r.perdues.length}`);
dire(`      lignes distinctes     : ${vues.size}`);
dire(`      ${verdict(r.corrections.length + r.ecartees.length + r.perdues.length + r.publication.length, vues.size)} les quatre feuilles additionnées : ${r.corrections.length + r.ecartees.length + r.perdues.length + r.publication.length}`);

/* LE RECOUVREMENT, qui est la cause de tout le reste : la feuille 1 est une
   SÉLECTION, les feuilles 3 à 5 sont une PARTITION. Une ligne peut donc
   figurer deux fois, et les sous-titres se contredisent. */
const clef = (l) => `${l.seance}|${l.message}`;
const dansPublication = new Set(r.publication.map(clef));
dire(`\n   RECOUVREMENT AVEC LA FEUILLE 1`);
for (const [nom, xs] of [["corrigé", r.corrections], ["écarté", r.ecartees], ["non lu", r.perdues]]) {
  const n = xs.filter((l) => dansPublication.has(clef(l))).length;
  dire(`      ${String(n).padStart(4)} ligne(s) de « ${nom} » sont AUSSI en feuille 1`);
}
const parDevenirEnF1 = {};
for (const l of r.publication) parDevenirEnF1[l.devenu] = (parDevenirEnF1[l.devenu] ?? 0) + 1;
dire(`      la feuille 1 contient : ${Object.entries(parDevenirEnF1).map(([k, n]) => `${n} « ${k} »`).join(", ")}`);

/* CE QUI N'EST DANS AUCUNE FEUILLE. 507 remarques annoncées, et seules
   celles des quatre sorts paraissent : les autres disparaissent sans un mot. */
const sortsMontres = new Set(["corrigee", "ecartee", "perdue"]);
const manquants = r.parSort.filter((s) => !sortsMontres.has(s.sort));
dire(`\n   CE QU'AUCUNE FEUILLE DE LIGNES NE MONTRE`);
for (const s of manquants) dire(`      ${String(s.remarques).padStart(4)}  ${s.libelle}`);
dire(`      ${String(somme(manquants, "remarques")).padStart(4)}  au total, soit ${Math.round((somme(manquants, "remarques") / r.remarques) * 100)} % des remarques`);

/* LES COLONNES « SÉANCES » NE S'ADDITIONNENT PAS, et rien ne le dit : une
   même séance porte plusieurs familles. */
dire(`\n   LES COLONNES « SÉANCES »`);
dire(`      somme des séances par devenir  : ${somme(r.parSort, "seances")}`);
dire(`      somme des séances par famille  : ${somme(r.parFamille, "seances")}`);
dire(`      séances réellement concernées  : ${r.seances - r.seancesSansRemarque}`);

/* LE VOCABULAIRE : le titre d'une feuille doit répéter le mot de la colonne. */
dire(`\n   LE VOCABULAIRE DES FEUILLES CONTRE CELUI DES COLONNES`);
for (const [feuille, attendu] of [["3. Corrigé par nos soins", "Corrigée et intégrée"], ["4. Écarté", "Écartée"], ["5. Non lu", "Non lue"]]) {
  dire(`      « ${feuille} »  contre la colonne « ${attendu} »  ${feuille.includes(attendu) ? "ok" : "DEUX MOTS POUR UNE CHOSE"}`);
}

/* LES TROIS QUE AUCUNE FAMILLE NE RECONNAÎT. Un rapport qui annonce 507 et
   en détaille 504 doit pouvoir nommer les trois. */
dire(`\n   LES REMARQUES QU'AUCUNE FAMILLE NE RECONNAÎT`);
const parBulletin = bulletins.filter((b) => b.sessionDate >= r.du && b.sessionDate <= r.au);
const vuesPhrases = new Set();
let orphelines = 0;
for (const b of parBulletin) {
  for (const p of [...(b.anomalies ?? []), ...(b.warnings ?? []), ...(b.notes ?? []).map((n) => n.message)]) {
    if (!p || vuesPhrases.has(`${b.sessionDate}|${p}`)) continue;
    vuesPhrases.add(`${b.sessionDate}|${p}`);
    if (!classer(p)) {
      orphelines++;
      if (orphelines <= 10) dire(`      ${b.sessionDate}  ${p.slice(0, 150)}`);
    }
  }
}
dire(`      ${orphelines} au total`);

/* OÙ PASSENT LES TROIS. Les familles sont comptées par la liste FAMILLES ;
   une phrase classée sous un code absent de cette liste disparaît du détail
   sans disparaître du total. */
const { FAMILLES } = await import("../src/lib/market/remarques.ts");
const connus = new Set(FAMILLES.map((f) => f.code));
const parCode = {};
for (const p of vuesPhrases) {
  const msg = p.slice(p.indexOf("|") + 1);
  const c = classer(msg) ?? "(aucun)";
  parCode[c] = (parCode[c] ?? 0) + 1;
}
dire(`\n   CODES VUS CONTRE CODES DÉCLARÉS`);
for (const [c, n] of Object.entries(parCode).sort()) {
  if (!connus.has(c)) dire(`      ${String(n).padStart(4)}  code « ${c} » ABSENT de FAMILLES`);
}
dire(`      familles déclarées : ${FAMILLES.length}`);

dire(`\n   LES TROIS PHRASES CLASSÉES « Z »`);
for (const p of vuesPhrases) {
  const msg = p.slice(p.indexOf("|") + 1);
  if (classer(msg) === "Z") dire(`      ${p.slice(0, 10)}  ${msg.slice(0, 200)}`);
}
