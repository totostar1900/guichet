/**
 * LE CODE D UNE LIGNE DU CRCT, SA FORME, ET CE QU ON S AUTORISE A EN REPARER.
 *
 * Ces regles vivent ici et nulle part ailleurs. Deux lecteurs qui jugent un
 * code chacun de son cote finissent par le juger differemment, et c est ainsi
 * qu une meme seance se retrouve sous deux clefs : la lecon de
 * `scripts/_journal.mjs`, apprise le 15 octobre 2026 sur les marques de
 * collision, puis le 16 sur les codes.
 *
 * ELLES COMPTENT DEPUIS QUE LA CLEF D UNE SEANCE EST (pays, date, code) :
 * un code mal lu ne fait plus une ligne de travers, il fait une SEANCE DE
 * PLUS (migration 0108).
 */

/**
 * DOUZE CARACTERES : deux lettres de pays, puis 1 pour le court terme suivi
 * de neuf chiffres, ou 2 pour le long terme suivi d UNE LETTRE de serie et
 * de huit chiffres.
 *
 * « CM2L00000028 » a la forme, « CM2100000028 » ne l a pas : c est ainsi
 * qu on sait laquelle de deux lectures a invente son caractere.
 */
/* Le suffixe de marche (« /MN1 ») fait partie du code publie et ne le
   disqualifie pas : « GA1200001210/NM1 » a la forme. */
export const canonique = (c: string | null | undefined): boolean => {
  const s = String(c ?? "")
    .toUpperCase()
    .replace(/\/[A-Z0-9]{1,4}$/, "");
  return /^[A-Z]{2}1\d{9}$/.test(s) || /^[A-Z]{2}2[A-Z]\d{8}$/.test(s);
};

/** Combien de caracteres separent deux chaines : insertion, suppression, echange. */
export function distance(a: string, b: string): number {
  const m = String(a).length;
  const n = String(b).length;
  if (Math.abs(m - n) > 2) return 9;
  const x = String(a);
  const y = String(b);
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
  }
  return d[m][n];
}

/**
 * Le code debarrasse de ce que le champ a avale autour de lui : espaces,
 * ponctuation, et le reste de la boite imprimee (« GA110000292 BTA-13
 * 23-OCTO-2026 »).
 *
 * ON NE COMPLETE NI NE TRONQUE. Un premier jet raccourcissait les codes de
 * treize caracteres par la droite : « CM2J000000063 » devenait
 * « CM2J00000006 », qui ne correspond a rien. Le caractere en trop est un
 * zero du remplissage, pas la fin du code.
 */
export function nettoyer(brut: string | null | undefined): string | null {
  const s = String(brut ?? "").toUpperCase();
  let acc = "";
  let suffixe = "";
  for (const mot of s.split(/\s+/).filter(Boolean)) {
    /* LA BARRE SEPARE LE CODE DE SON SUFFIXE DE MARCHE, elle ne se jette pas
       avec le reste de la ponctuation : l enlever collait « MN » au code et
       « CM1100001146/MN » devenait quatorze caracteres illisibles. */
    const [corps, suf] = mot.split("/");
    const nu = corps.replace(/[^A-Z0-9]/g, "");
    if ((acc + nu).length > 12) break;
    acc += nu;
    if (suf) {
      suffixe = `/${suf.replace(/[^A-Z0-9]/g, "")}`;
      break;
    }
  }
  return acc.length >= 10 ? acc + suffixe : s.trim() || null;
}

/**
 * LES CODES QUE L ADRESSE D UNE PIECE CONTIENT.
 *
 * La BEAC nomme ses fichiers avec le code de la ligne :
 * « Communiqué-des-résultats-BTA-13S-220726_GA1100002292.pdf ». C est un
 * SECOND TEMOIN, publie par la meme main que la piece, et il tranche ce
 * qu un scan a rendu de travers.
 */
export function codesDeLAdresse(url: string | null | undefined): string[] {
  const s = decodeURIComponent(String(url ?? "")).toUpperCase();
  return [...s.matchAll(/[A-Z]{2}[A-Z0-9]{10}/g)].map((m) => m[0]).filter(canonique);
}

/**
 * LES CONFUSIONS D UNE LECTURE DE SCAN, ET RIEN D AUTRE.
 *
 * Une table fermee : ce sont les seules substitutions qu on s autorise, et
 * elles s appliquent a toutes les occurrences a la fois. « GA1300000S7S »
 * devient « GA1300000575 », « GAZK00000041 » devient « GA2K00000041 ».
 */
const CONFUSIONS: [string, string][] = [
  ["O", "0"],
  ["Z", "2"],
  ["S", "5"],
  ["I", "1"],
  ["L", "1"],
  ["B", "8"],
];

/**
 * LA FORME DU CODE EST SI CONTRAINTE QU UNE SEULE CORRECTION Y MENE.
 *
 * Douze caracteres, le deuxieme valant 1 ou 2, le troisieme etant une lettre
 * si et seulement si le deuxieme vaut 2 : il y a peu de facons d y tomber par
 * hasard. On engendre donc toutes les corrections d UN pas (effacer un
 * caractere, ou appliquer une confusion de la table) et on ne retient que
 * celles qui rendent un code canonique.
 *
 * S IL Y EN A UNE SEULE, c est elle : l unicite est la preuve, et elle vaut
 * mieux qu une preference arbitraire. S il y en a plusieurs, on ne choisit
 * pas, on le dit.
 */
export function reparerParLaForme(brut: string | null | undefined): { code: string | null; candidats: string[] } {
  const s = String(brut ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!s || canonique(s)) return { code: null, candidats: [] };
  const essais = new Set<string>();
  /**
   * EFFACER, MAIS SEULEMENT DANS UNE SUITE DE CARACTERES IDENTIQUES.
   *
   * Une lecture de scan double un zero du remplissage ; elle n efface pas un
   * chiffre de la fin. Sans cette borne, « CG13000000045 » rendait quatre
   * codes canoniques (« CG1300000045 », mais aussi « CG1300000005 » et
   * « CG1300000004 », obtenus en jetant le 4 ou le 5), et l unicite qui sert
   * de preuve disparaissait.
   */
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== s[i - 1] && s[i] !== s[i + 1]) continue;
    essais.add(s.slice(0, i) + s.slice(i + 1));
  }
  /* Appliquer une confusion, puis les deux ensemble s il le faut. */
  for (const [de, vers] of CONFUSIONS) {
    const un = s.split(de).join(vers);
    essais.add(un);
    for (let i = 0; i < un.length; i++) {
      if (un[i] !== un[i - 1] && un[i] !== un[i + 1]) continue;
      essais.add(un.slice(0, i) + un.slice(i + 1));
    }
    for (const [de2, vers2] of CONFUSIONS) if (de2 !== de) essais.add(un.split(de2).join(vers2));
  }
  const bons = [...essais].filter(canonique);
  return { code: bons.length === 1 ? bons[0] : null, candidats: bons };
}
