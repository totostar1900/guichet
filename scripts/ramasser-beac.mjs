/**
 * RAMASSER LES PIÈCES PUBLIQUES DE LA BEAC, ET LES RANGER.
 *
 * Les chiffres extraits vivent en base ; ce dossier garde les documents TELS
 * QU'ILS ONT ÉTÉ PUBLIÉS. C'est la règle qui rend une mesure défendable des
 * années plus tard : quand une page du desk affiche « le Tchad a servi 82 %
 * de ce qu'il a annoncé », le communiqué qui le dit doit pouvoir être ouvert.
 *
 * TROIS PRÉCAUTIONS, ET AUCUNE N'EST DÉCORATIVE.
 *
 *   IL REPREND OÙ IL EN ÉTAIT. Un fichier déjà présent et de taille plausible
 *   n'est pas retéléchargé : neuf cents pièces ne se ramassent pas d'un trait,
 *   et la BEAC répond 502 par intermittence.
 *
 *   IL TEMPORISE. Un ramassage qui martèle une source publique finit par être
 *   coupé, et il l'aurait mérité. Une pause entre deux pièces, et trois essais
 *   espacés sur un échec.
 *
 *   IL ÉCRIT SON INVENTAIRE AU FUR ET À MESURE, avec l'empreinte de chaque
 *   pièce. Sans elle, on ne saurait pas dire si un fichier a changé depuis sa
 *   récupération, et une archive dont on ne peut rien affirmer n'est pas une
 *   archive.
 *
 *   npx tsx --conditions=react-server scripts/ramasser-beac.mjs [--essai]
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
const BEAC = `${RACINE}/1. BEAC - Marche des titres publics`;
const INVENTAIRE = `${RACINE}/9. Index/inventaire.csv`;
const essai = process.argv.includes("--essai");

const { repo } = await import("../src/lib/data/index.ts");

/* Les accents et les caractères interdits de Windows sortent du nom : un
   fichier qu'on ne peut pas ouvrir sur la machine d'un collègue n'archive
   rien.

   CE N'EST PAS storageKey, ET IL NE FAUT PAS LES UNIFIER. storageKey fabrique
   une clef d'objet Supabase : elle écrase en tirets tout ce qui n'est pas
   alphanumérique, points ou barres. Ici on fabrique un nom de fichier que
   quelqu'un va lire dans un explorateur : les espaces restent, seuls les
   caractères que Windows refuse partent, et la longueur se coupe à cent dix
   signes. Les deux partagent la chute des accents, rien de plus. */
const propre = (s) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 110);

const PAYS = { Cameroun: "Cameroun", Gabon: "Gabon", Congo: "Congo", Tchad: "Tchad", "Guinée éq.": "Guinee equatoriale", "Guinée équatoriale": "Guinee equatoriale", RCA: "RCA" };

/** Où va la pièce, et sous quel nom. */
function destination(o) {
  const an = (o.seance ?? "").slice(0, 4) || (o.titre.match(/\b(20\d{2})\b/) ?? [])[1] || "sans date";
  const pays = PAYS[o.pays] ?? null;

  if (o.genre === "calendrier") {
    const dossier = `${BEAC}/Calendriers indicatifs/${pays ?? "Zone"}`;
    return { dossier, nom: `${an} ${propre(o.titre)}.pdf` };
  }
  if (o.genre === "annonce" || o.genre === "resultats") {
    const dossier = `${BEAC}/Adjudications - ${o.genre === "annonce" ? "annonces" : "resultats"}/${pays ?? "Zone"}/${an}`;
    const quoi = [o.instrument, o.tenor].filter(Boolean).join(" ");
    const tete = o.seance ?? an;
    return { dossier, nom: `${tete} ${propre(quoi)} - ${o.genre}.pdf`.replace(/\s+/g, " ") };
  }
  return { dossier: `${BEAC}/Autres communiques/${an}`, nom: `${propre(o.titre)}.pdf` };
}

const dors = (ms) => new Promise((r) => setTimeout(r, ms));

async function prendre(url) {
  for (let essai = 0; essai < 3; essai++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0; +https://guichet.purposecapital.africa)" } });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      /* 404 : la pièce a été retirée du site. Inutile d'insister. */
      if (res.status === 404) return null;
    } catch {
      /* réseau : on réessaie */
    }
    await dors(1500 * (essai + 1));
  }
  return null;
}

const obs = await repo().dernieresObservationsBeac();
/* Le dernier état ne porte que l'url : on reprend les attributs du journal. */
const { createClient } = await import("@supabase/supabase-js");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: lignes } = await db.from("beac_observations").select("url, titre, genre, pays, instrument, tenor, seance, present").order("vu_le", { ascending: false });

const vus = new Map();
for (const l of lignes ?? []) if (!vus.has(l.url)) vus.set(l.url, l);
const lot = [...vus.values()].filter((o) => o.present);

console.log(`${obs.length} documents au journal, ${lot.length} présents à ramasser\n`);

if (essai) {
  for (const o of lot.slice(0, 12)) {
    const d = destination(o);
    console.log(`${(o.genre ?? "?").padEnd(11)} ${d.dossier.replace(BEAC, "…")}/\n              ${d.nom}`);
  }
  console.log("\nEssai à blanc. Relancer sans --essai pour ramasser.");
  process.exit(0);
}

if (!fs.existsSync(INVENTAIRE)) fs.writeFileSync(INVENTAIRE, "pris_le;genre;pays;seance;chemin;octets;sha256;url\n", "utf8");

let pris = 0;
let deja = 0;
let rates = 0;
const t0 = Date.now();

for (const [i, o] of lot.entries()) {
  const d = destination(o);
  const chemin = `${d.dossier}/${d.nom}`;
  if (fs.existsSync(chemin) && fs.statSync(chemin).size > 2048) {
    deja++;
    continue;
  }
  const buf = await prendre(o.url);
  if (!buf || buf.length < 2048) {
    rates++;
    fs.writeSync(1, `   RATÉ  ${o.url}\n`);
    continue;
  }
  fs.mkdirSync(d.dossier, { recursive: true });
  fs.writeFileSync(chemin, buf);
  const sha = createHash("sha256").update(buf).digest("hex").slice(0, 16);
  fs.appendFileSync(INVENTAIRE, `${new Date().toISOString()};${o.genre ?? ""};${o.pays ?? ""};${o.seance ?? ""};${path.relative(RACINE, chemin).replace(/\\/g, "/")};${buf.length};${sha};${o.url}\n`, "utf8");
  pris++;
  if ((pris + deja + rates) % 25 === 0) {
    const s = Math.round((Date.now() - t0) / 1000);
    fs.writeSync(1, `   ${i + 1}/${lot.length} · ${pris} pris · ${deja} déjà là · ${rates} ratés · ${s}s\n`);
  }
  await dors(400);
}

const poids = fs.existsSync(INVENTAIRE) ? fs.readFileSync(INVENTAIRE, "utf8").split("\n").slice(1).filter(Boolean).reduce((a, l) => a + Number(l.split(";")[5] ?? 0), 0) : 0;
console.log(`\n=== ${pris} pris, ${deja} déjà là, ${rates} ratés, ${Math.round((Date.now() - t0) / 1000)}s ===`);
console.log(`archive : ${(poids / 1024 / 1024).toFixed(0)} Mo`);
console.log(`→ ${RACINE}`);
