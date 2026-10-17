/**
 * LE LIBELLE DE LA COLONNE DU PRIX MOYEN, LA OU IL EST LISIBLE.
 *
 * Trente-quatre communiques gabonais sur trente-neuf sont des scans muets.
 * Cinq portent une couche d OCR, et deux de ces cinq sont justement des
 * seances indecises : le 23 mars 2022 et le 17 novembre 2021.
 *
 * Si ces deux-la disent « prix moyen pondere » tout court, le libelle ne
 * discrimine pas et il faut chercher ailleurs. Si l une des cinq porte une
 * mention de coupon couru, de date de jouissance ou de prix de reglement,
 * on tient un signe, et on saura quoi demander a l oeil sur les autres.
 *
 *   npx tsx --conditions=react-server scripts/libelle-du-prix-moyen.mjs
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
  .filter((r) => r.instrument === "OTA" && r.country === "Gabon" && r.fileKey)
  .sort((a, b) => b.sessionOn.localeCompare(a.sessionOn));

const vus = new Set();
for (const r of gabon) {
  if (vus.has(r.fileKey)) continue;
  vus.add(r.fileKey);
  let t;
  try {
    t = await texteDe(await readSource(r.fileKey));
  } catch {
    continue;
  }
  if (t.replace(/\s+/g, "").length < 200) continue;

  dire(`\n${"=".repeat(78)}`);
  dire(`${r.sessionOn} · ${r.codeEmission} · ${r.tenor} · coupon ${r.couponRate} %`);
  dire(`moyen ${r.priceAvg} · limite ${r.priceLimit} · max ${r.priceMax} · min ${r.priceMin}`);
  dire(`${"=".repeat(78)}`);
  dire(t.replace(/[ \t]+/g, " ").trim());
}
