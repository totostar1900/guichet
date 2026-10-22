/**
 * UNE SEANCE, UNE LIGNE : LA TRADUCTION N EN EST PAS UNE AUTRE.
 *
 * La BEAC publie la meme seance deux fois, en francais et en espagnol ou en
 * anglais. Ce sont deux DOCUMENTS, et la bibliotheque les garde tous les
 * deux ; ce n est pas deux SEANCES, et la table n en veut qu une.
 *
 * Le depot se cloturait sur l adresse du document (`onConflict: source_url`),
 * ce qui etait juste tant qu une seance n avait qu une adresse. La porte
 * espagnole et anglaise ouverte le 15 octobre a fait entrer les traductions,
 * et trente-huit seances comptent double depuis.
 *
 * ON NE FUSIONNE QUE CE QUI EST SUREMENT LA MEME SEANCE : meme pays, meme
 * date, et MEME CODE D EMISSION. Deux lignes sans code au meme jour ne sont
 * pas des doublons : le Gabon a adjuge un BTA et un OTA le 12 juin 2019, et
 * les confondre perdrait une seance au lieu d en rendre une.
 *
 * ON GARDE LA PLUS COMPLETE, et le champ qui manque a l une se prend sur
 * l autre : deux lectures d une meme seance ne se contredisent pas, elles se
 * completent.
 *
 *   npx tsx --conditions=react-server scripts/fusionner-doublons-adjudications.mjs [--fusionner]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { tout } = await import("./_journal.mjs");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const fusionner = process.argv.includes("--fusionner");

const CHIFFRES = ["announced", "bid", "served", "network_size", "bidders", "rate_min", "rate_max", "rate_limit", "rate_avg", "price_min", "price_max", "price_limit", "price_avg", "price_avg_fcfa", "yield_avg", "yield_limit", "coupon_rate", "maturity_on", "coverage"];

const nos = await tout(sb, "auction_results", "*");
const groupes = new Map();
for (const n of nos) {
  if (!n.code_emission) continue;
  const c = `${n.country}|${String(n.session_on).slice(0, 10)}|${n.code_emission}`;
  groupes.set(c, [...(groupes.get(c) ?? []), n]);
}
const doubles = [...groupes.entries()].filter(([, v]) => v.length > 1);
dire(`${nos.length} ligne(s) · ${doubles.length} seance(s) en double\n`);

const remplis = (n) => CHIFFRES.filter((k) => n[k] != null).length;
let desaccords = 0;
const aFaire = [];
for (const [clef, lignes] of doubles) {
  const tri = [...lignes].sort((a, b) => remplis(b) - remplis(a) || String(a.created_at).localeCompare(String(b.created_at)));
  const garde = tri[0];
  const jettes = tri.slice(1);
  /* CE QUE L UNE SAIT ET QUE L AUTRE IGNORE : on complete avant de jeter. */
  const complement = {};
  const contredits = [];
  for (const k of CHIFFRES) {
    for (const j of jettes) {
      if (j[k] == null) continue;
      if (garde[k] == null) complement[k] = j[k];
      else if (Math.abs(Number(garde[k]) - Number(j[k])) > 0.01 && Number.isFinite(Number(garde[k]))) contredits.push(`${k} ${garde[k]} / ${j[k]}`);
    }
  }
  if (contredits.length) desaccords++;
  aFaire.push({ clef, garde, jettes, complement, contredits });
  dire(
    `   ${clef.padEnd(42)} garde ${remplis(garde)} champ(s), jette ${jettes.map((j) => remplis(j)).join("+")}` +
      `${Object.keys(complement).length ? ` · complete ${Object.keys(complement).join(", ")}` : ""}` +
      `${contredits.length ? `\n      LES DEUX LECTURES SE CONTREDISENT : ${contredits.join(" · ")}` : ""}`,
  );
}
dire(`\n=== ${aFaire.length} fusion(s) · ${desaccords} seance(s) ou les deux lectures se contredisent ===`);

/* Ce que la cle actuelle laisse passer : deux lignes sans code au meme jour. */
const sansCode = nos.filter((n) => !n.code_emission);
dire(`   ${sansCode.length} ligne(s) sans code d emission, laissees telles quelles`);

if (!fusionner) {
  dire(`\nEssai a blanc. Relancer avec --fusionner.`);
  process.exit(0);
}
/**
 * ON COMPLETE UN SILENCE, ON NE TRANCHE PAS UNE CONTRADICTION.
 *
 * Quand les deux pieces d une meme seance ne disent pas la meme chose, nous
 * tenons DEUX LECTURES INDEPENDANTES qui divergent : c est une trouvaille,
 * et en garder une au hasard l effacerait. Ces seances-la restent en double
 * jusqu a ce que quelqu un ouvre les deux pieces.
 */
let completes = 0;
let supprimes = 0;
for (const x of aFaire.filter((y) => !y.contredits.length)) {
  if (Object.keys(x.complement).length) {
    const { error } = await sb.from("auction_results").update({ ...x.complement, updated_at: new Date().toISOString() }).eq("id", x.garde.id);
    if (error) dire(`   ERREUR complement ${x.clef} : ${error.message}`);
    else completes++;
  }
  for (const j of x.jettes) {
    const { error } = await sb.from("auction_results").delete().eq("id", j.id);
    if (error) dire(`   ERREUR suppression ${x.clef} : ${error.message}`);
    else supprimes++;
  }
}
dire(`\n=== ${supprimes} ligne(s) supprimee(s), ${completes} completee(s) ===`);
