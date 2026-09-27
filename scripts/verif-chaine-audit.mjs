/**
 * La chaîne d'audit se vérifie maillon par maillon, sur toute sa longueur.
 *
 * Santé le fait aussi, mais sur une tranche et derrière une session : une
 * écriture faite depuis un script doit pouvoir se vérifier depuis un script, et
 * sur la suite entière plutôt que sur les dernières lignes.
 *
 * Ce qui se vérifie est le chaînage : le « prev_hash » d'une ligne est le
 * « hash » de celle qui la précède. Retirer, insérer ou réordonner une ligne
 * casse la suite, et c'est tout le procédé.
 *
 * Ce qui ne se vérifie pas ici est le contenu. L'empreinte porte sur
 * JSON.stringify({ at, ...e }), donc sur l'ordre des clefs de l'objet tel que
 * l'appelant l'a construit, et cet ordre ne se retrouve pas depuis des colonnes
 * SQL. Une première version de ce script recalculait les empreintes et
 * annonçait une trentaine de maillons cassés, dont des lignes de la semaine
 * précédente auxquelles personne n'avait touché : elle mesurait l'ordre des
 * clefs et non l'intégrité. Une fausse alerte sur ce signal-là est pire que pas
 * de signal, puisqu'elle apprend au desk à l'ignorer.
 *
 *   node scripts/verif-chaine-audit.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");
const h = { apikey: K, Authorization: `Bearer ${K}` };

const lignes = [];
for (let de = 0; ; de += 1000) {
  const lot = await fetch(`${U}/rest/v1/audit?select=id,at,action,actor,prev_hash,hash&order=id.asc&offset=${de}&limit=1000`, { headers: h }).then((r) => r.json());
  lignes.push(...lot);
  if (lot.length < 1000) break;
}

const cassures = [];
const vus = new Map();
for (const [i, l] of lignes.entries()) {
  const attendu = i === 0 ? null : lignes[i - 1].hash;
  if ((l.prev_hash ?? null) !== attendu) cassures.push({ ...l, attendu });
  // Deux lignes portant la même empreinte signeraient un rejeu.
  if (vus.has(l.hash)) cassures.push({ ...l, attendu: `déjà vu en ${vus.get(l.hash)}` });
  vus.set(l.hash, l.id);
}

console.log(`${lignes.length} entrées · ${cassures.length ? `${cassures.length} maillons cassés` : "chaînage intact de bout en bout"}`);
for (const c of cassures.slice(0, 10)) console.log(`   ✗ ${c.id} ${c.at} ${c.action}`);
console.log(`\nles trois dernières :`);
for (const l of lignes.slice(-3)) console.log(`   ${l.at} · ${l.action} · ${l.actor}`);
