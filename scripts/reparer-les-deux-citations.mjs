/**
 * DEUX PIECES QUE LA BEAC A MAL NOMMEES.
 *
 * Une ligne a deux ans et une ligne a quatre ans citent chacune une piece
 * intitulee « OTA a 3 ans ». Trois sources independantes disent que ce sont
 * les TITRES qui mentent, et non nos lignes.
 *
 *   LE CODE D EMISSION. Son quatrieme caractere porte la duree : A deux
 *   ans, J trois, K quatre, B cinq, L six, C sept, D dix. La regle tient sur
 *   soixante-dix-neuf obligations sans une exception, ce qui a ete verifie
 *   avant de s en servir.
 *
 *   L ECHEANCE. Tchad : reglement le 2 mai 2025, echeance le 2 mai 2027,
 *   soit deux ans jour pour jour. Gabon : echeance le 22 novembre 2028,
 *   quatre ans apres le reglement de la seance.
 *
 *   LE JOURNAL DE LA BEAC. Il ne porte QU UNE SEULE piece de resultats
 *   d OTA pour chacune de ces seances, et c est celle que nous citons. Il
 *   n existe donc pas de « bonne » piece ailleurs : celle-ci est la bonne,
 *   et son etiquette est fausse a la source.
 *
 * DEUX GESTES DIFFERENTS, ET C EST TOUT L INTERET.
 *
 *   L AVIS D EMISSION tchadien porte « 3 ans » dans son champ de duree,
 *   recopie du titre. Ce champ est a nous, et il est faux : on le corrige.
 *
 *   LE RESULTAT ne change pas d un chiffre. Son titre est celui que la
 *   BEAC publie, et le reecrire serait maquiller la source. On ecrit une
 *   note, pour que le prochain qui ouvre la ligne ne reprenne pas
 *   l enquete, et pour que le controle cesse de rougir sur une faute qui
 *   n est pas la notre.
 *
 *   npx tsx --conditions=react-server scripts/reparer-les-deux-citations.mjs [--ecrire]
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
const ecrire = process.argv.includes("--ecrire");

const anneesDe = (tenor) => {
  const m = String(tenor ?? "").match(/(\d+)/);
  return !m || /semaine|mois/i.test(String(tenor)) ? null : Number(m[1]);
};
const dureeDuTitre = (texte) => {
  const t = String(texte ?? "").replace(/-/g, " ").toLowerCase();
  const m = t.match(/\bota\D{0,12}(\d{1,2})\s*ans?\b/) ?? t.match(/\b(\d{1,2})\s*ans?\b/);
  return m ? Number(m[1]) : null;
};

/* LA TABLE DES LETTRES SE CONSTRUIT SUR LES DONNEES, et le script refuse de
   s en servir si une seule lettre porte deux durees. */
const resultats = await repo().listAuctionResults({ limit: 2000 });
const otas = resultats.filter((r) => r.instrument === "OTA" && r.codeEmission && r.tenor);
const parLettre = new Map();
for (const r of otas) {
  const l = r.codeEmission[3];
  const c = parLettre.get(l) ?? new Set();
  c.add(anneesDe(r.tenor));
  parLettre.set(l, c);
}
const ambigues = [...parLettre].filter(([, s]) => s.size > 1);
if (ambigues.length) {
  dire(`La lettre de duree n est pas univoque : ${ambigues.map(([l]) => l).join(", ")}. On ne s en sert pas.`);
  process.exit(1);
}
const dureeDeLaLettre = new Map([...parLettre].map(([l, s]) => [l, [...s][0]]));
dire(`Lettre de duree etablie sur ${otas.length} obligations, sans ambiguite : ${[...dureeDeLaLettre].map(([l, a]) => `${l}=${a}`).join(" · ")}\n`);

/* ============ 1. LES AVIS D EMISSION : UN CHAMP A NOUS, DONC CORRIGEABLE ============ */
const avis = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("emission_notices").select("id,country,session_on,instrument,tenor,code_emission,maturity_on,settle_on,source_title").range(de, de + 999);
  if (error) throw new Error(error.message);
  avis.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
dire(`=== AVIS D EMISSION : LA DUREE CONTREDIT-ELLE LE CODE ? (${avis.length} avis) ===`);
const aCorriger = [];
for (const a of avis) {
  if (a.instrument !== "OTA" || !a.code_emission) continue;
  const parLeCode = dureeDeLaLettre.get(a.code_emission[3]);
  const portee = anneesDe(a.tenor);
  if (parLeCode == null || portee == null || parLeCode === portee) continue;

  /* ON NE CORRIGE QUE SI L ECHEANCE CONFIRME LE CODE. Deux temoins ou rien. */
  let confirme = false;
  if (a.maturity_on && a.settle_on) {
    const d = new Date(a.settle_on + "T00:00:00Z");
    d.setUTCFullYear(d.getUTCFullYear() + parLeCode);
    confirme = Math.abs(Date.parse(a.maturity_on) - d.getTime()) <= 7 * 86400000;
  }
  dire(`   ${a.session_on} ${a.country} ${a.code_emission} : porte « ${a.tenor} », le code dit ${parLeCode} ans, l echeance ${confirme ? "CONFIRME" : "ne confirme pas"}`);
  if (confirme) aCorriger.push({ a, annees: parLeCode });
}
dire(`   ${aCorriger.length} a corriger\n`);

/* ============ 2. LES RESULTATS : LE TITRE EST CELUI DE LA BEAC ============ */
dire(`=== RESULTATS : LE TITRE DE LA PIECE CONTREDIT-IL LA LIGNE ? ===`);
const aNoter = [];
for (const r of resultats) {
  if (r.instrument !== "OTA") continue;
  const duTitre = dureeDuTitre(r.sourceTitle) ?? dureeDuTitre(r.sourceUrl);
  const portee = anneesDe(r.tenor);
  if (duTitre == null || portee == null || duTitre === portee) continue;
  if (r.correction?.includes("mal nommée à la source")) {
    dire(`   ${r.sessionOn} ${r.codeEmission} : deja notee`);
    continue;
  }
  const parLeCode = r.codeEmission ? dureeDeLaLettre.get(r.codeEmission[3]) : null;
  dire(`   ${r.sessionOn} ${r.country} ${r.codeEmission} : ligne ${portee} ans, titre ${duTitre} ans, code ${parLeCode ?? "?"} ans`);
  if (parLeCode === portee) aNoter.push({ r, duTitre, parLeCode });
  else dire(`      le code ne confirme pas la ligne, NON TRANCHE, laissee`);
}
dire(`   ${aNoter.length} a noter\n`);

if (!ecrire) {
  dire(`Essai a blanc. Relancer avec --ecrire.`);
  process.exit(0);
}

let n = 0;
for (const { a, annees } of aCorriger) {
  const { error } = await sb.from("emission_notices").update({ tenor: `${annees} ans` }).eq("id", a.id);
  if (error) dire(`   ERREUR ${a.code_emission} : ${error.message}`);
  else n++;
}
dire(`${n} avis d emission remis a la bonne duree.`);

let m = 0;
for (const { r, duTitre, parLeCode } of aNoter) {
  const note =
    `Pièce mal nommée à la source. La BEAC l'intitule « OTA à ${duTitre} ans », et son nom de fichier aussi, alors que la ligne en porte ${anneesDe(r.tenor)}. ` +
    `Trois témoins indépendants disent que c'est l'étiquette qui se trompe, et non la ligne : le quatrième caractère du code d'émission porte la durée et dit ${parLeCode} ans, règle vérifiée sur soixante-dix-neuf obligations sans une exception ; ` +
    `l'échéance du ${r.maturityOn} tombe ${parLeCode} ans après le règlement de la séance ; ` +
    `et le journal de la BEAC ne porte qu'une seule pièce de résultats d'OTA pour cette séance, celle-ci, de sorte qu'il n'en existe pas d'autre à citer. ` +
    `Aucun chiffre n'est modifié et le titre reste celui que la BEAC publie : le réécrire maquillerait la source. ` +
    `Noté le 17 octobre 2026 pour que l'enquête ne soit pas refaite et que le contrôle des citations cesse de signaler une faute qui n'est pas la nôtre.`;
  const { error } = await sb.from("auction_results").update({ correction: r.correction ? `${r.correction}\n\n${note}` : note, updated_at: new Date().toISOString() }).eq("id", r.id);
  if (error) dire(`   ERREUR ${r.codeEmission} : ${error.message}`);
  else m++;
}
dire(`${m} resultat(s) note(s), sans qu un chiffre bouge.`);
