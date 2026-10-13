/**
 * CE QUE LA JONCTION DES DEUX MOITIÉS GAGNE, ET CE QU'ELLE PERD.
 *
 * Une règle de lecture ne se juge pas sur le cas qui l'a fait naître. Celle-ci
 * joint une rangée qui porte un ISIN sans date à la rangée voisine qui porte
 * une date sans ISIN : il faut donc vérifier qu'elle n'avale jamais la ligne
 * du dessous ailleurs dans le corpus.
 *
 * LA MESURE EST UN ESSAI À BLANC : on fait tourner le constructeur
 * géométrique sur chaque séance et on compare les obligations qu'il rend aux
 * cotations déjà en base. Rien n'est écrit.
 *
 *   npx tsx --conditions=react-server scripts/jonction-mesure.mjs [nombre de séances]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { createClient } = await import("@supabase/supabase-js");
const { rangeesDuPdf, obligationsGeometriques } = await import("../src/lib/market/boc-geometrie.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const bulletins = (await repo().listBulletins(3000)).filter((b) => b.fileKey).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
const combien = Number(process.argv[2] ?? bulletins.length);
/* Un pas régulier plutôt que les N premières : un échantillon pris au début
   ne dit rien des millésimes récents, et c'est la dérive de mise en page qui
   casse ce genre de règle. */
const pas = Math.max(1, Math.floor(bulletins.length / combien));
const lot = bulletins.filter((_, i) => i % pas === 0).slice(0, combien);

dire(`${lot.length} séance(s) sur ${bulletins.length}, une sur ${pas}\n`);

let lues = 0;
let gagnees = 0;
let differentes = 0;
const ecarts = [];

for (const b of lot) {
  let obligations;
  try {
    obligations = obligationsGeometriques(await rangeesDuPdf(await readSource(b.fileKey)));
  } catch {
    continue;
  }
  lues++;
  const { data } = await sb.from("quotes").select("isin, close, nominal_remaining, accrued_coupon").eq("session_date", b.sessionDate).eq("instrument", "obligation");
  const enBase = new Map((data ?? []).map((q) => [q.isin, q]));

  for (const o of obligations) {
    const q = enBase.get(o.isin);
    if (!q) {
      gagnees++;
      continue;
    }
    /* UNE VALEUR QUI CHANGE EST LE VRAI DANGER, pas une ligne de plus : si la
       jonction avait avalé la ligne du dessous, le cours ou le nominal
       seraient ceux du voisin. */
    const differe = (a, c) => Math.abs(Number(a ?? 0) - Number(c ?? 0)) > 0.011;
    if (differe(o.close, q.close) || differe(o.nominalRemaining, q.nominal_remaining) || differe(o.accruedCoupon, q.accrued_coupon)) {
      differentes++;
      if (ecarts.length < 20) {
        ecarts.push(`${b.sessionDate} ${o.isin} : clôture ${q.close} → ${o.close} · nominal ${q.nominal_remaining} → ${o.nominalRemaining} · couru ${q.accrued_coupon} → ${o.accruedCoupon}`);
      }
    }
  }
  if (lues % 25 === 0) dire(`   ${lues}/${lot.length} · ${gagnees} gagnée(s) · ${differentes} différente(s)`);
}

dire(`\nséances lues        ${lues}`);
dire(`obligations gagnées ${gagnees}   (absentes de la base, que la géométrie rend)`);
dire(`valeurs différentes ${differentes}   (présentes en base, lues autrement)`);
dire("");
for (const e of ecarts) dire(`   ${e}`);
