/**
 * LA SÉANCE CAMEROUNAISE DU 24 JUIN 2020, DÉPOSÉE À LA MAIN.
 *
 * Elle était la dernière séance que le journal annonce et que la table
 * n'avait pas. Une seule pièce la porte, et elle est ANGLAISE : sans la
 * grammaire ouverte le 15 octobre (c21e39e) nous ne l'aurions jamais vue.
 *
 * LE LECTEUR AUTOMATIQUE L'A REFUSÉE, ET IL AVAIT RAISON. Le garde du taux
 * de couverture dit que le soumissionné sur l'annoncé doit retomber sur le
 * taux imprimé. Ici le communiqué imprime :
 *
 *   Total amount announced   25 000
 *   Total amount of bids     25 000
 *   Total amount served      25 000
 *   Coverage rate of amount  187,20 %
 *
 * Trois montants égaux donnent 100 %, pas 187,20 %. LE DÉFAUT EST DANS LA
 * PIÈCE, pas chez nous, et c'est pour cela qu'il faut une main : un robot
 * qui tranche tout seul entre deux chiffres imprimés devine.
 *
 * CE QUE NOUS NE TRANCHONS PAS. 25 000 × 1,8720 = 46 800, un produit propre,
 * donc la lecture la plus probable est que la ligne « bids » recopie la
 * ligne « announced » et que le vrai soumissionné vaut 46 800 millions.
 * Probable n'est pas lu : le montant soumissionné reste VIDE, le taux de
 * couverture est écrit tel qu'imprimé, et la note dit la contradiction.
 * Quiconque veut le soumissionné peut le déduire au vu de la note, ce qui
 * est exactement la différence entre une donnée et une déduction.
 *
 * ET LA PIÈCE CONFIRME LA CONVENTION DE LA BEAC, par surcroît : elle imprime
 * un escompte moyen de 2,71 % et un « weighted average rate of return » de
 * 2,74 %, or 2,71 / (1 moins 0,0271 × 182/364) vaut 2,747. C'est la formule
 * posée ce matin dans `rendementBeac`, vérifiée ici par la source elle-même.
 *
 * La ligne entre NON CONFIRMÉE : c'est une personne qui signe au desk.
 *
 *   npx tsx --conditions=react-server scripts/deposer-cameroun-24-juin-2020.mjs [--ecrire]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { storageKey } = await import("../src/lib/intake/cle.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ecrire = process.argv.includes("--ecrire");

const URL = "https://www.beac.int/wp-content/uploads/2020/06/communiqué-des-resultats_BTA_CMR_ENG_24-juin.pdf";
const M = 1e6;

const ligne = {
  code_emission: "CM1200000915",
  country: "Cameroun",
  instrument: "BTA",
  tenor: "26 semaines",
  session_on: "2020-06-24",
  maturity_on: "2020-12-25",
  abondement: false,
  network_size: 21,
  bidders: 7,
  announced: 25000 * M,
  bid: null,
  served: 25000 * M,
  rate_min: 2.5,
  rate_max: 6,
  rate_limit: 2.85,
  rate_avg: 2.71,
  yield_avg: 2.74,
  coverage: 187.2,
  source_url: URL,
  source_title: "Auction results communique of the Republic of Cameroon - June 24th 2020 session",
  file_key: storageKey(`beac/${decodeURIComponent(URL.split("/").pop())}`),
  read_at: new Date().toISOString(),
  read_model: null,
  correction:
    "Relevé à la main sur le communiqué anglais, le lecteur automatique l'ayant refusé à juste titre. " +
    "La pièce se contredit : elle imprime un montant soumissionné de 25 000 millions, égal à l'annoncé et au servi, " +
    "et un taux de couverture de 187,20 %, qui supposerait 46 800 millions. Le montant soumissionné reste donc vide " +
    "et le taux est écrit tel qu'imprimé. Rien n'est deviné.",
  updated_at: new Date().toISOString(),
};

dire("La séance camerounaise du 24 juin 2020 :");
for (const [k, v] of Object.entries(ligne)) {
  if (k === "correction") continue;
  dire(`   ${k.padEnd(14)} ${v === null ? "— (vide, et volontairement)" : v}`);
}

if (!ecrire) {
  dire("\nEssai a blanc. Relancer avec --ecrire.");
  process.exit(0);
}

/* LA CLEF EST (pays, séance, code), posée par la migration 0108. L'adresse de
   la pièce n'en est pas une : une traduction porte la même séance. */
const { error } = await sb.from("auction_results").upsert(ligne, { onConflict: "country,session_on,code_emission" });
dire(error ? `\nERREUR : ${error.message}` : "\nDéposée, non confirmée : elle attend une signature au desk.");
