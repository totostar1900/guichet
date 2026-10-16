/**
 * RENDRE AUX SIGNATURES LES CHIFFRES QU'ELLES COUVRENT.
 *
 * Le 16 octobre 2026 la campagne de dépôt a relu quarante communiqués que
 * la table n'avait jamais cités, en croyant déposer quarante séances
 * absentes. Elles ne l'étaient pas : c'étaient les SECONDES PIÈCES de
 * séances déjà déposées, le plus souvent une traduction. L'upsert, qui vise
 * la clef (pays, séance, code) posée par la migration 0108, a donc écrasé
 * trente-neuf lignes existantes au lieu d'en insérer quarante.
 *
 * `confirmed_by` n'était pas dans la charge, donc les signatures sont
 * restées en place pendant que les chiffres changeaient dessous. UNE
 * SIGNATURE QUI COUVRE UNE VALEUR QUE PERSONNE N'A SIGNÉE EST PIRE QU'UNE
 * LIGNE NON SIGNÉE : elle se présente comme vérifiée.
 *
 * Ce que l'audit permet de réparer : il garde, à chaque confirmation, le
 * taux et le prix moyens de l'instant. Deux lignes sur dix-neuf ont bougé.
 * On leur rend leur valeur signée, ET ON GARDE LA SECONDE LECTURE comme un
 * désaccord nommé, parce qu'elle est un vrai témoin : c'est exactement ce
 * qui manquait à la séance guinéenne du 5 février 2020.
 *
 * CE QUE CE SCRIPT NE PEUT PAS RÉPARER, et il faut le dire : l'audit ne
 * garde que le taux et le prix. Les montants, le code, l'échéance et le
 * nombre de soumissionnaires des trente-neuf lignes n'ont pas d'image
 * d'avant. S'ils ont bougé, rien ici ne le saura.
 *
 *   npx tsx --conditions=react-server scripts/reparer-signatures-ecrasees.mjs [--ecrire]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ecrire = process.argv.includes("--ecrire");

/* Les deux lignes trouvées en comparant l'audit de confirmation à l'état
   actuel. Elles sont écrites ici plutôt que recalculées : la requête qui les
   a trouvées compare un état que ce script va changer, donc la relancer
   après coup ne rendrait plus rien. */
const A_RENDRE = [
  { code: "GQ1300000759", pays: "Guinée éq.", seance: "2020-02-05", signe: 7.923, relu: 7.231 },
  { code: "CM1300000484", pays: "Cameroun", seance: "2020-03-18", signe: 3.52, relu: 3.41 },
];

for (const x of A_RENDRE) {
  const { data, error } = await sb
    .from("auction_results")
    .select("id, rate_avg, confirmed_by, correction")
    .eq("country", x.pays)
    .eq("session_on", x.seance)
    .eq("code_emission", x.code)
    .limit(1);
  if (error) { dire(`ERREUR lecture ${x.code} : ${error.message}`); continue; }
  const r = data?.[0];
  if (!r) { dire(`INTROUVABLE ${x.code}`); continue; }

  if (Number(r.rate_avg) === x.signe) {
    dire(`${x.code}  deja a sa valeur signee (${x.signe}), rien a faire`);
    continue;
  }

  const note =
    `Taux moyen rendu à sa valeur signée, ${String(x.signe).replace(".", ",")} %, après qu'une relecture ` +
    `automatique l'eut remplacé par ${String(x.relu).replace(".", ",")} % sans que personne ne resigne. ` +
    `LES DEUX LECTURES RESTENT OUVERTES : la seconde pièce de cette séance, lue le 16 octobre 2026, ` +
    `donne ${String(x.relu).replace(".", ",")} %. Le desk tranche.`;

  dire(`${x.code}  ${r.rate_avg} -> ${x.signe}  (relecture ${x.relu} gardee en note)  signee par ${r.confirmed_by ?? "?"}`);
  if (!ecrire) continue;

  const { error: e2 } = await sb
    .from("auction_results")
    .update({
      rate_avg: x.signe,
      correction: r.correction ? `${r.correction}\n\n${note}` : note,
      updated_at: new Date().toISOString(),
    })
    .eq("id", r.id);
  if (e2) dire(`   ERREUR ecriture : ${e2.message}`);
}

if (!ecrire) dire("\nEssai a blanc. Relancer avec --ecrire.");
else dire("\nRendu. Les deux desaccords sont nommes dans la note de chaque ligne.");
