/**
 * LES TROUS SONT-ILS DANS NOTRE LECTURE OU DANS LA PIÈCE ?
 *
 * L'essai à blanc a rendu zéro ligne sur 547 séances, mais cette mesure est
 * CIRCULAIRE : la base a été écrite par ce même lecteur, donc « il relit huit
 * lignes, la base en porte huit » ne prouve que son déterminisme.
 *
 * LE CONTRÔLE NON CIRCULAIRE NE PASSE PAS PAR LE CONSTRUCTEUR : on cherche
 * l'ISIN manquant dans le TEXTE de la pièce, tel que pdfjs le rend, sans
 * grille, sans rangée, sans règle de forme. Trois issues, et elles se
 * distinguent :
 *
 *   l'ISIN est absent du document        la BVMAC ne l'a pas publié ce jour-là
 *   il est là mais hors du tableau       il paraît ailleurs (cote, échéancier)
 *   il est là, dans le tableau           NOTRE LECTEUR LE PERD, et c'est à nous
 *
 * La troisième est la seule qui justifierait une relecture. Les deux autres
 * renvoient au fournisseur.
 *
 *   npx tsx --conditions=react-server scripts/trous-dans-la-piece.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { createClient } = await import("@supabase/supabase-js");
const { rangeesDuPdf } = await import("../src/lib/market/boc-geometrie.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const brut = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("debt_outstandings").select("isin, session_date").order("session_date").order("isin").range(de, de + 999);
  if (error) throw new Error(error.message);
  brut.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}

const bornes = new Map();
for (const l of brut) {
  const b = bornes.get(l.isin) ?? { d1: l.session_date, d2: l.session_date };
  if (l.session_date < b.d1) b.d1 = l.session_date;
  if (l.session_date > b.d2) b.d2 = l.session_date;
  bornes.set(l.isin, b);
}
const presentes = new Set(brut.map((l) => `${l.isin}|${l.session_date}`));
const seances = [...new Set(brut.map((l) => l.session_date))].sort();
const manquantesPar = new Map();
for (const [isin, b] of bornes) {
  for (const s of seances) {
    if (s < b.d1 || s > b.d2 || presentes.has(`${isin}|${s}`)) continue;
    manquantesPar.set(s, [...(manquantesPar.get(s) ?? []), isin]);
  }
}

/* UN ÉCHANTILLON SUFFIT, et il doit être choisi pour être défavorable à notre
   thèse : les séances les plus trouées sont celles où un lecteur défaillant
   perdrait le plus. Si l'ISIN n'y est pas, il n'est nulle part. */
const trouees = [...manquantesPar.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 25);
const bulletins = new Map((await repo().listBulletins(3000)).map((b) => [b.sessionDate, b]));

/* Le mot « encours » ouvre le tableau, la section suivante le ferme. On ne s en
   sert que pour SITUER l ISIN, jamais pour décider s il existe. */
const DEBUT = /encours\s+(?:des\s+)?(?:titres|obligations)|situation\s+des\s+encours/i;

let cherchees = 0, absentesDuTexte = 0, horsTableau = 0, dansLeTableau = 0;
const coupables = [];

for (const [seance, manquantes] of trouees) {
  const b = bulletins.get(seance);
  if (!b?.fileKey) continue;
  let rangees;
  try {
    rangees = await rangeesDuPdf(await readSource(b.fileKey));
  } catch (e) {
    dire(`${seance}  pièce illisible : ${e.message}`);
    continue;
  }
  const lignes = rangees.map((r) => ({ y: r.y, page: r.page, texte: r.cellules.map((c) => c.texte).join(" ") }));
  const iDebut = lignes.findIndex((l) => DEBUT.test(l.texte));

  const vus = [];
  for (const isin of manquantes) {
    cherchees++;
    const ou = lignes.findIndex((l) => l.texte.includes(isin));
    if (ou < 0) { absentesDuTexte++; continue; }
    /* L ISIN est dans la pièce. Reste à savoir s il est dans NOTRE tableau :
       à moins de 60 rangées après son titre, c est le même bloc. */
    if (iDebut >= 0 && ou > iDebut && ou - iDebut < 60) { dansLeTableau++; vus.push(`${isin} rangée ${ou} (tableau ouvert en ${iDebut})`); }
    else { horsTableau++; vus.push(`${isin} rangée ${ou} HORS tableau`); }
  }
  dire(`${seance}  ${String(manquantes.length).padStart(2)} manquante(s) · ${manquantes.length - vus.length} absente(s) du texte · ${vus.length} trouvée(s)${vus.length ? ` : ${vus.slice(0, 3).join(" ; ")}` : ""}`);
  if (vus.length) coupables.push({ seance, vus });
}

dire(`\n=== SUR ${trouees.length} SÉANCES, LES PLUS TROUÉES ===`);
dire(`   lignes manquantes cherchées   ${cherchees}`);
dire(`   ABSENTES DU TEXTE             ${absentesDuTexte}   la BVMAC ne les a pas publiées`);
dire(`   présentes mais hors tableau   ${horsTableau}`);
dire(`   PRÉSENTES DANS LE TABLEAU     ${dansLeTableau}   notre lecteur les perd`);
