import type { Country } from "@/lib/domain/types";

/**
 * LE FILIGRANE PATRIOTE (18 novembre 2026, décidé sur la planche « Statuts et dynamisme », précisé le même jour) : un signe du pays de la ligne, posé très pâle en fond d'une carte ou d'une
 * page de statut, TIRÉ AU HASARD à chaque affichage parmi ce qui existe pour ce pays : son code téléphone (« +237 »), son code à trois lettres (« CMR »), un mot (« Kontinent » pour le
 * Cameroun), et ses monuments (dessinés en masque, voir « globals.css »).
 *
 * Il réveille la fibre, il ne porte aucune information : la carte reste lisible sans lui (opacité de 7 %), et il n'est jamais lu par un lecteur d'écran. Les codes sont ceux de l'UIT
 * (téléphone) et de la norme ISO 3166 (trois lettres). Les mots et les monuments sont ceux que la maison choisit : un pays qui n'en a pas encore garde ses deux codes.
 */
export interface SignesDuPays {
  tel: string;
  iso3: string;
  /** Des mots du pays, à écrire tels quels. */
  mots?: string[];
  /** Des monuments : l'identifiant du dessin (voir `globals.css`) et son nom, pour la maison. */
  monuments?: { id: string; nom: string }[];
}

export const SIGNES_DU_PAYS: Record<Country, SignesDuPays> = {
  Cameroun: {
    tel: "+237",
    iso3: "CMR",
    mots: ["Kontinent"],
    monuments: [
      { id: "reunification-statue", nom: "Statue du vieillard et des enfants, Monument de la Réunification (Yaoundé)" },
      { id: "reunification", nom: "Monument de la Réunification (Yaoundé)" },
      { id: "nouvelle-liberte", nom: "La Nouvelle Liberté (Douala, Deïdo)" },
    ],
  },
  Congo: {
    tel: "+242",
    iso3: "COG",
    monuments: [
      { id: "femme-au-flambeau", nom: "Statue de la femme au flambeau et à la tablette (nom à confirmer)" },
      { id: "deux-torses", nom: "Monument des deux torses de granit (nom à confirmer)" },
    ],
  },
  Gabon: {
    tel: "+241",
    iso3: "GAB",
    monuments: [
      { id: "fraternite", nom: "Place de la Fraternité, Libreville (deux mains et une flamme dorée ; plaque du 17 août 2007)" },
      { id: "statue-enchainee", nom: "Statue aux chaînes brisées entre deux colonnes sculptées (nom à confirmer)" },
      { id: "liberation-2023", nom: "Monument du Coup de la Libération d'août 2023 (trois statues de bronze et deux fusils)" },
    ],
  },
  RCA: {
    tel: "+236",
    iso3: "CAF",
    monuments: [{ id: "tour-aux-couleurs", nom: "Tour en forme de tente aux couleurs du drapeau, avec une arche (nom à confirmer)" }],
  },
  Tchad: { tel: "+235", iso3: "TCD" },
  "Guinée éq.": { tel: "+240", iso3: "GNQ" },
};

/** Le préfixe d'un signe qui est un monument : « monument:reunification ». */
export const PREFIXE_MONUMENT = "monument:";

/** Les signes possibles pour un pays : codes, mots, monuments (ces derniers sous la forme « monument:<id> »). */
export function signesPossibles(pays: Country | undefined): string[] {
  const s = pays ? SIGNES_DU_PAYS[pays] : undefined;
  if (!s) return [];
  return [s.tel, s.iso3, ...(s.mots ?? []), ...(s.monuments ?? []).map((m) => `${PREFIXE_MONUMENT}${m.id}`)];
}
