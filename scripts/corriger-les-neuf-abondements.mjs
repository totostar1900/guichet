/**
 * LES NEUF ABONDEMENTS GABONAIS : RENDRE LE PRIX MOYEN PIED DE COUPON.
 *
 * Decision de Georges le 17 octobre 2026 : garder le prix moyen pondere
 * comme lecture de la courbe, et corriger ces neuf seances.
 *
 * CE QUI EST PROUVE, ET CE QUI NE L EST PAS. Il faut que la note le dise,
 * parce que ces neuf ne sont pas du meme bois que les onze d avant.
 *
 *   LES ONZE etaient prouvees par l arithmetique : leur prix moyen imprime
 *   depassait leur propre prix maximum propose, ce qui est impossible entre
 *   grandeurs comparables.
 *
 *   LES NEUF sont DEDUITES d une regle, et la regle est mesuree a
 *   vingt-neuf sur trente : le Tresor gabonais porte dans la case du prix
 *   moyen le rapport des especes payees au nominal servi, et non la moyenne
 *   des prix cotes. Sur une ligne neuve le coupon couru vaut zero et rien
 *   ne se voit ; sur un abondement, il s ajoute.
 *
 *   LA CONTRARIETE EST NOMMEE : le 4 septembre 2019, une ligne abondee
 *   depuis douze jours imprime exactement son prix limite. Elle n est pas
 *   expliquee, et le soumissionnaire unique ne l explique pas, une seance a
 *   un seul soumissionnaire ayant imprime coupon compris le 1er juillet
 *   2020.
 *
 * CE QUI APPUIE LA REGLE : le residu. Sur les huit seances prouvees qui
 * tombent pres du prix limite, le coupon couru varie d un facteur cinq, de
 * 1,16 a 5,66 points, pendant que ce qui reste tient entre 0,023 et 0,035,
 * sans correlation (0,10) ni pente (0,0003). Le reste n est donc pas une
 * erreur de calcul, c est la marge normale entre la moyenne des prix servis
 * et le plus bas d entre eux.
 *
 * LE GARDE. Le prix pied de coupon doit rester AU-DESSUS du prix limite,
 * puisque le limite est le plus bas prix servi et que la moyenne ne peut
 * lui etre inferieure, et AU-DESSOUS du maximum. Une seance qui ne passe
 * pas ce garde n est pas comprise, et on n y touche pas : c est ainsi que
 * le 4 septembre 2019 s exclut tout seul, sans liste a la main.
 *
 * LA LIGNE REPART A RELIRE. Sa valeur change, et une signature couvre un
 * chiffre, pas une ligne.
 *
 *   npx tsx --conditions=react-server scripts/corriger-les-neuf-abondements.mjs [--ecrire]
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
const fr = (v, n = 3) => Number(v).toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n });
const jours = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

function anneesDe(tenor) {
  const m = String(tenor ?? "").match(/(\d+)/);
  return !m || /semaine|mois/i.test(String(tenor)) ? null : Number(m[1]);
}
function emissionDe(echeance, annees) {
  if (!echeance || annees == null) return null;
  const d = new Date(echeance + "T00:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() - annees);
  return d.toISOString().slice(0, 10);
}
/** Le dernier anniversaire de coupon avant la seance, jamais avant l emission. */
function departDuCouru(seance, echeance, emission) {
  const s = new Date(seance + "T00:00:00Z");
  const e = new Date(echeance + "T00:00:00Z");
  const d = new Date(Date.UTC(s.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
  if (d > s) d.setUTCFullYear(d.getUTCFullYear() - 1);
  const anniversaire = d.toISOString().slice(0, 10);
  return emission && anniversaire < emission ? emission : anniversaire;
}

const toutes = await repo().listAuctionResults({ limit: 2000 });

/* LA SIGNATURE, jamais une liste. */
const candidates = toutes.filter(
  (r) =>
    r.instrument === "OTA" &&
    r.country === "Gabon" &&
    !r.setAsideAt &&
    !r.correction?.includes("pied de coupon") &&
    r.priceAvg != null &&
    r.priceLimit != null &&
    r.priceMax != null &&
    r.couponRate != null &&
    r.maturityOn,
);
dire(`${candidates.length} obligation(s) gabonaise(s) non corrigee(s) et completes\n`);

const retenues = [];
for (const r of candidates) {
  const emission = emissionDe(r.maturityOn, anneesDe(r.tenor));
  if (emission != null && Math.abs(jours(emission, r.sessionOn)) <= 7) {
    dire(`   ${r.sessionOn} ${String(r.codeEmission).padEnd(14)} ligne NEUVE le jour meme, couru nul, rien a corriger`);
    continue;
  }
  const depart = departDuCouru(r.sessionOn, r.maturityOn, emission);
  const j = jours(depart, r.sessionOn);
  const couru = (Number(r.couponRate) * j) / 365;
  const pied = Math.round((Number(r.priceAvg) - couru) * 1000) / 1000;

  if (pied < Number(r.priceLimit)) {
    dire(`   ${r.sessionOn} ${String(r.codeEmission).padEnd(14)} pied ${fr(pied)} SOUS le limite ${r.priceLimit}, NON COMPRISE, laissee`);
    continue;
  }
  if (pied > Number(r.priceMax)) {
    dire(`   ${r.sessionOn} ${String(r.codeEmission).padEnd(14)} pied ${fr(pied)} AU-DESSUS du maximum ${r.priceMax}, NON COMPRISE, laissee`);
    continue;
  }
  retenues.push({ r, depart, j, couru, pied });
  dire(`   ${r.sessionOn} ${String(r.codeEmission).padEnd(14)} ${fr(r.priceAvg)} → ${fr(pied)}   couru ${fr(couru)} sur ${String(j).padStart(3)} j depuis le ${depart}   [limite ${r.priceLimit} · max ${r.priceMax}]`);
}

dire(`\n=== ${retenues.length} retenue(s), ${candidates.length - retenues.length} laissee(s) ===`);
if (!ecrire) {
  dire(`\nEssai a blanc. Relancer avec --ecrire.`);
  process.exit(0);
}

let n = 0;
for (const { r, depart, j, couru, pied } of retenues) {
  const note =
    `Prix moyen pondéré rendu pied de coupon, par déduction et non par preuve. ` +
    `Le Trésor gabonais porte dans cette case le rapport des espèces payées au nominal servi, et non la moyenne des prix cotés : sur une ligne neuve le coupon couru vaut zéro et rien ne se voit, sur un abondement il s'ajoute. ` +
    `La règle est mesurée sur trente séances gabonaises, vingt-neuf la soutiennent. ` +
    `Elle s'appuie sur le résidu des onze séances prouvées par l'arithmétique : le coupon couru y varie d'un facteur cinq, de 1,16 à 5,66 points, pendant que l'écart restant au prix limite tient entre 0,023 et 0,035 point, sans corrélation (0,10) ni pente (0,0003). Cet écart n'est donc pas une erreur de calcul mais la marge normale entre la moyenne des prix servis et le plus bas d'entre eux. ` +
    `La contrariété est nommée : le 4 septembre 2019, une ligne abondée depuis douze jours imprime exactement son prix limite, et rien ne l'explique. ` +
    `Ici, le prix imprimé est de ${fr(r.priceAvg)} %. Coupon couru de ${fr(couru)} points, soit ${r.couponRate} % sur ${j} jours depuis le ${depart}, dernier anniversaire déduit de l'échéance du ${r.maturityOn}. ` +
    `Reste ${fr(pied)} %, qui tient entre le prix limite de ${r.priceLimit} % et le prix maximum proposé de ${r.priceMax} %. ` +
    `Correction décidée par Georges le 17 octobre 2026, après que la courbe eut été maintenue sur le prix moyen pondéré plutôt que sur le prix limite.`;

  const { error } = await sb
    .from("auction_results")
    .update({ price_avg: pied, correction: note, confirmed_by: null, confirmed_at: null, updated_at: new Date().toISOString() })
    .eq("id", r.id);
  if (error) dire(`   ERREUR ${r.codeEmission} : ${error.message}`);
  else n++;
}
dire(`\n=== ${n} ligne(s) corrigee(s) et rouverte(s) ===`);

/* LA PHRASE DES ONZE DEVIENT FAUSSE. Elles disaient que les autres seances
   gabonaises n avaient pas ete touchees. Une note qui ment vieillit mal. */
const onze = toutes.filter((r) => r.correction?.includes("probable mais indiscernable"));
let m = 0;
for (const r of onze) {
  const ajout =
    `\n\nMise à jour du 17 octobre 2026 : les autres séances gabonaises ne sont plus laissées de côté. ` +
    `La convention s'est révélée générale et non occasionnelle, le défaut n'apparaissant que sur un abondement, et neuf d'entre elles ont été corrigées par déduction.`;
  const { error } = await sb.from("auction_results").update({ correction: `${r.correction}${ajout}`, updated_at: new Date().toISOString() }).eq("id", r.id);
  if (!error) m++;
}
dire(`${m} note(s) des onze mise(s) a jour : elles annoncaient que les autres n avaient pas ete touchees.`);
