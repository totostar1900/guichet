/**
 * LES CALENDRIERS TRIMESTRIELS DES TRESORS.
 *
 * Georges : « les calendriers d emission sont produits par le tresor des
 * pays ». La BEAC les relaie sur une page soeur de celle des annonces, et
 * notre journal n en avait capte qu UN SEUL, celui du Tchad pour le T3 2026,
 * parce que le robot ne lit que la page des annonces.
 *
 * On va donc voir la page des calendriers, on compte ce qu elle porte, et on
 * ramasse. Rien n est lu ici : ce sont des scans, et la lecture est un autre
 * geste.
 *
 *   npx tsx --conditions=react-server scripts/calendriers-tresors.mjs [--prendre]
 */
import fs from "node:fs";
import { createHash } from "node:crypto";
const dire = (s) => fs.writeSync(1, `${s}\n`);
const prendre = process.argv.includes("--prendre");

const PAGES = [
  "https://www.beac.int/m-des-titres-publics/calendrier-trimestriel-demission-titres-publics-etats-de-cemac/",
  "https://www.beac.int/calendrier-trimestriel-demission-titres-publics-etats-de-cemac/",
  "https://www.beac.int/m-des-titres-publics/",
];

const RACINE = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet/1. Donnees de marche/1. BEAC - Marche des titres publics/Calendriers indicatifs";
const PAYS = [["Cameroun", /cameroun|cmr/i], ["Tchad", /tchad|chad/i], ["Congo", /congo/i], ["Gabon", /gabon/i], ["Guinee equatoriale", /guin[ée]e|guinea|equato/i], ["RCA", /centrafric|rca|cafr/i]];
const sansAccent = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[<>:"/\|?*\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 110);

const vus = new Map();
for (const page of PAGES) {
  let html;
  try { html = await fetch(page, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0)" } }).then((r) => (r.ok ? r.text() : null)); }
  catch { html = null; }
  if (!html) { dire(`   ${page}\n      ne repond pas`); continue; }
  dire(`   ${page}\n      ${html.length} octets`);
  for (const m of html.matchAll(/<a[^>]+href="([^"]+\.pdf)"[^>]*>([\s\S]{0,300}?)<\/a>/gi)) {
    const url = m[1].startsWith("http") ? m[1] : `https://www.beac.int${m[1]}`;
    const titre = m[2].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
    const texte = `${titre} ${decodeURIComponent(url)}`;
    if (!/calendrier/i.test(texte)) continue;
    if (!vus.has(url)) vus.set(url, { url, titre: titre || decodeURIComponent(url.split("/").pop()) });
  }
}

dire(`\n${vus.size} calendrier(s) trouve(s)\n`);
const an = (t) => (t.match(/\b(20\d{2})\b/) ?? [])[1] ?? "sans date";
for (const c of vus.values()) {
  const pays = PAYS.find(([, m]) => m.test(`${c.titre} ${decodeURIComponent(c.url)}`))?.[0] ?? "Zone";
  const trimestre = (c.titre.match(/\b(premier|deuxi[èe]me|troisi[èe]me|quatri[èe]me|1er|2e|3e|4e|T[1-4])\b/i) ?? [])[1] ?? "?";
  dire(`   ${pays.padEnd(20)} ${an(c.titre).padEnd(10)} ${String(trimestre).padEnd(12)} ${c.titre.slice(0, 80)}`);
  if (!prendre) continue;
  const dossier = `${RACINE}/${pays}`;
  const chemin = `${dossier}/${an(c.titre)} ${sansAccent(c.titre)}.pdf`;
  if (fs.existsSync(chemin) && fs.statSync(chemin).size > 2048) { dire(`      deja la`); continue; }
  const formes = c.url === encodeURI(c.url) ? [c.url] : [c.url, encodeURI(c.url)];
  let buf = null;
  for (const f of formes) { try { const r = await fetch(f, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0)" } }); if (r.ok) { buf = Buffer.from(await r.arrayBuffer()); break; } } catch { /* on reessaie l autre forme */ } }
  if (!buf || buf.length < 2048) { dire(`      RATE`); continue; }
  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(chemin, buf);
  dire(`      pris, ${Math.round(buf.length / 1024)} Ko, ${createHash("sha256").update(buf).digest("hex").slice(0, 12)}`);
}
if (!prendre && vus.size) dire(`\nEssai a blanc. Relancer avec --prendre.`);
