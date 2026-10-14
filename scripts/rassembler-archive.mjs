/**
 * RASSEMBLER TOUTES LES PIÈCES DANS LA BIBLIOTHÈQUE PARTAGÉE.
 *
 * Les documents vivent aujourd'hui à deux endroits qui ne se connaissent pas :
 * le dépôt Supabase, que le produit lit, et la bibliothèque OneDrive, qui ne
 * portait que la BEAC. Les 814 bulletins de la cote et les 60 pièces
 * d'émetteurs n'y étaient pas du tout.
 *
 * CE SCRIPT COPIE, IL NE DÉPLACE PAS. Rien ne quitte Supabase : le robot relit
 * les bulletins chaque fois qu'une version du lecteur monte, et sept cent
 * soixante-sept lignes ont été retrouvées ainsi le 14 octobre 2026. Couper cet
 * accès avant d'avoir un chemin machine vers OneDrive casserait la seule
 * mécanique qui répare la série.
 *
 * DEUX FAMILLES NE PARTENT PAS, ET C'EST UNE DÉCISION, PAS UN OUBLI :
 *
 *   les pièces d'identité des clients (« kyc ») et leur courrier. Une
 *   bibliothèque partagée est lue par toute la maison ; une pièce d'identité
 *   ne s'y range pas parce qu'elle tiendrait dans le dossier. Elles restent où
 *   l'accès se contrôle ligne par ligne.
 *
 *   les documents que le Guichet a produits (« docs »), qui se régénèrent à
 *   l'identique depuis la base et ne sont donc pas des pièces de source.
 *
 * LE NOM EST CELUI QU'UN HUMAIN CHERCHE. Une clef de dépôt, « boc/2354.pdf »,
 * ne se trouve pas dans un explorateur : le bulletin prend son numéro ET sa
 * date, l'émetteur prend son nom.
 *
 *   npx tsx --conditions=react-server scripts/rassembler-archive.mjs [--essai]
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const RACINE = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet/1. Donnees de marche";
const INVENTAIRE = `${RACINE}/9. Index/inventaire.csv`;
const essai = process.argv.includes("--essai");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const propre = (s) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 110);

/* Ce que le bulletin et l'émetteur s'appellent vraiment, pour que le nom de
   fichier dise de quoi il s'agit. */
const bulletins = new Map();
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from("market_bulletins").select("file_key, session_date, number").range(de, de + 999);
  for (const b of data ?? []) if (b.file_key) bulletins.set(b.file_key, b);
  if ((data ?? []).length < 1000) break;
}
const emetteurs = new Map();
for (const t of ["issuer_documents"]) {
  const { data } = await sb.from(t).select("*").limit(2000);
  for (const d of data ?? []) if (d.file_key) emetteurs.set(d.file_key, d);
}

/** Où va la pièce, et sous quel nom qu'un humain retrouve. */
function destination(cle) {
  if (cle.startsWith("boc/")) {
    const b = bulletins.get(cle);
    const an = b?.session_date?.slice(0, 4) ?? "sans date";
    const nom = b ? `BOC ${b.number ?? "sans numero"} du ${b.session_date}.pdf` : `${propre(path.basename(cle))}`;
    return { dossier: `${RACINE}/2. BVMAC - Bulletin officiel de la cote/${an}`, nom };
  }
  if (cle.startsWith("issuers/")) {
    const d = emetteurs.get(cle);
    const qui = propre(d?.mnemo ?? cle.split("/")[1] ?? "Inconnu");
    /* Le titre seul fait se heurter deux fiches du même émetteur d'années
       différentes : l'année est ce qui les sépare, et elle est en colonne. */
    const nom = propre([d?.year, d?.title].filter(Boolean).join(" ")) || path.basename(cle);
    return { dossier: `${RACINE}/3. Emetteurs - fiches et prospectus/${qui}`, nom: nom.toLowerCase().endsWith(".pdf") ? nom : `${nom}.pdf` };
  }
  return null;
}

/**
 * DEUX PIÈCES, UN SEUL NOM : LA LEÇON DU RAMASSAGE BEAC, OÙ 22 DOCUMENTS
 * N'ONT JAMAIS ÉTÉ PRIS PARCE QUE LE PREMIER OCCUPAIT LEUR CHEMIN.
 *
 * Ici quatre documents de la BANGE s'appellent « Document » et deux états
 * financiers de la SAFACAM portent le même titre. Le titre ne les distingue
 * pas ; le nom du fichier chez la source, lui, est unique et se lit, ce qui
 * vaut mieux qu'une empreinte. Le premier par ordre de clef garde le nom nu,
 * pour que deux passages rendent les mêmes chemins.
 */
function distinguer(lot) {
  const parChemin = new Map();
  for (const o of lot) {
    const d = destination(o.cle);
    if (!d) continue;
    const c = `${d.dossier}/${d.nom}`;
    parChemin.set(c, [...(parChemin.get(c) ?? []), o.cle]);
  }
  const marque = new Map();
  for (const [, cles] of parChemin) {
    if (cles.length < 2) continue;
    for (const cle of [...cles].sort().slice(1)) marque.set(cle, propre(path.basename(cle, path.extname(cle))).slice(0, 40));
  }
  return marque;
}

const nomFinal = (cle, marque) => {
  const d = destination(cle);
  if (!d) return null;
  const m = marque.get(cle);
  return { dossier: d.dossier, nom: m ? d.nom.replace(/\.pdf$/i, ` - ${m}.pdf`) : d.nom };
};

/* Les préfixes qui partent, et ceux qui restent. Le silence serait une faute :
   on dit ce qu'on laisse. */
const PREND = ["boc", "issuers"];
const LAISSE = { kyc: "pièces d'identité : une bibliothèque partagée n'est pas le bon endroit", courrier: "courrier de clients : même raison", docs: "documents produits par le Guichet : ils se régénèrent depuis la base", beac: "déjà rassemblés par ramasser-beac.mjs" };

async function parcourir(prefixe, profondeur = 0) {
  const out = [];
  for (let de = 0; ; de += 100) {
    const { data, error } = await sb.storage.from("sources").list(prefixe, { limit: 100, offset: de });
    if (error) break;
    for (const o of data ?? []) {
      const chemin = prefixe ? `${prefixe}/${o.name}` : o.name;
      if (o.id === null && profondeur < 4) out.push(...(await parcourir(chemin, profondeur + 1)));
      else if (o.id) out.push({ cle: chemin, octets: o.metadata?.size ?? 0 });
    }
    if ((data ?? []).length < 100) break;
  }
  return out;
}

const lot = [];
for (const p of PREND) lot.push(...(await parcourir(p)));
dire(`${lot.length} pièce(s) à rassembler, ${(lot.reduce((a, o) => a + o.octets, 0) / 1024 / 1024).toFixed(0)} Mo`);
for (const [p, pourquoi] of Object.entries(LAISSE)) dire(`   « ${p} » reste au dépôt : ${pourquoi}`);
dire(``);

const marque = distinguer(lot);

if (essai) {
  for (const o of lot.slice(0, 10)) {
    const d = nomFinal(o.cle, marque);
    dire(`   ${o.cle}\n      → ${d ? `${d.dossier.replace(RACINE, "…")}/${d.nom}` : "SANS DESTINATION"}`);
  }
  /* Deux pièces qui veulent le même nom, c'est une archive qui se croit
     complète : la leçon du ramassage BEAC, 22 pièces jamais prises. */
  const chemins = new Map();
  for (const o of lot) {
    const d = nomFinal(o.cle, marque);
    if (d) chemins.set(`${d.dossier}/${d.nom}`, (chemins.get(`${d.dossier}/${d.nom}`) ?? 0) + 1);
  }
  const heurtes = [...chemins.entries()].filter(([, n]) => n > 1);
  for (const [c, n] of heurtes) dire(`   HEURT (${n}) ${c.replace(RACINE, "…")}`);
  dire(`\n   ${chemins.size} chemin(s) distinct(s) pour ${lot.length} pièce(s)${heurtes.length ? `  ← ${heurtes.length} CHEMIN(S) RÉCLAMÉ(S) DEUX FOIS` : ", aucune collision"}`);
  dire(`\nEssai à blanc. Relancer sans --essai pour rassembler.`);
  process.exit(0);
}

if (!fs.existsSync(INVENTAIRE)) fs.writeFileSync(INVENTAIRE, "pris_le;genre;pays;seance;chemin;octets;sha256;url\n", "utf8");

let pris = 0, deja = 0, rates = 0;
const t0 = Date.now();
for (const [i, o] of lot.entries()) {
  const d = nomFinal(o.cle, marque);
  if (!d) { rates++; dire(`   SANS DESTINATION  ${o.cle}`); continue; }
  const chemin = `${d.dossier}/${d.nom}`;
  if (fs.existsSync(chemin) && fs.statSync(chemin).size > 2048) { deja++; continue; }
  const { data, error } = await sb.storage.from("sources").download(o.cle);
  if (error || !data) { rates++; dire(`   RATÉ  ${o.cle} : ${error?.message ?? "vide"}`); continue; }
  const buf = Buffer.from(await data.arrayBuffer());
  fs.mkdirSync(d.dossier, { recursive: true });
  fs.writeFileSync(chemin, buf);
  const sha = createHash("sha256").update(buf).digest("hex").slice(0, 16);
  fs.appendFileSync(INVENTAIRE, `${new Date().toISOString()};${o.cle.split("/")[0]};;;${path.relative(RACINE, chemin).replace(/\\/g, "/")};${buf.length};${sha};supabase:sources/${o.cle}\n`, "utf8");
  pris++;
  if ((pris + deja + rates) % 50 === 0) dire(`   ${i + 1}/${lot.length} · ${pris} pris · ${deja} déjà là · ${rates} ratés · ${Math.round((Date.now() - t0) / 1000)}s`);
}

/* Le compte se vérifie sur le disque, jamais sur l'addition des compteurs. */
let surDisque = 0;
for (const o of lot) {
  const d = nomFinal(o.cle, marque);
  if (d && fs.existsSync(`${d.dossier}/${d.nom}`)) surDisque++;
}
dire(`\n=== ${pris} pris, ${deja} déjà là, ${rates} ratés, ${Math.round((Date.now() - t0) / 1000)}s ===`);
dire(`${surDisque} des ${lot.length} pièces sont sur le disque${surDisque < lot.length ? `  ← IL EN MANQUE ${lot.length - surDisque}` : ""}`);
dire(`\nRIEN N'A ÉTÉ SUPPRIMÉ DU DÉPÔT : le robot relit les bulletins à chaque montée du lecteur.`);
