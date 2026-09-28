/**
 * Pourquoi tel Trésor n'a que trois points, et tel autre aucun.
 *
 * Quatre filtres se succèdent entre une séance et un point de courbe, et ils
 * n'écartent pas pour les mêmes raisons. Les compter séparément dit lequel
 * mord, et donc s'il y a quelque chose à faire.
 *
 *   node scripts/pourquoi-peu-de-points.mjs [fenêtre en jours]
 */
import fs from "node:fs";
import { auctionYield, yieldMissing } from "../src/lib/market/yield.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");

const rows = (await fetch(`${U}/rest/v1/auction_results?select=*&limit=2000`, {
  headers: { apikey: K, Authorization: `Bearer ${K}` },
}).then((r) => r.json())).map(toAuctionResult);

const fenetre = Number(process.argv[2] ?? 3650);
const jour = new Date().toISOString().slice(0, 10);
const age = (d) => Math.round((Date.parse(jour) - Date.parse(d)) / 86_400_000);
const dans = rows.filter((r) => age(r.sessionOn) >= 0 && age(r.sessionOn) <= fenetre);

const pays = [...new Set(rows.map((r) => r.country))].sort();
console.log(`fenêtre de ${fenetre} jours · ${dans.length} séances\n`);
console.log(`${"Trésor".padEnd(13)}${"séances".padStart(8)}${"relues".padStart(8)}${"rendement".padStart(11)}${"lignes".padStart(8)}   ce qui bloque`);

for (const p of pays) {
  const siennes = dans.filter((r) => r.country === p);
  const relues = siennes.filter((r) => r.confirmedBy);
  const avecRdt = relues.filter((r) => auctionYield(r));
  /**
   * La clef de dédoublonnage : une ligne, un point. Quand l'échéance manque,
   * elle retombe sur l'étiquette — et un Trésor qui émet cent fois sur sept
   * durées n'aura jamais que sept points, quelle que soit la profondeur.
   */
  const clefs = new Set(avecRdt.map((r) => `${r.maturityOn ?? r.tenor}`));
  const sansEcheance = avecRdt.filter((r) => !r.maturityOn).length;

  const pourquoi = [];
  if (siennes.length && !relues.length) pourquoi.push("aucune relue");
  else if (relues.length && !avecRdt.length) {
    const motifs = [...new Set(relues.map((r) => yieldMissing(r)).filter(Boolean))];
    pourquoi.push(motifs.join(" · "));
  } else if (avecRdt.length > clefs.size * 1.5) {
    const replis = `${avecRdt.length - clefs.size} séances se replient sur ${clefs.size} lignes`;
    pourquoi.push(sansEcheance ? `${replis} · ${sansEcheance} sans échéance imprimée` : replis);
  }
  console.log(
    `${p.padEnd(13)}${String(siennes.length).padStart(8)}${String(relues.length).padStart(8)}${String(avecRdt.length).padStart(11)}${String(clefs.size).padStart(8)}   ${pourquoi.join(" ; ")}`,
  );
}

/* Le détail des Trésors absents ou maigres. */
for (const p of pays) {
  const siennes = dans.filter((r) => r.country === p);
  const relues = siennes.filter((r) => r.confirmedBy);
  const avecRdt = relues.filter((r) => auctionYield(r));
  const clefs = new Set(avecRdt.map((r) => `${r.maturityOn ?? r.tenor}`));
  if (clefs.size >= 5 || !siennes.length) continue;
  console.log(`\n${p} en détail : ${siennes.length} séances, ${clefs.size} lignes distinctes`);
  const motifs = {};
  for (const r of relues.filter((x) => !auctionYield(x))) {
    const m = yieldMissing(r) ?? "—";
    motifs[m] = (motifs[m] ?? 0) + 1;
  }
  for (const [m, n] of Object.entries(motifs).sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(3)} relues sans rendement : ${m}`);
  const nonRelues = siennes.length - relues.length;
  if (nonRelues) console.log(`   ${String(nonRelues).padStart(3)} non relues`);
}
