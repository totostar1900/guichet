import { ACCENTS } from "./config";
import { MARCHE_PREFIXES } from "./nav-section";

/**
 * LA FAMILLE D'UNE PAGE, POUR SON ACCENT (21 novembre 2026, planches « Marché en bleu » 4A, puis « généraliser l'accent à toutes les familles »).
 *
 * Cinq familles, qui suivent les sièges de la navigation : les instruments (titres, fonds, calendrier et résultats d'adjudications), le trader (activité), le marché, l'aide, l'accueil et le compte (« /moi »). Une page hors de toute famille (paramètres, profil, sécurité, connexion) n'en a pas et garde l'or.
 *
 * LA TABLE EST L'ORDRE D'UNE LECTURE : la première règle qui reconnaît l'adresse gagne. Les résultats d'adjudications vivent sous « /marche » mais appartiennent aux instruments (ils se traitent), donc leur règle passe avant celle du marché. « /moi/contact » est de l'aide avant d'être du compte.
 *
 * Le mot de chaque famille est dans « ACCENTS » (src/lib/config.ts) ; ce fichier dit seulement où chaque famille commence et finit. Le script du <head> et le suivi de navigation lisent la MÊME table : une seule définition. Les prédicats de « nav-section » restent ceux de la barre ; « famille.test.ts » les confronte.
 */
export type Famille = "instruments" | "trader" | "marche" | "aide" | "accueil";
export type Regle = { famille: Famille; exact?: readonly string[]; prefixes?: readonly string[]; sauf?: readonly string[] };

export const REGLES: readonly Regle[] = [
  { famille: "instruments", prefixes: ["/titres", "/offres", "/fonds", "/calendrier", "/marche/adjudications"] },
  { famille: "trader", prefixes: ["/activite"] },
  { famille: "marche", prefixes: MARCHE_PREFIXES },
  { famille: "aide", exact: ["/aide"], prefixes: ["/info", "/moi/contact", "/moi/reclamation"] },
  { famille: "accueil", exact: ["/"], prefixes: ["/moi"], sauf: ["/moi/profil", "/moi/securite", "/moi/reclamation"] },
];

const reconnait = (r: Regle, p: string): boolean => {
  if (r.exact?.includes(p)) return true;
  if (!r.prefixes?.some((x) => p.startsWith(x))) return false;
  return !r.sauf?.some((s) => p === s || p.startsWith(s + "/"));
};

export const familleDe = (chemin: string): Famille | null => {
  const p = chemin.split("?")[0].split("#")[0] || "/";
  return REGLES.find((r) => reconnait(r, p))?.famille ?? null;
};

/** L'accent d'une famille, tel que « ACCENTS » le dit (« or » : rien à poser). */
export const accentDe = (f: Famille | null) => (f ? ACCENTS[f] : "or");

/** Le script du <head> : pose la famille et son accent avant la première image, pour qu'une page ouverte directement n'ait pas un instant d'une autre couleur. Même table, même ordre que « familleDe ». */
export const FAMILLE_BOOT = `(function(){try{var R=${JSON.stringify(REGLES)},A=${JSON.stringify(ACCENTS)},p=location.pathname,r=document.documentElement,f=null,i;function ok(g){var j,s,k;if(g.exact&&g.exact.indexOf(p)>-1)return true;if(!g.prefixes)return false;for(j=0;j<g.prefixes.length;j++)if(p.indexOf(g.prefixes[j])===0){s=g.sauf||[];for(k=0;k<s.length;k++)if(p===s[k]||p.indexOf(s[k]+"/")===0)return false;return true}return false}for(i=0;i<R.length&&f===null;i++)if(ok(R[i]))f=R[i].famille;if(f){r.setAttribute("data-famille",f);r.setAttribute("data-accent",A[f]||"or")}else{r.removeAttribute("data-famille");r.removeAttribute("data-accent")}}catch(e){}})();`;
