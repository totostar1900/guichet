/**
 * REMETTRE D APLOMB LES CODES HORS NORME.
 *
 * Un code CEMAC s ecrit en DOUZE caracteres : deux lettres de pays, un
 * chiffre d instrument, un caractere de duree, puis EXACTEMENT HUIT
 * CHIFFRES. Dix-sept codes n en comptent pas douze, et ils cassent le
 * rapprochement par code en silence.
 *
 * TROIS REPARATIONS, DE LA PLUS SURE A LA MOINS SURE, et chacune doit se
 * justifier seule :
 *
 *   LE TEMOIN. Un code bien forme, connu ailleurs dans la base, a un
 *   caractere pres. C est la preuve la plus forte : la meme ligne est
 *   ecrite deux fois, et l une des deux est juste. Cinq cas.
 *
 *   LA TRONCATURE. Le champ a avale ce qui suivait, « CM1100000858
 *   BTA-13 24-SEPT-2021 », ou porte un suffixe, « /MN ». Le code est
 *   alors la partie qui a la bonne forme, et rien n est devine.
 *
 *   LE ZERO DE TROP. Le bloc numerique compte neuf chiffres au lieu de
 *   huit, et son premier est un zero : le retirer preserve tous les
 *   chiffres significatifs. L inverse pour sept chiffres.
 *
 * LA TROISIEME NE SERT QUE SI ELLE REPRODUIT LES CINQ TEMOINS. Une regle
 * de forme qui se tromperait sur un cas verifiable se tromperait aussi
 * sur les autres, ou personne ne la verrait.
 *
 *   npx tsx --conditions=react-server scripts/reparer-codes-hors-norme.mjs [--ecrire]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ecrire = process.argv.includes("--ecrire");

const BIEN_FORME = /^[A-Z]{2}[0-9][0-9A-Z]\d{8}$/;

/** Le code que la forme impose, ou rien quand elle n impose rien. */
function parLaForme(code) {
  /* La troncature : le code est au debut, le reste est du texte avale. */
  const debut = code.trim().split(/\s+/)[0].replace(/\/.*$/, "");
  if (BIEN_FORME.test(debut)) return { valeur: debut, pourquoi: debut === code.trim() ? null : "le champ avait avalé ce qui suivait" };

  const m = debut.match(/^([A-Z]{2}[0-9][0-9A-Z])(\d+)$/);
  if (!m) return null;
  const [, prefixe, chiffres] = m;
  if (chiffres.length === 9 && chiffres[0] === "0") return { valeur: prefixe + chiffres.slice(1), pourquoi: "un zéro de trop en tête du bloc numérique" };
  if (chiffres.length === 7) return { valeur: `${prefixe}0${chiffres}`, pourquoi: "un zéro manquant en tête du bloc numérique" };
  return null;
}

const avis = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("emission_notices").select("id,country,session_on,instrument,tenor,code_emission,maturity_on").range(de, de + 999);
  if (error) throw new Error(error.message);
  avis.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
const resultats = await repo().listAuctionResults({ limit: 2000 });

const sains = new Set();
for (const r of resultats) if (r.codeEmission && BIEN_FORME.test(r.codeEmission)) sains.add(r.codeEmission);
for (const a of avis) if (a.code_emission && BIEN_FORME.test(a.code_emission)) sains.add(a.code_emission);

/* LES CONFUSIONS DE L OCR, dans le BLOC NUMERIQUE seulement : la lettre
   prend la place du chiffre qu elle imite. « GAZ000000026 » pour
   « GA2B00000026 » l a montre le 17 octobre, et trois codes de douze
   caracteres les portent encore, qu un controle de LONGUEUR ne pouvait pas
   voir. On ne substitue jamais a l aveugle : la valeur obtenue doit etre un
   code deja connu. */
const CONFUSIONS = { O: "0", Q: "0", D: "0", C: "0", I: "1", L: "1", S: "5", B: "8", G: "6", Z: "2" };

const parSubstitution = (code) => {
  const m = code.match(/^([A-Z]{2}[0-9][0-9A-Z])(.{8})$/);
  if (!m) return [];
  const [, prefixe, bloc] = m;
  const out = new Set();
  for (let i = 0; i < bloc.length; i++) {
    const c = CONFUSIONS[bloc[i]];
    if (!c) continue;
    out.add(prefixe + bloc.slice(0, i) + c + bloc.slice(i + 1));
  }
  return [...out];
};

const temoin = (code) => {
  const out = new Set();
  for (const c of parSubstitution(code)) if (sains.has(c)) out.add(c);
  for (let i = 0; i < code.length; i++) {
    const c = code.slice(0, i) + code.slice(i + 1);
    if (sains.has(c)) out.add(c);
  }
  for (let i = 0; i <= code.length; i++) for (const d of "0123456789") {
    const c = code.slice(0, i) + d + code.slice(i);
    if (sains.has(c)) out.add(c);
  }
  return [...out];
};

const malades = [
  ...resultats.filter((r) => r.codeEmission && !BIEN_FORME.test(r.codeEmission)).map((r) => ({ table: "auction_results", colonne: "code_emission", id: r.id, pays: r.country, seance: r.sessionOn, code: r.codeEmission })),
  ...avis.filter((a) => a.code_emission && !BIEN_FORME.test(a.code_emission)).map((a) => ({ table: "emission_notices", colonne: "code_emission", id: a.id, pays: a.country, seance: a.session_on, code: a.code_emission })),
].sort((a, b) => a.seance.localeCompare(b.seance));

/* LE CONTROLE PREALABLE : la regle de forme doit retrouver chaque temoin. */
dire(`=== LA REGLE DE FORME REPRODUIT-ELLE LES TEMOINS ? ===`);
let verifiee = 0;
let dementie = 0;
for (const m of malades) {
  const t = temoin(m.code);
  if (t.length !== 1) continue;
  const f = parLaForme(m.code);
  /* UNE ABSTENTION N EST PAS UN DEMENTI. La regle ne rend rien quand le
     caractere de trop casse le motif, « CM21L00000028 » par exemple : elle
     se tait, elle ne se trompe pas, et c est le temoin qui tranche alors.
     Confondre les deux ferait echouer le controle sur un cas ou la regle a
     eu raison de ne rien dire. */
  if (!f) {
    dire(`   ${m.code} : la forme s abstient, le témoin « ${t[0]} » tranche`);
  } else if (f.valeur === t[0]) {
    verifiee += 1;
    dire(`   ${m.code} → ${t[0]} · la forme et le témoin disent la même chose`);
  } else {
    dementie += 1;
    dire(`   ${m.code} : témoin « ${t[0]} », forme « ${f.valeur} » · DÉSACCORD`);
  }
}
if (dementie) {
  dire(`\n   ${dementie} désaccord(s) : la règle de forme n'est pas fiable, on s'arrête.`);
  process.exit(1);
}
dire(`   ${verifiee} témoin(s) reproduit(s), zéro démenti : la règle de forme peut servir aux autres.\n`);

dire(`=== CE QUI SERAIT ECRIT ===`);
const aFaire = [];
for (const m of malades) {
  const t = temoin(m.code);
  const f = parLaForme(m.code);
  let valeur = null;
  let pourquoi = null;
  if (t.length === 1) {
    valeur = t[0];
    pourquoi = "un code identique, bien formé, existe ailleurs dans la base";
  } else if (t.length > 1) {
    dire(`   ${m.seance} ${m.code} : ${t.length} témoins [${t.join(", ")}], NON TRANCHÉ, laissé`);
    continue;
  } else if (f) {
    valeur = f.valeur;
    pourquoi = f.pourquoi ?? "la forme du code l'impose";
  } else {
    dire(`   ${m.seance} ${m.code} : ni témoin ni forme, laissé`);
    continue;
  }
  aFaire.push({ ...m, valeur, pourquoi });
  dire(`   ${m.seance} ${String(m.pays).padEnd(12)} ${m.table.padEnd(17)} « ${m.code} » → « ${valeur} » · ${pourquoi}`);
}

dire(`\n=== ${aFaire.length} a reparer sur ${malades.length} ===`);
if (!ecrire) {
  dire(`\nEssai a blanc. Relancer avec --ecrire.`);
  process.exit(0);
}
let n = 0;
for (const x of aFaire) {
  const { error } = await sb.from(x.table).update({ [x.colonne]: x.valeur }).eq("id", x.id);
  if (error) dire(`   ERREUR ${x.code} : ${error.message}`);
  else n++;
}
dire(`\n=== ${n} code(s) remis d aplomb ===`);
