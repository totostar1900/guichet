/**
 * RELIRE LES DIX-NEUF CONGOLAISES SANS ECHEANCE.
 *
 * Ce sont des scans muets : aucune source gratuite ne reste, et c est le
 * seul lot de la base ou un appel au modele achete quelque chose de
 * precis. Ce qu il achete est nomme avant d etre paye : une echeance, qui
 * commande la place de la seance sur la courbe.
 *
 * LA REGLE EST STRICTE ET ELLE EST LA RAISON D ETRE DE CE SCRIPT :
 *
 *   ON N ECRIT QUE DANS LES CHAMPS VIDES. Jamais par-dessus un chiffre
 *   pose. La maison a paye cette lecon le 16 octobre, trente-neuf lignes
 *   ecrasees dont dix-neuf signees, et le compte de lignes qui ne bougeait
 *   pas etait le seul signal.
 *
 *   TOUT DESACCORD SUR UN CHAMP REMPLI EST RAPPORTE, JAMAIS APPLIQUE. Une
 *   seconde lecture est un temoin : elle dit qu il faut regarder, elle ne
 *   dit pas qui a raison.
 *
 *   L ECHEANCE RECUE DOIT TENIR DEBOUT. Elle doit etre posterieure a la
 *   seance, et pour une ligne neuve tomber pres du reglement plus la duree
 *   que le CODE annonce, qui est l arbitre etabli sur cent soixante-treize
 *   bons. Une echeance qui ne passe pas ce garde est rapportee, pas ecrite.
 *
 *   npx tsx --conditions=react-server scripts/relire-les-dix-neuf-congolaises.mjs [--ecrire] [--max N]
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
const { readSource } = await import("../src/lib/intake/storage.ts");
const { readAuctionResult } = await import("../src/lib/market/auction-extract.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ecrire = process.argv.includes("--ecrire");
const max = Number(process.argv[process.argv.indexOf("--max") + 1]) || 99;

const DUREE = { "11": "13 semaines", "12": "26 semaines", "13": "52 semaines" };
const SEMAINES = { "13 semaines": 13, "26 semaines": 26, "52 semaines": 52 };

/* Les champs qu on accepte de remplir quand ils sont vides. On ne prend
   pas tout : le prix et le taux d une seance deja lue ne se completent pas
   a l aveugle, et le desk les arrete. */
/* UN TIRET N EST PAS UNE VALEUR. Six seances portent « — » comme duree :
   c est un trou qui a pris l apparence d un contenu, et le traiter comme
   rempli reviendrait a le preserver pour toujours. */
const vide = (v) => v == null || String(v).trim() === "" || String(v).trim() === "—";

const REMPLISSABLES = [
  ["tenor", "tenor"],
  ["maturityOn", "maturity_on"],
  ["couponRate", "coupon_rate"],
  ["bidders", "bidders"],
  ["networkSize", "network_size"],
  ["coverage", "coverage"],
];
/* Les champs qu on se contente de comparer, pour voir si la lecture
   d aujourd hui dit autre chose que celle d hier. */
const COMPARES = ["rateMin", "rateMax", "rateLimit", "rateAvg", "priceMin", "priceMax", "priceLimit", "priceAvg", "announced", "bid", "served", "codeEmission"];

const toutes = await repo().listAuctionResults({ limit: 2000 });
const vise = toutes
  .filter((r) => r.country === "Congo" && !r.maturityOn && r.fileKey && !r.setAsideAt)
  .sort((a, b) => a.sessionOn.localeCompare(b.sessionOn))
  .slice(0, max);

dire(`${vise.length} seance(s) a relire · ${ecrire ? "ECRITURE" : "essai a blanc"}\n`);

let ecrites = 0;
const desaccords = [];
const refusees = [];
for (const r of vise) {
  let lecture;
  try {
    const bytes = await readSource(r.fileKey);
    const hint = `Séance du ${r.sessionOn}, ${r.instrument}${r.tenor ? ` ${r.tenor}` : ""}, Congo. Le code d'émission ${r.codeEmission ?? ""} est connu : relève surtout l'échéance.`;
    lecture = await readAuctionResult(Buffer.from(bytes).toString("base64"), hint);
  } catch (e) {
    dire(`   ${r.sessionOn} ${r.codeEmission} : LECTURE IMPOSSIBLE · ${String(e.message).slice(0, 70)}`);
    continue;
  }
  const p = lecture.proposal;

  /* LE GARDE SUR L ECHEANCE. */
  let echeance = p.maturityOn;
  let motif = null;
  if (echeance) {
    if (echeance <= r.sessionOn) {
      motif = `echeance ${echeance} anterieure ou egale a la seance`;
      echeance = undefined;
    } else {
      const parLeCode = r.instrument === "BTA" && r.codeEmission ? DUREE[r.codeEmission.slice(2, 4)] : undefined;
      const sem = SEMAINES[parLeCode ?? String(r.tenor)];
      if (sem) {
        const attendue = new Date(`${r.sessionOn}T00:00:00Z`);
        attendue.setUTCDate(attendue.getUTCDate() + 2 + sem * 7);
        const ecart = Math.abs(Math.round((Date.parse(echeance) - attendue.getTime()) / 86_400_000));
        /* Un abondement s ecarte legitimement ; au-dela d un an, c est une
           autre ligne ou une mauvaise lecture, et on ne tranche pas. */
        if (ecart > 365) {
          motif = `echeance ${echeance} a ${ecart} jours du reglement plus ${sem} semaines`;
          echeance = undefined;
        } else if (ecart > 7) motif = `abondement probable : ${ecart} jours d ecart`;
      }
    }
  }

  /* Une duree recue doit etre une des trois de la zone, et s accorder avec
     le code quand il y en a un : c est l arbitre etabli sur 173 bons. */
  let duree = p.tenor;
  if (duree && r.instrument === "BTA") {
    if (!SEMAINES[String(duree)]) {
      motif = (motif ? motif + " · " : "") + `duree « ${duree} » hors des trois de la zone`;
      duree = undefined;
    } else if (r.codeEmission && DUREE[r.codeEmission.slice(2, 4)] && DUREE[r.codeEmission.slice(2, 4)] !== String(duree)) {
      motif = (motif ? motif + " · " : "") + `duree « ${duree} » contredite par le code`;
      duree = undefined;
    }
  }

  const aRemplir = {};
  for (const [champ, colonne] of REMPLISSABLES) {
    const valeur = champ === "maturityOn" ? echeance : champ === "tenor" ? duree : p[champ];
    if (valeur == null) continue;
    if (!vide(r[champ])) continue; /* JAMAIS par-dessus une vraie valeur */
    aRemplir[colonne] = valeur;
  }
  const vus = COMPARES.filter((c) => p[c] != null && !vide(r[c]) && String(p[c]) !== String(r[c])).map((c) => `${c} : base « ${r[c]} » · lecture « ${p[c]} »`);
  if (vus.length) desaccords.push({ r, vus });
  if (motif && !echeance) refusees.push({ r, motif, propose: p.maturityOn });

  const quoi = Object.keys(aRemplir).length ? Object.entries(aRemplir).map(([k, v]) => `${k}=${v}`).join(" · ") : "rien a remplir";
  dire(`   ${r.sessionOn} ${String(r.codeEmission ?? "—").padEnd(14)} ${lecture.seconds}s · ${quoi}${motif ? ` · ${motif}` : ""}`);
  if (vus.length) for (const v of vus) dire(`      DESACCORD ${v}`);

  if (!ecrire || !Object.keys(aRemplir).length) continue;
  const note =
    `Relecture ciblée du ${new Date().toISOString().slice(0, 10)} par ${lecture.model} : ${Object.entries(aRemplir).map(([k, v]) => `${k} = ${v}`).join(", ")}. ` +
    `Seuls les champs VIDES ont été remplis, jamais un chiffre déjà posé : une seconde lecture est un témoin, elle dit qu'il faut regarder et non qui a raison. ` +
    (motif ? `Noté : ${motif}. ` : "") +
    (vus.length ? `Désaccords relevés et NON appliqués : ${vus.join(" ; ")}. ` : "") +
    `La pièce est un scan muet : aucune source gratuite ne restait.`;
  const { error } = await sb
    .from("auction_results")
    .update({ ...aRemplir, read_at: new Date().toISOString(), read_model: lecture.model, correction: r.correction ? `${r.correction}\n\n${note}` : note, updated_at: new Date().toISOString() })
    .eq("id", r.id);
  if (error) dire(`      ERREUR : ${error.message}`);
  else ecrites += 1;
}

dire(`\n=== ${ecrites} seance(s) completee(s) · ${desaccords.length} avec un desaccord non applique · ${refusees.length} echeance(s) refusee(s) par le garde ===`);
for (const x of refusees) dire(`   ${x.r.sessionOn} ${x.r.codeEmission} : le modele proposait ${x.propose}, ${x.motif}`);
