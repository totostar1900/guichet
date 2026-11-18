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
  Congo: { tel: "+242", iso3: "COG" },
  Gabon: { tel: "+241", iso3: "GAB" },
  RCA: { tel: "+236", iso3: "CAF" },
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
