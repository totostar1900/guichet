/**
 * REMETTRE LES CODES DECALES SUR LEUR LIGNE.
 *
 * Ce matin la regle etait « reparer la FORME, jamais l ATTRIBUTION ».
 * Elle tenait parce qu on ne savait pas QUI avait raison. On le sait
 * maintenant, et on le sait par deux mesures independantes, donc la
 * regle devient : on ne repare une attribution QUE si elle se mesure.
 *
 *   LA MAJORITE DES BULLETINS. Une ligne paraît dans jusqu a dix
 *   arretes. Quand neuf disent un code et un seul en dit un autre, ce
 *   n est pas un desaccord mais une faute de lecture.
 *
 *   LA COLONNE QUI A GLISSE. Pour chaque rangee en desaccord on demande :
 *   ses montants ressemblent-ils a ceux que les autres bulletins donnent
 *   A SON ECHEANCE, ou a ceux qu ils donnent AU CODE QU ELLE PORTE ? Sur
 *   le bloc gabonais du n°11 la reponse est HUIT A ZERO en faveur de
 *   l echeance : la rangee garde ses chiffres et recoit le code d une
 *   voisine.
 *
 * ON NE TRANCHE PAS PAR LA VARIANCE DES MONTANTS : « titres » et
 * « encours » changent legitimement d un trimestre a l autre, parce
 * qu une ligne s abonde et s amortit. Deux de mes mesures s y sont
 * trompees, et l une a conclu l inverse de la verite.
 *
 * QUATRE GARDES, et il suffit qu un seul manque pour laisser la rangee :
 *   la majorite doit etre STRICTE et porter au moins deux voix ;
 *   les montants doivent suivre l echeance ET PAS le code ;
 *   le code attendu doit etre bien forme ;
 *   la rangee ne doit pas avoir deja ete touchee.
 *
 * REVERSIBLE : « isin_imprime » garde ce que le bulletin imprime et
 * « isin_motif » dit pourquoi, donc « isin = coalesce(isin_imprime,
 * isin) » rend le registre a sa lettre.
 *
 *   npx tsx --conditions=react-server scripts/reparer-decalage-du-registre.mjs [--ecrire]
 */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ecrire = process.argv.includes("--ecrire");

const BIEN_FORME = /^[A-Z]{2}[0-9][0-9A-Z]\d{8}$/;

const lignes = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("beac_encours_lignes").select("id,arrete,pays,isin,isin_imprime,isin_motif,instrument,emis_le,echeance_le,tenor,titres,faciale,encours,source_titre").range(de, de + 999);
  if (error) throw new Error(error.message);
  lignes.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
dire(`${lignes.length} lignes · ${new Set(lignes.map((r) => r.arrete)).size} arretes\n`);

const cle = (r) => `${r.pays}|${r.echeance_le}`;

/* LA MAJORITE, PAR LIGNE. */
const voix = new Map();
for (const r of lignes) {
  if (!r.isin) continue;
  const v = voix.get(cle(r)) ?? new Map();
  v.set(r.isin, (v.get(r.isin) ?? 0) + 1);
  voix.set(cle(r), v);
}

/** Les montants de cette rangée suivent-ils son échéance, ou son code ? */
function queSuiventLesMontants(r) {
  const ailleurs = lignes.filter((x) => x.arrete !== r.arrete && x.pays === r.pays);
  const commeEcheance = ailleurs.some((x) => x.echeance_le === r.echeance_le && x.titres === r.titres && x.faciale === r.faciale);
  const commeCode = ailleurs.some((x) => x.isin === r.isin && x.titres === r.titres && x.faciale === r.faciale);
  if (commeEcheance && !commeCode) return "échéance";
  if (commeCode && !commeEcheance) return "code";
  return null;
}

const candidats = [];
const laisses = [];
for (const r of lignes) {
  if (!r.isin) continue;
  const v = voix.get(cle(r));
  const tri = [...v].sort((a, b) => b[1] - a[1]);
  if (tri.length < 2) continue;
  if (tri[0][0] === r.isin) continue;
  const [attendu, pour] = tri[0];
  const contre = v.get(r.isin) ?? 0;

  const quoi = { r, attendu, pour, contre };
  if (pour <= contre) { laisses.push([quoi, `majorité non stricte (${pour} contre ${contre})`]); continue; }
  if (pour < 2) { laisses.push([quoi, `une seule voix pour « ${attendu} »`]); continue; }
  if (!BIEN_FORME.test(attendu)) { laisses.push([quoi, `le code attendu « ${attendu} » n'est pas bien formé`]); continue; }
  if (r.isin_imprime) { laisses.push([quoi, "rangée déjà touchée"]); continue; }
  const suit = queSuiventLesMontants(r);
  if (suit !== "échéance") { laisses.push([quoi, suit === "code" ? "ses montants suivent SON CODE : c'est peut-être l'échéance qui a glissé" : "ses montants ne tranchent pas"]); continue; }
  candidats.push(quoi);
}

dire(`=== CE QUI SERAIT REMIS SUR SA LIGNE ===`);
const parArrete = new Map();
for (const x of candidats) {
  const k = `${x.r.arrete} ${x.r.pays} ${x.r.instrument}`;
  const v = parArrete.get(k) ?? [];
  v.push(x);
  parArrete.set(k, v);
}
for (const [k, xs] of [...parArrete].sort()) {
  dire(`\n   --- ${k} · ${xs.length} rangée(s) ---`);
  for (const x of xs.sort((a, b) => String(a.r.echeance_le).localeCompare(String(b.r.echeance_le))))
    dire(`      éch ${x.r.echeance_le} · « ${x.r.isin} » → « ${x.attendu} » · ${x.pour} bulletin(s) contre ${x.contre}`);
}
dire(`\n=== ${candidats.length} rangée(s) · ${parArrete.size} tableau(x) touché(s) ===`);

dire(`\n=== LAISSÉ, ET POURQUOI ===`);
if (!laisses.length) dire(`   aucune`);
for (const [x, motif] of laisses)
  dire(`   ${x.r.arrete} ${x.r.pays} éch ${x.r.echeance_le} « ${x.r.isin} » (attendu « ${x.attendu} », ${x.pour} contre ${x.contre}) · ${motif}`);

if (!ecrire) { dire(`\nEssai à blanc. Relancer avec --ecrire.`); process.exit(0); }

let n = 0;
for (const x of candidats) {
  const { r, attendu, pour, contre } = x;
  const motif =
    `Code remis sur sa ligne le ${new Date().toISOString().slice(0, 10)} : le bulletin imprime « ${r.isin} », qui appartient à une autre échéance. ` +
    `DEUX MESURES INDÉPENDANTES le disent. La MAJORITÉ DES BULLETINS : ${pour} arrêté(s) attribuent « ${attendu} » à l'échéance du ${r.echeance_le}, contre ${contre}. ` +
    `ET LA COLONNE QUI A GLISSÉ : les montants de cette rangée (${r.titres ?? "—"} titres de ${r.faciale}) sont ceux que les autres bulletins donnent À CETTE ÉCHÉANCE, et non ceux qu'ils donnent au code « ${r.isin} ». ` +
    `La rangée a donc gardé ses dates et ses chiffres, et reçu le code d'une voisine : c'est la colonne des codes qui s'est décalée, et l'échéance fait foi. ` +
    `On ne tranche jamais par la variance des montants, qui changent légitimement d'un trimestre à l'autre quand une ligne s'abonde ou s'amortit. ` +
    `Ce que la BEAC imprime est gardé ici, et « isin = coalesce(isin_imprime, isin) » rend le registre à sa lettre.`;
  const { error } = await sb
    .from("beac_encours_lignes")
    .update({ isin: attendu, isin_imprime: r.isin, isin_motif: motif, updated_at: new Date().toISOString() })
    .eq("id", r.id);
  if (error) dire(`   ERREUR ${r.id} : ${error.message}`);
  else n += 1;
}
dire(`\n=== ${n} rangée(s) remise(s) sur leur ligne ===`);

const apres = [];
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from("beac_encours_lignes").select("pays,isin,echeance_le,isin_imprime").range(de, de + 999);
  apres.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
const voix2 = new Map();
for (const r of apres) {
  if (!r.isin) continue;
  const k = `${r.pays}|${r.echeance_le}`;
  const v = voix2.get(k) ?? new Set();
  v.add(r.isin);
  voix2.set(k, v);
}
dire(`   lignes portant plusieurs codes selon le bulletin : ${[...voix2.values()].filter((v) => v.size > 1).length} sur ${voix2.size}`);
dire(`   rangées gardant le code imprimé à côté du code retenu : ${apres.filter((r) => r.isin_imprime).length}`);
