/**
 * PRODUIRE LE CLASSEUR DE QUALITE DES DONNEES, HORS DU NAVIGATEUR.
 *
 * La route du desk le rend a la demande, ce qui est le bon endroit pour le
 * desk. Pour le relire avant de l envoyer a un tiers, on veut le fichier sur
 * le disque, et le meme code que l ecran : un rapport produit par un second
 * chemin ne dit plus ce que la page montre.
 *
 *   npx tsx --conditions=react-server scripts/rapport-produire.mjs [du] [au]
 */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { repo } = await import("../src/lib/data/index.ts");
const { construireRapport } = await import("../src/lib/market/rapport-fournisseur.ts");
const { classeurFournisseur } = await import("../src/lib/market/rapport-classeur.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const bulletins = await repo().listBulletins(3000);
const dates = bulletins.map((b) => b.sessionDate).sort();
const du = process.argv[2] ?? dates[0];
const au = process.argv[3] ?? dates[dates.length - 1];

const r = construireRapport(bulletins, du, au);
dire(`=== RAPPORT DU ${r.du} AU ${r.au} ===`);
dire(`   seances                      ${r.seances}`);
dire(`   seances sans remarque        ${r.seancesSansRemarque}`);
dire(`   remarques                    ${r.remarques}`);
dire(`   corrections appliquees       ${r.corrections.length}`);
dire(`   ecartees                     ${r.ecartees.length}`);
dire(`   non lues                     ${r.perdues.length}`);
dire(`   erreurs de publication       ${r.publication.length}`);
dire(`   BULLETINS INTROUVABLES       ${r.introuvables.length}`);
dire(`\n   par sort :`);
for (const s of r.parSort) dire(`      ${String(s.sort).padEnd(14)} ${String(s.remarques).padStart(5)} ligne(s) · ${s.seances} seance(s)`);
dire(`\n   par famille, les dix premieres :`);
for (const f of r.parFamille.slice(0, 10)) dire(`      ${f.code.padEnd(4)} ${String(f.remarques).padStart(5)} · ${f.libelle.slice(0, 80)}`);
if (r.introuvables.length) {
  dire(`\n   les bulletins introuvables :`);
  for (const x of r.introuvables) dire(`      n° ${x.numero}  entre le ${x.entre} et le ${x.et}`);
}

const xlsx = await classeurFournisseur(r);
const sortie = `C:/dev/guichet/.sorties/Qualite des donnees BVMAC ${r.du} a ${r.au}.xlsx`;
fs.mkdirSync("C:/dev/guichet/.sorties", { recursive: true });
fs.writeFileSync(sortie, xlsx);
dire(`\n${Math.round(xlsx.length / 1024)} Ko\n${sortie}`);
