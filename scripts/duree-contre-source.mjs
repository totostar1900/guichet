/**
 * La durée enregistrée contre celle que le nom du fichier annonce.
 *
 * Le nom d'un communiqué de la BEAC porte presque toujours sa durée :
 * « BTA-13-SEMAINES-DU-15-AVRIL-2025 ». Ce n'est pas une source d'autorité,
 * c'est un deuxième témoin, et deux témoins qui se contredisent valent un
 * contrôle que rien d'autre ne donne.
 *
 * Un cas trouvé à l'œil : une séance congolaise du 15 avril 2025 enregistrée à
 * 26 semaines dont la pièce s'appelle BTA-13-SEMAINES. Une durée fausse ne se
 * rattrape nulle part en aval : le point se pose à la mauvaise abscisse, et son
 * rendement se calcule sur la mauvaise durée.
 *
 *   npx tsx scripts/duree-contre-source.mjs
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

/** La durée que le nom du fichier annonce, quand il l'annonce. */
const dureeDuNom = (url) => {
  if (!url) return undefined;
  const s = decodeURIComponent(url).replace(/[-_]/g, " ").toUpperCase();
  const sem = s.match(/BTA[\s]*(\d{1,2})[\s]*(?:S\b|SEM|SEMAINES?)/) ?? s.match(/(\d{1,2})[\s]*SEMAINES?/);
  if (sem) return { n: Number(sem[1]), unite: "semaines" };
  const ans = s.match(/OTA[\s]*(\d{1,2})[\s]*ANS?/) ?? s.match(/(\d{1,2})[\s]*ANS\b/);
  if (ans) return { n: Number(ans[1]), unite: "ans" };
  return undefined;
};

/** La durée enregistrée, ramenée au même format. */
const dureeDuChamp = (tenor) => {
  if (!tenor) return undefined;
  const s = String(tenor).toUpperCase();
  const sem = s.match(/(\d{1,3})\s*SEMAINE/);
  if (sem) return { n: Number(sem[1]), unite: "semaines" };
  const ans = s.match(/(\d{1,2})\s*AN/);
  if (ans) return { n: Number(ans[1]), unite: "ans" };
  const mois = s.match(/(\d{1,2})\s*MOIS/);
  if (mois) return { n: Number(mois[1]) * 4.345, unite: "semaines" };
  return undefined;
};

let lus = 0;
const ecarts = [];
for (const r of rows) {
  const a = dureeDuNom(r.sourceUrl);
  const b = dureeDuChamp(r.tenor);
  if (!a || !b) continue;
  lus += 1;
  if (a.unite !== b.unite || Math.abs(a.n - b.n) > 0.5) ecarts.push({ r, a, b });
}

console.log(`${lus} séances dont le nom de fichier annonce une durée\n`);
if (!ecarts.length) console.log(`Aucun désaccord.`);
for (const e of ecarts)
  console.log(
    `${e.r.country.padEnd(11)}${e.r.sessionOn}  ${e.r.instrument}  enregistré « ${String(e.r.tenor).padEnd(12)} » · la pièce dit ${e.a.n} ${e.a.unite}${e.r.confirmedBy ? ` · RELUE par ${e.r.confirmedBy}` : " · en attente"}\n   ${e.r.codeEmission ?? "sans code"}  ${e.r.sourceUrl}`,
  );
console.log(`\n${ecarts.length} désaccord(s) entre la durée enregistrée et celle du nom du fichier.`);
