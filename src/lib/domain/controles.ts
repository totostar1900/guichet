/**
 * LES CONTRÔLES D'UNE LISTE SUIVENT LA SÉLECTION (14 novembre 2026, « filtres et tri dynamiques sur la base de la sélection »).
 *
 * Une action n'a ni coupon ni date de clôture : lui offrir « Trier par coupon » ou « Date de clôture » est un contrôle qui ne
 * fait rien, et une colonne qui répète « continue » sur chaque ligne est du bruit. Chaque tri, filtre et colonne n'est donc
 * offert que si AU MOINS UNE ligne de la sélection a la donnée qu'il lit.
 *
 * LA SÉLECTION EST LA SECTION ET L'INSTRUMENT CHOISIS, RIEN D'AUTRE. Pas le pays, pas le statut, pas la recherche : si choisir
 * « Gabon » faisait disparaître le filtre « Statut » parce qu'une seule ligne reste, on ne pourrait plus défaire son choix. Un
 * filtre déjà posé reste toujours offert (c'est l'appelant qui le garantit).
 *
 * UNE SÉLECTION VIDE GARDE TOUS LES CONTRÔLES : sans ligne, rien ne dit ce qui manque, et une barre qui se vide pour une section
 * en attente se lit comme une panne.
 *
 * Module sans dépendance : il se lit du serveur comme du navigateur.
 */

export type SortKey = "deadline" | "yield" | "coupon" | "tenor" | "minimum" | "title" | "issuer" | "variation";

/** Ce que la sélection sait de chaque ligne, ni plus ni moins : le module ne lit ni offre ni résumé. */
export interface FaitsDeLigne {
  /** Une vraie date de clôture (pas « cotation continue »). */
  deadline: boolean;
  coupon: boolean;
  /** Une échéance ou une durée. */
  tenor: boolean;
  yield: boolean;
  /** Une variation de cours connue. */
  variation: boolean;
  minimum: boolean;
  famille: string;
  pays: string;
  statut: string;
}

export interface ControlesOfferts {
  tris: SortKey[];
  /** Les colonnes du tableau qui portent une donnée. */
  colonnes: { deadline: boolean; yield: boolean; tenor: boolean; minimum: boolean; variation: boolean };
  filtres: { instrument: boolean; pays: boolean; statut: boolean; duree: boolean; rendement: boolean };
}

/** L'ordre dans lequel les tris s'offrent, celui de la liste d'aujourd'hui. */
const ORDRE_DES_TRIS: SortKey[] = ["deadline", "yield", "coupon", "tenor", "minimum", "title", "issuer", "variation"];

const TOUT: ControlesOfferts = {
  tris: ORDRE_DES_TRIS,
  colonnes: { deadline: true, yield: true, tenor: true, minimum: true, variation: false },
  filtres: { instrument: true, pays: true, statut: true, duree: true, rendement: true },
};

export function controlesOfferts(faits: FaitsDeLigne[]): ControlesOfferts {
  if (faits.length === 0) return TOUT;
  const un = (f: (x: FaitsDeLigne) => boolean) => faits.some(f);
  const distincts = (f: (x: FaitsDeLigne) => string) => new Set(faits.map(f)).size;
  const dispo: Record<SortKey, boolean> = {
    deadline: un((x) => x.deadline),
    yield: un((x) => x.yield),
    coupon: un((x) => x.coupon),
    tenor: un((x) => x.tenor),
    minimum: un((x) => x.minimum),
    variation: un((x) => x.variation),
    title: true,
    issuer: true,
  };
  return {
    tris: ORDRE_DES_TRIS.filter((k) => dispo[k]),
    colonnes: { deadline: dispo.deadline, yield: dispo.yield, tenor: dispo.tenor, minimum: dispo.minimum, variation: dispo.variation },
    filtres: {
      instrument: distincts((x) => x.famille) > 1,
      pays: distincts((x) => x.pays) > 1,
      statut: distincts((x) => x.statut) > 1,
      duree: dispo.tenor,
      rendement: dispo.yield,
    },
  };
}

/**
 * LE TRI PAR DÉFAUT SUIT CE QUE LA LIGNE A : la clôture quand il y en a une, sinon la variation du cours (une action),
 * sinon le rendement, sinon le nom. Un tri demandé par l'adresse mais que la sélection n'offre pas est ignoré, il ne casse rien.
 */
export function triEffectif(demande: string | null | undefined, o: ControlesOfferts): SortKey {
  if (demande && (o.tris as string[]).includes(demande)) return demande as SortKey;
  for (const k of ["deadline", "variation", "yield"] as SortKey[]) if (o.tris.includes(k)) return k;
  return "title";
}

/** Le sens naturel d'un tri : le plus haut d'abord pour ce qui se gagne, le plus proche d'abord pour le reste. */
export const sensNaturel = (k: SortKey): "asc" | "desc" => (k === "yield" || k === "coupon" || k === "variation" ? "desc" : "asc");
