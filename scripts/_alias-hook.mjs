import { existsSync } from "node:fs";

/**
 * Le crochet qui apprend au node nu à lire ce dépôt.
 *
 * Les scripts de la maison n'importaient jusqu'ici que des modules sans
 * dépendance, ce qui les tenait loin du domaine : dès qu'un calcul vit dans
 * `lib/positions.ts`, le script devait le recopier. Et un calcul recopié
 * diverge, ce qui est exactement ce qu'un script de données ne doit pas faire :
 * il poserait des clefs que l'application ne retrouverait pas.
 *
 * DEUX CHOSES MANQUENT À NODE, et la seconde m'a surpris. L'alias « @/ »,
 * évidemment. Mais aussi L'EXTENSION : le dépôt est écrit pour un empaqueteur,
 * donc `format.ts` importe « ./finance » tout court, et le node nu refuse. Ne
 * traiter que l'alias ne menait qu'au premier import relatif venu.
 *
 * On essaie donc « .ts », « .tsx », puis le dossier et son index, comme le
 * résolveur de Next. Tout se fait en URL, sans jamais repasser par un chemin :
 * sur Windows, un « pathname » commence par une barre avant la lettre du
 * lecteur, et le recoller à la main est la façon la plus sûre de fabriquer un
 * chemin qui n'existe pas.
 */
const RACINE = new URL("../src/", import.meta.url);
const SUFFIXES = [".ts", ".tsx", "/index.ts", "/index.tsx"];
/** Un specifier déjà extensionné n'a rien à nous demander. */
const EXTENSIONNE = /\.[a-z0-9]+$/i;

export async function resolve(specifier, context, next) {
  const alias = specifier.startsWith("@/");
  const relatif = specifier.startsWith("./") || specifier.startsWith("../");
  if ((!alias && !relatif) || EXTENSIONNE.test(specifier)) return next(specifier, context);

  const base = alias ? new URL(specifier.slice(2), RACINE) : new URL(specifier, context.parentURL);
  for (const s of SUFFIXES) {
    const url = new URL(base.href + s);
    if (existsSync(url)) return next(url.href, context);
  }
  return next(specifier, context);
}
