/**
 * RENDRE À CHAQUE OPÉRATION LA PIÈCE QUI LA PORTE.
 *
 * La première campagne a écrit 1 160 opérations sous QUATRE adresses sources,
 * parce que le rattachement fichier → journal comparait les quatre-vingts
 * premiers caractères du titre, et que ces titres commencent tous pareil. Les
 * chiffres sont bons, leur provenance ne l'est pas, et une ligne qui ne
 * désigne pas sa pièce ne se défend pas.
 *
 * ON NE RELIT PAS POUR AUTANT. Chaque ligne porte déjà SA semaine, lue sur le
 * titre du tableau : 81 semaines distinctes pour 81 pièces, aucune ligne sans
 * semaine. Le rattachement est donc exact et gratuit, à condition que les deux
 * ensembles se correspondent un à un.
 *
 * ET C'EST LA CONDITION QUI COMMANDE : le script compare les semaines du
 * journal à celles de la base, et REFUSE D'ÉCRIRE si l'une d'elles n'a pas son
 * exacte contrepartie. Réparer une provenance en se trompant de pièce est pire
 * que la laisser fausse, parce que la seconde se voit.
 *
 *   npx tsx --conditions=react-server scripts/operations-rattacher.mjs [--ecrire]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { createClient } = await import("@supabase/supabase-js");
const { nomDeFichier } = await import("../src/lib/intake/bibliotheque.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ecrire = process.argv.includes("--ecrire");

const MOIS = { janvier: 1, "février": 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, "août": 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, "décembre": 12, decembre: 12 };
const NOMS = Object.keys(MOIS).join("|");

/**
 * La semaine qu'un titre annonce, dans les quatre formes rencontrées :
 *
 *   semaine du 23 au 27 février 2026          un seul mois, une seule année
 *   semaine du 29 juillet au 02 août 2024     deux mois
 *   semaine du 30 décembre 2024 au 03 janvier 2025   deux années
 *   semaine du 1er au 05 novembre 2021        l'ordinal du premier du mois
 */
function semaineDuTitre(titre) {
  const t = titre.replace(/1er/gi, "1").replace(/\s+/g, " ");
  const deux = t.match(new RegExp(`du (\\d{1,2})(?: (${NOMS}))?(?: (\\d{4}))? au (\\d{1,2}) (${NOMS}) (\\d{4})`, "i"));
  if (!deux) return undefined;
  const [, j1, m1, a1, j2, m2, a2] = deux;
  const moisFin = MOIS[m2.toLowerCase()];
  const moisDebut = m1 ? MOIS[m1.toLowerCase()] : moisFin;
  const anFin = Number(a2);
  const anDebut = a1 ? Number(a1) : moisDebut > moisFin ? anFin - 1 : anFin;
  const iso = (a, m, j) => `${a}-${String(m).padStart(2, "0")}-${String(Number(j)).padStart(2, "0")}`;
  return { du: iso(anDebut, moisDebut, j1), au: iso(anFin, moisFin, j2) };
}

const obs = [];
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from("beac_observations").select("url, titre").range(de, de + 999);
  obs.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
const pieces = new Map();
for (const o of obs) if (/tableau/i.test(o.titre ?? "") && !pieces.has(o.titre)) pieces.set(o.titre, o);
dire(`${pieces.size} tableau(x) au journal`);

const parSemaine = new Map();
const sansSemaine = [];
for (const [titre, o] of pieces) {
  const s = semaineDuTitre(titre);
  if (!s) {
    sansSemaine.push(titre);
    continue;
  }
  const k = `${s.du}|${s.au}`;
  parSemaine.set(k, [...(parSemaine.get(k) ?? []), { ...o, titre }]);
}
dire(`${parSemaine.size} semaine(s) nommée(s), ${sansSemaine.length} titre(s) dont la semaine ne se lit pas`);
for (const t of sansSemaine.slice(0, 5)) dire(`   ${t.slice(0, 110)}`);

const ops = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("treasury_operations").select("id, semaine_du, semaine_au, source_url").range(de, de + 999);
  if (error) throw new Error(error.message);
  ops.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
const semainesEnBase = new Set(ops.map((o) => `${o.semaine_du}|${o.semaine_au}`));
dire(`${ops.length} opération(s), ${semainesEnBase.size} semaine(s) en base, ${new Set(ops.map((o) => o.source_url)).size} adresse(s) aujourd'hui\n`);

const doubles = [...parSemaine.entries()].filter(([k, xs]) => semainesEnBase.has(k) && xs.length > 1);
dire(`=== LA CORRESPONDANCE ===`);
dire(`   semaines réclamées par deux pièces      ${doubles.length}`);
for (const [k, xs] of doubles.slice(0, 5)) dire(`      ${k} : ${xs.map((x) => x.titre.slice(0, 60)).join(" ¦ ")}`);

/* Le premier passage est une ÉGALITÉ de semaine : c'est lui qui emporte. */
const choix = new Map();
for (const k of semainesEnBase) if (parSemaine.has(k) && parSemaine.get(k).length === 1) choix.set(k, parSemaine.get(k)[0]);
dire(`   appariées par égalité de semaine        ${choix.size} sur ${semainesEnBase.size}`);

/**
 * SECOND PASSAGE, ET IL NE SERT QUE PARCE QU'IL RESTE AUTANT DE CHAQUE CÔTÉ.
 *
 * Trois semaines de la base ne tombent pas sur un titre, parce que le titre
 * annonce une semaine et que le modèle a lu celle imprimée en tête du tableau,
 * et qu'elles diffèrent d'un jour ou deux. Il reste alors exactement trois
 * pièces non appariées : on les joint à la plus proche, à condition qu'il n'y
 * ait qu'une seule candidate à moins d'une semaine. Chaque appariement est
 * imprimé, parce qu'un rapprochement par proximité se relit.
 */
const restantes = [...semainesEnBase].filter((k) => !choix.has(k));
const libres = [...parSemaine.entries()].filter(([k]) => !choix.has(k)).flatMap(([k, xs]) => xs.map((x) => ({ ...x, semaine: k })));
const jours = (a, b) => Math.abs(Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86400000;
const ambigus = [];
for (const k of restantes) {
  const [du] = k.split("|");
  const proches = libres.filter((x) => ![...choix.values()].includes(x) && jours(du, x.semaine.split("|")[0]) <= 7);
  if (proches.length !== 1) {
    ambigus.push({ k, n: proches.length });
    continue;
  }
  choix.set(k, proches[0]);
  dire(`      par proximité : base ${k}  ←  « ${proches[0].titre.slice(0, 74)} »`);
}
dire(`   appariées en tout                       ${choix.size} sur ${semainesEnBase.size}`);
for (const a of ambigus) dire(`      SANS APPARIEMENT  ${a.k} · ${a.n} candidate(s) à moins de sept jours`);

dire(`\n   pièces encore libres : ${libres.filter((x) => ![...choix.values()].includes(x)).length}`);
for (const x of libres.filter((y) => ![...choix.values()].includes(y))) dire(`      ${x.semaine}  ${x.titre.slice(0, 90)}`);
if (doubles.length || choix.size !== semainesEnBase.size) {
  dire(`\nREFUS : la correspondance n'est pas un à un. Réparer une provenance en se`);
  dire(`trompant de pièce est pire que la laisser fausse, parce que la seconde se voit.`);
  process.exit(1);
}

if (!ecrire) {
  dire(`\nEssai à blanc. Relancer avec --ecrire pour rattacher.`);
  process.exit(0);
}

let faites = 0;
for (const k of semainesEnBase) {
  const [du, au] = k.split("|");
  const p = choix.get(k);
  const { error } = await sb
    .from("treasury_operations")
    .update({ source_url: p.url, source_title: nomDeFichier(p.titre), updated_at: new Date().toISOString() })
    .eq("semaine_du", du)
    .eq("semaine_au", au);
  if (error) {
    dire(`   ${k} : ${error.message}`);
    continue;
  }
  faites++;
  if (faites % 20 === 0) dire(`   ${faites}/${semainesEnBase.size}`);
}

const { data: apres } = await sb.from("treasury_operations").select("source_url");
dire(`\n=== ${faites} semaine(s) rattachée(s) · ${new Set((apres ?? []).map((x) => x.source_url)).size} adresse(s) distincte(s) ===`);
