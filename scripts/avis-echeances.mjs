/**
 * Trois sources pour une même durée, et ce qu'elles disent chacune.
 *
 * Une séance porte sa durée trois fois, par des chemins indépendants : le titre
 * du document chez la BEAC, le préfixe du code d'émission, et l'écart entre la
 * date de séance et l'échéance imprimée. Quand les trois concordent, il n'y a
 * rien à dire. Quand deux concordent contre une, la minoritaire est
 * probablement fausse, et savoir laquelle oriente la relecture : une erreur de
 * l'index de la BEAC ne se corrige pas comme une erreur de lecture.
 *
 * Le préfixe du code est le témoin le plus solide des trois : il est frappé par
 * le Trésor à l'émission de la ligne et ne dépend ni d'un titre de page ni d'un
 * scan.
 *
 *   node scripts/avis-echeances.mjs [<id d'avis> …]
 */
import fs from "node:fs";
import { toEmissionNotice } from "../src/lib/data/supabase.ts";
import { tenorDays } from "../src/lib/market/yield.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");

/**
 * Ce que le préfixe d'un code d'émission dit de la durée de la ligne.
 *
 * Relevé sur les codes déjà lus : les deux caractères qui suivent le pays
 * désignent le produit. « 11 » un bon à treize semaines, « 2J » une obligation
 * à trois ans. Rien dans nos sources ne le documente ; c'est une régularité
 * observée, et elle sert ici d'indice, jamais de correction automatique.
 */
const PAR_CODE = {
  11: "13 semaines",
  12: "26 semaines",
  13: "52 semaines",
  "2A": "2 ans",
  "2J": "3 ans",
  "2K": "4 ans",
  "2B": "5 ans",
  "2L": "6 ans",
  "2C": "7 ans",
  "2D": "10 ans",
};
const parCode = (code) => (code ? PAR_CODE[code.trim().slice(2, 4).toUpperCase()] : undefined);

const lus = (await fetch(`${U}/rest/v1/emission_notices?select=*&read_at=not.is.null&limit=3000`, {
  headers: { apikey: K, Authorization: `Bearer ${K}` },
}).then((r) => r.json())).map(toEmissionNotice);

const ids = process.argv.slice(2);
const cible = ids.length ? lus.filter((x) => ids.includes(x.id)) : lus;

const jours = (x) => (x.maturityOn ? Math.round((Date.parse(x.maturityOn) - Date.parse(x.sessionOn)) / 86_400_000) : undefined);
/** La durée annoncée la plus proche d'un nombre de jours, à dix pour cent près. */
const parEcheance = (j) => {
  if (j == null) return undefined;
  const tout = Object.values(PAR_CODE);
  const proche = tout.map((t) => [t, tenorDays(t)]).sort((a, b) => Math.abs(a[1] - j) - Math.abs(b[1] - j))[0];
  return Math.abs(proche[1] - j) <= Math.max(10, proche[1] * 0.1) ? proche[0] : undefined;
};

const desaccords = cible.filter((x) => {
  const t = [x.tenor, parCode(x.codeEmission), parEcheance(jours(x))].filter(Boolean);
  return new Set(t).size > 1;
});

console.log(`${cible.length} avis examinés · ${desaccords.length} où les trois sources ne disent pas la même chose\n`);
for (const x of desaccords) {
  const j = jours(x);
  const trois = { "index BEAC": x.tenor, "code émission": parCode(x.codeEmission), échéance: parEcheance(j) };
  const compte = {};
  for (const t of Object.values(trois)) if (t) compte[t] = (compte[t] ?? 0) + 1;
  const majoritaire = Object.entries(compte).sort((a, b) => b[1] - a[1])[0];
  console.log(`${x.sessionOn} ${x.country.padEnd(12)} ${x.instrument} ${x.codeEmission ?? "—"} · échéance ${x.maturityOn ?? "—"} (${j ?? "—"} j)`);
  for (const [source, t] of Object.entries(trois)) {
    const seul = t && compte[t] === 1 && majoritaire[1] > 1;
    console.log(`   ${source.padEnd(14)} ${String(t ?? "—").padEnd(13)}${seul ? "  ← seule de son avis" : ""}`);
  }
  console.log(`   ${x.id}`);
}
