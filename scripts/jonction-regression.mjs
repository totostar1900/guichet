/**
 * LES DEUX VERSIONS DU LECTEUR, SUR LE MÊME TEXTE, DANS LE MÊME PROCESSUS.
 *
 * C'est une RÉGRESSION et non une relecture, et la distinction a déjà coûté
 * deux fois : comparer le lecteur à la BASE mesure tout ce qui les sépare, y
 * compris les fautes préexistantes de l'autre lecteur, et noie la seule
 * question posée. Ici on ne veut savoir qu'une chose : ce que LA RÈGLE
 * AJOUTÉE change, et rien d'autre.
 *
 * L'ancienne version est tirée de HEAD dans un fichier voisin, de sorte que
 * les deux lisent exactement les mêmes rangées, extraites une seule fois.
 *
 *   npx tsx --conditions=react-server scripts/jonction-regression.mjs [séances]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const apres = await import("../src/lib/market/boc-geometrie.ts");
const avant = await import("../src/lib/market/.boc-geometrie-avant.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const dire = (s) => fs.writeSync(1, `${s}\n`);

const bulletins = (await repo().listBulletins(3000)).filter((b) => b.fileKey).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
const combien = Number(process.argv[2] ?? bulletins.length);
const pas = Math.max(1, Math.floor(bulletins.length / combien));
const lot = bulletins.filter((_, i) => i % pas === 0).slice(0, combien);

dire(`${lot.length} séance(s) sur ${bulletins.length}, une sur ${pas}\n`);

const empreinte = (o) => `${o.previousDate}|${o.previousPct}|${o.previousFcfa}|${o.nominalRemaining}|${o.accruedCoupon}|${o.status}|${o.open}|${o.close}|${o.thresholdHigh}|${o.thresholdLow}|${o.variationPct}|${o.referenceNextFcfa}`;

let lues = 0;
let gagnees = 0;
let perdues = 0;
let changees = 0;
const details = [];

for (const b of lot) {
  let rangees;
  try {
    /* UNE SEULE EXTRACTION POUR LES DEUX : pdfjs détache le tampon qu'on lui
       donne, et deux appels liraient du vide en silence. C'est aussi la
       condition pour que la comparaison porte sur le lecteur et non sur la
       lecture du PDF. */
    rangees = await apres.rangeesDuPdf(await readSource(b.fileKey));
  } catch {
    continue;
  }
  lues++;
  const a = new Map(avant.obligationsGeometriques(rangees).map((o) => [o.isin, o]));
  const p = new Map(apres.obligationsGeometriques(rangees).map((o) => [o.isin, o]));

  for (const [isin, o] of p) {
    const vieux = a.get(isin);
    if (!vieux) {
      gagnees++;
      if (details.length < 12) details.push(`+ ${b.sessionDate} ${isin}  ${empreinte(o)}`);
    } else if (empreinte(vieux) !== empreinte(o)) {
      changees++;
      details.push(`~ ${b.sessionDate} ${isin}\n      avant ${empreinte(vieux)}\n      après ${empreinte(o)}`);
    }
  }
  for (const isin of a.keys()) {
    if (!p.has(isin)) {
      perdues++;
      details.push(`- ${b.sessionDate} ${isin}  PERDUE`);
    }
  }
  if (lues % 25 === 0) dire(`   ${lues}/${lot.length} · +${gagnees} · -${perdues} · ~${changees}`);
}

dire(`\nséances lues   ${lues}`);
dire(`GAGNÉES        ${gagnees}`);
dire(`PERDUES        ${perdues}`);
dire(`CHANGÉES       ${changees}   (une valeur différente sur une ligne déjà lue : le vrai danger)`);
dire("");
for (const d of details.slice(0, 30)) dire(`   ${d}`);
