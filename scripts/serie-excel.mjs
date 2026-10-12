/** Le numéro de série Excel, converti, et confronté à la ligne imprimée. */
const jour = (n) => new Date(Date.UTC(1899, 11, 30) + n * 86400000).toISOString().slice(0, 10);

const cas = [
  { serie: 46120, vl1: 14434.0, vl2: 14454.0, date2: "2026-04-15", pct: 0.14 },
  { serie: 46185, vl1: 14603.0, vl2: 14624.0, date2: "2026-06-17", pct: 0.14 },
];

// Deux ancres connues, pour que la conversion ne repose pas sur ma mémoire.
console.log("ancres :", 45292, "=", jour(45292), "(attendu 2024-01-01) ·", 1, "=", jour(1), "(attendu 1900-01-01)");
console.log();

for (const c of cas) {
  const d1 = jour(c.serie);
  const ecart = (Date.parse(c.date2) - Date.parse(d1)) / 86400000;
  const variation = ((c.vl2 - c.vl1) / c.vl1) * 100;
  console.log(`${c.serie} → ${d1}`);
  console.log(`   VL ${c.vl1} le ${d1}  →  ${c.vl2} le ${c.date2}   (${ecart} jours)`);
  console.log(`   variation calculée ${variation.toFixed(4)} %   imprimée ${c.pct} %   ${Math.abs(variation - c.pct) < 0.005 ? "ACCORD" : "DÉSACCORD"}`);
  console.log();
}
