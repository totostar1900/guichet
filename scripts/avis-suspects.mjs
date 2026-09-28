/**
 * Les avis dont les nombres ne tiennent pas ensemble.
 *
 * Trois contrôles d'ordre de grandeur, qui ne dépendent pas du lecteur et
 * attrapent ce qu'un appariement de colonnes décalées produit : un nominal qui
 * n'est pas celui de son instrument, un volume qui ne fait pas un nombre de
 * titres plausible, une échéance qui ne correspond pas à la durée annoncée.
 *
 * C'est l'inverse du crible d'anomalies sur les séances : là-bas on cherche des
 * contradictions du Trésor, ici des fautes de lecture.
 *
 *   node scripts/avis-suspects.mjs
 */
import fs from "node:fs";
import { toEmissionNotice } from "../src/lib/data/supabase.ts";
import { tenorDays } from "../src/lib/market/yield.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");

const lus = (await fetch(`${U}/rest/v1/emission_notices?select=*&read_at=not.is.null&limit=3000`, {
  headers: { apikey: K, Authorization: `Bearer ${K}` },
}).then((r) => r.json())).map(toEmissionNotice);

const ATTENDU = { BTA: 1_000_000, OTA: 10_000 };
const out = [];
for (const x of lus) {
  const dit = (quoi) => out.push({ x, quoi });
  if (x.nominalUnit != null && x.nominalUnit !== ATTENDU[x.instrument]) {
    dit(`nominal ${x.nominalUnit.toLocaleString("fr-FR")} F, là où un ${x.instrument} s'émet à ${ATTENDU[x.instrument].toLocaleString("fr-FR")} F`);
  }
  if (x.issueVolume != null && x.nominalUnit != null && x.nominalUnit > 0) {
    const titres = x.issueVolume / x.nominalUnit;
    if (titres < 1_000) dit(`${Math.round(titres).toLocaleString("fr-FR")} titres seulement : volume ${x.issueVolume.toLocaleString("fr-FR")} F sur un nominal de ${x.nominalUnit.toLocaleString("fr-FR")} F`);
  }
  if (x.maturityOn && x.tenor) {
    const jours = (Date.parse(x.maturityOn) - Date.parse(x.sessionOn)) / 86_400_000;
    const annonce = tenorDays(x.tenor);
    // Un abondement raccourcit la vie restante : seul un dépassement étonne.
    if (annonce != null && jours > annonce + 45) dit(`échéance à ${Math.round(jours)} jours, au-delà des ${annonce} jours annoncés`);
    if (jours < 0) dit(`échéance ${x.maturityOn} antérieure à la séance`);
  }
  if (x.instrument === "BTA" && x.couponRate != null) dit(`un coupon de ${x.couponRate} % sur un bon, qui n'en porte pas`);
}

console.log(`${lus.length} avis lus · ${out.length} portent un nombre qui ne tient pas\n`);
for (const { x, quoi } of out) {
  console.log(`${x.sessionOn} ${x.country.padEnd(12)} ${x.instrument} ${String(x.tenor ?? "—").padEnd(12)} ${x.codeEmission ?? "—"}`);
  console.log(`   ${quoi}`);
  console.log(`   ${x.id}`);
}
if (!out.length) console.log("Rien : les nominaux, les volumes et les échéances se tiennent tous.");
