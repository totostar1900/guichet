import type { Rangee } from "./boc-geometrie";

/**
 * LA STATISTIQUE MENSUELLE DU MARCHÉ DES VALEURS DU TRÉSOR.
 *
 * C'est la pièce qui porte L'ENCOURS OFFICIEL, celui que la BEAC calcule
 * elle-même, pays par pays. Nous avons passé deux jours à reconstituer la
 * dette adjugée à partir des communiqués, et nous avions raison de le faire :
 * la reconstitution dit QUI A SERVI QUOI ET QUAND, ce que ce tableau ne dit
 * pas. Mais le total, lui, est ici, et il se compare au nôtre.
 *
 * Trente-deux numéros depuis septembre 2021, tous avec une couche texte : la
 * lecture ne coûte rien, ni modèle ni jeton.
 *
 * CE QU'ON EN TIRE, ET RIEN D'AUTRE. Deux tables sur seize pages :
 *
 *   l'ENCOURS par pays, en millions de francs, qui est le dénominateur de tout
 *   rapprochement ;
 *   le COÛT DES RESSOURCES par pays et par instrument, en pour cent, qui est la
 *   seule mesure publiée du prix que chaque Trésor paie.
 *
 * Le reste de la pièce (structure des détenteurs, maturités résiduelles,
 * marché secondaire) est réel et lisible, et sera pris quand une page en aura
 * besoin : un lecteur qui ramasse tout rend des champs que personne ne vérifie.
 *
 * LA PIÈCE SE VÉRIFIE ELLE-MÊME, et c'est pour cela qu'on la lit ainsi : la
 * ligne « Total » doit faire la somme des six pays. Si elle ne la fait pas,
 * c'est que la colonne lue n'est pas la bonne, et on refuse plutôt que de
 * publier un encours faux.
 */

const MOIS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
const aplat = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Les six Trésors, tels que la pièce les écrit en capitales ou non. */
const PAYS: [RegExp, string][] = [
  [/^cameroun$/, "Cameroun"],
  [/^(rca|republique centrafricaine|centrafrique)$/, "RCA"],
  [/^congo$/, "Congo"],
  [/^gabon$/, "Gabon"],
  [/^guinee equatoriale$/, "Guinée éq."],
  [/^tchad$/, "Tchad"],
];

export interface EncoursPays {
  pays: string;
  /** Le mois de la colonne, en AAAA-MM : la table est un historique. */
  mois: string;
  /** En millions de francs, tel que la table l'écrit. */
  montant: number;
}

/**
 * LES COLONNES SONT DES MOIS, ET LA TABLE EST UN HISTORIQUE.
 *
 * « PAYS | juin-18* | juil-21 | juillet-22 | juil-23 | juil-24 | juil-25 |
 * juin-26 | juil-26 | Variation ». Une seule pièce porte donc huit relevés
 * par pays, et c'est heureux : sur trente-deux numéros, deux seulement ont
 * une couche texte, les autres étant des images. Ne lire que la dernière
 * colonne aurait rendu deux points là où il y en a seize.
 */
export function colonnes(entete: string): string[] {
  const f = aplat(entete);
  const abrev = ["jan", "fev", "mar", "avr", "mai", "juin", "juil", "aou", "sep", "oct", "nov", "dec"];
  const out: string[] = [];
  for (const m of f.matchAll(/\b(jan|fev|mar|avr|mai|juin|juil|aou|sep|oct|nov|dec)[a-z.]*\s*-\s*(\d{2})\b/g)) {
    const i = abrev.indexOf(m[1]);
    if (i < 0) continue;
    out.push(`20${m[2]}-${String(i + 1).padStart(2, "0")}`);
  }
  return out;
}

export interface CoutPays {
  pays: string;
  instrument: "BTA" | "OTA";
  /** En pour cent. */
  taux: number;
}

export interface StatistiqueMensuelle {
  /** Le mois de la pièce, en AAAA-MM. */
  mois?: string;
  /** Le numéro que la BEAC lui donne. */
  numero?: number;
  encours: EncoursPays[];
  /** Le total que la pièce imprime, en millions. */
  total?: number;
  couts: CoutPays[];
  reserves: string[];
}

/** « N° 60 juillet 2026 » → { numero: 60, mois: "2026-07" }. */
export function entete(titre: string): { numero?: number; mois?: string } {
  const f = aplat(titre);
  const n = f.match(/n[°o]\s*(\d{1,3})/);
  const m = f.match(new RegExp(`(${MOIS.join("|")})\\s+(\\d{4})`));
  return {
    numero: n ? Number(n[1]) : undefined,
    mois: m ? `${m[2]}-${String(MOIS.indexOf(m[1]) + 1).padStart(2, "0")}` : undefined,
  };
}

/**
 * « 2 061 322 » → 2061322 ; « 2,59% » → null ; « - » → null.
 *
 * LE POUR CENT N'EST PAS UN MONTANT, et c'est ce qui permet de trouver la
 * bonne colonne sans compter les colonnes : la dernière cellule d'une ligne
 * d'encours est une variation, l'avant-dernière est le mois courant.
 */
export function montant(s: string): number | null {
  const t = s.replace(/\s| /g, "");
  if (!t || t === "-" || /%/.test(t)) return null;
  if (!/^-?\d+$/.test(t)) return null;
  return Number(t);
}

/** « 6,83 » → 6.83 ; « - » → null ; un montant à séparateurs → null. */
export function pourcent(s: string): number | null {
  const t = s.replace(/\s| |%/g, "");
  if (!t || t === "-") return null;
  if (!/^\d{1,3},\d{1,2}$/.test(t)) return null;
  return Number(t.replace(",", "."));
}

const cellules = (r: Rangee): string[] => r.cellules.map((c) => c.texte.trim());

/**
 * Les deux tables de la pièce, et les réserves qui disent ce qui manque.
 *
 * `rangees` vient de `rangeesDuPdf` : la lecture géométrique, qui garde les
 * cellules séparées là où le texte aplati les colle.
 */
export function lireStatistiqueMensuelle(rangees: Rangee[], titre: string): StatistiqueMensuelle {
  const reserves: string[] = [];
  const { numero, mois } = entete(titre);

  /**
   * L'ENCOURS. La ligne d'un pays porte son nom puis une suite de montants,
   * du plus ancien au plus récent, et finit par une variation en pour cent.
   * LE MOIS COURANT EST DONC LE DERNIER MONTANT, et on ne compte aucune
   * colonne : la pièce en a ajouté une chaque année depuis 2021.
   */
  const encours: EncoursPays[] = [];
  let total: number | undefined;
  let colonnesVues: string[] = [];
  const parPays = new Map<string, number[]>();
  let totaux: number[] = [];
  for (const r of rangees) {
    const c = cellules(r);
    if (!c.length) continue;
    const joint = c.join(" ");
    const tete = aplat(c[0]).replace(/\s+/g, " ").trim();
    /* L'en-tête se reconnaît à son premier mot et porte les mois en clair. */
    if (tete === "pays" && !colonnesVues.length) colonnesVues = colonnes(joint);
    const nom = PAYS.find(([re]) => re.test(tete))?.[1];
    const estTotal = tete === "total";
    if (!nom && !estTotal) continue;
    const montants = c.slice(1).map(montant).filter((x): x is number => x != null);
    /* Une ligne d'encours porte au moins quatre colonnes d'historique ; les
       tables de taux, elles, n'ont pas de montants du tout. */
    if (montants.length < 4) continue;
    if (estTotal) {
      if (!totaux.length) totaux = montants;
    } else if (nom && !parPays.has(nom)) parPays.set(nom, montants);
  }

  /**
   * LE CONTRÔLE QUE LA PIÈCE S'IMPOSE À ELLE-MÊME, ET COLONNE PAR COLONNE.
   *
   * Le total imprimé fait la somme des six pays, pour CHAQUE mois de
   * l'historique. C'est un contrôle bien plus fort que sur la seule dernière
   * colonne : une colonne décalée d'un cran se verrait sur les sept autres.
   * Un écart d'un million est de l'arrondi ; au-delà, la colonne est écartée.
   */
  if (parPays.size && totaux.length) {
    const n = Math.min(totaux.length, ...[...parPays.values()].map((v) => v.length));
    if (colonnesVues.length && colonnesVues.length !== n) {
      reserves.push(`${colonnesVues.length} mois en en-tête pour ${n} colonne(s) de chiffres : les colonnes ne sont pas nommées`);
      colonnesVues = [];
    }
    let refusees = 0;
    for (let i = 0; i < n; i++) {
      const somme = [...parPays.values()].reduce((s, v) => s + v[i], 0);
      if (Math.abs(somme - totaux[i]) > 1) {
        refusees++;
        continue;
      }
      const moisCol = colonnesVues[i] ?? (i === n - 1 ? mois : undefined);
      if (!moisCol) continue;
      for (const [p, v] of parPays) encours.push({ pays: p, mois: moisCol, montant: v[i] });
      if (moisCol === mois) total = totaux[i];
    }
    if (refusees) reserves.push(`${refusees} colonne(s) sur ${n} dont le total imprimé ne fait pas la somme des pays : elles sont écartées`);
    if (parPays.size < 6) reserves.push(`${6 - parPays.size} pays sans ligne dans la table`);
  }
  if (!encours.length && !reserves.length) reserves.push("aucune table d'encours reconnue");

  /**
   * LE COÛT DES RESSOURCES. La table a deux sections, « BTA » puis « OTA »,
   * et les mêmes six pays dans chacune : sans suivre la section en cours, on
   * écraserait le coût du bon par celui de l'obligation.
   */
  const couts: CoutPays[] = [];
  let section: "BTA" | "OTA" | null = null;
  let dansLeCout = false;
  for (const r of rangees) {
    const c = cellules(r);
    if (!c.length) continue;
    const ligne = aplat(c.join(" "));
    if (/cout des ressources levees/.test(ligne)) dansLeCout = true;
    /* La table suivante parle de participation : le coût s'arrête là. */
    if (/participation aux emissions/.test(ligne)) dansLeCout = false;
    if (!dansLeCout) continue;
    const tete = aplat(c[0]).replace(/\s+/g, " ").trim();
    if (tete === "bta") section = "BTA";
    else if (tete === "ota") section = "OTA";
    if (!section) continue;
    const nom = PAYS.find(([re]) => re.test(tete))?.[1];
    if (!nom) continue;
    const taux = c.slice(1).map(pourcent).filter((x): x is number => x != null);
    if (!taux.length) continue;
    const dernier = taux[taux.length - 1];
    if (couts.some((x) => x.pays === nom && x.instrument === section)) continue;
    couts.push({ pays: nom, instrument: section, taux: dernier });
  }
  if (!couts.length) reserves.push("aucune table de coût des ressources reconnue");

  /* UN TRÉSOR NE SE FINANCE NI SOUS UN POUR CENT NI AU-DESSUS DE VINGT.
     Au-delà, c'est une cellule prise dans la mauvaise colonne. */
  for (const x of couts.filter((x) => x.taux < 1 || x.taux > 20)) {
    reserves.push(`${x.pays} ${x.instrument} à ${x.taux} % : hors de ce qu'un Trésor paie, la cellule est douteuse`);
  }

  return { mois, numero, encours, total, couts: couts.filter((x) => x.taux >= 1 && x.taux <= 20), reserves };
}
