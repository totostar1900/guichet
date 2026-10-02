/**
 * L'échéancier : ce que les lignes doivent verser, mois par mois.
 *
 * POURQUOI UNE FONCTION PURE. Elle décide de ce qu'un graphique montre, et un
 * graphique se vérifie mal à l'oeil : une colonne manquante ressemble à un mois
 * sans flux, et un mois sans flux ressemble à une colonne manquante. Les deux
 * se distinguent ici, sous cliquet.
 *
 * LES MOIS VIDES SONT RENDUS, À ZÉRO. Les sauter donnerait un axe qui ment :
 * douze colonnes serrées laisseraient croire à douze mois de versements quand
 * il n'y en a que trois. Un mois sans rien est un fait, pas une absence.
 *
 * CE QUE LA PAGE DIT À CÔTÉ, et qui n'est pas de la mise en page : ces flux
 * sont des ÉCHÉANCES, pas des encaissements. L'application connaît la date à
 * laquelle l'émetteur doit payer ; elle ne constate pas l'arrivée sur le compte
 * du client.
 */
export type Flux = { date: string; amount: number; label: string };

export type MoisDEcheancier = {
  /** « 2026-10 » : l'année et le mois, pour que le tri soit celui des chaînes. */
  mois: string;
  montant: number;
  /** Le détail du mois, pour l'infobulle et pour la table de repli. */
  flux: Flux[];
};

/** Le mois d'une date ISO, sans passer par un fuseau : la chaîne suffit. */
const moisDe = (iso: string): string => iso.slice(0, 7);

/** Le mois suivant, en arithmétique de chaîne plutôt que de Date. */
function moisApres(mois: string): string {
  const an = Number(mois.slice(0, 4));
  const m = Number(mois.slice(5, 7));
  return m === 12 ? `${an + 1}-01` : `${an}-${String(m + 1).padStart(2, "0")}`;
}

/**
 * Les `n` mois à partir de `depuis`, chacun avec ce qui y tombe.
 *
 * `depuis` est une date ISO ; son mois ouvre la série. Les flux hors de la
 * fenêtre sont ignorés : une colonne hors cadre n'existe pas pour le lecteur,
 * et le total annoncé doit être celui des colonnes dessinées.
 */
export function echeancier(flux: Flux[], depuis: string, n = 12): MoisDEcheancier[] {
  const premier = moisDe(depuis);
  const mois: string[] = [];
  let m = premier;
  for (let i = 0; i < n; i++) {
    mois.push(m);
    m = moisApres(m);
  }
  const fenetre = new Set(mois);
  const par = new Map<string, Flux[]>(mois.map((x) => [x, []]));
  for (const f of flux) {
    const k = moisDe(f.date);
    if (!fenetre.has(k)) continue;
    par.get(k)!.push(f);
  }
  return mois.map((x) => {
    const liste = [...(par.get(x) ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    return { mois: x, montant: liste.reduce((s, f) => s + f.amount, 0), flux: liste };
  });
}

/** Le total de la fenêtre : celui des colonnes dessinées, et d'elles seules. */
export const totalDeLEcheancier = (e: MoisDEcheancier[]): number => e.reduce((s, m) => s + m.montant, 0);
