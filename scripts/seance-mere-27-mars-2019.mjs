/**
 * LA SEANCE MERE DU 27 MARS 2019, ET CE QUI LA PROUVE.
 *
 * L abondement gabonais du 12 juin 2019 porte une etiquette qui nomme le
 * 29 mars 2022. Deux temoins l avaient rendue credible : la regle des
 * trois ans, et le jour de la semaine. UN TROISIEME LA PROUVE, et il est
 * d une autre nature que les deux premiers : il ne deduit rien.
 *
 *   LE REGISTRE DE L ENCOURS. Le bulletin trimestriel de la BEAC liste
 *   l encours LIGNE A LIGNE, avec son code, sa date d emission et son
 *   echeance. C est un etat du STOCK : il existe meme quand le compte
 *   rendu de la seance n a jamais ete publie.
 *
 * ET LA SEANCE, ELLE, N EST PAS PUBLIEE. L index de la BEAC, lu par le
 * lecteur de la maison sur ses neuf pages, ne porte AUCUNE adjudication
 * avant le 5 juin 2019.
 *
 *   npx tsx --conditions=react-server scripts/seance-mere-27-mars-2019.mjs
 */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const jourDe = (d) => JOURS[new Date(`${d}T00:00:00Z`).getUTCDay()];

const CODE = "GA2J00000085";

const lignes = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("beac_encours_lignes").select("arrete,pays,isin,instrument,emis_le,echeance_le,tenor,titres,faciale,encours,source_titre").range(de, de + 999);
  if (error) throw new Error(error.message);
  lignes.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
dire(`${lignes.length} lignes au registre de l encours\n`);

dire(`=== CE QUE LE REGISTRE DIT DE ${CODE} ===`);
const siennes = lignes.filter((r) => r.isin === CODE).sort((a, b) => a.arrete.localeCompare(b.arrete));
for (const r of siennes)
  dire(`   arrete ${r.arrete} · emis ${r.emis_le} · echeance ${r.echeance_le} · ${String(r.tenor).padEnd(8)} · ${r.titres ?? "—"} titres × ${r.faciale} = ${r.encours} · ${String(r.source_titre).replace(/^Bulletin trimestriel.*?: /, "")}`);

/* LA MAJORITE FAIT FOI, et on dit de combien. Un bulletin qui parle seul
   contre quatre n est pas un desaccord, c est une faute de lecture. */
dire(`\n=== CE QUE LA MAJORITE DES BULLETINS PORTE ===`);
const voix = {};
for (const r of siennes) {
  const k = `${r.emis_le} → ${r.echeance_le} · ${r.titres ?? "—"} titres × ${r.faciale}`;
  voix[k] = (voix[k] ?? 0) + 1;
}
for (const [k, n] of Object.entries(voix).sort((a, b) => b[1] - a[1])) dire(`   ${String(n).padStart(2)} bulletin(s) · ${k}`);

const retenu = Object.entries(voix).sort((a, b) => b[1] - a[1])[0];
const emis = retenu[0].slice(0, 10);
const seance = new Date(`${emis}T00:00:00Z`);
seance.setUTCDate(seance.getUTCDate() - 2);
const seanceIso = seance.toISOString().slice(0, 10);

dire(`\n=== LA SEANCE MERE ===`);
dire(`   emission (reglement) : ${emis}, un ${jourDe(emis)}`);
dire(`   la seance est donc le ${seanceIso}, un ${jourDe(seanceIso)}`);
const { data: gab } = await sb.from("auction_results").select("session_on").eq("country", "Gabon");
const jours = {};
for (const r of gab ?? []) { const j = jourDe(r.session_on); jours[j] = (jours[j] ?? 0) + 1; }
dire(`   jours de seance du Gabon dans notre base : ${Object.entries(jours).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ×${v}`).join(" · ")}`);
dire(`   la deduction faite AVANT de connaitre le registre disait : 2019-03-27, un mercredi`);
dire(`   ${seanceIso === "2019-03-27" ? "LE REGISTRE LA CONFIRME, au jour pres." : `LE REGISTRE DIT AUTRE CHOSE : ${seanceIso}`}`);

dire(`\n=== LA SEANCE EST-ELLE DANS NOTRE BASE ? ===`);
const { data: ici } = await sb.from("auction_results").select("session_on,country,instrument,code_emission").eq("session_on", seanceIso);
dire(`   ${(ici ?? []).length} seance(s) au ${seanceIso}`);
const { data: plusVieille } = await sb.from("auction_results").select("session_on,country,source_title").order("session_on", { ascending: true }).limit(1);
dire(`   notre plus ancienne seance : ${plusVieille?.[0]?.session_on} (${plusVieille?.[0]?.country})`);

dire(`\n=== CE QUE LE REGISTRE SAIT ET QUE NOS ADJUDICATIONS IGNORENT ===`);
const { data: codes } = await sb.from("auction_results").select("code_emission");
const connus = new Set((codes ?? []).map((r) => r.code_emission).filter(Boolean));
const inedits = new Map();
for (const r of lignes) {
  if (!r.isin || connus.has(r.isin)) continue;
  if (!inedits.has(r.isin)) inedits.set(r.isin, r);
}
dire(`   ${inedits.size} ligne(s) au registre dont aucune de nos seances ne porte le code`);
const avantJuin = [...inedits.values()].filter((r) => r.emis_le && r.emis_le < "2019-06-05").sort((a, b) => a.emis_le.localeCompare(b.emis_le));
dire(`   dont ${avantJuin.length} emise(s) avant notre plus ancienne seance :`);
for (const r of avantJuin.slice(0, 30))
  dire(`      ${r.emis_le} ${String(r.pays).padEnd(14)} ${String(r.instrument).padEnd(4)} ${r.isin} echeance ${r.echeance_le} ${String(r.tenor).padEnd(12)} ${r.encours ?? "—"}`);
if (avantJuin.length > 30) dire(`      … et ${avantJuin.length - 30} autre(s)`);
