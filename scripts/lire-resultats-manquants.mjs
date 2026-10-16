/**
 * LIRE LES COMMUNIQUES DE RESULTATS QUE NOUS AVONS SANS LES AVOIR LUS.
 *
 * Le journal porte 302 communiques de resultats et la table en compte 255 :
 * quarante-sept pieces sont dans la bibliotheque, citees, archivees, et
 * n ont jamais rendu un chiffre. Le gros est en 2019-2021, c est-a-dire les
 * pieces espagnoles et anglaises que la grammaire du 15 octobre a rendues
 * visibles.
 *
 * TROIS CONDITIONS ETAIENT REUNIES POUR LA PREMIERE FOIS : le lecteur est
 * repare (il echouait en 400 sur une limite de schema, tout octobre), la
 * regle du point separateur de milliers est ecrite, et le taux de couverture
 * imprime sert de controle a l attribution des champs.
 *
 * ON NE DEPOSE QUE CE QUI SE TIENT :
 *
 *   l echelle, parce qu un Tresor de la zone ne sert pas dix millions ;
 *   le taux de couverture, qui doit valoir le soumissionne sur l annonce ;
 *   l identite de la seance, sans quoi la ligne ne rejoint rien.
 *
 * Le reste est COMPTE, pas devine.
 *
 *   npx tsx --conditions=react-server scripts/lire-resultats-manquants.mjs [--ecrire] [--max N]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { tout, lotDuJournal, placesInscrites } = await import("./_journal.mjs");
const { readAuctionResult } = await import("../src/lib/market/auction-extract.ts");
const { storageKey } = await import("../src/lib/intake/cle.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const BIBLIO = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet";
const ecrire = process.argv.includes("--ecrire");
const max = Number((process.argv.find((a) => a.startsWith("--max=")) ?? "--max=999").slice(6));

const absolue = (u) => (u.startsWith("http") ? u : `https://www.beac.int${u}`);
const clefDe = (url) => storageKey(`beac/${decodeURIComponent(String(url).split("/").pop() ?? "")}`);

const lot = await lotDuJournal(sb);
const places = await placesInscrites(sb, lot);
const deja = new Set((await tout(sb, "auction_results", "source_url")).map((x) => x.source_url));
const manquants = lot
  .filter((o) => o.genre === "resultats" && !deja.has(absolue(o.url)))
  .sort((a, b) => String(a.seance ?? "").localeCompare(String(b.seance ?? "")));

dire(`${manquants.length} communique(s) de resultats jamais deposes\n`);

const pct = (a, b) => (a != null && b != null && Number(b) > 0 ? (100 * Number(a)) / Number(b) : undefined);
const mds = (v) => (v == null ? "—" : (Number(v) / 1e9).toFixed(2));

const retenus = [];
const refuses = [];
let secondes = 0;
for (const o of manquants.slice(0, max)) {
  const chemin = places.get(o.url);
  if (!chemin || !fs.existsSync(`${BIBLIO}/${chemin}`)) {
    refuses.push({ o, pourquoi: "pas de copie" });
    continue;
  }
  let lu;
  try {
    lu = await readAuctionResult(fs.readFileSync(`${BIBLIO}/${chemin}`).toString("base64"));
  } catch (e) {
    refuses.push({ o, pourquoi: `lecture ratée : ${String(e.message).slice(0, 70)}` });
    continue;
  }
  secondes += lu.seconds ?? 0;
  const p = lu.proposal;
  /* L identite de la seance : le titre la porte deja, la piece la confirme. */
  const pays = p.country ?? o.pays ?? undefined;
  const seance = p.sessionOn ?? o.seance ?? undefined;
  const instrument = p.instrument ?? o.instrument ?? undefined;
  /**
   * L ANNONCE N EST PAS TOUJOURS IMPRIMEE, et elle se deduit alors du
   * soumissionne et du taux de couverture. La deduction se verifie seule :
   * rien n oblige ce quotient a tomber sur un multiple rond du milliard.
   */
  const deduit = p.coverage != null && p.bid != null && Number(p.coverage) > 0 ? (100 * p.bid) / Number(p.coverage) : undefined;
  const rond = deduit != null && deduit >= 1e9 && Math.abs(deduit - Math.round(deduit / 1e9) * 1e9) < 0.005 * deduit;
  const annonce = p.announced ?? (rond ? Math.round(deduit / 1e9) * 1e9 : undefined);
  const calcule = pct(p.bid, annonce);
  const couvTombe = p.coverage == null || calcule == null || Math.abs(calcule - Number(p.coverage)) < 1;
  const echelle = [p.announced, p.bid, p.served].some((v) => v != null) ? [p.announced, p.bid, p.served].filter((v) => v != null).every((v) => Number(v) >= 1e9) : true;

  const pourquoi = !pays || !seance || !instrument ? "identité incomplète" : !echelle ? "montant hors d'échelle" : !couvTombe ? "le taux de couverture ne tombe pas" : undefined;
  if (pourquoi) {
    refuses.push({ o, pourquoi, p });
    dire(`   ${String(seance ?? "?").padEnd(11)} ${String(pays ?? "?").padEnd(12)} REFUSE : ${pourquoi}`);
    continue;
  }
  retenus.push({ o, p, pays, seance, instrument, annonce, deduitA: p.announced == null && annonce != null, remarques: lu.remarks ?? [], modele: lu.model });
  dire(
    `   ${String(seance).padEnd(11)} ${String(pays).padEnd(12)} ${instrument} ${String(p.tenor ?? o.tenor ?? "—").padEnd(12)} ` +
      `${String(p.codeEmission ?? "—").padEnd(16)} annonce ${mds(annonce).padStart(7)}${p.announced == null ? "*" : " "} soumis ${mds(p.bid).padStart(7)} servi ${mds(p.served).padStart(7)} ` +
      `taux ${String(p.rateAvg ?? p.priceAvg ?? "—").padStart(7)}`,
  );
}

dire(`\n=== ${retenus.length} retenue(s) · ${refuses.length} refusee(s) · ${secondes.toFixed(0)}s de lecture ===`);
const parPourquoi = new Map();
for (const r of refuses) parPourquoi.set(r.pourquoi, (parPourquoi.get(r.pourquoi) ?? 0) + 1);
for (const [k, v] of [...parPourquoi].sort((a, b) => b[1] - a[1])) dire(`   ${String(v).padStart(3)}  ${k}`);
dire(`   (* montant annoncé déduit du soumissionné et du taux de couverture)`);

if (!ecrire) {
  dire(`\nEssai a blanc. Relancer avec --ecrire.`);
  process.exit(0);
}
const maintenant = new Date().toISOString();

/**
 * UNE LIGNE DEJA ECRITE NE SE REECRIT PAS, ET CE GARDE A COUTE CHER.
 *
 * Le 16 octobre 2026 ce script a « depose » quarante seances dont
 * trente-neuf existaient deja : les pieces jamais citees n etaient pas des
 * seances absentes mais les SECONDES PIECES de seances connues, le plus
 * souvent une traduction. L upsert sur la clef (pays, seance, code) les a
 * donc ecrasees. `confirmed_by` n etant pas dans la charge, dix-neuf
 * signatures sont restees en place pendant que les chiffres changeaient
 * dessous, et deux taux signes ont bel et bien bouge.
 *
 * UNE SECONDE PIECE EST UN TEMOIN, PAS UNE CORRECTION. Elle ne vaut pas
 * plus que la premiere du seul fait d avoir ete lue plus tard. On insere
 * donc ce qui manque, on COMPARE ce qui existe, et c est une personne qui
 * tranche un desaccord.
 */
const dejaEcrites = new Map();
for (const r of await tout(sb, "auction_results", "country, session_on, code_emission, rate_avg, price_avg, confirmed_by")) {
  dejaEcrites.set(`${r.country}|${r.session_on}|${r.code_emission}`, r);
}

const temoins = [];
const nombre = (v) => (v == null ? null : Number(v));
let n = 0;
for (const x of retenus) {
  const { p } = x;

  const clef = `${x.pays}|${x.seance}|${p.codeEmission ?? null}`;
  const ancienne = dejaEcrites.get(clef);
  if (ancienne) {
    const dTaux = nombre(ancienne.rate_avg) !== nombre(p.rateAvg);
    const dPrix = nombre(ancienne.price_avg) !== nombre(p.priceAvg);
    temoins.push({ x, ancienne, dTaux, dPrix });
    dire(
      `   TEMOIN  ${x.seance} ${String(x.pays).padEnd(12)} ${p.codeEmission ?? "—"} ` +
        (dTaux || dPrix
          ? `DESACCORD taux ${ancienne.rate_avg ?? "—"} vs ${p.rateAvg ?? "—"}, prix ${ancienne.price_avg ?? "—"} vs ${p.priceAvg ?? "—"}` +
            (ancienne.confirmed_by ? ` · LIGNE SIGNEE par ${ancienne.confirmed_by}` : "")
          : "d accord avec la ligne en place"),
    );
    continue;
  }

  const { error } = await sb.from("auction_results").insert(
    {
      code_emission: p.codeEmission ?? null,
      country: x.pays,
      instrument: x.instrument,
      tenor: p.tenor ?? x.o.tenor ?? "—",
      session_on: x.seance,
      abondement: p.abondement ?? false,
      announced: x.annonce ?? null,
      bid: p.bid ?? null,
      served: p.served ?? null,
      network_size: p.networkSize ?? null,
      bidders: p.bidders ?? null,
      rate_min: p.rateMin ?? null,
      rate_max: p.rateMax ?? null,
      rate_limit: p.rateLimit ?? null,
      rate_avg: p.rateAvg ?? null,
      price_min: p.priceMin ?? null,
      price_max: p.priceMax ?? null,
      price_limit: p.priceLimit ?? null,
      price_avg: p.priceAvg ?? null,
      price_avg_fcfa: p.priceAvgFcfa ?? null,
      yield_avg: p.yieldAvg ?? null,
      yield_limit: p.yieldLimit ?? null,
      coupon_rate: p.couponRate ?? null,
      maturity_on: p.maturityOn ?? null,
      coverage: p.coverage ?? null,
      source_url: absolue(x.o.url),
      source_title: x.o.titre,
      file_key: clefDe(x.o.url),
      read_at: maintenant,
      read_model: x.modele ?? null,
      ...(x.deduitA
        ? { correction: `Montant annoncé déduit du montant soumissionné et du taux de couverture imprimés, la pièce ne l'imprimant pas (${mds(p.bid)} Mds / ${p.coverage} % = ${mds(x.annonce)} Mds).` }
        : {}),
      updated_at: maintenant,
    },
  );
  if (error) dire(`   ERREUR ${x.seance} : ${error.message}`);
  else n++;
}

const desaccords = temoins.filter((t) => t.dTaux || t.dPrix);
const signes = desaccords.filter((t) => t.ancienne.confirmed_by);
dire(`\n=== ${n} seance(s) deposee(s) · ${temoins.length} seconde(s) piece(s) ===`);
dire(`    ${temoins.length - desaccords.length} confirment la ligne en place`);
dire(`    ${desaccords.length} en desaccord, dont ${signes.length} sur une ligne signee`);
if (desaccords.length) dire(`    Aucune n a ete ecrite : un desaccord se tranche au desk, pas par l ordre de lecture.`);
