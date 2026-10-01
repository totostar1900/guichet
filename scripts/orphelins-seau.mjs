/**
 * Ce que le seau « sources » garde et que plus rien ne désigne.
 *
 * POURQUOI CE SCRIPT IMPORTE `storageKey` AU LIEU DE LA RECOPIER. Cette
 * fonction normalise en NFD et RETIRE LES ACCENTS avant de remplacer les
 * caractères interdits. Une mesure qui ne fait que la seconde moitié déclare
 * orphelin tout fichier dont la clef porte un accent : « Communiqué » en base
 * contre « Communique » dans le seau. Le 2026-10-02, une mesure écrite en SQL a
 * compté 390 orphelins et 214 Mo dans la famille `beac` pour cette seule raison.
 * Le compte réel était 54. Une copie de cette fonction est un piège qui se
 * referme des mois plus tard, sur une suppression.
 *
 * ET LE GARDE-FOU, qui vaut plus que la mesure. Si l'appariement tombe sous la
 * moitié des objets, le script s'arrête sans rien déclarer : une rupture de
 * convention de nommage ressemble exactement à « tout est orphelin », et c'est
 * précisément le moment où il ne faut surtout pas supprimer.
 *
 * Il NE SUPPRIME RIEN. Il mesure, il nomme, et il laisse décider.
 *
 *   node scripts/orphelins-seau.mjs
 */
import fs from "node:fs";
import { storageKey } from "../src/lib/intake/cle.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");
const h = { apikey: K, Authorization: `Bearer ${K}` };

/** Les six colonnes et les deux tableaux JSON qui désignent un fichier du seau. */
const SOURCES = [
  ["auction_results", "file_key"],
  ["emission_notices", "file_key"],
  ["market_bulletins", "file_key"],
  ["issuer_documents", "file_key"],
  ["documents", "file_key"],
  ["intake_items", "file_name"],
];
const TABLEAUX = [
  ["offers", "documents"],
  ["client_files", "documents"],
];

const designees = new Set();
const ajouter = (x) => {
  if (typeof x === "string" && x.trim()) designees.add(storageKey(x.trim()));
};

for (const [table, colonne] of SOURCES) {
  const lignes = await fetch(`${U}/rest/v1/${table}?select=${colonne}&limit=5000`, { headers: h }).then((r) => r.json());
  for (const l of lignes) ajouter(l[colonne]);
}
for (const [table, colonne] of TABLEAUX) {
  const lignes = await fetch(`${U}/rest/v1/${table}?select=${colonne}&limit=5000`, { headers: h }).then((r) => r.json());
  for (const l of lignes) for (const d of l[colonne] ?? []) ajouter(d?.fileKey);
}

/** Le seau se parcourt dossier par dossier : « list » ne descend pas tout seul. */
const objets = [];
const parcourir = async (prefixe) => {
  for (let de = 0; ; de += 1000) {
    const page = await fetch(`${U}/storage/v1/object/list/sources`, {
      method: "POST",
      headers: { ...h, "content-type": "application/json" },
      body: JSON.stringify({ prefix: prefixe, limit: 1000, offset: de }),
    }).then((r) => r.json());
    if (!Array.isArray(page)) throw new Error(`liste « ${prefixe} » : ${JSON.stringify(page).slice(0, 160)}`);
    for (const f of page) {
      const chemin = prefixe ? `${prefixe}/${f.name}` : f.name;
      if (f.id === null) await parcourir(chemin);
      else objets.push({ nom: chemin, octets: f.metadata?.size ?? 0 });
    }
    if (page.length < 1000) break;
  }
};
await parcourir("");

const apparies = objets.filter((o) => designees.has(o.nom));
console.log(`${designees.size} clef(s) désignée(s) · ${objets.length} objet(s) dans le seau · ${apparies.length} apparié(s)\n`);

/* LE GARDE-FOU : une rupture de nommage ressemble à « tout est orphelin ». */
if (apparies.length < objets.length / 2) {
  console.log("ARRÊT : moins de la moitié des objets sont appariés.");
  console.log("Une convention de nommage a probablement changé. Rien n'est déclaré orphelin.");
  process.exit(1);
}

const orphelins = objets.filter((o) => !designees.has(o.nom));
const familles = {};
for (const o of orphelins) {
  const f = o.nom.includes("/") ? o.nom.split("/")[0] : "(racine)";
  familles[f] ??= { n: 0, octets: 0, exemples: [] };
  familles[f].n += 1;
  familles[f].octets += o.octets;
  if (familles[f].exemples.length < 3) familles[f].exemples.push(o.nom);
}

const total = orphelins.reduce((s, o) => s + o.octets, 0);
console.log(`${orphelins.length} orphelin(s), ${(total / 1024 / 1024).toFixed(1)} Mo\n`);
for (const [f, d] of Object.entries(familles).sort((a, b) => b[1].octets - a[1].octets)) {
  console.log(`${f} · ${d.n} fichier(s) · ${(d.octets / 1024 / 1024).toFixed(1)} Mo`);
  for (const e of d.exemples) console.log(`    ${e}`);
}
if (!orphelins.length) console.log("aucun orphelin : tout ce que le seau garde est désigné.");
