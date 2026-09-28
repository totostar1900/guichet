/**
 * Faire lire les avis par la route déployée.
 *
 * La clef Anthropic ne vit que sur Vercel, et c'est très bien ainsi : elle n'a
 * rien à faire sur un poste. La lecture se demande donc à la route, qui est de
 * toute façon le chemin réel, celui que le robot empruntera chaque jour. Ce
 * script ne fait que l'appeler par fournées et imprimer ce qu'elle a lu.
 *
 * Le secret est lu du fichier d'environnement et n'est jamais affiché.
 *
 *   node scripts/lire-avis-prod.mjs [fournées] [par fournée]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => (env.match(new RegExp("^" + k + "=(.*)$", "m")) ?? [])[1]?.trim().replace(/^["']|["']$/g, "");
const SECRET = v("CRON_SECRET");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");
if (!SECRET) {
  console.error("CRON_SECRET absent du fichier d'environnement.");
  process.exit(1);
}

const HOTE = process.env.DESK_HOST || "https://desk.purposecapital.africa";
const tours = Number(process.argv[2] ?? 1);
const parTour = Number(process.argv[3] ?? 5);

for (let i = 0; i < tours; i++) {
  const res = await fetch(`${HOTE}/api/cron/lire-adjudications?mode=avis&n=${parTour}`, { headers: { authorization: `Bearer ${SECRET}` } });
  if (!res.ok) {
    console.error(`tour ${i + 1} : ${res.status} ${(await res.text()).slice(0, 200)}`);
    break;
  }
  const j = await res.json();
  console.log(`tour ${i + 1} : ${j.lus} lus · ${j.restants} restants · modèle ${(j.modeles ?? []).join(", ") || "—"}`);
  for (const r of j.ratees ?? []) console.log(`   ✗ ${r.avis} : ${r.raison}`);
  if (!j.lus) break;
}

// Et ce que la base en dit maintenant, en passant par ses propres colonnes.
const lus = await fetch(`${U}/rest/v1/emission_notices?select=country,code_emission,coupon_rate,maturity_on,redemption,nominal_unit,read_at,remarks&read_at=not.is.null&limit=2000`, {
  headers: { apikey: K, Authorization: `Bearer ${K}` },
}).then((r) => r.json());

console.log(`\n${lus.length} avis lus au total`);
if (!lus.length) process.exit(0);

const compte = (f) => lus.filter(f).length;
console.log(`   ${compte((x) => x.code_emission)} portent un code d'émission`);
console.log(`   ${compte((x) => x.coupon_rate != null)} portent un taux facial`);
console.log(`   ${compte((x) => x.maturity_on)} portent une échéance`);
console.log(`   ${compte((x) => x.redemption)} portent une mention de remboursement`);

const mentions = {};
for (const x of lus) if (x.redemption) mentions[x.redemption.trim()] = (mentions[x.redemption.trim()] ?? 0) + 1;
console.log(`\nles mentions de remboursement, telles qu'imprimées :`);
for (const [m, n] of Object.entries(mentions).sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(4)} × « ${m} »`);

const nominaux = {};
for (const x of lus) if (x.nominal_unit != null) nominaux[x.nominal_unit] = (nominaux[x.nominal_unit] ?? 0) + 1;
console.log(`\nles valeurs nominales unitaires :`);
for (const [m, n] of Object.entries(nominaux).sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(4)} × ${Number(m).toLocaleString("fr-FR")} F`);

const avecRemarques = lus.filter((x) => (x.remarks ?? []).length);
if (avecRemarques.length) {
  console.log(`\n${avecRemarques.length} avis portent une remarque :`);
  const toutes = {};
  for (const x of avecRemarques) for (const m of x.remarks) toutes[m] = (toutes[m] ?? 0) + 1;
  for (const [m, n] of Object.entries(toutes).sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`   ${String(n).padStart(4)} × ${m}`);
}
