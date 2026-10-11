/**
 * La famille L : la VL « invraisemblable » est-elle une faute de frappe du
 * bulletin, ou un vrai désordre ?
 *
 * Hypothèse à vérifier : « OPCVM FCP AB AVENIR : VL du 2023-01-05 ignorée »
 * sur la séance du 2024-01-05. Même jour, même mois, une année de moins. Si
 * le motif tient sur les 92 remarques, c'est la source qui se trompe d'année
 * aux premiers jours de janvier, et la règle de réparation est écrite d'avance.
 * Si elle ne tient pas, il ne faut surtout pas corriger à l'aveugle.
 *
 *   npx tsx scripts/vl-invraisemblable.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { classer, enAttente, remarques } = await import("../src/lib/market/remarques.ts");
const { repo } = await import("../src/lib/data/index.ts");

const attente = (await repo().listBulletins(2000)).filter(enAttente);
const cas = [];
for (const b of attente) {
  for (const r of remarques(b)) {
    if (classer(r) !== "L" && r.code !== "L") continue;
    const d = r.texte.match(/VL du (\d{4})-(\d{2})-(\d{2})/);
    if (!d) {
      cas.push({ seance: b.sessionDate, forme: "sans date lisible", texte: r.texte });
      continue;
    }
    const [, an, mois, jour] = d;
    const [sa, sm, sj] = b.sessionDate.split("-");
    const memeJour = mois === sm && jour === sj;
    const ecart = Number(sa) - Number(an);
    cas.push({ seance: b.sessionDate, vl: `${an}-${mois}-${jour}`, memeJour, ecart, texte: r.texte });
  }
}

console.log(`${cas.length} remarques L\n`);
const formes = {};
for (const c of cas) {
  const k = c.forme ?? (c.memeJour && c.ecart === 1 ? "même jour et mois, une année de moins" : c.memeJour ? `même jour et mois, ${c.ecart} an(s) d'écart` : `autre jour (${c.ecart} an(s) d'écart)`);
  (formes[k] ??= []).push(c);
}
for (const [k, l] of Object.entries(formes).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`   ${String(l.length).padStart(3)}  ${k}`);
  for (const c of l.slice(0, 3)) console.log(`        ${c.seance} → ${c.texte.slice(0, 110)}`);
}

/* En quel mois tombent-elles ? Une faute d'année se fait en janvier. */
const mois = {};
for (const c of cas) mois[c.seance.slice(0, 7)] = (mois[c.seance.slice(0, 7)] ?? 0) + 1;
console.log(`\npar mois de séance :`);
for (const [m, n] of Object.entries(mois).sort()) console.log(`   ${m}  ${n}`);
