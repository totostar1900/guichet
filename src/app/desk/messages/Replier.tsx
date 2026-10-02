"use client";

/**
 * Tout replier, tout déplier, à chaque étage du rail.
 *
 * POURQUOI DES `<details>` ET NON UN ÉTAT REACT. Le repli natif marche sans
 * JavaScript, se prend au clavier, s'annonce aux lecteurs d'écran, et survit au
 * rendu serveur sans état à synchroniser. Il n'y avait rien à gagner à le
 * refaire, et un état de repli maison aurait été une chose de plus à garder
 * d'une visite à l'autre, ou à perdre à chaque rechargement.
 *
 * CE COMPOSANT NE FAIT QUE LE GESTE DE MASSE. Ouvrir ou fermer un nœud reste
 * l'affaire du navigateur ; « tout replier » est le seul geste qu'il ne sait pas
 * faire seul. Il écrit donc directement sur les `<details>` du rail, sans état :
 * leur état, c'est eux qui le portent.
 *
 * DEUX ÉTAGES, parce qu'ils ne répondent pas à la même question. Replier les
 * correspondants donne la liste de qui a écrit ; replier les échanges donne la
 * liste des affaires. Un seul bouton pour les deux obligerait à choisir laquelle
 * des deux vues on perd.
 */
export function Replier({ niveau, libelle }: { niveau: "correspondant" | "echange"; libelle: { tout: string; replier: string; deplier: string } }) {
  const noeuds = () => Array.from(document.querySelectorAll<HTMLDetailsElement>(`details[data-niveau="${niveau}"]`));
  const poser = (ouvert: boolean) => {
    for (const d of noeuds()) d.open = ouvert;
  };
  return (
    <span className="replier">
      <small className="muted">{libelle.tout}</small>
      <button type="button" className="btn sm ghost" onClick={() => poser(false)}>
        {libelle.replier}
      </button>
      <button type="button" className="btn sm ghost" onClick={() => poser(true)}>
        {libelle.deplier}
      </button>
    </span>
  );
}
