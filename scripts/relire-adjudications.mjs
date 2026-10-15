/**
 * RELIRE LES COMMUNIQUES DE GUINEE EQUATORIALE.
 *
 * Les dix-sept seances guinéennes d `auction_results` sont fausses de deux
 * façons a la fois : mille fois trop petites, parce que le point y est un
 * separateur de milliers et qu il a ete pris pour une decimale ; et mal
 * attribuees, parce que le taux de couverture imprime ne concorde avec aucun
 * de nos montants sur dix lignes sur dix-huit, la ou il concorde sur 214 des
 * 237 lignes des autres pays.
 *
 * UN FACTEUR UNIFORME NE REPARE PAS CELA : il rendrait de faux chiffres plus
 * gros. Les pieces sont des scans, il n y a pas de texte a reprendre : on
 * relit, avec la convention de separateurs ecrite dans l instruction.
 *
 * ET ON NE REMPLACE QUE CE QUI SE VERIFIE. Une relecture dont le taux de
 * couverture ne tombe pas est refusee : c est le seul controle que la piece
 * nous offre d elle-meme.
 *
 *   npx tsx --conditions=react-server scripts/relire-guinee.mjs [--ecrire]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { tout } = await import("./_journal.mjs");
const { readAuctionResult } = await import("../src/lib/market/auction-extract.ts");
const { storageKey } = await import("../src/lib/intake/cle.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const BIBLIO = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet";
const ecrire = process.argv.includes("--ecrire");
/* Sans argument : les pieces guineennes. Avec : les codes nommes. */
const cibles = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const index = new Map((await tout(sb, "library_items", "file_key, library_path")).map((x) => [x.file_key, x.library_path]));
const nos = (await tout(sb, "auction_results", "id, code_emission, country, instrument, tenor, session_on, announced, bid, served, rate_avg, rate_limit, coverage, file_key, source_title, source_url"))
  .filter((n) => (cibles.length ? cibles.includes(n.code_emission) : n.country === "Guinée éq."))
  .sort((a, b) => String(a.session_on).localeCompare(String(b.session_on)));

dire(`${nos.length} seance(s) guinéennes a relire\n`);

const pct = (a, b) => (a != null && b != null && Number(b) > 0 ? (100 * Number(a)) / Number(b) : undefined);
const mds = (v) => (v == null ? "—" : `${(Number(v) / 1e9).toFixed(3)}`);

let secondes = 0;
const verdicts = [];
for (const n of nos) {
  const chemin = index.get(storageKey(n.file_key ?? ""));
  if (!chemin || !fs.existsSync(`${BIBLIO}/${chemin}`)) {
    verdicts.push({ n, etat: "sans piece" });
    dire(`   ${String(n.session_on).slice(0, 10)} ${n.code_emission}  SANS PIECE`);
    continue;
  }
  let lu;
  try {
    lu = await readAuctionResult(fs.readFileSync(`${BIBLIO}/${chemin}`).toString("base64"), n.country === "Guinée éq." ? "Pièce de la Guinée Équatoriale : le point y sépare les milliers." : undefined);
  } catch (e) {
    verdicts.push({ n, etat: "lecture ratée", pourquoi: String(e.message).slice(0, 400) });
    dire(`   ${String(n.session_on).slice(0, 10)} ${n.code_emission}  RATEE : ${String(e.message).slice(0, 400)}`);
    continue;
  }
  secondes += lu.seconds ?? 0;
  /* `proposal` sort deja en francs : `toFrancs` est applique dans le lecteur. */
  const p = lu.proposal;
  const annonce = p.announced;
  const soumis = p.bid;
  const servi = p.served;
  const couv = p.coverage ?? n.coverage;
  /**
   * LE COMMUNIQUE GUINEEN N IMPRIME PAS LE MONTANT ANNONCE.
   *
   * Il imprime le soumissionne, le servi et le taux de couverture. Le
   * troisieme se deduit donc des deux autres, et CETTE DEDUCTION SE VERIFIE
   * SEULE : rien n oblige un quotient de deux nombres lus separement a tomber
   * sur un multiple rond du milliard. Il y tombe dix-huit fois sur dix-huit,
   * sur 10, 15, 17 ou 20 milliards. Un Tresor annonce des montants ronds ;
   * deux lectures fausses ne produiraient pas cela.
   */
  const deduit = couv != null && soumis != null && Number(couv) > 0 ? (100 * soumis) / Number(couv) : undefined;
  const rond = deduit != null && Math.abs(deduit - Math.round(deduit / 1e9) * 1e9) < 0.005 * deduit && deduit >= 1e9;
  const annonceRetenu = annonce ?? (rond ? Math.round(deduit / 1e9) * 1e9 : undefined);
  /* ET L ECHELLE DOIT ETRE CELLE DE LA ZONE : un Tresor ne sert pas dix millions. */
  const echelle = servi != null && servi >= 1e9;
  const etat = !echelle ? "montant hors d echelle" : annonceRetenu == null ? "annonce ni imprimee ni deductible" : "verifiee";
  verdicts.push({ n, lu: { annonce: annonceRetenu, soumis, servi, couv, taux: p.rateAvg, deduit: annonce == null, remarques: lu.remarks ?? [] }, etat, deduit });
  dire(
    `   ${String(n.session_on).slice(0, 10)} ${String(n.code_emission).padEnd(14)} ` +
      `avant ${mds(n.announced).padStart(8)}/${mds(n.bid).padStart(8)}/${mds(n.served).padStart(8)}  ` +
      `apres ${mds(annonceRetenu).padStart(8)}${annonce == null ? "*" : " "}/${mds(soumis).padStart(8)}/${mds(servi).padStart(8)}  ` +
      `couv ${String(couv ?? "—").padStart(8)}  deduit ${deduit == null ? "—" : mds(deduit)}  ${etat === "verifiee" ? "OK" : "<<< " + etat}`,
  );
}

const bons = verdicts.filter((x) => x.etat === "verifiee");
dire(`\n=== ${bons.length} verifiee(s) sur ${verdicts.length} · ${(secondes).toFixed(0)}s de lecture ===`);
for (const x of verdicts.filter((y) => y.etat !== "verifiee")) dire(`   ${String(x.n.session_on).slice(0, 10)} ${x.n.code_emission} : ${x.etat}${x.pourquoi ? ` (${x.pourquoi})` : ""}`);
const remarques = bons.flatMap((x) => (x.lu.remarques ?? []).map((r) => `${String(x.n.session_on).slice(0, 10)} : ${r}`));
if (remarques.length) {
  dire(`\n=== CE QUE LE LECTEUR SIGNALE ===`);
  for (const r of remarques.slice(0, 20)) dire(`   ${r}`);
}

if (!ecrire) {
  dire(`\nEssai a blanc. Relancer avec --ecrire : seules les ${bons.length} verifiee(s) seraient remplacees.`);
  process.exit(0);
}
let n = 0;
for (const x of bons) {
  /**
   * LA RELECTURE N EST PAS UNE CORRECTION, LA DEDUCTION EN EST UNE.
   *
   * Remettre 28 milliards la ou nous avions 28 millions ne corrige pas la
   * piece : c est la piece qui le dit, et nous l avions mal lue. En revanche
   * le montant annonce n est imprime nulle part : il est deduit, et une
   * deduction se declare. `corrected_by` reste vide : un script ne signe pas
   * a la place de quelqu un.
   */
  const correction = x.lu.deduit
    ? `Montant annoncé déduit du montant soumissionné et du taux de couverture imprimés, la pièce ne l'imprimant pas (${mds(x.lu.soumis)} Mds / ${x.lu.couv} % = ${mds(x.lu.annonce)} Mds). Relecture du 15 octobre 2026 : les montants guinéens suivent la convention espagnole, le point y sépare les milliers.`
    : null;
  const { error } = await sb
    .from("auction_results")
    .update({
      announced: x.lu.annonce ?? null,
      bid: x.lu.soumis ?? null,
      served: x.lu.servi ?? null,
      coverage: x.lu.couv ?? null,
      read_at: new Date().toISOString(),
      ...(correction ? { correction } : {}),
    })
    .eq("id", x.n.id);
  if (error) dire(`   ERREUR ${x.n.code_emission} : ${error.message}`);
  else n++;
}
dire(`\n=== ${n} ligne(s) remplacee(s) ===`);
dire(`   « corrected_by » reste vide : la deduction du montant annonce attend une signature au desk.`);
