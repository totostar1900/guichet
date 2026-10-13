/**
 * RELIRE LE CLASSEUR PRODUIT, FEUILLE PAR FEUILLE.
 *
 * Georges a trouvé quatre incohérences en OUVRANT le fichier, là où mes
 * chiffres ne montraient rien. Un aperçu des totaux ne vérifie pas un
 * classeur : il faut le produire et le relire comme son destinataire.
 *
 *   npx tsx --conditions=react-server scripts/classeur-relu.mjs [du] [au]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const ExcelJS = (await import("exceljs")).default;
const { construireRapport } = await import("../src/lib/market/rapport-fournisseur.ts");
const { classeurFournisseur } = await import("../src/lib/market/rapport-classeur.ts");
const { repo } = await import("../src/lib/data/index.ts");

const dire = (s) => fs.writeSync(1, `${s}\n`);

const bulletins = await repo().listBulletins(3000);
const dates = bulletins.map((b) => b.sessionDate).sort();
const du = process.argv[2] ?? dates[0];
const au = process.argv[3] ?? dates[dates.length - 1];

const octets = await classeurFournisseur(construireRapport(bulletins, du, au));
const chemin = `C:/dev/guichet/.tmp-qualite-donnees-boc-${du}-${au}.xlsx`;
fs.writeFileSync(chemin, octets);
dire(`${chemin}  ·  ${Math.round(octets.length / 1024)} Ko\n`);

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(chemin);

for (const f of wb.worksheets) {
  const rangees = f.rowCount;
  dire(`=== ${f.name}  (${rangees} rangées) ===`);
  dire(`   titre      ${f.getCell(1, 1).value ?? ""}`);
  dire(`   sous-titre ${String(f.getCell(2, 1).value ?? "").slice(0, 200)}`);
  const entetes = [];
  for (let c = 1; c <= 12; c++) {
    const v = f.getCell(4, c).value;
    if (v) entetes.push(String(v));
  }
  if (entetes.length) dire(`   colonnes   ${entetes.join(" | ")}`);
  /* Deux rangées suffisent à voir si une colonne ment : c'est ce qui
     manquait quand j'ai validé ce fichier sur ses totaux. */
  for (const r of [5, 6]) {
    const cells = [];
    for (let c = 1; c <= entetes.length; c++) {
      const v = f.getCell(r, c).value;
      cells.push(v == null ? "" : String(v).slice(0, 110));
    }
    if (cells.some(Boolean)) dire(`   r${r}         ${cells.join("  ·  ")}`);
  }
  dire("");
}

/* LES DEUX LIGNES DE TOTAL DE LA SYNTHÈSE, qui sont le contrôle demandé. */
const syn = wb.getWorksheet("2. Synthèse");
if (syn) {
  dire("=== les totaux de la feuille 2 ===");
  for (let r = 1; r <= syn.rowCount; r++) {
    if (String(syn.getCell(r, 1).value ?? "") === "Total") {
      dire(`   rangée ${r} : remarques ${syn.getCell(r, 3).value ?? ""} ${syn.getCell(r, 4).value ?? ""} · séances ${syn.getCell(r, 5).value ?? ""}`);
    }
  }
}
