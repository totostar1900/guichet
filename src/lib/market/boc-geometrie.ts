import type { BocBond, BocParsed } from "./boc-parse";
import { isoDate, num, type Carnet } from "./boc-parse";

/**
 * LIRE LE BULLETIN PAR SA GÉOMÉTRIE, et non par son texte aplati.
 *
 * LE CONSTAT QUI A OUVERT CE FICHIER. Le 22 décembre 2023, la ligne BANGE
 * sort du lecteur avec une ouverture à 207 110 207 110 227 821 186. Ce n'est
 * ni une coquille de la bourse, ni un défaut de numérisation : le texte
 * aplati dit « 207 110  207 110  227 821  186 399 », et un montant à
 * séparateurs d'espace est alors INDISCERNABLE de quatre montants collés. Il
 * y a huit découpes possibles et le texte n'en désigne aucune ; le moteur
 * d'expressions régulières prend la première qui fait tenir la ligne.
 *
 * LA MESURE QUI A DÉCIDÉ DE CE FICHIER. Sur les 808 séances, la remarque la
 * plus fréquente de loin est « Obligation : ligne de cours non reconnue » :
 * 650 lignes perdues sur 141 séances, devant « prix / nominal ambigus »
 * (78 sur 66). Les actions, elles, ne coûtent que 7 remarques sur 2 séances.
 * Le gros du dégât est donc ici, et il a une seule cause.
 *
 * CE QUE LA GÉOMÉTRIE REND. pdf.js donne chaque fragment imprimé avec son
 * abscisse et sa largeur. Trois choses s'ensuivent, qu'aucune expression
 * régulière ne pouvait obtenir du texte aplati :
 *
 *  1. UN SÉPARATEUR DE MILLIERS NE SORT JAMAIS DE SA CELLULE. « 1 012 536 »
 *     est un fragment ; « 2 475,00 » et « 2 500,000 » en sont deux. La
 *     découpe cesse d'être devinée là où elle était impossible.
 *
 *  2. UNE RANGÉE SE RECONNAÎT À SON ORDONNÉE. Le texte aplati coupe une même
 *     rangée en deux ou trois lignes selon que le titre tient sur une ligne,
 *     et le lecteur compensait par une fenêtre glissante de quatre lignes
 *     qu'il fallait allonger à chaque mise en page nouvelle. Deux fragments
 *     à un point d'écart sont sur la même rangée, point final.
 *
 *  3. UNE COLONNE SE RECONNAÎT À SON BORD DROIT. Les nombres sont alignés à
 *     droite, et le bord se retrouve d'une rangée à l'autre. Les rangées
 *     saines enseignent donc la grille, et la grille tranche les rangées
 *     abîmées : c'est la séance qui s'explique elle-même.
 *
 * CE QUI RESTE FUSIONNÉ, ET POURQUOI CE N'EST PLUS GRAVE. Le PDF lui-même
 * imprime parfois deux cellules en un seul fragment (« 9 500,00 10 000,000 »,
 * « 0 NC »). Vérifié : ce n'est pas pdf.js qui les colle, disableCombine n'y
 * change rien. Mais la grille dit combien de valeurs doivent sortir du
 * fragment et où tombe chaque bord, donc la découpe se décide au lieu de se
 * deviner, et une découpe qui ne tombe pas juste se signale.
 *
 * CE FICHIER NE REMPLACE RIEN. Il vient APRÈS le lecteur habituel et ne
 * s'occupe que des lignes que celui-ci a laissées tomber : il ajoute, il ne
 * retire jamais. Une séance ne peut donc pas être dégradée par cette lecture,
 * seulement complétée, et le carnet dit laquelle des deux a trouvé la ligne.
 */

export interface Cellule {
  texte: string;
  x: number;
  largeur: number;
  /**
   * Vraie quand cette cellule sort d'une coupure, et non du PDF.
   *
   * C'est ce qui décide si l'identité prix / nominal doit être exigée : une
   * valeur imprimée telle quelle se croit sur parole, une valeur obtenue en
   * coupant doit se justifier. Sans cette marque, « 2 500 » coupé en « 2 » et
   * « 500 » par un bord de colonne passait pour deux valeurs imprimées.
   */
  coupee?: boolean;
}

export interface Rangee {
  page: number;
  y: number;
  cellules: Cellule[];
}

/**
 * Deux fragments à moins de 2,5 points l'un de l'autre sont sur la même
 * rangée. Mesuré sur le bulletin 1914 : à l'intérieur d'une rangée les
 * ordonnées diffèrent d'un point au plus (392 et 391,5), d'une rangée à la
 * suivante d'au moins quatorze.
 */
const MEME_RANGEE = 2.5;

/** Deux bords droits à moins de 3 points sont la même colonne. */
const MEME_COLONNE = 3;

const bord = (c: Cellule) => c.x + c.largeur;

/* ---------------- Lecture du PDF ---------------- */

/**
 * Les rangées du document, fragments blancs écartés.
 *
 * Les fragments d'espacement portent une largeur aberrante (jusqu'à 1 789
 * points pour une espace) : les garder fausserait toute mesure de bord. Ils
 * ne portent aucun texte, donc rien n'est perdu à les écarter.
 */
export async function rangeesDuPdf(bytes: Uint8Array): Promise<Rangee[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  /* PDF.JS PREND LA PROPRIÉTÉ DU TAMPON QU'ON LUI DONNE et le détache. Un
     second appel sur le même tableau lit donc du vide, en silence : c'est ce
     qui a rendu un balayage entier à zéro ligne rattrapée alors que le
     lecteur fonctionnait. On lui passe une copie, et l'appelant garde le
     sien, notamment pour l'archiver. */
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableFontFace: true, useSystemFonts: false, isEvalSupported: false }).promise;
  const out: Rangee[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const contenu = await page.getTextContent();
    const brut: { y: number; cellule: Cellule }[] = [];
    for (const item of contenu.items as { str: string; width: number; transform: number[] }[]) {
      if (!item.str.trim()) continue;
      brut.push({ y: item.transform[5], cellule: { texte: item.str.trim(), x: item.transform[4], largeur: item.width } });
    }
    brut.sort((a, b) => b.y - a.y);
    let courante: Rangee | undefined;
    for (const { y, cellule } of brut) {
      if (!courante || Math.abs(courante.y - y) > MEME_RANGEE) {
        courante = { page: p, y, cellules: [] };
        out.push(courante);
      }
      courante.cellules.push(cellule);
    }
  }
  for (const r of out) r.cellules.sort((a, b) => a.x - b.x);
  return out;
}

/* ---------------- La grille ---------------- */

/**
 * Une cellule dont le bord droit enseigne une colonne.
 *
 * SEULS LES NOMBRES SONT ALIGNÉS À DROITE, et c'est tout l'intérêt du bord.
 * Un nom d'émetteur est aligné à gauche : son bord droit ne dit rien de la
 * mise en page, il dit seulement la longueur du nom. Mesuré : « ETAT DU
 * GABON » revient trois fois dans la même section, donc trois bords
 * identiques, donc une fausse colonne à 219 points, qui coupait ensuite
 * « 2 475,00 » en « 2 » et « 475,00 ».
 */
const CHIFFREE = /^[-\d][\d\s,./%]*$/;

/**
 * Les bords droits qui reviennent d'une rangée à l'autre.
 *
 * Un bord vu une seule fois n'est pas une colonne : c'est un titre, une note
 * de bas de page, ou justement un fragment fusionné. Le seuil le tient à
 * l'écart sans exiger que toutes les rangées soient saines, ce qui est la
 * condition même de l'exercice : la grille s'apprend sur les rangées saines
 * pour réparer les autres.
 */
export function colonnes(rangees: Rangee[], minimum = 4): number[] {
  const bords = rangees
    .flatMap((r) => r.cellules)
    .filter((c) => CHIFFREE.test(c.texte))
    .map(bord)
    .sort((a, b) => a - b);
  const groupes: number[][] = [];
  for (const b of bords) {
    const dernier = groupes[groupes.length - 1];
    if (dernier && b - dernier[dernier.length - 1] <= MEME_COLONNE) dernier.push(b);
    else groupes.push([b]);
  }
  return groupes.filter((g) => g.length >= minimum).map((g) => g.reduce((s, v) => s + v, 0) / g.length);
}

/* ---------------- Le découpage d'un fragment fusionné ---------------- */

/**
 * UN NOMBRE NE COMMENCE PAS PAR DES ZÉROS, et cette règle a rattrapé une
 * vraie régression. Sans elle, « 10 000,000 » pouvait se couper en « 10 » et
 * « 000,000 » : les deux morceaux passaient pour des montants, la rangée
 * paraissait ensuite entière, et le nominal restant d'une obligation tombait
 * de dix mille à dix. Mesuré le 6 octobre 2026 sur les séances de novembre
 * 2024, par le contrôle de non-régression contre la lecture aplatie.
 *
 * Les groupes de milliers restent facultatifs : les bulletins anciens
 * impriment « 10000 » et « 787391 » sans séparateur, et l'exiger perdait
 * toute la section des régionales, qui est justement imprimée ainsi.
 */
const TETE = "(?:0|[1-9]\\d*)";
const MONTANT = new RegExp(`^-?${TETE}(?: \\d{3})*(?:,\\d{1,3})?$`);
const POURCENT = new RegExp(`^-?${TETE}(?: \\d{3})*(?:,\\d{1,3})?%$`);

/** Ce qu'une cellule peut contenir : un montant, un pourcentage, une date, un statut. */
const JETON = new RegExp(`^(?:-|-?${TETE}(?: \\d{3})*(?:,\\d{1,3})?%?|\\d{2}/\\d{2}/\\d{4}|[A-Z]{1,3}[a-z]?)$`);

/**
 * Une frontière que la grammaire seule tranche : un chiffre, une espace, une
 * lettre. Un séparateur de milliers ne précède jamais des lettres et n'en
 * suit jamais, donc « 0 NC » se coupe sans rien mesurer.
 *
 * C'EST LE SEUL CAS OÙ LA GÉOMÉTRIE NE PEUT PAS AIDER, et il fallait le
 * prévoir : la colonne Statut n'est JAMAIS imprimée seule dans ce bulletin,
 * elle sort toujours collée au nombre de transactions. Son bord droit n'est
 * donc enseigné par aucune rangée, et une grille apprise ne peut pas montrer
 * une colonne qu'elle n'a jamais vue.
 */
const FRONTIERE = new RegExp(`^(-?${TETE}(?: \\d{3})*(?:,\\d{1,3})?%?) ([A-Z]{1,3}[a-z]?)$`);

/**
 * Séparer un fragment qui porte plusieurs cellules.
 *
 * DEUX ÉTAGES. D'abord la grammaire, pour les frontières qu'aucune mesure
 * n'est nécessaire à trancher. Ensuite la grille, pour les autres : un bord
 * de colonne qui tombe à l'intérieur du fragment annonce une cellule de plus.
 * On énumère alors les découpes aux espaces dont chaque morceau est un jeton
 * valide, et on garde celle dont les bords estimés collent le mieux à ceux
 * de la grille. L'estimation suppose une avance régulière par caractère, ce
 * qui suffit largement : les espaces candidates sont distantes de plusieurs
 * caractères, jamais d'un demi-point.
 *
 * Quand aucune découpe ne tient, le fragment est rendu tel quel : la rangée
 * sera refusée plus haut, avec son texte, plutôt que coupée au hasard.
 */
export function separer(c: Cellule, grille: number[]): Cellule[] {
  const f = c.texte.match(FRONTIERE);
  if (f) {
    const parCaractere = c.largeur / c.texte.length;
    /* Cette coupure-là n'invente rien : chiffres d'un côté, lettres de
       l'autre, aucune mesure n'est en jeu. Elle ne marque donc pas le
       nombre comme suspect. */
    const nombre: Cellule = { texte: f[1], x: c.x, largeur: parCaractere * f[1].length, coupee: c.coupee };
    const statut: Cellule = { texte: f[2], x: c.x + parCaractere * (f[1].length + 1), largeur: parCaractere * f[2].length };
    return [...separer(nombre, grille), statut];
  }
  const dedans = grille.filter((g) => g > c.x + 1 && g < bord(c) - 1);
  if (dedans.length === 0 || !c.texte.includes(" ")) return [c];

  const espaces: number[] = [];
  for (let i = 0; i < c.texte.length; i++) if (c.texte[i] === " ") espaces.push(i);
  const parCaractere = c.largeur / c.texte.length;
  const bordEstime = (fin: number) => c.x + parCaractere * fin;

  let meilleur: { coupures: number[]; ecart: number } | undefined;
  const essayer = (coupures: number[], depuis: number, reste: number) => {
    if (reste === 0) {
      const morceaux = decouper(c.texte, coupures);
      if (!morceaux.every((m) => JETON.test(m))) return;
      /* Chaque coupure doit tomber sur le bord qu'elle est censée porter. */
      let ecart = 0;
      let fin = 0;
      for (let k = 0; k < coupures.length; k++) {
        fin += morceaux[k].length + (k ? 1 : 0);
        ecart += Math.abs(bordEstime(coupures[k]) - dedans[k]);
      }
      if (!meilleur || ecart < meilleur.ecart) meilleur = { coupures: [...coupures], ecart };
      return;
    }
    for (let i = depuis; i < espaces.length; i++) essayer([...coupures, espaces[i]], i + 1, reste - 1);
  };
  essayer([], 0, dedans.length);
  if (!meilleur) return [c];

  const morceaux = decouper(c.texte, meilleur.coupures);
  const out: Cellule[] = [];
  let debut = 0;
  for (const m of morceaux) {
    out.push({ texte: m, x: c.x + parCaractere * debut, largeur: parCaractere * m.length, coupee: true });
    debut += m.length + 1;
  }
  return out;
}

const decouper = (texte: string, coupures: number[]): string[] => {
  const out: string[] = [];
  let debut = 0;
  for (const i of coupures) {
    out.push(texte.slice(debut, i));
    debut = i + 1;
  }
  out.push(texte.slice(debut));
  return out;
};

/** Une rangée dont chaque fragment fusionné a été rendu à ses colonnes. */
export const rangeeSeparee = (r: Rangee, grille: number[]): Cellule[] => r.cellules.flatMap((c) => separer(c, grille));

/* ---------------- Les obligations ---------------- */

const ISIN = /^[A-Z]{2}\d{10}$/;
const DATE = /^\d{2}\/\d{2}\/\d{4}$/;
const STATUT = /^[A-Z]{1,3}[a-z]?$/;

interface Valeurs {
  pct: number;
  prix: number;
  nominal: number;
  couru: number;
  ouverture: number;
  cloture: number;
  haut: number;
  bas: number;
  variation: number;
  reference: number;
}

/**
 * Toutes les façons de rendre ses cellules à un fragment resté fusionné.
 *
 * Chaque cellule qui porte une espace peut être un montant unique ou deux
 * montants collés. On rend la liste des lectures possibles, la plus simple
 * d'abord : si la rangée se lit sans rien couper, on n'aura rien coupé.
 */
function lectures(cellules: string[]): string[][] {
  let out: string[][] = [[]];
  for (const c of cellules) {
    const variantes: string[][] = MONTANT.test(c) || POURCENT.test(c) ? [[c]] : [];
    for (let i = 0; i < c.length; i++) {
      if (c[i] !== " ") continue;
      const g = c.slice(0, i);
      const d = c.slice(i + 1);
      if ((MONTANT.test(g) || POURCENT.test(g)) && (MONTANT.test(d) || POURCENT.test(d))) variantes.push([g, d]);
    }
    if (variantes.length === 0) continue; // ni montant ni paire de montants : ce n'est pas une valeur
    out = out.flatMap((debut) => variantes.map((v) => [...debut, ...v]));
    if (out.length > 256) out = out.slice(0, 256); // garde-fou : une rangée pathologique ne doit pas exploser
  }
  return out;
}

/**
 * Les dix valeurs utiles d'une rangée, si une découpe les accorde.
 *
 * LA LIGNE SE VALIDE ELLE-MÊME, et c'est ce qui autorise à chercher. Deux
 * égalités tiennent par construction dans ce bulletin : le prix en francs
 * vaut le pourcentage du nominal, et les seuils encadrent le cours précédent
 * de six pour cent (mesuré : 106,00 et 94,00 pour un précédent à 100). Une
 * découpe fausse les dément presque toujours, donc la première qui les
 * satisfait est la bonne, et quand aucune ne les satisfait la rangée est
 * refusée avec son texte plutôt que lue de travers.
 */
export function lireValeurs(avant: string[], apres: string[], exigerIdentite = false): Valeurs | undefined {
  for (const a of lectures(avant)) {
    if (a.length < 4) continue;
    const pct = num(a[0]);
    const prix = num(a[1]);
    const nominal = num(a[2]);
    if (!(nominal > 0) || !(pct > 0)) continue;
    /* L'IDENTITÉ DÉPARTAGE UNE DÉCOUPE, ELLE N'AUTORISE PAS UNE LECTURE, et
       cette nuance a coûté vingt-et-une séances.
       Elle ne tient pas pour une ligne AMORTISSABLE : le 5 décembre 2024, la
       BDEAC 5,6 % cote 100,00 % pour un cours de 10 000 francs et un nominal
       restant de 8 000, parce que le cours reste rapporté au nominal
       d'origine. Exiger l'égalité refusait donc ces lignes alors qu'elles
       étaient lues parfaitement, et c'est aussi ce qui fait échouer le
       lecteur aplati sur elles (« prix / nominal ambigus », 78 remarques sur
       66 séances : il ne trouve aucune découpe qui la satisfasse).
       ELLE EST DONC EXIGÉE EXACTEMENT QUAND UNE COUPURE A PU INVENTER LES
       NOMBRES, et pas autrement. Une valeur imprimée telle quelle se croit
       sur parole ; une valeur obtenue en coupant doit se justifier. Sans
       cette distinction, « 2 500 » coupé en « 2 » et « 500 » par un bord de
       colonne passait pour deux valeurs imprimées, et le 7 août 2024 un
       nominal de 2 500 devenait 500 : mesuré par la comparaison avec la
       lecture aplatie, jamais par un test écrit à la main. */
    if ((exigerIdentite || a.length !== avant.length) && Math.abs(prix - (pct * nominal) / 100) > 1.5) continue;
    for (const b of lectures(apres)) {
      if (b.length < 6) continue;
      const [ouverture, cloture, haut, bas, variation, reference] = b.slice(-6).map(num);
      if (Math.abs(haut - pct * 1.06) > 0.05 || Math.abs(bas - pct * 0.94) > 0.05) continue;
      if (!Number.isFinite(variation) || !Number.isFinite(reference)) continue;
      return { pct, prix, nominal, couru: num(a[3]), ouverture, cloture, haut, bas, variation, reference };
    }
  }
  return undefined;
}

/**
 * Les obligations d'une séance, lues sur la grille.
 *
 * UNE RANGÉE PORTE TOUT : émetteur, titre, ISIN, mnémonique, puis la date et
 * les dix-sept valeurs. Les ancres sont des formes, pas des rangs : l'ISIN,
 * la date, le statut. Entre la date et le statut viennent neuf valeurs
 * (pourcentage, prix, nominal, coupon couru, cinq volumes) ; après le statut,
 * six (ouverture, clôture, seuil haut, seuil bas, variation, référence).
 *
 * TROIS VÉRIFICATIONS AVANT D'ACCEPTER, parce que cette lecture AJOUTE des
 * lignes à une séance et qu'une ligne fausse serait pire que l'absence :
 * le prix doit valoir le pourcentage du nominal, les seuils doivent encadrer
 * le cours précédent de six pour cent, et l'ISIN doit être neuf.
 */
export function obligationsGeometriques(rangees: Rangee[], carnet?: Carnet): BocBond[] {
  const titre = (r: Rangee, motif: RegExp) => r.cellules.some((c) => motif.test(c.texte));
  const debut = rangees.findIndex((r) => titre(r, /^MARCHE DES OBLIGATIONS/));
  if (debut < 0) return [];
  /* LA FIN SE CHERCHE SUR TOUTE LA RANGÉE, pas sur sa première cellule : un
     titre voisine parfois avec un numéro de page, et la chercher au seul
     premier rang laissait la section courir jusqu'au bout des vingt-et-une
     pages. La grille apprenait alors sur des tableaux étrangers. */
  const finCap = rangees.findIndex((r, i) => i > debut && titre(r, /^(CAPITALISATION BOURSIERE|MARCHE DES OPCVM)/i));
  const section = rangees.slice(debut, finCap > debut ? finCap : undefined);

  /* LA GRILLE S'APPREND PAGE PAR PAGE, et c'est une correction mesurée :
     apprise sur toute la section, elle mêlait les états, les régionales et
     les privées, dont les colonnes ne tombent pas au même endroit, et
     quarante-neuf bords sortaient là où une page en a quinze. Chaque
     millésime du bulletin a par ailleurs la sienne, donc rien n'est figé. */
  const parPage = new Map<number, number[]>();
  for (const p of new Set(section.map((r) => r.page))) parPage.set(p, colonnes(section.filter((r) => r.page === p)));

  const out: BocBond[] = [];
  const vus = new Set<string>();

  for (const [i, r] of section.entries()) {
    const grille = parPage.get(r.page) ?? [];
    const cellules = rangeeSeparee(r, grille);
    const cells = cellules.map((c) => c.texte);
    /* LA QUEUE QUI A DÉBORDÉ. Le 2 mai 2024, la ligne BDEAC se termine par
       « 0,00% | 8 000,00 » posés 2,6 points plus bas, donc sur une rangée à
       eux. Élargir la tolérance générale aurait été tentant et imprudent :
       les lignes d'en-tête de ce même bulletin ne sont séparées que de 4,4
       points. On reconnaît plutôt la suite à ce qu'elle est : juste en
       dessous, rien que des valeurs, ni ISIN ni date. Quinze séances en
       dépendaient. */
    const suite = section[i + 1];
    if (suite && suite.page === r.page && r.y - suite.y < 6) {
      const qc = rangeeSeparee(suite, grille);
      const q = qc.map((c) => c.texte);
      if (q.length <= 3 && q.every((c) => MONTANT.test(c) || POURCENT.test(c))) {
        cells.push(...q);
        cellules.push(...qc);
      }
    }
    const iIsin = cells.findIndex((c) => ISIN.test(c));
    if (iIsin < 0) continue;
    const isin = cells[iIsin];
    if (vus.has(isin)) continue;

    /* UNE RANGÉE QUI PORTE UN ISIN ET UNE DATE EST UNE LIGNE DE COURS : si
       elle ne se lit pas, elle se dit. C'est la leçon des pannes muettes,
       et c'est exactement ce que la lecture aplatie n'a pas fait ici, où
       elle a perdu onze obligations sans une seule remarque. */
    const iDate = cells.findIndex((c, k) => k > iIsin && DATE.test(c));
    if (iDate < 0) continue;
    const refuser = (pourquoi: string) => carnet?.sur(`Obligation ${isin} : ${pourquoi}`, cells.join(" | "), "date, pourcentage, prix, nominal, coupon couru, cinq volumes, statut, puis six valeurs");

    const iStatut = cells.findIndex((c, k) => k > iDate && STATUT.test(c) && !ISIN.test(c));
    if (iStatut < 0) {
      refuser("aucun statut sur la rangée.");
      continue;
    }

    /* L'ARITHMÉTIQUE DE LA LIGNE CHOISIT LA DÉCOUPE, quand la grille n'a pas
       pu. Une colonne qui n'est JAMAIS imprimée seule ne s'apprend pas : sur
       cette page, « cours en francs » et « nominal » sortent collés dans dix
       rangées sur onze, donc une seule rangée enseigne leur frontière, ce qui
       ne suffit pas à en faire une colonne. On énumère alors les découpes
       possibles et on garde celle que la ligne elle-même valide : le prix
       vaut le pourcentage du nominal, et les seuils encadrent le cours
       précédent de six pour cent. Une découpe fausse ne peut pas satisfaire
       les deux, donc la recherche ne devine pas, elle vérifie. */
    /* Si une seule des valeurs d'avant le statut sort d'une coupure, toute la
       rangée doit se justifier par l'identité : c'est là que vivent le prix
       et le nominal. */
    const coupe = cellules.slice(iDate + 1, iStatut).some((c) => c.coupee);
    const lu = lireValeurs(cells.slice(iDate + 1, iStatut), cells.slice(iStatut + 1), coupe);
    if (!lu) {
      refuser(`aucune découpe de la rangée n'accorde le prix, le nominal et la bande de six pour cent (${cells.length} cellules).`);
      continue;
    }
    const { pct, prix, nominal, couru, ouverture, cloture, haut, bas, variation, reference } = lu;

    const avantIsin = cells.slice(0, iIsin).filter((c) => !/^[\d\s,.%-]+$/.test(c));
    const mnemo = cells.slice(iIsin + 1, iDate).find((c) => /^[A-Z][A-Z0-9]{3,5}$/.test(c)) ?? "";
    vus.add(isin);
    out.push({
      isin,
      mnemo,
      issuer: avantIsin[0] ?? "",
      designation: avantIsin.slice(1).join(" ") || (avantIsin[0] ?? ""),
      segment: /^ETAT|^REPUBLIQUE/i.test(avantIsin[0] ?? "") ? "etats" : /BDEAC|BEAC|CEMAC/i.test(avantIsin.join(" ")) ? "regionales" : "privees",
      previousDate: isoDate(cells[iDate]),
      previousPct: pct,
      previousFcfa: prix,
      nominalRemaining: nominal,
      accruedCoupon: couru,
      status: cells[iStatut],
      open: ouverture,
      close: cloture,
      thresholdHigh: haut,
      thresholdLow: bas,
      variationPct: variation,
      referenceNextFcfa: reference,
    });
  }
  return out;
}

/* ---------------- Le rattrapage ---------------- */

/** Les remarques que la lecture géométrique peut rendre caduques. */
const PERDUE = /^Obligation ([A-Z]{2}\d{10}) : (ligne de cours non reconnue|prix \/ nominal ambigus|cellules incomplètes)/;

/**
 * COMPLÉTER UNE SÉANCE, JAMAIS LA REFAIRE.
 *
 * MESURÉ SUR DOUZE SÉANCES PRISES DANS LES CENT QUARANTE-ET-UNE qui perdent
 * des obligations, le 6 octobre 2026 : la lecture géométrique en gagne 56 et
 * en manque 53 que la lecture aplatie, elle, sait lire. Aucun des deux ne
 * domine l'autre, et c'est le fait qui décide de tout ce qui suit.
 *
 * Les mises en page de 2023 au premier semestre lui échappent encore (le
 * statut n'y tombe pas là où elle le cherche) ; celles de novembre 2023 à
 * mai 2024, où l'aplatie perd presque tout, lui rendent dix à treize lignes
 * par séance. D'où la règle : on prend l'union, l'aplatie l'emporte en cas
 * de doublon, et une séance ne peut donc jamais régresser.
 *
 * LE SECOND FAIT QUI AUTORISE CELA : sur les lignes que les deux lecteurs
 * ont lues, ZÉRO désaccord sur le pourcentage, le prix, le nominal, la
 * clôture, le seuil haut et la référence. Les deux chemins arrivent au même
 * nombre, ce qui est la meilleure garantie qu'on pouvait demander avant
 * d'ajouter des lignes à une séance.
 *
 * UNE REMARQUE RÉSOLUE S'EFFACE. « Obligation X : ligne de cours non
 * reconnue » cesse d'être vraie dès que X est lue : la laisser garderait la
 * séance en « partiel » pour un défaut réparé, et la file de relecture
 * repasserait éternellement sur des séances entières.
 *
 * @returns les ISIN rattrapés, pour que l'appelant puisse le dire.
 */
export async function completerObligations(parsed: BocParsed, bytes: Uint8Array): Promise<string[]> {
  const manquantes = new Set(parsed.warnings.map((w) => w.match(PERDUE)?.[1]).filter((x): x is string => !!x));
  if (manquantes.size === 0) return [];

  let geo: BocBond[];
  try {
    geo = obligationsGeometriques(await rangeesDuPdf(bytes));
  } catch (e) {
    /* Un échec se dit : une lecture de secours muette serait pire que pas de
       lecture de secours du tout, puisque personne ne saurait qu'elle a
       renoncé. */
    const message = `Lecture géométrique impossible : ${(e as Error).message}`;
    parsed.warnings.push(message);
    parsed.notes.push({ message });
    return [];
  }

  const deja = new Set(parsed.bonds.map((b) => b.isin));
  const rattrapees = geo.filter((b) => !deja.has(b.isin) && manquantes.has(b.isin));
  if (rattrapees.length === 0) return [];

  parsed.bonds.push(...rattrapees);
  const rendues = new Set(rattrapees.map((b) => b.isin));
  const caduque = (m: string) => {
    const x = m.match(PERDUE)?.[1];
    return !!x && rendues.has(x);
  };
  parsed.warnings = parsed.warnings.filter((w) => !caduque(w));
  parsed.notes = parsed.notes.filter((n) => !caduque(n.message));
  return [...rendues];
}
