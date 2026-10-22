/**
 * DEUX BONS CONGOLAIS : LE JOUR DE L ECHEANCE PRIS POUR LA DUREE.
 *
 * L etiquette congolaise s ecrit « BTA-{duree} {jour}-{MOIS}-{annee} ».
 * L OCR a mange le numero de duree sur deux pieces du 17 novembre 2021, et
 * nous avons lu le JOUR de l echeance comme la duree :
 *
 *   « BTA-13 18-FEVR-2022 » lu « BTA-18 FEVR-2022 » → « 18 semaines »
 *   « BTA-26 13-MAI-2022 »  lu « BTA-13 MAI-2022 »  → « 13 semaines »
 *
 * LE CODE TRANCHE, et il a ete verifie avant de servir : le chiffre des
 * troisieme et quatrieme caracteres porte la duree sur cent soixante-treize
 * bons, 11 pour treize semaines a 97 %, 12 pour vingt-six a 99 %, 13 pour
 * cinquante-deux a 100 %. Les SEULS desaccords de toute la base sont ces
 * deux-la.
 *
 * ET TOUT SE REFERME. CG1100000252 porte « a l emission », donc ligne
 * neuve : reglement du 19 novembre 2021 plus treize semaines donne
 * exactement le 18 fevrier 2022, le jour que l etiquette imprime.
 * CG1200000566 porte « adjudication par ABONDEMENT DE LIGNE », donc son
 * echeance ne suit pas son reglement, et le 13 mai 2022 de l etiquette est
 * celle de la ligne abondee.
 *
 * LE PIEGE A RETENIR : l un des deux se voyait, « 18 semaines » n etant pas
 * une duree de la zone ; l autre se cachait en pleine lumiere, treize
 * semaines en etant une. Chercher les valeurs invraisemblables n aurait
 * attrape que la moitie. C est le code qui arbitre, pas la vraisemblance.
 *
 *   npx tsx --conditions=react-server scripts/corriger-deux-congolaises.mjs [--ecrire]
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

const DUREE = { "11": "13 semaines", "12": "26 semaines", "13": "52 semaines" };
const SEMAINES = { "13 semaines": 13, "26 semaines": 26, "52 semaines": 52 };

const VISEES = [
  { code: "CG1100000252", tenor: "13 semaines", echeance: "2022-02-18", neuve: true, etiquette: "BTA-13 18-FEVR-2022" },
  { code: "CG1200000566", tenor: "26 semaines", echeance: "2022-05-13", neuve: false, etiquette: "BTA-26 13-MAI-2022" },
];

const toutes = await repo().listAuctionResults({ limit: 2000 });

/* LA REGLE SE REVERIFIE A CHAQUE PASSAGE : si le code cessait d etre
   univoque, la correction perdrait son fondement sans prevenir. */
const bons = toutes.filter((r) => r.instrument === "BTA" && r.codeEmission && !r.setAsideAt);
for (const [chiffre, attendue] of Object.entries(DUREE)) {
  const lot = bons.filter((r) => r.codeEmission.slice(2, 4) === chiffre);
  const justes = lot.filter((r) => String(r.tenor) === attendue).length;
  if (!lot.length || justes / lot.length < 0.9) {
    dire(`Le chiffre ${chiffre} ne designe plus « ${attendue} » qu a ${Math.round((justes / Math.max(1, lot.length)) * 100)} % : regle non fiable, on ne touche a rien.`);
    process.exit(1);
  }
}
dire(`Regle du code verifiee sur ${bons.length} bons.\n`);

let n = 0;
for (const v of VISEES) {
  const r = toutes.find((x) => x.codeEmission === v.code);
  if (!r) {
    dire(`   ${v.code} introuvable`);
    continue;
  }
  if (DUREE[r.codeEmission.slice(2, 4)] !== v.tenor) {
    dire(`   ${v.code} : le code ne dit pas « ${v.tenor} », NON COMPRISE, laissee`);
    continue;
  }
  if (String(r.tenor) === v.tenor && r.maturityOn === v.echeance) {
    dire(`   ${v.code} : deja corrigee`);
    continue;
  }
  /* Pour une ligne NEUVE, l echeance doit tomber a reglement plus duree, a
     trois jours pres. Pour un abondement, elle ne le doit pas : on ne
     verifie alors que la coherence de l annee et du mois avec l etiquette. */
  if (v.neuve) {
    const reglement = new Date(`${r.sessionOn}T00:00:00Z`);
    reglement.setUTCDate(reglement.getUTCDate() + 2 + SEMAINES[v.tenor] * 7);
    const ecart = Math.abs(Math.round((Date.parse(v.echeance) - reglement.getTime()) / 86_400_000));
    if (ecart > 3) {
      dire(`   ${v.code} : l echeance ${v.echeance} tombe a ${ecart} jours du reglement plus ${v.tenor}, NON COMPRISE, laissee`);
      continue;
    }
    dire(`   ${v.code} : ligne neuve, l echeance tombe a ${ecart} jour(s) du reglement plus ${v.tenor}`);
  } else {
    dire(`   ${v.code} : abondement, l echeance est celle de la ligne et ne suit pas le reglement`);
  }

  dire(`      duree « ${r.tenor} » → « ${v.tenor} » · echeance ${r.maturityOn ?? "absente"} → ${v.echeance}`);
  if (!ecrire) continue;

  const note =
    `Durée et échéance rétablies depuis l'étiquette du communiqué, « ${v.etiquette} ». ` +
    `Le Trésor congolais écrit « BTA-{durée} {jour}-{MOIS}-{année} », et l'OCR a mangé le numéro de durée : le JOUR de l'échéance a été lu comme la durée, d'où « ${r.tenor} » en base. ` +
    `Le code d'émission tranche, son chiffre des troisième et quatrième caractères portant la durée sur cent soixante-treize bons de la zone, 11 pour treize semaines, 12 pour vingt-six, 13 pour cinquante-deux ; ces deux séances étaient les seuls désaccords de toute la base. ` +
    (v.neuve
      ? `La pièce porte « à l'émission », donc ligne neuve, et le règlement plus ${v.tenor} tombe exactement sur le ${v.echeance} que l'étiquette imprime. `
      : `La pièce porte « adjudication par abondement de ligne », donc l'échéance est celle de la ligne abondée et ne suit pas le règlement. `) +
    `À retenir : « 18 semaines » se voyait, n'étant pas une durée de la zone, mais « 13 semaines » se cachait en pleine lumière puisque c'en est une. Chercher les valeurs invraisemblables n'aurait attrapé que la moitié : c'est le code qui arbitre, pas la vraisemblance. ` +
    `Établi le 18 octobre 2026.`;

  const { error } = await sb
    .from("auction_results")
    .update({ tenor: v.tenor, maturity_on: v.echeance, correction: r.correction ? `${r.correction}\n\n${note}` : note, confirmed_by: null, confirmed_at: null, updated_at: new Date().toISOString() })
    .eq("id", r.id);
  if (error) dire(`      ERREUR : ${error.message}`);
  else n++;
}
dire(ecrire ? `\n=== ${n} corrigee(s) et rouverte(s) ===` : `\nEssai a blanc. Relancer avec --ecrire.`);
