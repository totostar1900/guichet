import "server-only";

/**
 * Essayer avec la réflexion adaptative, retomber sans elle si le modèle la refuse.
 *
 * POURQUOI CETTE RÈGLE VIT ICI ET PLUS AILLEURS. Tous les modèles ne prennent
 * pas `thinking: { type: "adaptive" }`, et celui qui ne la prend pas rend un 400
 * « adaptive thinking is not supported on this model ». Tenir une liste des
 * modèles qui la prennent serait une liste à maintenir : on demande, et on
 * s'adapte à la réponse.
 *
 * La règle existait déjà en deux copies, dans la lecture des adjudications et
 * dans celle des avis d'émission. L'extracteur d'intake, lui, ne l'avait pas, et
 * le 2026-10-01 il a échoué dès qu'on lui a posé un modèle plus rapide : le
 * schéma venait d'être corrigé, le modèle venait de changer, et c'est cette
 * incompatibilité qui attendait derrière. Une troisième copie aurait fini par
 * dériver comme les deux premières ont laissé le troisième fichier de côté.
 *
 * Toute autre erreur remonte intacte : ce repli ne rattrape qu'une
 * incompatibilité nommée, jamais une panne quelconque.
 */
export async function avecReplisSansReflexion<T>(appeler: (reflechi: boolean) => Promise<T>): Promise<T> {
  try {
    return await appeler(true);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (!/adaptive thinking is not supported/i.test(message)) throw e;
    return await appeler(false);
  }
}
