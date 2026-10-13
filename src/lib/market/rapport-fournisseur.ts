import type { MarketBulletin } from "@/lib/domain/market";
import { classer, famille, FAMILLES, SORT, type SortDeLaDonnee } from "./remarques";

/**
 * LE RAPPORT AU FOURNISSEUR DE DONNÉES.
 *
 * POURQUOI IL EXISTE. Jusqu'ici, tout ce que le lecteur relevait restait chez
 * nous : nous réparions ce que nous pouvions et nous taisions le reste. Le
 * 13 octobre 2026, une rangée a montré la limite de cette discipline. Cinq
 * fonds d'Africa Bright, séance du 10 juillet 2026 :
 *
 *   FCP AB CASH  M 10 000  13 136,97  30/12/1935  46 206,00  10/01/1936  …  362,06%
 *
 * « 46 206,00 » est une DATE (le 3 juillet 2026) imprimée en nombre, et
 * « 30/12/1935 » est un MONTANT (13 148) imprimé en date. Les colonnes ont
 * échangé leurs formats. Et surtout, la BVMAC a calculé sa performance sur
 * la cellule corrompue : 362,06 % = (46 206 − 10 000) / 10 000, au centième
 * près, là où le fonds a fait environ 31 %.
 *
 * NOUS NE POUVONS PAS RÉPARER CELA. Le garde qui rend nos corrections sûres
 * est la variation imprimée au bulletin ; ici elle est calculée sur les
 * mauvaises cellules, donc empoisonnée. Il n'y a qu'une issue : le dire à
 * celui qui publie. Ce rapport est cette issue.
 *
 * CE QU'IL DOIT ÊTRE POUR SERVIR. Un tiers ne lit pas nos codes de famille.
 * Chaque ligne porte donc la séance, l'instrument, LE TEXTE IMPRIMÉ tel quel,
 * ce que nous en avons fait, et pourquoi. Sans le texte d'origine, le
 * fournisseur ne peut pas retrouver sa cellule, et le rapport ne sert à rien.
 *
 * Module pur : aucune base, aucun rendu. Il prend des bulletins et rend des
 * lignes, ce qui le rend testable et réutilisable par le classeur comme par
 * le PDF.
 */

/** Ce que nous avons fait d'une donnée, dit en clair pour un lecteur externe. */
export interface LigneRapport {
  seance: string;
  /** Le code de famille, utile au desk, inutile au fournisseur. */
  code: string;
  sort: SortDeLaDonnee;
  /** Le sort, en toutes lettres. */
  devenu: string;
  /** Le fonds, l'ISIN, la section : ce que la remarque désigne. */
  objet: string;
  /** Le diagnostic, en une phrase qu'un tiers comprend. */
  diagnostic: string;
  /** La cellule telle qu'elle est imprimée, quand le message la porte. */
  imprime: string;
  /** Ce que nous avons retenu, quand nous avons retenu quelque chose. */
  retenu: string;
  /** Le message du lecteur, intégral : la preuve. */
  message: string;
}

export interface CompteParSort {
  sort: SortDeLaDonnee;
  libelle: string;
  dit: string;
  ecrite: boolean;
  remarques: number;
  seances: number;
}

export interface CompteParFamille {
  code: string;
  libelle: string;
  genre: string;
  sort: SortDeLaDonnee;
  devenu: string;
  remarques: number;
  seances: number;
}

export interface RapportFournisseur {
  du: string;
  au: string;
  seances: number;
  seancesSansRemarque: number;
  remarques: number;
  parSort: CompteParSort[];
  parFamille: CompteParFamille[];
  /** Ce que nous avons réparé : la colonne qui intéresse le fournisseur. */
  corrections: LigneRapport[];
  /** Ce que nous avons refusé : des données qui manquent chez nous. */
  ecartees: LigneRapport[];
  /** Ce que nous n'avons pas su lire, avec le texte brut. */
  perdues: LigneRapport[];
  /** Les lignes où les chiffres publiés sont eux-mêmes faux. */
  publication: LigneRapport[];
  genere: string;
}

/* ---------------- extraction ---------------- */

const OBJET = [
  /* On garde « FCP », « FCPE », « SICAV » : ils font partie du nom du fonds
     tel qu'il est imprimé, et le destinataire cherche ce nom-là dans son
     propre fichier. Les retirer rendait « AB CASH » pour « FCP AB CASH ». */
  /^OPCVM (.*?) : /, //
  /^(FCP[^:]*?) : /,
  /^(?:Obligation|Action|Capitalisation) ([A-Z]{2}\d{10})/,
  /^([A-Z]{2,6} \([A-Z]{2}\d{10}\))/,
];

/**
 * LE NOM DU FONDS, DÉGAGÉ DE CE QUI LE PRÉCÈDE.
 *
 * La remarque d'un OPCVM porte la rangée telle que le lecteur l'a vue, et
 * cette rangée commence par le gestionnaire et le dépositaire. L'aplatissement
 * du PDF les colle, et la découpe en mange parfois le début : le 1er avril
 * 2026, « ECOBANK CAMEROUN FCP ECOBANK OBLIGATAIRE CEMAC » est devenu
 * « OBANK CAMEROUN FCP ECOBANK OBLIGATAIRE CEMAC », deux lettres perdues.
 *
 * CE RAPPORT SORT DE LA MAISON ET MET EN CAUSE LA PUBLICATION D'UN TIERS.
 * Un document qui reproche à la bourse ses cellules abîmées ne peut pas
 * nommer une société « OBANK » : la première chose que le destinataire
 * vérifierait est ce nom-là, et il ne trouverait rien. Le nom du FONDS, lui,
 * commence toujours à sa forme juridique et se retrouve tel quel dans le
 * fichier du destinataire. On coupe donc là.
 *
 * La réparation est ici, PAS dans le lecteur, et c'est voulu : le message du
 * lecteur reste la preuve brute, intégralement reproduit dans la colonne
 * « message ». Corriger à la source demanderait une relecture des 813
 * séances, qui ne rendrait rien d'autre.
 */
const FORME = /\b(FCP[EC]?|SICAV|FCT)\b/;

const objetDe = (m: string): string => {
  for (const re of OBJET) {
    const x = re.exec(m);
    if (!x) continue;
    const brut = x[1].trim();
    const forme = FORME.exec(brut);
    return forme && forme.index > 0 ? brut.slice(forme.index) : brut;
  }
  return "";
};

/** La date qu'une remarque de VL écartée désigne. */
const dateEcartee = (m: string): string => /VL du (\d{4}-\d{2}-\d{2})/.exec(m)?.[1] ?? "";

/**
 * Les deux côtés d'une réparation : ce que le bulletin imprime, ce qui a été
 * retenu.
 *
 * LA COLONNE « IMPRIMÉ » EST CELLE QUI REND LE RAPPORT UTILISABLE. Sans elle,
 * le destinataire ne peut pas retrouver sa cellule. Elle vaut donc aussi pour
 * ce qui n'a PAS été réparé : sur une rangée où une valeur liquidative est
 * sortie au format date, c'est cette date impossible, « 30/12/1935 », qui
 * désigne la cellule fautive. L'oublier laissait un tiret là où se trouve
 * tout l'intérêt de la ligne.
 */
const reparationDe = (m: string): { imprime: string; retenu: string } => {
  const excel = /« ([^»]*) » lu (\d{2}\/\d{2}\/\d{4})/.exec(m);
  if (excel) return { imprime: excel[1], retenu: excel[2] };
  const annee = /, (\d{4}-\d{2}-\d{2}) lue comme (\d{4}-\d{2}-\d{2})/.exec(m);
  if (annee) return { imprime: annee[1], retenu: annee[2] };
  const ecartee = dateEcartee(m);
  if (ecartee) return { imprime: ecartee, retenu: "" };
  return { imprime: "", retenu: "" };
};

/**
 * LE DIAGNOSTIC, écrit pour quelqu'un qui n'a pas notre code sous les yeux.
 *
 * C'est la colonne qui décide si le rapport sert ou dort dans une boîte mail.
 * « Famille L » ne veut rien dire chez le fournisseur ; « une valeur
 * liquidative est imprimée au format date » envoie son informaticien au bon
 * endroit de son tableur.
 */
export function diagnostic(message: string): string {
  const code = classer(message);
  if (code === "X") return "Une cellule de date est restée au format numérique (numéro de série du tableur) au lieu d'être formatée en date.";
  if (code === "W") return "L'année de la date de valorisation précède la création du fonds : coquille d'année.";
  if (code === "L") {
    const d = dateEcartee(message);
    if (d && d < "2000-01-01") return "Une VALEUR LIQUIDATIVE est imprimée au format DATE (numéro de série du tableur lu comme une date). Les colonnes de la rangée ont échangé leurs formats.";
    if (message.includes("postérieure")) return "La date de valorisation est postérieure à la séance : elle ne peut pas être connue ce jour-là.";
    if (message.includes("antérieure")) return "La date de valorisation est très antérieure à la séance : la rangée semble répéter une valorisation périmée.";
    return "Valeur liquidative refusée : la date ou la valeur ne tient pas.";
  }
  if (code === "M") return "La rangée de la table des OPCVM n'a pas la forme attendue et n'a pas pu être lue.";
  if (code === "H" || code === "I" || code === "T") return "La ligne de cours obligataire n'a pas pu être découpée en colonnes : les cellules sont collées dans la couche texte du PDF.";
  if (code === "J") return "La ligne d'action n'a pas pu être découpée en colonnes.";
  if (code === "O" || code === "P") return "La table de capitalisation boursière n'a pas de séparateur entre les cellules dans la couche texte du PDF : les valeurs se touchent.";
  if (code === "A") return "L'indice BVMAC n'est pas publié dans ce bulletin.";
  if (code === "B") return "La table des OPCVM n'est pas publiée dans ce bulletin.";
  if (code === "C" || code === "D") return "La table des OPCVM compte moins de lignes qu'attendu.";
  if (code === "E" || code === "F") return "La section compte moins de lignes que la séance précédente.";
  if (code === "G") return "Des lignes présentes au bulletin précédent ne figurent plus dans celui-ci.";
  if (code === "N") return "La valeur liquidative varie de plus de dix pour cent d'une valorisation à l'autre. Elle est retenue, et signalée.";
  if (code === "Q") return "Le cours s'écarte de plus de quinze pour cent du dernier cours connu. Il est retenu, et signalé.";
  if (code === "K") return "Le cours de clôture est nul ou illisible.";
  if (code === "R" || code === "S") return "L'en-tête du bulletin (numéro, date) n'a pas pu être lu.";
  if (code === "V") return "La ligne a été lue mais refusée à l'enregistrement.";
  return famille(code)?.libelle ?? "Remarque non classée.";
}

/**
 * LES ERREURS DE PUBLICATION : LA FEUILLE QUI COMPTE.
 *
 * Elle ne liste pas ce que nous n'avons pas su lire, ce qui est notre
 * problème, mais ce que le document dit de FAUX, ce qui est le leur. Deux
 * cas aujourd'hui, et tous deux démontrables :
 *
 *   une valeur liquidative imprimée au format date, avec la performance
 *   publiée calculée sur le numéro de série ;
 *
 *   une date de valorisation restée en numéro de série.
 *
 * Le seuil est volontairement haut : une feuille qui accuse un tiers ne doit
 * contenir que ce qui se prouve par son propre document.
 */
const estErreurDePublication = (message: string): boolean => {
  const code = classer(message);
  if (code === "X") return true;
  if (code === "L") {
    const d = dateEcartee(message);
    return Boolean(d) && d < "2000-01-01";
  }
  return false;
};

/* ---------------- assemblage ---------------- */

/** Toutes les phrases d'un bulletin, anomalies et avertissements confondus. */
const phrases = (b: MarketBulletin): string[] => [...(b.anomalies ?? []), ...(b.warnings ?? [])];

const ligne = (seance: string, message: string): LigneRapport => {
  const code = classer(message);
  const f = famille(code);
  const sort: SortDeLaDonnee = f?.sort ?? "sans_objet";
  const { imprime, retenu } = reparationDe(message);
  return { seance, code, sort, devenu: SORT[sort].libelle, objet: objetDe(message), diagnostic: diagnostic(message), imprime, retenu, message };
};

/**
 * Le rapport d'une plage de séances.
 *
 * Les NOTES comptent autant que les remarques : la coquille d'année se
 * consigne en note et jamais en avertissement, délibérément, pour ne pas
 * laisser une séance marquée « partielle » à cause d'un défaut déjà corrigé.
 * Elle n'en est pas moins une retouche de notre fait, donc elle doit figurer
 * au rapport : c'est même la première chose qu'un fournisseur veut voir.
 */
export function construireRapport(bulletins: MarketBulletin[], du: string, au: string, maintenant = new Date()): RapportFournisseur {
  const lot = bulletins.filter((b) => b.sessionDate >= du && b.sessionDate <= au).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));

  /**
   * UNE PHRASE, UN ÉVÉNEMENT, MÊME SI ELLE EST RANGÉE DEUX FOIS.
   *
   * Mesuré en ouvrant le premier rapport : les 65 conversions de date Excel
   * paraissaient 189 fois sous « corrigée » au lieu de 124. La raison est que
   * le lecteur consigne le même message DANS LES DEUX LISTES, remarques et
   * notes, chacune pour son usage. Deux rangements d'un seul fait.
   *
   * Un rapport qui double ses chiffres ne vaut rien, et il les doublerait
   * d'autant plus discrètement qu'aucun total ne le trahirait : on les
   * déduplique sur le couple séance + message, ce qui reste vrai quelle que
   * soit la raison du double rangement.
   */
  const vues = new Set<string>();
  const lignes: LigneRapport[] = [];
  const ajouter = (seance: string, message: string) => {
    const clef = `${seance}\u0000${message}`;
    if (vues.has(clef)) return;
    vues.add(clef);
    lignes.push(ligne(seance, message));
  };
  for (const b of lot) {
    for (const m of phrases(b)) ajouter(b.sessionDate, m);
    for (const n of b.notes ?? []) ajouter(b.sessionDate, n.message);
  }

  const compter = <T extends string>(clef: (l: LigneRapport) => T) => {
    const m = new Map<T, { remarques: number; seances: Set<string> }>();
    for (const l of lignes) {
      const k = clef(l);
      const v = m.get(k) ?? { remarques: 0, seances: new Set<string>() };
      v.remarques++;
      v.seances.add(l.seance);
      m.set(k, v);
    }
    return m;
  };

  const parSortBrut = compter((l) => l.sort);
  const parSort: CompteParSort[] = (Object.keys(SORT) as SortDeLaDonnee[]).map((s) => ({
    sort: s,
    libelle: SORT[s].libelle,
    dit: SORT[s].dit,
    ecrite: SORT[s].ecrite,
    remarques: parSortBrut.get(s)?.remarques ?? 0,
    seances: parSortBrut.get(s)?.seances.size ?? 0,
  }));

  const parCode = compter((l) => l.code);
  const parFamille: CompteParFamille[] = FAMILLES.map((f) => ({
    code: f.code,
    libelle: f.libelle,
    genre: f.genre,
    sort: f.sort,
    devenu: SORT[f.sort].libelle,
    remarques: parCode.get(f.code)?.remarques ?? 0,
    seances: parCode.get(f.code)?.seances.size ?? 0,
  })).filter((f) => f.remarques > 0);

  const avec = new Set(lignes.map((l) => l.seance));

  return {
    du,
    au,
    seances: lot.length,
    seancesSansRemarque: lot.filter((b) => !avec.has(b.sessionDate)).length,
    remarques: lignes.length,
    parSort,
    parFamille,
    corrections: lignes.filter((l) => l.sort === "corrigee"),
    ecartees: lignes.filter((l) => l.sort === "ecartee"),
    perdues: lignes.filter((l) => l.sort === "perdue"),
    publication: lignes.filter((l) => estErreurDePublication(l.message)),
    genere: maintenant.toISOString(),
  };
}
