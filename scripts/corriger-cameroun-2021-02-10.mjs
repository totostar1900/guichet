/**
 * LE CAMEROUN DU 10 FEVRIER 2021 : DEUX CASES, UNE FAUSSE ET UNE OUBLIEE.
 *
 * Seule des cent quatre-vingt-treize seances portant le limite et le moyen,
 * elle imprimait un moyen de 2,16 sous un minimum de 2,20. Une moyenne des
 * taux servis ne peut pas tomber sous le plus bas taux RECU, le servi etant
 * un sous-ensemble du recu.
 *
 * LA PIECE PORTE UNE COUCHE DE TEXTE, et son OCR se decode parce que DEUX
 * VALEURS DU MEME DOCUMENT prouvent ses substitutions :
 *
 *   « t90.00% » est le taux de couverture, et 38 000 / 20 000 fait 190,00 %,
 *   donc t vaut 1 ;
 *   « 2,l6Yo » est le taux moyen que nous avons deja lu a 2,16, donc l vaut 1.
 *
 * Dès lors « 2,tlyo » se lit 2,11 %, et c est le TAUX MINIMUM PROPOSE. Notre
 * 2,20 etait le taux limite recopie dans la case d a cote. Avec 2,11 l ordre
 * tient : 2,11 ≤ 2,16 ≤ 2,20 ≤ 3,50.
 *
 * LA SIGNATURE DU RECOPIAGE EST ISOLEE. Huit seances portent un minimum egal
 * a leur limite ; sept ont aussi leur moyen egal, ce qui est un carnet plat
 * et parfaitement normal. Une seule a un moyen different, et c est celle-ci.
 *
 * LA SECONDE CASE EST OUBLIEE, PAS FAUSSE. Le formulaire camerounais imprime
 * DEUX moyennes, « taux d interet moyen pondere » 2,16 % et « taux de
 * rendement moyen pondere » 2,18 %. La seconde est le rendement actuariel,
 * que le Tresor calcule lui-meme : c est la meilleure des sources, puisqu
 * elle ne suppose rien. Nous la gardons trente-trois fois sur cinquante et
 * une seances camerounaises, pas celle-ci.
 *
 *   npx tsx --conditions=react-server scripts/corriger-cameroun-2021-02-10.mjs [--ecrire]
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

const MIN = 2.11;
const RENDEMENT = 2.18;

const r = (await repo().listAuctionResults({ limit: 2000 })).find((x) => x.codeEmission === "CM1200000998" && x.sessionOn === "2021-02-10");
if (!r) {
  dire("seance introuvable");
  process.exit(1);
}

/* LES GARDES, dans l ordre des choses qu on pourrait avoir mal comprises. */
if (Number(r.rateMin) !== Number(r.rateLimit)) {
  dire(`Le minimum (${r.rateMin}) ne vaut plus le limite (${r.rateLimit}) : la signature du recopiage a disparu, on ne touche a rien.`);
  process.exit(1);
}
if (!(Number(r.rateAvg) < Number(r.rateMin))) {
  dire(`Le moyen (${r.rateAvg}) n est plus sous le minimum : l anomalie a disparu, on ne touche a rien.`);
  process.exit(1);
}
/* La couverture imprimee doit confirmer les montants, puisque c est elle qui
   a prouve la substitution « t = 1 ». */
const couverture = (Number(r.bid) / Number(r.announced)) * 100;
if (Math.abs(couverture - Number(r.coverage)) > 0.5) {
  dire(`La couverture imprimee (${r.coverage} %) ne retombe pas sur ${couverture.toFixed(2)} % : la preuve de lecture s effondre, on ne touche a rien.`);
  process.exit(1);
}
/* Et la valeur retenue doit remettre les quatre cases dans l ordre. */
if (!(MIN <= Number(r.rateAvg) && Number(r.rateAvg) <= Number(r.rateLimit) && Number(r.rateLimit) <= Number(r.rateMax))) {
  dire(`Avec ${MIN}, l ordre des quatre cases ne tiendrait toujours pas : on ne touche a rien.`);
  process.exit(1);
}

if (r.yieldAvg != null && Math.abs(Number(r.yieldAvg) - RENDEMENT) > 0.005) {
  dire(`Le rendement en base (${r.yieldAvg}) n est pas celui de la piece (${RENDEMENT}) : NON COMPRIS, on ne touche a rien.`);
  process.exit(1);
}

dire(`=== CE QUE LA CORRECTION DEPLACE ===`);
dire(`   taux minimum proposé   ${r.rateMin} → ${MIN}`);
dire(`   rendement moyen pondéré ${r.yieldAvg ?? "absent"} · déjà juste, on n'y touche pas`);
dire(`   l'ordre devient : ${MIN} ≤ ${r.rateAvg} ≤ ${r.rateLimit} ≤ ${r.rateMax}`);
dire(`   couverture imprimée ${r.coverage} % · recalculée ${couverture.toFixed(2)} % : la preuve de lecture tient`);

if (!ecrire) {
  dire(`\nEssai a blanc. Relancer avec --ecrire.`);
  process.exit(0);
}

const note =
  `Taux minimum proposé rétabli à ${MIN} %. ` +
  `La lecture portait ${r.rateMin} % au minimum, qui est le taux limite recopié dans la case voisine : un taux moyen pondéré de ${r.rateAvg} % ne peut pas tomber sous le plus bas taux reçu, le servi étant un sous-ensemble du reçu. ` +
  `Le communiqué porte une couche de texte, et son OCR se décode parce que deux valeurs du même document prouvent ses substitutions : « t90.00% » est le taux de couverture, et 38 000 / 20 000 fait bien 190,00 %, donc t vaut 1 ; « 2,l6Yo » est le taux moyen déjà lu à ${r.rateAvg} %, donc l vaut 1. Dès lors « 2,tlyo » se lit ${MIN} %. ` +
  `L'ordre des quatre cases redevient ${MIN} ≤ ${r.rateAvg} ≤ ${r.rateLimit} ≤ ${r.rateMax}. ` +
  `Le formulaire camerounais imprime deux moyennes, « taux d'intérêt moyen pondéré » ${r.rateAvg} % et « taux de rendement moyen pondéré » ${RENDEMENT} %, et les deux étaient bien relevées : la seconde est le rendement actuariel calculé par le Trésor lui-même, donc la meilleure des sources, puisqu'elle ne suppose rien. ` +
  `C'était la seule des cent quatre-vingt-treize séances portant le limite et le moyen dont l'ordre des quatre cases ne tenait pas. Établi le 18 octobre 2026.`;

const { error } = await sb
  .from("auction_results")
  .update({ rate_min: MIN, correction: r.correction ? `${r.correction}\n\n${note}` : note, confirmed_by: null, confirmed_at: null, updated_at: new Date().toISOString() })
  .eq("id", r.id);
dire(error ? `\nERREUR : ${error.message}` : `\n=== corrigee et rouverte a la relecture ===`);
