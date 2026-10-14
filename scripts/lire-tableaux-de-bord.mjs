/**
 * LIRE LES TABLEAUX DE BORD HEBDOMADAIRES, ET LES RANGER.
 *
 * 81 pièces dorment dans « Autres communiques » depuis le ramassage : ce sont
 * des scans, donc le lecteur géométrique n'en tire rien, et personne ne les
 * avait ouvertes. Elles portent le livre des mouvements du marché des titres
 * publics des six Trésors : émissions, abondements, rachats, remboursements
 * et paiements d'intérêts, en francs, avec leurs dates.
 *
 * DEUX GESTES, ET LE SECOND EST GRATUIT : on lit, et on range au passage dans
 * un dossier qui les nomme, parce qu'une pièce qu'on ne retrouve pas dans
 * l'explorateur n'est pas archivée, elle est perdue avec un reçu.
 *
 * ON COMMENCE PAR UNE SEULE, TOUJOURS. Quatre-vingt-une lectures facturées
 * lancées sur un prompt non éprouvé, c'est la dépense doublée et le résultat
 * à refaire. `--une` lit la plus récente et n'écrit rien.
 *
 *   npx tsx --conditions=react-server scripts/lire-tableaux-de-bord.mjs --une
 *   npx tsx --conditions=react-server scripts/lire-tableaux-de-bord.mjs --ecrire [n]
 */
import fs from "node:fs";
import path from "node:path";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { createClient } = await import("@supabase/supabase-js");
const { lireTableauDeBord, horsEchelle } = await import("../src/lib/market/tableau-de-bord.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const RACINE = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet/1. Donnees de marche/1. BEAC - Marche des titres publics";
const DEPUIS = `${RACINE}/Autres communiques`;
const VERS = `${RACINE}/Tableaux de bord hebdomadaires`;
const uneSeule = process.argv.includes("--une");
const ecrire = process.argv.includes("--ecrire");
const combien = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 999);

/* Le journal donne l'adresse de chaque pièce, qui est ce qui la cite. */
const obs = [];
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from("beac_observations").select("url, titre").range(de, de + 999);
  obs.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
const adresses = new Map();
for (const o of obs) if (/tableau/i.test(o.titre ?? "") && !adresses.has(o.titre)) adresses.set(o.titre, o.url);

/** Toutes les pièces du disque dont le titre dit « tableau ». */
function trouver(dossier) {
  const out = [];
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    const p = `${dossier}/${e.name}`;
    if (e.isDirectory()) out.push(...trouver(p));
    else if (/tableau/i.test(e.name) && e.name.toLowerCase().endsWith(".pdf")) out.push(p);
  }
  return out;
}
const pieces = [...trouver(DEPUIS), ...(fs.existsSync(VERS) ? trouver(VERS) : [])].sort();
dire(`${pieces.length} tableau(x) de bord sur le disque\n`);

/* L'adresse d'une pièce, retrouvée par son titre amputé des accents. */
const sansAccent = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const parTitre = new Map([...adresses.entries()].map(([t, u]) => [sansAccent(t).slice(0, 100), u]));
const adresseDe = (p) => {
  const nom = sansAccent(path.basename(p, ".pdf"));
  for (const [t, u] of parTitre) if (t.startsWith(nom.slice(0, 80)) || nom.startsWith(t.slice(0, 80))) return u;
  return undefined;
};

const lot = uneSeule ? pieces.slice(-1) : pieces.slice(0, combien);
let lues = 0, lignes = 0, rangees = 0, refus = 0;
const remarques = [];

for (const p of lot) {
  const url = adresseDe(p);
  if (!url) {
    dire(`   SANS ADRESSE  ${path.basename(p)}`);
    refus++;
    continue;
  }
  let r;
  try {
    r = await lireTableauDeBord(fs.readFileSync(p).toString("base64"));
  } catch (e) {
    dire(`   ÉCHEC  ${path.basename(p).slice(0, 70)} : ${e.message}`);
    refus++;
    continue;
  }
  lues++;
  lignes += r.lignes.length;
  dire(`   ${path.basename(p).slice(0, 62).padEnd(62)} ${String(r.lignes.length).padStart(3)} ligne(s)  ${r.semaineDu ?? "?"} → ${r.semaineAu ?? "?"}${r.remarques.length ? `  · ${r.remarques.length} remarque(s)` : ""}`);
  for (const x of r.remarques) remarques.push(`${path.basename(p).slice(0, 40)} : ${x}`);

  if (uneSeule) {
    dire(`\n=== LES ${r.lignes.length} LIGNES ===`);
    for (const l of r.lignes) {
      dire(`   ${l.pays.padEnd(14)} ${String(l.instrument ?? "").padEnd(4)} ${String(l.tenor ?? "").padEnd(12)} ${l.operation.padEnd(18)} ${(l.montant ?? 0).toLocaleString("fr-FR").padStart(16)} F  ${l.operationOn ?? "?"} → ${l.settleOn ?? "?"}  ${l.codeEnchere.slice(0, 48)}`);
    }
    dire(`\nmodèle : ${r.modele}`);
    for (const x of r.remarques) dire(`   remarque : ${x}`);
    dire(`\nEssai : rien n'a été écrit.`);
    process.exit(0);
  }

  if (ecrire) {
    /* UNE LIGNE HORS D'ÉCHELLE N'ENTRE PAS. Elle est dite, et la pièce reste
       à relire : un montant faux dans un livre de mouvements déplace un
       encours entier sans que rien ne le trahisse. */
    const bonnes = r.lignes.filter((l) => !horsEchelle(l));
    const rows = bonnes.map((l) => ({
      source_url: url,
      source_title: path.basename(p, ".pdf"),
      semaine_du: r.semaineDu, semaine_au: r.semaineAu,
      pays: l.pays, instrument: l.instrument, tenor: l.tenor,
      code_enchere: l.codeEnchere, code_emission: l.codeEmission,
      coupon_rate: l.couponRate, maturity_on: l.maturityOn,
      operation: l.operation, montant: l.montant,
      operation_on: l.operationOn, settle_on: l.settleOn,
      observations: l.observations,
      read_at: new Date().toISOString(), read_model: r.modele,
    }));
    if (rows.length) {
      const { error } = await sb.from("treasury_operations").upsert(rows, { onConflict: "source_url,code_enchere,operation,operation_on,montant" });
      if (error) dire(`      écriture : ${error.message}`);
    }
    /* Et on range la pièce, puisqu'on vient de l'ouvrir. */
    const cible = `${VERS}/${(r.semaineDu ?? "sans date").slice(0, 4)}/${path.basename(p)}`;
    if (!p.startsWith(VERS) && !fs.existsSync(cible)) {
      fs.mkdirSync(path.dirname(cible), { recursive: true });
      fs.renameSync(p, cible);
      rangees++;
    }
  }
}

dire(`\n=== ${lues} pièce(s) lue(s), ${lignes} ligne(s), ${rangees} rangée(s), ${refus} refus ===`);
if (remarques.length) {
  dire(`\n${remarques.length} remarque(s) :`);
  for (const x of remarques.slice(0, 30)) dire(`   ${x}`);
}
if (!ecrire && !uneSeule) dire(`\nRien n'a été écrit. Relancer avec --ecrire.`);
