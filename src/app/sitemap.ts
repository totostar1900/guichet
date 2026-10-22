import { headers } from "next/headers";
import type { MetadataRoute } from "next";
import { isDeskHost } from "@/lib/hosts";
import { loadLessons } from "@/lib/reference";
import { estPublic } from "@/lib/porte";

export const dynamic = "force-dynamic";

/**
 * Ce qu'on INVITE un moteur à indexer.
 *
 * Mesuré le 22 octobre 2026 sur la production : « /sitemap.xml » figurait
 * dans la liste blanche de `src/lib/porte.ts` et répondait 404, sur le
 * déploiement du jour comme sur le précédent. La porte nommait une page qui
 * n'existait pas. C'est la dérive silencieuse que le cliquet « docs-exactes »
 * traque ailleurs, et elle valait ici une adresse morte annoncée à tous.
 *
 * TROIS LISTES DISENT LA MÊME CHOSE, ET AUCUNE NE PEUT DÉRIVER SEULE :
 *
 *   `porte.ts`    ce qui se LIT sans compte ;
 *   `robots.ts`   ce qu'un moteur a le DROIT de lire ;
 *   ce fichier    ce qu'on lui PROPOSE, ce qui est plus étroit que le droit.
 *
 * Un cliquet (`src/test/sitemap.test.ts`) refuse toute adresse d'ici que la
 * porte ferme ou que robots.txt interdit. L'inverse n'est pas vrai et c'est
 * voulu : « /offres/<id> » reste ouvert pour qu'un lien partagé par WhatsApp
 * continue de travailler, mais publier le catalogue des identifiants est un
 * autre geste, que personne n'a demandé.
 *
 * LE DESK N'EST PAS UN SITE PUBLIC. Sur son hôte, robots.txt ferme tout ;
 * ce fichier rend donc une liste vide, et ne se contredit pas.
 *
 * AUCUNE DATE N'EST ÉCRITE. Une « lastModified » inventée vaut moins que
 * pas de date : elle demande au moteur de revenir pour rien, ou l'en
 * dissuade à tort. On la posera le jour où une page saura la sienne.
 */

/** Les pages du guide dont l'adresse est fixe, en plus des leçons du référentiel. */
const GUIDE = ["/info", "/info/aide", "/info/mentions", "/info/parcours", "/info/risques"];

/** Les adresses qui ne dépendent d'aucune lecture, donc qui répondent toujours. */
const SOCLE = ["/", "/ouvrir-un-compte", "/indice/notes", ...GUIDE];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  const host = h.get("host");
  if (isDeskHost(host)) return [];

  const base = `https://${host ?? new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://guichet.purposecapital.africa").host}`;
  const chemins = [...SOCLE];

  /* Les leçons viennent du référentiel : une leçon ajoutée par le desk paraît
     ici sans qu'on touche au code. Si la lecture échoue, le socle part seul
     plutôt que l'adresse entière rende 500. */
  try {
    for (const l of await loadLessons()) chemins.push(`/info/${l.key}`);
  } catch {
    /* le socle suffit */
  }

  /* Les notes de marché publiées, page seule : le PDF est une forme de la
     même publication, pas une seconde adresse à indexer. */
  try {
    const [{ indexPageData }, { quarters }] = await Promise.all([import("@/lib/market/index-data"), import("@/lib/market/index-quarter")]);
    for (const q of quarters(await indexPageData())) chemins.push(`/indice/note/${q.key.toLowerCase()}`);
  } catch {
    /* « /indice/notes » reste, et mène à toutes */
  }

  /* La porte fait foi jusqu'au bout : une adresse fermée ne sort pas d'ici,
     même si elle a été ajoutée au-dessus par erreur. */
  return [...new Set(chemins)].filter(estPublic).map((p) => ({ url: `${base}${p}` }));
}
