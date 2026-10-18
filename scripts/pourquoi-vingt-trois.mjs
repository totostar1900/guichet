/**
 * POURQUOI J AI ANNONCE VINGT-TROIS SEANCES, ET POURQUOI IL N Y EN A QU UNE.
 *
 * Le premier classement rangeait chaque seance par un OU EXCLUSIF :
 *
 *   si le rapport imprime colle au carnet ET PAS au servi  → « carnet »
 *   s il colle au servi ET PAS au carnet                   → « servi »
 *   sinon                                                  → « ni l un ni l autre »
 *
 * Le « sinon » attrapait donc deux choses tres differentes : les seances ou
 * le rapport ne colle A RIEN, et celles ou il colle AUX DEUX parce que les
 * soumissions et le servi sont presque egaux sans l etre tout a fait. Les
 * secondes ne sont pas un defaut : ce sont des seances ou la mesure ne peut
 * pas trancher, ce qui est une reponse et non un trou.
 *
 * Un fourre-tout nomme « sinon » finit toujours par melanger l inconnu et
 * l indecidable, et c est l inconnu seul qui merite qu on y retourne.
 *
 *   npx tsx --conditions=react-server scripts/pourquoi-vingt-trois.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const fr = (v, n = 2) => Number(v).toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n });
const TOL = 0.5;

const toutes = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => !r.setAsideAt);
const testables = toutes.filter((r) => r.coverage != null && r.announced != null && Number(r.announced) > 0 && r.bid != null && r.served != null);

const c = { carnet: 0, servi: 0, muette: 0, lesDeux: 0, aucun: 0 };
const aucun = [];
const lesDeux = [];
for (const r of testables) {
  const a = Number(r.announced);
  const parCarnet = (Number(r.bid) / a) * 100;
  const parServi = (Number(r.served) / a) * 100;
  const imp = Number(r.coverage);
  if (Math.abs(parCarnet - parServi) < 0.01) {
    c.muette += 1;
    continue;
  }
  const colleCarnet = Math.abs(imp - parCarnet) <= TOL;
  const colleServi = Math.abs(imp - parServi) <= TOL;
  if (colleCarnet && colleServi) {
    c.lesDeux += 1;
    lesDeux.push({ r, imp, parCarnet, parServi });
  } else if (colleCarnet) c.carnet += 1;
  else if (colleServi) c.servi += 1;
  else {
    c.aucun += 1;
    aucun.push({ r, imp, parCarnet, parServi });
  }
}

dire(`${testables.length} seances verifiables\n`);
dire(`   ${String(c.carnet).padStart(3)} le rapport vaut SOUMISSIONS / annonce, et pas le servi`);
dire(`   ${String(c.servi).padStart(3)} il vaut SERVI / annonce, et pas les soumissions`);
dire(`   ${String(c.muette).padStart(3)} muettes : tout a ete servi, les deux rapports sont le meme nombre`);
dire(`   ${String(c.lesDeux).padStart(3)} INDECIDABLES : il colle aux deux, les montants etant trop proches`);
dire(`   ${String(c.aucun).padStart(3)} INCONNUES : il ne colle a rien`);
dire(`\n   ${c.lesDeux + c.aucun} au total, et c est ce nombre que j avais annonce comme « ni l un ni l autre ».`);
dire(`   Il melangeait l indecidable et l inconnu, et seul le second merite qu on y retourne.`);

dire(`\n=== LES INDECIDABLES, ou l ecart entre les deux lectures est plus petit que la tolerance ===`);
for (const x of lesDeux.slice(0, 12)) {
  dire(`   ${x.r.sessionOn} ${String(x.r.country).padEnd(12)} ${x.r.instrument} · imprime ${fr(x.imp)} % · carnet ${fr(x.parCarnet)} % · servi ${fr(x.parServi)} % · ecart ${fr(Math.abs(x.parCarnet - x.parServi))} point`);
}
if (lesDeux.length > 12) dire(`   … et ${lesDeux.length - 12} autres`);

dire(`\n=== LES INCONNUES ===`);
for (const x of aucun) {
  dire(`   ${x.r.sessionOn} ${String(x.r.country).padEnd(12)} ${x.r.instrument} · imprime ${fr(x.imp)} % · carnet ${fr(x.parCarnet)} % · servi ${fr(x.parServi)} %`);
  dire(`      ${x.r.sourceUrl}`);
}
