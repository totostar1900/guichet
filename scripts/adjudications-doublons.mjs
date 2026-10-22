/** Deux lignes pour une seule seance : un encours les compterait deux fois.
 *    npx tsx --conditions=react-server scripts/adjudications-doublons.mjs */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const { data } = await sb.from("auction_results").select("*").order("session_on");

/* DEUX CLEFS, ET ELLES NE DISENT PAS LA MEME CHOSE. Le code d emission
   identifie LA LIGNE du Tresor : deux pieces qui le portent sont la meme
   seance. A defaut, pays + instrument + duree + date est un indice, pas une
   preuve : un Tresor peut adjuger deux lignes de meme duree le meme jour. */
const parCode = new Map(), parForme = new Map();
for (const l of data) {
  if (l.code_emission) parCode.set(l.code_emission, [...(parCode.get(l.code_emission) ?? []), l]);
  const k = `${l.country}|${l.instrument}|${l.tenor}|${l.session_on}`;
  parForme.set(k, [...(parForme.get(k) ?? []), l]);
}
const mds = (n) => (Number(n) / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

dire(`=== MEME CODE D'ÉMISSION ===`);
let n1 = 0, f1 = 0;
for (const [c, xs] of parCode) if (xs.length > 1) {
  n1++; f1 += xs.slice(1).reduce((a, x) => a + Number(x.served ?? 0), 0);
  dire(`   ${c}  ${xs.length} lignes : ${xs.map((x) => `${x.session_on} servi ${mds(x.served)} Mds${x.set_aside_reason ? " (écartée)" : ""}`).join(" ¦ ")}`);
}
dire(`   ${n1} code(s) en double, ${mds(f1)} Mds compté(s) en trop\n`);

dire(`=== MÊME PAYS, INSTRUMENT, DURÉE ET DATE ===`);
let n2 = 0, f2 = 0;
for (const [k, xs] of parForme) if (xs.length > 1) {
  const codes = new Set(xs.map((x) => x.code_emission).filter(Boolean));
  const memeChiffre = new Set(xs.map((x) => String(x.served))).size === 1;
  n2++; if (memeChiffre) f2 += xs.slice(1).reduce((a, x) => a + Number(x.served ?? 0), 0);
  dire(`   ${k}  ${xs.length} lignes · codes ${codes.size ? [...codes].join(" ") : "AUCUN"} · servis ${xs.map((x) => mds(x.served)).join(" / ")}  ${memeChiffre ? "← MÊME CHIFFRE, doublon probable" : "chiffres différents, deux lignes possibles"}`);
}
dire(`   ${n2} groupe(s), ${mds(f2)} Mds de doublon probable`);
