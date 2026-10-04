import { fold } from "@/lib/text";

/**
 * LE NOM COURT D'UN GROUPE : CE QUI LE DISTINGUE, ET RIEN D'AUTRE.
 *
 * Mesuré le 4 octobre 2026 sur les treize sociétés de gestion de la cote :
 * onze finissent par « Asset Management ». Le suffixe ne distingue personne
 * et occupait 60 % de la bande des groupes — « Societe Generale Capital Asset
 * Management Central Africa » faisait 351 px à lui seul, 85 % de la largeur
 * d'un téléphone.
 *
 * DEUX RÈGLES, ET ELLES SE MESURENT.
 *
 *  1. UN MOT PRÉSENT DANS LA MOITIÉ DES NOMS NE DISTINGUE RIEN : il part.
 *     C'est une règle sur la liste reçue, pas un vocabulaire écrit d'avance :
 *     « Asset » et « Management » tombent chez les sociétés de gestion (11
 *     sur 13), et rien ne tombe chez les dépositaires, où « Cameroun » n'est
 *     que dans cinq noms sur treize. Un vocabulaire figé aurait charcuté le
 *     jour où une maison s'appelle autrement.
 *  2. DEUX MOTS SUFFISENT À DISTINGUER TREIZE MAISONS. On garde les deux
 *     premiers — sauf si l'on couperait juste après un mot-outil, « Crédit du
 *     | Congo » étant un nom estropié et non un nom court.
 *
 * ET LA GARANTIE, QUI EST LA SEULE QUI COMPTE : si deux noms courts se
 * ressemblaient, les deux reprennent leur nom entier. Mieux vaut une pastille
 * large qu'une pastille qui désigne deux groupes. Les trois orthographes
 * d'UBA au Bulletin — « UBA CAMEROUN », « UBA BANK CAMEROUN », « UBA
 * CAMEROON » — restent donc distinctes.
 *
 * Le nom entier n'est jamais perdu : il reste en infobulle et dans le nom
 * accessible de la commande.
 */
const OUTILS = new Set(["du", "de", "des", "la", "le", "les", "d", "l", "et", "of", "and", "the"]);

export function nomsCourts(noms: string[]): Map<string, string> {
  const uniques = [...new Set(noms)];
  const out = new Map<string, string>();
  /* Sous quatre noms, il n'y a rien à dégraisser : « Monétaire · Obligataire
     · Diversifié · Actions » tient déjà, et raccourcir y ferait perdre sans
     rien gagner. */
  if (uniques.length < 4) {
    for (const n of uniques) out.set(n, n);
    return out;
  }

  const mots = uniques.map((n) => n.split(/\s+/).filter(Boolean));
  const compte = new Map<string, number>();
  for (const m of mots) for (const mot of new Set(m.map(fold))) compte.set(mot, (compte.get(mot) ?? 0) + 1);
  const commun = (mot: string) => (compte.get(fold(mot)) ?? 0) * 2 >= uniques.length;

  const outil = (mot: string) => OUTILS.has(fold(mot).replace(/[^a-z]/g, ""));
  const court = (m: string[]): string => {
    let reste = m.filter((mot) => !commun(mot));
    /* CE QUI RESTE DOIT ÊTRE UN NOM, PAS UN MORCEAU DE PHRASE. Les Trésors
       de la zone l'ont montré : « État » est dans les quatre noms, donc
       commun, et le retirer laissait « du Cameroun », « de Guinée
       équatoriale », « centrafricain ». Deux règles réparent les trois.
       On jette les mots-outils de tête — « du Cameroun » devient
       « Cameroun » — et si le reste commence par une minuscule, c'est un
       adjectif accroché à ce qu'on vient d'enlever : « centrafricain » ne
       se tient pas seul, « État centrafricain » si. */
    while (reste.length > 1 && outil(reste[0])) reste = reste.slice(1);
    if (reste.length === 0 || /^\p{Ll}/u.test(reste[0])) return m.join(" ");
    const pris: string[] = [];
    for (const mot of reste) {
      pris.push(mot);
      // On s'arrête à deux mots, mais jamais juste après un mot-outil.
      if (pris.length >= 2 && !outil(pris[pris.length - 1])) break;
    }
    return pris.join(" ");
  };

  const propose = uniques.map((n, i) => [n, court(mots[i])] as const);
  const collisions = new Set(propose.filter(([, c], i) => propose.some(([, autre], j) => i !== j && fold(autre) === fold(c))).map(([, c]) => fold(c)));
  for (const [entier, bref] of propose) out.set(entier, collisions.has(fold(bref)) ? entier : bref);
  return out;
}
