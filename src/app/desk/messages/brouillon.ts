/**
 * Le brouillon d'une réponse, gardé par fil.
 *
 * LE DÉFAUT. Changer de conversation effaçait ce qui était tapé. Un opérateur
 * qui va vérifier une date dans un autre fil revient devant un champ vide, et
 * récrit. Rien ne l'avertissait, parce qu'un champ vide ressemble à un champ
 * qu'on n'a pas rempli.
 *
 * OÙ IL VIT. Dans le navigateur, pas en base. Un brouillon est personnel : il
 * appartient à qui l'écrit, pas au desk. Deux opérateurs sur le même fil ne se
 * marchent pas dessus, et rien d'inachevé ne traîne dans la base.
 *
 * TOUT EST GARDÉ EN TRY/CATCH. Fenêtre privée, données de site bloquées, quota
 * plein : la lecture rend un brouillon vide et l'écriture ne fait rien. Le
 * formulaire marche sans, c'est un confort et jamais une dépendance.
 */
export type Brouillon = { subject: string; body: string; offerId: string };

export const VIDE: Brouillon = { subject: "", body: "", offerId: "" };

const cle = (canal: string, a: string) => `guichet.brouillon.${canal}.${a}`;

export function lireBrouillon(canal: string, a: string): Brouillon {
  try {
    const brut = window.localStorage.getItem(cle(canal, a));
    if (!brut) return VIDE;
    const o = JSON.parse(brut) as Partial<Brouillon>;
    /* Chaque champ est relu pour ce qu'il est : un stockage se modifie à la
       main, et une valeur d'un autre type ferait planter le champ contrôlé. */
    return { subject: typeof o.subject === "string" ? o.subject : "", body: typeof o.body === "string" ? o.body : "", offerId: typeof o.offerId === "string" ? o.offerId : "" };
  } catch {
    return VIDE;
  }
}

export function garderBrouillon(canal: string, a: string, b: Brouillon): void {
  try {
    /* Un brouillon vide ne se garde pas : il occuperait une place pour dire
       qu'il n'y a rien, et il faudrait ensuite le distinguer de son absence. */
    if (!b.subject.trim() && !b.body.trim() && !b.offerId) window.localStorage.removeItem(cle(canal, a));
    else window.localStorage.setItem(cle(canal, a), JSON.stringify(b));
  } catch {
    /* Pas de place, pas de stockage : le formulaire marche quand même. */
  }
}

export function oublierBrouillon(canal: string, a: string): void {
  try {
    window.localStorage.removeItem(cle(canal, a));
  } catch {
    /* Rien à oublier si rien n'a pu être gardé. */
  }
}
