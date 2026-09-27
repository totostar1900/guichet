/**
 * Lever la marque « à contrôler » sur les séances dont la pièce a été rouverte.
 *
 * Un point porte cette marque quand un champ est arrivé après la confirmation :
 * ici le coupon et l'échéance, relevés par la machine une fois les colonnes
 * créées par la migration 0046, et que la personne ayant signé la séance n'a
 * donc jamais vus. La marque ne se lève pas parce que le temps a passé : elle se
 * lève parce que quelqu'un a rouvert le communiqué et comparé champ par champ.
 *
 * Les dix communiqués ont été rouverts et les dix concordent au chiffre près.
 * Ce qui était faux n'était pas la lecture, c'était l'usage : nous actualisions
 * sur la durée annoncée au lieu de l'échéance imprimée.
 *
 * Deux conséquences pour qui exécute ce script.
 *
 *   Le rendement de quatre de ces séances a changé de plusieurs centaines de
 *   points de base. Re-signer, c'est signer le nouveau chiffre : il est donc
 *   imprimé en regard de l'ancien, et non caché derrière un décompte.
 *
 *   La signature porte un nom. Le script refuse d'écrire sans « --par » et
 *   « --compte », et range une trace d'audit chaînée sous ce compte.
 *
 *   node scripts/reconfirmer-points-verifies.mjs
 *   node scripts/reconfirmer-points-verifies.mjs --ecrire --par "Nom Prénom" --compte adresse@exemple.org
 */
import fs from "node:fs";
import { createHash } from "node:crypto";
import { auctionYield } from "../src/lib/market/yield.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

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

/**
 * Les séances rouvertes, et ce qui a été lu sur chacune.
 *
 * Le couple coupon / échéance est recopié depuis le communiqué, pas depuis la
 * base : le script vérifie ensuite que les deux disent la même chose, et refuse
 * la séance si elles divergent. Une relecture qui ferait confiance à la valeur
 * qu'elle est censée contrôler ne contrôlerait rien.
 */
const LUES = [
  { id: "d6c7f1a9-34b0-4214-b6ca-113c149e80e2", code: "CM2J00000279", coupon: 6.25, echeance: "2029-09-16", vu: "Cameroun 14 sept. 2026, 3 ans : « CM2J00000279 OTA-03 ANS 6,25% 16-SEPT-2029 », prix 96,00 partout, taux de rendement 7,77 % imprimé." },
  { id: "2b79124a-e996-45c5-b76c-eaf7cd798fd9", code: "CM2K00000136", coupon: 6.5, echeance: "2030-09-16", vu: "Cameroun 14 sept. 2026, 4 ans : « CM2K00000136 OTA-4 ANS 6,50% 16-SEPT-2030 », prix 96,00 partout, taux de rendement 7,68 % imprimé." },
  { id: "b520aa60-33f6-468b-874a-27edbd8211dd", code: "CM2B00000251", coupon: 6.75, echeance: "2031-09-16", vu: "Cameroun 14 sept. 2026, 5 ans : « CM2B00000251 OTA-05 ANS 6,75% 16-SEPT-2031 », prix 95,00 partout, taux de rendement 7,98 % imprimé. Le titre de la ligne porte « 16-SEPTEMBRE-2026 », coquille du Trésor ; le code émission donne 2031." },
  { id: "ce116db5-0844-40c4-872d-50cbc6ea4407", code: "CM2L00000135", coupon: 6.85, echeance: "2032-09-16", vu: "Cameroun 14 sept. 2026, 6 ans : « CM2L00000135 OTA-6 ANS 6,85% 16-SEPT-2032 », prix 95,00 partout, taux de rendement 7,91 % imprimé." },
  { id: "e80d8f1c-9bfe-466a-8c7b-29f903c55e0d", code: "CM2C00000128", coupon: 7, echeance: "2033-09-16", vu: "Cameroun 14 sept. 2026, 7 ans : « CM2C00000128 OTA-7 ANS 7% 16-SEPT-2033 », prix 95,00 partout, taux de rendement 8,14 % imprimé." },
  { id: "b7956d42-505a-4467-8906-a0bc94be5d9c", code: "CG2J00000578", coupon: 6.5, echeance: "2027-06-27", vu: "Congo 21 juil. 2026, 3 ans : « CG2J00000578 OTA-3 ans 6,50% 27-JUIN-2027 ». Onze mois à courir sous une étiquette de trois ans." },
  { id: "a0cf5507-895a-4783-86b3-686b521beecc", code: "CG2K00000179", coupon: 6.2, echeance: "2028-01-11", vu: "Congo 21 juil. 2026, 4 ans : « CG2K00000179 OTA-4 ans 6,20% 11-JANV-2028 », émission « par abondement » en toutes lettres. Prix max 90,00, min 93,00, limite 90,00, moyen 90,14." },
  { id: "18fbcd4e-97a3-438e-b2cb-2a3f9ce48367", code: "CG2A00000916", coupon: 5.75, echeance: "2028-06-30", vu: "Congo 28 juil. 2026, 2 ans : « CG2A00000916 OTA-2 ans 5,75% 30-JUIN-2028 ». Prix max 90,00, min 93,00, limite 90,00, moyen 90,67." },
  { id: "9211e036-a4e6-4801-be13-7ed6d53b425a", code: "CG2L00000012", coupon: 6, echeance: "2028-03-31", vu: "Congo 15 sept. 2026, 6 ans : « CG2L00000012 OTA-6 ans 6,00% 31-MARS-2028 », émission « par abondement » en toutes lettres. Dix-huit mois à courir sous une étiquette de six ans." },
  { id: "ef6db1ca-6ed9-452c-9e56-89dd46c88ed8", code: "CG2J00000875", coupon: 6, echeance: "2029-09-17", vu: "Congo 15 sept. 2026, 3 ans : « CG2J00000875 OTA-3 ans 6,00% 17-SEPT-2029 », prix 90,00 partout, un seul soumissionnaire, couverture 70 %." },
];

/** Le rendement tel qu'il était calculé sur la durée annoncée. */
const ancien = (r) => {
  const d = toAuctionResult(r);
  return auctionYield({ ...d, maturityOn: undefined })?.pct;
};

const ids = LUES.map((x) => x.id).join(",");
const rows = await fetch(`${U}/rest/v1/auction_results?select=*&id=in.(${ids})`, { headers: h }).then((r) => r.json());

const prets = [];
const refuses = [];
for (const lu of LUES) {
  const r = rows.find((x) => x.id === lu.id);
  if (!r) {
    refuses.push({ lu, pourquoi: "séance introuvable" });
    continue;
  }
  if ((r.code_emission ?? "").trim() !== lu.code) {
    refuses.push({ lu, pourquoi: `code en base « ${r.code_emission} » contre « ${lu.code} » sur la pièce` });
    continue;
  }
  if (Number(r.coupon_rate) !== lu.coupon) {
    refuses.push({ lu, pourquoi: `coupon en base ${r.coupon_rate} contre ${lu.coupon} sur la pièce` });
    continue;
  }
  if (r.maturity_on !== lu.echeance) {
    refuses.push({ lu, pourquoi: `échéance en base ${r.maturity_on} contre ${lu.echeance} sur la pièce` });
    continue;
  }
  prets.push({ lu, r, avant: ancien(r), apres: auctionYield(toAuctionResult(r))?.pct });
}

const pc = (x) => (x == null ? "  aucun" : `${x.toFixed(2).padStart(6)} %`);
console.log(`${LUES.length} séances rouvertes · ${prets.length} concordent avec leur pièce · ${refuses.length} refusées\n`);
for (const x of refuses) console.log(`✗ ${x.lu.code} : ${x.pourquoi}`);
if (refuses.length) console.log();

console.log("date       pays        durée     sur l'étiquette   sur l'échéance");
for (const { lu, r, avant, apres } of prets) {
  const bouge = avant != null && apres != null && Math.abs(avant - apres) > 0.005;
  console.log(`${r.session_on} ${r.country.padEnd(11)} ${String(r.tenor).padEnd(8)} ${pc(avant)}        ${pc(apres)} ${bouge ? `  ${(((apres ?? 0) - (avant ?? 0)) * 100).toFixed(0)} pb` : ""}`);
  console.log(`           ${lu.vu}`);
}

if (!ecrire) {
  console.log(`\nEssai à blanc : rien n'est écrit.`);
  console.log(`Pour signer : --ecrire --par "Nom Prénom" --compte adresse@exemple.org`);
  process.exit(0);
}
if (!par || !compte) {
  console.error(`\nRefus : « --par » et « --compte » sont obligatoires. Une relecture porte un nom.`);
  process.exit(1);
}

const at = new Date().toISOString();
const faits = [];
for (const { lu, r, avant, apres } of prets) {
  // On ne touche qu'à la signature. Les chiffres lus restent ceux de la pièce,
  // et un correctif de calcul n'a pas à réécrire une donnée.
  const res = await fetch(`${U}/rest/v1/auction_results?id=eq.${lu.id}`, {
    method: "PATCH",
    headers: h,
    body: JSON.stringify({ confirmed_by: par, confirmed_at: at, updated_at: at }),
  });
  console.log(`${res.ok ? "✓" : "✗"} ${r.session_on} ${r.country} ${r.tenor}`);
  if (res.ok) faits.push({ id: lu.id, code: lu.code, on: r.session_on, pays: r.country, tenor: r.tenor, vu: lu.vu, rendementAvant: avant, rendementApres: apres });
}
if (!faits.length) process.exit(0);

const dernier = await fetch(`${U}/rest/v1/audit?select=hash&order=id.desc&limit=1`, { headers: h }).then((r) => r.json());
const prevHash = dernier[0]?.hash;
const e = {
  actor: compte,
  action: "auction.result.recontrole.lot",
  entity: "auction_result",
  entityId: `recontrole-${at.slice(0, 10)}`,
  before: { marque: "à contrôler", motif: "coupon et échéance arrivés après la confirmation" },
  after: { recontrolees: faits },
  reason:
    "Les dix communiqués ont été rouverts un à un : coupon, échéance et prix concordent au chiffre près avec la base. Ce qui était faux n'était pas la lecture mais l'usage, le rendement s'actualisant sur la durée annoncée au lieu de l'échéance imprimée. Le calcul corrigé, quatre de ces séances changent de plusieurs centaines de points de base, et la signature porte désormais le chiffre exact.",
};
const hash = createHash("sha256").update((prevHash ?? "") + JSON.stringify({ at, ...e })).digest("hex");
const trace = await fetch(`${U}/rest/v1/audit`, {
  method: "POST",
  headers: h,
  body: JSON.stringify({ at, actor: e.actor, actor_id: null, action: e.action, entity: e.entity, entity_id: e.entityId, before: e.before, after: e.after, reason: e.reason, ip: null, user_agent: null, prev_hash: prevHash ?? null, hash }),
});
console.log(`\ntrace d'audit : ${trace.ok ? "écrite" : "ÉCHEC " + (await trace.text()).slice(0, 160)}`);
