/**
 * Le code d'émission porte la durée : troisième témoin, et le meilleur.
 *
 * La BEAC codifie ses lignes. Relevé dans son propre tableau d'encours :
 * GA1200002622 est un 26 semaines, GA1300000955 un 52 semaines, GA2A00000209 un
 * 2 ans, GA2J00000507 un 3 ans, CG2K00000203 un 4 ans. Les deux caractères qui
 * suivent le pays disent l'instrument et la durée.
 *
 * Plutôt que d'écrire cette échelle de mémoire, on la DÉRIVE de nos propres
 * séances relues : chaque préfixe reçoit la durée que la majorité de ses
 * séances lui donne. Puis on retourne la table contre le dépôt et on regarde
 * qui est en minorité contre son propre préfixe.
 *
 * Une durée fausse ne se rattrape nulle part en aval : le point se pose à la
 * mauvaise abscisse et son rendement se calcule sur la mauvaise durée.
 *
 *   npx tsx scripts/code-contre-duree.mjs
 */
import fs from "node:fs";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const rows = (
  await fetch(`${v("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: v("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${v("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).then((r) => r.json())
).map(toAuctionResult);

/** Les deux caractères qui suivent le pays : « 12 », « 2A », « 2J ». */
const prefixe = (code) => {
  if (!code) return undefined;
  const m = String(code).trim().toUpperCase().match(/^[A-Z]{2}([0-9][0-9A-Z])/);
  return m ? m[1] : undefined;
};

/** La durée normalisée, pour comparer « 13 semaines » et « 3 mois ». */
const normaliser = (tenor) => {
  if (!tenor) return undefined;
  const s = String(tenor).toLowerCase();
  const sem = s.match(/(\d{1,3})\s*semaine/);
  if (sem) return `${sem[1]} semaines`;
  const ans = s.match(/(\d{1,2})[,.]?(\d)?\s*an/);
  if (ans) return `${ans[1]}${ans[2] ? `,${ans[2]}` : ""} ans`;
  const mois = s.match(/(\d{1,2})\s*mois/);
  if (mois) return `${mois[1]} mois`;
  return s.trim();
};

/* 1. La table, dérivée de la majorité. */
const parPrefixe = new Map();
for (const r of rows) {
  const p = prefixe(r.codeEmission);
  const d = normaliser(r.tenor);
  if (!p || !d) continue;
  const e = parPrefixe.get(p) ?? new Map();
  e.set(d, (e.get(d) ?? 0) + 1);
  parPrefixe.set(p, e);
}

console.log(`L'ÉCHELLE, DÉRIVÉE DE ${rows.filter((r) => prefixe(r.codeEmission)).length} SÉANCES CODÉES\n`);
const majorite = new Map();
for (const [p, comptes] of [...parPrefixe.entries()].sort()) {
  const tri = [...comptes.entries()].sort((a, b) => b[1] - a[1]);
  majorite.set(p, tri[0][0]);
  const total = tri.reduce((n, x) => n + x[1], 0);
  const autres = tri.slice(1);
  console.log(`   ${p}  ${tri[0][0].padEnd(14)} ${String(tri[0][1]).padStart(3)}/${total}${autres.length ? `   en désaccord : ${autres.map(([d, n]) => `${d} ×${n}`).join(", ")}` : ""}`);
}

/* 2. Les minoritaires, nommés. */
console.log(`\nLES SÉANCES EN DÉSACCORD AVEC LEUR PROPRE PRÉFIXE\n`);
const fautes = [];
for (const r of rows) {
  const p = prefixe(r.codeEmission);
  const d = normaliser(r.tenor);
  if (!p || !d) continue;
  const attendu = majorite.get(p);
  /* Un préfixe vu une seule fois n'a pas de majorité : il ne prouve rien. */
  const total = [...parPrefixe.get(p).values()].reduce((n, x) => n + x, 0);
  if (total < 3 || d === attendu) continue;
  fautes.push({ r, attendu, d });
}
for (const f of fautes)
  console.log(
    `   ${f.r.country.padEnd(11)}${f.r.sessionOn}  ${f.r.instrument}  enregistré « ${f.d.padEnd(12)} » · son préfixe ${prefixe(f.r.codeEmission)} dit « ${f.attendu} »${f.r.confirmedBy ? ` · RELUE par ${f.r.confirmedBy}` : " · en attente"}\n      ${f.r.codeEmission}   ${f.r.sourceUrl?.slice(-80) ?? "—"}`,
  );
console.log(`\n${fautes.length} séance(s) en désaccord avec leur préfixe.`);
console.log(`${rows.filter((r) => !prefixe(r.codeEmission)).length} séance(s) sans code exploitable : ce témoin ne dit rien d'elles.`);
