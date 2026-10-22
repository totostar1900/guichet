/**
 * RELECTURE CIBLEE : UN LOT NOMME, DES CHAMPS VIDES, RIEN D AUTRE.
 *
 * Ecrit pour les dix-neuf congolaises sans echeance, generalise pour les
 * cinq gabonaises de 2019 plutot que recopie : un sixieme script presque
 * identique est un sixieme endroit ou la regle de non-ecrasement peut etre
 * oubliee.
 *
 * On ne relit que des scans muets, c est-a-dire les seuls cas ou aucune
 * source gratuite ne reste, et ce que l appel achete est nomme avant
 * d etre paye.
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
 *   npx tsx --conditions=react-server scripts/relire-ciblee.mjs --pays Congo --sans echeance [--ecrire] [--max N]
 *   npx tsx --conditions=react-server scripts/relire-ciblee.mjs --pays Gabon --sans duree    [--ecrire] [--max N]
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
const { readSource } = await import("../src/lib/intake/storage.ts");
const { readAuctionResult } = await import("../src/lib/market/auction-extract.ts");
const { vieRestante } = await import("../src/lib/market/yield.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ecrire = process.argv.includes("--ecrire");
const max = Number(process.argv[process.argv.indexOf("--max") + 1]) || 99;
const pays = process.argv[process.argv.indexOf("--pays") + 1];
const sansQuoi = process.argv[process.argv.indexOf("--sans") + 1] ?? "echeance";
if (!pays || !["echeance", "duree"].includes(sansQuoi)) {
  fs.writeSync(1, `Usage : --pays <Pays> --sans <echeance|duree> [--ecrire] [--max N]\n`);
  process.exit(1);
}

const DUREE = { "11": "13 semaines", "12": "26 semaines", "13": "52 semaines" };
/* Douze caracteres : deux lettres de pays, un chiffre d instrument, un
   caractere de duree, puis EXACTEMENT HUIT CHIFFRES. */
const BIEN_FORME = /^[A-Z]{2}[0-9][0-9A-Z]\d{8}$/;
const PREFIXE = { Cameroun: "CM", Congo: "CG", Gabon: "GA", Tchad: "TD", "Guinée équatoriale": "GQ", Centrafrique: "CF" };
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
  ["codeEmission", "code_emission"],
  ["couponRate", "coupon_rate"],
  ["bidders", "bidders"],
  ["networkSize", "network_size"],
  ["coverage", "coverage"],
  /* LES CHIFFRES AUSSI, ET IL LE FAUT. Cinq gabonaises de 2019 sont des
     coquilles entierement vides : leur donner une duree et une echeance
     sans leurs taux les laisserait HORS DE LA COURBE, faute du moindre
     rendement, et l exercice n aurait servi a rien. La regle « seulement
     si le champ est vide » reste le garde, et elle suffit : il n y a rien
     a contredire dans une case qui ne porte rien. */
  ["announced", "announced"],
  ["bid", "bid"],
  ["served", "served"],
  ["rateMin", "rate_min"],
  ["rateMax", "rate_max"],
  ["rateLimit", "rate_limit"],
  ["rateAvg", "rate_avg"],
  ["priceMin", "price_min"],
  ["priceMax", "price_max"],
  ["priceLimit", "price_limit"],
  ["priceAvg", "price_avg"],
  ["yieldAvg", "yield_avg"],
];
/* Les champs qu on se contente de comparer, pour voir si la lecture
   d aujourd hui dit autre chose que celle d hier. */
const COMPARES = ["rateMin", "rateMax", "rateLimit", "rateAvg", "priceMin", "priceMax", "priceLimit", "priceAvg", "announced", "bid", "served", "codeEmission"];

const toutes = await repo().listAuctionResults({ limit: 2000 });
/* « sans duree » vise les seances qui ne sont PAS DU TOUT sur la courbe,
   faute du moindre rendement ; « sans echeance » celles qui y sont posees
   par leur etiquette. Ce ne sont pas les memes manques ni les memes
   enjeux, et les confondre ferait relire des pieces pour rien. */
const vise = toutes
  .filter((r) => r.country === pays && r.fileKey && !r.setAsideAt && (sansQuoi === "echeance" ? !r.maturityOn : vide(r.tenor)))
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
    const connu = r.codeEmission ? ` Le code d'émission ${r.codeEmission} est connu.` : "";
    const hint = `Séance du ${r.sessionOn}, ${r.instrument}${vide(r.tenor) ? "" : ` ${r.tenor}`}, ${pays}.${connu} Relève surtout la durée et l'échéance. Si la pièce porte PLUSIEURS lignes, dis-le en remarque.`;
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

  /* LE GARDE SUR LE CODE. Douze caracteres, et son caractere de duree doit
     s accorder avec la duree qu on ecrit : un code mal lu ne proteste pas,
     il rattache simplement la ligne a rien, et c est ce qui a coute le
     « GAZ000000026 » du 17 octobre. */
  let code = p.codeEmission ? String(p.codeEmission).trim() : undefined;
  if (code) {
    const dureeEcrite = duree ?? (vide(r.tenor) ? undefined : String(r.tenor));
    if (!BIEN_FORME.test(code)) {
      motif = (motif ? motif + " · " : "") + `code « ${code} » hors norme`;
      code = undefined;
    } else if (code.slice(0, 2) !== PREFIXE[pays]) {
      motif = (motif ? motif + " · " : "") + `code « ${code} » n est pas du ${pays}`;
      code = undefined;
    } else if (r.instrument === "BTA" && DUREE[code.slice(2, 4)] && dureeEcrite && DUREE[code.slice(2, 4)] !== dureeEcrite) {
      motif = (motif ? motif + " · " : "") + `code « ${code} » annonce ${DUREE[code.slice(2, 4)]}, la duree dit ${dureeEcrite}`;
      code = undefined;
    }
  }

  const aRemplir = {};
  for (const [champ, colonne] of REMPLISSABLES) {
    const valeur = champ === "maturityOn" ? echeance : champ === "tenor" ? duree : champ === "codeEmission" ? code : p[champ];
    if (valeur == null) continue;
    if (!vide(r[champ])) continue; /* JAMAIS par-dessus une vraie valeur */
    aRemplir[colonne] = valeur;
  }
  const vus = COMPARES.filter((c) => p[c] != null && !vide(r[c]) && String(p[c]) !== String(r[c])).map((c) => `${c} : base « ${r[c]} » · lecture « ${p[c]} »`);
  if (vus.length) desaccords.push({ r, vus });
  if (motif && !echeance) refusees.push({ r, motif, propose: p.maturityOn });

  for (const rem of lecture.remarks ?? []) dire(`      REMARQUE ${rem}`);

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
