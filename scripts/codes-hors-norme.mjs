/**
 * LES DIX-SEPT CODES HORS NORME.
 *
 * Un code d emission CEMAC compte DOUZE caracteres : deux lettres de pays,
 * un chiffre d instrument, un caractere de duree, puis huit chiffres.
 * Quatre codes des resultats et treize des avis n en comptent pas douze.
 * Ils cassent le rapprochement par code EN SILENCE, comme le « GAZ » du
 * 17 octobre : une ligne qui ne se rattache a rien ne proteste pas.
 *
 * UNE LONGUEUR DIT QU IL Y A FAUTE, PAS QUELLE EST LA BONNE VALEUR. On ne
 * corrige donc rien sans un temoin, et on en cherche trois :
 *
 *   LE MEME CODE AILLEURS, bien forme, dans l une ou l autre table. Un
 *   zero de trop se voit alors en comparant deux ecritures de la meme
 *   ligne.
 *
 *   LA MEME LIGNE PAR SON ECHEANCE ET SA DUREE, chez le meme Tresor :
 *   c est ainsi que les deux « GAZ » ont ete remis d aplomb.
 *
 *   LA FORME ELLE-MEME, quand le defaut est un caractere surnumeraire a
 *   une place ou le retirer redonne un code qui existe deja ailleurs.
 *
 * Sans temoin, on rapporte et on laisse.
 *
 *   npx tsx --conditions=react-server scripts/codes-hors-norme.mjs
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

const avis = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("emission_notices").select("id,country,session_on,instrument,tenor,code_emission,maturity_on,source_title").range(de, de + 999);
  if (error) throw new Error(error.message);
  avis.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
const resultats = await repo().listAuctionResults({ limit: 2000 });

/* TOUS LES CODES BIEN FORMES DE LA BASE, des deux tables : c est le
   dictionnaire contre lequel on confronte les malades. */
const sains = new Set();
for (const r of resultats) if (r.codeEmission?.length === 12) sains.add(r.codeEmission);
for (const a of avis) if (a.code_emission?.length === 12) sains.add(a.code_emission);
dire(`${sains.size} codes bien formes connus\n`);

/* TOUTES LES FACONS DE RETIRER UN CARACTERE, ou d en ajouter un, qui
   redonnent un code connu. On ne devine pas : on teste. */
const candidats = (code) => {
  const out = new Set();
  for (let i = 0; i < code.length; i++) {
    const court = code.slice(0, i) + code.slice(i + 1);
    if (court.length === 12 && sains.has(court)) out.add(court);
  }
  for (let i = 0; i <= code.length; i++) {
    for (const c of "0123456789") {
      const long = code.slice(0, i) + c + code.slice(i);
      if (long.length === 12 && sains.has(long)) out.add(long);
    }
  }
  return [...out];
};

const malades = [
  ...resultats.filter((r) => r.codeEmission && r.codeEmission.length !== 12).map((r) => ({ table: "resultats", id: r.id, pays: r.country, seance: r.sessionOn, instrument: r.instrument, tenor: r.tenor, code: r.codeEmission, echeance: r.maturityOn })),
  ...avis.filter((a) => a.code_emission && a.code_emission.length !== 12).map((a) => ({ table: "avis", id: a.id, pays: a.country, seance: a.session_on, instrument: a.instrument, tenor: a.tenor, code: a.code_emission, echeance: a.maturity_on })),
].sort((a, b) => a.seance.localeCompare(b.seance));

dire(`=== ${malades.length} CODES HORS NORME ===\n`);
const compte = { parLeCode: 0, parLaLigne: 0, rien: 0 };
for (const m of malades) {
  dire(`   ${m.table.padEnd(10)} ${m.seance} ${String(m.pays).padEnd(12)} ${String(m.instrument ?? "—").padEnd(4)} ${String(m.tenor ?? "—").padEnd(12)} « ${m.code} » (${m.code.length})`);

  /* Témoin 1 : un code connu a un caractere pres. */
  const proches = candidats(m.code);
  /* Témoin 2 : la meme ligne par son echeance et sa duree, meme pays. */
  const parLaLigne = m.echeance
    ? [
        ...new Set(
          [...resultats.filter((r) => r.country === m.pays && r.maturityOn === m.echeance && String(r.tenor) === String(m.tenor) && r.codeEmission?.length === 12).map((r) => r.codeEmission),
           ...avis.filter((a) => a.country === m.pays && a.maturity_on === m.echeance && String(a.tenor) === String(m.tenor) && a.code_emission?.length === 12).map((a) => a.code_emission)],
        ),
      ]
    : [];

  if (proches.length === 1) {
    compte.parLeCode += 1;
    dire(`      TEMOIN : « ${proches[0]} » existe deja, a un caractere pres`);
  } else if (proches.length > 1) {
    dire(`      ${proches.length} candidats a un caractere pres [${proches.join(", ")}] : NON TRANCHE`);
    compte.rien += 1;
  } else if (parLaLigne.length === 1) {
    compte.parLaLigne += 1;
    dire(`      TEMOIN : meme echeance ${m.echeance} et meme duree → « ${parLaLigne[0]} »`);
  } else if (parLaLigne.length > 1) {
    dire(`      ${parLaLigne.length} lignes de meme echeance et duree : NON TRANCHE`);
    compte.rien += 1;
  } else {
    compte.rien += 1;
    dire(`      aucun temoin · echeance ${m.echeance ?? "absente"}`);
  }
}

dire(`\n=== ${compte.parLeCode} par un code voisin connu · ${compte.parLaLigne} par l echeance et la duree · ${compte.rien} sans temoin ===`);
