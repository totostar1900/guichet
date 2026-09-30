import { VALEUR_DU_JOUR, type MoneyFlow } from "./performance";

/**
 * Ce que le client a versé, ce qui lui est revenu, mois après mois.
 *
 * CE QU'ON NE DESSINE PAS, ET POURQUOI. La maquette portait une courbe de la
 * valeur du portefeuille dans le temps, montant doucement au-dessus des
 * versements. Elle est indessinable honnêtement : valoriser une ligne au 31
 * mars demande le cours du 31 mars, et nous ne gardons pas d'historique de
 * valorisation. La tracer quand même reviendrait à lisser entre deux points
 * connus et à présenter une interpolation comme un relevé. Une maison qui
 * écrit « on montre ce qui est vrai, on compte ce qui manque » ne peut pas
 * dessiner ce qu'elle ne sait pas.
 *
 * Restent deux séries exactes et un point exact, et ils racontent la même
 * chose : ce qui est sorti, ce qui est rentré, et ce que ça vaut aujourd'hui.
 * L'écart entre le versé et la somme du reçu et de la valeur est le gain, et
 * il se lit à l'oeil sans qu'aucun chiffre soit inventé.
 */

export interface PointCourbe {
  /** Le premier jour du mois, en ISO : « 2026-03-01 ». */
  mois: string;
  /** Cumulé depuis l'origine, en francs. */
  verse: number;
  /** Cumulé depuis l'origine : coupons, remboursements, produits de vente. */
  recu: number;
}

export interface CourbePortefeuille {
  points: PointCourbe[];
  /** La valeur du jour : le seul point de valorisation qu'on puisse affirmer. */
  valeur: number;
  /** Le mois du premier mouvement, quand il y en a un. */
  depuis?: string;
}

const moisDe = (iso: string): string => `${iso.slice(0, 7)}-01`;

/** Le mois suivant, sans passer par Date : les fuseaux n'ont rien à faire ici. */
function moisApres(mois: string): string {
  const a = Number(mois.slice(0, 4));
  const m = Number(mois.slice(5, 7));
  return m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, "0")}-01`;
}

/**
 * La série cumulée, un point par mois, du premier mouvement à aujourd'hui.
 *
 * Un mois sans mouvement porte quand même son point : sans lui, la ligne
 * sauterait d'un versement à l'autre et laisserait croire à une progression
 * continue entre les deux, ce qui est exactement le mensonge qu'on évite.
 */
export function courbeDuPortefeuille(mouvements: MoneyFlow[], valeur: number, aujourdHui: string): CourbePortefeuille {
  const reels = mouvements.filter((f) => f.label !== VALEUR_DU_JOUR && f.date);
  if (!reels.length) return { points: [], valeur, depuis: undefined };

  const tries = [...reels].sort((a, b) => a.date.localeCompare(b.date));
  const debut = moisDe(tries[0].date);
  const fin = moisDe(aujourdHui);

  const points: PointCourbe[] = [];
  let verse = 0;
  let recu = 0;
  let i = 0;
  for (let mois = debut; mois <= fin; mois = moisApres(mois)) {
    const borne = moisApres(mois);
    while (i < tries.length && tries[i].date < borne) {
      const f = tries[i];
      if (f.amount < 0) verse += -f.amount;
      else recu += f.amount;
      i += 1;
    }
    points.push({ mois, verse, recu });
    // Un portefeuille très ancien ne dessine pas mille points : au-delà de dix
    // ans la figure devient illisible avant d'être fausse.
    if (points.length > 130) break;
  }

  return { points, valeur, depuis: debut };
}
