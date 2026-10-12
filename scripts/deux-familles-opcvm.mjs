/**
 * LES DEUX REMARQUES OPCVM, CHIFFRÉES.
 *
 * Questions de Georges le 12 octobre 2026 :
 *
 *   « OPCVM : ligne ignorée (format inattendu) avant « … » »
 *   « OPCVM <nom> : VL du <date> ignorée (date ou valeur invraisemblable). »
 *
 * La première dit qu'une rangée AVANT celle-ci n'a pas été lue et que ses
 * chiffres sont restés collés devant le nom suivant. La seconde dit qu'une VL
 * a été écartée par l'un de quatre garde-fous, sans dire lequel.
 *
 * Ce script compte les deux sur toute la base, et pour la seconde il départage
 * les quatre causes possibles à partir de ce qu'on peut déduire sans rouvrir
 * le PDF : l'écart entre la date de la VL et celle de la séance.
 *
 *   npx tsx --conditions=react-server scripts/deux-familles-opcvm.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { repo } = await import("../src/lib/data/index.ts");
const r = repo();
const bulletins = await r.listBulletins(2000);

const FORMAT = /^OPCVM : ligne ignorée \(format inattendu\) avant « (.*) »$/;
const VL = /^OPCVM (.+) : VL du (\d{4}-\d{2}-\d{2}) ignorée/;

const jour = 86_400_000;
const parse = (s) => new Date(`${s}T12:00:00`).getTime();

let seancesFormat = 0;
let lignesFormat = 0;
const apres = new Map();

let seancesVl = 0;
let lignesVl = 0;
const causes = { future: 0, tropVieille: 0, autre: 0 };
const fondsVl = new Map();
const exemples = [];

for (const b of bulletins) {
  const w = b.warnings ?? [];
  const f = w.filter((x) => FORMAT.test(x));
  if (f.length) {
    seancesFormat++;
    lignesFormat += f.length;
    for (const x of f) {
      const nom = x.match(FORMAT)[1].slice(0, 38);
      apres.set(nom, (apres.get(nom) ?? 0) + 1);
    }
  }
  const v = w.filter((x) => VL.test(x));
  if (v.length) {
    seancesVl++;
    lignesVl += v.length;
    for (const x of v) {
      const [, nom, date] = x.match(VL);
      fondsVl.set(nom, (fondsVl.get(nom) ?? 0) + 1);
      const ecart = Math.round((parse(date) - parse(b.sessionDate)) / jour);
      /* Les quatre garde-fous : la VL ne doit pas être postérieure de plus de
         sept jours à la séance, ni antérieure de plus de quatre cents, la
         valeur doit être positive, et la VL ne peut pas précéder la naissance
         du fonds. Les deux premiers se déduisent d'ici ; les deux autres
         demandent de rouvrir le document. */
      if (ecart > 7) causes.future++;
      else if (ecart < -400) causes.tropVieille++;
      else causes.autre++;
      if (exemples.length < 12) exemples.push(`${b.sessionDate} · ${nom.slice(0, 30)} · VL ${date} · écart ${ecart > 0 ? "+" : ""}${ecart} j`);
    }
  }
}

console.log(`=== 1. « ligne ignorée (format inattendu) » ===\n`);
console.log(`   ${lignesFormat} remarques sur ${seancesFormat} séances (base de ${bulletins.length})`);
console.log(`   CE QUE CHACUNE COÛTE : une rangée d'OPCVM non lue, donc une VL manquante ce jour-là.\n`);
console.log(`   Les noms qui SUIVENT les débris, par fréquence (le fonds perdu est celui d'AVANT) :`);
for (const [n, c] of [...apres].sort((a, b2) => b2[1] - a[1]).slice(0, 12)) console.log(`      ${String(c).padStart(3)} × ${n}`);

console.log(`\n=== 2. « VL ignorée (date ou valeur invraisemblable) » ===\n`);
console.log(`   ${lignesVl} remarques sur ${seancesVl} séances`);
console.log(`   postérieure de plus de 7 jours à la séance : ${causes.future}`);
console.log(`   antérieure de plus de 400 jours          : ${causes.tropVieille}`);
console.log(`   autre (valeur nulle, ou VL avant la naissance du fonds) : ${causes.autre}`);
console.log(`\n   les fonds les plus touchés :`);
for (const [n, c] of [...fondsVl].sort((a, b2) => b2[1] - a[1]).slice(0, 10)) console.log(`      ${String(c).padStart(3)} × ${n.slice(0, 44)}`);
console.log(`\n   douze exemples :`);
for (const e of exemples) console.log(`      ${e}`);
