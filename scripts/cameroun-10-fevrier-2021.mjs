/**
 * LE CAMEROUN DU 10 FEVRIER 2021 : UN MOYEN SOUS SON PROPRE CARNET.
 *
 * C est la seule des cent quatre-vingt-treize seances portant le limite ET
 * le moyen dont l ordre des quatre cases ne tient pas. Elle imprime un taux
 * minimum propose de 2,20 et un taux moyen pondere de 2,16 : une moyenne
 * des taux SERVIS ne peut pas tomber sous le plus bas taux RECU, puisque le
 * servi est un sous-ensemble du recu.
 *
 * Quatre lectures possibles, et il faut les distinguer avant de toucher a
 * quoi que ce soit :
 *
 *   NOTRE LECTURE EST FAUSSE sur l un des deux nombres ;
 *   LE TRESOR S EST TROMPE, et il faut le noter sans y toucher ;
 *   LES DEUX NOMBRES NE PARLENT PAS DE LA MEME CHOSE, par exemple un
 *   minimum qui serait un plancher du Tresor et non une offre recue ;
 *   LA SEANCE PORTE PLUSIEURS LIGNES dont les cases se sont melangees.
 *
 * On regarde la piece, ses soeurs du meme jour, et ce que les voisines du
 * meme Tresor imprimaient a la meme epoque.
 *
 *   npx tsx --conditions=react-server scripts/cameroun-10-fevrier-2021.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const M = (v) => (v == null ? "—" : (Number(v) / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 0 }));

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
async function texteDe(bytes) {
  const doc = await pdfjs.getDocument({ data: bytes, useSystemFonts: true, isEvalSupported: false }).promise;
  let out = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    out += (await page.getTextContent()).items.map((i) => i.str).join(" ") + "\n";
  }
  await doc.destroy();
  return out;
}

const toutes = await repo().listAuctionResults({ limit: 2000 });
const r = toutes.find((x) => x.codeEmission === "CM1200000998" && x.sessionOn === "2021-02-10");
if (!r) {
  dire("seance introuvable");
  process.exit(1);
}

dire(`=== CE QUE NOUS AVONS LU ===`);
dire(`   ${r.sessionOn} · ${r.country} · ${r.instrument} ${r.tenor} · ${r.codeEmission}`);
dire(`   taux minimum ${r.rateMin} · limite ${r.rateLimit} · moyen ${r.rateAvg} · maximum ${r.rateMax}`);
dire(`   annonce ${M(r.announced)} M · soumis ${M(r.bid)} M · servi ${M(r.served)} M · couverture ${r.coverage ?? "—"} %`);
dire(`   soumissionnaires ${r.bidders ?? "—"} · relue par ${r.confirmedBy ?? "personne"}`);
dire(`   anomalies acquittees : ${JSON.stringify(r.anomaliesVues ?? [])}`);

dire(`\n=== LES AUTRES LIGNES DU MEME JOUR ===`);
for (const x of toutes.filter((x) => x.country === "Cameroun" && x.sessionOn === "2021-02-10")) {
  dire(`   ${x.instrument} ${String(x.tenor).padEnd(12)} ${String(x.codeEmission ?? "—").padEnd(14)} min ${x.rateMin ?? x.priceMin ?? "—"} · limite ${x.rateLimit ?? x.priceLimit ?? "—"} · moyen ${x.rateAvg ?? x.priceAvg ?? "—"} · max ${x.rateMax ?? x.priceMax ?? "—"}`);
}

dire(`\n=== LES VOISINES CAMEROUNAISES, A SIX MOIS ===`);
for (const x of toutes
  .filter((x) => x.country === "Cameroun" && x.instrument === "BTA" && x.sessionOn >= "2020-09-01" && x.sessionOn <= "2021-08-31")
  .sort((a, b) => a.sessionOn.localeCompare(b.sessionOn))) {
  const ordre = x.rateMin != null && x.rateAvg != null && Number(x.rateAvg) < Number(x.rateMin) ? "  <<< moyen sous le minimum" : "";
  dire(`   ${x.sessionOn} ${String(x.tenor).padEnd(12)} min ${String(x.rateMin ?? "—").padStart(5)} · limite ${String(x.rateLimit ?? "—").padStart(5)} · moyen ${String(x.rateAvg ?? "—").padStart(5)} · max ${String(x.rateMax ?? "—").padStart(5)}${ordre}`);
}

dire(`\n=== CE QUE LA PIECE IMPRIME ===`);
dire(`   ${r.sourceTitle}`);
dire(`   ${r.sourceUrl}`);
if (!r.fileKey) {
  dire(`   pas de piece rangee`);
  process.exit(0);
}
try {
  const t = await texteDe(await readSource(r.fileKey));
  const n = t.replace(/\s+/g, "").length;
  if (n < 200) dire(`\n   scan muet (${n} caracteres) : seul un oeil peut lire les quatre cases`);
  else dire(`\n   ${t.replace(/[ \t]+/g, " ").replace(/\n/g, " ").trim()}`);
} catch (e) {
  dire(`   illisible : ${String(e.message).slice(0, 80)}`);
}
