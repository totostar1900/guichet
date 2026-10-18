/**
 * LA REGLE DES OBLIGATIONS GABONAISES A TROIS ANS.
 *
 * Si une ligne NEUVE echoit au reglement plus trois ans, alors une
 * echeance qui ne tombe pas la designe un ABONDEMENT, et le 12 juin 2019
 * se tranche sans rien deviner.
 */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const jourDe = (d) => JOURS[new Date(`${d}T00:00:00Z`).getUTCDay()];

const avis = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("emission_notices").select("country,session_on,instrument,tenor,code_emission,maturity_on").range(de, de + 999);
  if (error) throw new Error(error.message);
  avis.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
const toutes = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => !r.setAsideAt);

/* LA PREMIERE APPARITION de chaque code est la naissance presumee ; les
   suivantes sont des abondements et ne jugent pas la regle. */
const parCode = new Map();
for (const r of toutes.filter((r) => r.country === "Gabon" && String(r.codeEmission ?? "").slice(2, 4) === "2J" && r.maturityOn))
  { const k = r.codeEmission; const v = parCode.get(k) ?? []; v.push({ s: r.sessionOn, e: r.maturityOn }); parCode.set(k, v); }
for (const a of avis.filter((a) => a.country === "Gabon" && String(a.code_emission ?? "").slice(2, 4) === "2J" && a.maturity_on))
  { const k = a.code_emission; const v = parCode.get(k) ?? []; v.push({ s: a.session_on, e: a.maturity_on }); parCode.set(k, v); }

dire(`=== L ECHEANCE TOMBE-T-ELLE AU REGLEMENT PLUS TROIS ANS ? (premiere apparition de chaque code) ===`);
let exact = 0; let proche = 0; let loin = 0;
for (const [code, v] of [...parCode].sort()) {
  v.sort((a, b) => a.s.localeCompare(b.s));
  const { s, e } = v[0];
  const att = new Date(`${s}T00:00:00Z`);
  att.setUTCDate(att.getUTCDate() + 2);
  att.setUTCFullYear(att.getUTCFullYear() + 3);
  const ecart = Math.round((Date.parse(e) - att.getTime()) / 86_400_000);
  const verdict = ecart === 0 ? "EXACT" : Math.abs(ecart) <= 5 ? `${ecart > 0 ? "+" : ""}${ecart} j` : `${ecart > 0 ? "+" : ""}${ecart} j · ABONDEMENT`;
  if (ecart === 0) exact++; else if (Math.abs(ecart) <= 5) proche++; else loin++;
  dire(`   ${code} ${s} → ${e} · ${verdict}${v.length > 1 ? ` · ${v.length - 1} reprise(s)` : ""}`);
}
dire(`\n   ${exact} exacte(s) · ${proche} a cinq jours pres · ${loin} trop loin pour etre neuve`);

dire(`\n=== LE 12 JUIN 2019 ===`);
const att = new Date("2019-06-12T00:00:00Z"); att.setUTCDate(att.getUTCDate() + 2); att.setUTCFullYear(att.getUTCFullYear() + 3);
const regle = att.toISOString().slice(0, 10);
dire(`   la regle donnerait          ${regle} (${jourDe(regle)})`);
dire(`   l etiquette de la piece dit 2022-03-29 (${jourDe("2022-03-29")})`);
dire(`   ecart : ${Math.round((Date.parse("2022-03-29") - att.getTime()) / 86_400_000)} jours`);
const naiss = new Date("2022-03-29T00:00:00Z"); naiss.setUTCFullYear(naiss.getUTCFullYear() - 3); naiss.setUTCDate(naiss.getUTCDate() - 2);
const seanceMere = naiss.toISOString().slice(0, 10);
dire(`\n   SI L ETIQUETTE DIT VRAI, la seance mere serait le ${seanceMere}, un ${jourDe(seanceMere)}`);
const jours = {};
for (const r of toutes.filter((r) => r.country === "Gabon")) { const j = jourDe(r.sessionOn); jours[j] = (jours[j] ?? 0) + 1; }
dire(`   jours de seance du Gabon : ${Object.entries(jours).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ×${v}`).join(" · ")}`);

dire(`\n=== CE QUE NOTRE COLLECTE PORTE AU GABON AVANT JUILLET 2019 ===`);
const t2019 = toutes.filter((r) => r.country === "Gabon" && r.sessionOn < "2019-07-01").map((r) => r.sessionOn);
const a2019 = avis.filter((a) => a.country === "Gabon" && a.session_on < "2019-07-01").map((a) => a.session_on);
dire(`   resultats : ${[...new Set(t2019)].sort().join(" · ") || "aucun"}`);
dire(`   avis      : ${[...new Set(a2019)].sort().join(" · ") || "aucun"}`);
