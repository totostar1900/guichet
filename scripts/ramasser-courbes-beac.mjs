/**
 * RAMASSER CHAQUE MOIS LES COURBES DE RENDEMENT QUE LA BEAC PUBLIE.
 *
 * La BEAC publie une feuille par Trésor et par mois sur
 * https://www.beac.int/economie-stats/statistiques-titres-publics/ — Cameroun,
 * Congo, Gabon (le Tchad seulement en 2016-2017) — et une feuille de zone. Elle
 * ne publie rien pour la Centrafrique ni la Guinée équatoriale. Ce script lit la
 * page, repère les couples (Trésor, mois) absents de `beac_yield_curves`, lit
 * leurs PDF et n'écrit QUE ceux-là.
 *
 * TROIS RÈGLES, héritées de `lire-courbes-beac.mjs` :
 *   1. On ne lit que ce qui se lit. Un scan (pas d'échelle verticale) est compté,
 *      jamais deviné : un point relevé à l'œil serait une précision inventée.
 *   2. On n'écrase rien. Un mois déjà en base n'est pas relu : une lecture plus
 *      riche faite hier vaut mieux qu'une plus pauvre faite aujourd'hui.
 *   3. Un taux hors de [1 %, 20 %] est une échelle mal posée, pas un marché : la
 *      feuille est écartée et nommée.
 *
 * Chaque point cite sa feuille (adresse de la BEAC) et dit qu'elle n'est pas encore
 * rangée dans la bibliothèque : le PDF est gardé dans le dossier de cache, à
 * verser à la bibliothèque à la main.
 *
 *   npx tsx scripts/ramasser-courbes-beac.mjs                  simulation (rien n'est écrit)
 *   npx tsx scripts/ramasser-courbes-beac.mjs --ecrire         écrit les mois manquants
 *   options : --cache <dossier>   où garder les PDF (défaut : ./.cache-beac-courbes)
 *             --depuis AAAA-MM    ignorer les feuilles plus anciennes
 *
 * Sans `.env.local` (donc sans base), la simulation liste et lit tout, comme si rien
 * n'était en base.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const arg = (n) => {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const ecrire = process.argv.includes("--ecrire");
const depuis = arg("--depuis");
const cache = path.resolve(arg("--cache") ?? ".cache-beac-courbes");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const PAGE = "https://www.beac.int/economie-stats/statistiques-titres-publics/";
const UA = "Mozilla/5.0 (compatible; Guichet/1.0; +https://guichet.purposecapital.africa)";

try {
  const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const l of env.split(/\r?\n/)) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* pas de .env.local : simulation sans base */
}

const { feuillesDeLaPage, planDuRamassage, cleDeFeuille } = await import("../src/lib/market/beac-courbes-page.ts");
const { courbesDuPdf } = await import("../src/lib/market/courbe-beac.ts");

/* 1. La page. */
const rep = await fetch(PAGE, { headers: { "user-agent": UA } });
if (!rep.ok) throw new Error(`La page des courbes répond ${rep.status}`);
const publiees = feuillesDeLaPage(await rep.text()).filter((f) => !depuis || !f.mois || f.mois >= depuis);
dire(`${publiees.length} feuille(s) publiée(s) : ${[...new Set(publiees.map((f) => f.pays))].sort().join(", ")}`);

/* 2. Ce qui est déjà en base. */
let sb = null;
const enBase = new Set();
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const { createClient } = await import("@supabase/supabase-js");
  sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from("beac_yield_curves").select("pays, mois").range(de, de + 999);
    if (error) throw new Error(`Lecture de beac_yield_curves : ${error.message}`);
    for (const x of data ?? []) enBase.add(cleDeFeuille(x.pays, String(x.mois).slice(0, 7)));
    if ((data ?? []).length < 1000) break;
  }
  dire(`${enBase.size} couple(s) (Trésor, mois) déjà en base`);
} else {
  dire("pas de base (pas de .env.local) : simulation, tout est « à lire »");
}

const plan = planDuRamassage(publiees, enBase);
dire(`\nà lire ${plan.aLire.length} · déjà en base ${plan.dejaEnBase.length} · feuilles de zone laissées ${plan.deZone.length} · sans mois ${plan.sansMois.length}`);
for (const f of plan.sansMois) dire(`   SANS MOIS  ${f.titre.slice(0, 70)}`);

/* 3. Lecture : téléchargement poli, puis le lecteur de la maison. */
fs.mkdirSync(cache, { recursive: true });
const lignes = [];
const scans = [];
const hors = [];
for (const f of plan.aLire) {
  const fichier = path.join(cache, `${crypto.createHash("md5").update(f.url).digest("hex").slice(0, 8)}_${f.url.split("/").pop().replace(/[^A-Za-z0-9._-]/g, "_")}`);
  if (!fs.existsSync(fichier) || fs.statSync(fichier).size < 1000) {
    const r = await fetch(f.url, { headers: { "user-agent": UA } });
    if (!r.ok) {
      dire(`   ÉCHEC ${r.status}  ${f.titre.slice(0, 60)}`);
      continue;
    }
    fs.writeFileSync(fichier, Buffer.from(await r.arrayBuffer()));
    await new Promise((ok) => setTimeout(ok, 400));
  }
  let c;
  try {
    c = await courbesDuPdf(new Uint8Array(fs.readFileSync(fichier)), f.titre);
  } catch (e) {
    scans.push([f, `plantée : ${String(e.message).slice(0, 60)}`]);
    continue;
  }
  const pts = c.points.filter((p) => p.pays === f.pays);
  if (!pts.length) {
    scans.push([f, c.reserves.join(" | ").slice(0, 90) || "aucun point"]);
    continue;
  }
  if (pts.some((p) => p.taux < 1 || p.taux > 20)) {
    hors.push(f);
    continue;
  }
  const note = `relevée sur beac.int le ${new Date().toISOString().slice(0, 10)}, pièce non encore rangée dans la bibliothèque`;
  const reserves = [...new Set([...c.reserves, note])].join(" · ");
  for (const p of pts) lignes.push({ mois: `${f.mois}-01`, pays: p.pays, tenor: p.tenor, annees: p.annees, taux: p.taux, source_titre: f.titre, source_chemin: f.url, file_key: null, reserves });
}

dire(`\n${lignes.length} point(s) lu(s) sur ${new Set(lignes.map((l) => `${l.pays}|${l.mois}`)).size} couple(s)`);
dire(`${scans.length} feuille(s) non lisible(s) (comptées, pas devinées)`);
for (const [f, why] of scans.slice(0, 12)) dire(`   ${f.pays.padEnd(9)} ${f.mois}  ${why}`);
if (hors.length) dire(`${hors.length} feuille(s) écartée(s) : taux hors de [1 %, 20 %]\n   ${hors.map((f) => `${f.pays} ${f.mois}`).join(", ")}`);

/* 4. Écriture : jamais d'écrasement (« on conflict do nothing »). */
if (!ecrire) {
  dire("\nSimulation : rien n'est écrit. Ajouter --ecrire pour écrire les couples ci-dessus.");
} else if (!sb) {
  dire("\n--ecrire demande une base : .env.local absent, rien n'est écrit.");
} else if (!lignes.length) {
  dire("\nRien à écrire : la base est à jour.");
} else {
  let ecrites = 0;
  for (let i = 0; i < lignes.length; i += 200) {
    const lot = lignes.slice(i, i + 200);
    const { data, error } = await sb.from("beac_yield_curves").upsert(lot, { onConflict: "mois,pays,tenor", ignoreDuplicates: true }).select("id");
    if (error) throw new Error(`Écriture : ${error.message}`);
    ecrites += data?.length ?? 0;
  }
  dire(`\n${ecrites} point(s) écrit(s).`);
}
