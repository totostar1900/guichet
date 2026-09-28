/**
 * Le niveau de zone, et pourquoi il vit seul.
 *
 * Cette règle vivait dans le composant de la courbe, où rien ne pouvait
 * l'éprouver : c'est ainsi que « la moyenne des Trésors présents » a pu devenir
 * « la moyenne des points présents » sans que personne s'en aperçoive, et
 * publier le Congo moyenné avec le Congo sous le nom de la CEMAC.
 *
 * Module sans dépendance, et il doit le rester : il part dans le paquet du
 * navigateur avec la figure. Le sortir dans curve.ts y aurait entraîné toute la
 * machinerie des adjudications pour vingt lignes.
 */

/** Un Trésor et ses points, tels que la courbe les donne à tracer. */
export interface TresorTrace {
  pays: string;
  points: { annees: number; mot: string; pct: number; age: number }[];
}

export interface PointZone {
  annees: number;
  mot: string;
  pct: number;
  /** Le nombre de Trésors moyennés, jamais le nombre de points. */
  n: number;
  age: number;
}

/**
 * À chaque horizon, la moyenne des Trésors présents.
 *
 * Deux Trésors distincts, et non deux points. Un même Trésor peut poser deux
 * fois le même horizon arrondi, le Congo portant deux abondements à un an et
 * demi et le Gabon deux bons à un mois : les moyenner revient à publier ce
 * Trésor sous le nom de la zone. Un horizon porté par une seule signature n'est
 * pas une moyenne de zone, il est cette signature, et il est écarté.
 *
 * L'âge retenu est celui du plus ancien des prix moyennés : une moyenne n'est
 * jamais plus fraîche que le plus vieux chiffre qui la compose.
 */
export function consolide(tresors: TresorTrace[]): PointZone[] {
  const par = new Map<string, { annees: number; mot: string; v: number[]; ages: number[]; tresors: Set<string> }>();
  for (const p of tresors)
    for (const q of p.points) {
      const e = par.get(q.mot) ?? { annees: q.annees, mot: q.mot, v: [], ages: [], tresors: new Set<string>() };
      e.v.push(q.pct);
      e.ages.push(q.age);
      e.tresors.add(p.pays);
      par.set(q.mot, e);
    }
  return [...par.values()]
    .filter((e) => e.tresors.size > 1)
    .map((e) => ({
      annees: e.annees,
      mot: e.mot,
      pct: e.v.reduce((a, b) => a + b, 0) / e.v.length,
      n: e.tresors.size,
      age: Math.max(...e.ages),
    }))
    .sort((a, b) => a.annees - b.annees);
}
