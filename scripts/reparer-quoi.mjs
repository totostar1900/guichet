/**
 * Famille par famille : ce qu'il faudrait changer pour fermer la remarque.
 *
 * « Réparable » ne veut dire qu'une chose dans le code : la remarque n'est pas
 * un code de date. Ce n'est PAS la promesse qu'une réparation existe, et
 * l'essai à blanc du 11 octobre 2026 l'a montré : 174 séances « réparables »,
 * zéro ligne gagnée à les relire. Le lecteur d'aujourd'hui lit déjà tout ce
 * que ces PDF portent.
 *
 * Alors ce script sépare les deux choses qu'on confondait :
 *
 *   - la remarque est-elle SANS ESPOIR par la date (A avant le 12/12/2023,
 *     B et C avant le 04/08/2023) ? Et combien la portent APRÈS, qui sont
 *     alors de vrais défauts qu'on croyait classés sans suite ;
 *   - et pour les autres, le TEXTE BRUT que le lecteur a gardé, qui est la
 *     seule matière avec laquelle on écrit un motif de plus.
 *
 *   npx tsx scripts/reparer-quoi.mjs [lettre]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { FAMILLES, codes, enAttente, remarques } = await import("../src/lib/market/remarques.ts");
const { repo } = await import("../src/lib/data/index.ts");

/** Depuis quand la bourse publie ce qu'on réclame. Avant, aucun lecteur n'y peut rien. */
const DEPUIS = { A: "2023-12-12", B: "2023-08-04", C: "2023-08-04" };

const attente = (await repo().listBulletins(2000)).filter(enAttente).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
const seul = process.argv[2]?.toUpperCase();

for (const f of FAMILLES) {
  if (seul && f.code !== seul) continue;
  const siennes = attente.filter((b) => codes(b).includes(f.code));
  if (siennes.length === 0) continue;
  const borne = DEPUIS[f.code];
  const apres = borne ? siennes.filter((b) => b.sessionDate >= borne) : siennes;
  console.log(`\n── ${f.code} · ${f.libelle} · ${f.genre}`);
  console.log(`   ${siennes.length} séances${borne ? ` · ${siennes.length - apres.length} avant le ${borne} (sans espoir) · ${apres.length} APRÈS (vrai défaut)` : ""}`);
  console.log(`   quoi faire : ${f.quoiFaire}`);
  /* Le texte brut d'abord : c'est lui qui dit si un motif de plus suffirait. */
  const exemples = [];
  for (const b of apres.length ? apres : siennes) {
    for (const r of remarques(b)) {
      if (r.code !== f.code) continue;
      exemples.push(`${b.sessionDate} · ${r.texte.slice(0, 150)}`);
      break;
    }
    if (exemples.length >= 4) break;
  }
  for (const e of exemples) console.log(`      ${e}`);
}
