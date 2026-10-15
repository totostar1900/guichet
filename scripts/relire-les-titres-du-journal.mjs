/**
 * RELIRE LES TITRES DÉJÀ AU JOURNAL, AVEC LE LECTEUR D'AUJOURD'HUI.
 *
 * Une grammaire qui s'ouvre ne vaut rien tant que les pièces déjà vues
 * portent la lecture d'hier. Le robot quotidien finirait par le faire, page
 * par page ; ce script le fait d'un coup, SANS TOUCHER À LA BEAC : il relit le
 * titre que le journal a déjà, rien d'autre.
 *
 * IL N'INVENTE AUCUNE OBSERVATION. Une révision s'écrit quand l'empreinte
 * change, c'est-à-dire quand le genre, le pays, l'instrument, la durée ou la
 * date ne sont plus les mêmes ; la page d'origine et la présence sont
 * reportées telles quelles, parce qu'une relecture de titre ne prouve ni
 * qu'une pièce est toujours en ligne ni qu'elle a changé de page.
 *
 * IL REMPLIT DES TROUS, IL N'EFFACE RIEN. Le premier jet de ce script écrivait
 * 1347 révisions sur 1347 pièces et ramenait 278 courbes, 32 statistiques
 * mensuelles et 16 bulletins trimestriels au genre « autre » : le lecteur de
 * titre ne connaît que quatre genres, la PAGE en connaît huit. Chacun sait ce
 * que l'autre ignore. D'où les deux règles :
 *
 *   le genre ne se réécrit que s'il valait « autre » ;
 *   un champ renseigné ne se remplace jamais par un vide.
 *
 *   npx tsx --conditions=react-server scripts/relire-les-titres-du-journal.mjs [--ecrire]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const { readBeacDoc } = await import("../src/lib/market/beac.ts");
const { empreinteDe } = await import("../src/lib/market/beac-journal.ts");
const { lotDuJournal } = await import("./_journal.mjs");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ecrire = process.argv.includes("--ecrire");

/**
 * ET SEULEMENT LES PIÈCES DE LA PAGE DES ANNONCES.
 *
 * Il y a DEUX empreintes dans ce journal. Celle du ramasseur des annonces
 * résume la séance (genre, pays, instrument, durée, date) ; celle du
 * ramasseur des statistiques résume l'identité du fichier (genre, pays,
 * adresse), parce qu'une courbe n'a pas de séance. Les recalculer avec la
 * mauvaise recette inventait 345 révisions, et le ramasseur de nuit les
 * aurait réécrites à l'envers le lendemain, chaque nuit.
 */
const lot = (await lotDuJournal(sb)).filter((o) => (o.page ?? "annonces") === "annonces");
const lignes = [];
for (const o of lot) {
  const lu = readBeacDoc({ url: o.url, title: o.titre ?? "", country: o.pays ?? "", year: "" });
  /* LE GENRE DE LA PAGE L'EMPORTE, SAUF QUAND ELLE N'A RIEN SU DIRE. */
  const ancien = o.genre ?? "autre";
  const genre = ancien === "autre" ? lu.kind : ancien;
  /* ET UN CHAMP RENSEIGNÉ NE DEVIENT JAMAIS VIDE. */
  const a = {
    doc: { url: o.url, title: o.titre ?? "", country: o.pays ?? "", year: "" },
    kind: genre,
    country: lu.country ?? o.pays ?? undefined,
    instrument: lu.instrument ?? o.instrument ?? undefined,
    tenor: lu.tenor ?? o.tenor ?? undefined,
    on: lu.on ?? o.seance ?? undefined,
    abondement: lu.abondement || Boolean(o.abondement),
  };
  const emp = empreinteDe(a);
  if (emp === o.empreinte) continue;
  lignes.push({
    avant: o,
    apres: {
      page: o.page ?? "annonces",
      url: o.url,
      present: o.present ?? true,
      titre: o.titre,
      genre: a.kind,
      pays: a.country ?? null,
      instrument: a.instrument ?? null,
      tenor: a.tenor ?? null,
      seance: a.on ?? null,
      abondement: a.abondement,
      empreinte: emp,
    },
  });
}

dire(`=== ${lignes.length} REVISION(S) SUR ${lot.length} PIECE(S) DE LA PAGE DES ANNONCES ===`);
const mouvements = new Map();
for (const { avant, apres } of lignes) {
  const k = `${avant.genre ?? "autre"} -> ${apres.genre}`;
  mouvements.set(k, (mouvements.get(k) ?? 0) + 1);
}
for (const [k, n] of [...mouvements].sort((a, b) => b[1] - a[1])) dire(`   ${k.padEnd(28)} ${String(n).padStart(4)}`);
for (const { avant, apres } of lignes.slice(0, 10)) {
  dire(`   ${String(avant.genre ?? "autre").padEnd(10)} -> ${String(apres.genre).padEnd(10)} ${String(apres.seance ?? "sans date").padEnd(11)} ${String(apres.pays ?? "?").padEnd(12)} ${String(avant.titre).slice(0, 62)}`);
}

if (!ecrire) {
  dire(`\nEssai a blanc. Relancer avec --ecrire.`);
} else {
  let pose = 0;
  for (let i = 0; i < lignes.length; i += 200) {
    const paquet = lignes.slice(i, i + 200).map((x) => x.apres);
    const { error } = await sb.from("beac_observations").insert(paquet);
    if (error) { dire(`   ERREUR ${error.message}`); break; }
    pose += paquet.length;
  }
  dire(`\n=== ${pose} revision(s) ecrite(s) ===`);
}
