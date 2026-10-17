/**
 * L AVIS D EMISSION DIT LUI-MEME SI LA SEANCE EST UN ABONDEMENT.
 *
 * La deduction « emission = echeance moins duree » se trompe de quelques
 * jours quand l etiquette de duree est arrondie : une ligne creee le 4
 * septembre 2019 et remboursee le 23 aout 2021 porte « 2 ans », et la
 * deduction la fait naitre douze jours avant sa propre seance. C est la
 * SEULE contradiction qu avait trouvee le test des trente, et elle vient
 * peut-etre de la, pas de l hypothese.
 *
 * On ne regle pas une fenetre pour faire disparaitre une contrariete : on
 * change de source. Les avis d emission sont le second document de chaque
 * seance, et ils portent un champ « abondement » LU SUR LA PIECE.
 *
 * Le script croise les deux tables et repose la question :
 *
 *   une seance que l avis declare NEUVE peut-elle imprimer un prix moyen
 *   superieur a son maximum ? Non, si l hypothese tient.
 *
 *   une seance que l avis declare ABONDEE peut-elle imprimer un prix moyen
 *   egal a son limite au millieme, alors qu elle porte du couru ? Non plus.
 *
 *   npx tsx --conditions=react-server scripts/abondement-selon-l-avis.mjs
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
const fr = (v, n = 3) => (v == null ? "—" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n }));

/* PAGINER. Le client coupe a mille lignes sans le dire. */
const avis = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb
    .from("emission_notices")
    .select("country,instrument,session_on,code_emission,abondement,maturity_on,settle_on,tenor,source_title")
    .range(de, de + 999);
  if (error) throw new Error(error.message);
  avis.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
dire(`${avis.length} avis d emission en base`);

const parClef = new Map();
for (const a of avis) parClef.set(`${a.country}|${a.session_on}|${a.code_emission ?? ""}`, a);

const toutes = await repo().listAuctionResults({ limit: 2000 });
const gabon = toutes
  .filter((r) => r.instrument === "OTA" && r.country === "Gabon" && r.priceLimit != null && r.priceAvg != null)
  .sort((a, b) => a.sessionOn.localeCompare(b.sessionOn));

const avecAvis = gabon.filter((r) => parClef.has(`Gabon|${r.sessionOn}|${r.codeEmission ?? ""}`));
dire(`${gabon.length} obligations gabonaises · ${avecAvis.length} avec un avis d emission apparie\n`);

if (!avecAvis.length) {
  const gabonAvis = avis.filter((a) => a.country === "Gabon" && a.instrument === "OTA");
  dire(`   ${gabonAvis.length} avis gabonais d OTA en base. Echantillon des clefs :`);
  for (const a of gabonAvis.slice(0, 10)) dire(`      ${a.session_on} ${a.code_emission ?? "—"} abondement=${a.abondement} echeance=${a.maturity_on ?? "—"} reglement=${a.settle_on ?? "—"}`);
}

dire(`\n   ${"seance".padEnd(11)} ${"code".padEnd(14)} ${"l avis dit".padEnd(11)} ${"reglement".padEnd(11)} ${"imprime".padStart(8)} ${"limite".padStart(7)} ${"max".padStart(7)}`);
for (const r of avecAvis) {
  const a = parClef.get(`Gabon|${r.sessionOn}|${r.codeEmission ?? ""}`);
  const m = r.correction?.match(/COUPON COMPRIS, ([\d\s]+,[\d]+) %/);
  const imprime = m ? Number(m[1].replace(/\s/g, "").replace(",", ".")) : Number(r.priceAvg);
  dire(
    `   ${r.sessionOn}  ${String(r.codeEmission).padEnd(14)} ${(a.abondement ? "ABONDEMENT" : "neuve").padEnd(11)} ${String(a.settle_on ?? "—").padEnd(11)} ${fr(imprime).padStart(8)} ${fr(r.priceLimit, 2).padStart(7)} ${fr(r.priceMax, 2).padStart(7)}`,
  );
}
