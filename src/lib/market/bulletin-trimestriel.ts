import { rangeesDuPdf, type Rangee } from "./boc-geometrie";

/**
 * LE BULLETIN TRIMESTRIEL DE LA CEMAC, ET SON REGISTRE DE L'ENCOURS.
 *
 * Seize bulletins depuis mars 2018, de vingt à soixante-seize pages. Dix
 * d'entre eux portent, pays par pays, LE REGISTRE LIGNE À LIGNE DES TITRES EN
 * VIE : code ISIN, date d'émission, date de remboursement, maturité, nombre
 * de titres, valeur faciale, encours. C'est la même chose que notre
 * reconstitution à partir du bulletin de la cote, mais écrite par celui qui
 * tient le registre.
 *
 * ON LE LIT PAR LA GÉOMÉTRIE, comme le bulletin de la cote. Le texte aplati
 * d'un tableau à neuf colonnes ne dit pas où une cellule finit, et un montant
 * à séparateurs d'espace y est indiscernable de deux montants collés. Chaque
 * fragment vient ici avec son abscisse.
 *
 * TROIS PIÈGES, MESURÉS LE 15 OCTOBRE 2026.
 *
 *   LA DATE D'ARRÊTÉ EST CELLE DU TABLEAU, PAS CELLE DU BULLETIN. Le numéro 9
 *   est daté de mars 2020 et son tableau 12 s'intitule « Situation des encours
 *   des valeurs du Trésor de la Guinée Equatoriale au 31 décembre 2019 » : la
 *   BEAC publie ce qu'elle a. Prendre le trimestre du bulletin daterait deux
 *   pays d'un trimestre de trop.
 *
 *   L'INSTRUMENT EST PARFOIS UNE CELLULE FUSIONNÉE. À partir de 2021, « BTA »
 *   n'est imprimé qu'une fois au milieu de son bloc, et la ligne ne le porte
 *   pas. On le prend au SOUS-TOTAL QUI FERME LE BLOC, ce qui a l'avantage de
 *   se vérifier : la somme des lignes ainsi rattachées doit faire le
 *   sous-total.
 *
 *   LA MATURITÉ EST ÉCRITE SUR TROIS LIGNES DE BASE. « 52 » au-dessus,
 *   « semaines » au-dessous, et la ligne de données entre les deux : la
 *   cellule est centrée verticalement sur trois rangées. On la recolle en
 *   cherchant dans la bande d'abscisses de la colonne, au voisinage immédiat.
 *
 * DEUX VÉRIFICATIONS QUE LE DOCUMENT S'IMPOSE À LUI-MÊME. Le nombre de titres
 * multiplié par la valeur faciale doit faire l'encours, sur chaque ligne ; et
 * la somme des lignes d'un bloc doit faire le sous-total imprimé. Une lecture
 * qui ne les passe pas se signale plutôt que de se taire.
 */

export interface LigneEncours {
  pays: string;
  isin: string;
  instrument?: string;
  /** Les dates en ISO, telles que le tableau les écrit en JJ/MM/AAAA. */
  emisLe?: string;
  echeanceLe?: string;
  tenor?: string;
  titres?: number;
  faciale?: number;
  encours: number;
  /** La date à laquelle CE TABLEAU arrête l'encours, pas celle du bulletin. */
  arrete: string;
}

export interface SousTotal {
  pays: string;
  instrument: string;
  montant: number;
  arrete: string;
}

export interface EncoursDuBulletin {
  numero?: number;
  lignes: LigneEncours[];
  sousTotaux: SousTotal[];
  /** Le « Total de l'encours des valeurs du Trésor de X » imprimé sous le tableau. */
  totaux: { pays: string; montant: number; arrete: string }[];
  reserves: string[];
}

/**
 * L'INSTRUMENT SE LIT DANS LE CODE, PAS DANS LE SOUS-TOTAL.
 *
 * Le sous-total paraissait le bon arbitre : il ferme le bloc et se vérifie.
 * Mais le tableau 7 du numéro 18 intitule « Sous - total BTA République
 * Centrafricaine » un bloc de neuf lignes qui sont toutes des OTA, à trois,
 * quatre, cinq et six ans. La BEAC se trompe d'étiquette, et le lecteur
 * aurait recopié son erreur sur neuf lignes.
 *
 * Le code du CRCT, lui, ne se trompe pas : le caractère qui suit les deux
 * lettres du pays vaut 1 pour le court terme et 2 pour le long terme.
 * « CM1300000443 » est un BTA, « CM2J00000014 » un OTA. Vérifié sur toutes
 * les lignes qui portent AUSSI la mention en clair.
 */
export function instrumentDeLIsin(isin: string): "BTA" | "OTA" | undefined {
  const c = isin.charAt(2);
  return c === "1" ? "BTA" : c === "2" ? "OTA" : undefined;
}

/**
 * LE CODE D'UNE LIGNE, ET IL NE FAIT PAS TOUJOURS DOUZE SIGNES.
 *
 * Un ISIN en fait douze, mais le registre du CRCT écrit « CG12000000434 » et
 * « GA11000001351 » à treize, et « GA1200001210/NM1 » avec un suffixe de
 * marché. Exiger douze signes exactement faisait tomber des lignes entières :
 * le total du Congo manquait 279 milliards au 30 juin 2021.
 */
const ISIN = /^[A-Z]{2}[A-Z0-9]{9,12}(\/[A-Z0-9]{1,6})?$/;
const DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

const aplat = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** « 12 500 000 000 » → 12500000000. Rien d'autre n'est un nombre. */
export function montant(s: string): number | undefined {
  const t = s.replace(/[\s  ]/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(t)) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** « 31 mars 2020 » → « 2020-03-31 ». La date que porte l'intitulé du tableau. */
export function dateDeLIntitule(s: string): string | undefined {
  const m = aplat(s).match(/\bau\s+(\d{1,2})\s*(?:er)?\s+([a-z]+)\s+(\d{4})/);
  if (!m) return undefined;
  const i = MOIS.findIndex((x) => aplat(x).startsWith(m[2].slice(0, 3)) && (m[2].startsWith("jui") ? aplat(x).startsWith(m[2].slice(0, 4)) : true));
  if (i < 0) return undefined;
  return `${m[3]}-${String(i + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/** Le pays que l'intitulé d'un tableau d'encours nomme. */
export function paysDeLIntitule(s: string): string | undefined {
  const f = aplat(s);
  if (/cameroun/.test(f)) return "Cameroun";
  if (/centrafri|\brca\b/.test(f)) return "RCA";
  if (/congo/.test(f)) return "Congo";
  if (/gabon/.test(f)) return "Gabon";
  if (/guinee/.test(f)) return "Guinée éq.";
  if (/tchad/.test(f)) return "Tchad";
  return undefined;
}

const texteDe = (r: Rangee) => r.cellules.map((c) => c.texte).join(" ").replace(/\s+/g, " ").trim();

/**
 * LA FORME SUR LAQUELLE ON RECONNAÎT UNE PHRASE DU BULLETIN.
 *
 * Sans accents, sans casse, et l'apostrophe réduite à une espace : la BEAC
 * imprime « Total de l' encours » avec une espace APRÈS l'apostrophe, et un
 * motif qui attendait un seul signe entre « l » et « encours » ratait la
 * ligne de total du Cameroun dans les six bulletins qui la portent.
 */
const phrase = (s: string) =>
  aplat(s)
    .replace(/['’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Un intitulé de tableau d'encours, et ce qu'il annonce.
 *
 * LE SOMMAIRE PORTE LES MÊMES PHRASES, et il ne faut pas les prendre pour des
 * tableaux : une page de sommaire ne contient aucune ligne à code ISIN, et
 * c'est à cela qu'on la reconnaît.
 */
/**
 * UNE ENTRÉE DE SOMMAIRE N'EST PAS UN TABLEAU.
 *
 * Le sommaire répète mot pour mot l'intitulé de chaque tableau, et le
 * lecteur bornait ses tableaux sur les entrées du sommaire : deux bulletins
 * sur seize rendaient trente lignes au lieu de huit cents. Une entrée de
 * sommaire porte son numéro de page en marge droite, le plus souvent au bout
 * d'une conduite de points ; un intitulé de tableau, jamais.
 */
function estSommaire(r: Rangee): boolean {
  if (r.cellules.some((c) => /\.\s*\.\s*\./.test(c.texte))) return true;
  if (r.cellules.length < 2) return false;
  const dernier = r.cellules[r.cellules.length - 1];
  return /^\d{1,3}(\s*-\s*\d{1,3})?$/.test(dernier.texte.trim()) && dernier.x > 380;
}

function intitules(rangees: Rangee[]): { i: number; fin: number; pays: string; arrete: string }[] {
  /* ET UN INTITULÉ DE TABLEAU EST SUIVI DE SON TABLEAU : la première ligne à
     code ISIN se trouve dans les quelques rangées qui suivent. */
  const suiviDUneLigne = (i: number) => {
    for (let k = i + 1; k < Math.min(i + 14, rangees.length); k++) if (rangees[k].cellules.some((c) => ISIN.test(c.texte.replace(/\s/g, "")))) return true;
    return false;
  };
  /**
   * UN TABLEAU A UNE FIN, ET C'EST LE TABLEAU SUIVANT.
   *
   * Sans borne, le registre du Tchad avalait les listes d'achats-ventes et de
   * pensions livrées qui le suivent, qui portent elles aussi des codes ISIN :
   * 1 062 lignes pour le Tchad contre 42 pour le Cameroun, et un encours CEMAC
   * de 7 325 milliards là où le bulletin écrit 4 993,9. La borne est le
   * prochain intitulé numéroté, quel qu'il soit.
   */
  const bornes = rangees.map((r, i) => (/^tableau\s*n?°?\s*\d+\s*:/.test(aplat(texteDe(r))) && !estSommaire(r) ? i : -1)).filter((i) => i >= 0);
  const out: { i: number; fin: number; pays: string; arrete: string }[] = [];
  for (let i = 0; i < rangees.length; i++) {
    /**
     * UN INTITULÉ TIENT PARFOIS SUR DEUX LIGNES, ET LA DATE EST SUR LA
     * SECONDE. « Tableau 7 : Situation de l'encours des valeurs du Trésor de
     * la République Centrafricaine » puis, quatorze points plus bas, « au 30
     * juin 2022 ». Sans date, le tableau entier était ignoré : quatre pays
     * sur six manquaient dans les bulletins 15 et 16.
     */
    const suite = rangees[i + 1] && rangees[i + 1].page === rangees[i].page ? texteDe(rangees[i + 1]) : "";
    const seul = texteDe(rangees[i]);
    const t = dateDeLIntitule(seul) ? seul : `${seul} ${suite}`;
    if (!/situation de(?:s| l) encours des valeurs du tresor/.test(phrase(t))) continue;
    if (estSommaire(rangees[i]) || !suiviDUneLigne(i)) continue;
    const pays = paysDeLIntitule(t);
    const arrete = dateDeLIntitule(t);
    if (pays && arrete) out.push({ i, fin: bornes.find((b) => b > i) ?? rangees.length, pays, arrete });
  }
  return out;
}

/**
 * La maturité, qui n'est pas toujours sur la ligne de données.
 *
 * Elle est centrée verticalement sur trois rangées quand la mise en page la
 * fait tenir sur deux mots. On cherche donc, dans la bande d'abscisses qui
 * sépare la seconde date du premier des trois nombres, ce qui se lit comme une
 * durée, sur la rangée même puis sur ses voisines immédiates.
 */
function maturite(rangees: Rangee[], k: number, xMin: number, xMax: number): string | undefined {
  const DUREE = /^(\d+)\s*(semaines?|mois|ans?)$/i;
  const UNITE = /^(semaines?|mois|ans?)$/i;
  const dans = (r: Rangee) => r.cellules.filter((c) => c.x >= xMin - 6 && c.x + c.largeur <= xMax + 6);
  const sur = dans(rangees[k]);
  const entiere = sur.find((c) => DUREE.test(c.texte.trim()));
  if (entiere) return entiere.texte.trim().replace(/\s+/g, " ");
  /* Les deux morceaux : le chiffre d'un côté, l'unité de l'autre, à une ou
     deux rangées de là et sur la même page. */
  const voisines = [rangees[k - 1], rangees[k], rangees[k + 1], rangees[k - 2], rangees[k + 2]].filter((r): r is Rangee => Boolean(r) && r.page === rangees[k].page);
  let chiffre: string | undefined;
  let unite: string | undefined;
  for (const r of voisines) {
    for (const c of dans(r)) {
      const t = c.texte.trim();
      if (!chiffre && /^\d+$/.test(t)) chiffre = t;
      else if (!unite && UNITE.test(t)) unite = t.toLowerCase();
    }
  }
  return chiffre && unite ? `${chiffre} ${unite}` : undefined;
}

/**
 * L'ENCOURS LIGNE À LIGNE, TEL QUE LE BULLETIN L'IMPRIME.
 *
 * Les champs se reconnaissent à leur FORME, non à leur abscisse : deux
 * générations de mise en page se succèdent entre 2018 et 2022, et une grille
 * apprise sur l'une ne vaut rien sur l'autre. Un code ISIN, deux dates en
 * JJ/MM/AAAA, puis trois nombres dont le dernier est l'encours : cela ne
 * change pas, et l'identité « nombre × faciale = encours » le confirme.
 */
export function encoursDuBulletin(rangees: Rangee[], numero?: number): EncoursDuBulletin {
  const reserves: string[] = [];
  const lignes: LigneEncours[] = [];
  const sousTotaux: SousTotal[] = [];
  const totaux: { pays: string; montant: number; arrete: string }[] = [];
  const tetes = intitules(rangees);
  if (!tetes.length) return { numero, lignes, sousTotaux, totaux, reserves: ["aucun tableau d'encours dans ce bulletin"] };

  /** Le tableau auquel appartient la rangée k : celui dont elle est DEDANS. */
  const teteDe = (k: number) => tetes.find((x) => k > x.i && k < x.fin);

  /* Les lignes, et les sous-totaux, dans l'ordre du document. */
  interface Brute {
    k: number;
    ligne: LigneEncours;
  }
  const brutes: Brute[] = [];
  for (let k = 0; k < rangees.length; k++) {
    const r = rangees[k];
    const tete = teteDe(k);

    const txt = texteDe(r);
    const tot = phrase(txt).match(/^total de l encours des valeurs du tresor/);
    if (tot && tete) {
      const nombres = r.cellules.map((c) => montant(c.texte)).filter((n): n is number => n != null);
      const m = nombres[nombres.length - 1];
      if (m != null) totaux.push({ pays: tete.pays, montant: m, arrete: tete.arrete });
      continue;
    }
    const st = txt.match(/sous\s*-?\s*total\s+(BTA|OTA)/i);
    if (st && tete) {
      const nombres = r.cellules.map((c) => montant(c.texte)).filter((n): n is number => n != null);
      const m = nombres[nombres.length - 1];
      if (m != null) sousTotaux.push({ pays: tete.pays, instrument: st[1].toUpperCase(), montant: m, arrete: tete.arrete });
      continue;
    }

    const cellulesIsin = r.cellules.filter((c) => ISIN.test(c.texte.replace(/\s/g, "")));
    if (!cellulesIsin.length || !tete) continue;
    const isin = cellulesIsin[0].texte.replace(/\s/g, "");

    const dates = r.cellules.filter((c) => DATE.test(c.texte.trim())).sort((a, b) => a.x - b.x);
    const iso = (s: string) => {
      const m = s.trim().match(DATE);
      return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
    };

    const nombres = r.cellules
      .filter((c) => !ISIN.test(c.texte.replace(/\s/g, "")) && !DATE.test(c.texte.trim()) && montant(c.texte) != null)
      .sort((a, b) => a.x - b.x);
    if (nombres.length < 1) continue;
    const encours = montant(nombres[nombres.length - 1].texte);
    if (encours == null) continue;
    const faciale = nombres.length >= 2 ? montant(nombres[nombres.length - 2].texte) : undefined;
    const titres = nombres.length >= 3 ? montant(nombres[nombres.length - 3].texte) : undefined;

    const explicite = r.cellules.find((c) => /^(BTA|OTA)$/i.test(c.texte.trim()));
    const finDate = dates.length >= 2 ? dates[1].x + dates[1].largeur : (dates[0]?.x ?? 0) + (dates[0]?.largeur ?? 0);
    const debutNombres = nombres.length >= 3 ? nombres[nombres.length - 3].x : nombres[0].x;

    brutes.push({
      k,
      ligne: {
        pays: tete.pays,
        isin,
        instrument: instrumentDeLIsin(isin) ?? explicite?.texte.trim().toUpperCase(),
        emisLe: dates[0] ? iso(dates[0].texte) : undefined,
        echeanceLe: dates[1] ? iso(dates[1].texte) : undefined,
        tenor: maturite(rangees, k, finDate, debutNombres),
        titres,
        faciale,
        encours,
        arrete: tete.arrete,
      },
    });
  }
  lignes.push(...brutes.map((b) => b.ligne));

  /* ---- CE QUE LE DOCUMENT VÉRIFIE DE LUI-MÊME ---- */

  let identite = 0;
  for (const l of lignes) {
    if (l.titres == null || l.faciale == null) continue;
    if (Math.abs(l.titres * l.faciale - l.encours) > 1) identite++;
  }
  if (identite) reserves.push(`${identite} ligne(s) où le nombre de titres multiplié par la valeur faciale ne fait pas l'encours`);

  /**
   * LE TOTAL DU PAYS EST LE CONTRÔLE QUI COMPTE.
   *
   * Les sous-totaux par instrument se trompent d'étiquette ; le total du
   * tableau, lui, ne dépend d'aucune étiquette. S'il ne tombe pas, c'est que
   * des lignes manquent, et il dit combien il en manque.
   */
  for (const t of totaux) {
    const somme = lignes.filter((l) => l.pays === t.pays && l.arrete === t.arrete).reduce((s, l) => s + l.encours, 0);
    if (Math.abs(somme - t.montant) > 1) {
      reserves.push(
        `${t.pays} au ${t.arrete} : total imprimé ${(t.montant / 1e9).toFixed(1)} Mds contre ${(somme / 1e9).toFixed(1)} Mds lus, écart ${((somme - t.montant) / 1e9).toFixed(1)} Mds`,
      );
    }
  }
  /* Les sous-totaux ne servent plus qu'à repérer un bloc sans lignes. */
  for (const st of sousTotaux) {
    const somme = lignes.filter((l) => l.pays === st.pays && l.arrete === st.arrete && l.instrument === st.instrument).reduce((s, l) => s + l.encours, 0);
    if (!somme) reserves.push(`sous-total ${st.instrument} ${st.pays} au ${st.arrete} : aucune ligne rattachée`);
  }
  const paysSansTotal = [...new Set(lignes.map((l) => `${l.pays}|${l.arrete}`))].filter((c) => !totaux.some((t) => `${t.pays}|${t.arrete}` === c));
  if (paysSansTotal.length) reserves.push(`${paysSansTotal.length} tableau(x) sans ligne de total imprimée : ${paysSansTotal.join(", ")}`);

  /**
   * UN TABLEAU QUE LA BEAC PUBLIE INCOMPLET.
   *
   * Le tableau 8 du numéro 16 s'arrête après le bloc BTA du Congo : pas de
   * bloc OTA, pas de total, et le tableau 9 suit immédiatement. L'encours
   * congolais y tombe à 206 milliards entre 985 et 1 250. Ce n'est pas notre
   * lecture qui est courte, c'est la publication, et il faut le dire plutôt
   * que de compléter ce que personne n'a écrit.
   */
  for (const c of paysSansTotal) {
    const [pays, arrete] = c.split("|");
    const siennes = lignes.filter((l) => l.pays === pays && l.arrete === arrete);
    const genres = new Set(siennes.map((l) => l.instrument));
    if (genres.size === 1) {
      reserves.push(`${pays} au ${arrete} : ni total imprimé ni ligne ${[...genres][0] === "BTA" ? "OTA" : "BTA"} ; le tableau est publié incomplet`);
    }
  }

  const sansInstrument = lignes.filter((l) => !l.instrument).length;
  if (sansInstrument) reserves.push(`${sansInstrument} ligne(s) dont le code ne dit pas l'instrument`);

  return { numero, lignes, sousTotaux, totaux, reserves };
}

/** Le numéro du bulletin, tel que son titre l'écrit. */
export function numeroDuBulletin(titre: string): number | undefined {
  const m = titre.match(/n°\s*(\d+)/i);
  return m ? Number(m[1]) : undefined;
}

export async function encoursDuPdf(bytes: Uint8Array, titre = ""): Promise<EncoursDuBulletin> {
  const rangees = await rangeesDuPdf(bytes);
  return encoursDuBulletin(rangees, numeroDuBulletin(titre));
}
