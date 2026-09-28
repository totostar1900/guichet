/**
 * Les avis déposés deux fois, et lequel garder.
 *
 * La table est unique sur l'adresse du document, ce qui est la bonne clef : une
 * pièce, une ligne. Mais la BEAC sert parfois le même PDF à deux adresses, son
 * gestionnaire de contenu ajoutant « -1 » au nom d'un fichier réimporté. Deux
 * adresses, deux lignes, un seul document.
 *
 * Deux pièges, tous deux rencontrés à l'essai à blanc, et tous deux auraient
 * supprimé la mauvaise ligne.
 *
 *   Le suffixe de réimportation est court, « -1 » ou « -2 ». Une première
 *   version cherchait « -<nombre>.pdf » et trouvait l'année : tout fichier
 *   nommé « …-29-janvier-2024.pdf » passait pour une copie, et le tri gardait
 *   celui qui n'en était pas une.
 *
 *   Et deux lignes qui portent le même code d'émission ne sont pas forcément le
 *   même document : le code est lu sur un scan, et une lecture peut se tromper.
 *   Le Trésor congolais a publié le 26 novembre 2024 deux communiqués nommés
 *   CG1300000730 et CG1300000740, dont nous avons lu deux fois le même code.
 *   Grouper là-dessus aurait détruit une pièce.
 *
 * Le regroupement se fait donc sur le nom du fichier, suffixe de réimportation
 * retiré : c'est la seule chose qui dise que deux adresses désignent une même
 * pièce. Ce qui partage un code sans partager un nom est signalé à part, parce
 * que c'est une lecture à reprendre et non un doublon à supprimer.
 *
 *   node scripts/avis-doublons.mjs             montre
 *   node scripts/avis-doublons.mjs --ecrire    supprime les copies
 */
import fs from "node:fs";
import { createHash } from "node:crypto";
import { toEmissionNotice } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");
const h = { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json", Prefer: "return=representation" };
const ecrire = process.argv.includes("--ecrire");

const avis = (await fetch(`${U}/rest/v1/emission_notices?select=*&limit=3000`, { headers: h }).then((r) => r.json())).map(toEmissionNotice);

/** Le suffixe « -1 », « -2 »… d'une réimportation. Court, pour ne pas confondre avec une année. */
const SUFFIXE = /-\d{1,2}\.pdf$/i;
const nomCanonique = (url) => decodeURIComponent(url).split("/").pop().replace(SUFFIXE, ".pdf");

const empreinte = (x) =>
  createHash("sha1").update(JSON.stringify([x.codeEmission, x.maturityOn, x.couponRate, x.redemption, x.nominalUnit, x.issueVolume])).digest("hex").slice(0, 8);

const groupes = new Map();
for (const x of avis) {
  const k = nomCanonique(x.sourceUrl);
  groupes.set(k, [...(groupes.get(k) ?? []), x]);
}
const doublons = [...groupes.values()].filter((g) => g.length > 1);

// Ce qui partage un code sans partager un nom : une lecture à reprendre.
const parCode = new Map();
for (const x of avis) {
  if (!x.codeEmission) continue;
  parCode.set(x.codeEmission, [...(parCode.get(x.codeEmission) ?? []), x]);
}
// Un abondement rouvre une ligne existante : deux avis d une meme ligne partagent
// son code et c est normal. Ce qui ne l est pas, c est qu ils la decrivent
// differemment.
const memeCode = [...parCode.values()].filter(
  (g) => g.length > 1 && new Set(g.map((x) => nomCanonique(x.sourceUrl))).size > 1 && new Set(g.map(empreinte)).size > 1,
);

console.log(`${avis.length} avis · ${doublons.length} même pièce à deux adresses · ${memeCode.length} codes portés par des pièces différentes\n`);

if (memeCode.length) {
  console.log(`codes partagés par des documents qui n'en disent pas la même chose (aucun n'est supprimé) :`);
  for (const g of memeCode) {
    console.log(`   ${g[0].codeEmission} ${g[0].country} ${g[0].sessionOn}`);
    for (const x of g) console.log(`      ${x.id} ${nomCanonique(x.sourceUrl)}`);
  }
  console.log();
}


const aSupprimer = [];
for (const g of doublons) {
  // L'adresse d'origine d'abord, la réimportation ensuite ; à égalité, la plus ancienne.
  const tri = [...g].sort((a, b) => Number(SUFFIXE.test(decodeURIComponent(a.sourceUrl))) - Number(SUFFIXE.test(decodeURIComponent(b.sourceUrl))) || a.createdAt.localeCompare(b.createdAt));
  const garde = tri[0];
  const jette = tri.slice(1).filter((x) => !x.confirmedBy);
  console.log(`${garde.sessionOn} ${garde.country} ${garde.instrument} ${garde.tenor ?? "—"} · ${garde.codeEmission ?? "—"}`);
  console.log(`   garder  ${garde.id} ${decodeURIComponent(garde.sourceUrl).split("/").pop()}`);
  for (const x of jette) console.log(`   jeter   ${x.id} ${decodeURIComponent(x.sourceUrl).split("/").pop()}`);
  for (const x of tri.slice(1).filter((x) => x.confirmedBy)) console.log(`   ⚠ relue par ${x.confirmedBy}, laissée en place : ${x.id}`);
  const divergent = new Set(tri.map(empreinte)).size > 1;
  if (divergent) console.log(`   ⚠ les deux lectures divergent : à regarder avant de jeter`);
  aSupprimer.push(...jette.map((x) => ({ x, garde, divergent })));
}

if (!ecrire) {
  console.log(`\nEssai à blanc : rien n'est supprimé.`);
  console.log(`Pour écrire : node scripts/avis-doublons.mjs --ecrire`);
  process.exit(0);
}

const sûrs = aSupprimer.filter((d) => !d.divergent);
if (sûrs.length !== aSupprimer.length) console.log(`\n${aSupprimer.length - sûrs.length} laissés en place parce que les deux lectures divergent.`);

const at = new Date().toISOString();
const faits = [];
for (const { x, garde } of sûrs) {
  const res = await fetch(`${U}/rest/v1/emission_notices?id=eq.${x.id}`, { method: "DELETE", headers: h });
  console.log(`${res.ok ? "✓" : "✗"} supprimé ${x.sessionOn} ${x.country} · ${x.id}`);
  if (res.ok) faits.push({ id: x.id, sourceUrl: x.sourceUrl, garde: garde.id, gardeUrl: garde.sourceUrl });
}
if (!faits.length) process.exit(0);

const dernier = await fetch(`${U}/rest/v1/audit?select=hash&order=id.desc&limit=1`, { headers: h }).then((r) => r.json());
const prevHash = dernier[0]?.hash;
const e = {
  actor: "georges.nitcheu@gmail.com",
  action: "emission.notice.doublon.supprime",
  entity: "emission_notice",
  entityId: `doublons-${at.slice(0, 10)}`,
  before: {},
  after: { supprimes: faits },
  reason:
    "La BEAC sert le même communiqué à deux adresses, son gestionnaire de contenu ajoutant « -1 » au nom d'un fichier réimporté. Le regroupement se fait sur le nom du fichier, suffixe retiré, et non sur le code d'émission, qui est lu sur un scan et peut l'être de travers. La copie est supprimée, l'adresse d'origine gardée ; aucune ligne relue par une personne n'est touchée, ni aucune dont la lecture diverge de celle qu'on garde.",
};
const hash = createHash("sha256").update((prevHash ?? "") + JSON.stringify({ at, ...e })).digest("hex");
const trace = await fetch(`${U}/rest/v1/audit`, {
  method: "POST",
  headers: h,
  body: JSON.stringify({ at, actor: e.actor, actor_id: null, action: e.action, entity: e.entity, entity_id: e.entityId, before: e.before, after: e.after, reason: e.reason, ip: null, user_agent: null, prev_hash: prevHash ?? null, hash }),
});
console.log(`\ntrace d'audit : ${trace.ok ? "écrite" : "ÉCHEC " + (await trace.text()).slice(0, 160)}`);
