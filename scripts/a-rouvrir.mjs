/**
 * La liste des pièces à rouvrir, avec de quoi les rouvrir.
 *
 * Trois familles, et chacune se signale par un témoin différent.
 *
 *   - Les colonnes échangées : priceMin au-dessus de priceMax.
 *   - Les doublons : deux enregistrements sous le même code d'émission.
 *   - Les durées en désaccord avec le code : la BEAC encode la durée dans le
 *     préfixe, et une séance qui contredit son propre préfixe a tort quelque
 *     part, soit sur la durée, soit sur le code lui-même.
 *
 * La longueur du code est relevée parce qu'elle tranche souvent la question :
 * un code plus long que ses voisins est un code mal transcrit, et c'est alors
 * lui qu'il faut corriger, pas la durée.
 *
 *   npx tsx scripts/a-rouvrir.mjs
 */
import fs from "node:fs";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const rows = (
  await fetch(`${v("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: v("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${v("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).then((r) => r.json())
).map(toAuctionResult);

const prefixe = (code) => {
  if (!code) return undefined;
  const m = String(code).trim().toUpperCase().match(/^[A-Z]{2}([0-9][0-9A-Z])/);
  return m ? m[1] : undefined;
};
const normaliser = (t) => {
  if (!t) return undefined;
  const s = String(t).toLowerCase();
  const sem = s.match(/(\d{1,3})\s*semaine/);
  if (sem) return `${sem[1]} semaines`;
  const ans = s.match(/(\d{1,2})[,.]?(\d)?\s*an/);
  if (ans) return `${ans[1]}${ans[2] ? `,${ans[2]}` : ""} ans`;
  const mois = s.match(/(\d{1,2})\s*mois/);
  if (mois) return `${mois[1]} mois`;
  return s.trim();
};
const dureeDuNom = (url) => {
  if (!url) return undefined;
  const s = decodeURIComponent(url).replace(/[-_]/g, " ").toUpperCase();
  const sem = s.match(/BTA[\s]*(\d{1,2})[\s]*(?:S\b|SEM|SEMAINES?)/) ?? s.match(/(\d{1,2})[\s]*SEMAINES?/);
  if (sem) return `${sem[1]} semaines`;
  const ans = s.match(/OTA[\s]*(\d{1,2})[\s]*ANS?/) ?? s.match(/(\d{1,2})[\s]*ANS\b/);
  if (ans) return `${ans[1]} ans`;
  return undefined;
};

/* La longueur normale d'un code, par pays : celle de la majorité. */
const longueurs = new Map();
for (const r of rows) {
  if (!r.codeEmission) continue;
  const c = r.codeEmission.trim();
  const e = longueurs.get(r.country) ?? new Map();
  e.set(c.length, (e.get(c.length) ?? 0) + 1);
  longueurs.set(r.country, e);
}
const longueurNormale = new Map([...longueurs.entries()].map(([p, m]) => [p, [...m.entries()].sort((a, b) => b[1] - a[1])[0][0]]));

const fiche = (r, accusation) => {
  const c = r.codeEmission?.trim() ?? "";
  const n = longueurNormale.get(r.country);
  const lg = c.length !== n ? `  ⚠ code de ${c.length} caractères là où le ${r.country} en met ${n}` : "";
  console.log(`   ISIN   ${c || "SANS CODE"}${lg}`);
  console.log(`          ${r.country} · ${r.sessionOn} · ${r.instrument} ${r.tenor} · ${r.confirmedBy ? `relue par ${r.confirmedBy}` : "en attente"}`);
  console.log(`          ${accusation}`);
  console.log(`          ${r.sourceUrl ?? "sans source"}`);
  console.log(`          id ${r.id}\n`);
};

console.log(`1. LES COLONNES ÉCHANGÉES\n`);
for (const r of rows.filter((x) => x.instrument === "OTA" && x.priceMin != null && x.priceMax != null && x.priceMin > x.priceMax))
  fiche(r, `priceMin ${r.priceMin} au-dessus de priceMax ${r.priceMax} · les nombres sont justes, les colonnes sont à échanger`);

console.log(`2. LES DOUBLONS\n`);
const parCode = new Map();
for (const r of rows) {
  if (!r.codeEmission) continue;
  const k = `${r.codeEmission.trim()}|${r.sessionOn}`;
  parCode.set(k, [...(parCode.get(k) ?? []), r]);
}
for (const [, l] of [...parCode.entries()].filter(([, l]) => l.length > 1)) {
  console.log(`   ISIN   ${l[0].codeEmission.trim()}   ×${l.length}`);
  console.log(`          ${l[0].country} · ${l[0].sessionOn} · ${l[0].instrument} ${l[0].tenor}`);
  for (const r of l) console.log(`          id ${r.id} · ${r.confirmedBy ? `relue par ${r.confirmedBy}` : "en attente"} · ${r.sourceUrl}`);
  console.log("");
}

console.log(`3. LES DURÉES EN DÉSACCORD AVEC LEUR CODE\n`);
const parPrefixe = new Map();
for (const r of rows) {
  const p = prefixe(r.codeEmission);
  const d = normaliser(r.tenor);
  if (!p || !d) continue;
  const e = parPrefixe.get(p) ?? new Map();
  e.set(d, (e.get(d) ?? 0) + 1);
  parPrefixe.set(p, e);
}
const majorite = new Map([...parPrefixe.entries()].map(([p, m]) => [p, [...m.entries()].sort((a, b) => b[1] - a[1])[0][0]]));
for (const r of rows) {
  const p = prefixe(r.codeEmission);
  const d = normaliser(r.tenor);
  if (!p || !d) continue;
  const total = [...parPrefixe.get(p).values()].reduce((n, x) => n + x, 0);
  if (total < 3 || d === majorite.get(p)) continue;
  const nom = dureeDuNom(r.sourceUrl);
  const temoins = [`le préfixe ${p} dit « ${majorite.get(p)} »`, nom ? `le nom de la pièce dit « ${nom} »` : `le nom de la pièce ne dit rien`];
  const contre = (nom && nom !== d ? 2 : 1);
  fiche(r, `enregistré « ${d} » · ${temoins.join(" · ")} · ${contre} témoin(s) contre la ligne`);
}
