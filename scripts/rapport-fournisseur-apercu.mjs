/**
 * CE QUE LE RAPPORT AU FOURNISSEUR CONTIENDRAIT, AVANT DE L'ENVOYER.
 *
 * Le document existe, la route du desk le produit en PDF et en classeur, et
 * il met en cause la publication d'un tiers. On ne signe pas un courrier
 * sans en connaître le contenu : ce script le chiffre sans rien produire.
 *
 * Il ne remplace pas le document, il décide si on le sort.
 *
 *   npx tsx --conditions=react-server scripts/rapport-fournisseur-apercu.mjs [du] [au]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { construireRapport } = await import("../src/lib/market/rapport-fournisseur.ts");
const { repo } = await import("../src/lib/data/index.ts");

const dire = (s) => fs.writeSync(1, `${s}\n`);

const bulletins = await repo().listBulletins(3000);
const dates = bulletins.map((b) => b.sessionDate).sort();
const du = process.argv[2] ?? dates[0];
const au = process.argv[3] ?? dates[dates.length - 1];

const r = construireRapport(bulletins, du, au);

dire(`=== RAPPORT AU FOURNISSEUR · ${r.du} → ${r.au} ===\n`);
dire(`   ${r.seances} séances, dont ${r.seancesSansRemarque} sans la moindre remarque`);
dire(`   ${r.remarques} remarques au total\n`);

dire(`   PAR SORT DE LA DONNÉE`);
for (const s of r.parSort) dire(`      ${String(s.remarques).padStart(5)} remarque(s) sur ${String(s.seances).padStart(4)} séance(s)  ${s.libelle}`);

dire(`\n   PAR FAMILLE`);
for (const f of r.parFamille) dire(`      ${String(f.remarques).padStart(5)} sur ${String(f.seances).padStart(4)} séance(s)  ${f.code}  ${f.libelle}  → ${f.devenu}`);

dire(`\n   LES QUATRE SECTIONS DU DOCUMENT`);
for (const [nom, xs] of [
  ["corrections, ce que nous avons réparé", r.corrections],
  ["écartées, ce qui manque chez nous", r.ecartees],
  ["perdues, ce que nous n'avons pas su lire", r.perdues],
  ["publication, les chiffres publiés eux-mêmes faux", r.publication],
]) {
  dire(`      ${String(xs.length).padStart(5)}  ${nom}`);
}

/* LA SECTION QUI DÉCIDE DE L'ENVOI. Les trois premières parlent de nous ;
   celle-ci parle d'eux, et c'est la seule qu'un tiers doit corriger. */
dire(`\n   CE QUI RELÈVE DE LEUR PUBLICATION, EN DÉTAIL`);
if (!r.publication.length) dire(`      (aucune)`);
for (const l of r.publication.slice(0, 40)) {
  dire(`      ${l.seance}  ${l.objet}`);
  dire(`         imprimé  : ${(l.imprime || l.message).slice(0, 170)}`);
  dire(`         devenu   : ${l.devenu}${l.retenu ? ` → ${l.retenu}` : ""}`);
}
if (r.publication.length > 40) dire(`      … et ${r.publication.length - 40} autres`);
