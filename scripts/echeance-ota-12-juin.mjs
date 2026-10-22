/**
 * L ECHEANCE DE L OTA GABONAISE DU 12 JUIN 2019 : 29 MARS 2022.
 *
 * Elle est IMPRIMEE SUR LA PIECE, dans le libelle qui suit le code
 * (« OTA 3 ANS 5,75% 29-MARS-2022 »), et non deduite. La maison a etabli
 * sur les congolaises que le formulaire ecrit parfois la date LA et nulle
 * part ailleurs : chercher le mot « echeance » ne la trouve pas.
 *
 * DEUX TEMOINS INDEPENDANTS LA CONFIRMENT, et ils ne se parlent pas :
 *
 *   LA REGLE DES TROIS ANS. Une obligation gabonaise NEUVE echoit au
 *   reglement plus trois ans : neuf fois exactement sur dix premieres
 *   apparitions de code « 2J », la dixieme a trois jours. Le 12 juin 2019
 *   donnerait le 14 juin 2022 ; l etiquette dit 77 jours plus tot, donc
 *   la regle elle-meme refuse de voir une ligne neuve, exactement comme
 *   pour les cinq abondements connus (-7, -14, -28, -49, -84 jours).
 *
 *   LE JOUR DE LA SEMAINE. Si l etiquette dit vrai, la ligne est nee a
 *   une seance du 27 mars 2019, un MERCREDI. Les quatre-vingt-dix-sept
 *   seances gabonaises de la base sont des mercredis, sans exception.
 *   Une date inventee n atterrit pas sur le bon jour par hasard.
 *
 * Notre collecte ne porte rien de gabonais avant le 5 juin 2019 : la
 * seance mere n est pas dementie, elle manque.
 *
 *   npx tsx --conditions=react-server scripts/echeance-ota-12-juin.mjs [--ecrire]
 */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { repo } = await import("../src/lib/data/index.ts");
const { vieRestante, auctionYield } = await import("../src/lib/market/yield.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ecrire = process.argv.includes("--ecrire");

const CODE = "GA2J00000085";
const ECHEANCE = "2022-03-29";

const compter = (t) => {
  const sansEcheance = t.filter((r) => !r.maturityOn && r.tenor && String(r.tenor) !== "—");
  return { posees: sansEcheance.length, sansVie: t.filter((r) => vieRestante(r) == null).length };
};

let toutes = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => !r.setAsideAt);
const avant = compter(toutes);
const r = toutes.find((x) => x.codeEmission === CODE);
if (!r) { dire(`${CODE} introuvable`); process.exit(1); }

dire(`   ${r.sessionOn} ${r.country} ${r.instrument} ${r.tenor} ${r.codeEmission}`);
dire(`   echeance en base : ${r.maturityOn ?? "ABSENTE"}`);
dire(`   vie restante aujourd hui : ${vieRestante(r)?.years.toFixed(4)} an(s), d apres « ${vieRestante(r)?.from} »`);
const apresVie = vieRestante({ ...r, maturityOn: ECHEANCE });
dire(`   vie restante avec l echeance : ${apresVie?.years.toFixed(4)} an(s), d apres « ${apresVie?.from} »`);
dire(`   l etiquette surestime donc de ${((vieRestante(r)?.years ?? 0) - (apresVie?.years ?? 0)).toFixed(4)} an(s)`);
dire(`   rendement : ${auctionYield(r) ? `${auctionYield(r).pct} %` : "aucun · adjudication infructueuse, zero servi"}`);
dire(`\n   seances posees par leur etiquette : ${avant.posees} · hors de la courbe : ${avant.sansVie}`);

if (r.maturityOn) { dire(`\n   LE CHAMP N EST PAS VIDE. On n ecrit jamais par-dessus : rien n est fait.`); process.exit(0); }
if (!ecrire) { dire(`\nEssai a blanc. Relancer avec --ecrire.`); process.exit(0); }

const note =
  `Échéance du ${new Date().toISOString().slice(0, 10)} : ${ECHEANCE}, LUE SUR LA PIÈCE dans le libellé qui suit le code ` +
  `(« OTA 3 ANS 5,75% 29-MARS-2022 ») et non déduite. Deux témoins indépendants la confirment. ` +
  `LA RÈGLE DES TROIS ANS : une obligation gabonaise neuve échoit au règlement plus trois ans, neuf fois exactement sur dix premières apparitions de code « 2J » et la dixième à trois jours ; ` +
  `le 12 juin 2019 donnerait le 14 juin 2022, et l'étiquette tombe 77 jours plus tôt, dans la bande des cinq abondements connus (-7, -14, -28, -49, -84 jours). ` +
  `LE JOUR DE LA SEMAINE : si l'étiquette dit vrai, la ligne est née à une séance du 27 mars 2019, un mercredi, et les 97 séances gabonaises de la base sont toutes des mercredis. ` +
  `Notre collecte ne porte rien de gabonais avant le 5 juin 2019 : la séance mère n'est pas démentie, elle manque. ` +
  `CETTE SÉANCE EST DONC UN ABONDEMENT, et sans l'échéance « vieRestante » retombait sur l'étiquette « 3 ans » et surestimait de 0,20 an. ` +
  `L'adjudication a été infructueuse (zéro soumissionnaire, zéro servi) : la ligne ne porte aucun rendement, ce qui est son résultat et non un manque.`;
const { error } = await sb.from("auction_results").update({ maturity_on: ECHEANCE, correction: r.correction ? `${r.correction}\n\n${note}` : note, updated_at: new Date().toISOString() }).eq("id", r.id);
if (error) { dire(`   ERREUR : ${error.message}`); process.exit(1); }

toutes = (await repo().listAuctionResults({ limit: 2000 })).filter((x) => !x.setAsideAt);
const apres = compter(toutes);
dire(`\n=== ECRIT ===`);
dire(`   seances posees par leur etiquette : ${avant.posees} → ${apres.posees}`);
dire(`   hors de la courbe : ${avant.sansVie} → ${apres.sansVie}`);
