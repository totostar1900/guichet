/**
 * CE QUE L OEIL DOIT CHERCHER DANS LES PIECES GABONAISES.
 *
 * Relire les quatre nombres ne tranche rien : ils sont deja dans la base, et
 * ils sont compatibles avec les deux lectures. Ce que l oeil voit et que le
 * lecteur ne voit pas, c est le TEXTE AUTOUR des nombres.
 *
 * Le script sort deux listes.
 *
 * LA PAIRE TEMOIN du 7 fevrier 2024 : le meme jour, le meme Tresor, une
 * seance dont le prix imprime est PROUVE propre et une dont il est PROUVE
 * sale. Si leurs libelles different, on tient un discriminant lisible par
 * machine, et les neuf se tranchent sans oeil humain.
 *
 * LES INDECISES : le prix propre reste dans la fourchette, les deux lectures
 * tiennent, rien dans les nombres ne permet de choisir.
 *
 *   npx tsx --conditions=react-server scripts/gabonaises-a-l-oeil.mjs
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

function dernierCoupon(seance, echeance) {
  const s = new Date(seance + "T00:00:00Z");
  const e = new Date(echeance + "T00:00:00Z");
  const d = new Date(Date.UTC(s.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
  if (d > s) d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.toISOString().slice(0, 10);
}
function couruDe(r) {
  if (r.couponRate == null || !r.maturityOn) return null;
  const dc = dernierCoupon(r.sessionOn, r.maturityOn);
  const j = Math.round((Date.parse(r.sessionOn) - Date.parse(dc)) / 86400000);
  return { couru: (Number(r.couponRate) * j) / 365, jours: j, depuis: dc };
}

const toutes = await repo().listAuctionResults({ limit: 2000 });
const gabon = toutes.filter((r) => r.instrument === "OTA" && r.country === "Gabon");

const fiche = (r, etiquette) => {
  const c = couruDe(r);
  const propre = c ? Number(r.priceAvg) - c.couru : null;
  dire(``);
  dire(`   ${r.sessionOn} · ${r.codeEmission} · ${r.tenor} · coupon ${r.couponRate} % · échéance ${r.maturityOn}${etiquette ? `   [${etiquette}]` : ""}`);
  dire(`      imprimé   min ${fr(r.priceMin, 2)}   limite ${fr(r.priceLimit, 2)}   max ${fr(r.priceMax, 2)}   moyen ${fr(r.priceAvg)}`);
  if (c) dire(`      calculé   couru ${fr(c.couru)} sur ${c.jours} j depuis le ${c.depuis}   →   moyen pied de coupon ${fr(propre)}`);
  dire(`      ${r.sourceUrl ?? "pas d adresse"}`);
};

dire(`=== LA PAIRE TEMOIN DU 7 FEVRIER 2024 ===`);
dire(`   Meme jour, meme Tresor. L une est prouvee propre (son prix pied de`);
dire(`   coupon tomberait SOUS le plus bas servi, donc impossible), l autre`);
dire(`   prouvee sale (son prix imprime depassait le plus haut servi).`);
const paire = gabon.filter((r) => r.sessionOn === "2024-02-07");
for (const r of paire.sort((a, b) => String(a.codeEmission).localeCompare(String(b.codeEmission)))) {
  fiche(r, r.correction?.includes("pied de coupon") ? "PROUVEE SALE, corrigee" : "non corrigee");
}

dire(``);
dire(`=== LES INDECISES ===`);
const indecises = [];
for (const r of gabon) {
  if (r.correction?.includes("pied de coupon")) continue;
  if (r.priceAvg == null || r.priceLimit == null) continue;
  const c = couruDe(r);
  if (!c) continue;
  const propre = Number(r.priceAvg) - c.couru;
  if (propre < Number(r.priceLimit) - 0.05) continue; /* prouvee propre */
  indecises.push(r);
}
for (const r of indecises.sort((a, b) => b.sessionOn.localeCompare(a.sessionOn))) fiche(r);
dire(``);
dire(`   ${indecises.length} seance(s) indecise(s) · ${gabon.length} gabonaises en tout`);
