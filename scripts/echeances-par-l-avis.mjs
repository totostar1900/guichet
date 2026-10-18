/**
 * TROIS ECHEANCES QUE L AVIS D EMISSION PORTE DEJA.
 *
 * UNE SECONDE PIECE EST UN TEMOIN, JAMAIS UNE CORRECTION : la regle est
 * ecrite depuis le 16 octobre, trente-neuf lignes ecrasees dont dix-neuf
 * signees. Elle vise l ECRASEMENT. Ici le champ est VIDE : le remplir
 * depuis un second document n est pas le contredire, c est le lire.
 *
 * On ne prend que l avis portant LE MEME CODE D EMISSION, et non celui de
 * la meme seance : deux lignes du meme jour ont deux echeances, et
 * l apparier par la date melangerait l une avec l autre.
 *
 * DEUX GARDES. L avis doit porter une duree qui s accorde avec le code du
 * resultat, et pour une ligne neuve l echeance doit tomber a quelques
 * jours du reglement plus la duree. Un abondement est dispense du second,
 * son echeance etant celle de la ligne.
 *
 *   npx tsx --conditions=react-server scripts/echeances-par-l-avis.mjs [--ecrire]
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

const SEMAINES = { "13 semaines": 13, "26 semaines": 26, "52 semaines": 52 };
const DUREE = { "11": "13 semaines", "12": "26 semaines", "13": "52 semaines" };

const avis = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("emission_notices").select("country,session_on,instrument,tenor,code_emission,maturity_on,settle_on,source_title").range(de, de + 999);
  if (error) throw new Error(error.message);
  avis.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}

const toutes = await repo().listAuctionResults({ limit: 2000 });
const sans = toutes.filter((r) => !r.maturityOn && r.codeEmission && !r.setAsideAt);
dire(`${sans.length} seance(s) sans echeance et avec un code, tous Tresors\n`);

let n = 0;
for (const r of sans) {
  const a = avis.find((x) => x.code_emission === r.codeEmission && x.maturity_on);
  if (!a) continue;

  /* Garde 1 : la duree de l avis doit s accorder avec le code du resultat. */
  const parLeCode = r.instrument === "BTA" ? DUREE[r.codeEmission.slice(2, 4)] : undefined;
  if (parLeCode && a.tenor && String(a.tenor) !== parLeCode) {
    dire(`   ${r.sessionOn} ${r.codeEmission} : l avis dit « ${a.tenor} », le code dit « ${parLeCode} », NON COMPRIS, laisse`);
    continue;
  }

  /* Garde 2 : pour une ligne neuve, l echeance doit tomber pres du
     reglement plus la duree. Un abondement en est dispense. */
  const sem = SEMAINES[parLeCode ?? String(r.tenor)];
  let note2 = "abondement ou durée inconnue : l'échéance n'a pas à suivre le règlement";
  if (sem && a.settle_on) {
    const attendue = new Date(`${a.settle_on}T00:00:00Z`);
    attendue.setUTCDate(attendue.getUTCDate() + sem * 7);
    const ecart = Math.abs(Math.round((Date.parse(a.maturity_on) - attendue.getTime()) / 86_400_000));
    note2 = ecart <= 3 ? `ligne neuve : l'échéance tombe à ${ecart} jour(s) du règlement plus ${sem} semaines` : `écart de ${ecart} jours au règlement plus ${sem} semaines : abondement probable`;
  }

  dire(`   ${r.sessionOn} ${String(r.country).padEnd(10)} ${r.codeEmission} → ${a.maturity_on}`);
  dire(`      ${note2}`);
  dire(`      ${a.source_title}`);
  if (!ecrire) continue;

  const note =
    `Échéance relevée sur l'avis d'émission portant le même code, « ${a.source_title} » : ${a.maturity_on}. ` +
    `Le communiqué de résultats ne l'imprimait pas, ou sa lecture ne l'a pas trouvée, et le champ était vide. ` +
    `Une seconde pièce est un témoin et jamais une correction, mais la règle vise l'écrasement : remplir un champ vide depuis un second document n'est pas le contredire, c'est le lire. ` +
    `${note2.charAt(0).toUpperCase()}${note2.slice(1)}. ` +
    `L'appariement se fait par le code d'émission et non par la date de séance : deux lignes du même jour ont deux échéances. ` +
    `Établi le 18 octobre 2026.`;
  const { error } = await sb
    .from("auction_results")
    .update({ maturity_on: a.maturity_on, correction: r.correction ? `${r.correction}\n\n${note}` : note, updated_at: new Date().toISOString() })
    .eq("id", r.id);
  if (error) dire(`      ERREUR : ${error.message}`);
  else n++;
}
dire(ecrire ? `\n=== ${n} echeance(s) relevee(s) ===` : `\nEssai a blanc. Relancer avec --ecrire.`);
