/**
 * LE BULLETIN TRIMESTRIEL CONTRE NOS COMMUNIQUES.
 *
 * Les deux sources decrivent les memes seances : la BEAC par son tableau des
 * emissions, nous par les communiques de resultats que nous avons lus.
 *
 * CE SCRIPT N ECRIT RIEN. Un accord ne prouve pas grand chose ; un desaccord
 * designe une seance a verifier, et c est tout ce qu on lui demande. Le
 * lecteur des tableaux d emissions ne retient qu un quart des colonnes (voir
 * `bulletin-trimestriel.ts`), ce qui suffit a un controle mais pas a une
 * source : on ne depose aucun de ces chiffres.
 *
 *   npx tsx --conditions=react-server scripts/rapprocher-emissions-beac.mjs
 */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { lotDuJournal, placesInscrites, tout } = await import("./_journal.mjs");
const { emissionsDuPdf, numeroDuBulletin } = await import("../src/lib/market/bulletin-trimestriel.ts");
const { actuarialFromDiscount, tenorDays } = await import("../src/lib/market/yield.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const BIBLIO = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet";

const lot = await lotDuJournal(sb);
const places = await placesInscrites(sb, lot);
const bulletins = lot.filter((o) => o.genre === "bulletin").sort((a, b) => (numeroDuBulletin(a.titre ?? "") ?? 0) - (numeroDuBulletin(b.titre ?? "") ?? 0));
const leurs = [];
for (const b of bulletins) {
  const rel = places.get(b.url);
  if (!rel) continue;
  const r = await emissionsDuPdf(new Uint8Array(fs.readFileSync(`${BIBLIO}/${rel}`)), b.titre ?? "");
  for (const e of r.emissions) leurs.push({ ...e, numero: r.numero });
}
const nos = await tout(sb, "auction_results", "code_emission, country, instrument, tenor, session_on, announced, served, rate_avg, coverage, source_title");
dire(`${leurs.length} adjudication(s) retenues dans les bulletins · ${nos.length} communique(s) chez nous\n`);

/**
 * UNE UNITE SE MESURE SUR UN ORDRE DE GRANDEUR, PAS SUR UNE LIGNE.
 *
 * Un montant servi se compte en milliards dans cette zone. Si les lignes d un
 * pays se tiennent toutes mille fois sous celles des autres, ce n est pas une
 * petite adjudication, c est une unite.
 */
dire(`=== L ORDRE DE GRANDEUR DU MONTANT SERVI, PAR PAYS ===`);
const parPays = new Map();
for (const n of nos) {
  if (n.served == null || Number(n.served) <= 0) continue;
  const o = Math.floor(Math.log10(Number(n.served)));
  if (!parPays.has(n.country)) parPays.set(n.country, new Map());
  parPays.get(n.country).set(o, (parPays.get(n.country).get(o) ?? 0) + 1);
}
for (const [p, m] of [...parPays].sort()) {
  const ordres = [...m].sort((a, b) => a[0] - b[0]);
  const median = ordres.reduce((s, [o, n]) => s + o * n, 0) / ordres.reduce((s, [, n]) => s + n, 0);
  dire(`   ${String(p).padEnd(12)} ${ordres.map(([o, n]) => `10^${o}:${n}`).join("  ").padEnd(42)} moyenne 10^${median.toFixed(1)}`);
}

const nu = (s) => String(s ?? "").replace(/\/.*$/, "").replace(/\s/g, "").toUpperCase();
/**
 * UN CODE NE SUFFIT PAS A APPARIER : il est REABONDE.
 *
 * « GA2J00000150 » reparait le 20 janvier et le 3 fevrier 2021 : apparier
 * sur le code seul comparait nos deux seances a la meme ligne du bulletin et
 * fabriquait des desaccords qui n en sont pas. La clef est le code ET LA
 * DATE, comme en base depuis la migration 0108.
 */
const parCode = new Map();
for (const n of nos) if (n.code_emission) parCode.set(nu(n.code_emission), [...(parCode.get(nu(n.code_emission)) ?? []), n]);
const parDate = new Map();
for (const n of nos) {
  if (!n.session_on || !n.country) continue;
  const c = `${n.country}|${String(n.session_on).slice(0, 10)}`;
  parDate.set(c, [...(parDate.get(c) ?? []), n]);
}

let apparies = 0;
let convertis = 0;
let absents = 0;
const desaccords = [];
for (const e of leurs) {
  const d = e.adjugeLe ?? e.emisLe ?? e.regleLe;
  /**
   * LE CODE PUIS LA DATE LA PLUS PROCHE, A UNE SEMAINE PRES.
   *
   * Le bulletin ne donne pas toujours la date d adjudication : il donne
   * parfois celle du reglement, deux jours plus tard. Exiger l egalite
   * perdait soixante appariements ; ne pas la demander du tout comparait nos
   * deux seances d un meme code reabonde a la meme colonne, et fabriquait
   * des desaccords qui n en etaient pas.
   */
  const jours = (a, b) => Math.abs(Date.parse(a) - Date.parse(b)) / 86400000;
  const siennes = e.isin ? (parCode.get(nu(e.isin)) ?? []) : [];
  const n =
    (d ? siennes.filter((x) => jours(x.session_on, d) <= 7).sort((x, y) => jours(x.session_on, d) - jours(y.session_on, d))[0] : siennes[0]) ??
    (parDate.get(`${e.pays}|${d}`) ?? []).find((x) => !e.isin || nu(x.code_emission) === nu(e.isin));
  if (!n) {
    absents++;
    continue;
  }
  apparies++;
  /**
   * LE BULLETIN A CHANGE DE CONVENTION EN MARS 2021.
   *
   * Un BTA est precompte : le taux imprime sur le communique est un taux
   * d ESCOMPTE, et le rendement actuariel vaut autre chose. Jusqu en fevrier
   * 2021 le bulletin publiait l escompte, comme le communique ; depuis mars
   * 2021 il publie le rendement. Mesure sur les treize seances ou les deux
   * mesures different d assez pour trancher : aucune exception.
   *
   * Comparer sans le savoir inventait huit desaccords, dont les deux
   * guineennes de 2022 qui tombent au centieme pres une fois converties. Ce
   * n est donc pas un desaccord, c est deux facons de dire le meme prix, et
   * on dit laquelle.
   */
  if (n.rate_avg != null && e.taux != null) {
    const brut = Math.abs(Number(n.rate_avg) - e.taux);
    /**
     * ET ON CONVERTIT A LA FACON DE LA BEAC, PAS A LA NOTRE.
     *
     * `yield.ts` compte l escompte en exact/360 et capitalise en exact/365,
     * ce qui est plus rigoureux et donne 7,120 % la ou le bulletin imprime
     * 7,02 %. La BEAC, elle, applique l identite simple escompte / (1 -
     * escompte x duree), la duree en annees valant les semaines sur
     * cinquante-deux. Verifie au centieme pres sur huit seances.
     *
     * Ici on cherche a savoir si nous avons LU LE MEME NOMBRE, pas si nous
     * sommes d accord sur la mathematique financiere : c est donc la
     * convention de la source qui sert, et l ecart entre les deux
     * conventions est une question a part.
     */
    const jours = tenorDays(n.tenor ?? e.tenor ?? undefined);
    const t = jours == null ? undefined : jours / 364;
    const d = Number(n.rate_avg) / 100;
    const converti = t == null ? undefined : (100 * d) / (1 - d * t);
    const ecartConverti = converti == null ? undefined : Math.abs(converti - e.taux);
    if (brut > 0.02 && (ecartConverti == null || ecartConverti > 0.02)) {
      desaccords.push({ e, quoi: `taux ${e.taux} % au bulletin contre ${n.rate_avg} % chez nous (rendement converti ${converti == null ? "—" : converti.toFixed(3)} %)` });
    } else if (brut > 0.02) {
      convertis++;
    }
  }
  if (n.served != null && e.leve != null && Math.abs(Number(n.served) - e.leve) > 1e6) {
    const facteur = e.leve / Number(n.served);
    desaccords.push({ e, quoi: `levé ${(e.leve / 1e9).toFixed(2)} Mds au bulletin contre ${(Number(n.served) / 1e9).toFixed(3)} Mds chez nous${facteur > 900 && facteur < 1100 ? " (facteur mille)" : ""}` });
  }
}
dire(`\n=== ${apparies} seance(s) appariee(s) · ${absents} que nous n avons pas ===`);
dire(`=== ${desaccords.length} DESACCORD(S) ===`);
for (const d of desaccords) dire(`   ${String(d.e.pays).padEnd(11)} ${d.e.adjugeLe ?? d.e.emisLe ?? d.e.regleLe} ${d.e.instrument} ${String(d.e.isin ?? "").padEnd(17)} ${d.quoi}`);

/**
 * ET CE QUE LES DEUX CONVENTIONS SE COUTENT, SUR TOUTE NOTRE TABLE.
 *
 * La question n est plus « avons-nous lu le meme nombre » mais « comptons-
 * nous les jours pareil ». La BEAC applique escompte / (1 - escompte x
 * duree) ; `yield.ts` compte l escompte en exact/360 et capitalise en
 * exact/365. Les deux se defendent, et l ecart se pose sur chaque point de
 * BTA de la courbe.
 */
dire(`\n=== L ECART ENTRE NOTRE CONVENTION ET CELLE DE LA BEAC ===`);
const ecarts = [];
for (const n of nos) {
  if (n.instrument !== "BTA" || n.rate_avg == null) continue;
  const jours = tenorDays(n.tenor ?? undefined);
  if (jours == null) continue;
  const notre = actuarialFromDiscount(Number(n.rate_avg), jours);
  const d = Number(n.rate_avg) / 100;
  const sienne = (100 * d) / (1 - d * (jours / 364));
  if (notre == null) continue;
  ecarts.push({ n, notre, sienne, ecart: notre - sienne });
}
if (ecarts.length) {
  const tri = [...ecarts].map((x) => x.ecart).sort((a, b) => a - b);
  dire(`   ${ecarts.length} BTA · écart médian ${tri[Math.floor(tri.length / 2)].toFixed(3)} point, de ${tri[0].toFixed(3)} à ${tri[tri.length - 1].toFixed(3)}`);
  const parDuree = new Map();
  for (const x of ecarts) parDuree.set(x.n.tenor, [...(parDuree.get(x.n.tenor) ?? []), x.ecart]);
  for (const [t, v] of [...parDuree].sort()) {
    const m = [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
    dire(`      ${String(t).padEnd(14)} ${String(v.length).padStart(3)} point(s) · médiane ${m.toFixed(3)} point`);
  }
}
