/**
 * LIRE UN DOCUMENT SANS QUITTER L'APP (15 novembre 2026, maquette « Lecteur » : 1B · 2B2 · 3 OK · 4 OK · 5 OK).
 *
 * Un lien qui ouvre un PDF « à part » est un aller simple dans l'app installée : pas d'onglet, pas de retour, et fermer la lecture ferme l'app. Tout document se lit donc
 * dans une page de l'app, « /lire », qui ne montre que le contenu, avec une barre fine et une croix. Cette porte est la seule qui mène à un fichier depuis une page du client.
 *
 * La source est une adresse INTERNE, d'une liste fermée : la page de lecture ne sert pas à lire n'importe quelle adresse. Les routes qui servent les fichiers gardent chacune leur
 * propre contrôle d'accès ; ce module ne l'élargit pas.
 */
const SOURCES: RegExp[] = [
  /^\/api\/documents\/[A-Za-z0-9-]+$/,
  /^\/api\/documents\/(mandat-apercu|ordre)\/[A-Za-z0-9-]+$/,
  /^\/pieces\/[0-9a-z-]{6,40}$/i,
  /^\/offres\/[A-Za-z0-9._-]+\/doc\/\d+$/,
  /^\/offres\/[A-Za-z0-9._-]+\/fiche$/,
];

export const sourceDeLectureValide = (src: string | undefined): src is string => typeof src === "string" && SOURCES.some((r) => r.test(src));

/** Une adresse de retour n'est acceptée que si elle est interne : un « de » venu d'ailleurs renverrait le lecteur hors de chez lui. */
export const retourDeLectureSur = (de: string | undefined, repli = "/"): string => (de && de.startsWith("/") && !de.startsWith("//") ? de : repli);

/** L'adresse de la page de lecture d'un fichier. `note` est la phrase fine sous la barre (« Rien n'est engagé… »), déjà traduite. */
export function hrefDeLecture(src: string, o: { titre?: string; note?: string; de?: string } = {}): string {
  const p = new URLSearchParams({ src });
  if (o.titre) p.set("titre", o.titre.slice(0, 80));
  if (o.note) p.set("note", o.note.slice(0, 240));
  if (o.de) p.set("de", o.de);
  return `/lire?${p.toString()}`;
}
