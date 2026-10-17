/**
 * LA COURBE PREDIT-ELLE LA PROCHAINE ADJUDICATION, ET A COMBIEN PRES ?
 *
 * C est la mesure qui decide si le robot peut proposer un taux au desk. Si
 * l erreur mediane vaut quelques points de base, la proposition tient et on
 * connait sa precision, donc on peut l afficher honnetement. Si elle en vaut
 * cinquante, le desk fera mieux a l instinct et la fonction ne vaut pas d
 * etre ecrite.
 *
 * EN MARCHE AVANT, SANS QUOI LA MESURE EST CIRCULAIRE. La courbe est batie
 * sur les adjudications : l ajuster sur toutes les seances puis lui demander
 * d en retrouver une reviendrait a lui demander de se souvenir. Pour chaque
 * seance on ne retient donc que ce qui la PRECEDE strictement.
 *
 * DEUX PREDICTEURS COMPARES, parce qu une mesure seule ne dit pas si elle
 * vaut mieux que rien :
 *
 *   LA DERNIERE COMPARABLE : le meme Tresor, la meme duree, la seance d
 *   avant. C est ce que le desk fait aujourd hui de tete.
 *
 *   LA COURBE AJUSTEE : Nelson-Siegel sur les seances du meme Tresor dans
 *   la fenetre, evaluee a la duree de la seance visee. Elle sait repondre
 *   la ou aucune seance comparable n existe, et c est tout son interet.
 *
 *   npx tsx --conditions=react-server scripts/courbe-predit-elle.mjs [fenetre_jours]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const { auctionYield, vieRestante } = await import("../src/lib/market/yield.ts");
const { ajuster, abouti } = await import("../src/lib/market/nelson-siegel.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const fenetre = Number(process.argv[2] ?? 180);
const toutes = (await repo().listAuctionResults({ limit: 2000 })).sort((a, b) => a.sessionOn.localeCompare(b.sessionOn));

const jours = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const pointDe = (r) => {
  const y = auctionYield(r);
  const v = vieRestante(r);
  return y && v && v.years > 0 ? { annees: v.years, pct: y.pct } : null;
};

const essais = [];
for (const [i, cible] of toutes.entries()) {
  const vrai = pointDe(cible);
  if (!vrai) continue;

  const avant = toutes.slice(0, i).filter((x) => x.country === cible.country && jours(x.sessionOn, cible.sessionOn) <= fenetre && x.sessionOn < cible.sessionOn);
  if (!avant.length) continue;

  /* Predicteur A : la derniere seance du meme Tresor ET de la meme duree. */
  const comparable = [...avant].reverse().find((x) => x.tenor === cible.tenor);
  const a = comparable ? pointDe(comparable) : null;

  /* Predicteur B : la courbe ajustee sur tout ce qui precede, du meme Tresor. */
  const obs = avant.map(pointDe).filter(Boolean);
  const fit = obs.length >= 4 ? ajuster(obs) : { refus: "moins de quatre observations" };
  const b = abouti(fit) ? fit.taux(vrai.annees) : null;
  const bande = abouti(fit) ? fit.bande(vrai.annees) : null;

  essais.push({
    pays: cible.country,
    instrument: cible.instrument,
    tenor: cible.tenor,
    seance: cible.sessionOn,
    vrai: vrai.pct,
    errA: a ? Math.round((a.pct - vrai.pct) * 100) : null,
    errB: b != null ? Math.round((b - vrai.pct) * 100) : null,
    bandePb: bande != null ? Math.round(bande * 100) : null,
    refus: abouti(fit) ? null : fit.refus,
  });
}

const med = (xs) => { const t = xs.filter((v) => v != null).sort((a, b) => a - b); return t.length ? (t.length % 2 ? t[(t.length - 1) / 2] : Math.round((t[t.length / 2 - 1] + t[t.length / 2]) / 2)) : null; };
const q = (xs, p) => { const t = xs.filter((v) => v != null).sort((a, b) => a - b); return t.length ? t[Math.min(t.length - 1, Math.floor(t.length * p))] : null; };
const abs = (xs) => xs.filter((v) => v != null).map(Math.abs);

const dit = (nom, xs, dispo, total) => {
  const A = abs(xs);
  dire(
    `   ${nom.padEnd(26)} disponible ${String(dispo).padStart(3)}/${total}` +
      ` · erreur absolue mediane ${String(med(A) ?? "—").padStart(4)} pb` +
      ` · 3e quartile ${String(q(A, 0.75) ?? "—").padStart(4)}` +
      ` · 9e decile ${String(q(A, 0.9) ?? "—").padStart(4)}` +
      ` · biais median ${String(med(xs.filter((v) => v != null)) ?? "—").padStart(5)}`,
  );
};

dire(`${essais.length} seances testees, fenetre de ${fenetre} jours\n`);
dire(`=== TOUTES INSTRUMENTS CONFONDUS ===`);
dit("derniere comparable", essais.map((e) => e.errA), essais.filter((e) => e.errA != null).length, essais.length);
dit("courbe ajustee", essais.map((e) => e.errB), essais.filter((e) => e.errB != null).length, essais.length);

for (const inst of ["BTA", "OTA"]) {
  const d = essais.filter((e) => e.instrument === inst);
  if (!d.length) continue;
  dire(`\n=== ${inst} ===`);
  dit("derniere comparable", d.map((e) => e.errA), d.filter((e) => e.errA != null).length, d.length);
  dit("courbe ajustee", d.map((e) => e.errB), d.filter((e) => e.errB != null).length, d.length);
}

/* LA OU LA COURBE SERT VRAIMENT : quand aucune seance comparable n existe. */
const sansComparable = essais.filter((e) => e.errA == null && e.errB != null);
dire(`\n=== LES CAS OU AUCUNE SEANCE COMPARABLE N EXISTE (${sansComparable.length}) ===`);
dit("courbe ajustee, seule", sansComparable.map((e) => e.errB), sansComparable.length, sansComparable.length);

/* LA BANDE EST-ELLE HONNETE ? Elle promet 95 % : on compte. */
const avecBande = essais.filter((e) => e.errB != null && e.bandePb != null);
const dedans = avecBande.filter((e) => Math.abs(e.errB) <= e.bandePb).length;
dire(`\n=== LA BANDE DE CONFIANCE TIENT-ELLE SA PROMESSE ===`);
dire(`   ${dedans} des ${avecBande.length} erreurs tombent dans la bande a 95 %, soit ${Math.round((100 * dedans) / Math.max(1, avecBande.length))} %`);
dire(`   largeur mediane de la demi-bande : ${med(avecBande.map((e) => e.bandePb))} pb`);

const refus = essais.filter((e) => e.refus);
const parRefus = new Map();
for (const e of refus) parRefus.set(e.refus, (parRefus.get(e.refus) ?? 0) + 1);
dire(`\n=== ${refus.length} AJUSTEMENTS REFUSES ===`);
for (const [k, v] of [...parRefus].sort((a, b) => b[1] - a[1])) dire(`   ${String(v).padStart(4)}  ${k}`);
