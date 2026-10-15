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
const { cheminBeac, marquesDeCollision } = await import("../src/lib/intake/bibliotheque.ts");
const BIBLIO = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet";

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

/**
 * DEUX PIÈCES, UN SEUL NOM : CE QUE L'ARCHIVE CROYAIT AVOIR.
 *
 * Le nom d'une adjudication est bâti sur la date, l'instrument et la durée, et
 * perd ce qui distingue deux pièces du même jour : l'échéance, le coupon, le
 * code d'émission. Le Gabon a servi quatre BTA à 13 semaines le 22 juillet
 * 2026 ; un seul fichier est descendu, et les trois autres ont vu le premier,
 * conclu « déjà là » et ne sont jamais venus. Le compte-rendu annonçait alors
 * 987 pièces sur 987 quand le disque en portait 965.
 *
 * UNE ARCHIVE QUI SE CROIT COMPLÈTE EST PIRE QU'UNE ARCHIVE TROUÉE : personne
 * ne va chercher ce qu'elle affirme détenir. Mesuré le 14 octobre 2026 :
 * 19 chemins réclamés par plusieurs documents, 22 pièces jamais prises.
 *
 * LA SEULE CLEF QUI DISTINGUE À COUP SÛR EST L'ADRESSE, parce que deux de ces
 * pièces portent un titre rigoureusement identique. Le premier par ordre
 * d'adresse garde le nom nu, pour que les 965 fichiers déjà rangés ne bougent
 * pas ; les suivants prennent six signes de leur empreinte. Le choix ne dépend
 * donc pas de l'ordre de passage du robot, et deux ramassages rendent les
 * mêmes noms.
 */
/** La règle des collisions vit elle aussi dans `bibliotheque.ts`. */
function nomsDistincts(lot) {
  /* SUR LE LOT COMPLET : une marque calculee sur un sous-ensemble designe un
     autre fichier. */
  return marquesDeCollision(lot, cheminBeac, age);
}
/** Où va la pièce, et sous quel nom. */
/**
 * LA RÈGLE DE RANGEMENT VIT DANS `bibliotheque.ts`, PLUS ICI.
 *
 * Trois outils la calculaient chacun de son côté, et c'est ainsi qu'on range
 * au même endroit par deux chemins différents : 22 communiqués jamais
 * descendus, deux images écrasées, et 81 tableaux de bord qui seraient
 * revenus dans « Autres communiqués » au prochain passage parce que le
 * ramasseur ignorait le dossier que le lecteur leur avait donné.
 */
function destination(o) {
  const chemin = cheminBeac(o);
  const i = chemin.lastIndexOf("/");
  return { dossier: `${BIBLIO}/${chemin.slice(0, i)}`, nom: chemin.slice(i + 1) };
}

const dors = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * UNE ADRESSE ACCENTUÉE N'EST PAS UNE ADRESSE.
 *
 * La BEAC publie « Communiqué-des-résultats-OTA2ANS-220726_GABON.pdf » : le
 * chemin porte des « é » que le journal garde tels quels et que `fetch` envoie
 * tels quels, ce que le serveur refuse. Onze pièces sur 987 ont échoué ainsi
 * le 14 octobre 2026, et toutes les onze portaient un accent. On réessaie donc
 * la forme encodée, qui est la même adresse écrite comme le protocole l'exige.
 */
const formes = (url) => (url === encodeURI(url) ? [url] : [url, encodeURI(url)]);

async function prendre(url) {
  for (let essai = 0; essai < 3; essai++) {
    for (const forme of formes(url)) {
    try {
      const res = await fetch(forme, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0; +https://guichet.purposecapital.africa)" } });
        if (res.ok) return Buffer.from(await res.arrayBuffer());
        /* 404 sur la SEULE forme possible : la pièce a été retirée du site, et
           insister ne la fera pas revenir. Quand il y a deux écritures de la
           même adresse, un 404 sur la première ne prouve rien. */
        if (res.status === 404 && formes(url).length === 1) return null;
      } catch {
        /* réseau : on réessaie */
      }
    }
    await dors(1500 * (essai + 1));
  }
  return null;
}

const obs = await repo().dernieresObservationsBeac();
/* Le dernier état ne porte que l'url : on reprend les attributs du journal.
 *
 * ET PAR LE LOT PARTAGÉ, PAS PAR UNE REQUÊTE À SOI.
 *
 * Celle d'ici n'était pas paginée, donc plafonnée à mille lignes quand le
 * journal en porte 1 347, et elle filtrait sur `present` avant de calculer
 * les marques de collision : deux ensembles différents, donc deux noms pour
 * le même fichier, c'est-à-dire la panne que `_journal.mjs` existe pour
 * empêcher. On calcule les marques sur TOUT le lot, et on ne télécharge que
 * ce qui est présent. */
const { createClient } = await import("@supabase/supabase-js");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { lotDuJournal, placesInscrites, anciennetePar, empreintesDeLInventaire } = await import("./_journal.mjs");
const complet = await lotDuJournal(db);
/* LA PLACE ENREGISTREE DEPARTAGE DEUX PIECES DE MEME NOM : voir `_journal.mjs`. */
const age = anciennetePar(await placesInscrites(db, complet), cheminBeac, BIBLIO, empreintesDeLInventaire(BIBLIO));
const lot = complet.filter((o) => o.present);

console.log(`${obs.length} documents au journal, ${lot.length} présents à ramasser\n`);

if (essai) {
  const vu = nomsDistincts(complet);
  for (const o of lot.slice(0, 12)) {
    const d = destination(o);
    console.log(`${(o.genre ?? "?").padEnd(11)} ${d.dossier.replace(BEAC, "…")}/\n              ${vu.get(o.url) ? d.nom.replace(/\.pdf$/i, ` [${vu.get(o.url)}].pdf`) : d.nom}`);
  }
  console.log(`\n${vu.size} pièce(s) portent une marque, faute d'un nom qui les distingue.`);
  console.log("Essai à blanc. Relancer sans --essai pour ramasser.");
  process.exit(0);
}

if (!fs.existsSync(INVENTAIRE)) fs.writeFileSync(INVENTAIRE, "pris_le;genre;pays;seance;chemin;octets;sha256;url\n", "utf8");

let pris = 0;
let deja = 0;
let rates = 0;
const t0 = Date.now();

const distinct = nomsDistincts(complet);

for (const [i, o] of lot.entries()) {
  const d = destination(o);
  const marque = distinct.get(o.url);
  const chemin = `${d.dossier}/${marque ? d.nom.replace(/\.pdf$/i, ` [${marque}].pdf`) : d.nom}`;
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
/* LE COMPTE SE VÉRIFIE SUR LE DISQUE, jamais sur l'addition des compteurs :
   c'est précisément une addition de compteurs qui annonçait 987 sur 987 quand
   le disque en portait 965. */
let surDisque = 0;
for (const o of lot) {
  const d = destination(o);
  const m = distinct.get(o.url);
  if (fs.existsSync(`${d.dossier}/${m ? d.nom.replace(/\.pdf$/i, ` [${m}].pdf`) : d.nom}`)) surDisque++;
}
console.log(`${surDisque} des ${lot.length} pièces du journal sont sur le disque${surDisque < lot.length ? `  ← IL EN MANQUE ${lot.length - surDisque}` : ""}`);
console.log(`→ ${RACINE}`);
