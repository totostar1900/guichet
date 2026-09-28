/**
 * Relire les avis dont les nombres ne tenaient pas ensemble.
 *
 * Les gardes posées après coup ne corrigent pas ce qui est déjà en base : elles
 * décident de ce qui entre. Les avis lus avant elles gardent donc leur volume
 * hors d'échelle, et il faut les repasser. On ne repasse que ceux-là : rouvrir
 * les trois cent soixante-sept coûterait de l'argent pour rien et ne changerait
 * rien aux trois cents qui vont bien.
 *
 *   node scripts/relire-avis-suspects.mjs
 */
import fs from "node:fs";
import { toEmissionNotice } from "../src/lib/data/supabase.ts";
import { tenorDays } from "../src/lib/market/yield.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");
const SECRET = v("CRON_SECRET");
const HOTE = process.env.DESK_HOST || "https://desk.purposecapital.africa";
const h = { apikey: K, Authorization: `Bearer ${K}` };

const ATTENDU = { BTA: 1_000_000, OTA: 10_000 };
const suspect = (x) => {
  if (x.nominalUnit != null && x.nominalUnit !== ATTENDU[x.instrument]) return true;
  if (x.issueVolume != null && (x.issueVolume < 1e8 || x.issueVolume > 1e13)) return true;
  if (x.issueVolume != null && x.nominalUnit != null && x.nominalUnit > 0 && x.issueVolume / x.nominalUnit < 1_000) return true;
  if (x.instrument === "BTA" && x.couponRate != null) return true;
  if (x.maturityOn && x.tenor) {
    const jours = (Date.parse(x.maturityOn) - Date.parse(x.sessionOn)) / 86_400_000;
    const annonce = tenorDays(x.tenor);
    if (jours < 0 || (annonce != null && jours > annonce + 45)) return true;
  }
  return false;
};

const lus = (await fetch(`${U}/rest/v1/emission_notices?select=*&read_at=not.is.null&limit=3000`, { headers: h }).then((r) => r.json())).map(toEmissionNotice);
const file = lus.filter(suspect);
console.log(`${lus.length} avis lus · ${file.length} à repasser\n`);

let repasses = 0;
for (const x of file) {
  const res = await fetch(`${HOTE}/api/cron/lire-adjudications?mode=avis&avis=${x.id}&n=1`, { headers: { authorization: `Bearer ${SECRET}` } });
  if (!res.ok) {
    console.log(`✗ ${x.sessionOn} ${x.country} : ${res.status}`);
    continue;
  }
  const j = await res.json();
  if (!j.lus) {
    console.log(`✗ ${x.sessionOn} ${x.country} : ${(j.ratees ?? []).map((r) => r.raison).join(" ") || "non relu"}`);
    continue;
  }
  const [apres] = await fetch(`${U}/rest/v1/emission_notices?select=nominal_unit,issue_volume,coupon_rate,maturity_on&id=eq.${x.id}`, { headers: h }).then((r) => r.json());
  const f = (v) => (v == null ? "—" : Number(v).toLocaleString("fr-FR"));
  const bouge = f(apres.nominal_unit) !== f(x.nominalUnit) || f(apres.issue_volume) !== f(x.issueVolume);
  console.log(
    `${bouge ? "✓" : "·"} ${x.sessionOn} ${x.country.padEnd(12)} ${x.instrument} ${String(x.tenor ?? "—").padEnd(12)} ` +
      `nominal ${f(x.nominalUnit)} → ${f(apres.nominal_unit)} · volume ${f(x.issueVolume)} → ${f(apres.issue_volume)}`,
  );
  repasses += 1;
}
console.log(`\n${repasses}/${file.length} repassés`);
