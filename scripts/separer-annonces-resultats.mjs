/**
 * Sépare les annonces des résultats dans l'archive, et reprend l'inventaire.
 *
 * Les deux vivaient dans le même dossier, distinguées par le suffixe du nom.
 * Ce n'est pas assez : ce sont deux natures de document, lues par deux
 * traitements différents, et le lot qui extraira les chiffres des 610
 * communiqués de résultats doit pouvoir désigner son périmètre d'un chemin.
 *
 *   node scripts/separer-annonces-resultats.mjs [--essai]
 */
import fs from "node:fs";
import path from "node:path";

const RACINE = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet/1. Donnees de marche";
const BEAC = `${RACINE}/1. BEAC - Marche des titres publics`;
const ANCIEN = `${BEAC}/Adjudications`;
const INVENTAIRE = `${RACINE}/9. Index/inventaire.csv`;
const essai = process.argv.includes("--essai");

/** « … - annonce.pdf » et « … - resultats.pdf » disent déjà leur nature. */
const natureDe = (nom) => (/ - annonce\.pdf$/i.test(nom) ? "annonces" : / - resultats\.pdf$/i.test(nom) ? "resultats" : null);

const aDeplacer = [];
if (fs.existsSync(ANCIEN)) {
  for (const pays of fs.readdirSync(ANCIEN)) {
    const dPays = `${ANCIEN}/${pays}`;
    if (!fs.statSync(dPays).isDirectory()) continue;
    for (const an of fs.readdirSync(dPays)) {
      const dAn = `${dPays}/${an}`;
      if (!fs.statSync(dAn).isDirectory()) continue;
      for (const f of fs.readdirSync(dAn)) {
        const nature = natureDe(f);
        if (!nature) continue;
        aDeplacer.push({ de: `${dAn}/${f}`, vers: `${BEAC}/Adjudications - ${nature}/${pays}/${an}/${f}` });
      }
    }
  }
}

const parNature = aDeplacer.reduce((a, x) => ({ ...a, [x.vers.includes("annonces") ? "annonces" : "resultats"]: (a[x.vers.includes("annonces") ? "annonces" : "resultats"] ?? 0) + 1 }), {});
console.log(`${aDeplacer.length} pièces à déplacer : ${parNature.annonces ?? 0} annonces, ${parNature.resultats ?? 0} résultats`);

if (essai) {
  for (const m of aDeplacer.slice(0, 4)) console.log(`  ${path.relative(BEAC, m.de)}\n    → ${path.relative(BEAC, m.vers)}`);
  console.log("\nEssai à blanc.");
  process.exit(0);
}

for (const m of aDeplacer) {
  fs.mkdirSync(path.dirname(m.vers), { recursive: true });
  fs.renameSync(m.de, m.vers);
}

/* Les dossiers vidés s'en vont : une arborescence qui garde ses coquilles
   fait croire qu'il reste quelque chose dedans. */
const viderSiVide = (d) => {
  if (!fs.existsSync(d) || !fs.statSync(d).isDirectory()) return;
  for (const e of fs.readdirSync(d)) viderSiVide(`${d}/${e}`);
  if (fs.readdirSync(d).length === 0) fs.rmdirSync(d);
};
viderSiVide(ANCIEN);

/* L'INVENTAIRE SUIT, sans quoi il désignerait des chemins morts : une archive
   dont l'index ment est pire qu'une archive sans index. */
if (fs.existsSync(INVENTAIRE)) {
  const lignes = fs.readFileSync(INVENTAIRE, "utf8").split(/\r?\n/);
  const sortie = lignes.map((l, i) => {
    if (i === 0 || !l.trim()) return l;
    const c = l.split(";");
    const genre = c[1];
    if (genre !== "annonce" && genre !== "resultats") return l;
    c[4] = c[4].replace("/Adjudications/", `/Adjudications - ${genre === "annonce" ? "annonces" : "resultats"}/`);
    return c.join(";");
  });
  fs.writeFileSync(INVENTAIRE, sortie.join("\n"), "utf8");
  console.log("inventaire repris");
}

const compter = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { recursive: true }).filter((f) => String(f).endsWith(".pdf")).length : 0);
console.log(`\nAdjudications - annonces   : ${compter(`${BEAC}/Adjudications - annonces`)}`);
console.log(`Adjudications - resultats  : ${compter(`${BEAC}/Adjudications - resultats`)}`);
console.log(`Calendriers indicatifs     : ${compter(`${BEAC}/Calendriers indicatifs`)}`);
console.log(`Autres communiques         : ${compter(`${BEAC}/Autres communiques`)}`);
