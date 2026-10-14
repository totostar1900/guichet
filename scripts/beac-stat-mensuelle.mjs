/** La statistique mensuelle du MVT : porte-t-elle un encours ? */
import fs from "node:fs";
const { rangeesDuPdf } = await import("../src/lib/market/boc-geometrie.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const U = "https://www.beac.int/m-des-titres-publics/statistiques-mensuelles-marche-valeurs-tresor/";
const html = await fetch(U, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0)" } }).then((r) => r.text());
const liens = [...html.matchAll(/<a[^>]+href="([^"]+\.pdf)"[^>]*>([\s\S]{0,200}?)<\/a>/gi)]
  .map((m) => ({ url: m[1].startsWith("http") ? m[1] : `https://www.beac.int${m[1]}`, t: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() }));
const p = liens[0];
dire(`${p.t}\n${p.url}\n`);
const formes = p.url === encodeURI(p.url) ? [p.url] : [p.url, encodeURI(p.url)];
let buf = null;
for (const f of formes) { try { const r = await fetch(f, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0)" } }); if (r.ok) { buf = Buffer.from(await r.arrayBuffer()); break; } } catch { /* on reessaie */ } }
if (!buf) { dire("la piece ne repond pas"); process.exit(1); }
fs.mkdirSync("C:/dev/guichet/.sorties", { recursive: true });
fs.writeFileSync("C:/dev/guichet/.sorties/stat-mensuelle.pdf", buf);
dire(`${Math.round(buf.length / 1024)} Ko, garde dans .sorties/stat-mensuelle.pdf`);
const r = await rangeesDuPdf(new Uint8Array(buf));
const lignes = r.map((x) => `p${x.page} ` + x.cellules.map((c) => c.texte).join(" | "));
dire(`${r.length} rangee(s)\n`);
if (!lignes.length) { dire("SCAN SANS COUCHE TEXTE"); process.exit(0); }
const interessant = lignes.filter((l) => /encours|stock|total|circulation/i.test(l));
dire(`=== LES RANGEES QUI PARLENT D ENCOURS (${interessant.length}) ===`);
for (const l of interessant.slice(0, 25)) dire(`   ${l.slice(0, 190)}`);
dire(`\n=== LES VINGT PREMIERES RANGEES ===`);
for (const l of lignes.slice(0, 20)) dire(`   ${l.slice(0, 160)}`);
