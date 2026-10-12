/**
 * Les clefs du registre des gestes (planche « Le registre des actions »).
 *
 *   node scripts/clefs-registre.mjs
 */
import fs from "node:fs";

const F = "C:/dev/guichet/src/i18n/en-desk.ts";
const CLEFS = {
  Du: "From",
  Au: "To",
  Appliquer: "Apply",
  "Exporter CSV": "Export CSV",
  "un client, un objet, une référence": "a client, an object, a reference",
  "Combien de lignes, et jusqu'à quand": "How many lines, and until when",
  "Sur trente jours, {n} client(s)": "Over thirty days, {n} client(s)",
  "Au rythme observé, par an": "At the observed rate, per year",
  "Tout le registre à ce jour": "The whole register to date",
  "Détail gardé": "Detail kept",
  Puis: "Then",
  "un résumé par mois, sans fin": "a monthly summary, with no end",
  "{n} mois": "{n} months",
  Canal: "Channel",
  "Treize mois, pour qu'une comparaison d'une année sur l'autre tombe toujours dans le détail. Le résumé mensuel garde les compteurs qui nourrissent l'activité, et perd le geste lui-même.":
    "Thirteen months, so that a year-on-year comparison always lands in the detail. The monthly summary keeps the counters that feed activity, and loses the action itself.",
  "Ce que ce registre oblige à faire": "What this register obliges",
  "Un article de la convention qui dit ce qui est noté, pourquoi, et pendant combien de temps.":
    "An article of the agreement saying what is recorded, why, and for how long.",
  "Une version de la convention à reprendre, donc un consentement à redemander.":
    "A version of the agreement to reissue, hence a consent to ask for again.",
  "La même activité visible par le client sur son propre écran, puisqu'elle parle de lui.":
    "The same activity visible to the client on their own screen, since it is about them.",
  "Aucune décision automatique : une mesure se prend par une personne, avec un motif.":
    "No automatic decision: a measure is taken by a person, with a reason.",
  "Un journal qu'on ne déclare pas est un fichier caché sur sa propre clientèle. Déclaré, c'est un service : le client y lit ses connexions et repère une intrusion avant nous.":
    "A log you do not declare is a hidden file on your own clients. Declared, it is a service: the client reads their sign-ins there and spots an intrusion before we do.",
};

let s = fs.readFileSync(F, "utf8");
const lignes = [];
for (const [fr, en] of Object.entries(CLEFS)) {
  if (s.includes(`\n  ${JSON.stringify(fr)}:`)) continue;
  lignes.push(`  ${JSON.stringify(fr)}: ${JSON.stringify(en)},`);
}
if (lignes.length) fs.writeFileSync(F, s.replace(/\n};\s*$/, `\n${lignes.join("\n")}\n};\n`));
console.log(`${lignes.length} clefs ajoutées`);
