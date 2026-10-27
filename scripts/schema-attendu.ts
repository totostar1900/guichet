/**
 * Génère src/lib/domain/schema-attendu.ts depuis supabase/migrations/*.sql.
 * Run: node scripts/schema-attendu.ts   (Node ≥ 22.18 strips types natively)
 *
 * POURQUOI UN RELEVÉ FIGÉ ET NON UNE LECTURE À L'EXÉCUTION. Le contrôle de
 * santé tourne sur Vercel, où le dossier des migrations n'est pas du code : il
 * n'entre pas dans le paquet déployé, et le lire reviendrait à ne rien lire.
 * Le relevé est donc écrit ici, commité, et un cliquet refuse qu'il s'écarte
 * des migrations — c'est la mécanique déjà employée pour la cadence des robots,
 * recopiée de « vercel.json » et tenue au caractère.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { declarePar } from "../src/lib/domain/schema-declare.ts";

const D = new URL("../supabase/migrations/", import.meta.url);
const fichiers = readdirSync(D)
  .filter((x) => x.endsWith(".sql"))
  .sort()
  .map((nom) => ({ nom, sql: readFileSync(new URL(nom, D), "utf8") }));

const d = declarePar(fichiers);
if (d.incompris.length) {
  for (const x of d.incompris) console.error("  ·", x);
  throw new Error(`${d.incompris.length} déclaration(s) non comprise(s) : le relevé serait incomplet, et un contrôle incomplet ment.`);
}

const liste = (xs: string[]) => xs.map((x) => `  ${JSON.stringify(x)},`).join("\n");

writeFileSync(
  new URL("../src/lib/domain/schema-attendu.ts", import.meta.url),
  `/**
 * CE QUE LES ${fichiers.length} MIGRATIONS DU DÉPÔT DÉCLARENT.
 *
 * ÉCRIT PAR UN SCRIPT, JAMAIS À LA MAIN : \`npm run schema:attendu\`. Un cliquet
 * (src/test/schema-attendu.test.ts) refuse qu'il s'écarte des migrations, parce
 * qu'un relevé périmé annoncerait une base saine ou crierait sur une colonne
 * retirée exprès — et les deux valent moins que pas de relevé du tout.
 *
 * Il sert au point « Schéma » de la page Santé, qui le compare à ce que la base
 * porte. Voir domain/schema-declare pour ce qui est lu et ce qui ne l'est pas.
 */
import type { SchemaDeclare } from "./schema-declare";

export const SCHEMA_ATTENDU: Omit<SchemaDeclare, "incompris"> = {
  tables: [
${liste(d.tables)}
  ],
  colonnes: [
${liste(d.colonnes)}
  ],
  index: [
${liste(d.index)}
  ],
  valeurs: [
${liste(d.valeurs)}
  ],
};
`,
);

console.log(`schema-attendu.ts : ${d.tables.length} tables, ${d.colonnes.length} colonnes ajoutées, ${d.index.length} index, ${d.valeurs.length} valeurs d'énumération (${fichiers.length} migrations)`);
