/**
 * LES COMMUNIQUES D ADJUDICATION PORTENT-ILS UNE COUCHE DE TEXTE ?
 *
 * L extracteur les traite tous comme des scans : « rien n y est
 * selectionnable ». Si c etait vrai de 2019 et faux de 2024, le libelle de
 * la colonne du prix moyen serait lisible par machine sur les pieces
 * recentes, et le discriminant du prix sale gabonais se trouverait sans
 * oeil humain.
 *
 * Le script ouvre les pieces gabonaises et compte les caracteres que pdfjs
 * en tire. Un scan en rend zero ou presque.
 *
 *   npx tsx --conditions=react-server scripts/communiques-ont-ils-du-texte.mjs
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

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

async function texteDe(bytes) {
  const doc = await pdfjs.getDocument({ data: bytes, useSystemFonts: true, isEvalSupported: false }).promise;
  let out = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const c = await page.getTextContent();
    out += c.items.map((i) => i.str).join(" ") + "\n";
  }
  await doc.destroy();
  return out;
}

const toutes = await repo().listAuctionResults({ limit: 2000 });
const gabon = toutes
  .filter((r) => r.instrument === "OTA" && r.country === "Gabon")
  .sort((a, b) => b.sessionOn.localeCompare(a.sessionOn));

dire(`${gabon.length} obligations gabonaises · ${gabon.filter((r) => r.fileKey).length} avec une piece rangee\n`);

const vus = new Set();
for (const r of gabon) {
  if (!r.fileKey || vus.has(r.fileKey)) continue;
  vus.add(r.fileKey);
  let n = null;
  let extrait = "";
  try {
    const bytes = await readSource(r.fileKey);
    const t = await texteDe(bytes);
    n = t.replace(/\s+/g, "").length;
    extrait = t.replace(/\s+/g, " ").slice(0, 150);
  } catch (e) {
    extrait = `ILLISIBLE : ${String(e.message).slice(0, 70)}`;
  }
  dire(`   ${r.sessionOn}  ${String(n ?? "—").padStart(6)} car.  ${extrait}`);
}
dire(`\n   ${vus.size} piece(s) distincte(s). Zero caractere = scan, et seul un oeil peut lire le libelle.`);
