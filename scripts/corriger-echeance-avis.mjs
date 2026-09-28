/**
 * Corriger une échéance lue de travers, sur foi de la pièce ouverte.
 *
 * L'avis camerounais du 29 janvier 2024 imprime « CM1100001096 BTA-13
 * 01-MAI-2024 » et, deux lignes plus bas, « Échéance : 01er mai 2024 ». La
 * machine a lu le 1er juillet, deux fois de suite et malgré une consigne
 * réécrite : cent cinquante-quatre jours sur un bon à treize semaines, là où la
 * pièce en donne quatre-vingt-treize.
 *
 * La garde d'échéance le signale désormais, ce qui est l'essentiel : le chiffre
 * ne passe plus en silence. Mais un signalement n'est pas une correction, et
 * celle-ci se fait sur foi d'une pièce ouverte et relue, pas sur une déduction.
 *
 * Le script ne corrige que ce qu'on lui nomme, vérifie que la valeur en base est
 * bien celle qu'on croit avant d'écrire, et range une trace d'audit chaînée.
 *
 *   node scripts/corriger-echeance-avis.mjs
 *   node scripts/corriger-echeance-avis.mjs --ecrire --par "Nom" --compte adresse@exemple.org
 */
import fs from "node:fs";
import { createHash } from "node:crypto";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");
const h = { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json", Prefer: "return=representation" };

const arg = (n) => {
  const i = process.argv.indexOf(n);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const ecrire = process.argv.includes("--ecrire");
const par = arg("--par");
const compte = arg("--compte");

/** Ce qui a été lu sur la pièce, et ce que la base porte à sa place. */
const CORRECTIONS = [
  {
    id: "7d9f801d-95f8-45f4-a0bc-64016cae0c5d",
    code: "CM1100001096",
    de: "2024-07-01",
    vers: "2024-05-01",
    vu: "Cameroun, 29 janvier 2024, bons à 13 semaines : la pièce imprime « CM1100001096 BTA-13 01-MAI-2024 » dans la ligne du code et « Échéance : 01er mai 2024 » dans la ligne dédiée. Quatre-vingt-treize jours après la séance, soit treize semaines. La machine avait lu le 1er juillet.",
  },
];

const faits = [];
for (const c of CORRECTIONS) {
  const [avant] = await fetch(`${U}/rest/v1/emission_notices?select=id,session_on,country,tenor,code_emission,maturity_on&id=eq.${c.id}`, { headers: h }).then((r) => r.json());
  if (!avant) {
    console.log(`✗ ${c.code} : avis introuvable`);
    continue;
  }
  if (avant.code_emission !== c.code) {
    console.log(`✗ ${c.code} : la base porte le code « ${avant.code_emission} », correction refusée`);
    continue;
  }
  if (avant.maturity_on !== c.de) {
    console.log(`· ${c.code} : échéance déjà à ${avant.maturity_on}, rien à faire`);
    continue;
  }
  const j = (d) => Math.round((Date.parse(d) - Date.parse(avant.session_on)) / 86_400_000);
  console.log(`${avant.session_on} ${avant.country} ${avant.tenor} ${c.code}`);
  console.log(`   ${c.de} (${j(c.de)} j) → ${c.vers} (${j(c.vers)} j)`);
  console.log(`   ${c.vu}`);
  if (!ecrire) continue;
  const res = await fetch(`${U}/rest/v1/emission_notices?id=eq.${c.id}`, {
    method: "PATCH",
    headers: h,
    body: JSON.stringify({ maturity_on: c.vers, updated_at: new Date().toISOString() }),
  });
  console.log(`   ${res.ok ? "✓ écrit" : "✗ " + (await res.text()).slice(0, 120)}`);
  if (res.ok) faits.push({ id: c.id, code: c.code, de: c.de, vers: c.vers, vu: c.vu });
}

if (!ecrire) {
  console.log(`\nEssai à blanc : rien n'est écrit.`);
  console.log(`Pour écrire : --ecrire --par "Nom" --compte adresse@exemple.org`);
  process.exit(0);
}
if (!par || !compte) {
  console.error(`\nRefus : « --par » et « --compte » sont obligatoires. Une correction porte un nom.`);
  process.exit(1);
}
if (!faits.length) process.exit(0);

const at = new Date().toISOString();
const dernier = await fetch(`${U}/rest/v1/audit?select=hash&order=id.desc&limit=1`, { headers: h }).then((r) => r.json());
const prevHash = dernier[0]?.hash;
const e = {
  actor: compte,
  action: "emission.notice.echeance.corrigee",
  entity: "emission_notice",
  entityId: `echeances-${at.slice(0, 10)}`,
  before: { source: "lecture automatique" },
  after: { corrigees: faits, par },
  reason:
    "Échéance corrigée sur foi de la pièce ouverte et relue : le mois avait été lu de travers, « 01 mai » pris pour le 1er juillet, ce qui donnait cent cinquante-quatre jours sur un bon à treize semaines. La garde d'échéance signalait l'écart ; un signalement n'est pas une correction, et celle-ci vient d'une lecture humaine du communiqué.",
};
const hash = createHash("sha256").update((prevHash ?? "") + JSON.stringify({ at, ...e })).digest("hex");
const trace = await fetch(`${U}/rest/v1/audit`, {
  method: "POST",
  headers: h,
  body: JSON.stringify({ at, actor: e.actor, actor_id: null, action: e.action, entity: e.entity, entity_id: e.entityId, before: e.before, after: e.after, reason: e.reason, ip: null, user_agent: null, prev_hash: prevHash ?? null, hash }),
});
console.log(`\ntrace d'audit : ${trace.ok ? "écrite" : "ÉCHEC " + (await trace.text()).slice(0, 160)}`);
