/**
 * LE PAS D'AMORTISSEMENT, LU DANS L'HISTOIRE AU LIEU D'ÊTRE SUPPOSÉ.
 *
 * CE QUE LE BULLETIN NE PUBLIE PAS. La table d'encours donne le type
 * d'amortissement (CONSTANT ou IN FINE), la périodicité et la maturité, mais
 * ni le nombre de tranches ni le DIFFÉRÉ. Une maquette qui étale l'encours
 * sur toutes les échéances restantes paraît raisonnable et se trompe :
 *
 *   BDEAC 5,45 % 2020-2027, SEPT ans annoncés
 *   10 000 → 8 000 → 6 000 → 4 000, pas de 2 000
 *   donc CINQ tranches, et deux ans de différé que personne n'imprime.
 *
 * MAIS LE NOMINAL RESTANT EST PUBLIÉ À CHAQUE SÉANCE, et son pas d'un palier
 * au suivant EST la tranche. Trois ans et demi d'historique quotidien
 * rendent donc ce que le document tait. C'est l'intérêt d'avoir gardé la
 * série plutôt qu'un instantané.
 *
 * MESURÉ LE 14 OCTOBRE 2026 sur les quinze lignes dont un palier a déjà
 * bougé : le pas tombe TOUJOURS sur une fraction ronde du nominal d'origine,
 * 2 000, 2 500, 1 250 ou 5 000, soit cinq, quatre, huit ou deux tranches.
 * C'est l'invariant qui garde cette lecture : un pas qui ne divise pas le
 * nominal en un nombre entier de tranches n'est pas un pas, c'est une
 * mauvaise lecture, et on refuse plutôt que de deviner.
 *
 * CE GARDE A DÉJÀ SERVI. Deux lignes rendaient un pas incohérent, et la cause
 * n'était pas économique : quatre rangées portaient les titres de leur
 * voisine, un décalage d'une rangée dans la table. L'invariant les a
 * désignées avant qu'on ait écrit la moindre règle.
 *
 * Module sans dépendance d'exécution : il se lit du serveur comme du
 * navigateur, et un test l'atteint sans monter de base.
 */

/** Un palier du nominal restant, tel que la série le donne. */
export interface Palier {
  nominal: number;
  /** La première séance où ce palier paraît. */
  depuis: string;
}

export type SourceDuPas = "mesure" | "suppose";

export interface Amortissement {
  /** La tranche, en francs par titre. Absente quand rien ne se démontre. */
  pas?: number;
  /** Le nombre total de tranches : nominal d'origine ÷ pas. */
  tranches?: number;
  /** Ce qui reste à amortir, en tranches. */
  restantes?: number;
  /** Mesuré dans l'histoire, ou déduit faute d'un palier observé. */
  source: SourceDuPas;
  /** Les paliers qui ne tombent pas sur le pas : ils désignent une mauvaise lecture. */
  aberrants: Palier[];
}

/** Deux nominaux à moins d'un centime sont le même palier. */
const MEME = 0.011;
/** Au-delà, « nominal ÷ pas » n'est plus un entier et le pas est refusé. */
const ENTIER = 1e-6;

/**
 * Le pas, choisi par sa FRÉQUENCE et non par sa moyenne.
 *
 * Une moyenne se laisse déplacer par un seul palier faux, et c'est
 * précisément le cas qu'on veut survivre : sur ACEP1, deux séances mal lues
 * insèrent un palier à 2 500 entre 8 000 et 6 000, et la moyenne des écarts
 * passe de 2 000 à 3 750. Le pas le plus fréquent, lui, ne bouge pas.
 */
function pasLePlusFrequent(ecarts: number[], nominalOrigine: number): number | undefined {
  if (!ecarts.length) return undefined;
  const comptes = new Map<number, number>();
  for (const e of ecarts) {
    const clef = [...comptes.keys()].find((k) => Math.abs(k - e) < MEME) ?? e;
    comptes.set(clef, (comptes.get(clef) ?? 0) + 1);
  }
  /* L'INVARIANT FILTRE LES CANDIDATS, IL NE SE CONTENTE PAS D'UN VETO APRÈS
     COUP. Sur ACEP1 les deux écarts 2 000 et 5 500 paraissent une fois
     chacun : départager par la fréquence seule revient à tirer au sort, et
     le premier jet prenait 5 500. Un pas qui ne divise pas le nominal en
     tranches entières n'est pas un candidat, et l'égalité disparaît. */
  const entiers = [...comptes.entries()].filter(([pas]) => {
    const k = nominalOrigine / pas;
    return pas > 0 && Math.abs(k - Math.round(k)) < ENTIER;
  });
  if (!entiers.length) return undefined;
  return entiers.sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
}

/**
 * Ce que l'histoire d'une ligne dit de son amortissement.
 *
 * `paliers` se donne dans l'ordre d'apparition. `nominalOrigine` vient du
 * montant levé divisé par le nombre de titres, qui vaut 10 000 sur toute la
 * cote et se vérifie ailleurs.
 */
export function lireAmortissement(paliers: Palier[], nominalOrigine: number, nominalActuel?: number): Amortissement {
  const tri = [...paliers].sort((a, b) => a.depuis.localeCompare(b.depuis));
  const actuel = nominalActuel ?? tri[tri.length - 1]?.nominal ?? nominalOrigine;

  const ecarts: number[] = [];
  for (let i = 1; i < tri.length; i++) {
    const d = tri[i - 1].nominal - tri[i].nominal;
    if (d > MEME) ecarts.push(d);
  }
  const pas = pasLePlusFrequent(ecarts, nominalOrigine);

  /* L'INVARIANT QUI GARDE LA LECTURE : un pas divise le nominal d'origine en
     un nombre ENTIER de tranches. Sans lui, n'importe quel écart entre deux
     mauvaises lectures passerait pour un calendrier d'amortissement. */
  const brut = pas ? nominalOrigine / pas : NaN;
  const entier = Number.isFinite(brut) && Math.abs(brut - Math.round(brut)) < ENTIER;
  if (!pas || !entier) {
    return { source: "suppose", aberrants: [] };
  }

  /* Un palier qui ne tombe pas sur la grille du pas n'est pas un palier :
     c'est une rangée mal lue, et elle se nomme plutôt que de se fondre. */
  const aberrants = tri.filter((p) => {
    const k = (nominalOrigine - p.nominal) / pas;
    return Math.abs(k - Math.round(k)) > 1e-3;
  });

  return {
    pas,
    tranches: Math.round(brut),
    restantes: Math.round(actuel / pas),
    source: "mesure",
    aberrants,
  };
}

/* ---------------- l'échéancier qui en découle ---------------- */

export const MOIS_PAR_PERIODE: Record<string, number> = { AN: 12, SEM: 6, TRIM: 3, MEN: 1 };

export interface LigneAAmortir {
  isin: string;
  /** Le coupon facial, en pour cent. */
  tauxPct: number;
  /** L'encours restant, en francs. */
  encours: number;
  /** « CONSTANT » ou « IN FINE ». */
  amortissement: string;
  periodicite: string;
  /** La prochaine échéance de coupon, au format ISO. */
  prochainCoupon: string;
  /** L'échéance finale, au format ISO. */
  echeance: string;
  /** Le nombre de tranches restantes, quand l'histoire le donne. */
  tranchesRestantes?: number;
}

export interface Tombee {
  isin: string;
  quand: string;
  capital: number;
  coupon: number;
  /** Le capital vient-il d'un pas mesuré, ou d'un étalement supposé ? */
  source: SourceDuPas;
}

const ajouterMois = (iso: string, n: number): string => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Le service d'une ligne, capital et coupons, date par date.
 *
 * LES TRANCHES SONT LES DERNIÈRES ÉCHÉANCES, PAS LES PREMIÈRES, et c'est ce
 * qui rend le différé correct : une ligne à sept ans qui s'amortit en cinq
 * tranches ne rembourse rien pendant deux ans, puis un cinquième par an. Les
 * coupons, eux, tombent à CHAQUE échéance dès la première.
 *
 * LE COUPON SE CALCULE SUR LE SOLDE, qui décroît : le poser sur l'encours
 * d'aujourd'hui surestimerait les dernières années de toute ligne
 * amortissable, c'est-à-dire des trois quarts de la cote.
 */
export function echeancierDe(l: LigneAAmortir): Tombee[] {
  const pas = MOIS_PAR_PERIODE[l.periodicite] ?? 12;
  const dates: string[] = [];
  for (let d = l.prochainCoupon; d <= l.echeance; d = ajouterMois(d, pas)) dates.push(d);
  if (!dates.length) dates.push(l.echeance);

  if (l.amortissement === "IN FINE") {
    return dates.map((quand, i) => ({
      isin: l.isin,
      quand,
      capital: i === dates.length - 1 ? l.encours : 0,
      coupon: l.encours * (l.tauxPct / 100) * (pas / 12),
      source: "mesure" as const,
    }));
  }

  /* Sans tranche mesurée, on étale sur ce qui reste et on le DIT : la
     colonne « source » est ce qui empêche de prendre une supposition pour
     une lecture quand le chiffre arrive dans un tableau. */
  const n = l.tranchesRestantes && l.tranchesRestantes > 0 ? Math.min(l.tranchesRestantes, dates.length) : dates.length;
  const source: SourceDuPas = l.tranchesRestantes && l.tranchesRestantes > 0 ? "mesure" : "suppose";
  const tranche = l.encours / n;
  const premiere = dates.length - n;

  let solde = l.encours;
  return dates.map((quand, i) => {
    const coupon = solde * (l.tauxPct / 100) * (pas / 12);
    const capital = i >= premiere ? tranche : 0;
    solde -= capital;
    return { isin: l.isin, quand, capital, coupon, source };
  });
}
