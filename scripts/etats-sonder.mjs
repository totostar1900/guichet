/**
 * LES ÉTATS FINANCIERS DES ÉMETTEURS : QUE PORTENT-ILS VRAIMENT ?
 *
 * La colonne du bénéfice par action est vide sur les 4 995 lignes du bulletin,
 * et c'est elle qui bloque le ratio cours sur bénéfice. Le résultat net est
 * dans ces cinquante pièces. Avant d'écrire un lecteur, trois questions :
 * sont-elles sur le disque, ont-elles une couche texte, et le compte de
 * résultat s'y trouve-t-il sous un intitulé reconnaissable ?
 *
 * ON SONDE PLUSIEURS ÉMETTEURS ET PLUSIEURS ANNÉES, parce qu'un cabinet
 * change de gabarit et qu'un lecteur réglé sur une pièce ne lirait qu'elle.
 *
 *   npx tsx --conditions=react-server scripts/etats-sonder.mjs [motif]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const { tout } = await import("./_journal.mjs");
const { storageKey } = await import("../src/lib/intake/cle.ts");
const { pdfText } = await import("../src/lib/market/boc.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const BIBLIO = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet";

const index = new Map((await tout(sb, "library_items", "file_key, library_path")).map((x) => [x.file_key, x.library_path]));
const docs = (await tout(sb, "issuer_documents", "mnemo, kind, year, title, file_key")).filter((d) =>
  ["etats_ohada", "etats_ifrs", "rapport_semestriel", "rapport_gestion"].includes(d.kind),
);
dire(`${docs.length} pièce(s) de comptes\n`);

const motif = process.argv[2];
const choix = motif ? docs.filter((d) => `${d.mnemo} ${d.title}`.toLowerCase().includes(motif.toLowerCase())) : docs;

/* LES MOTS QU'UN COMPTE DE RÉSULTAT OHADA PORTE TOUJOURS. On ne cherche pas
   le chiffre ici, seulement le signe que la page est lisible. */
const SIGNES = [
  ["résultat net", /r[ée]sultat\s+net/i],
  ["XI RESULTAT NET", /\bXI\b[^\n]{0,40}r[ée]sultat/i],
  ["capitaux propres", /capitaux\s+propres/i],
  ["chiffre d'affaires", /chiffre\s+d.affaires/i],
  ["nombre d'actions", /nombre\s+d.actions|actions\s+en\s+circulation/i],
  ["résultat par action", /r[ée]sultat\s+par\s+action|b[ée]n[ée]fice\s+par\s+action/i],
];

let surDisque = 0;
let avecTexte = 0;
const compte = new Map();
for (const d of choix) {
  const chemin = d.file_key ? index.get(storageKey(d.file_key)) : undefined;
  if (!chemin || !fs.existsSync(`${BIBLIO}/${chemin}`)) {
    dire(`   ABSENTE   ${d.mnemo.padEnd(7)} ${String(d.year ?? "?").padEnd(5)} ${d.title.slice(0, 40)}`);
    continue;
  }
  surDisque++;
  let texte = "";
  try {
    texte = await pdfText(new Uint8Array(fs.readFileSync(`${BIBLIO}/${chemin}`)));
  } catch (e) {
    dire(`   ILLISIBLE ${d.mnemo.padEnd(7)} ${String(d.year ?? "?").padEnd(5)} ${String(e.message).slice(0, 50)}`);
    continue;
  }
  const trouves = SIGNES.filter(([, re]) => re.test(texte)).map(([nom]) => nom);
  for (const n of trouves) compte.set(n, (compte.get(n) ?? 0) + 1);
  if (texte.length > 500) avecTexte++;
  dire(
    `   ${texte.length > 500 ? "TEXTE  " : "SCAN   "} ${d.mnemo.padEnd(7)} ${String(d.year ?? "?").padEnd(5)} ${String(Math.round(texte.length / 1000)).padStart(3)} k signes · ${trouves.join(", ") || "aucun signe"}`,
  );
}

dire(`\n=== ${surDisque} sur le disque, ${avecTexte} avec une couche texte ===`);
dire(`=== CE QUE LES PIÈCES LISIBLES PORTENT ===`);
for (const [n, c] of [...compte].sort((a, b) => b[1] - a[1])) dire(`   ${n.padEnd(22)} ${c}`);
