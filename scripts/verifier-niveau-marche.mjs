/**
 * LE MODULE RETROUVE-T-IL LES CHIFFRES DE LA MAQUETTE ?
 *
 * La maquette calculait son niveau de marche dans un script a part. Le
 * module de domaine le refait, avec des regles ecrites plutot
 * qu improvisees. Les deux doivent tomber d accord sur les memes lignes,
 * sans quoi l un des deux se trompe et on ne saurait pas lequel.
 *
 * UNE DIFFERENCE EST ATTENDUE, et elle est voulue : le module EXIGE une
 * seance relue, la maquette non. Il en proposera donc moins, et c est le
 * bon sens : une faute de lecture sur un scan ne doit pas devenir la
 * reference de toutes les offres suivantes.
 *
 *   npx tsx --conditions=react-server scripts/verifier-niveau-marche.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const { niveauDuMarche, ligneDuNiveau } = await import("../src/lib/market/niveau-marche.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const fr = (v, n = 2) => (v == null ? "—" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n }));

const AUJ = new Date().toISOString().slice(0, 10);
const historique = await repo().listAuctionResults({ limit: 2000 });
const offres = (await repo().listOffers()).filter((o) => ["BTA", "OTA", "APE"].includes(o.kind) && !["closed", "archived"].includes(o.status) && o.maturityOn);

dire(`${historique.length} seances a l historique · ${offres.length} lignes ouvertes\n`);

for (const o of offres) {
  const annees = (Date.parse(o.maturityOn) - Date.parse(AUJ)) / 86_400_000 / 365;
  const instrument = o.kind === "BTA" ? "BTA" : "OTA";
  const strict = niveauDuMarche({ country: o.country, instrument, annees, on: AUJ }, historique);
  const large = niveauDuMarche({ country: o.country, instrument, annees, on: AUJ }, historique, { exigerRelues: false });

  dire(`${o.kind} ${o.country} ${o.maturityOn} · ${fr(annees)} ans`);
  if (!strict && !large) {
    dire(`   aucun comparable, meme sans exiger la relecture`);
  } else if (!strict && large) {
    dire(`   RIEN en exigeant la relecture · ${fr(large.point)} % sinon, sur ${large.seances.length} seance(s) non relue(s)`);
  } else {
    dire(`   ${fr(strict.point)} %   fourchette ${fr(strict.bas)} – ${fr(strict.haut)}`);
    dire(`   ${ligneDuNiveau(strict)}`);
    if (large && large.seances.length > strict.seances.length) {
      dire(`   sans l exigence de relecture : ${fr(large.point)} % sur ${large.seances.length} seances`);
    }
  }
  dire("");
}

/* COMBIEN DE LIGNES L EXIGENCE DE RELECTURE PRIVE-T-ELLE DE REFERENCE ? */
let avec = 0;
let sans = 0;
for (const o of offres) {
  const annees = (Date.parse(o.maturityOn) - Date.parse(AUJ)) / 86_400_000 / 365;
  const instrument = o.kind === "BTA" ? "BTA" : "OTA";
  if (niveauDuMarche({ country: o.country, instrument, annees, on: AUJ }, historique)) avec += 1;
  if (niveauDuMarche({ country: o.country, instrument, annees, on: AUJ }, historique, { exigerRelues: false })) sans += 1;
}
dire(`=== ${avec} ligne(s) sur ${offres.length} recoivent un niveau · ${sans} si l on n exige pas la relecture ===`);
dire(`   L exigence en prive ${sans - avec}. Elle reste posee : la relecture est`);
dire(`   le seul garde-fou entre un scan mal lu et toutes les offres suivantes.`);
