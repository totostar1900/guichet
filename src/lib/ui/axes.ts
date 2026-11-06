import { GRAPHE_CAR } from "./graphe";

/**
 * LES GRADUATIONS D'UN AXE : des valeurs rondes, en nombre voulu, qui encadrent la série (9 novembre 2026).
 *
 * `ticksPropres(0, 621, 3)` rend [0, 400, 800] : le pas est un 1, 2 ou 5 fois une puissance de dix, et la dernière graduation couvre le maximum.
 * `bornesPropres` rend les bornes d'un axe dont le minimum n'est pas zéro (un cours) : elles encadrent aussi la série.
 */
export function pasPropre(etendue: number, n: number): number {
  if (!(etendue > 0)) return 1;
  const brut = etendue / Math.max(1, n - 1);
  /* LA PUISSANCE DE DIX SE LIT DANS L'ÉCRITURE DÉCIMALE, PAS DANS « Math.pow » NI « Math.log10 » (6 novembre 2026) : ces deux-là ne rendent pas les mêmes derniers chiffres dans Node
     et dans le navigateur, le pas et le nombre de graduations différaient entre le serveur et le client (erreur React #418 sur le rendement de REG). « toExponential » et
     « Number("1e-3") » sont exacts, partout pareils. */
  const p = Number(`1e${brut.toExponential().split("e")[1]}`);
  const f = brut / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

export function ticksPropres(min: number, max: number, n = 3): number[] {
  if (max <= min) return [min];
  const pas = pasPropre(max - min, n);
  const debut = Math.floor(min / pas) * pas;
  const out: number[] = [];
  /* Chaque graduation est calculée depuis la première (k × pas), jamais en additionnant : l'addition cumule des erreurs d'arrondi et le dernier repère pouvait changer. */
  for (let k = 0; ; k++) {
    const v = debut + k * pas;
    out.push(Math.round(v * 1e6) / 1e6);
    if (v >= max || k > 1000) break;
  }
  return out;
}

/**
 * LE MOIS D'UN AXE DE TEMPS, AVEC SON ANNÉE QUAND ELLE CHANGE (9 novembre 2026).
 *
 * « juil. », « août », « sept. » sans année ne disent pas de quelle année on parle. L'étiquette porte l'année au premier repère et à chaque janvier : « juil. 2025 »,
 * « août », « sept. », … « janv. 2026 ». Les autres mois restent courts, pour que douze repères tiennent sur un téléphone.
 */
export function motDeMois(iso: string, avecAnnee: boolean): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", avecAnnee ? { month: "short", year: "numeric" } : { month: "short" });
}

/**
 * LES REPÈRES D'UN AXE QUI NE SE SUPERPOSENT PAS (9 novembre 2026).
 *
 * Douze mois, quarante-quatre mois sur « max » : tous ne tiennent pas sous le dessin. Cette fonction dit lesquels écrire. Un repère centré en `x` occupe
 * `largeur(texte)` pixels ; on en garde autant que possible SANS QUE DEUX SE TOUCHENT (une marge entre eux), dans cet ordre de priorité : le premier, le dernier, ceux qui
 * portent une année (« janv. 2026 »), puis les autres. La largeur d'un caractère est une estimation (`px`, `GRAPHE_CAR` : 5,8 pour du 10 px) : mieux vaut en perdre un que le lire
 * collé à son voisin.
 */
export function reperesSansChevauchement(xs: number[], etiquettes: string[], px = GRAPHE_CAR, marge = 6): boolean[] {
  const n = xs.length;
  const garde = new Array<boolean>(n).fill(false);
  if (n === 0) return garde;
  const demi = (i: number) => (etiquettes[i].length * px) / 2;
  const libre = (i: number) => garde.every((g, j) => !g || Math.abs(xs[i] - xs[j]) >= demi(i) + demi(j) + marge);
  const annee = (i: number) => /\d{4}/.test(etiquettes[i]);
  const ordre = [0, n - 1, ...Array.from({ length: n }, (_, i) => i).filter((i) => i !== 0 && i !== n - 1 && annee(i)), ...Array.from({ length: n }, (_, i) => i).filter((i) => i !== 0 && i !== n - 1 && !annee(i))];
  for (const i of ordre) if (etiquettes[i] !== "" && libre(i)) garde[i] = true;
  return garde;
}
