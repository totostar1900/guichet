/**
 * REMETTRE D APLOMB LES CODES DU REGISTRE DE L ENCOURS.
 *
 * La reparation du 17 octobre n a couvert que les resultats et les avis.
 * Cent codes de « beac_encours_lignes » sont hors norme, et un code mal
 * forme ne proteste pas : il rattache la ligne a rien, en silence.
 *
 * DEUX DEFAUTS SEULEMENT SONT REPARES, parce que deux seulement se
 * lisent sans rien inferer.
 *
 *   LE SUFFIXE. « CM2L00000028/MN », « GA1200001210/NM1 » : le code est
 *   suivi d une annotation de la BEAC. Le retirer ne devine rien, c est
 *   la meme suite de caracteres. Et soixante-deux fois la MEME LIGNE est
 *   ecrite sans le suffixe dans un autre arrete, ce qui le prouve.
 *
 *   LE ZERO DE TROP. « CG11000000203 » compte neuf chiffres la ou le
 *   format en veut huit, et le premier est un zero : le retirer preserve
 *   tous les chiffres significatifs. L inverse pour sept chiffres.
 *
 * CE QUI N EST PAS REPARE, ET POURQUOI C EST LE POINT IMPORTANT.
 *
 *   LE DECALAGE D UNE RANGEE. Des lignes portent, selon le bulletin, le
 *   code de leur VOISINE : chez le Gabon 085 puis 093, 093 puis 101, 101
 *   puis 119. Ce n est pas un defaut de forme mais d ATTRIBUTION, et le
 *   reparer rendrait le defaut PIRE : un code hors norme ne se rattache a
 *   rien et cela se voit, un code bien forme pose sur la mauvaise ligne
 *   se rattache a quelque chose et plus personne ne le voit.
 *
 * TROIS CLEFS FAUSSES ESSAYEES AVANT LA BONNE, toutes pour la meme
 * raison : elles comparaient des chaines brutes.
 *
 *   Une fenetre d appariement de cinq jours quand les seances sont
 *   hebdomadaires : elle attrapait la semaine suivante.
 *
 *   Une ligne reconnue par (pays, emission, echeance), alors que le
 *   registre ecrit tantot la seance tantot le reglement dans la colonne
 *   d emission : la meme ligne recevait deux clefs et passait pour deux.
 *
 *   Un decalage detecte en comparant des codes NON NORMALISES :
 *   « CG12000000590 » et « CG1200000590 » sont le meme code ecrit deux
 *   fois, pas deux codes concurrents.
 *
 * L ECHEANCE EST LA CLEF STABLE, parce qu un bulletin ne la decale pas.
 *
 * ON N ECRASE RIEN : le code imprime part dans « isin_imprime » et le
 * motif dans « isin_motif » (migration 0110) avant que « isin » bouge.
 * « isin = coalesce(isin_imprime, isin) » rend le registre a sa lettre.
 *
 *   npx tsx --conditions=react-server scripts/reparer-codes-du-registre.mjs [--ecrire]
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

const lignes = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("beac_encours_lignes").select("id,arrete,pays,isin,isin_imprime,instrument,emis_le,echeance_le,tenor,encours").range(de, de + 999);
  if (error) throw new Error(error.message);
  lignes.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
const avis = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("emission_notices").select("code_emission").range(de, de + 999);
  if (error) throw new Error(error.message);
  avis.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
const seances = await repo().listAuctionResults({ limit: 2000 });
dire(`${lignes.length} lignes de registre · ${seances.length} seances · ${avis.length} avis\n`);

/**
 * LES DEUX SEULES REPARATIONS AUTORISEES, et rien d autre. Elles rendent
 * la valeur et le motif, ou rien du tout.
 */
function parLaForme(code) {
  const c = String(code).trim();
  if (BIEN_FORME.test(c)) return null;
  const nu = c.split(/\s+/)[0].replace(/\/.*$/, "");
  if (nu !== c && BIEN_FORME.test(nu)) return { valeur: nu, pourquoi: `une annotation « ${c.slice(nu.length)} » suivait le code` };
  const m = nu.match(/^([A-Z]{2}[0-9][0-9A-Z])(\d+)$/);
  if (!m) return null;
  const [, prefixe, chiffres] = m;
  if (chiffres.length === 9 && chiffres[0] === "0") return { valeur: prefixe + chiffres.slice(1), pourquoi: "un zéro de trop en tête du bloc numérique, les chiffres significatifs sont tous conservés" };
  if (chiffres.length === 7) return { valeur: `${prefixe}0${chiffres}`, pourquoi: "un zéro manquant en tête du bloc numérique" };
  return null;
}

/** Le code tel qu il serait apres reparation : la forme normalisee. */
const normal = (code) => parLaForme(code)?.valeur ?? String(code).trim();

/**
 * L ECHEANCE EST LA CLEF D UNE LIGNE. Elle ne bouge pas d un bulletin a
 * l autre, alors que la colonne d emission porte tantot la seance tantot
 * le reglement. On y ajoute le pays : deux Tresors peuvent echoir le
 * meme jour.
 */
const cleLigne = (r) => `${r.pays}|${r.echeance_le}`;

/* LE DECALAGE D UNE RANGEE, MESURE SUR DES CODES NORMALISES. */
const codesParLigne = new Map();
for (const r of lignes) {
  if (!r.isin) continue;
  const k = cleLigne(r);
  const v = codesParLigne.get(k) ?? new Set();
  v.add(normal(r.isin));
  codesParLigne.set(k, v);
}
const douteuses = [...codesParLigne].filter(([, v]) => v.size > 1);
dire(`=== L ATTRIBUTION : UNE LIGNE, COMBIEN DE CODES ? ===`);
dire(`   ${codesParLigne.size} ligne(s) distinctes au registre, par pays et échéance`);
dire(`   ${douteuses.length} en portent PLUSIEURS selon le bulletin : décalage d'une rangée`);
for (const [k, v] of douteuses.slice(0, 20)) dire(`      ${k} → ${[...v].join(" · ")}`);
if (douteuses.length > 20) dire(`      … et ${douteuses.length - 20} autre(s)`);
const attributionDouteuse = (r) => (codesParLigne.get(cleLigne(r))?.size ?? 0) > 1;

const malades = lignes.filter((r) => r.isin && !BIEN_FORME.test(r.isin));
const codesMalades = [...new Set(malades.map((r) => r.isin))].sort();
dire(`\n=== ${malades.length} ligne(s) portent un code hors norme · ${codesMalades.length} code(s) distincts ===\n`);

/**
 * LE CONTROLE PREALABLE. La regle de forme doit retrouver ce que la MEME
 * LIGNE porte dans un autre arrete, chaque fois qu un autre arrete
 * l ecrit proprement. Un seul dementi et on s arrete : une regle qui se
 * trompe la ou on peut la verifier se trompe aussi ailleurs.
 */
const propresParLigne = new Map();
for (const r of lignes) {
  if (!r.isin || !BIEN_FORME.test(r.isin)) continue;
  const k = cleLigne(r);
  const v = propresParLigne.get(k) ?? new Map();
  v.set(r.isin, (v.get(r.isin) ?? 0) + 1);
  propresParLigne.set(k, v);
}
dire(`=== LA RÈGLE DE FORME RETROUVE-T-ELLE CE QUE LA MÊME LIGNE PORTE AILLEURS ? ===`);
let verifiee = 0;
const dementis = [];
for (const r of malades) {
  if (attributionDouteuse(r)) continue;
  const f = parLaForme(r.isin);
  if (!f) continue;
  const v = propresParLigne.get(cleLigne(r));
  if (!v || v.size !== 1) continue;
  const temoin = [...v.keys()][0];
  if (temoin === f.valeur) verifiee += 1;
  else dementis.push(`« ${r.isin} » → forme « ${f.valeur} », la même ligne porte « ${temoin} » dans un autre arrêté`);
}
for (const d of dementis) dire(`   DÉMENTI ${d}`);
if (dementis.length) { dire(`\n   ${dementis.length} démenti(s) : la règle n'est pas fiable, on s'arrête.`); process.exit(1); }
dire(`   ${verifiee} ligne(s) où la règle retrouve exactement ce qu'un autre arrêté imprime, zéro démenti.\n`);

dire(`=== CE QUI SERAIT ÉCRIT ===`);
const aFaire = [];
const laisses = [];
for (const code of codesMalades) {
  const concernees = malades.filter((x) => x.isin === code);
  const f = parLaForme(code);
  if (!f) { laisses.push([code, "aucune des deux réparations ne s'applique", concernees.length]); continue; }
  const douteuses2 = concernees.filter((r) => attributionDouteuse(r));
  const sures = concernees.filter((r) => !attributionDouteuse(r));
  if (douteuses2.length) laisses.push([code, `${douteuses2.length} ligne(s) dont l'attribution n'est pas sûre : ${[...codesParLigne.get(cleLigne(douteuses2[0]))].join(" · ")}`, douteuses2.length]);
  if (!sures.length) continue;
  aFaire.push({ code, valeur: f.valeur, pourquoi: f.pourquoi, lignes: sures });
  dire(`   « ${code} » → « ${f.valeur} » · ${sures.length} ligne(s) · ${f.pourquoi}`);
}

const nLignes = aFaire.reduce((a, x) => a + x.lignes.length, 0);
dire(`\n=== ${aFaire.length} code(s) · ${nLignes} ligne(s) ===`);
dire(`\n=== LAISSÉ, ET POURQUOI ===`);
for (const [code, motif, n] of laisses) dire(`   « ${code} » (${n} ligne(s)) · ${motif}`);

/* CE QUE LA REPARATION RATTACHERAIT, mesure avant d ecrire : un code
   remis d aplomb qui rejoint une seance ou un avis est un gain qui se
   compte, et il faut pouvoir le compter APRES aussi. */
const connus = new Set([...seances.map((r) => r.codeEmission), ...avis.map((a) => a.code_emission)].filter(Boolean));
const gagnes = aFaire.filter((x) => connus.has(x.valeur) && !connus.has(x.code));
dire(`\n=== CE QUE LA RÉPARATION RATTACHERAIT ===`);
dire(`   ${gagnes.length} code(s) remis d'aplomb rejoignent une séance ou un avis que le code imprimé ne touchait pas`);

if (!ecrire) { dire(`\nEssai à blanc. Relancer avec --ecrire.`); process.exit(0); }

let n = 0;
for (const x of aFaire) {
  for (const l of x.lignes) {
    if (l.isin_imprime) { dire(`   ${l.id} porte déjà un isin_imprime : laissée`); continue; }
    const { error } = await sb
      .from("beac_encours_lignes")
      .update({
        isin: x.valeur,
        isin_imprime: x.code,
        isin_motif:
          `Remis d'aplomb le ${new Date().toISOString().slice(0, 10)} : ${x.pourquoi}. ` +
          `Le bulletin imprime « ${x.code} », qui n'a pas les douze caractères d'un code CEMAC et ne se rattachait donc à rien. ` +
          `Seule la FORME est corrigée, jamais l'attribution : une ligne portant plusieurs codes selon le bulletin a été écartée, parce qu'un code bien formé posé sur la mauvaise ligne se rattache à quelque chose et devient invisible. ` +
          `Ce que la BEAC imprime est gardé ici, et « isin = coalesce(isin_imprime, isin) » rend le registre à sa lettre.`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", l.id);
    if (error) dire(`   ERREUR ${x.code} : ${error.message}`);
    else n += 1;
  }
}
dire(`\n=== ${n} ligne(s) remise(s) d'aplomb ===`);

const apres = [];
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from("beac_encours_lignes").select("isin,isin_imprime").range(de, de + 999);
  apres.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
dire(`   codes hors norme : ${malades.length} → ${apres.filter((r) => r.isin && !BIEN_FORME.test(r.isin)).length} ligne(s)`);
dire(`   lignes portant le code imprimé à côté du code remis d'aplomb : ${apres.filter((r) => r.isin_imprime).length}`);
const codesApres = new Set(apres.map((r) => r.isin).filter(Boolean));
dire(`   codes du registre que nos séances ou nos avis connaissent : ${[...codesApres].filter((c) => connus.has(c)).length} sur ${codesApres.size}`);
