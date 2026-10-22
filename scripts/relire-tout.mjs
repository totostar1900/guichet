/**
 * RELIRE TOUTE SÉANCE QUI N'EST PAS AU LECTEUR COURANT. CELUI-CI ÉCRIT.
 *
 * POURQUOI PAS UNE CIBLE, ET C'EST LA LEÇON DU 13 OCTOBRE 2026.
 *
 * J'allais ne relire que les séances PORTANT une remarque : 180 au lieu de
 * 798, quarante minutes au lieu de trois heures, pour le même résultat.
 * La vérification a dit non. Sur les 65 séances où le contrôle des deux
 * lecteurs annonce un gain, SEULES 15 portent une remarque en base. Les 50
 * autres n'en portent aucune : les lecteurs anciens laissaient tomber la
 * rangée d'Ecobank SANS RIEN DIRE, le message « ligne ignorée » n'étant venu
 * que plus tard. La perte était muette.
 *
 * Cibler par la remarque, c'est donc cibler par un signal qui n'existe pas là
 * où il manque. On relit tout ce qui n'est pas à jour, et le coût est du
 * temps machine, pas de l'attention.
 *
 * UNE RELECTURE AJOUTE ET CORRIGE, ELLE NE RETIRE JAMAIS : une cotation
 * retrouvée écrase la sienne, une cotation que le lecteur ne retrouve pas
 * reste en place. Les remarques, elles, sont réécrites : celles que le
 * lecteur courant n'émet plus disparaissent.
 *
 *   npx tsx --conditions=react-server scripts/relire-tout.mjs            (à blanc)
 *   npx tsx --conditions=react-server scripts/relire-tout.mjs --vraiment
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { ingestBoc } = await import("../src/lib/market/boc.ts");
const { VERSION_DU_LECTEUR, lecteursARelire, LECTEURS, NOM_DU_LECTEUR } = await import("../src/lib/market/lecteur-version.ts");
const { repo } = await import("../src/lib/data/index.ts");

const vraiment = process.argv.includes("--vraiment");
const r = repo();

const somme = (bs, k) => bs.reduce((a, b) => a + (b.counts?.[k] ?? 0), 0);
const remarques = (bs) => bs.reduce((a, b) => a + (b.warnings?.length ?? 0), 0);

const toutes = await r.listBulletins(2000);
/* CE QU'UNE RELECTURE RENDRAIT, ET NON CE QUE LE NUMÉRO DIT.
   Un seul numéro couvre trois lecteurs. Le 13 octobre 2026 ce script a été
   lancé sur les 813 séances parce qu'aucune n'était « au lecteur courant » ;
   les deux montées en cause ne touchaient que l'encours, qui a son propre
   écrivain et était déjà à jour. Douze séances relues, zéro changement. */
const avant = toutes.filter((b) => lecteursARelire(b.readerVersion).length > 0).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));

console.log(`=== AVANT ===\n`);
console.log(`   ${toutes.length} séances en base, ${avant.length} auxquelles une relecture rendrait quelque chose (lecteur v${VERSION_DU_LECTEUR})`);
for (const l of LECTEURS) {
  const n = toutes.filter((b) => lecteursARelire(b.readerVersion).includes(l)).length;
  console.log(`      ${NOM_DU_LECTEUR[l].padEnd(26)} ${n} séance(s)`);
}
console.log(`   obligations ${somme(avant, "bonds")} · actions ${somme(avant, "equities")} · OPCVM ${somme(avant, "funds")}`);
console.log(`   remarques ${remarques(avant)}`);
const parVersion = avant.reduce((a, x) => ({ ...a, [x.readerVersion ?? "aucune"]: (a[x.readerVersion ?? "aucune"] ?? 0) + 1 }), {});
console.log(`   versions ${JSON.stringify(parVersion)}`);
console.log(`   plage ${avant[0]?.sessionDate} → ${avant[avant.length - 1]?.sessionDate}\n`);

if (!avant.length) {
  console.log("Aucune relecture ne rendrait quoi que ce soit : les trois lecteurs sont à jour sur toute la base.");
  process.exit(0);
}

/* L'ENCOURS A SON PROPRE ÉCRIVAIN, ET SON PROPRE TAMPON DE VERSION.
   Il ne reprend que sa table au lieu de rejouer tout le pipeline, donc il
   coûte vingt fois moins. Et surtout, le tampon du BULLETIN ne sait rien de
   ce qu'il a écrit : une séance peut rester marquée v12 alors que son encours
   est à jour depuis des heures. Poser la question à la bonne table est la
   différence entre « deux heures et demie » et « rien à faire ». */
const seulementEncours = avant.every((b) => lecteursARelire(b.readerVersion).join() === "encours");
if (seulementEncours) {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { count } = await sb.from("debt_outstandings").select("*", { count: "exact", head: true }).lt("reader_version", VERSION_DU_LECTEUR);
  console.log(`Seul l'encours aurait à gagner, et il porte son propre tampon : ${count ?? "?"} ligne(s) avant la v${VERSION_DU_LECTEUR}.`);
  if (count === 0) {
    console.log("Il est donc DÉJÀ à jour, et le tampon du bulletin ne le dit simplement pas. Rien à faire.");
  } else {
    console.log("Son propre script le reprend, bien moins cher que le pipeline entier :");
    console.log("   npx tsx --conditions=react-server scripts/encours-ingerer.mjs --tout");
  }
  if (vraiment) console.log("\nRelecture complète refusée. Retirer ce garde sciemment si elle est vraiment voulue.");
  process.exit(0);
}

if (!vraiment) {
  console.log("Rien n'a été écrit. Relancer avec --vraiment pour écrire en base.");
  process.exit(0);
}

console.log(`ÉCRITURE EN BASE. ${avant.length} séances, dans l'ordre chronologique.\n`);
const debut = Date.now();
let faites = 0;
const rates = [];

for (const b of avant) {
  try {
    const res = await ingestBoc({ sessionDate: b.sessionDate, by: "desk" });
    if (res.error) rates.push(`${b.sessionDate} : ${res.error}`);
  } catch (e) {
    rates.push(`${b.sessionDate} : ${e.message}`);
  }
  faites++;
  /* Une trace toutes les dix séances, SANS tampon : une relecture de trois
     heures qui ne dit pas où elle en est n'est pas interrompable. */
  if (faites % 10 === 0 || faites === avant.length) {
    const s = Math.round((Date.now() - debut) / 1000);
    const reste = Math.round((s / faites) * (avant.length - faites));
    fs.writeSync(1, `   ${faites}/${avant.length} · ${b.sessionDate} · ${s}s écoulées · ~${reste}s restantes · ${rates.length} en échec\n`);
  }
}

const apresToutes = await r.listBulletins(2000);
const apres = apresToutes.filter((x) => avant.some((a) => a.sessionDate === x.sessionDate));
const d = (k) => somme(apres, k) - somme(avant, k);
const signe = (n) => (n >= 0 ? `+${n}` : `${n}`);

console.log(`\n=== APRÈS ===\n`);
console.log(`   obligations ${somme(avant, "bonds")} → ${somme(apres, "bonds")}   (${signe(d("bonds"))})`);
console.log(`   actions     ${somme(avant, "equities")} → ${somme(apres, "equities")}   (${signe(d("equities"))})`);
console.log(`   OPCVM       ${somme(avant, "funds")} → ${somme(apres, "funds")}   (${signe(d("funds"))})`);
console.log(`   remarques   ${remarques(avant)} → ${remarques(apres)}   (${signe(remarques(apres) - remarques(avant))})`);
console.log(`   versions    ${JSON.stringify(apres.reduce((a, x) => ({ ...a, [x.readerVersion ?? "aucune"]: (a[x.readerVersion ?? "aucune"] ?? 0) + 1 }), {}))}`);
if (rates.length) {
  console.log(`\n   ${rates.length} ÉCHECS :`);
  for (const e of rates.slice(0, 30)) console.log(`     ${e}`);
}
