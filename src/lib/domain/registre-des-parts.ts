/**
 * LE REGISTRE INTERNE DES PARTS, ET LE CODE PORTEUR ANONYME (14 novembre 2026, planche 1B).
 *
 * Le gestionnaire d'un fonds ne connaît qu'un compte global au nom de la maison. Nous savons, nous, à qui appartient chaque part :
 * les positions se déduisent des ordres réglés (jamais stockées), et ce module les range par fonds et par client. Chaque client porte un
 * CODE PORTEUR, sans lien lisible avec son identité, que la maison peut communiquer au gestionnaire quand il veut ventiler.
 *
 * LE REGISTRE EST LA PREUVE DE PROPRIÉTÉ DE CHAQUE CLIENT, et il se rapproche du relevé du compte global : la somme de nos parts doit
 * être celle du gestionnaire. Un écart se voit, il ne se corrige pas en silence.
 *
 * CE QUI SORT DE LA MAISON NE PORTE QUE LE CODE ET LES PARTS : jamais un nom, jamais un identifiant interne.
 *
 * Module sans dépendance : il se lit du serveur comme du navigateur.
 */

export interface PartDeClient {
  clientId: string;
  offerId: string;
  units: number;
}

export interface Porteur {
  clientId: string;
  nom: string;
  parts: number;
  /** Absent tant que le code n'a pas été attribué. */
  code?: string;
}

export interface RegistreDeFonds {
  offerId: string;
  titre: string;
  isin: string;
  porteurs: Porteur[];
  /** Σ des parts de nos clients, arrondie au millième : c'est ce qu'il faut retrouver chez le gestionnaire. */
  total: number;
}

/** Où le registre range ses données dans la table du desk (`desk_prive`) : les codes par client, les relevés par fonds. */
export const CODES_KIND = "code_porteur";
export const RELEVES_KIND = "releve_gestionnaire";

const millieme = (x: number): number => Math.round(x * 1000) / 1000;

/** Les parts de chaque client dans chaque fonds, plus grosse position d'abord ; un client sans part n'est pas écrit. */
export function registreDesParts(parts: PartDeClient[], fonds: { id: string; title: string; isin: string }[], noms: Map<string, string>, codes: Map<string, string>): RegistreDeFonds[] {
  return fonds.map((f) => {
    const parClient = new Map<string, number>();
    for (const p of parts) if (p.offerId === f.id) parClient.set(p.clientId, (parClient.get(p.clientId) ?? 0) + p.units);
    const porteurs: Porteur[] = [...parClient.entries()]
      .filter(([, u]) => millieme(u) > 0)
      .map(([clientId, u]) => ({ clientId, nom: noms.get(clientId) ?? "Client inconnu", parts: millieme(u), ...(codes.has(clientId) ? { code: codes.get(clientId) } : {}) }))
      .sort((a, b) => b.parts - a.parts || a.nom.localeCompare(b.nom, "fr"));
    return { offerId: f.id, titre: f.title, isin: f.isin, porteurs, total: millieme(porteurs.reduce((s, p) => s + p.parts, 0)) };
  });
}

/** Sans ambiguïté à la lecture au téléphone : ni 0 ni O, ni 1 ni I ni L. */
export const ALPHABET_DES_CODES = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const LONGUEUR_DU_CODE = 6;

/** Un code que personne ne porte déjà : on retire tant qu'il existe. `tirer` est injecté (aléa du serveur, ou suite fixe en essai). */
export function codeLibre(existants: Set<string>, tirer: () => string): string {
  for (let i = 0; i < 1000; i++) {
    const c = tirer();
    if (!existants.has(c)) return c;
  }
  throw new Error("Aucun code libre : allonger le code.");
}

export const formeDuCode = (c: string): boolean => new RegExp(`^P-[${ALPHABET_DES_CODES}]{${LONGUEUR_DU_CODE}}$`).test(c);

export interface Releve {
  parts: number;
  /** Le jour du relevé du gestionnaire (AAAA-MM-JJ). */
  au: string;
}

export type EtatDeRapprochement = "sans_releve" | "juste" | "ecart";

/** Notre total contre celui du gestionnaire : « juste » à un millième de part près, « écart » sinon, signé (relevé moins nous). */
export function rapprochement(totalInterne: number, releve: Releve | undefined): { etat: EtatDeRapprochement; ecart: number } {
  if (!releve) return { etat: "sans_releve", ecart: 0 };
  const ecart = millieme(releve.parts - totalInterne);
  return { etat: Math.abs(ecart) < 0.0005 ? "juste" : "ecart", ecart };
}

/**
 * LE FICHIER QUE LE GESTIONNAIRE REÇOIT : un code et des parts, rien d'autre. Les clients sans code n'y figurent pas, et sont comptés à part
 * pour que l'écart avec le total soit expliqué plutôt que caché.
 */
export function exportAnonyme(r: RegistreDeFonds): { csv: string; sansCode: number } {
  const codes = r.porteurs.filter((p) => p.code).sort((a, b) => (a.code as string).localeCompare(b.code as string));
  const lignes = ["code;parts", ...codes.map((p) => `${p.code};${p.parts.toFixed(3)}`)];
  return { csv: `${lignes.join("\n")}\n`, sansCode: r.porteurs.length - codes.length };
}
