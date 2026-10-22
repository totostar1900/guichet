/**
 * LES QUATRE CASES DISENT-ELLES CE QUE NOUS CROYONS ?
 *
 * Une adjudication publie quatre nombres, et leur sens impose un ordre.
 *
 *   LE CARNET. « Minimum propose » et « maximum propose » bornent les
 *   soumissions RECUES, rejetees comprises.
 *
 *   LA COUPURE. Le « limite » est la derniere offre acceptee. En prix, le
 *   Tresor sert du plus haut en descendant, donc le limite est le PLUS BAS
 *   SERVI. En taux, il sert du plus bas en remontant, donc le limite est le
 *   PLUS HAUT SERVI.
 *
 *   LA MOYENNE. Elle ne porte que sur le SERVI, ponderee par les montants
 *   attribues. Les offres rejetees n y entrent pas.
 *
 * D ou deux inegalites qui doivent tenir sur chaque seance.
 *
 *   EN PRIX    minimum ≤ limite ≤ moyen ≤ maximum
 *   EN TAUX    minimum ≤ moyen ≤ limite ≤ maximum
 *
 * Noter que l ordre du moyen et du limite S INVERSE entre les deux : c est
 * la meme regle vue des deux cotes, et c est exactement le genre d endroit
 * ou une lecture se trompe sans bruit.
 *
 * LA QUEUE, enfin : l ecart entre le moyen et le limite. Les places
 * occidentales la lisent comme la mesure de la qualite de la demande. Une
 * queue large dit que le Tresor est alle chercher loin pour se servir.
 *
 *   npx tsx --conditions=react-server scripts/les-quatre-cases.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const fr = (v, n = 3) => (v == null ? "—" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n }));
const mediane = (xs) => {
  if (!xs.length) return null;
  const t = [...xs].sort((a, b) => a - b);
  const i = Math.floor(t.length / 2);
  return t.length % 2 ? t[i] : (t[i - 1] + t[i]) / 2;
};

const EPS = 0.001;
const toutes = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => !r.setAsideAt);

const ruptures = [];
const queues = new Map();
let testees = 0;

for (const r of toutes) {
  const enPrix = r.priceLimit != null && r.priceAvg != null;
  const enTaux = r.rateLimit != null && r.rateAvg != null;
  if (!enPrix && !enTaux) continue;
  testees += 1;

  const [limite, moyen, bas, haut] = enPrix
    ? [Number(r.priceLimit), Number(r.priceAvg), r.priceMin != null ? Number(r.priceMin) : null, r.priceMax != null ? Number(r.priceMax) : null]
    : [Number(r.rateLimit), Number(r.rateAvg), r.rateMin != null ? Number(r.rateMin) : null, r.rateMax != null ? Number(r.rateMax) : null];

  /* La queue est toujours comptee dans le sens qui la rend positive quand
     tout va bien : en prix le moyen est au-dessus du limite, en taux
     au-dessous. Une queue negative est une rupture, pas une queue. */
  const queue = enPrix ? moyen - limite : limite - moyen;
  const k = `${r.country}|${r.instrument}`;
  queues.set(k, [...(queues.get(k) ?? []), queue]);

  const dits = [];
  if (queue < -EPS) dits.push(enPrix ? "moyen SOUS le limite" : "moyen AU-DESSUS du limite");
  if (haut != null && bas != null) {
    const vraiHaut = Math.max(bas, haut);
    const vraiBas = Math.min(bas, haut);
    if (limite > vraiHaut + EPS || limite < vraiBas - EPS) dits.push("limite hors du carnet");
    if (moyen > vraiHaut + EPS || moyen < vraiBas - EPS) dits.push("moyen hors du carnet");
  }
  if (dits.length) ruptures.push({ r, enPrix, limite, moyen, bas, haut, queue, dits });
}

dire(`${testees} seances portant le limite ET le moyen\n`);
dire(`=== ${ruptures.length} SEANCE(S) OU L ORDRE NE TIENT PAS ===`);
for (const x of ruptures.sort((a, b) => a.r.sessionOn.localeCompare(b.r.sessionOn))) {
  dire(
    `   ${x.r.sessionOn} ${String(x.r.country).padEnd(12)} ${x.r.instrument} ${String(x.r.codeEmission ?? "—").padEnd(14)} ` +
      `min ${fr(x.bas, 2)} · limite ${fr(x.limite, 2)} · moyen ${fr(x.moyen)} · max ${fr(x.haut, 2)}   ${x.dits.join(" ; ")}`,
  );
}

dire(`\n=== LA QUEUE, PAR PAYS ET PAR INSTRUMENT ===`);
dire(`   ${"pays".padEnd(13)} ${"instr".padEnd(5)} ${"n".padStart(4)} ${"mediane".padStart(9)} ${"90e cent.".padStart(10)} ${"max".padStart(9)}  unite`);
for (const [k, qs] of [...queues].sort()) {
  const [pays, instr] = k.split("|");
  const t = [...qs].sort((a, b) => a - b);
  const unite = instr === "BTA" ? "points de taux" : "points de prix";
  dire(
    `   ${pays.padEnd(13)} ${instr.padEnd(5)} ${String(qs.length).padStart(4)} ${fr(mediane(t)).padStart(9)} ${fr(t[Math.floor(t.length * 0.9)]).padStart(10)} ${fr(t.at(-1)).padStart(9)}  ${unite}`,
  );
}
