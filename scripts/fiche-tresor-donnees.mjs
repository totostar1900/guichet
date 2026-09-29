/**
 * Tout ce qu'une fiche par Trésor porterait, à chaque date et sur les deux mesures.
 *
 * Une maquette qui invente ses chiffres ne se juge pas : on croit lire un écran
 * alors qu'on lit une mise en page. Celle-ci sort des vrais nombres, y compris
 * pour les Trésors qui n'ont pas de courbe, dont la fiche est le cas qui décide
 * de la forme.
 *
 * Deux réglages restent au lecteur parce qu'ils changent la question posée et
 * non la façon d'y répondre : la date d'observation, car « que paie ce Trésor »
 * n'a de sens qu'à une date, et le choix entre rendement actuariel et taux
 * zéro-coupon, car c'est le second qui sert à valoriser. On les précalcule donc
 * tous les deux, pour les sept ancres.
 *
 *   npx tsx scripts/fiche-tresor-donnees.mjs > fiches.json
 */
import fs from "node:fs";
import { buildCurve, horizon } from "../src/lib/market/curve.ts";
import { derniereParDuree, poids } from "../src/lib/market/lecture-b.ts";
import { depouiller } from "../src/lib/market/zero-coupon.ts";
import { abouti, ajuster, tauxCourt } from "../src/lib/market/nelson-siegel.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";
import { BEAC_COURBE } from "../src/data/beac-courbe.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const rows = (
  await fetch(`${v("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: v("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${v("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).then((r) => r.json())
).map(toAuctionResult);

const aujourdHui = new Date().toISOString().slice(0, 10);
const recul = (mois) => {
  const d = new Date(aujourdHui);
  d.setMonth(d.getMonth() - mois);
  return d.toISOString().slice(0, 10);
};
const ANCRES = [
  { cle: "aujourdhui", mot: "Aujourd'hui", le: aujourdHui },
  { cle: "m3", mot: "il y a 3 mois", le: recul(3) },
  { cle: "m6", mot: "il y a 6 mois", le: recul(6) },
  { cle: "a1", mot: "il y a 1 an", le: recul(12) },
  { cle: "a2", mot: "il y a 2 ans", le: recul(24) },
  { cle: "a3", mot: "il y a 3 ans", le: recul(36) },
  { cle: "a5", mot: "il y a 5 ans", le: recul(60) },
];
const USUELS = [0.25, 0.5, 1, 2, 3, 5, 7, 10];
const FENETRES = [
  [365, 90],
  [730, 180],
  [1825, 365],
];
const r2 = (x) => Number(x.toFixed(2));
const mot = (y) => {
  const h = horizon(y);
  return `${h.n} ${h.unit}`;
};

/** Une vue : la fenêtre la plus courte qui aboutit, sur la mesure demandée. */
const vue = (pays, on, zeroCoupon) => {
  let dernier = null;
  for (const [jours, demiVie] of FENETRES) {
    const p = buildCurve(rows, { on, windowDays: jours }).countries.find((x) => x.country === pays);
    if (!p) continue;
    const gardes = derniereParDuree(
      p.points.map((q) => ({ mot: mot(q.years), age: q.ageDays, annees: q.years, pct: q.yield.pct, coupon: q.from.couponRate ?? 0, mince: q.thin, on: q.from.sessionOn })),
    );
    const spots = zeroCoupon ? new Map(depouiller(gardes.map((q) => ({ annees: q.annees, ytmPct: q.pct, couponPct: q.coupon }))).map((s) => [s.annees, s])) : undefined;
    const points = gardes
      .map((q) => {
        const s = spots?.get(q.annees);
        return { mot: q.mot, annees: Number(q.annees.toFixed(3)), pct: r2(s ? s.spotPct : q.pct), ecartPb: s?.ecartPb ?? 0, age: q.age, on: q.on, mince: Boolean(q.mince) };
      })
      .sort((a, b) => a.annees - b.annees);
    const f = ajuster(points.map((q) => ({ annees: q.annees, pct: q.pct, poids: poids({ age: q.age, mince: q.mince }, { demiVieJours: demiVie, minces: "sous-ponderer" }) })));
    dernier = { fenetreJours: jours, demiVie, points, refus: abouti(f) ? null : f.refus };
    if (!abouti(f)) continue;
    return {
      fenetreJours: jours,
      demiVie,
      points,
      refus: null,
      fit: {
        b0: r2(f.b0), b1: r2(f.b1), b2: r2(f.b2), lambda: r2(f.lambda), court: r2(tauxCourt(f)), rmsePb: Math.round(f.rmsePb),
        borne: { court: Number(f.borne.court.toFixed(3)), long: Number(f.borne.long.toFixed(3)) },
        usuels: USUELS.map((u) => ({ annees: u, mot: mot(u), pct: r2(f.taux(u)), bandePb: Math.round(f.bande(u) * 100), hors: u < f.borne.court || u > f.borne.long })),
        courbe: Array.from({ length: 40 }, (_, i) => {
          const a = Math.exp(Math.log(0.08) + ((Math.log(15) - Math.log(0.08)) * i) / 39);
          return { a: Number(a.toFixed(3)), y: Number(f.taux(a).toFixed(2)) };
        }),
      },
    };
  }
  return dernier ?? { fenetreJours: 1825, demiVie: 365, points: [], refus: "aucune séance relue" };
};

const PAYS = ["Cameroun", "Congo", "Gabon", "Tchad", "RCA", "Guinée éq."];
const attente = rows.filter((x) => !x.confirmedBy);

console.log(
  JSON.stringify({
    arreteLe: aujourdHui,
    ancres: ANCRES,
    beac: { numero: BEAC_COURBE.numero, mois: BEAC_COURBE.arreteLe.slice(0, 7), source: BEAC_COURBE.source, pays: BEAC_COURBE.pays },
    tresors: PAYS.map((pays) => {
      const siennes = rows.filter((x) => x.country === pays);
      const relues = siennes.filter((x) => x.confirmedBy);
      const derniere = [...relues].sort((a, b) => b.sessionOn.localeCompare(a.sessionOn))[0];
      const vues = {};
      for (const a of ANCRES) vues[a.cle] = { ytm: vue(pays, a.le, false), zc: vue(pays, a.le, true) };
      return { pays, seances: siennes.length, relues: relues.length, enAttente: attente.filter((x) => x.country === pays).length, derniereSeance: derniere?.sessionOn ?? null, vues };
    }),
  }),
);
