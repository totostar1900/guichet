/**
 * OU LE COURS PARAIT-IL SANS SON AGE ?
 *
 * Deux reparations ont ete retenues sur le secondaire, et elles tiennent
 * sans rien trancher d autre : marquer l age du cours partout ou il
 * parait, et ecrire « non cote » plutot que de laisser deux cases vides
 * qu on lit comme un oubli.
 *
 * La premiere est DEJA FAITE a deux endroits, la carte compacte et le dos
 * de la fiche, et leurs commentaires le disent bien : « sur ce marche un
 * prix de quatre cents jours et un prix d hier ne valent pas la meme
 * confiance ». Avant d en rajouter, il faut donc savoir OU IL MANQUE.
 *
 * On ne devine pas : on liste les fichiers qui affichent « lastPrice » et
 * on regarde lesquels nomment aussi « priceSince ».
 *
 *   node scripts/ou-le-cours-parait-sans-son-age.mjs
 */
import fs from "node:fs";
import path from "node:path";

const RACINE = "C:/dev/guichet/src";
const dire = (s) => fs.writeSync(1, `${s}\n`);

const fichiers = [];
const voir = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name).replace(/\\/g, "/");
    if (e.isDirectory()) voir(p);
    else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name)) fichiers.push(p);
  }
};
voir(RACINE);

const avecCours = [];
for (const f of fichiers) {
  const s = fs.readFileSync(f, "utf8");
  /* On ne compte que les endroits qui AFFICHENT le cours, pas ceux qui le
     stockent ou le lisent : un mappeur de depot n a pas d age a dire. */
  if (!/lastPrice|\bask\b|\bbid\b/.test(s)) continue;
  const affiche = /fmtPrice|fmt\(|<td|<span|<div|children/.test(s);
  if (!affiche) continue;
  avecCours.push({
    f: f.replace("C:/dev/guichet/", ""),
    age: /priceSince/.test(s),
    nonCote: /sans cours|non cot|intraitable/i.test(s),
    bidAsk: /\bo\.bid\b|\bo\.ask\b/.test(s),
  });
}

dire(`${avecCours.length} fichier(s) touchent au cours ou a la fourchette\n`);
dire(`   ${"age dit".padEnd(9)} ${"non cote".padEnd(10)} ${"bid/ask".padEnd(9)} fichier`);
for (const x of avecCours.sort((a, b) => Number(a.age) - Number(b.age))) {
  dire(`   ${(x.age ? "oui" : "NON").padEnd(9)} ${(x.nonCote ? "oui" : "non").padEnd(10)} ${(x.bidAsk ? "oui" : "non").padEnd(9)} ${x.f}`);
}

const manquants = avecCours.filter((x) => !x.age);
dire(`\n=== ${manquants.length} fichier(s) affichent un cours sans jamais nommer son age ===`);
dire(`   C est la liste a examiner, et il faudra regarder chacun : un fichier`);
dire(`   peut parler du cours sans l afficher, et la mesure ne le distingue pas.`);
