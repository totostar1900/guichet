/**
 * LES DIX-NEUF GABONAISES : SUSPECT DE QUOI, EXACTEMENT ?
 *
 * « Suspect » tout seul ne vaut rien. L hypothese du prix sale se TESTE
 * ligne a ligne, meme quand elle ne se prouve pas, et elle se teste par ce
 * qu elle EXCLUT.
 *
 * Un prix moyen pondere est la moyenne des prix SERVIS, qui vont du limite
 * au maximum. Il est donc necessairement dans [limite, max]. Si le prix
 * imprime est sale, le prix propre vaut imprime moins le coupon couru, et
 * ce prix propre doit LUI AUSSI tomber dans [limite, max].
 *
 * Trois verdicts possibles pour chaque seance :
 *
 *   IMPOSSIBLE  le prix propre tomberait sous le limite : l hypothese est
 *               refutee pour cette ligne, le prix imprime est bien propre.
 *
 *   POSSIBLE    le prix propre reste dans la fourchette : les deux lectures
 *               se tiennent, et rien dans la piece ne permet de choisir.
 *
 *   APPUYEE     le prix propre tombe sur le limite a un dixieme pres, ce
 *               qui est la forme qu avaient les onze prouvees : tout servi
 *               au meme prix, et le couru explique tout l ecart.
 *
 * Compter les trois dit enfin de QUOI ces lignes sont suspectes.
 *
 *   npx tsx --conditions=react-server scripts/gabonaises-suspectes.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const fr = (v) => (v == null ? "—" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

function dernierCoupon(seance, echeance) {
  const s = new Date(seance + "T00:00:00Z");
  const e = new Date(echeance + "T00:00:00Z");
  const d = new Date(Date.UTC(s.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
  if (d > s) d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

const toutes = await repo().listAuctionResults({ limit: 2000 });
const gabon = toutes.filter(
  (r) => r.instrument === "OTA" && r.country === "Gabon" && r.priceAvg != null && r.priceLimit != null && !r.correction?.includes("pied de coupon"),
);

dire(`${gabon.length} obligations gabonaises non corrigees\n`);
dire(`   ${"seance".padEnd(11)} ${"code".padEnd(14)} ${"moyen".padStart(7)} ${"limite".padStart(7)} ${"max".padStart(7)} ${"couru".padStart(6)} ${"propre".padStart(7)}  verdict`);

const compte = { impossible: 0, possible: 0, appuyee: 0, indecidable: 0 };
for (const r of gabon.sort((a, b) => b.sessionOn.localeCompare(a.sessionOn))) {
  if (r.couponRate == null || !r.maturityOn) {
    compte.indecidable += 1;
    dire(`   ${r.sessionOn}  ${String(r.codeEmission ?? "—").padEnd(14)} ${fr(r.priceAvg).padStart(7)} ${fr(r.priceLimit).padStart(7)} ${fr(r.priceMax).padStart(7)} ${"—".padStart(6)} ${"—".padStart(7)}  indecidable, ni coupon ni echeance`);
    continue;
  }
  const dc = dernierCoupon(r.sessionOn, r.maturityOn);
  const jours = Math.round((Date.parse(r.sessionOn) - Date.parse(dc)) / 86400000);
  const couru = (Number(r.couponRate) * jours) / 365;
  const propre = Number(r.priceAvg) - couru;

  let verdict;
  if (propre < Number(r.priceLimit) - 0.05) { verdict = "IMPOSSIBLE, le propre passerait sous le limite"; compte.impossible += 1; }
  else if (Math.abs(propre - Number(r.priceLimit)) <= 0.10) { verdict = "APPUYEE, le propre tombe sur le limite"; compte.appuyee += 1; }
  else { verdict = "possible, les deux lectures tiennent"; compte.possible += 1; }

  dire(
    `   ${r.sessionOn}  ${String(r.codeEmission ?? "—").padEnd(14)} ${fr(r.priceAvg).padStart(7)} ${fr(r.priceLimit).padStart(7)} ${fr(r.priceMax).padStart(7)} ${fr(couru).padStart(6)} ${fr(propre).padStart(7)}  ${verdict}`,
  );
}

dire(`\n=== ${compte.impossible} IMPOSSIBLE(S) · ${compte.appuyee} APPUYEE(S) · ${compte.possible} possible(s) · ${compte.indecidable} indecidable(s) ===`);
dire(`\n   « Impossible » veut dire que l hypothese est REFUTEE pour cette ligne : son prix imprime`);
dire(`   est bien pied de coupon, comme chez les autres Tresors. C est la seule categorie sur`);
dire(`   laquelle on sait quelque chose de sur, et c est une bonne nouvelle : la convention`);
dire(`   gabonaise n est pas systematique.`);
