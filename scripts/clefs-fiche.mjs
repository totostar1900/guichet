/**
 * Les clefs de la fiche client, posées en une fois.
 *
 *   node scripts/clefs-fiche.mjs
 */
import fs from "node:fs";

const F = new URL("../src/i18n/en-desk.ts", import.meta.url);
const CLEFS = {
  "dossier {s}": "file {s}",
  "client depuis le {d}": "client since {d}",
  "Le dossier": "The file",
  "palier {n}": "tier {n}",
  "{n} manquement(s)": "{n} shortcoming(s)",
  "aucun barème publié": "no scale published",
  "Traité avec nous": "Dealt with us",
  "volume, espèces, commissions": "volume, cash, commissions",
  "{n} sur 30 jours": "{n} over 30 days",
  "Tout ce qu'il a fait": "Everything they have done",
  "{n} lignes depuis le {d}": "{n} lines since {d}",
  "Voir les {n} lignes précédentes au registre": "See the {n} earlier lines in the register",
  "Tenue : les manquements": "Standing: the shortcomings",
  "Rien à dire : aucun manquement sur la période.": "Nothing to report: no shortcoming over the period.",
  "Activité : {n} sur 100": "Activity: {n} out of 100",
  "Aucun barème publié : sans lui, un score ne se compare à rien.": "No scale published: without one, a score compares to nothing.",
  "Un score ne se compare qu'à barème égal.": "A score only compares at equal scale.",
  "Les consultations ne pèsent rien dans ce score : elles nourrissent la cadence et le fil. Sinon regarder vaudrait acheter.":
    "Views count for nothing in this score: they feed the cadence and the feed. Otherwise looking would be worth buying.",
  "Alertes": "Alerts",
  "Aucun enchaînement à signaler.": "No sequence to report.",
  "Une alerte naît d'un enchaînement, pas d'un score. Elle nomme les deux faits et leur écart dans le temps.":
    "An alert comes from a sequence, not from a score. It names both facts and the time between them.",
  "Prendre une mesure": "Take a measure",
  "Une mesure demande un motif pris dans la liste, une durée, et un second responsable. Le client lit la mesure et sa cause.":
    "A measure requires a reason from the list, a duration, and a second responsable. The client reads the measure and its cause.",
  "Un soupçon de fraude ne passe pas par ce bouton : il va à la conformité, il ne se dit pas au client, et c'est la loi qui l'impose.":
    "A suspicion of fraud does not go through this button: it goes to compliance, it is not told to the client, and the law requires that.",
  "Aucun geste pour ce filtre.": "No action for this filter.",

  // Les alertes passent par t(variable) : invisibles au scanner.
  "Appareil partagé avec un autre compte": "Device shared with another account",
  "Compte bancaire déclaré sur un autre dossier": "Bank account declared on another file",
  "Compte bancaire changé, puis un geste d'argent": "Bank account changed, then a money action",
};

let s = fs.readFileSync(F, "utf8");
const lignes = [];
for (const [fr, en] of Object.entries(CLEFS)) {
  if (s.includes(`\n  ${JSON.stringify(fr)}:`)) continue;
  lignes.push(`  ${JSON.stringify(fr)}: ${JSON.stringify(en)},`);
}
if (lignes.length) fs.writeFileSync(F, s.replace(/\n};\s*$/, `\n${lignes.join("\n")}\n};\n`));
console.log(`${lignes.length} clefs ajoutées`);
