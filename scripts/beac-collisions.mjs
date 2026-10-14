/**
 * DEUX DOCUMENTS, UN SEUL FICHIER : CE QUE LE RAMASSEUR CROIT AVOIR.
 *
 * Le nom de fichier est coupe a 110 signes. Deux titres longs qui ne different
 * qu apres peuvent tomber sur le meme chemin : le second voit le premier,
 * conclut « deja la », et ne descend jamais. Le compte-rendu dit alors 987 sur
 * 987 alors que le disque en porte 965. UNE ARCHIVE QUI SE CROIT COMPLETE EST
 * PIRE QU UNE ARCHIVE TROUEE : personne ne va chercher ce qu elle affirme.
 *
 *   npx tsx --conditions=react-server scripts/beac-collisions.mjs
 */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const BEAC = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet/1. Donnees de marche/1. BEAC - Marche des titres publics";
const propre = (s) => (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[<>:"/\|?*\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 110);
const PAYS = { Cameroun: "Cameroun", Gabon: "Gabon", Congo: "Congo", Tchad: "Tchad", "Guinée éq.": "Guinee equatoriale", "Guinée équatoriale": "Guinee equatoriale", RCA: "RCA" };
function destination(o) {
  const an = (o.seance ?? "").slice(0, 4) || (o.titre?.match(/\b(20\d{2})\b/) ?? [])[1] || "sans date";
  const pays = PAYS[o.pays] ?? null;
  if (o.genre === "calendrier") return `${BEAC}/Calendriers indicatifs/${pays ?? "Zone"}/${an} ${propre(o.titre)}.pdf`;
  if (o.genre === "annonce" || o.genre === "resultats") {
    const quoi = [o.instrument, o.tenor].filter(Boolean).join(" ");
    return `${BEAC}/Adjudications - ${o.genre === "annonce" ? "annonces" : "resultats"}/${pays ?? "Zone"}/${an}/${`${o.seance ?? an} ${propre(quoi)} - ${o.genre}.pdf`.replace(/\s+/g, " ")}`;
  }
  return `${BEAC}/Autres communiques/${an}/${propre(o.titre)}.pdf`;
}

const lignes = [];
for (let de = 0; ; de += 1000) { const { data } = await sb.from("beac_observations").select("url, titre, genre, pays, instrument, tenor, seance, present").order("vu_le", { ascending: false }).range(de, de + 999); lignes.push(...(data ?? [])); if ((data ?? []).length < 1000) break; }
const vus = new Map(); for (const l of lignes) if (!vus.has(l.url)) vus.set(l.url, l);
const lot = [...vus.values()].filter((o) => o.present);

const parChemin = new Map();
for (const o of lot) parChemin.set(destination(o), [...(parChemin.get(destination(o)) ?? []), o]);
const heurtes = [...parChemin.entries()].filter(([, xs]) => xs.length > 1);
const perdus = heurtes.reduce((a, [, xs]) => a + xs.length - 1, 0);

dire(`${lot.length} document(s) a ramasser`);
dire(`${parChemin.size} chemin(s) distinct(s)`);
dire(`${heurtes.length} chemin(s) reclame(s) par plusieurs documents`);
dire(`${perdus} DOCUMENT(S) QUE L ARCHIVE N A JAMAIS PRIS\n`);
for (const [c, xs] of heurtes.slice(0, 15)) {
  dire(`   ${c.replace(BEAC, "…")}`);
  for (const o of xs) dire(`      [${o.genre}] ${o.titre?.slice(0, 120)}`);
}
if (heurtes.length > 15) dire(`   … et ${heurtes.length - 15} autre(s)`);
const surDisque = parChemin.size - [...parChemin.keys()].filter((c) => !fs.existsSync(c)).length;
dire(`\n   chemins reellement presents sur le disque : ${surDisque} sur ${parChemin.size}`);
