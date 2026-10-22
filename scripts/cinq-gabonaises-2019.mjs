/**
 * LES CINQ GABONAISES DE 2019 : NI CODE, NI DUREE, NI TEXTE.
 *
 * Ce sont les plus pauvres de la base, et les seules qui ne soient PAS
 * SUR LA COURBE DU TOUT : sans duree, « vieRestante » ne rend rien, donc
 * « auctionYield » non plus, et la seance n existe nulle part.
 *
 * TROIS TEMOINS GRATUITS, et le premier est celui qu on oublie toujours :
 *
 *   LE TITRE DE LA PIECE, que la BEAC ecrit a l index et que nous gardons
 *   dans « sourceTitle ». Il nomme souvent la duree.
 *   L AVIS D EMISSION de la meme seance.
 *   LES SEANCES VOISINES du meme Tresor, qui disent ce que le Gabon
 *   emettait alors.
 *
 * LE TITRE EST UNE SOURCE DE SECONDE MAIN, ET CELA SE DECLARE. La maison
 * l a mesure : l index de la BEAC tire la duree du titre, saisi a la
 * main, et se trompe deux fois sur trois cent soixante-sept, le document
 * la dementant trois fois. Ce qui est imprime sur la piece passe donc
 * devant. Mais entre un titre faillible et RIEN DU TOUT, le titre gagne,
 * a condition de dire d ou il vient.
 *
 *   npx tsx --conditions=react-server scripts/cinq-gabonaises-2019.mjs
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
const { vieRestante } = await import("../src/lib/market/yield.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const avis = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("emission_notices").select("country,session_on,instrument,tenor,code_emission,maturity_on,settle_on,source_title").range(de, de + 999);
  if (error) throw new Error(error.message);
  avis.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
const toutes = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => !r.setAsideAt);
const pauvres = toutes.filter((r) => vieRestante(r) == null).sort((a, b) => a.sessionOn.localeCompare(b.sessionOn));

dire(`${pauvres.length} seance(s) hors de la courbe faute de duree\n`);
for (const r of pauvres) {
  dire(`=== ${r.sessionOn} ${r.country} ${r.instrument} ===`);
  dire(`   tenor ${JSON.stringify(r.tenor)} · code ${r.codeEmission ?? "—"} · echeance ${r.maturityOn ?? "—"}`);
  dire(`   taux min ${r.rateMin ?? "—"} limite ${r.rateLimit ?? "—"} moyen ${r.rateAvg ?? "—"} max ${r.rateMax ?? "—"}`);
  dire(`   prix min ${r.priceMin ?? "—"} limite ${r.priceLimit ?? "—"} moyen ${r.priceAvg ?? "—"} max ${r.priceMax ?? "—"}`);
  dire(`   annonce ${r.announced ?? "—"} soumis ${r.bid ?? "—"} servi ${r.served ?? "—"} couverture ${r.coverage ?? "—"}`);
  dire(`   TITRE : ${r.sourceTitle}`);
  dire(`   ADRESSE : ${decodeURIComponent(String(r.sourceUrl)).split("/").pop()}`);

  /* Ce que le titre et l adresse disent de la duree. */
  const quoi = `${r.sourceTitle} ${decodeURIComponent(String(r.sourceUrl))}`.replace(/-/g, " ");
  const sem = quoi.match(/(\d{1,2})\s*semaines?/i);
  const ans = quoi.match(/(\d{1,2})\s*ans?\b/i);
  dire(`   LA DUREE QUE LE TITRE OU L ADRESSE NOMME : ${sem ? `${sem[1]} semaines` : ans ? `${ans[1]} ans` : "aucune"}`);

  const a = avis.filter((x) => x.country === r.country && x.session_on === r.sessionOn);
  dire(`   AVIS DE LA MEME SEANCE : ${a.length}`);
  for (const x of a) dire(`      ${x.instrument} ${x.tenor ?? "—"} ${x.code_emission ?? "—"} echeance ${x.maturity_on ?? "—"} · ${String(x.source_title).slice(0, 62)}`);

  const voisines = toutes
    .filter((x) => x.country === r.country && x.instrument === r.instrument && x.sessionOn >= "2019-01-01" && x.sessionOn <= "2019-12-31" && x.tenor && String(x.tenor) !== "—")
    .map((x) => String(x.tenor));
  dire(`   CE QUE LE GABON EMETTAIT EN 2019 (${r.instrument}) : ${[...new Set(voisines)].join(" · ") || "rien d autre"}`);
  dire("");
}
