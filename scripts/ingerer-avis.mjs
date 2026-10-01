/**
 * Ramasser les avis d'annonce de la BEAC, puis les lire.
 *
 * La route du robot fait la même chose sur Vercel une fois par jour ; ce script
 * existe pour la reprise d'historique, qui ne s'attend pas : la BEAC ne garde
 * ses avis qu'un temps, et sur les quatre séances congolaises dont le rendement
 * a posé question, aucun avis n'était plus en ligne au moment où nous avons su
 * qu'il nous fallait. Ce qui est en ligne aujourd'hui se ramasse aujourd'hui.
 *
 *   node scripts/ingerer-avis.mjs                 ramasse, sans lire
 *   node scripts/ingerer-avis.mjs --lire 10       ramasse puis lit dix avis
 */
import fs from "node:fs";
import { parseBeacRows, readBeacDoc, BEAC_ANNONCES } from "../src/lib/market/beac.ts";
import { toEmissionNotice } from "../src/lib/data/supabase.ts";
import { storageKey } from "../src/lib/intake/cle.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");
const h = { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json", Prefer: "return=representation,resolution=merge-duplicates" };

const arg = (n) => {
  const i = process.argv.indexOf(n);
  return i > 0 ? process.argv[i + 1] : undefined;
};

/**
 * La clef d'un fichier au dépôt vient de « src/lib/intake/cle.ts », importée et
 * non recopiée.
 *
 * Elle a longtemps été recopiée ici, parce que son module portait
 * « server-only » et refusait de se charger hors de Next. Une copie libre
 * dérive : celle de ce script ne remplaçait que les caractères non ASCII, là où
 * l'originale écrase aussi les espaces et les points. Dix-sept avis de Guinée
 * équatoriale sont partis sous une clef que l'application n'aurait jamais lue,
 * et le balayage du 2026-10-02 en a retrouvé le résidu : sept pièces illisibles
 * et vingt-deux doublons. La barrière a été retirée le même jour.
 */

const res = await fetch(BEAC_ANNONCES, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0; +https://guichet.purposecapital.africa)" } });
if (!res.ok) {
  console.error(`BEAC : ${res.status}`);
  process.exit(1);
}
const docs = parseBeacRows(await res.text()).map(readBeacDoc);
const avis = docs.filter((a) => a.kind === "annonce" && a.on && a.country && (a.instrument === "BTA" || a.instrument === "OTA"));
console.log(`${docs.length} documents à l'index · ${avis.length} avis d'annonce exploitables\n`);

const deja = new Map(
  (await fetch(`${U}/rest/v1/emission_notices?select=source_url,file_key&limit=5000`, { headers: h }).then((r) => r.json())).map((x) => [x.source_url, x.file_key]),
);

let poses = 0;
let sansPiece = 0;
for (const a of avis) {
  const gardee = deja.get(a.doc.url);
  if (deja.has(a.doc.url) && gardee) continue;
  let fileKey = gardee;
  if (!fileKey) {
    const pdf = await fetch(a.doc.url, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0)" } }).catch(() => null);
    if (pdf?.ok) {
      const key = `beac/${a.on}-annonce-${a.country}-${(a.tenor ?? "").replace(/\s+/g, "")}-${a.doc.url.split("/").pop()}`.slice(0, 200);
      const up = await fetch(`${U}/storage/v1/object/sources/${storageKey(key)}`, {
        method: "POST",
        headers: { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/pdf", "x-upsert": "true" },
        body: Buffer.from(await pdf.arrayBuffer()),
      });
      if (up.ok) fileKey = key;
    }
  }
  const row = {
    source_url: a.doc.url,
    source_title: a.doc.title,
    file_key: fileKey ?? null,
    country: a.country,
    instrument: a.instrument,
    tenor: a.tenor ?? null,
    session_on: a.on,
    abondement: a.abondement,
    updated_at: new Date().toISOString(),
  };
  const w = await fetch(`${U}/rest/v1/emission_notices?on_conflict=source_url`, { method: "POST", headers: h, body: JSON.stringify(row) });
  if (!w.ok) {
    console.log(`✗ ${a.on} ${a.country} ${a.tenor ?? ""} : ${(await w.text()).slice(0, 120)}`);
    continue;
  }
  poses += 1;
  if (!fileKey) sansPiece += 1;
}
console.log(`${poses} avis déposés · ${sansPiece} sans pièce`);

const combien = Number(arg("--lire") ?? 0);
if (!combien) {
  console.log(`\nPour lire : node scripts/ingerer-avis.mjs --lire 10`);
  process.exit(0);
}

const { readEmissionNotice } = await import("../src/lib/market/notice-extract.ts");
const tous = (await fetch(`${U}/rest/v1/emission_notices?select=*&order=session_on.desc&limit=2000`, { headers: h }).then((r) => r.json())).map(toEmissionNotice);
const file = tous.filter((x) => x.fileKey && !x.readAt).slice(0, combien);
console.log(`\n${tous.filter((x) => x.fileKey && !x.readAt).length} avis à lire · ${file.length} dans cette fournée\n`);

for (const x of file) {
  try {
    const obj = await fetch(`${U}/storage/v1/object/sources/${storageKey(x.fileKey)}`, { headers: { apikey: K, Authorization: `Bearer ${K}` } });
    if (!obj.ok) throw new Error(`dépôt ${obj.status}`);
    const b64 = Buffer.from(await obj.arrayBuffer()).toString("base64");
    const hint = `Avis pour la séance du ${x.sessionOn}, ${x.instrument}${x.tenor ? ` ${x.tenor}` : ""}, ${x.country}.`;
    const { proposal, remarks, model, seconds } = await readEmissionNotice(b64, hint);
    await fetch(`${U}/rest/v1/emission_notices?id=eq.${x.id}`, {
      method: "PATCH",
      headers: h,
      body: JSON.stringify({
        read_at: new Date().toISOString(),
        read_model: model,
        code_emission: proposal.codeEmission ?? null,
        maturity_on: proposal.maturityOn ?? null,
        coupon_rate: proposal.couponRate ?? null,
        redemption: proposal.redemption ?? null,
        nominal_unit: proposal.nominalUnit ?? null,
        issue_volume: proposal.issueVolume ?? null,
        settle_on: proposal.settleOn ?? null,
        remarks,
        updated_at: new Date().toISOString(),
      }),
    });
    console.log(
      `${x.sessionOn} ${x.country.padEnd(11)} ${String(x.tenor ?? "—").padEnd(12)} ${String(proposal.codeEmission ?? "—").padEnd(14)} ` +
        `coupon ${String(proposal.couponRate ?? "—").padStart(5)} · éch ${proposal.maturityOn ?? "—"} · ${proposal.redemption ?? "aucune mention"} · ${seconds}s`,
    );
    for (const m of remarks) console.log(`     ⚠ ${m}`);
  } catch (e) {
    console.log(`✗ ${x.sessionOn} ${x.country} : ${e instanceof Error ? e.message : String(e)}`);
  }
}
