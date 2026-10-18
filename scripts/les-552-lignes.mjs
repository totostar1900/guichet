/**
 * D OU VIENNENT LES 552 LIGNES DU REGISTRE QUE NOS SEANCES IGNORENT ?
 *
 * « 552 » ne veut rien dire tant qu on n a pas separe DEUX CAUSES QUI NE
 * SE REPARENT PAS PAREIL, et une troisieme qui n est pas un defaut :
 *
 *   LA SEANCE MANQUE. Nous n avons jamais ramasse le communique. C est
 *   un trou de collecte, et il se repare en ramassant.
 *
 *   LA SEANCE EST LA, SANS SON CODE. Le communique a ete lu mais le
 *   champ est vide ou mal lu. C est un trou de lecture, et il se repare
 *   en relisant une piece que nous tenons deja.
 *
 *   LA LIGNE N A JAMAIS EU DE SEANCE CHEZ NOUS A TROUVER. Un registre
 *   d encours arrete au trimestre ne voit que ce qui VIT a cette date :
 *   un bon de treize semaines emis et rembourse entre deux arretes n y
 *   paraitra jamais, et reciproquement une ligne de 2015 n a pas de
 *   seance publiee. Ce n est pas un defaut, c est la forme de la source.
 *
 * ON NE COMPTE DONC PAS « LES CODES ABSENTS » : on demande, pour chaque
 * ligne du registre, si une seance du MEME PAYS existe a la date ou cette
 * ligne a ete emise. C est la question qui distingue les trois.
 *
 *   npx tsx --conditions=react-server scripts/les-552-lignes.mjs
 */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

/* Le registre nomme « Guinée éq. » comme nous, mais verifions-le plutot
   que de le supposer : un pays mal apparie inventerait des trous. */
const lignes = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("beac_encours_lignes").select("arrete,pays,isin,instrument,emis_le,echeance_le,tenor,encours").range(de, de + 999);
  if (error) throw new Error(error.message);
  lignes.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
const avis = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("emission_notices").select("country,session_on,code_emission").range(de, de + 999);
  if (error) throw new Error(error.message);
  avis.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
const seances = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => !r.setAsideAt);

dire(`${lignes.length} lignes de registre · ${seances.length} seances · ${avis.length} avis\n`);

dire(`=== LES NOMS DE PAYS S APPARIENT-ILS ? ===`);
const paysRegistre = [...new Set(lignes.map((r) => r.pays))].sort();
const paysSeances = [...new Set(seances.map((r) => r.country))].sort();
dire(`   registre : ${paysRegistre.join(" · ")}`);
dire(`   seances  : ${paysSeances.join(" · ")}`);
const orphelins = paysRegistre.filter((p) => !paysSeances.includes(p));
dire(`   ${orphelins.length ? `SANS CORRESPONDANCE : ${orphelins.join(" · ")} — on s arrete` : "tous apparies."}`);
if (orphelins.length) process.exit(1);

/* UNE LIGNE PAR CODE, celle qui porte la version majoritaire. Un code vu
   dans huit bulletins n est pas huit lignes. */
const parCode = new Map();
for (const r of lignes) {
  if (!r.isin) continue;
  const v = parCode.get(r.isin) ?? [];
  v.push(r);
  parCode.set(r.isin, v);
}
const majoritaire = (v) => {
  const voix = new Map();
  for (const r of v) {
    const k = `${r.pays}|${r.emis_le}|${r.echeance_le}|${r.instrument}|${r.tenor}`;
    voix.set(k, (voix.get(k) ?? 0) + 1);
  }
  const [k] = [...voix].sort((a, b) => b[1] - a[1])[0];
  const [pays, emis_le, echeance_le, instrument, tenor] = k.split("|");
  return { isin: v[0].isin, pays, emis_le, echeance_le, instrument, tenor, vu: v.length };
};
const uniques = [...parCode.values()].map(majoritaire);
dire(`\n${uniques.length} code(s) distinct(s) au registre\n`);

/* LES CODES DU REGISTRE SONT PARFOIS HORS NORME, et la reparation du
   17 octobre n a couvert que les resultats et les avis, jamais cette
   table. « CM2L00000028/MN », « GA11000001351 », « CM120000091 » : un
   code mal forme ne se rattache a rien et ne proteste pas. On le
   normalise POUR COMPARER, sans rien ecrire, et seulement quand la
   valeur obtenue existe deja ailleurs : c est le temoin qui tranche. */
const BIEN_FORME = /^[A-Z]{2}[0-9][0-9A-Z]\d{8}$/;
const codesSeances = new Set(seances.map((r) => r.codeEmission).filter(Boolean));
const codesAvis = new Set(avis.map((r) => r.code_emission).filter(Boolean));
const sains = new Set([...codesSeances, ...codesAvis].filter((c) => BIEN_FORME.test(c)));
function normaliser(code) {
  const c = String(code).trim();
  if (BIEN_FORME.test(c)) return { code: c, repare: null };
  const nu = c.split(/\s+/)[0].replace(/\/.*$/, "");
  if (BIEN_FORME.test(nu) && sains.has(nu)) return { code: nu, repare: "un suffixe après une barre" };
  for (let i = 0; i < c.length; i++) {
    const court = c.slice(0, i) + c.slice(i + 1);
    if (BIEN_FORME.test(court) && sains.has(court)) return { code: court, repare: "un caractère de trop" };
  }
  for (let i = 0; i <= c.length; i++) for (const d of "0123456789") {
    const long = c.slice(0, i) + d + c.slice(i);
    if (BIEN_FORME.test(long) && sains.has(long)) return { code: long, repare: "un chiffre manquant" };
  }
  return { code: c, repare: null };
}
let reparesPourComparer = 0;
for (const u of uniques) {
  const { code, repare } = normaliser(u.isin);
  if (repare) { u.isinBrut = u.isin; u.isin = code; u.repare = repare; reparesPourComparer += 1; }
}
dire(`=== DES CODES DU REGISTRE SONT HORS NORME ===`);
dire(`   ${uniques.filter((u) => !BIEN_FORME.test(u.isinBrut ?? u.isin)).length} code(s) hors norme au registre`);
dire(`   ${reparesPourComparer} remis d aplomb POUR COMPARER, chacun par un code bien formé déjà connu ailleurs`);
for (const u of uniques.filter((u) => u.repare).slice(0, 10)) dire(`      « ${u.isinBrut} » → « ${u.isin} » · ${u.repare}`);
dire("");
/* QUE VAUT « emis_le » PAR RAPPORT A UNE SEANCE ? On ne le suppose pas :
   on le mesure sur les codes que NOS SEANCES ET LE REGISTRE portent tous
   les deux. C est la seule population ou la reponse est verifiable. */
const parCodeSeance = new Map();
for (const r of seances) if (r.codeEmission) parCodeSeance.set(r.codeEmission, r);
const ecarts = {};
for (const u of uniques) {
  const s = parCodeSeance.get(u.isin);
  if (!s || !u.emis_le) continue;
  const d = Math.round((Date.parse(u.emis_le) - Date.parse(s.sessionOn)) / 86_400_000);
  ecarts[d] = (ecarts[d] ?? 0) + 1;
}
dire(`=== « emis_le » MOINS LA DATE DE SEANCE, SUR LES CODES COMMUNS ===`);
const tri = Object.entries(ecarts).map(([d, n]) => [Number(d), n]).sort((a, b) => b[1] - a[1]);
const total = tri.reduce((a, [, n]) => a + n, 0);
for (const [d, n] of tri.slice(0, 8)) dire(`   ${String(d).padStart(4)} jour(s)  ${String(n).padStart(4)}  ${((n / total) * 100).toFixed(1)} %`);
const DECALAGE = tri[0][0];
dire(`   ${total} code(s) communs · le decalage dominant est ${DECALAGE} jour(s), ${((tri[0][1] / total) * 100).toFixed(1)} % des cas\n`);

/* LE REGISTRE ECRIT DEUX CHOSES DANS LA MEME COLONNE : le reglement
   (54 %) ou la seance elle-meme (32 %). On accepte donc les DEUX
   lectures, et pas une fenetre large : les seances sont hebdomadaires,
   et six jours attraperaient celle de la semaine suivante en la faisant
   passer pour celle-ci. */
const LECTURES = [DECALAGE, 0];
const seancesParPays = new Map();
for (const r of seances) {
  const v = seancesParPays.get(r.country) ?? [];
  v.push(r);
  seancesParPays.set(r.country, v);
}
const seanceAutour = (pays, emis) => {
  if (!emis) return undefined;
  for (const d of LECTURES) {
    const t = Date.parse(emis) - d * 86_400_000;
    const s = (seancesParPays.get(pays) ?? []).find((r) => Math.abs(Date.parse(r.sessionOn) - t) <= 1 * 86_400_000);
    if (s) return s;
  }
  return undefined;
};

const PLANCHER = "2019-06-05";
const familles = { connu: [], parLAvis: [], seanceSansCode: [], avantLePlancher: [], seanceManquante: [], sansDate: [] };
for (const u of uniques) {
  if (codesSeances.has(u.isin)) { familles.connu.push(u); continue; }
  if (codesAvis.has(u.isin)) { familles.parLAvis.push(u); continue; }
  if (!u.emis_le) { familles.sansDate.push(u); continue; }
  const s = seanceAutour(u.pays, u.emis_le);
  if (s) { familles.seanceSansCode.push({ ...u, seance: s }); continue; }
  if (u.emis_le < PLANCHER) { familles.avantLePlancher.push(u); continue; }
  familles.seanceManquante.push(u);
}

dire(`=== LES ${uniques.length} CODES DU REGISTRE, PAR CAUSE ===`);
dire(`   une de nos seances porte ce code                       ${String(familles.connu.length).padStart(4)}`);
dire(`   un AVIS le porte, mais pas le resultat                 ${String(familles.parLAvis.length).padStart(4)}`);
dire(`   une seance existe a cette date, SANS CE CODE           ${String(familles.seanceSansCode.length).padStart(4)}`);
dire(`   emise avant le ${PLANCHER}, que la BEAC ne publie pas  ${String(familles.avantLePlancher.length).padStart(4)}`);
dire(`   la seance manque alors que la BEAC publiait            ${String(familles.seanceManquante.length).padStart(4)}`);
dire(`   le registre ne donne pas de date d emission            ${String(familles.sansDate.length).padStart(4)}`);

dire(`\n=== « UNE SEANCE EXISTE SANS CE CODE » : QUE PORTE-T-ELLE ? ===`);
const sansCode = familles.seanceSansCode.filter((u) => !u.seance.codeEmission);
const autreCode = familles.seanceSansCode.filter((u) => u.seance.codeEmission);
dire(`   ${sansCode.length} dont notre seance n a AUCUN code : relire la piece la remplirait`);
dire(`   ${autreCode.length} dont notre seance porte un AUTRE code`);
for (const u of autreCode.slice(0, 12))
  dire(`      ${u.emis_le} ${String(u.pays).padEnd(14)} registre « ${u.isin} » · seance du ${u.seance.sessionOn} « ${u.seance.codeEmission} »`);
if (autreCode.length > 12) dire(`      … et ${autreCode.length - 12} autre(s)`);

dire(`\n=== « LA SEANCE MANQUE » : PAR PAYS ET PAR ANNEE ===`);
const grille = new Map();
for (const u of familles.seanceManquante) {
  const k = u.pays;
  const an = u.emis_le.slice(0, 4);
  const g = grille.get(k) ?? {};
  g[an] = (g[an] ?? 0) + 1;
  grille.set(k, g);
}
const ans = [...new Set(familles.seanceManquante.map((u) => u.emis_le.slice(0, 4)))].sort();
dire(`   ${"pays".padEnd(14)} ${ans.map((a) => a.padStart(5)).join("")}  total`);
for (const [p, g] of [...grille].sort()) {
  const total = Object.values(g).reduce((a, b) => a + b, 0);
  dire(`   ${p.padEnd(14)} ${ans.map((a) => String(g[a] ?? "").padStart(5)).join("")}  ${String(total).padStart(5)}`);
}

dire(`\n=== PAR INSTRUMENT ET PAR DUREE ===`);
const parDuree = {};
for (const u of familles.seanceManquante) {
  const k = `${u.instrument} ${u.tenor}`.toLowerCase();
  parDuree[k] = (parDuree[k] ?? 0) + 1;
}
for (const [k, n] of Object.entries(parDuree).sort((a, b) => b[1] - a[1])) dire(`   ${k.padEnd(20)} ${String(n).padStart(4)}`);

dire(`\n=== COMBIEN DE SEANCES AURAIENT-ELLES REPRESENTE ? ===`);
const dates = new Map();
for (const u of familles.seanceManquante) dates.set(`${u.pays}|${u.emis_le}`, true);
dire(`   ${dates.size} couple(s) pays-date distincts`);
dire(`   nos seances couvrent ${new Set(seances.map((r) => `${r.country}|${r.sessionOn}`)).size} couple(s)`);

/* LA FENETRE DU REGISTRE. Comparer hors d elle n a pas de sens : un
   bulletin arrete au 31 decembre 2021 ne peut pas porter une ligne de
   2024, et une ligne remboursee entre deux arretes n y figure jamais. */
dire(`\n=== LA FENETRE DU REGISTRE, ET LA NOTRE ===`);
const arretes = [...new Set(lignes.map((r) => r.arrete))].sort();
dire(`   arretes du registre : ${arretes.length}, du ${arretes[0]} au ${arretes[arretes.length - 1]}`);
const emisTous = uniques.map((u) => u.emis_le).filter(Boolean).sort();
dire(`   emissions vues      : du ${emisTous[0]} au ${emisTous[emisTous.length - 1]}`);
const DEB = emisTous[0];
const FIN = emisTous[emisTous.length - 1];
const nosDates = new Set(seances.map((r) => `${r.country}|${r.sessionOn}`));
const nosDansFenetre = [...nosDates].filter((k) => { const d = k.split("|")[1]; return d >= DEB && d <= FIN; });
dire(`\n   nos seances, toutes dates confondues          ${String(nosDates.size).padStart(4)}`);
dire(`   nos seances DANS la fenetre du registre        ${String(nosDansFenetre.length).padStart(4)}`);
dire(`   seances que le registre implique et qu on n a pas ${String(dates.size).padStart(4)}`);
const couverture = (nosDansFenetre.length / (nosDansFenetre.length + dates.size)) * 100;
dire(`   NOTRE COUVERTURE DANS CETTE FENETRE : ${couverture.toFixed(0)} %`);

dire(`\n=== « UN AVIS LE PORTE, PAS LE RESULTAT » : LE RESULTAT EST-IL RAMASSABLE ? ===`);
const avisParCode = new Map();
for (const a of avis) if (a.code_emission) avisParCode.set(a.code_emission, a);
const parAn2 = {};
for (const u of familles.parLAvis) { const a = avisParCode.get(u.isin); const k = String(a?.session_on ?? u.emis_le).slice(0, 4); parAn2[k] = (parAn2[k] ?? 0) + 1; }
dire(`   ${familles.parLAvis.length} code(s) · par annee : ${Object.entries(parAn2).sort().map(([a, n]) => `${a} ×${n}`).join(" · ")}`);
dire(`   nous tenons donc l annonce de ces seances, et pas leur communique de resultats.`);
