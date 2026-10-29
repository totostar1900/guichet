/**
 * UNE LIGNE NEUVE N A PAS DE COUPON COURU.
 *
 * L hypothese testee ici renverse la lecture des seances gabonaises.
 *
 *   Jusqu ici : « le Tresor gabonais imprime parfois son prix moyen coupon
 *   compris, onze fois sur trente-neuf, et ailleurs c est indiscernable ».
 *
 *   Ici : « le Tresor gabonais imprime TOUJOURS son prix moyen coupon
 *   compris. Sur une ligne NEUVE le couru vaut zero, donc rien ne se voit.
 *   Le defaut n apparait que sur un ABONDEMENT. »
 *
 * CE QUI A MIS SUR LA PISTE. Cinq communiques portent une couche d OCR.
 * Les deux que le test « le propre passerait sous le limite » declarait
 * PROPRES sont des lignes dont l echeance moins la duree tombe DEUX JOURS
 * APRES la seance : des lignes neuves, emises le jour meme. Leur couru est
 * nul, et le couru que je leur calculais venait d un anniversaire ANTERIEUR
 * A LEUR EMISSION. Un nombre invente.
 *
 * LE TEST. Pour chaque obligation gabonaise on date l emission de la ligne
 * par echeance moins duree, puis on la classe NEUVE ou ABONDEE. Si
 * l hypothese tient :
 *
 *   toute seance « prouvee propre » doit etre NEUVE, sans exception ;
 *   toute seance « prouvee sale » doit etre ABONDEE, sans exception.
 *
 * Une seule contradiction tue l hypothese. C est le but du script : lui
 * donner trente-neuf occasions de mourir.
 *
 * LE COURU SE COMPTE DEPUIS L EMISSION quand la seance tombe dans le
 * premier periode de coupon, et depuis le dernier anniversaire ensuite.
 * C est la correction de fond : compter depuis un anniversaire d avant
 * l emission fabrique du couru qui n a jamais couru.
 *
 *   npx tsx --conditions=react-server scripts/neuve-ou-abondement.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const fr = (v, n = 3) => (v == null ? "—" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n }));
const jours = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/** Les annees que porte l etiquette de duree. */
function anneesDe(tenor) {
  const m = String(tenor ?? "").match(/(\d+)/);
  if (!m || /semaine|mois/i.test(String(tenor))) return null;
  return Number(m[1]);
}

/** L emission de la LIGNE, deduite de l echeance et de la duree annoncee. */
function emissionDe(echeance, annees) {
  if (!echeance || annees == null) return null;
  const d = new Date(echeance + "T00:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() - annees);
  return d.toISOString().slice(0, 10);
}

/** Le dernier anniversaire de coupon AVANT la seance, jamais avant l emission. */
function departDuCouru(seance, echeance, emission) {
  const s = new Date(seance + "T00:00:00Z");
  const e = new Date(echeance + "T00:00:00Z");
  const d = new Date(Date.UTC(s.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
  if (d > s) d.setUTCFullYear(d.getUTCFullYear() - 1);
  const anniversaire = d.toISOString().slice(0, 10);
  if (emission && anniversaire < emission) return emission; /* le premier coupon court depuis l emission */
  return anniversaire;
}

const toutes = await repo().listAuctionResults({ limit: 2000 });
const gabon = toutes
  .filter((r) => r.instrument === "OTA" && r.country === "Gabon" && r.priceLimit != null && r.priceAvg != null && r.maturityOn && r.couponRate != null)
  .sort((a, b) => a.sessionOn.localeCompare(b.sessionOn));

dire(`${gabon.length} obligations gabonaises completes\n`);
dire(`   ${"seance".padEnd(11)} ${"code".padEnd(14)} ${"duree".padEnd(7)} ${"emission".padEnd(11)} ${"etat".padEnd(11)} ${"j".padStart(4)} ${"couru".padStart(6)} ${"imprime".padStart(8)} ${"propre".padStart(8)} ${"limite".padStart(7)} ${"max".padStart(7)}  verdict du test des bornes`);

const contre = [];
const compte = { neuveEtPropre: 0, abondeeEtSale: 0, neuveEtSale: 0, abondeeEtPropre: 0, abondeeIndecise: 0, neuveIndecise: 0 };

for (const r of gabon) {
  const annees = anneesDe(r.tenor);
  const emission = emissionDe(r.maturityOn, annees);
  const neuve = emission != null && jours(emission, r.sessionOn) <= 7 && jours(emission, r.sessionOn) >= -7;

  /* L IMPRIME. Onze lignes ont deja ete corrigees : on raisonne sur ce que la
     piece portait, pas sur ce que nous y avons ecrit. */
  const m = r.correction?.match(/COUPON COMPRIS, ([\d\s]+,[\d]+) %/);
  const imprime = m ? Number(m[1].replace(/\s/g, "").replace(",", ".")) : Number(r.priceAvg);
  const dejaCorrigee = Boolean(m);

  const depart = departDuCouru(r.sessionOn, r.maturityOn, emission);
  const j = jours(depart, r.sessionOn);
  const couru = (Number(r.couponRate) * j) / 365;
  const propre = imprime - couru;

  /* LE TEST DES BORNES, tel qu il etait pose avant l hypothese. */
  let verdict;
  if (imprime > Number(r.priceMax ?? Infinity) + 0.001) verdict = "SALE prouvee";
  else if (propre < Number(r.priceLimit) - 0.05) verdict = "propre prouvee";
  else verdict = "indecise";

  const etat = neuve ? "NEUVE" : "abondee";
  if (verdict === "propre prouvee") {
    if (neuve) compte.neuveEtPropre++;
    else {
      compte.abondeeEtPropre++;
      contre.push(r);
    }
  }
  if (verdict === "SALE prouvee") {
    if (neuve) {
      compte.neuveEtSale++;
      contre.push(r);
    } else compte.abondeeEtSale++;
  }
  if (verdict === "indecise") {
    if (neuve) compte.neuveIndecise++;
    else compte.abondeeIndecise++;
  }

  dire(
    `   ${r.sessionOn}  ${String(r.codeEmission).padEnd(14)} ${String(r.tenor).padEnd(7)} ${String(emission ?? "—").padEnd(11)} ${etat.padEnd(11)} ${String(j).padStart(4)} ${fr(couru, 2).padStart(6)} ${fr(imprime).padStart(8)} ${fr(propre).padStart(8)} ${fr(r.priceLimit, 2).padStart(7)} ${fr(r.priceMax, 2).padStart(7)}  ${verdict}${dejaCorrigee ? " (corrigee)" : ""}`,
  );
}

dire(`\n=== CE QUE L HYPOTHESE PREDIT ===`);
dire(`   neuve ET propre prouvee    ${String(compte.neuveEtPropre).padStart(3)}   attendu`);
dire(`   abondee ET sale prouvee    ${String(compte.abondeeEtSale).padStart(3)}   attendu`);
dire(`   neuve ET indecise          ${String(compte.neuveIndecise).padStart(3)}   attendu, le couru est nul donc rien ne depasse`);
dire(`   abondee ET indecise        ${String(compte.abondeeIndecise).padStart(3)}   attendu, le couru est trop petit pour depasser le maximum`);
dire(`\n=== CE QUI LA TUERAIT ===`);
dire(`   neuve ET sale prouvee      ${String(compte.neuveEtSale).padStart(3)}   une ligne sans couru ne peut pas depasser son maximum`);
dire(`   abondee ET propre prouvee  ${String(compte.abondeeEtPropre).padStart(3)}   un abondement devrait porter du couru`);
if (contre.length) {
  dire(`\n   CONTRE-EXEMPLES :`);
  for (const r of contre) dire(`      ${r.sessionOn} ${r.codeEmission} ${r.tenor} echeance ${r.maturityOn}`);
} else {
  dire(`\n   Aucune contradiction sur ${gabon.length} seances.`);
}
