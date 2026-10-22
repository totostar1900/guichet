/** L UNITE DES MONTANTS CHEZ LE GABON, avant d en ecrire cinq de plus. */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const t = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => r.country === "Gabon" && r.announced);
t.sort((a, b) => a.sessionOn.localeCompare(b.sessionOn));
dire(`${t.length} seances gabonaises avec un montant annonce`);
for (const r of t.slice(0, 6)) dire(`   ${r.sessionOn} ${r.instrument} annonce ${r.announced} soumis ${r.bid} servi ${r.served}`);
dire("   ...");
for (const r of t.slice(-4)) dire(`   ${r.sessionOn} ${r.instrument} annonce ${r.announced} soumis ${r.bid} servi ${r.served}`);
const ordres = {};
for (const r of t) { const k = String(r.announced).length; ordres[k] = (ordres[k] ?? 0) + 1; }
dire(`\n   nombre de chiffres du montant annonce : ${Object.entries(ordres).sort().map(([k, v]) => `${k} chiffres ×${v}`).join(" · ")}`);
