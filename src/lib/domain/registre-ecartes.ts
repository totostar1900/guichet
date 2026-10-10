/**
 * LE REGISTRE DES PERSONNES ÉCARTÉES.
 *
 * Une mesure vit sur un compte. Fermer le compte efface donc la mesure, et
 * rien n'empêche la même personne de revenir le lendemain avec une autre
 * adresse et un autre numéro : c'est le seul endroit du produit où tout le
 * travail de la tenue et des mesures s'annule d'un geste. Ce registre vit à
 * côté des comptes, et c'est pour cela qu'il existe.
 *
 * IL NE REFUSE JAMAIS TOUT SEUL. Une correspondance lève un drapeau sur le
 * dossier, et une personne nommée tranche en disant pourquoi. Refuser
 * d'ouvrir un compte est une décision qui doit porter un nom : une machine
 * qui la prendrait sur une homonymie en ferait une décision que personne
 * n'a prise, et que personne ne peut donc expliquer.
 *
 * LE NUMÉRO DE PIÈCE EST ÉCRIT EN CLAIR, et ce choix mérite sa phrase. On
 * peut n'en garder qu'une empreinte, pour que le registre ne soit pas une
 * liste lisible de gens qu'on refuse. Trois raisons l'ont emporté : la
 * personne inscrite était presque toujours cliente, donc la maison détient
 * déjà son numéro dans son dossier, et le hacher ici ne protège rien ;
 * personne ne pourrait plus vérifier une inscription, ni voir la faute de
 * frappe qui l'empêche de jamais correspondre ; et une empreinte ne compare
 * qu'à l'identique, là où une ressemblance de nom et de date de naissance
 * attrape celui qui revient avec une pièce neuve. Le registre est donc
 * protégé exactement comme les dossiers dont il sort : desk seulement.
 *
 * CE N'EST PAS UN MUR, C'EST UN FILET. Un chiffre inversé y passe. Le dire
 * vaut mieux que le laisser croire : le registre attrape celui qui revient,
 * pas celui qui se fabrique une identité.
 */

/**
 * Les motifs, pris dans une liste fermée, comme pour une mesure : une cause
 * qui se réécrit n'est plus contestable.
 *
 * `conformite` ferme la bouche du desk, et ce silence est la loi : prévenir
 * quelqu'un qu'il est soupçonné est une faute au regard des textes LBC/FT.
 * `sansTerme` dit les deux seuls cas où une inscription peut ne pas finir,
 * plus celui où la personne l'a elle-même demandé.
 */
export const MOTIFS_D_ECART = {
  fraude_averee: { libelle: "Fraude avérée", conformite: true, sansTerme: false },
  faux_documents: { libelle: "Pièces falsifiées", conformite: true, sansTerme: false },
  declaration_anif: { libelle: "Déclaration à l'ANIF", conformite: true, sansTerme: true },
  sanctions: { libelle: "Figure sur une liste de sanctions", conformite: true, sansTerme: true },
  dette_non_reglee: { libelle: "Dette non réglée envers la maison", conformite: false, sansTerme: false },
  demande_de_la_personne: { libelle: "À la demande de la personne", conformite: false, sansTerme: true },
} as const;
export type MotifDEcart = keyof typeof MOTIFS_D_ECART;
export const estMotifDEcart = (s: string | undefined): s is MotifDEcart => Boolean(s && s in MOTIFS_D_ECART);

/**
 * Cinq ans, la durée de conservation que les textes LBC/FT imposent déjà aux
 * pièces du dossier : au-delà, la maison n'a plus la trace qui justifierait
 * l'inscription, donc elle ne peut plus la défendre.
 */
export const ANS_D_ECART = 5;

export interface Ecarte {
  /** La clef de la ligne au référentiel. */
  id: string;
  nom: string;
  /** Ce qui distingue deux homonymes, et sans quoi une ressemblance ne vaut rien. */
  naissance?: string;
  pieceType?: string;
  pieceNumero?: string;
  motif: MotifDEcart;
  /** Pour le desk seulement : ce que la personne qui inscrit veut que la suivante sache. */
  note?: string;
  par: string;
  le: string;
  /** Le terme. Absent, l'inscription ne finit pas : réservé aux motifs qui le permettent. */
  jusquAu?: string;
  /* UNE INSCRIPTION LEVÉE N'EST JAMAIS SUPPRIMÉE : savoir qu'on a écarté
     quelqu'un puis qu'on s'est ravisé vaut mieux qu'une ligne disparue, et
     c'est la même règle que les instructions arrêtées. */
  leveeLe?: string;
  leveePar?: string;
  leveeMotif?: string;
}

/** Une inscription levée ou échue ne correspond plus à personne. */
export function ecartVivant(e: Ecarte, now = new Date()): boolean {
  if (e.leveeLe) return false;
  return !e.jusquAu || e.jusquAu >= now.toISOString().slice(0, 10);
}

/** Le terme par défaut d'un motif : cinq ans, ou rien quand le motif n'en veut pas. */
export function termeParDefaut(motif: MotifDEcart, now = new Date()): string | undefined {
  if (MOTIFS_D_ECART[motif].sansTerme) return undefined;
  const d = new Date(now);
  d.setFullYear(d.getFullYear() + ANS_D_ECART);
  return d.toISOString().slice(0, 10);
}

/**
 * Le numéro, réduit à ce qui le désigne : « P 0456789 » et « p0456789 » sont
 * le même.
 */
export const clefDeNumero = (numero: string | undefined): string | undefined => {
  const n = (numero ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return n || undefined;
};

const clefDeType = (type: string | undefined): string | undefined => (type ?? "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 12) || undefined;

/**
 * DEUX PIÈCES SONT LA MÊME QUAND LEURS NUMÉROS LE SONT, et que leurs types
 * ne se contredisent pas. Le type compte, parce que deux pays numérotent
 * leurs cartes de la même façon sans parler des mêmes gens. Mais un dossier
 * ne le donne pas toujours : il le porte pour le titulaire et pas pour un
 * représentant légal. Exiger le type alors ferait un registre qui n'attrape
 * jamais celui qui revient en signant pour une société, c'est à dire le cas
 * même qu'on vise.
 * Alors un type manquant ne contredit rien, et le numéro suffit.
 */
export function memePiece(a: { pieceType?: string; pieceNumero?: string }, b: { pieceType?: string; pieceNumero?: string }): boolean {
  const na = clefDeNumero(a.pieceNumero);
  const nb = clefDeNumero(b.pieceNumero);
  if (!na || !nb || na !== nb) return false;
  const ta = clefDeType(a.pieceType);
  const tb = clefDeType(b.pieceType);
  return !ta || !tb || ta === tb;
}

/** Le nom, réduit à ce qui le compare : accents, casse et espaces en trop ne distinguent personne. */
export const clefDeNom = (nom: string | undefined): string =>
  (nom ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

/** Une personne telle qu'un dossier la présente : le titulaire, ou l'un de ceux qui agissent pour lui. */
export interface PersonneDuDossier {
  /** « le titulaire », « représentant », « cotitulaire », « bénéficiaire effectif ». */
  role: string;
  nom: string;
  naissance?: string;
  pieceType?: string;
  pieceNumero?: string;
}

export type NiveauDeCorrespondance = "correspondance" | "ressemblance";

export interface Correspondance {
  ecarte: Ecarte;
  personne: PersonneDuDossier;
  niveau: NiveauDeCorrespondance;
  /** Ce sur quoi ça a accroché, pour que le desk n'ait pas à le deviner. */
  sur: string;
}

/**
 * CE QUI ACCROCHE, ET AVEC QUELLE FORCE.
 *
 * Une CORRESPONDANCE est le même numéro de pièce : à une faute de saisie
 * près, c'est la même personne. Une RESSEMBLANCE est le même nom et la même
 * date de naissance avec une autre pièce : c'est celui qui revient avec un
 * passeport neuf, ou c'est un homonyme né le même jour. Les deux appellent
 * un regard ; aucune des deux ne décide.
 *
 * Le nom seul ne produit rien. Sans date de naissance, « Jean Nguema »
 * accrocherait tous les Jean Nguema du pays, et un drapeau qui se lève
 * toujours cesse d'être lu.
 */
export function correspondances(registre: Ecarte[], personnes: PersonneDuDossier[], now = new Date()): Correspondance[] {
  const vivants = registre.filter((e) => ecartVivant(e, now));
  const out: Correspondance[] = [];
  for (const p of personnes) {
    const nom = clefDeNom(p.nom);
    for (const e of vivants) {
      if (memePiece(p, e)) {
        out.push({ ecarte: e, personne: p, niveau: "correspondance", sur: `${p.pieceType ?? "pièce"} ${p.pieceNumero}` });
        continue;
      }
      if (nom && clefDeNom(e.nom) === nom && p.naissance && e.naissance && p.naissance === e.naissance) {
        out.push({ ecarte: e, personne: p, niveau: "ressemblance", sur: `${p.nom}, né(e) le ${p.naissance}` });
      }
    }
  }
  return out;
}

/** Une correspondance pèse plus qu'une ressemblance : l'écran met la plus forte devant. */
export const parForce = (a: Correspondance, b: Correspondance): number => (a.niveau === b.niveau ? 0 : a.niveau === "correspondance" ? -1 : 1);
