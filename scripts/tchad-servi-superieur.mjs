/**
 * DEUX SEANCES OU LE SERVI DEPASSE LES SOUMISSIONS.
 *
 * C est impossible : un Tresor ne sert pas plus qu on ne lui a offert. Une
 * des deux valeurs est mal lue, ou les deux sont echangees.
 *
 * LE TAUX DE COUVERTURE EST LE TROISIEME TEMOIN, et il est gratuit : la
 * piece imprime le rapport ET ses deux termes. Chez la plupart des Tresors
 * il vaut soumissions sur annonce. Si, en echangeant les deux montants, le
 * rapport imprime tombe juste, l echange est demontre et non suppose.
 *
 * On teste les trois lectures possibles de chaque seance :
 *
 *   TELLE QUELLE          couverture = soumissions / annonce
 *   ECHANGEE              couverture = servi / annonce, les deux permutes
 *   SUR LE SERVI          le Tresor compte sa couverture sur le servi
 *
 *   npx tsx --conditions=react-server scripts/tchad-servi-superieur.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const fr = (v, n = 2) => (v == null ? "—" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n }));
const M = (v) => (v == null ? "—" : (Number(v) / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 2 }));

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

const toutes = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => !r.setAsideAt);
const impossibles = toutes.filter((r) => r.bid != null && r.served != null && Number(r.served) > Number(r.bid) + 1e6);

dire(`${toutes.length} seances · ${impossibles.length} ou le servi depasse les soumissions\n`);

for (const r of impossibles.sort((a, b) => a.sessionOn.localeCompare(b.sessionOn))) {
  dire(`${"=".repeat(78)}`);
  dire(`${r.sessionOn} · ${r.country} · ${r.instrument} ${r.tenor} · ${r.codeEmission ?? "—"}`);
  dire(`   annonce ${M(r.announced)} · soumissions ${M(r.bid)} · servi ${M(r.served)} (en millions) · couverture imprimee ${fr(r.coverage)} %`);
  dire(`   lu le ${r.readAt?.slice(0, 10) ?? "jamais"} par ${r.readModel ?? "—"}`);

  if (r.announced != null && Number(r.announced) > 0 && r.coverage != null) {
    const a = Number(r.announced);
    const lectures = [
      ["telle quelle, couverture = soumissions / annonce", (Number(r.bid) / a) * 100],
      ["ECHANGEE, couverture = servi / annonce", (Number(r.served) / a) * 100],
      ["telle quelle, couverture = servi / annonce", (Number(r.served) / a) * 100],
    ];
    dire(`   ce que donnerait chaque lecture :`);
    for (const [nom, v] of lectures) {
      const ecart = Math.abs(v - Number(r.coverage));
      dire(`      ${fr(v).padStart(8)} %   ecart ${fr(ecart).padStart(7)}   ${ecart < 0.5 ? "TOMBE JUSTE" : ""}   ${nom}`);
    }
  }

  dire(`   ${r.sourceUrl}`);
  if (!r.fileKey) {
    dire(`   pas de piece rangee\n`);
    continue;
  }
  try {
    const t = await texteDe(await readSource(r.fileKey));
    const n = t.replace(/\s+/g, "").length;
    if (n < 200) dire(`   scan muet (${n} caracteres) : seul un oeil peut lire les montants\n`);
    else dire(`   TEXTE LISIBLE :\n      ${t.replace(/[ \t]+/g, " ").replace(/\n/g, " ").trim().slice(0, 1300)}\n`);
  } catch (e) {
    dire(`   illisible : ${String(e.message).slice(0, 70)}\n`);
  }
}
