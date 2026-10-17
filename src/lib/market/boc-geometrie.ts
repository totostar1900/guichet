import type { BocBond, BocCapitalisation, BocEncours, BocEquity, BocParsed } from "./boc-parse";
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
/** L'ISIN quelque part dans la cellule : la grille le colle parfois au mnémonique. */
const ISIN_DANS = /[A-Z]{2}\d{10}/;
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
export function lireValeurs(avant: string[], apres: string[], exigerIdentite = false, nominalRef?: number): Valeurs | undefined {
  for (const a of lectures(avant)) {
    if (a.length < 4) continue;
    const pct = num(a[0]);
    const prix = num(a[1]);
    const nominal = num(a[2]);
    if (!(pct > 0) || !(nominal >= 0)) continue;
    /* LA SECONDE IDENTITÉ, LA MÊME QUE CELLE DU LECTEUR APLATI.
       Sur une ligne amortissable le prix reste rapporté au DERNIER NOMINAL
       NON NUL, et le bulletin finit par imprimer zéro : les deux identités de
       cette fonction refusaient alors la rangée, et c'était 81 des refus
       mesurés le 11 octobre 2026 sur les 48 séances de la famille « ligne de
       cours non reconnue ». Le nombre manquant dormait en base.
       Sans référence, le comportement d'avant, mot pour mot : un nominal nul
       est refusé, et l'identité du nominal imprimé commande seule. */
    const parLaReference = nominalRef != null && nominalRef > 0 && Math.abs(prix - (pct * nominalRef) / 100) <= 1.5;
    if (nominal === 0 && !parLaReference) continue;
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
    if (!parLaReference && (exigerIdentite || a.length !== avant.length) && Math.abs(prix - (pct * nominal) / 100) > 1.5) continue;
    for (const b of lectures(apres)) {
      if (b.length < 6) continue;
      const [ouverture, cloture, haut, bas, variation, reference] = b.slice(-6).map(num);
      /* LES SEUILS TIENNENT DANS LA BANDE, ILS NE SONT PLUS TENUS DE L'ÊTRE.
         C'est le même contrôle, rendu vrai des deux millésimes.

         CE QUE L'ÉGALITÉ SUPPOSAIT, ET QUI N'EST VRAI QUE D'UNE ÉPOQUE. En
         2023 le bulletin imprime, après le statut, le plus haut et le plus bas
         DE LA SÉANCE, et non la bande de réservation à six pour cent. Sur une
         ligne qui n'a pas traité, les quatre valeurs valent donc le cours
         précédent : « 100 | 100 | 100 | 100 » et non « 100 | 100 | 106 | 94 ».
         Vérifié le 12 octobre 2026 sur la page 3 du 25 septembre 2023, où la
         rangée TD0000020331, LUE par le lecteur aplati, porte exactement
         « 100 | 100 | 100 | 100 | 0,00% | 10 000,00 » : l'égalité n'y tient
         pas non plus. Exiger une forme d'époque, c'est refuser les autres
         époques, et c'était vingt lignes sur les soixante-cinq séances du
         second semestre 2023, toutes entières, toutes découpées proprement.

         CE QUI EST VRAI DU MARCHÉ, ET NON D'UN MILLÉSIME : un cours de séance
         ne sort jamais de la bande de réservation, puisque c'est la définition
         même de cette bande. Les seuils imprimés y tiennent donc toujours,
         qu'ils SOIENT la bande ou qu'ils soient les extrêmes de la séance. Et
         ils encadrent toujours l'ouverture et la clôture, par construction.

         CES DEUX CONTRÔLES REFUSENT CE QUE L'ÉGALITÉ REFUSAIT, et un peu plus :
         ils attrapent aussi une queue mal ALIGNÉE, où les six dernières
         cellules ne sont pas les six colonnes attendues. L'égalité ne voyait
         que les découpes fausses ; l'encadrement voit aussi les décalages.
         Mesuré par les deux versions du lecteur sur le même texte :
         +18 obligations, aucune perdue, aucune valeur changée.

         UNE BORNE À ZÉRO NE BORNE RIEN : un bulletin qui n'imprime pas
         l'ouverture d'une ligne non traitée y pose un zéro, et l'exiger
         inférieur au seuil bas refuserait la rangée pour un champ absent. */
      const T = 0.05;
      if (haut > pct * 1.06 + T || bas < pct * 0.94 - T) continue;
      const bornes = [ouverture, cloture].filter((v) => v > 0);
      if (bornes.length > 0 && (haut < Math.max(...bornes) - T || bas > Math.min(...bornes) + T)) continue;
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
export function obligationsGeometriques(rangees: Rangee[], carnet?: Carnet, nominauxDeReference?: Map<string, number>): BocBond[] {
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
    /**
     * LA RANGÉE COUPÉE EN DEUX HAUTEURS, RECONNUE À SA FORME.
     *
     * Du 14 avril au 2 juin 2023, quatre lignes par séance sont imprimées
     * sur deux hauteurs séparées de TROIS points, là où le regroupement en
     * tolère deux et demi : l'identité du titre reste en haut, les dix-sept
     * nombres tombent juste en dessous, et aucune des deux moitiés n'est
     * lisible seule. Trente-deux rangées sur les cinquante refusées.
     *
     * ON NE TOUCHE PAS À LA TOLÉRANCE, et c'est le point. L'élargir à trois
     * paraît évident et casserait ailleurs : les lignes d'en-tête de ces
     * mêmes bulletins ne sont séparées que de 4,4 points, donc une tolérance
     * à trois les ferait fusionner deux à deux. Un seuil déplacé pour un cas
     * agit sur tous les autres, et personne ne les mesure.
     *
     * LA FORME, ELLE, NE DISCUTE AVEC PERSONNE. Une rangée qui porte un ISIN
     * et AUCUNE date n'est pas une ligne de cours : c'est une moitié. Et une
     * rangée voisine qui porte une date et AUCUN ISIN est l'autre moitié. Les
     * deux conditions ensemble ne décrivent rien d'autre, quelle que soit la
     * distance. C'est la même méthode que la queue qui déborde, juste
     * au-dessus, étendue au cas où c'est la tête qui reste seule.
     */
    const iIsin = cells.findIndex((c) => ISIN.test(c));
    if (iIsin < 0) continue;
    const isin = cells[iIsin];
    if (vus.has(isin)) continue;

    /* LE PIVOT EST LE STATUT, PAS LA DATE, et c'est la mesure qui l'a dit.
       En avril la moitié haute ne porte que l'identité ; en MAI elle porte
       l'identité ET la date, les nombres seuls tombant en dessous. Une
       condition posée sur la date voyait donc avril et manquait mai, et les
       cinq séances de mai sont revenues inchangées après relecture. Le
       statut, lui, est ce que le constructeur exige de toute façon : une
       rangée qui porte un ISIN sans statut n'est jamais une ligne de cours
       complète, quelle que soit la façon dont la coupure est tombée. */
    if (!cells.some((c, k) => k > iIsin && STATUT.test(c) && !ISIN.test(c))) {
      const bas = section[i + 1];
      if (bas && bas.page === r.page && r.y - bas.y > 0 && r.y - bas.y < 6) {
        const nc = rangeeSeparee(bas, grille);
        const n = nc.map((c) => c.texte);
        if (n.length >= 6 && n.some((c) => STATUT.test(c)) && !n.some((c) => ISIN.test(c))) {
          cells.push(...n);
          cellules.push(...nc);
        }
      }
    }

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
    const lu = lireValeurs(cells.slice(iDate + 1, iStatut), cells.slice(iStatut + 1), coupe, nominauxDeReference?.get(isin));
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

/* ---------------- Situer une note dans le document ---------------- */

/**
 * Tout ce qui n'est ni lettre ni chiffre s'en va.
 *
 * Le texte brut d'une note arrive assemblé par le lecteur aplati, avec ses
 * propres séparateurs (« | » entre des cellules, des espaces fines dans un
 * montant). Les rangées portent le même texte découpé autrement. Comparer
 * les deux exige donc d'effacer d'abord la ponctuation d'assemblage, qui est
 * justement ce qui diffère : sans cela aucune des deux formes ne se
 * reconnaît dans l'autre.
 */
const nu = (s: string): string => s.replace(/[^0-9A-Za-zÀ-ÿ]/g, "").toUpperCase();

/**
 * Assez de caractères pour que la rencontre ne soit pas un hasard, assez peu
 * pour survivre à un découpage différent. Une ligne de cote en fait environ
 * cent cinquante une fois nue ; soixante en tiennent la moitié.
 */
const EMPREINTE = 60;

/**
 * La page où se trouve le texte brut d'une note, quand on sait la retrouver.
 *
 * ON NE DEVINE PAS. Si l'empreinte ne se retrouve nulle part, la page reste
 * absente, et c'est la bonne réponse : une page approchée serait pire que pas
 * de page du tout, puisque le desk irait regarder au mauvais endroit et
 * conclurait que la donnée n'y est pas.
 */
export function situer(brut: string, rangees: Rangee[]): number | undefined {
  const cible = nu(brut).slice(0, EMPREINTE);
  if (cible.length < 12) return undefined; // trop court pour désigner quoi que ce soit
  for (const r of rangees) {
    /* Le texte d'une rangée se recolle dans l'ordre des abscisses, qui est
       l'ordre de lecture ; les cellules n'arrivent pas triées. */
    const texte = nu([...r.cellules].sort((a, b) => a.x - b.x).map((c) => c.texte).join(""));
    if (!texte) continue;
    if (texte.includes(cible)) return r.page;
    /* L'inverse arrive quand le lecteur aplati a gardé plus de texte que la
       rangée (une ligne de cote coupée en deux rangées par le PDF) : la
       rangée se reconnaît alors DANS l'empreinte. Vingt caractères au moins,
       sinon « 2 500 » se retrouverait dans n'importe quoi. */
    if (texte.length >= 20 && cible.includes(texte)) return r.page;
  }
  return undefined;
}

/** Pose la page sur chaque note qui porte un texte brut et n'en a pas encore. */
export function situerLesNotes(notes: { brut?: string; page?: number }[], rangees: Rangee[]): number {
  let poses = 0;
  for (const n of notes) {
    if (!n.brut || n.page !== undefined) continue;
    const p = situer(n.brut, rangees);
    if (p !== undefined) {
      n.page = p;
      poses += 1;
    }
  }
  return poses;
}

/* ---------------- Les actions, par la géométrie ---------------- */

/**
 * LA BANDE DES ACTIONS EST DE DIX POUR CENT, celle des obligations de six.
 *
 * Mesuré le 12 octobre 2026 sur les 4 968 cotations d'action de la base :
 * 4 302 des 4 843 qui portent des seuils les ont exactement au franc près à
 * ± 10 % du cours précédent, soit 88,8 %. Les 11 % restants ont tous le même
 * visage, haut = bas = cours précédent, et ils sont concentrés sur
 * l'automne 2023 : soit la bourse ne publiait pas encore la bande, soit le
 * lecteur attribuait mal ces colonnes. Dans les deux cas la rangée est
 * refusée, et dite, plutôt que lue de travers.
 */
const BANDE_ACTION = 0.1;

/** La variation annoncée vaut (clôture − précédent) / précédent : 4 917 sur 4 968, soit 98,97 %. */
const ECART_VARIATION = 0.02;

export interface ValeursAction {
  precedent: number;
  ouverture: number;
  cloture: number;
  haut: number;
  bas: number;
  variation: number;
  reference: number;
}

/**
 * Les valeurs d'une rangée d'action, si une découpe les accorde.
 *
 * DEUX IDENTITÉS INDÉPENDANTES, comme pour les obligations, et c'est ce qui
 * autorise à chercher la découpe au lieu de la deviner :
 *
 *   les seuils encadrent le cours précédent de DIX pour cent ;
 *   la variation annoncée vaut celle que la clôture et le précédent donnent.
 *
 * La première épingle les deux seuils, donc les frontières autour d'eux ; la
 * seconde épingle la CLÔTURE. Une découpe fausse dément presque toujours au
 * moins l'une des deux, donc la recherche ne devine pas, elle vérifie.
 *
 * C'est la réponse à une question de Georges, le 12 octobre 2026 : confirmer
 * la rangée suffit-il à savoir que l'ouverture et la clôture valent 42 500 ?
 * Non, pas la rangée seule. La rangée PLUS cette arithmétique, oui.
 */
export function lireAction(avant: string[], apres: string[]): ValeursAction | undefined {
  for (const p of lectures(avant)) {
    /* Le cours précédent est la dernière valeur avant la date : ce qui le
       précède est le mnémonique et le nom, que `lectures` a déjà écartés. */
    const precedent = num(p.at(-1) ?? "");
    if (!(precedent > 0)) continue;
    for (const a of lectures(apres)) {
      if (a.length < 6) continue;
      const [ouverture, cloture, haut, bas, variation, reference] = a.slice(0, 6).map(num);
      if (![ouverture, cloture, haut, bas, variation, reference].every((x) => Number.isFinite(x))) continue;
      if (Math.abs(haut - precedent * (1 + BANDE_ACTION)) > 1 || Math.abs(bas - precedent * (1 - BANDE_ACTION)) > 1) continue;
      if (!(ouverture > 0) || !(cloture > 0)) continue;
      if (Math.abs(((cloture - precedent) / precedent) * 100 - variation) > ECART_VARIATION) continue;
      return { precedent, ouverture, cloture, haut, bas, variation, reference };
    }
  }
  return undefined;
}

/** Les remarques que la lecture géométrique des actions peut rendre caduques. */
const ACTION_PERDUE = /^Action ([A-Z]{2}\d{10}) : ligne dense non reconnue/;

/**
 * Les actions d'une séance, lues sur la grille.
 *
 * UNE RANGÉE PORTE TOUT : ISIN, mnémonique, nom, cours précédent, puis la
 * date, les volumes, le statut, et enfin les six valeurs du jour. Les ancres
 * sont des formes et non des rangs : l'ISIN, la date, le statut.
 */
export function actionsGeometriques(rangees: Rangee[], carnet?: Carnet): BocEquity[] {
  const titre = (r: Rangee, motif: RegExp) => r.cellules.some((c) => motif.test(c.texte));
  const debut = rangees.findIndex((r) => titre(r, /^MARCHE DES ACTIONS/));
  if (debut < 0) return [];
  const fin = rangees.findIndex((r, i) => i > debut && titre(r, /^(MARCHE DES OBLIGATIONS|CAPITALISATION BOURSIERE|MARCHE DES OPCVM)/i));
  const section = rangees.slice(debut, fin > debut ? fin : undefined);

  /* La grille s'apprend page par page, pour la même raison que chez les
     obligations : chaque tableau a ses propres colonnes. */
  const parPage = new Map<number, number[]>();
  for (const p of new Set(section.map((r) => r.page))) parPage.set(p, colonnes(section.filter((r) => r.page === p)));

  const out: BocEquity[] = [];
  const vus = new Set<string>();
  for (const [rang, r] of section.entries()) {
    const cells = rangeeSeparee(r, parPage.get(r.page) ?? []).map((c) => c.texte);
    /* L'ISIN EST COLLÉ AU MNÉMONIQUE DANS LA MÊME CELLULE : la grille rend
       « CM0000010009 SEMC » d'un bloc, et le chercher en cellule exacte, comme
       le fait le lecteur des obligations, ne trouvait rien du tout. Zéro
       action lue, et pas même un refus à montrer : la pire des deux façons
       d'échouer. */
    const iIsin = cells.findIndex((c) => ISIN_DANS.test(c));
    if (iIsin < 0) continue;
    const isin = cells[iIsin].match(ISIN_DANS)![0];
    if (vus.has(isin)) continue;
    const iDate = cells.findIndex((c, k) => k > iIsin && DATE.test(c));
    if (iDate < 0) continue;
    const refuser = (pourquoi: string) => carnet?.sur(`Action ${isin} : ${pourquoi}`, cells.join(" | "), "cours précédent, date, volumes, statut, puis ouverture, clôture, seuil haut, seuil bas, variation et référence");
    const iStatut = cells.findIndex((c, k) => k > iDate && STATUT.test(c) && !ISIN.test(c));
    if (iStatut < 0) {
      refuser("aucun statut sur la rangée.");
      continue;
    }
    const lu = lireAction(cells.slice(iIsin + 1, iDate), cells.slice(iStatut + 1));
    if (!lu) {
      refuser(`aucune découpe de la rangée n'accorde la bande de dix pour cent et la variation annoncée (${cells.length} cellules).`);
      continue;
    }
    vus.add(isin);
    /* LE NOM DE L'ÉMETTEUR VIT AU-DESSUS, sur une à trois rangées de texte
       sans chiffre ni date : « SOCIETE DES EAUX MINERALES » puis « DU
       CAMEROUN ». On remonte tant qu'on ne rencontre que du texte, et on
       s'arrête à la première rangée chiffrée, comme le lecteur aplati. */
    const haut: string[] = [];
    for (let k = rang - 1; k >= 0 && haut.length < 3; k--) {
      const t = section[k].cellules.map((c) => c.texte).join(" ").trim();
      /* ET ON NE FRANCHIT PAS UN TITRE DE SECTION : « MARCHE DES ACTIONS »
         ne porte aucun chiffre, donc la remontée l'avalait et le collait au
         nom de l'émetteur. Un cas de test l'a attrapé. */
      if (!t || ISIN_DANS.test(t) || /d/.test(t) || /^(MARCHE DES|CAPITALISATION|SYNTHESE|PHYSIONOMIE)/i.test(t)) break;
      haut.unshift(t);
    }
    out.push({
      isin,
      /* Le mnémonique suit l'ISIN dans sa cellule, ou occupe la suivante. */
      mnemo: (cells[iIsin].replace(ISIN_DANS, "").trim() || cells[iIsin + 1] || "").split(/s+/)[0] ?? "",
      issuer: haut.join(" ").replace(/s+/g, " ").trim() || (cells[iIsin + 1] ?? ""),
      previousClose: lu.precedent,
      previousDate: isoDate(cells[iDate]),
      /* Les volumes vivent entre la date et le statut. On ne les invente pas :
         ce que la rangée ne donne pas reste à zéro, comme le fait la lecture
         aplatie quand la colonne est vide. */
      volumeBid: 0,
      volumeAsk: 0,
      volumeTraded: num(cells[iDate + 1] ?? "0") || 0,
      valueTraded: num(cells[iDate + 2] ?? "0") || 0,
      trades: num(cells[iDate + 3] ?? "0") || 0,
      status: cells[iStatut],
      open: lu.ouverture,
      close: lu.cloture,
      thresholdHigh: lu.haut,
      thresholdLow: lu.bas,
      variationPct: lu.variation,
      referenceNext: lu.reference,
      ytdHigh: 0,
      ytdLow: 0,
      ytdVariationPct: null,
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
export async function completerObligations(parsed: BocParsed, bytes: Uint8Array, nominauxDeReference?: Map<string, number>): Promise<string[]> {
  const manquantes = new Set(parsed.warnings.map((w) => w.match(PERDUE)?.[1]).filter((x): x is string => !!x));
  const aSituer = parsed.notes.some((n) => n.brut && n.page === undefined);
  const actionsAReprendre = parsed.warnings.some((w) => ACTION_PERDUE.test(w));
  /* LA CAPITALISATION ENTRE DANS LA CONDITION D OUVERTURE, sans quoi la
     garde renverrait avant d avoir lu le PDF : une séance dont les
     obligations vont bien mais dont la table de capitalisation est illisible
     ne serait jamais rattrapée. C est le cas le plus fréquent des 209. */
  const capiAReprendre = parsed.capitalisation.length === 0;
  /* L ENCOURS OUVRE LA GARDE À LUI SEUL, et il le faut. Le lecteur aplati ne
     lit JAMAIS cette table, donc une séance dont les obligations, les actions
     et la capitalisation vont toutes bien n entrerait jamais ici, et son
     encours ne serait jamais lu. C est exactement le piège que la
     capitalisation avait tendu avant elle. */
  const encoursAReprendre = parsed.outstandings.length === 0;
  if (manquantes.size === 0 && !aSituer && !actionsAReprendre && !capiAReprendre && !encoursAReprendre) return [];

  let rangees: Rangee[];
  try {
    rangees = await rangeesDuPdf(bytes);
  } catch (e) {
    /* Un échec se dit : une lecture de secours muette serait pire que pas de
       lecture de secours du tout, puisque personne ne saurait qu'elle a
       renoncé. */
    const message = `Lecture géométrique impossible : ${(e as Error).message}`;
    parsed.warnings.push(message);
    parsed.notes.push({ message });
    return [];
  }

  /* SITUER AVANT DE COMPLÉTER, et avec les MÊMES rangées : pdfjs prend la
     propriété du tampon et le détache, donc un second appel lirait du vide en
     silence. Le piège est documenté plus haut dans ce fichier, il a déjà
     coûté un balayage entier rendu à zéro ligne. */
  situerLesNotes(parsed.notes, rangees);

  /* LES ACTIONS AUSSI, et dans la MÊME passe : les rangées sont déjà lues, et
     pdfjs détache le tampon, donc un second appel rendrait du vide en
     silence. La règle est celle des obligations, mot pour mot : on prend
     l'union, l'aplatie l'emporte en cas de doublon, et une séance ne peut
     donc jamais régresser. */
  const actionsPerdues = new Set(parsed.warnings.map((w) => w.match(ACTION_PERDUE)?.[1]).filter((x): x is string => !!x));
  if (actionsPerdues.size > 0) {
    const dejaLues = new Set(parsed.equities.map((e) => e.isin));
    const reprises = actionsGeometriques(rangees).filter((e) => !dejaLues.has(e.isin) && actionsPerdues.has(e.isin));
    if (reprises.length > 0) {
      parsed.equities.push(...reprises);
      const rendues = new Set(reprises.map((e) => e.isin));
      const caduqueAction = (m: string) => {
        const x = m.match(ACTION_PERDUE)?.[1];
        return !!x && rendues.has(x);
      };
      parsed.warnings = parsed.warnings.filter((w) => !caduqueAction(w));
      parsed.notes = parsed.notes.filter((n) => !caduqueAction(n.message));
    }
  }

  /* LA CAPITALISATION AUSSI, ET DANS LA MÊME PASSE. Les rangées sont déjà
     lues, et pdfjs détache le tampon : un second appel rendrait du vide en
     silence. Un quart des cotations d action n avait ni flottant ni
     capitalisation, faute d une couche texte qui sépare les cellules. */
  if (parsed.capitalisation.length === 0) {
    const capi = capitalisationsGeometriques(rangees);
    if (capi.length > 0) {
      parsed.capitalisation.push(...capi);
      const caduqueCapi = (m: string) => /^Section « Capitalisation|^Capitalisation [A-Z]{2}\d{10}/.test(m);
      parsed.warnings = parsed.warnings.filter((w) => !caduqueCapi(w));
      parsed.notes = parsed.notes.filter((n) => !caduqueCapi(n.message));
    }
  }

  /* L ENCOURS DE LA DETTE, DANS LA MÊME PASSE QUE TOUT LE RESTE. Les rangées
     sont déjà lues, et pdfjs détache le tampon : un second appel rendrait du
     vide en silence. C est la seule table de la section que l aplatie ne lit
     pas du tout, donc il n y a rien à compléter ici, seulement à lire. */
  if (parsed.outstandings.length === 0) parsed.outstandings.push(...encoursGeometriques(rangees));

  if (manquantes.size === 0) return [];

  const geo = obligationsGeometriques(rangees, undefined, nominauxDeReference);
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

/* ---------------- Capitalisation boursière ---------------- */

/**
 * LA TABLE DE CAPITALISATION, LUE PAR LES ABSCISSES.
 *
 * CE QUE LA FAMILLE O CACHAIT, et Georges avait raison de douter : « les
 * lignes sont bien complètes ». Elles le sont, et ce n'était pas la bonne
 * table. La section s'appelle « CAPITALISATION BOURSIERE ET ENCOURS DES
 * TITRES DE DETTE » : elle en contient DEUX, celle des actions puis celle de
 * la dette, qui n'ont pas les mêmes colonnes. Le lecteur aplati, ne trouvant
 * pas la borne entre les deux, lisait les rangées BDEAC avec la grammaire des
 * actions et en tirait trois lignes de pur bruit :
 *
 *   CG0000020220 EBD01 · cours 5,45 · flottant 106 791 920 000 · capG 0
 *
 * « 5,45 » est le TAUX DU COUPON et « 106 791 920 000 » le MONTANT LEVÉ. Rien
 * n'atteignait la base, l'appariement se faisant par ISIN avec les actions,
 * mais ces fausses lignes empêchaient le lecteur de dire qu'il n'avait rien
 * lu. Du faux inerte qui couvrait un vrai manque.
 *
 * LE VRAI MANQUE, MESURÉ : 1 253 cotations d'action sur 4 981, soit UN QUART,
 * n'ont ni flottant, ni capitalisation, ni dividende, ni bénéfice par action,
 * sur 209 séances. La couche texte du PDF y colle toutes les cellules :
 *
 *   BANGEGQ0000010050BANGEBANGE
 *   207 300,0050 000558 9608 397,40202229/07/20230,00--10 365 000 000115 872 408 000
 *
 * LES ABSCISSES, ELLES, LES SÉPARENT PROPREMENT, quinze cellules par rangée.
 *
 * ET LA RANGÉE SE VÉRIFIE ELLE-MÊME, ce qui est tout ce qui rend la lecture
 * défendable : la capitalisation flottante vaut le cours fois le flottant, la
 * globale le cours fois le total. Deux produits qui tombent juste au franc
 * près ne tombent pas juste par hasard. Une découpe qui les manque est
 * refusée, et la séance garde sa remarque.
 */
const CAPI_DEBUT = /^CAPITALISATION BOURSIERE/i;
const CAPI_FIN = /^(MARCHE DES|SYNTHESE|PHYSIONOMIE|BULLETIN OFFICIEL)/i;
const NOMBRE_CAPI = /^-?[\d  ]+(?:,\d+)?$/;

/** Le produit annoncé et le produit calculé s'accordent-ils au franc près ? */
const produitTient = (attendu: number, a: number, b: number): boolean => Number.isFinite(attendu) && attendu > 0 && Math.abs(attendu - a * b) <= 1;

export function capitalisationsGeometriques(rangees: Rangee[], carnet?: Carnet): BocCapitalisation[] {
  const titre = (r: Rangee, motif: RegExp) => r.cellules.some((c) => motif.test(c.texte.trim()));
  const debut = rangees.findIndex((r) => titre(r, CAPI_DEBUT));
  if (debut < 0) return [];
  /* On saute les trois rangées d'en-tête avant de chercher la fin : le titre
     de section est lui-même suivi d'un « MARCHE DES ACTIONS : 6 EMETTEURS »
     qui fermerait la section au premier pas. */
  const fin = rangees.findIndex((r, i) => i > debut + 4 && titre(r, CAPI_FIN));
  const section = rangees.slice(debut, fin > debut ? fin : debut + 40);

  const parPage = new Map<number, number[]>();
  for (const p of new Set(section.map((r) => r.page))) parPage.set(p, colonnes(section.filter((r) => r.page === p)));

  const out: BocCapitalisation[] = [];
  const vus = new Set<string>();
  for (const r of section) {
    const cells = rangeeSeparee(r, parPage.get(r.page) ?? [])
      .map((c) => c.texte.trim())
      .filter(Boolean);
    const iIsin = cells.findIndex((c) => ISIN_DANS.test(c));
    if (iIsin < 0) continue;
    const isin = cells[iIsin].match(ISIN_DANS)![0];
    if (vus.has(isin)) continue;

    const apres = cells.slice(iIsin + 1);
    const nums = apres.filter((c) => NOMBRE_CAPI.test(c)).map(num);
    if (nums.length < 5) continue;

    const [close, sharesFloat, sharesTotal] = nums;
    const marketCapFloat = nums[nums.length - 2];
    const marketCapTotal = nums[nums.length - 1];

    /* LES DEUX PRODUITS, ET RIEN D'AUTRE NE DÉCIDE. Une rangée de la table de
       dette ne les vérifiera jamais, puisque son « cours » est un taux et son
       « flottant » un montant levé : le contrôle écarte donc les intruses
       sans avoir à savoir dans quelle table on se trouve. */
    if (!produitTient(marketCapFloat, close, sharesFloat) || !produitTient(marketCapTotal, close, sharesTotal)) {
      carnet?.sur(`Capitalisation ${isin} : les capitalisations annoncées ne valent pas le cours multiplié par les volumes.`, cells.join(" | "), "cours × flottant = capitalisation flottante, cours × total = capitalisation globale");
      continue;
    }

    const iDate = apres.findIndex((c) => DATE.test(c));
    const dividende = iDate > 1 ? { lastDividend: num(apres[iDate - 2]), dividendYear: Number(apres[iDate - 1]), dividendDate: isoDate(apres[iDate]) } : {};
    /* Entre la date et les deux capitalisations : la liquidité, puis le
       bénéfice par action quand il est publié, puis le PER. Ce que la rangée
       ne donne pas reste absent, on ne le fabrique pas. */
    const queue = (iDate >= 0 ? apres.slice(iDate + 1) : []).filter((c) => NOMBRE_CAPI.test(c)).map(num).slice(0, -2);

    vus.add(isin);
    out.push({
      isin,
      mnemo: (cells[iIsin].replace(ISIN_DANS, "").trim() || apres[0] || "").split(/\s+/)[0] ?? "",
      close,
      sharesFloat,
      sharesTotal,
      ...dividende,
      liquidity3mPct: queue[0],
      eps: queue[1],
      marketCapFloat,
      marketCapTotal,
    });
  }
  return out;
}

/* ---------------- Encours des titres de dette ---------------- */

/**
 * LE STOCK DE LA DETTE COTÉE, LU PAR LES ABSCISSES.
 *
 * POURQUOI CETTE TABLE VAUT LE RESTE DU CHANTIER. Les adjudications donnent
 * des FLUX, et notre collecte n'en couvre qu'un quart : tout ratio bâti
 * dessus est faussement précis. Cette table, elle, publie le STOCK, ligne par
 * ligne, à chaque séance. Un stock publié est complet par construction, et
 * c'est la seule route honnête vers le mur des échéances.
 *
 * ELLE VIT DANS LA MÊME SECTION QUE LA CAPITALISATION BOURSIÈRE, juste après,
 * avec d'autres colonnes : c'est cette cohabitation qui a produit la famille
 * O, le lecteur aplati lisant les rangées de dette avec la grammaire des
 * actions. On la reconnaît à son en-tête propre, « Montant levé », qui
 * n'existe nulle part ailleurs dans le bulletin.
 *
 * LA RANGÉE SE VÉRIFIE ELLE-MÊME, et c'est le seul garde :
 *
 *   nombre de titres × nominal résiduel = encours
 *   23 500 000 × 6 000 = 141 000 000 000   (Cameroun ECMR6, 12 octobre 2026)
 *
 * Le nominal imprimé est le nominal RESTANT après amortissements, non celui
 * d'origine : 23 500 000 × 10 000 rendrait le montant levé, pas l'encours. Une
 * découpe qui confondrait les deux manquerait le produit, et serait refusée.
 */
const ENCOURS_ENTETE = /Montant lev/i;
const ENCOURS_FIN = /^(MARCHE DES|SYNTHESE|PHYSIONOMIE|CAPITALISATION)/i;
const AMORTISSEMENT = /^(CONSTANT|IN ?FINE|DIFFERE|LINEAIRE)/i;

const EST_NOMBRE = /^-?[\d  ]+(?:,\d+)?$/;
const nombresDe = (cells: string[]): number[] => cells.filter((c) => EST_NOMBRE.test(c) && c.trim() !== "-").map(num);

/**
 * LE NOMBRE QUE LA GRILLE A COUPÉ EN DEUX, ET COMMENT ON LE RETROUVE.
 *
 * « 23 500 000 » sort de la grille en « 23 » et « 500 000 », parce qu'un bord
 * de colonne tombe au milieu d'une espace de milliers. La rangée porte alors
 * sept nombres là où elle en a six, et toute lecture par position se décale.
 * C'est le même piège que chez les obligations, où il avait déjà coûté un
 * balayage entier.
 *
 * ON NE DEVINE PAS LA DÉCOUPE, ON LA CHERCHE. Chaque recollement de cellules
 * voisines est un candidat, et c'est l'identité de la rangée qui tranche :
 * nombre de titres × nominal résiduel = encours. Une seule combinaison la
 * vérifie, et si aucune ne la vérifie, la rangée est refusée. Le document
 * choisit, pas nous.
 */
interface Morceau {
  valeur: number;
  /** Le nombre de décimales IMPRIMÉES : il borne l erreur d arrondi. */
  decimales: number;
  /** Les indices de cellules recollés pour l obtenir. */
  de: number;
  a: number;
}

/**
 * L ÉMETTEUR ET LA DÉSIGNATION, QUAND LA GRILLE LES A MIS DANS UNE SEULE CELLULE.
 *
 * « ETAT DU CAMEROUN | ECMR 6.25% NET 2022-2029 » tient en deux cellules, et
 * la lecture est immédiate. Les corporates, eux, sortent parfois d un bloc :
 * « ACEP CAMEROUN ACEP 7% BRUT 2024-2027 », et tout partait alors dans le nom
 * de l émetteur, ce qui donnait un émetteur par ligne au lieu d un par maison.
 *
 * La désignation d une obligation porte toujours son TAUX. On coupe donc
 * juste avant le mot qui précède le pourcentage : ce mot est le sigle de la
 * ligne, jamais la fin du nom de l émetteur.
 */
const nommer = (avant: string[]): { issuer: string; designation: string } => {
  if (avant.length > 1) return { issuer: avant[0].trim(), designation: avant.slice(1).join(" ").trim() };
  const bloc = (avant[0] ?? "").trim();
  const m = /\s(\S+\s+\d+(?:[.,]\d+)?\s?%)/.exec(bloc);
  if (!m || m.index == null) return { issuer: bloc, designation: "" };
  return { issuer: bloc.slice(0, m.index).trim(), designation: bloc.slice(m.index + 1).trim() };
};

/**
 * UNE CELLULE QUI PORTE DEUX NOMBRES, SÉPARÉE AVANT TOUT LE RESTE.
 *
 * `morceaux` sait RECOLLER des cellules voisines ; il ne savait pas DÉCOUPER
 * une cellule qui en contient deux, et ce manque a coûté 671 lignes d'encours
 * sur 784, mesurées le 16 octobre 2026.
 *
 * Le cas, pris sur la ligne tchadienne TD0000020331 absente neuf mois
 * d'affilée en 2024 : le montant levé et le nombre de titres sortent collés
 * dans la même cellule, « 100 000 000 000 10 000 000 ». Le test de nombre est
 * volontairement lâche, « des chiffres et des espaces », donc la cellule
 * PASSE pour un nombre et vaut 10 000 000 000 010 000 000, un entier de vingt
 * chiffres. Ni le montant levé ni les titres n'existent alors parmi les
 * candidats, et aucune découpe ne peut rendre l'identité : la rangée était
 * refusée, en silence pour le lecteur d'avant, avec un motif depuis la v3.
 *
 * CE N'EST PAS UNE DEVINETTE, et c'est pourquoi on se l'autorise. La règle
 * « un nombre ne commence pas par des zéros » ne laisse qu'UNE découpe
 * valide à « 100 000 000 000 10 000 000 », et elle vérifie l'identité au
 * franc près : 10 000 000 × 7 500 × 100 / 100 = 75 000 000 000, exactement
 * l'encours imprimé. Quand plusieurs découpes restent possibles, on ne
 * tranche pas et la cellule est rendue telle quelle : le refus nommé vaut
 * mieux qu'un choix arbitraire.
 */
function eclaterLesCollees(cells: string[]): string[] {
  const out: string[] = [];
  for (const c of cells) {
    if (MONTANT.test(c.trim()) || !EST_NOMBRE.test(c) || c.trim() === "-") {
      out.push(c);
      continue;
    }
    const jetons = c.trim().split(/[  ]+/);
    const valides: string[][] = [];
    for (let k = 1; k < jetons.length; k++) {
      const g = jetons.slice(0, k).join(" ");
      const d = jetons.slice(k).join(" ");
      if (MONTANT.test(g) && MONTANT.test(d)) valides.push([g, d]);
    }
    if (valides.length === 1) out.push(...valides[0]);
    else out.push(c);
  }
  return out;
}

/** Tous les nombres lisibles, y compris ceux obtenus en recollant des voisins. */
function morceaux(cells: string[]): Morceau[] {
  const out: Morceau[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (!EST_NOMBRE.test(cells[i]) || cells[i].trim() === "-") continue;
    out.push({ valeur: num(cells[i]), decimales: (cells[i].split(",")[1] ?? "").length, de: i, a: i });
    /* Deux ou trois cellules recollées : au-delà, la grille ne coupe pas. */
    if (cells[i].includes(",")) continue; // déjà décimal : rien ne se recolle après
    let brut = cells[i].replace(/[  ]/g, "");
    for (let j = i + 1; j < Math.min(i + 3, cells.length); j++) {
      if (!EST_NOMBRE.test(cells[j])) break;
      brut += cells[j].replace(/[  ]/g, "");
      out.push({ valeur: Number(brut.replace(",", ".")), decimales: (brut.split(",")[1] ?? "").length, de: i, a: j });
      /* UNE DÉCIMALE FERME LE NOMBRE, ELLE NE L INTERDIT PAS, et la nuance a
         coûté quatre-vingt-dix-huit séances. La condition refusait toute
         cellule portant une virgule, de sorte que « 6 » et « 666,67 » ne
         pouvaient jamais se recoller : le nominal 6 666,67 du Congo n existait
         même pas parmi les candidats, et le lecteur n avait que la découpe
         fausse à choisir, 113 230 006 titres à 666,67. Un nombre ne continue
         pas après sa partie décimale ; il s y arrête. */
      if (cells[j].includes(",")) break;
    }
  }
  return out;
}

/**
 * La découpe de la rangée, trouvée par son identité.
 *
 * L'IDENTITÉ EXACTE, ET JE M'ÉTAIS TROMPÉ EN LA POSANT. J'avais écrit
 * « titres × nominal = encours », ce qui est vrai des seules lignes cotées au
 * pair, et treize sur vingt-six l'étaient. Le refus de CM0000020388 a donné
 * la bonne :
 *
 *   11 032 250 000 × 0,99 = 10 921 927 500
 *
 * L'encours est calculé AU COURS, pas au nominal. La colonne s'appelle
 * d'ailleurs « Encours calculé à ce jour », ce que j'aurais pu lire.
 *
 *   nombre de titres × nominal résiduel × cours / 100 = encours
 *
 * Trois inconnues, une équation, et des candidats en petit nombre : on essaie
 * les découpes et on garde celle qui tombe juste. L'ordre des colonnes ne
 * bouge pas, titres puis nominal puis cours, ce qui élague presque tout.
 */
interface Decoupe {
  titres: Morceau;
  nominal: Morceau;
  cours: Morceau;
  /** Le nominal imprimé, quand il a fallu lui préférer celui que l'encours implique. */
  imprime?: number;
}

/**
 * LE SECOND INVARIANT, ET IL ÉTAIT DANS LA RANGÉE DEPUIS LE DÉBUT.
 *
 * CE QUE L IDENTITÉ NE PEUT PAS VOIR. titres × nominal × cours = encours est
 * conservé quand un CHIFFRE TRAVERSE la frontière entre les titres et le
 * nominal : le Congo porte 11 323 000 titres à 6 666,670, et la grille les a
 * rendus 113 230 006 titres à 666,670 sur quatre-vingt-dix-huit séances. Le
 * produit tient à onze millionièmes près, et le garde a signé. Deux lignes
 * BDEAC ont subi pire encore, le MONTANT LEVÉ pris pour le nombre de titres.
 *
 * LA MESURE QUI DONNE LA RÈGLE. Sur les 16 712 rangées saines de huit cent
 * sept séances, montant levé ÷ titres vaut EXACTEMENT 10 000, minimum comme
 * maximum : toute la cote a le même nominal d origine. Sur les 203 rangées
 * suspectes, 199 donnent autre chose, et le Congo donne 999,99995.
 *
 * On n inscrit pas 10 000 en dur pour autant, une cote pouvant coter un jour
 * un nominal différent. On demande seulement un nominal d origine ENTIER et
 * d au moins cent francs, ce qu aucune mauvaise recombinaison ne produit : un
 * chiffre déplacé donne toujours un quotient à virgule.
 */
const nominalDOrigineTient = (leve: number, titres: number): boolean => {
  if (!(leve > 0) || !(titres > 0)) return true; // rien à opposer : on ne refuse pas sur une absence
  const n = leve / titres;
  return n >= 100 && Math.abs(n - Math.round(n)) < 1e-6;
};

function decoupeDeLaRangee(m: Morceau[], encours: number): Decoupe | undefined {
  const candidats: Decoupe[] = [];
  for (const titres of m) {
    if (!(titres.valeur > 0)) continue;
    /* Le montant levé est le plus gros nombre qui précède les titres, et
       c est ce que l appelant retiendra aussi : les deux doivent voir la
       même chose, sinon le garde contrôlerait autre chose que ce qui sera
       écrit. */
    const leve = m.filter((x) => x.a < titres.de).reduce((a, x) => Math.max(a, x.valeur), 0);
    if (!nominalDOrigineTient(leve, titres.valeur)) continue;
    for (const nominal of m) {
      if (nominal.de <= titres.a || !(nominal.valeur > 0)) continue;
      for (const cours of m) {
        if (cours.de <= nominal.a || cours.valeur < 50 || cours.valeur > 130) continue;
        /* LA TOLÉRANCE SUIT L ARRONDI DU NOMINAL IMPRIMÉ, et c est ALIOS
           FINANCE qui l a appris : son nominal résiduel vaut 8888,889, le
           bulletin l arrondit au millième, et le produit dérive alors de
           six cents francs. Un franc fixe refusait la rangée ; une
           tolérance proportionnelle au nombre de titres et à la précision
           imprimée l accepte sans rien relâcher ailleurs, un nominal entier
           gardant le franc. */
        /* UNE UNITÉ ENTIÈRE DU DERNIER DÉCIMAL, ET NON UNE DEMIE : le
           bulletin arrondit le même nombre de deux façons dans la même
           rangée. ALIOS-06 imprime un nominal de 8888,889 et calcule son
           encours avec 8888,89, d'où 613 francs d'écart sur 612 955 titres,
           soit exactement un millième par titre. La demi-unité refusait la
           rangée. Le garde reste serré : un relatif de 10⁻⁴ n'accepte pas une
           combinaison fausse, qui se trompe d'un ordre de grandeur. */
        /* ON TESTE LE NOMINAL IMPLIQUÉ, PAS LE PRODUIT, et c'est ce qui
           réconcilie deux cas opposés mesurés le 16 octobre 2026.

           ALIOS02 imprime un nominal de 5714,286 et calcule son encours avec
           5714,29, arrondi au centime : le nominal IMPRIMÉ est plus fin que
           celui UTILISÉ, et le produit dérive de 3 417 francs sur 854 250
           titres. L'État du Congo fait l'inverse : il imprime 3 333 tout
           rond et calcule avec 3333,337, soit 3,6 millions d'écart sur
           35,8 milliards. Une tolérance en francs ne peut pas couvrir les
           deux sans s'ouvrir démesurément.

           Le nominal impliqué, lui, se compare au nominal imprimé dans son
           unité propre : les deux doivent s'accorder à une demi-unité de la
           dernière décimale IMPRIMÉE, ou au demi-centime, le plus large des
           deux. C'est exactement ce que veut dire « le bulletin a imprimé un
           arrondi du nombre dont il s'est servi ».

           UNE UNITÉ ENTIÈRE DU DERNIER DÉCIMAL, ET NON UNE DEMIE : la règle
           était déjà écrite ici, pour la tolérance en francs, et je l'ai
           enfreinte en réécrivant le test. Une demi-unité perdait le Congo du
           10 septembre 2025, qui imprime 3333,33 et calcule avec 3333,3368,
           soit 0,0068 d'écart pour 0,005 de tolérance. Le bulletin TRONQUE
           autant qu'il arrondit, et une demie suppose qu'il arrondit.

           LE GARDE RESTE SERRÉ. Une découpe fausse se trompe d'un ordre de
           grandeur sur les titres, donc d'autant sur le nominal impliqué :
           elle ne passe pas à une unité près. */
        const implique = (encours * 100) / (titres.valeur * cours.valeur);
        const pas = Math.max(0.01, Math.pow(10, -nominal.decimales));
        if (Math.abs(implique - nominal.valeur) <= pas) candidats.push({ titres, nominal, cours });
      }
    }
  }
  if (candidats.length) return candidats.sort((a, b) => a.titres.de - b.titres.de || a.nominal.de - b.nominal.de)[0];

  /**
   * SECONDE CHANCE : LE BULLETIN A IMPRIMÉ LA PART AMORTIE AU LIEU DU RESTE.
   *
   * ALIOS AFC03 l'a montré, sur 109 séances. La rangée est entière et bien
   * découpée, et elle se contredit : nominal imprimé 2500, encours imprimé
   * 2 604 772 500 pour 347 303 titres à 100,00, ce qui implique 7500 au
   * franc près. Le nominal d'origine vaut 10 000 et l'amortissement est
   * constant : 7500 est le reste, 2500 est ce qui a déjà été remboursé. Ses
   * voisines AFC04 et ACEP tombent juste, donc la colonne est bonne et c'est
   * la ligne qui est fausse.
   *
   * ON NE DEVINE PAS, ON RECONNAÎT UNE SIGNATURE. Préférer le nominal
   * impliqué dès qu'il diffère de l'imprimé reviendrait à supprimer le garde,
   * puisque l'encours donne toujours UN nominal. La condition est donc
   * exacte : imprimé plus impliqué doit valoir le nominal d'ORIGINE, lui-même
   * lu ailleurs dans la rangée comme le montant levé divisé par les titres.
   * C'est précisément ce que veut dire « la part amortie a été mise à la
   * place du reste », et rien d'autre ne le satisfait par accident.
   *
   * Décision de Georges le 17 octobre 2026 : le bulletin se contredit, c'est
   * son encours qui fait foi. Le nominal imprimé est conservé dans la
   * découpe pour que la substitution se dise.
   */
  for (const titres of m) {
    if (!(titres.valeur > 0)) continue;
    const leve = m.filter((x) => x.a < titres.de).reduce((a, x) => Math.max(a, x.valeur), 0);
    if (!nominalDOrigineTient(leve, titres.valeur)) continue;
    const origine = leve / titres.valeur;
    for (const nominal of m) {
      if (nominal.de <= titres.a || !(nominal.valeur > 0) || nominal.valeur >= origine) continue;
      for (const cours of m) {
        if (cours.de <= nominal.a || cours.valeur < 50 || cours.valeur > 130) continue;
        const implique = (encours * 100) / (titres.valeur * cours.valeur);
        if (!(implique > 0) || implique > origine) continue;
        const pas = Math.max(0.01, Math.pow(10, -nominal.decimales));
        if (Math.abs(implique + nominal.valeur - origine) > pas) continue;
        candidats.push({ titres, nominal: { ...nominal, valeur: implique }, cours, imprime: nominal.valeur });
      }
    }
  }
  return candidats.sort((a, b) => a.titres.de - b.titres.de || a.nominal.de - b.nominal.de)[0];
}

/**
 * LA GRILLE APPARTIENT AU TABLEAU, PAS À LA PAGE.
 *
 * CE QUE CETTE SECTION CACHAIT, et c'est la plus grosse perte mesurée sur la
 * série : la section des encours porte TROIS sous-tableaux, les États, les
 * régionales et les privées, et deux d'entre eux tiennent souvent sur la même
 * page. Leurs colonnes ne sont pas au même endroit, à une vingtaine de points
 * près (séance du 9 septembre 2024, page 5) :
 *
 *   États       38  105  199  254  286  311  357  455  490  522  535
 *   régionales  47   80  178  236  264  288  338  400  446  474  505
 *
 * Une grille calculée sur la page entière épouse le sous-tableau le plus
 * fourni et coupe l'autre de travers. Ses rangées ne vérifient plus leur
 * produit, elles sont refusées, et la séance perd dix lignes en silence.
 *
 * MESURE DU 14 OCTOBRE 2026 : 295 des 333 lignes manquantes des quarante
 * séances les plus trouées sont IMPRIMÉES dans la pièce. L'essai à blanc qui
 * avait conclu l'inverse comparait le constructeur à une base que ce même
 * constructeur avait écrite, et deux lectures d'accord ne prouvent rien quand
 * c'est la même lecture.
 *
 * CHAQUE EN-TÊTE « Montant levé » OUVRE DONC SON PROPRE TABLEAU, et chaque
 * tableau sa propre grille, page par page. Un sous-tableau de trois lignes n'a
 * pas de quoi fonder quatre bords : on abaisse le minimum au nombre de ses
 * rangées, et une grille vide laisse la rangée telle que pdfjs la rend, ce qui
 * est le bon défaut puisque la séparation est alors déjà correcte.
 *
 * `grilleParPage` ne sert qu'au contrôle de non-régression, qui fait tourner
 * les deux découpes sur le même texte dans le même processus.
 */
export function encoursGeometriques(rangees: Rangee[], carnet?: Carnet, grilleParPage = false): BocEncours[] {
  const dit = (r: Rangee, motif: RegExp) => r.cellules.some((c) => motif.test(c.texte.trim()));
  const debut = rangees.findIndex((r) => dit(r, ENCOURS_ENTETE));
  if (debut < 0) return [];
  const fin = rangees.findIndex((r, i) => i > debut + 2 && dit(r, ENCOURS_FIN));
  const section = rangees.slice(debut, fin > debut ? fin : debut + 60);

  const parPage = new Map<number, number[]>();
  for (const p of new Set(section.map((r) => r.page))) parPage.set(p, colonnes(section.filter((r) => r.page === p)));

  const ouvertures = section.flatMap((r, i) => (dit(r, ENCOURS_ENTETE) ? [i] : []));
  if (ouvertures[0] !== 0) ouvertures.unshift(0);
  const grilles = new Map<string, number[]>();
  ouvertures.forEach((de, k) => {
    const bloc = section.slice(de, ouvertures[k + 1] ?? section.length);
    for (const p of new Set(bloc.map((r) => r.page))) {
      const sienne = bloc.filter((r) => r.page === p);
      const lignes = sienne.filter((r) => r.cellules.some((c) => ISIN_DANS.test(c.texte))).length;
      grilles.set(`${k}|${p}`, colonnes(sienne, Math.min(4, Math.max(2, lignes))));
    }
  });
  const grilleDe = (i: number, page: number): number[] => {
    if (grilleParPage) return parPage.get(page) ?? [];
    let k = 0;
    while (k + 1 < ouvertures.length && ouvertures[k + 1] <= i) k++;
    return grilles.get(`${k}|${page}`) ?? [];
  };

  const out: BocEncours[] = [];
  const vus = new Set<string>();
  for (const [iRangee, r] of section.entries()) {
    const cells = rangeeSeparee(r, grilleDe(iRangee, r.page))
      .map((c) => c.texte.trim())
      .filter(Boolean);
    const iIsin = cells.findIndex((c) => ISIN_DANS.test(c));
    if (iIsin < 1) continue;
    const trouve = cells[iIsin].match(ISIN_DANS)!;
    const isin = trouve[0];
    if (vus.has(isin)) continue;

    /**
     * LA CELLULE DE L ISIN PORTE DU TEXTE AVANT ET APRÈS LUI, et c est une
     * seule cause pour trois défauts mesurés sur les 807 séances.
     *
     * APRÈS L ISIN vit le mnémonique quand la grille les colle :
     * « CM0000020107 ECMR5 ». Le lecteur prenait alors la cellule SUIVANTE,
     * qui est le taux facial, et 2 533 rangées sur 16 915, soit quinze pour
     * cent, portaient « 6,25 » ou « 5,8 » en guise de mnémonique, sur 484
     * séances.
     *
     * AVANT L ISIN vit la désignation quand la grille les colle :
     * « BDEAC 5.45% NET 2020 - 2027 CG0000020220 ». Les cellules d avant ne
     * contenaient plus que « BDEAC », et la ligne EBD01 est restée SANS
     * DÉSIGNATION pendant 767 séances, c est-à-dire toute sa vie cotée.
     *
     * Un mnémonique porte une lettre ; un taux n en porte pas. C est tout ce
     * qu il faut pour ne plus confondre les deux.
     */
    const avantLIsin = cells[iIsin].slice(0, trouve.index).trim();
    const apresLIsin = cells[iIsin].slice((trouve.index ?? 0) + isin.length).trim();
    const celluleSuivante = (cells[iIsin + 1] ?? "").trim();
    const mnemo = /[A-Za-z]/.test(apresLIsin) ? apresLIsin : /[A-Za-z]/.test(celluleSuivante) ? celluleSuivante : "";

    /* L'amortissement est le pivot de la rangée : il sépare ce qui décrit le
       titre de ce qui décrit son service, et il ne ressemble à rien d'autre. */
    const iAmort = cells.findIndex((c, k) => k > iIsin && AMORTISSEMENT.test(c));
    if (iAmort < 0) continue;

    const dates = cells.map((c, k) => (k > iIsin && DATE.test(c) ? k : -1)).filter((k) => k >= 0);
    const tete = eclaterLesCollees(cells.slice(iIsin + 1, iAmort));
    const apres = nombresDe(cells.slice(iAmort + 1));
    if (apres.length < 1) continue;

    /* L'encours est le premier nombre après l'amortissement, et il sert de
       clef : c'est lui qui permet de retrouver la découpe de la tête. */
    const outstanding = apres[0];
    const couple = decoupeDeLaRangee(morceaux(tete), outstanding);
    if (!couple) {
      carnet?.sur(`Encours ${isin} : aucune découpe de la rangée ne rend titres × nominal × cours égal à l encours.`, cells.join(" | "), "nombre de titres × nominal résiduel × cours / 100 = encours");
      continue;
    }
    /* UNE SUBSTITUTION QUI NE SE DIT PAS EST UNE DONNEE INVENTEE. La valeur
       ecrite n est plus celle que le bulletin imprime : elle doit laisser une
       trace la ou l on regarde quand un chiffre surprend, c est-a-dire dans
       le carnet, avec la rangee brute pour pouvoir la contester. */
    if (couple.imprime != null) {
      carnet?.sur(
        `Encours ${isin} : nominal imprime ${couple.imprime}, retenu ${couple.nominal.valeur} que l encours implique. Le bulletin a imprime la part AMORTIE au lieu du reste, les deux faisant le nominal d origine.`,
        cells.join(" | "),
        "nominal residuel ; le bulletin se contredit et son encours fait foi",
      );
    }

    const units = couple.titres.valeur;
    const nominalRemaining = couple.nominal.valeur;

    /* Le reste se lit autour du couple, et chaque colonne a sa forme : le
       taux facial porte une virgule et vaut moins de trente, le cours tombe
       entre cinquante et cent trente, la maturité est un petit entier. Le
       montant levé est ce qui reste de plus gros avant les titres. */
    const libres = morceaux(tete).filter((x) => x.a < couple.titres.de);
    const couponRate = libres.find((x) => x.de < couple.titres.de && x.valeur > 0 && x.valeur < 30)?.valeur ?? 0;
    const amountRaised = libres.filter((x) => x.a < couple.titres.de).reduce((a, x) => Math.max(a, x.valeur), 0);
    const pricePct = couple.cours.valeur;
    const maturityYears = morceaux(tete).filter((x) => x.de > couple.cours.a && Number.isInteger(x.valeur) && x.valeur >= 1 && x.valeur <= 30).at(-1)?.valeur ?? 0;

    vus.add(isin);
    out.push({
      isin,
      mnemo,
      ...nommer([...cells.slice(0, iIsin), avantLIsin].filter(Boolean)),
      couponRate,
      firstListedOn: dates[0] != null ? isoDate(cells[dates[0]]) : "",
      amountRaised,
      units,
      nominalRemaining,
      pricePct,
      maturityYears,
      amortisation: cells[iAmort].toUpperCase().replace(/\s+/g, " "),
      periodicity: cells[iAmort + 1] ?? "",
      /* Les deux dernières dates de la rangée sont les deux échéances de
         coupon ; la première est celle de la cotation d'origine. */
      previousCouponOn: dates.length >= 3 ? isoDate(cells[dates[dates.length - 2]]) : "",
      nextCouponOn: dates.length >= 2 ? isoDate(cells[dates[dates.length - 1]]) : "",
      outstanding,
      netYieldPct: apres[1],
      turnoverPct: apres[2],
    });
  }
  return out;
}
