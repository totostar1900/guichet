/**
 * LES DONNEES DE LA MAQUETTE « MOYEN OU LIMITE ».
 *
 * Une maquette qui ment sur ses nombres ne sert a rien : on la regarde, on
 * la trouve lisible, et le jour ou les vrais chiffres arrivent la
 * disposition ne tient plus. Celle-ci sort donc de la base.
 *
 *   npx tsx --conditions=react-server scripts/maquette-donnees-lecture-courbe.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const { auctionYield, vieRestante } = await import("../src/lib/market/yield.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

/** La lecture « limite » : on retire au calcul la case du moyen, rien d autre. */
const auLimite = (r) => ({ ...r, priceAvg: undefined, priceAvgFcfa: undefined, rateAvg: undefined, yieldAvg: undefined });
const mediane = (xs) => {
  if (!xs.length) return null;
  const t = [...xs].sort((a, b) => a - b);
  const i = Math.floor(t.length / 2);
  return t.length % 2 ? t[i] : (t[i - 1] + t[i]) / 2;
};

const toutes = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => !r.setAsideAt);

const points = [];
for (const r of toutes) {
  const v = vieRestante(r);
  const a = auctionYield(r, "guichet");
  const b = auctionYield(auLimite(r), "guichet");
  if (v == null) continue;

  /* LA QUEUE, dans l unite de l instrument, toujours comptee pour etre
     positive quand tout va bien : en prix le moyen est au-dessus du limite,
     en taux au-dessous. */
  const [limite, moyen] =
    r.instrument === "BTA" ? [r.rateLimit, r.rateAvg] : [r.priceLimit, r.priceAvg];
  const queue = limite != null && moyen != null ? (r.instrument === "BTA" ? Number(limite) - Number(moyen) : Number(moyen) - Number(limite)) : null;

  points.push({
    pays: r.country,
    instrument: r.instrument,
    seance: r.sessionOn,
    tenor: r.tenor,
    code: r.codeEmission ?? null,
    annees: Math.round(v.years * 1000) / 1000,
    origineDuree: v.from,
    moyen: a ? Math.round(a.pct * 1000) / 1000 : null,
    limite: b ? Math.round(b.pct * 1000) / 1000 : null,
    ecartPb: a && b ? Math.round((b.pct - a.pct) * 100) : null,
    queue: queue != null ? Math.round(queue * 1000) / 1000 : null,
    hypotheses: (a?.assumptions ?? []).map((h) => h.key.replace(/\{(\w+)\}/g, (_, k) => String(h.params?.[k] ?? `{${k}}`))),
    sansRendement: !a,
  });
}

/* LES RESUMES, calcules ici pour que la page n ait rien a recalculer. */
const parGroupe = new Map();
for (const p of points) {
  const k = `${p.pays}|${p.instrument}`;
  const g = parGroupe.get(k) ?? { pays: p.pays, instrument: p.instrument, n: 0, queues: [], ecarts: [] };
  g.n += 1;
  if (p.queue != null) g.queues.push(p.queue);
  if (p.ecartPb != null) g.ecarts.push(Math.abs(p.ecartPb));
  parGroupe.set(k, g);
}
const resume = [...parGroupe.values()].map((g) => {
  const q = [...g.queues].sort((a, b) => a - b);
  const e = [...g.ecarts].sort((a, b) => a - b);
  return {
    pays: g.pays,
    instrument: g.instrument,
    n: g.n,
    nQueue: q.length,
    queueMediane: mediane(q),
    queue90: q.length ? q[Math.min(q.length - 1, Math.floor(q.length * 0.9))] : null,
    queueMax: q.at(-1) ?? null,
    ecartMedian: mediane(e),
    ecartMax: e.at(-1) ?? null,
  };
});

const sortie = {
  produitLe: new Date().toISOString().slice(0, 10),
  seances: toutes.length,
  avecRendement: points.filter((p) => !p.sansRendement).length,
  points: points.sort((a, b) => a.seance.localeCompare(b.seance)),
  resume: resume.sort((a, b) => (a.pays + a.instrument).localeCompare(b.pays + b.instrument)),
};

fs.writeFileSync("C:/dev/guichet/public/maquette/lecture-courbe-donnees.js", `window.DONNEES = ${JSON.stringify(sortie, null, 1)};\n`, "utf8");
dire(`${sortie.points.length} points ecrits · ${sortie.avecRendement} avec rendement sur ${sortie.seances} seances`);
dire(`${sortie.resume.length} groupes pays/instrument`);
for (const g of sortie.resume) {
  dire(`   ${g.pays.padEnd(13)} ${g.instrument}  n=${String(g.n).padStart(3)}  queue mediane ${g.queueMediane ?? "—"}  ecart median ${g.ecartMedian ?? "—"} pb`);
}
