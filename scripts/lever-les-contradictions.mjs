/**
 * LEVER LES CONTRADICTIONS ENTRE UNE PIECE ET SA TRADUCTION.
 *
 * Sept seances sont decrites deux fois par la BEAC, en francais et en
 * espagnol ou en anglais, et nos deux lectures ne disent pas la meme chose.
 * Choisir au hasard effacerait la trouvaille ; on tranche par des preuves,
 * dans cet ordre :
 *
 *   1. LE DOCUMENT CONTRE LUI-MEME. Le taux de couverture imprime vaut le
 *      montant soumissionne sur le montant annonce. La lecture dont cette
 *      identite tombe est la bonne ; celle dont elle ne tombe pas a mis un
 *      chiffre dans la mauvaise case.
 *   2. LE BULLETIN TRIMESTRIEL, quand il porte la seance : c est une source
 *      exterieure aux deux pieces.
 *   3. A DEFAUT, ON NE TRANCHE PAS, et on le dit.
 *
 * Les deux pieces sont RELUES ici, et non reprises de la base : les lectures
 * d avant datent d avant la reparation du lecteur, et comparer deux lectures
 * faites par deux versions du meme lecteur ne prouverait rien.
 *
 *   npx tsx --conditions=react-server scripts/lever-les-contradictions.mjs [--ecrire]
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
const { emissionsDuPdf, numeroDuBulletin } = await import("../src/lib/market/bulletin-trimestriel.ts");
const { storageKey } = await import("../src/lib/intake/cle.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const BIBLIO = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet";
const ecrire = process.argv.includes("--ecrire");

const CHIFFRES = ["announced", "bid", "served", "network_size", "bidders", "rate_min", "rate_max", "rate_limit", "rate_avg", "price_min", "price_max", "price_limit", "price_avg", "coverage"];
const mds = (v) => (v == null ? "—" : (Number(v) / 1e9).toFixed(3));
const pct = (a, b) => (a != null && b != null && Number(b) > 0 ? (100 * Number(a)) / Number(b) : undefined);

const nos = await tout(sb, "auction_results", "*");
const groupes = new Map();
for (const n of nos) {
  if (!n.code_emission) continue;
  const c = `${n.country}|${String(n.session_on).slice(0, 10)}|${n.code_emission}`;
  groupes.set(c, [...(groupes.get(c) ?? []), n]);
}
const paires = [...groupes.entries()].filter(([, v]) => v.length > 1);
dire(`${paires.length} seance(s) decrites deux fois\n`);

/* LE TEMOIN EXTERIEUR : ce que le bulletin trimestriel dit de ces seances. */
const lot = await lotDuJournal(sb);
const places = await placesInscrites(sb, lot);
const bulletins = lot.filter((o) => o.genre === "bulletin").sort((a, b) => (numeroDuBulletin(a.titre ?? "") ?? 0) - (numeroDuBulletin(b.titre ?? "") ?? 0));
const duBulletin = new Map();
for (const b of bulletins) {
  const rel = places.get(b.url);
  if (!rel || !fs.existsSync(`${BIBLIO}/${rel}`)) continue;
  const r = await emissionsDuPdf(new Uint8Array(fs.readFileSync(`${BIBLIO}/${rel}`)), b.titre ?? "");
  for (const e of r.emissions) if (e.isin) duBulletin.set(String(e.isin).replace(/\/.*$/, "").toUpperCase(), { ...e, numero: r.numero });
}
dire(`   ${duBulletin.size} seance(s) du bulletin trimestriel disponibles comme temoin\n`);

const cheminDe = (n) => {
  const c = n.file_key ? places.get([...places.keys()].find((u) => storageKey(`beac/${decodeURIComponent(String(u).split("/").pop() ?? "")}`) === storageKey(n.file_key)) ?? "") : undefined;
  return c;
};
/* L index donne la place par clef de depot : plus direct que de remonter l url. */
const index = new Map((await tout(sb, "library_items", "file_key, library_path")).map((x) => [x.file_key, x.library_path]));

const verdicts = [];
for (const [clef, lignes] of paires) {
  dire(`\n=== ${clef}`);
  const lectures = [];
  for (const n of lignes) {
    const chemin = index.get(storageKey(n.file_key ?? ""));
    if (!chemin || !fs.existsSync(`${BIBLIO}/${chemin}`)) {
      dire(`   ${String(n.source_title ?? "").slice(0, 70)} : pas de copie`);
      continue;
    }
    let lu;
    try {
      lu = await readAuctionResult(fs.readFileSync(`${BIBLIO}/${chemin}`).toString("base64"));
    } catch (e) {
      dire(`   ${String(n.source_title ?? "").slice(0, 70)} : lecture ratée (${String(e.message).slice(0, 60)})`);
      continue;
    }
    const p = lu.proposal;
    const calcule = pct(p.bid, p.announced);
    const tombe = p.coverage == null || calcule == null ? undefined : Math.abs(calcule - Number(p.coverage)) < 1;
    lectures.push({ n, p, tombe, calcule, remarks: lu.remarks ?? [] });
    dire(
      `   ${(String(n.source_title ?? "").slice(0, 58)).padEnd(58)} annonce ${mds(p.announced).padStart(8)} soumis ${mds(p.bid).padStart(8)} servi ${mds(p.served).padStart(8)} ` +
        `taux ${String(p.rateAvg ?? p.priceAvg ?? "—").padStart(7)} couv ${String(p.coverage ?? "—").padStart(8)} ` +
        `${tombe === undefined ? "(pas de couverture)" : tombe ? "IDENTITÉ OK" : `identité fausse (${calcule?.toFixed(2)})`}`,
    );
  }
  const temoin = duBulletin.get(String(lignes[0].code_emission).replace(/\/.*$/, "").toUpperCase());
  if (temoin) dire(`   TÉMOIN bulletin n°${temoin.numero} : levé ${mds(temoin.leve)} Mds, taux ${temoin.taux} %, couverture ${temoin.couverture} %`);

  const bonnes = lectures.filter((l) => l.tombe === true);
  let gagnante;
  let pourquoi;
  if (bonnes.length === 1) {
    gagnante = bonnes[0];
    pourquoi = "son identité couverture = soumis / annoncé tombe, pas celle de l'autre";
  } else if (temoin && temoin.taux != null) {
    const proches = lectures.filter((l) => l.p.rateAvg != null && Math.abs(Number(l.p.rateAvg) - temoin.taux) < 0.02);
    if (proches.length === 1) {
      gagnante = proches[0];
      pourquoi = `le bulletin trimestriel n°${temoin.numero} donne ${temoin.taux} %`;
    }
  }
  if (!gagnante && lectures.length === 2) {
    /* DEUX LECTURES IDENTIQUES NE SE CONTREDISENT PLUS : le lecteur répare a
       peut-etre efface le desaccord d hier. */
    const [a, b] = lectures;
    const memes = CHIFFRES.every((k) => {
      const ka = k === "network_size" ? "networkSize" : k === "rate_avg" ? "rateAvg" : k;
      const va = a.p[ka] ?? a.p[k];
      const vb = b.p[ka] ?? b.p[k];
      return va == null || vb == null || Math.abs(Number(va) - Number(vb)) < 0.02;
    });
    if (memes) {
      /* LES CHIFFRES ETANT LES MEMES, LE CHOIX NE PORTE QUE SUR LA PIECE QU ON
         CITE. On garde la francaise : c est la langue du desk, et un lien
         qu on ne sait pas lire n est pas une source consultable. */
      const francaise = lectures.find((l) => /communiqu[ée]|r[ée]sultats d/i.test(String(l.n.source_title ?? "")));
      gagnante = francaise ?? (a.tombe === false && b.tombe === true ? b : a);
      pourquoi = "les deux relectures s'accordent désormais, le désaccord venait du lecteur et non des pièces ; la pièce française est citée";
    }
  }
  verdicts.push({ clef, lignes, lectures, temoin, gagnante, pourquoi });
  dire(gagnante ? `   >>> RETENUE : ${String(gagnante.n.source_title ?? "").slice(0, 60)}\n       parce que ${pourquoi}` : `   >>> NON TRANCHÉE`);
}

const tranchees = verdicts.filter((v) => v.gagnante);
dire(`\n=== ${tranchees.length} tranchée(s) sur ${verdicts.length} ===`);
for (const v of verdicts.filter((x) => !x.gagnante)) dire(`   NON TRANCHÉE ${v.clef}`);

if (!ecrire) {
  dire(`\nEssai a blanc. Relancer avec --ecrire.`);
  process.exit(0);
}
let maj = 0;
let sup = 0;
for (const v of tranchees) {
  const g = v.gagnante;
  const p = g.p;
  const { error } = await sb
    .from("auction_results")
    .update({
      announced: p.announced ?? null,
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
      coverage: p.coverage ?? null,
      correction: `Deux pièces décrivent cette séance et leurs lectures divergeaient. Retenue : « ${String(g.n.source_title ?? "").slice(0, 90)} », parce que ${v.pourquoi}.`,
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", g.n.id);
  if (error) {
    dire(`   ERREUR ${v.clef} : ${error.message}`);
    continue;
  }
  maj++;
  for (const l of v.lignes) {
    if (l.id === g.n.id) continue;
    const { error: e2 } = await sb.from("auction_results").delete().eq("id", l.id);
    if (!e2) sup++;
  }
}
dire(`\n=== ${maj} seance(s) tranchee(s), ${sup} ligne(s) en trop supprimee(s) ===`);
