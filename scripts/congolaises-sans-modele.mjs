/**
 * LES TRENTE-QUATRE CONGOLAISES QUI N ONT JAMAIS VU L EXTRACTEUR.
 *
 * Trente-quatre des trente-cinq seances congolaises portent un
 * « readModel » vide : elles ont ete remplies autrement, a la main ou par
 * une passe anterieure qui n estampillait pas le modele. Leur nombre de
 * champs remplis est normal, donc elles ne sont pas pauvres ; mais
 * personne ne sait ce qu une lecture y trouverait de plus.
 *
 * DEUX QUESTIONS AVANT DE DEPENSER :
 *
 *   QUE LEUR MANQUE-T-IL, champ par champ ? Un champ vide partout est un
 *   champ que la piece congolaise n imprime pas, et relire n y changera
 *   rien. Un champ vide par endroits est un champ a aller chercher.
 *
 *   COMBIEN SONT LISIBLES SANS MODELE ? Une piece qui porte une couche de
 *   texte se relit pour rien. Ce sont celles-la qu il faut faire d abord,
 *   et elles diront si la relecture rend quelque chose avant qu on paie
 *   pour les autres.
 *
 *   npx tsx --conditions=react-server scripts/congolaises-sans-modele.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
async function texteDe(bytes) {
  const doc = await pdfjs.getDocument({ data: bytes, useSystemFonts: true, isEvalSupported: false }).promise;
  let out = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    out += (await page.getTextContent()).items.map((i) => i.str).join(" ") + "\n";
  }
  await doc.destroy();
  return out;
}

const CHAMPS = [
  ["codeEmission", (r) => r.codeEmission],
  ["maturityOn", (r) => r.maturityOn],
  ["couponRate", (r) => r.couponRate],
  ["announced", (r) => r.announced],
  ["bid", (r) => r.bid],
  ["served", (r) => r.served],
  ["coverage", (r) => r.coverage],
  ["bidders", (r) => r.bidders],
  ["networkSize", (r) => r.networkSize],
  ["rateMin", (r) => r.rateMin],
  ["rateMax", (r) => r.rateMax],
  ["rateLimit", (r) => r.rateLimit],
  ["rateAvg", (r) => r.rateAvg],
  ["priceMin", (r) => r.priceMin],
  ["priceMax", (r) => r.priceMax],
  ["priceLimit", (r) => r.priceLimit],
  ["priceAvg", (r) => r.priceAvg],
  ["yieldAvg", (r) => r.yieldAvg],
];

const toutes = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => r.country === "Congo" && !r.setAsideAt);
const sans = toutes.filter((r) => !r.readModel).sort((a, b) => a.sessionOn.localeCompare(b.sessionOn));
const avec = toutes.filter((r) => r.readModel);
dire(`${toutes.length} seances congolaises · ${sans.length} sans modele · ${avec.length} avec\n`);

dire(`=== CE QUI MANQUE, CHAMP PAR CHAMP ===`);
dire(`   ${"champ".padEnd(14)} ${"BTA sans".padStart(9)} ${"OTA sans".padStart(9)}   (vide sur combien)`);
const bta = sans.filter((r) => r.instrument === "BTA");
const ota = sans.filter((r) => r.instrument === "OTA");
for (const [nom, lit] of CHAMPS) {
  const vb = bta.filter((r) => lit(r) == null).length;
  const vo = ota.filter((r) => lit(r) == null).length;
  if (vb === 0 && vo === 0) continue;
  const note = vb === bta.length && vo === ota.length ? "  vide PARTOUT : la pièce ne l'imprime sans doute pas" : "";
  dire(`   ${nom.padEnd(14)} ${`${vb}/${bta.length}`.padStart(9)} ${`${vo}/${ota.length}`.padStart(9)}${note}`);
}

dire(`\n=== COMBIEN SE RELISENT SANS MODELE ? ===`);
let texte = 0;
let muettes = 0;
const lisibles = [];
for (const r of sans) {
  if (!r.fileKey) {
    muettes += 1;
    continue;
  }
  try {
    const t = await texteDe(await readSource(r.fileKey));
    const n = t.replace(/\s+/g, "").length;
    if (n >= 200) {
      texte += 1;
      lisibles.push({ r, n });
    } else muettes += 1;
  } catch {
    muettes += 1;
  }
}
dire(`   ${texte} avec une couche de texte · ${muettes} scans muets`);
for (const x of lisibles) dire(`      ${x.r.sessionOn} ${x.r.instrument} ${String(x.r.tenor).padEnd(12)} ${x.n} caracteres`);

dire(`\n=== CE QUE LES SEANCES AVEC MODELE PORTENT EN PLUS ===`);
for (const [nom, lit] of CHAMPS) {
  const pa = avec.length ? avec.filter((r) => lit(r) != null).length / avec.length : 0;
  const ps = sans.length ? sans.filter((r) => lit(r) != null).length / sans.length : 0;
  if (Math.abs(pa - ps) < 0.2) continue;
  dire(`   ${nom.padEnd(14)} avec modele ${Math.round(pa * 100)} % · sans modele ${Math.round(ps * 100)} %`);
}
dire(`\n   Un champ nettement plus rempli chez celles qui ont vu l extracteur est`);
dire(`   ce qu une relecture irait chercher. Les autres ne rendraient rien.`);
