/**
 * DEUX MODÈLES SUR LA MÊME PIÈCE, ET LE PRIX À CÔTÉ DE LA QUALITÉ.
 *
 * Soixante-quatorze rapports restent à lire, et la question n'est pas
 * « combien ça coûte » mais « combien ça coûte POUR QUELLE LECTURE ». Ces
 * rapports sont des tableaux propres et réguliers, pas des scans de travers :
 * un modèle plus petit les lit peut-être aussi bien.
 *
 * ON NE LE SUPPOSE PAS, ON LE MESURE, et l'instrument est celui qu'on emploie
 * déjà pour le lecteur de bulletins : LES DEUX LECTURES SUR LE MÊME TEXTE.
 * Treize rapports sont déjà lus par le grand modèle et leurs lignes sont en
 * base : on fait relire les mêmes pièces par le petit, et on compare ligne à
 * ligne, sans rien écrire.
 *
 * CE QUI COMPTE N'EST PAS « COMBIEN DE LIGNES » MAIS « LES MÊMES LIGNES ».
 * Un modèle qui en rend autant mais confond deux colonnes de montants coûte
 * bien plus cher que l'écart de facture : il faudrait tout reprendre, et on
 * ne saurait pas quoi.
 *
 *   npx tsx --conditions=react-server scripts/haiku-contre-opus.mjs [n] [modele]
 */
import fs from "node:fs";
import path from "node:path";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { createClient } = await import("@supabase/supabase-js");
const { lireRapportHebdomadaire } = await import("../src/lib/market/rapport-hebdomadaire.ts");
const { nomDeFichier } = await import("../src/lib/intake/bibliotheque.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const BEAC = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet/1. Donnees de marche/1. BEAC - Marche des titres publics";
const combien = Number(process.argv[2] ?? 3);
const petit = process.argv[3] ?? "claude-haiku-5-5";
const MARQUE = /\s\[[0-9a-f]{6}\]$/;

/* Les pièces déjà lues par le grand modèle, et ce qu'il en a tiré. */
const lignes = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("treasury_operations").select("*").not("source_rapport_url", "is", null).range(de, de + 999);
  if (error) throw new Error(error.message);
  lignes.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
const parRapport = new Map();
for (const l of lignes) parRapport.set(l.source_rapport_url, [...(parRapport.get(l.source_rapport_url) ?? []), l]);
dire(`${parRapport.size} rapport(s) déjà lus par le grand modèle, ${lignes.length} ligne(s)\n`);

const obs = [];
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from("beac_observations").select("url, titre").range(de, de + 999);
  obs.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
const fichierDe = new Map();
function trouver(d) {
  if (!fs.existsSync(d)) return [];
  const out = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = `${d}/${e.name}`;
    if (e.isDirectory()) out.push(...trouver(p));
    else if (/rapport/i.test(e.name) && /valeurs/i.test(e.name) && e.name.toLowerCase().endsWith(".pdf")) out.push(p);
  }
  return out;
}
const surDisque = trouver(BEAC);
for (const o of obs) {
  const n = nomDeFichier(o.titre);
  const f = surDisque.find((p) => path.basename(p, ".pdf").replace(MARQUE, "") === n);
  if (f) fichierDe.set(o.url, f);
}

/** La clef d'une ligne : ce qui l'identifie, pas ce qu'elle vaut. */
const clef = (pays, code, op) => `${pays}|${(code ?? "").trim().toUpperCase()}|${op}`;
const pres = (a, b) => a == null && b == null ? true : a == null || b == null ? false : Math.abs(Number(a) - Number(b)) <= Math.max(1, Math.abs(Number(a)) * 1e-6);

let nPieces = 0, nMemes = 0, nEnPlus = 0, nManquantes = 0, nDivergentes = 0;
let jetonsE = 0, jetonsS = 0;
const exemples = [];

for (const [url, attendues] of [...parRapport.entries()].slice(0, combien)) {
  const f = fichierDe.get(url);
  if (!f) {
    dire(`   pièce introuvable sur le disque : ${url.slice(-60)}`);
    continue;
  }
  let r;
  try {
    r = await lireRapportHebdomadaire(fs.readFileSync(f).toString("base64"), petit);
  } catch (e) {
    dire(`   ÉCHEC ${petit} : ${String(e.message).slice(0, 150)}`);
    break;
  }
  nPieces++;
  jetonsE += r.jetons.entree;
  jetonsS += r.jetons.sortie;

  const a = new Map(attendues.map((x) => [clef(x.pays, x.code_emission ?? x.code_enchere, x.operation), x]));
  const b = new Map(r.lignes.map((x) => [clef(x.pays, x.codeEmission ?? x.codeEnchere, x.operation), x]));
  let memes = 0, divergentes = 0;
  for (const [k, g] of a) {
    const p = b.get(k);
    if (!p) continue;
    /* ON COMPARE LES DEUX MONTANTS, pas seulement le réalisé : confondre le
       prévu et le réalisé est précisément l'erreur qu'un petit modèle peut
       faire sans que le nombre de lignes le trahisse. */
    const ok = pres(g.montant, p.montantPrevu) && pres(g.montant_realise, p.montantRealise) && pres(g.taux_souscription, p.tauxSouscription) && pres(g.taux_prix_moyen, p.tauxPrixMoyen);
    if (ok) memes++;
    else {
      divergentes++;
      if (exemples.length < 8) {
        exemples.push(
          `${k}\n         grand : prévu ${g.montant} · réalisé ${g.montant_realise} · souscr ${g.taux_souscription} · moyen ${g.taux_prix_moyen}\n         petit : prévu ${p.montantPrevu} · réalisé ${p.montantRealise} · souscr ${p.tauxSouscription} · moyen ${p.tauxPrixMoyen}`,
        );
      }
    }
  }
  const enPlus = [...b.keys()].filter((k) => !a.has(k)).length;
  const manquantes = [...a.keys()].filter((k) => !b.has(k)).length;
  nMemes += memes;
  nDivergentes += divergentes;
  nEnPlus += enPlus;
  nManquantes += manquantes;
  dire(`   ${path.basename(f).slice(0, 54).padEnd(54)} grand ${String(attendues.length).padStart(3)} · petit ${String(r.lignes.length).padStart(3)} · identiques ${String(memes).padStart(3)} · divergentes ${divergentes} · manquantes ${manquantes} · en trop ${enPlus}`);
}

dire(`\n=== ${petit} CONTRE LE GRAND MODÈLE, SUR ${nPieces} PIÈCE(S) ===`);
dire(`   lignes retrouvées à l'identique   ${nMemes}`);
dire(`   lignes retrouvées mais DIFFÉRENTES ${nDivergentes}`);
dire(`   lignes que le petit n'a pas vues   ${nManquantes}`);
dire(`   lignes que le petit invente        ${nEnPlus}`);
dire(`   jetons : ${jetonsE} en entrée, ${jetonsS} en sortie`);
const total = nMemes + nDivergentes + nManquantes;
dire(`\n   fidélité : ${total ? ((100 * nMemes) / total).toFixed(1) : "?"} %`);
dire(`\n   LE SEUIL N EST PAS UN POURCENTAGE : une seule ligne où le prévu et le`);
dire(`   réalisé sont intervertis suffit à refuser, parce qu'elle ne se verrait`);
dire(`   pas ensuite et fausserait un encours.`);
if (exemples.length) {
  dire(`\n   les divergences :`);
  for (const x of exemples) dire(`      ${x}`);
}
