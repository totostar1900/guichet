/**
 * L ETIQUETTE CONGOLAISE : « CG1200000566 BTA-13 MAI-2022 ».
 *
 * Elle ne se reconciliait pas : un bon de treize semaines adjuge le 17
 * novembre 2021 echoit a la mi-fevrier, et l etiquette dit mai. Trois
 * pieces lisibles suffisent a comprendre, a condition de regarder le CODE
 * et non le nombre qui suit.
 *
 * LE CODE PORTE LA DUREE A SES TROISIEME ET QUATRIEME CARACTERES, comme
 * la lettre gabonaise porte celle des obligations : CG11 treize semaines,
 * CG12 vingt-six, CG13 cinquante-deux. Et la date de l etiquette le
 * confirme a chaque fois :
 *
 *   CG12 00000566, seance du 17 novembre 2021, + 26 semaines → mai 2022,
 *   et l etiquette dit MAI-2022, quand le nombre qui suit dit « 13 ».
 *   CG11 00000252, seance du 17 novembre 2021, + 13 semaines → fevrier
 *   2022, et l etiquette dit FEVR-2022, quand le nombre dit « 18 ».
 *   CG12 00000285, seance du 2 octobre 2019, + 26 semaines → avril 2020,
 *   et l etiquette dit 03-AVRIL-2020, le nombre disant « 26 ».
 *
 * LE NOMBRE DE L ETIQUETTE N EST DONC PAS LA DUREE, sauf par coincidence.
 * Or c est de lui que vient notre « tenor ». Si cela se confirme, ce n est
 * pas une echeance qui manque : ce sont des durees qui sont fausses, et
 * une duree fausse deplace la seance sur la courbe.
 *
 * ON VERIFIE LA REGLE AVANT DE S EN SERVIR, sur tous les bons de tous les
 * Tresors : la duree dite par le code contredit-elle celle que nous
 * portons, et dans quel sens ?
 *
 *   npx tsx --conditions=react-server scripts/etiquette-congolaise.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const toutes = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => r.instrument === "BTA" && r.codeEmission && !r.setAsideAt);

/* LA REGLE S ETABLIT SUR LES DONNEES, pas sur une intuition : on regarde
   ce que chaque prefixe porte comme durees, et seulement ensuite on dit
   s il en designe une. */
const parPrefixe = new Map();
for (const r of toutes) {
  const p = r.codeEmission.slice(0, 4);
  const c = parPrefixe.get(p) ?? new Map();
  c.set(r.tenor, (c.get(r.tenor) ?? 0) + 1);
  parPrefixe.set(p, c);
}
dire(`${toutes.length} bons avec un code\n`);
dire(`=== CE QUE CHAQUE PREFIXE PORTE COMME DUREES ===`);
dire(`   ${"prefixe".padEnd(9)} ${"n".padStart(4)}  durees`);
for (const [p, c] of [...parPrefixe].sort()) {
  const total = [...c.values()].reduce((a, b) => a + b, 0);
  const trie = [...c].sort((a, b) => b[1] - a[1]);
  dire(`   ${p.padEnd(9)} ${String(total).padStart(4)}  ${trie.map(([t, n]) => `${t} (${n})`).join(" · ")}`);
}

/* LA MEME CHOSE SANS LE PAYS : si le chiffre est une convention de la
   zone, les trois prefixes « x1 », « x2 », « x3 » doivent s aligner. */
dire(`\n=== LE CHIFFRE SEUL, TOUS TRESORS CONFONDUS ===`);
const parChiffre = new Map();
for (const r of toutes) {
  const d = r.codeEmission.slice(2, 4);
  const c = parChiffre.get(d) ?? new Map();
  c.set(r.tenor, (c.get(r.tenor) ?? 0) + 1);
  parChiffre.set(d, c);
}
for (const [d, c] of [...parChiffre].sort()) {
  const total = [...c.values()].reduce((a, b) => a + b, 0);
  const trie = [...c].sort((a, b) => b[1] - a[1]);
  const dominante = trie[0];
  const part = Math.round((dominante[1] / total) * 100);
  dire(`   ${d}  ${String(total).padStart(4)} bons · ${part} % en « ${dominante[0]} »${trie.length > 1 ? ` · aussi ${trie.slice(1).map(([t, n]) => `${t} (${n})`).join(", ")}` : ""}`);
}

dire(`\n=== LES DESACCORDS, PAYS PAR PAYS ===`);
/* On ne retient la duree du chiffre que si elle est franchement dominante :
   une convention qui ne tient qu a 60 % n est pas une convention. */
const duree = new Map();
for (const [d, c] of parChiffre) {
  const total = [...c.values()].reduce((a, b) => a + b, 0);
  const [t, n] = [...c].sort((a, b) => b[1] - a[1])[0];
  if (n / total >= 0.8) duree.set(d, t);
}
dire(`   convention retenue : ${[...duree].map(([d, t]) => `${d} = ${t}`).join(" · ")}\n`);
const parPays = new Map();
for (const r of toutes) {
  const d = r.codeEmission.slice(2, 4);
  const attendue = duree.get(d);
  if (!attendue) continue;
  const c = parPays.get(r.country) ?? { n: 0, faux: [] };
  c.n += 1;
  if (String(r.tenor) !== String(attendue)) c.faux.push({ r, attendue });
  parPays.set(r.country, c);
}
for (const [p, c] of [...parPays].sort()) {
  dire(`   ${p.padEnd(13)} ${String(c.faux.length).padStart(3)} desaccord(s) sur ${c.n}`);
  for (const x of c.faux.slice(0, 8)) dire(`      ${x.r.sessionOn} ${x.r.codeEmission} · nous portons « ${x.r.tenor} », le code dit « ${x.attendue} »`);
  if (c.faux.length > 8) dire(`      … et ${c.faux.length - 8} autres`);
}
